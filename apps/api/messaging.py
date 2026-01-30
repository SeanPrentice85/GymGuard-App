from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import Optional
from supabase import create_client, Client
from .settings import Settings
from datetime import datetime
import os

# Try to import Twilio, but don't fail if not installed (mock mode)
try:
    from twilio.rest import Client as TwilioClient
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False

router = APIRouter()
settings = Settings()

from .dependencies import get_current_user_gym, UserContext, log_audit_event

# Supabase Client (Service Role for writing to message_sends and members)
# We can reuse the one from dependencies or keep this one. 
# Ideally reuse to save connections, but keeping separate for now is less risky for refactor.
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

class SendSMSRequest(BaseModel):
    # gym_id: str  <-- Removed, derived from token
    member_id: str
    message_body: str

@router.post("/messages/send-sms")
async def send_sms(request: SendSMSRequest, user: UserContext = Depends(get_current_user_gym)):
    # Gym ID is trustworthy now
    gym_id = user.gym_id

    # 1. Check Opt-out Status
    try:
        member_res = supabase.table("members").select("sms_opted_out, phone").eq("member_id", request.member_id).eq("gym_id", gym_id).single().execute()
        if not member_res.data:
            raise HTTPException(status_code=404, detail="Member not found")
        
        member = member_res.data
        if member.get("sms_opted_out"):
             raise HTTPException(status_code=400, detail="Member has opted out of SMS")
        
        phone_number = member.get("phone")
        if not phone_number:
             raise HTTPException(status_code=400, detail="Member has no phone number")

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # 2. Send via Twilio (or Mock)
    provider_message_id = None
    status = "queued"
    error_message = None

    if TWILIO_AVAILABLE and settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
        try:
            client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            message = client.messages.create(
                body=request.message_body,
                from_=settings.TWILIO_PHONE_NUMBER,
                to=phone_number
            )
            provider_message_id = message.sid
            status = message.status 
        except Exception as e:
            status = "failed"
            error_message = str(e)
            pass
    else:
        # Mock Mode
        print(f"[MOCK SEND] To: {phone_number}, Body: {request.message_body}")
        provider_message_id = "mock-" + datetime.now().isoformat()
        status = "sent"

    # 3. Log to message_sends
    try:
        send_record = {
            "gym_id": gym_id,
            "member_id": request.member_id,
            "channel": "sms",
            "provider": "twilio" if (TWILIO_AVAILABLE and settings.TWILIO_ACCOUNT_SID) else "mock",
            "provider_message_id": provider_message_id,
            "status": status,
            "error_message": error_message,
            "created_at": datetime.now().isoformat()
        }
        supabase.table("message_sends").insert(send_record).execute()

        # 4. Log to contacted_log (Business Logic Audit)
        contact_record = {
            "gym_id": gym_id,
            "member_id": request.member_id,
            "channel": "sms",
            "message_body": request.message_body,
            "sent_at": datetime.now().isoformat()
        }
        supabase.table("contacted_log").insert(contact_record).execute()

        # 5. Update Member last_contacted_at
        supabase.table("members").update({"last_contacted_at": datetime.now().isoformat()}).eq("member_id", request.member_id).eq("gym_id", gym_id).execute()

        # 6. Audit Log
        log_audit_event(
            gym_id=gym_id,
            user_id=user.user_id,
            action="send_sms",
            entity_type="member",
            entity_id=request.member_id,
            metadata={"channel": "sms", "status": status}
        )

    except Exception as e:
         raise HTTPException(status_code=500, detail=f"Failed to record message logs: {str(e)}")

    if status == "failed":
        raise HTTPException(status_code=500, detail=f"Twilio Send Failed: {error_message}")

    return {"status": "success", "provider_message_id": provider_message_id}
