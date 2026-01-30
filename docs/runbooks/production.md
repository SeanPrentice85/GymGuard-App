# Production Runbook

## High Severity Incidents

### API Down / 500 Errors
1.  **Check Status**: Visith `/health` endpoint and Vercel Dashboard.
2.  **Check Logs**: Go to Supabase Dashboard -> Database -> Logs -> API Middleware logs (if piped) or Vercel Runtime Logs.
3.  **Restart**: Redeploy latest commit in Vercel to cycle instances.
4.  **Database Connection**: Verify Supabase connection pooler is active (Transaction Mode on port 6543).

### Supabase Queries Failing
1.  **Check Service Status**: [status.supabase.com](https://status.supabase.com)
2.  **Check Resource Usage**: Supabase Dashboard -> Reports -> CPU/RAM. If CPU > 90%, kill long-running queries via SQL Editor (`SELECT pg_terminate_backend(pid) ...`).
3.  **Check Credentials**: Verify `SUPABASE_SERVICE_ROLE_KEY` is not expired or rotated.

### n8n Sync Failing
1.  **Check Execution Log**: n8n Dashboard -> Executions -> Filter by "Error".
2.  **Retry**: Manually retry failed workflow execution.
3.  **Supabase Access**: Verify n8n credentials for Supabase are valid.

### Webhooks Failing (Twilio)
1.  **Check DLQ**: Query `dead_letter_messages` table for recent failures.
2.  **Twilio Logs**: Check Twilio Console -> Monitor -> Logs -> Errors (e.g., 30008 Catch-all).
3.  **Re-queue**: If transient, re-insert valid payloads into campaign processing queue manually.

## Deployment & Rollback

### How to Rollback
1.  **Vercel**: Go to Vercel Dashboard -> Deployments -> Click "..." on previous working deployment -> "Promote to Production".
2.  **Supabase Migration**: If DB migration caused issue:
    -   Identify migration ID.
    -   Run revert script (if available) or manually `ALTER TABLE` to undo changes.
    -   *Warning*: Data loss possible if reverting destructive schema changes.

## Backups & Restore Plan
**See [Backups Plan](../supabase/backups.md) for full details.**

> [!WARNING]
> **DOWNTIME WARNING**: Restoring from a backup (PITR or Daily) overrides the current database. This process takes the database OFFLINE for the duration of the restore (minutes to hours depending on size).

1.  **Severity Check**: Only restore if data corruption is unfixable via SQL updates.
2.  **Initiate**: Supabase Dashboard -> Settings -> Database -> Backups.
