from fastapi import APIRouter, Request, HTTPException, Form
from supabase import create_client, Client
from .settings import Settings
from datetime import datetime

router = APIRouter()
settings = Settings()
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

# Twilio Inbound Webhook (STOP handling)
@router.post("/webhooks/twilio/inbound")
async def twilio_inbound(
    From: str = Form(...),
    Body: str = Form(...)
):
    # Log Raw Event
    try:
        supabase.table("provider_webhook_events").insert({
            "provider": "twilio",
            "event_type": "inbound_sms",
            "payload": {"From": From, "Body": Body},
            "received_at": datetime.now().isoformat()
        }).execute()
    except Exception as e:
        print(f"Error logging raw webhook: {e}")

    # Check for STOP keywords
    if Body.strip().upper() in ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]:
        # Find member by phone number and opt them out
        # Note: Phone numbers can be tricky (formatting). Assuming exact match or doing a flexible search would be better.
        # For this phase, we assume exact match or partial.
        
        # We need to find the member. Since phone implies uniqueness roughly in context or we block all members with that phone.
        # Let's block all members with this phone number across all gyms (safe default for compliance).
        try:
            supabase.table("members").update({
                "sms_opted_out": True, 
                "sms_opted_out_at": datetime.now().isoformat()
            }).eq("phone", From).execute()
        except Exception as e:
            print(f"Error handling STOP opt-out: {e}")
            
    return {"status": "received"}

# Twilio Status Callback
@router.post("/webhooks/twilio/status")
async def twilio_status(
    MessageSid: str = Form(...),
    MessageStatus: str = Form(...),
    ErrorCode: str = Form(None)
):
    try:
        # Log Raw Event
        try:
            supabase.table("provider_webhook_events").insert({
                "provider": "twilio",
                "event_type": "status_callback",
                "provider_message_id": MessageSid,
                "payload": {"MessageSid": MessageSid, "MessageStatus": MessageStatus, "ErrorCode": ErrorCode},
                "received_at": datetime.now().isoformat()
            }).execute()
        except Exception as e:
            print(f"Error logging raw webhook: {e}")

        update_data = {"status": MessageStatus, "updated_at": datetime.now().isoformat()}
        if ErrorCode:
            update_data["error_code"] = ErrorCode
            
        supabase.table("message_sends").update(update_data).eq("provider_message_id", MessageSid).execute()
    except Exception as e:
        print(f"Error processing Twilio status: {e}")
        
    return {"status": "updated"}

# Email Event Webhook (SendGrid style stub)
@router.post("/webhooks/email/events")
async def email_events(request: Request):
    events = await request.json()
    if not isinstance(events, list):
        events = [events]
        
    # Log Raw Events Batch
    try:
         supabase.table("provider_webhook_events").insert([{
            "provider": "email_provider",
            "event_type": event.get("event"),
            "payload": event,
            "received_at": datetime.now().isoformat()
         } for event in events]).execute()
    except Exception as e:
        print(f"Error logging raw webhook: {e}")
        
    for event in events:
        # Expected structure depends on provider. Assuming SendGrid-like:
        # { email, event, gym_id (custom arg?), member_id (custom arg?) }
        # Often custom args are passed in X-Headers or included in the event payload if we tagged the email.
        # For this Phase, we stub the recording if we can identify the user.
        # We will check for 'gym_id' and 'member_id' in custom_args.
        
        event_type = event.get("event")
        if event_type in ["open", "click"]:
            gym_id = event.get("gym_id")
            member_id = event.get("member_id")
            
            if gym_id and member_id:
                try:
                    supabase.table("engagement_events").insert({
                        "gym_id": gym_id,
                        "member_id": member_id,
                        "channel": "email",
                        "event_type": event_type,
                        "url": event.get("url"),
                        "created_at": datetime.now().isoformat()
                    }).execute()
                except Exception as e:
                    print(f"Error logging email event: {e}")

    return {"status": "processed"}
