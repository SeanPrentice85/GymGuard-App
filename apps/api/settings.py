import os
import sys
from typing import List
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

class Settings:
    def __init__(self):
        self.X_API_KEY = os.getenv("X_API_KEY")
        self.CORS_ORIGINS = self._parse_cors(os.getenv("CORS_ORIGINS", ""))
        self.SUPABASE_URL = os.getenv("SUPABASE_URL")
        self.SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        # Twilio
        self.TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
        self.TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
        self.TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
        
        self._validate()

    def _parse_cors(self, cors_str: str) -> List[str]:
        if not cors_str:
            return []
        return [origin.strip() for origin in cors_str.split(",") if origin.strip()]

    def _validate(self):
        if not self.X_API_KEY:
            print("CRITICAL ERROR: X_API_KEY environment variable is not set.")
            sys.exit(1)
        
        # Optional: Warn if CORS_ORIGINS is empty, but don't crash
        if not self.CORS_ORIGINS:
            print("WARNING: CORS_ORIGINS is empty. No cross-origin requests will be allowed.")

# Singleton instance
settings = Settings()
