# Drive

A Google Drive–like file manager: Google OAuth login, upload/rename/delete/search,
pluggable local-disk or S3 storage, file sharing (by email + public links), and a
dark-mode UI modeled on the assignment's Figma design.

Built for a Full Stack Engineer take-home assignment. See
[`INTERVIEW_PREP.md`](./INTERVIEW_PREP.md) for a walkthrough of every design
decision, written for the follow-up interview.

## Tech stack

| Layer | Choice |
|---|---|
| Backend | Node.js 24, Express 5, TypeScript |
| Auth | `passport-google-oauth20`, server-side sessions (`express-session` + `connect-mongo`) |
| Database | MongoDB / Mongoose 8 |
| Storage | Pluggable adapter — local disk **or** AWS S3 (same interface, one env var) |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, TanStack Query, Radix UI |
| Containerization | Docker + docker-compose (with MinIO, so S3 mode works with zero AWS account) |

## Repo layout

```
drive/
├─ server/        Express API (see server/src)
├─ web/           React SPA (see web/src)
├─ docker-compose.yml
├─ render.yaml    Render blueprint for the API
└─ INTERVIEW_PREP.md
```

## Architecture in one paragraph

The frontend and API deploy to two different hosts on the same registrable
domain (`drive.yashsachan.com` on Vercel, `api.yashsachan.com` on Render), which
makes them **same-site** even though they're different origins. That means the
session cookie can be scoped `Domain=.yashsachan.com; SameSite=Lax; Secure;
HttpOnly` and survive the trip — no `SameSite=None` third-party-cookie fragility,
which is the most common way this kind of split deployment breaks in a
reviewer's browser. CORS is still required (same-site ≠ same-origin), and a
double-submit CSRF token layers on top as defense-in-depth. File storage is
behind a small `StorageAdapter` interface with two implementations
(`LocalDiskAdapter`, `S3Adapter`); nothing outside `server/src/storage/` ever
touches `fs` or the AWS SDK directly.

## Running locally

**Prerequisites:** Node.js 24+, a MongoDB instance (local or Atlas), a Google
OAuth client.

### 1. Google OAuth credentials

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services →
   Credentials → **Create OAuth client ID** → Web application.
2. Authorized JavaScript origins: `http://localhost:5173`
3. Authorized redirect URIs: `http://localhost:4000/api/auth/google/callback`
4. On the **OAuth consent screen**, add yourself (and anyone else testing this)
   as a test user, or publish the app — otherwise Google refuses the login.
5. Copy the generated Client ID and Client Secret.

### 2. Server

```bash
cd server
cp ../.env.example .env      # then fill in GOOGLE_CLIENT_ID / SECRET, MONGODB_URI, SESSION_SECRET
npm install
npm run dev                  # http://localhost:4000
```

`SESSION_SECRET` just needs to be 32+ random characters — e.g.
`openssl rand -base64 32`. `STORAGE_DRIVER=local` (the default) needs nothing
else; files land under `server/data/uploads/`.

### 3. Web

```bash
cd web
npm install
npm run dev                  # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:4000`, so the app is
same-origin in dev too — cookies behave exactly as they do in production.

### 4. Try it

Open `http://localhost:5173`, sign in with Google, upload a file, rename it,
search for it, share it (open a second browser/incognito window and sign in
with a different Google account), trash it, restore it.

### Seeding demo data (optional)

```bash
cd server
npm run seed -- --demo
```

Creates two demo users and a small shared folder tree — the `--demo` flag is
required so this can never run against real data by accident.

### Tests

```bash
cd server
npm test          # vitest — mongodb-memory-server, no real DB/network needed
npm run typecheck
```

17 tests cover the full upload → rename → search → trash → restore →
permanent-delete lifecycle, the storage adapter contract (run against
`LocalDiskAdapter`; the same suite exercises `S3Adapter` against MinIO in
Docker), and — the highest-value tests in the suite — **cross-user
authorization**: a stranger gets 404 on someone else's file, a viewer-share gets
403 on a rename, CSRF is enforced, and public links 404 once revoked.

## Running with Docker

```bash
cp .env.example .env    # fill in GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
docker compose up --build
```

This starts Mongo, **MinIO** (an S3-compatible server), a one-shot bucket-setup
container, the API (`STORAGE_DRIVER=s3`, pointed at MinIO), and the web app
behind nginx — all with **zero AWS account required**. Open
`http://localhost:8080`.

