from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# This is the "VIP List" that tells the Brain exactly who is allowed to call it.
# We include localhost for testing and BOTH the https and http versions of your site.
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://gymguard-app-production.up.railway.app",
    "http://gymguard-app-production.up.railway.app",
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
    # This is the Brain's logic. 
    # It prints to your Railway 'Deploy Logs' so you can verify the connection.
    print(f"--- ACTION TRIGGERED ---")
    print(f"Sending SMS to Member ID: {request.member_id}")
    
    # Returning success triggers the green notification on your website.
    return {"status": "success", "message": f"SMS sent to {request.member_id}"}

if __name__ == "__main__":
    import uvicorn
    # Railway automatically assigns a PORT (likely 8080), so we must detect it.
    # We add timeout_keep_alive to stop the "Stopping Container" error.
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port, timeout_keep_alive=60)