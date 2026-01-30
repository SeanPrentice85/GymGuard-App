from fastapi import Header, HTTPException
from supabase import create_client, Client
from .settings import settings
from pydantic import BaseModel
import logging

# Initialize Supabase Admin Client
supabase_admin: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

from typing import Optional

class UserContext(BaseModel):
    user_id: str
    gym_id: str
    email: str
    role: str

async def get_current_user_gym(
    authorization: str = Header(..., description="Bearer <token>"),
    x_target_gym_id: Optional[str] = Header(None, alias="X-Target-Gym-ID")
) -> UserContext:
    """
    Validates Supabase JWT and derives gym_id from profiles.
    Replaces client-provided gym_id for security.
    Allows Admins to switch context via X-Target-Gym-ID.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid Authorization header format. Expected 'Bearer <token>'")
    
    token = authorization.split(" ")[1]
    
    try:
        # Verify Token via Supabase Auth
        user_res = supabase_admin.auth.get_user(token)
        
        if not user_res or not user_res.user:
             raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        user_id = user_res.user.id
        email = user_res.user.email
        
        # Get Gym Profile & Role
        profile_res = supabase_admin.table("profiles").select("gym_id, role").eq("user_id", user_id).single().execute()
        
        if not profile_res.data:
             raise HTTPException(status_code=403, detail="User has no associated gym profile")
             
        profile_gym_id = profile_res.data["gym_id"]
        role = profile_res.data.get("role", "gym_owner") # Default if missing (shouldn't be per migration)
        
        # Context Logic
        final_gym_id = profile_gym_id
        
        if role == 'admin' and x_target_gym_id:
            # View as another gym
            # Optional: Validate target gym exists? 
            # The RLS will block access if it doesn't exist or we fetch invalid data, but being explicit is nice.
            # For now, trust the admin's intent, effectively "sudo" to that gym context in the API.
            final_gym_id = x_target_gym_id
            
        return UserContext(user_id=user_id, gym_id=final_gym_id, email=email, role=role)
        
    except Exception as e:
        # Log the specific auth error internally
        print(f"[Auth Error] {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")

def log_audit_event(gym_id: str, user_id: str, action: str, entity_type: str = None, entity_id: str = None, metadata: dict = None):
    """
    Helper to insert rows into audit_logs.
    Should be called inside endpoints after successful actions.
    """
    try:
        supabase_admin.table("audit_logs").insert({
            "gym_id": gym_id,
            "user_id": user_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "metadata": metadata or {}
        }).execute()
    except Exception as e:
        # Don't fail the request if audit log fails, but definitely log it to stderr
        print(f"[Audit Log Error] Failed to log {action}: {e}")
