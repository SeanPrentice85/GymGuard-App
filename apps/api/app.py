from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# 1. THE HEALTH CHECK (Heartbeat)
# This tells Railway to stop killing the container.
@app.get("/")
async def health_check():
    return {"status": "healthy", "container": "alluring-warmth"}

# 2. TOTAL OPENNESS SECURITY
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SMSRequest(BaseModel):
    member_id: str

@app.post("/api/messages/send-sms")
async def send_sms(request: SMSRequest):
    # This will appear in your Railway logs if the website successfully talks to the API
    print(f"--- ACTION TRIGGERED ---")
    print(f"SUCCESS: Received request for Member ID: {request.member_id}")
    
    return {"status": "success", "message": f"Connection verified for {request.member_id}"}

if __name__ == "__main__":
    import uvicorn
    # Using the PORT assigned by Railway or defaulting to 8080
    port = int(os.environ.get("PORT", 8080))
    # timeout_keep_alive=60 helps keep the connection from dropping during the handshake
    uvicorn.run(app, host="0.0.0.0", port=port, timeout_keep_alive=60)