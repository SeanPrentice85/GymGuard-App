from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# This allows your Frontend (Port 3000) to talk to this Backend (Port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class SMSRequest(BaseModel):
    member_id: str  # This must match the Frontend 'String(memberId)'

@app.post("/api/messages/send-sms")
async def send_sms(request: SMSRequest):
    # This is where the Twilio logic lives
    print(f"--- ACTION TRIGGERED ---")
    print(f"Sending SMS to Member ID: {request.member_id}")
    
    # For now, we return success to prove the connection works
    return {"status": "success", "message": f"SMS sent to {request.member_id}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
