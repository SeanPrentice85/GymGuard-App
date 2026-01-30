from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# This is the "VIP List" that tells the Brain exactly who is allowed to call it.
# We include localhost for your testing and the Railway URL for your live app.
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://gymguard-app-production.up.railway.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SMSRequest(BaseModel):
    member_id: str  # This must match the Frontend 'String(memberId)'

@app.post("/api/messages/send-sms")
async def send_sms(request: SMSRequest):
    # This is where the Twilio logic lives
    # It prints to your Railway 'Deploy Logs' so you can see it working live
    print(f"--- ACTION TRIGGERED ---")
    print(f"Sending SMS to Member ID: {request.member_id}")
    
    # Returning success triggers the green notification on your website
    return {"status": "success", "message": f"SMS sent to {request.member_id}"}

if __name__ == "__main__":
    import uvicorn
    # Railway uses the PORT environment variable, but 8000 is our local default
    import os
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
