# Observability & Monitoring Guide

## Supabase Unified Logs
Supabase provides the central view for Database, Auth, Storage, and Edge Function logs.

### Accessing Logs
1.  Go to **Supabase Dashboard**.
2.  Click **Logs Explorer** (Sidebar).

### Common Filters
-   **API Errors (5xx)**:
    ```sql
    select * from edge_logs
    where status_code >= 500
    order by timestamp desc
    ```
-   **Auth Failure**:
    ```sql
    select * from auth.users
    where error is not null
    ```
-   **Database Slow Queries**:
    Navigate to **Database** -> **Query Performance** to see slow query logs.

## Log Drains (External Monitoring)
For long-term retention or alerting (PagerDuty/Slack), configure **Log Drains**:
1.  Settings -> Log Drains.
2.  Support HTTP/Syslog destinations (e.g., Datadog, Axiom).
3.  *Note:* Requires Pro Plan or higher.

## Application Logging
-   **API Middleware**: All requests processed by our FastAPI backend are logged with `[METHOD] PATH - STATUS - DURATION`.
    -   View these in **Vercel Runtime Logs** or Supabase Logs if deployed as Edge Function.
-   **Audit Logs**: Business-logic events are stored in `public.audit_logs`. View in the **Activity Dashboard** (`/activity`) or SQL.
    ```sql
    select * from audit_logs where action = 'send_sms' order by created_at desc;
    ```

## Debugging Workflow
1.  **Reproduce**: Identify time and user.
2.  **Check Audit**: Did the user even trigger the action?
3.  **Check API Logs**: Did the request reach the backend? What was the status code?
4.  **Check DB Logs**: Did the SQL query fail or timeout?
