import psycopg2
import os

# Cloud Supabase DB creds
# Project Ref: upfnwbttokjtljwdvblj
DB_HOST = "db.upfnwbttokjtljwdvblj.supabase.co"
DB_PORT = "5432"
DB_NAME = "postgres"
DB_USER = "postgres"
DB_PASS = "qssx7F3YpRGHDbsW" 

def apply_migration():
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            port=DB_PORT,
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASS,
            sslmode='require' 
        )
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Connected to Local DB. Applying migration...")
        
        with open("supabase/migrations/015_emergency_fix.sql", "r") as f:
            sql = f.read()
            
        cur.execute(sql)
        print("Migration applied successfully.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Migration Failed: {e}")
        exit(1)

if __name__ == "__main__":
    apply_migration()
