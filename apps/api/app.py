from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI()

# TEST MODE: This allows ANY website to talk to this API. 
# We use this to prove the connection is working.
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
    # This WILL appear in your Railway 'Deploy Logs' if the connection is successful.
    print(f"--- ACTION TRIGGERED ---")
    print(f"SUCCESS: Received request for Member ID: {request.member_id}")
    
    return {"status": "success", "message": f"Connection verified for {request.member_id}"}

if __name__ == "__main__":
    import uvicorn
    # Using the PORT assigned by Railway or defaulting to 8080 for local tests.
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port, timeout_keep_alive=60)