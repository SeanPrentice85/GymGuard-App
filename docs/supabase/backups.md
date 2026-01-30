# Supabase Backups & Recovery Plan

## 1. Backup Configuration
**Verification Steps:**
1.  Log in to Supabase Dashboard.
2.  Navigate to **Settings** -> **Database** -> **Backups**.
3.  Confirm **Point-In-Time Recovery (PITR)** is `Enabled` (if on Pro Tier) or `Daily Backups` are being listed.

### Capabilities
-   **Daily Backups**: Taken automatically every 24 hours. Retention depends on plan (7 days for Free/Pro).
-   **PITR**: Allows restoring to any second in the last 7+ days. *Critical for undoing accidental mass deletions.*

## 2. Recovery Targets
Define our operational limits:

| Metric | Target | Notes |
| :--- | :--- | :--- |
| **RPO (Recovery Point Objective)** | < 1 minute | Max acceptable data loss. Achieved via PITR. |
| **RTO (Recovery Time Objective)** | < 1 hour | Max acceptable downtime. Depeneds on DB size. |

## 3. How to Restore
> [!CAUTION]
> **DOWNTIME REQUIRED**: The database will be unavailable during restore.

1.  **Notify Stakeholders**: Alert users via status page or email that maintenance is imminent.
2.  **Select Point**: In Supabase Dashboard -> Backups, choose the date/time *just before* the incident occurred.
3.  **Confirm**: Type project name to confirm overwrite.
4.  **Wait**: Monitor progress. Do not restart the project during this time.
5.  **Verify**: Once back online, run health check (`/api/health`) and verify data integrity in `audit_logs`.

## 4. Post-Restore Checklist
-   [ ] Verify application connectivity.
-   [ ] internal `audit_logs` show recent "System Restore" event (manually insert note if needed).
-   [ ] Check n8n workflows aren't trying to process old/duplicate data (reset state if needed).
