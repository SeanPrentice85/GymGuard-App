import asyncio
import os
from supabase import create_client, Client
from datetime import date, timedelta
import random

# Mock Envs for seeding if not set (or assume they are set in shell)
# In real run, we rely on os.environ
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
    exit(1)

supabase: Client = create_client(url, key)

async def seed():
    print("Seeding Data...")
    
    # 1. Create User
    email = "admin@test.com"
    password = "password123"
    
    # Check if user exists
    # Note: supabase-py admin auth is a bit different version to version.
    # We try to sign up or create.
    try:
        user_res = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True
        })
        user_id = user_res.user.id
        print(f"Created user: {user_id}")
    except Exception as e:
        print(f"User creation failed (maybe exists): {e}")
        # Try to find user
        # This is hard without list_users permission sometimes, but service role should have it.
        # Let's assume we can login to get ID if create failed?
        # Or just list users.
        users = supabase.auth.admin.list_users()
        found = next((u for u in users if u.email == email), None)
        if found:
            user_id = found.id
            print(f"Found existing user: {user_id}")
        else:
            print("Could not find or create user.")
            return

    # 2. Create Gym
    # Check if gym exists for this user (via owner_id)
    gym_res = supabase.table("gyms").select("*").eq("owner_id", user_id).execute()
    if gym_res.data:
        gym_id = gym_res.data[0]["id"]
        print(f"Found gym: {gym_id}")
    else:
        # Create Gym
        new_gym = supabase.table("gyms").insert({
            "name": "Test Gym",
            "owner_id": user_id
        }).execute()
        gym_id = new_gym.data[0]["id"]
        print(f"Created gym: {gym_id}")

    # 3. Ensure Profile (Trigger should have created it, but let's update gym_id if null)
    # The automatic onboarding trigger 002 might handle this.
    # Let's check profile role to be admin for fun? 
    # Or just 'gym_owner' to test restricted view (Requirement 4.3). 
    # Let's make it 'gym_owner' first to verify they see their data.
    supabase.table("profiles").update({"gym_id": gym_id, "role": "gym_owner"}).eq("user_id", user_id).execute()

    # 4. Seed Monitoring Stats (Last 7 days)
    # Clear old stats/runs for this gym to avoid dupes?
    supabase.table("model_monitor_runs").delete().eq("gym_id", gym_id).execute()
    supabase.table("model_monitor_score_stats").delete().eq("gym_id", gym_id).execute()
    supabase.table("model_monitor_feature_stats").delete().eq("gym_id", gym_id).execute()

    today = date.today()
    
    for i in range(7):
        day = today - timedelta(days=6-i)
        day_str = day.isoformat()
        
        # Drift logic: make today (i=6) have a warning
        is_today = (i == 6)
        status = "warn" if is_today else "ok"
        null_count = 50 if is_today else 0
        mean_score = 45.0 + (i * 0.5) # Slow rise
        if is_today: mean_score = 30.0 # Drop
        
        # Run
        supabase.table("model_monitor_runs").insert({
            "gym_id": gym_id,
            "run_date": day_str,
            "status": status,
            "notes": "Seeded data"
        }).execute()
        
        # Score Stats
        supabase.table("model_monitor_score_stats").insert({
            "gym_id": gym_id,
            "run_date": day_str,
            "count": 100,
            "mean_score": mean_score,
            "p90_score": mean_score + 20,
            "high_risk_count": int(mean_score / 2)
        }).execute()
        
        # Feature Stats (Top 2)
        supabase.table("model_monitor_feature_stats").insert([
            {
                "gym_id": gym_id,
                "run_date": day_str,
                "feature_name": "avg_class_frequency_total",
                "count": 100,
                "null_count": null_count
            },
            {
                "gym_id": gym_id,
                "run_date": day_str,
                "feature_name": "days_since_last_visit",
                "count": 100,
                "null_count": 0
            }
        ]).execute()
        
    print("Seeding Complete!")

if __name__ == "__main__":
    asyncio.run(seed())
