# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Database and API setup (Neon + Node backend)

This app uses **Neon** (PostgreSQL) and a **Node.js backend** instead of Supabase.

1. **Create a Neon project** at [neon.tech](https://neon.tech) and copy the connection string.
2. **Apply the schema**: In the Neon SQL Editor, run the entire `neon.sql` file from the repo root (this creates tables, RLS, functions, and seed data).
3. **Backend env**: In the `server/` directory, create a `.env` file with:
   - `DATABASE_URL` – your Neon connection string
   - `JWT_SECRET` – a long random string for signing JWTs
   - `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` – for payments (optional if not using Razorpay)
   - `RESEND_API_KEY` – for password-reset emails (optional)
   - `API_URL` or `API_PUBLIC_URL` – base URL of the API (e.g. `http://localhost:3000`) for links in emails and signed URLs
4. **Run the backend**: From the repo root, `cd server && npm install && npm run dev` (or `node index.js`). The API runs on port 3000 by default.
5. **Frontend env**: In the project root, set `VITE_API_URL=http://localhost:3000` (or your backend URL) in `.env`. Remove any `VITE_SUPABASE_*` variables.
6. **Run the frontend**: `npm i && npm run dev`. The app will call the backend for auth, data, and uploads.

See `scripts/HEALTH_CHECK.md` for checking that the API is up.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Neon (PostgreSQL) and Node.js backend (Express) for API, auth, and uploads

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
