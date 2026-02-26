# API and Neon health check

The backend exposes a health endpoint. From the project root:

## Check backend health

```bash
curl -s http://localhost:3000/health
```

Expected: `{"ok":true}`

## With PowerShell

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
```

## Frontend

Set `VITE_API_URL` (e.g. `http://localhost:3000`) in `.env`. The app calls this backend for auth, data, and uploads; no Supabase.