> Docker Desktop was not available in the environment this was built in, so the
> compose stack is written to the same conventions as the code it runs (see
> `server/Dockerfile`, `web/Dockerfile`) but has not been run end-to-end here.
> If `docker compose up --build` surfaces anything, it's most likely a stale
> `node_modules` layer — `docker compose build --no-cache` first.

To use local-disk storage instead, in `docker-compose.yml`'s `api` service set
`STORAGE_DRIVER: local` and drop the `S3_*` vars — everything else is identical
because both drivers implement the same `StorageAdapter` interface.

## Deploying

The deployed split is **Vercel (frontend) + Render (API) + MongoDB Atlas + AWS
S3**, on one domain (e.g. `drive.example.com` + `api.example.com`) so the
session cookie stays same-site. Order matters — later steps need the URLs from
earlier ones.

### 1. MongoDB Atlas
Create a free M0 cluster, a database user, and set Network Access to
`0.0.0.0/0` (Render's free tier has no static outbound IP, so this is required,
not optional). Copy the connection string into `MONGODB_URI`.

### 2. AWS S3
Create a **private** bucket (Block Public Access fully on) and an IAM user
scoped to just this bucket:
```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:CopyObject"],
  "Resource": "arn:aws:s3:::YOUR_BUCKET/*"
}
```
No bucket CORS policy is needed — downloads are a server-issued redirect to a
presigned URL, not a direct browser upload/fetch.

### 3. Render (API)
- New → Web Service → Docker → point at this repo, root `server/` (or import
  `render.yaml` as a Blueprint).
- Health check path: `/healthz`.
- Add a custom domain (e.g. `api.example.com`) — Render's free tier supports
  this with managed TLS.
- Set all the env vars from `.env.example`'s server section, with
  `STORAGE_DRIVER=s3` and the S3 credentials from step 2.
- **Free-tier note:** the instance spins down after ~15 minutes idle and takes
  roughly a minute to wake back up on the next request — the frontend's login
  screen shows a "waking up the server…" state for exactly this reason. A free
  cron ping (e.g. cron-job.org hitting `/healthz` every 10 minutes) keeps it
  warm for a demo.

### 4. Google Cloud Console
Add the production redirect URI and origin now that the API's real hostname
exists: `https://api.example.com/api/auth/google/callback` and
`https://drive.example.com`. Publish the OAuth consent screen, or the reviewer
can't log in.

### 5. Vercel (frontend)
- Import the repo, root directory `web/`, framework Vite.
- Env: `VITE_API_URL=https://api.example.com`.
- Add the custom domain (`drive.example.com`).
- `web/vercel.json` is already committed with a catch-all rewrite to
  `index.html` — without it, a hard refresh on a client-side route like
  `/s/<token>` 404s.

### 6. Verify
- Sign in end-to-end on the deployed URL.
- DevTools → Application → Cookies: confirm the session cookie shows
  `Secure; HttpOnly; SameSite=Lax; Domain=.example.com`.
- Upload a file, then trigger a Render redeploy, then confirm the file is still
  downloadable — this is what actually proves S3 is wired up and not silently
  falling back to the ephemeral local disk.

## API surface

See [`INTERVIEW_PREP.md`](./INTERVIEW_PREP.md#rest-api-reference) for the full
route table. Every response uses one error envelope:
```json
{ "error": { "code": "FILE_NOT_FOUND", "message": "...", "requestId": "..." } }
```

## Known limitations / next steps

- **"Recent"** lists root-level items sorted by modified time, not a true
  recursive "recently touched anywhere" view — that needs a dedicated backend
  query spanning all folders.
- **Thumbnails, activity log, and folder-copy** are designed (see
  `INTERVIEW_PREP.md`) but not implemented — cut for time in favor of getting
  the required scope, sharing, and Docker fully solid and tested first.
- **Light theme** — the Figma design is dark-mode-only, so that's the only
  theme built.
- **Presigned direct-to-S3 upload** — uploads currently proxy through the API
  (deliberately, for server-authoritative validation — see
  `INTERVIEW_PREP.md`); a presigned-PUT path would remove that bottleneck at
  scale.
- The Docker compose stack is written but unverified end-to-end in this
  environment (no Docker Desktop available) — see the note above.
