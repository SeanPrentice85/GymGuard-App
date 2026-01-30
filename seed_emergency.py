import asyncio
import os
import random
import uuid
from supabase import create_client, Client
from datetime import datetime

# Envs should be loaded by shell, but just in case we can read .env file?
# User said "apps/api/.env ... exist". We'll assume vars are in env for this script execution or we load them.
from dotenv import load_dotenv
load_dotenv("apps/api/.env")

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("CRITICAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing!")
    # Fallback for local dev if user just said they exist but didn't export them
    # But I can't guess them. I will rely on the previous finding that they are in the file.
    exit(1)

supabase: Client = create_client(url, key)

async def seed():
    print("Seeding 20 mock members...")
    
    # 1. Create a Gym to own these members
    # Check if a gym exists, if not create one
    gyms = supabase.table("gyms").select("id").limit(1).execute()
    if gyms.data:
        gym_id = gyms.data[0]['id']
    else:
        # Create user owner first? Or just raw insert gym
        res = supabase.table("gyms").insert({"name": "Emergency Gym"}).execute()
        gym_id = res.data[0]['id']

    members = []
    for i in range(20):
        # High churn or low churn
        is_risk = random.random() > 0.7
        score = random.uniform(75, 95) if is_risk else random.uniform(5, 40)
        
        member = {
            "gym_id": gym_id,
            "first_name": f"Member{i}",
            "last_name": f"Test{i}",
            "email": f"member{i}@test.com",
            "last_churn_score": score,
            
            # Features
            "avg_class_frequency_total": random.uniform(0, 5) if is_risk else random.uniform(5, 15),
            "days_since_last_visit": random.randint(14, 60) if is_risk else random.randint(0, 7),
            "lifetime_tenure": random.uniform(1, 36),
            "age": random.randint(18, 60)
            # ... other features left null or default for speed, unless strict constraint
        }
        members.append(member)

    # Bulk insert members
    res = supabase.table("members").insert(members).execute()
    print(f"Inserted {len(res.data)} members.")

    # 2. Seed Monitoring Data (for Dashboard)
    print("Seeding monitoring data...")
    # Create a run
    run = supabase.table("model_monitor_runs").insert({
        "status": "WARN", 
        "output_drift_score": 0.15,
        "data_quality_score": 0.95
    }).execute()
    run_id = run.data[0]['id']

    # Create Score Stats
    supabase.table("model_monitor_score_stats").insert({
        "run_id": run_id,
        "total_scored": 20,
        "mean_score": 45.5,
        "p90_score": 88.0,
        "high_risk_count": 5
    }).execute()

    # Create Feature Stats (Mocking a few)
    feature_stats = [
        {"run_id": run_id, "feature_name": "age", "null_count": 0, "mean_value": 34.0, "min_value": 18, "max_value": 60},
        {"run_id": run_id, "feature_name": "lifetime_tenure", "null_count": 2, "mean_value": 12.5, "min_value": 1, "max_value": 36},
        {"run_id": run_id, "feature_name": "days_since_last_visit", "null_count": 0, "mean_value": 8.0, "min_value": 0, "max_value": 60}
    ]
    supabase.table("model_monitor_feature_stats").insert(feature_stats).execute()
    print("Seeding complete.")

if __name__ == "__main__":
    asyncio.run(seed())
