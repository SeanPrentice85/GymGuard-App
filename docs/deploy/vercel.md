# Vercel Deployment & Environment Variables

## Environment Variable Checklist
Ensure these are set in Vercel **Project Settings** -> **Environment Variables**.

### Public (Exposed to Browser)
| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Application URL for Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Safe, public key for client-side Auth. |
| `NEXT_PUBLIC_API_URL` | URL of the backend API (e.g., `https://api.gym-app.com`). |
| `NEXT_PUBLIC_X_API_KEY` | *Legacy/Internal use only*. Client key if needed (Phase 13 moves to Bearer). |

### Secrets (Server-side Only)
> [!IMPORTANT]
> Never expose these safely to the client.

| Variable | Description |
| :--- | :--- |
| `SUPABASE_SERVICE_ROLE_KEY` | **Critical**. Admin access to bypass RLS. |
| `TWILIO_ACCOUNT_SID` | Twilio Account ID. |
| `TWILIO_AUTH_TOKEN` | Twilio Secret Token. |
| `TWILIO_PHONE_NUMBER` | Sending number. |
| `X_API_KEY` | Secret Key for internal API protection. |
| `CORS_ORIGINS` | Comma-separated allowed origins (e.g., `https://my-gym-app.vercel.app`). |

## Deployment Procedure
1.  **Push to Git**: Commits to `main` automatically trigger deployment.
2.  **Env Var Updates**:
    -   If you add/change a variable in Vercel UI, you **MUST Redeploy**.
    -   Go to **Deployments** -> **Redeploy** (dots menu) to pick up new config.
3.  **Database Migrations**: Run SQL migrations via Supabase CLI or Dashboard **before** deploying code that depends on them.
