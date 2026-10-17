# Deploying the CBE Training System on Vercel

This copy of the project is already prepared for Vercel (`api/index.js`, `vercel.json`, SSL support,
report files stored in the database). Local use with XAMPP still works exactly as before.

## What you need
- A free GitHub account and a free Vercel account (https://vercel.com, sign in with GitHub)
- A **hosted MySQL database** (Vercel cannot reach XAMPP on your PC). Examples: Aiven for MySQL,
  TiDB Cloud Serverless, Railway MySQL, or any MySQL 5.7+ / MariaDB 10.4+ server with a public address.
- Node.js 18+ on your computer (only to create the tables once)

## Step 1 - Create the hosted MySQL database
1. Create a MySQL service with your provider.
2. Write down: **host, port, user, password, database name**.
3. If the provider says SSL is required (most do), you will set `DB_SSL=true` below.

## Step 2 - Create the tables (once, from your computer)
1. In the project folder run `npm install`.
2. Copy `.env.example` to `.env` and fill in the cloud values:
   ```
   DB_HOST=your-host
   DB_PORT=your-port
   DB_USER=your-user
   DB_PASSWORD=your-password
   DB_NAME=your-database-name
   DB_SSL=true
   ```
   If the provider does not allow creating databases (you were given a ready database), also set
   `DB_SKIP_CREATE=true`.
3. Run: `npm run db:init`
   - Add `-- --seed` to also load the demo accounts: `npm run db:init -- --seed`
   - Do NOT use `--fresh` on a managed database unless you want everything erased.
4. You should see: `Schema created successfully.`

Already have the old tables? Re-running `npm run db:init` is safe: it only adds the new `report_files` table.

## Step 3 - Put the project on GitHub
1. Create a new empty repository on GitHub.
2. In the project folder:
   ```
   git init
   git add .
   git commit -m "CBE training system"
   git branch -M main
   git remote add origin https://github.com/YOUR-USER/YOUR-REPO.git
   git push -u origin main
   ```
   `.env` and `node_modules` are excluded automatically (see `.gitignore`).

## Step 4 - Import into Vercel
1. Vercel dashboard -> **Add New... -> Project** -> choose your repository -> **Import**.
2. Framework Preset: **Other**. Leave Build Command and Output Directory empty.
3. Open **Environment Variables** and add:

| Name | Value |
|---|---|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | a long random string (40+ characters) |
| `SESSION_MAX_AGE_HOURS` | `8` |
| `DB_HOST` | your database host |
| `DB_PORT` | your database port |
| `DB_USER` | your database user |
| `DB_PASSWORD` | your database password |
| `DB_NAME` | your database name |
| `DB_SSL` | `true` (if your provider requires SSL) |
| `UPLOAD_MAX_SIZE_MB` | `4` |
| `DEFAULT_USER_PASSWORD` | the default password for new accounts |

4. Click **Deploy**. When it finishes, open the `https://your-project.vercel.app` link.

## Step 5 - First checks
1. Open the site, click **Sign in**, and log in as `admin`.
2. **Change the password of every demo account** (or do not seed demo data).
3. Admin -> Settings: set the contact details.
4. Test: register a student, import a CSV, submit a report as a student, download it as an instructor.

## Updating later
Push a change to GitHub (`git push`) and Vercel redeploys automatically.

## Good to know
- **File uploads** (fieldwork reports) are saved inside the database (table `report_files`).
  Vercel limits an upload request to about 4.5 MB, so keep reports under 4 MB.
- **Region:** Project -> Settings -> Functions -> choose the region closest to your database (faster pages).
- **Logs:** Vercel -> your project -> Deployments -> Logs shows errors.
- **Slow first page** after a quiet period is normal (serverless cold start).

## Troubleshooting
| Problem | Fix |
|---|---|
| Page shows "Server error" | Check Logs. Usually a wrong `DB_*` value. |
| `ECONNREFUSED` / timeout | The database host is not public, or a firewall blocks it. Allow all IPs (Vercel IPs change). |
| `SSL` or `handshake` error | Set `DB_SSL=true`. If the provider uses its own certificate, set `DB_SSL_REJECT_UNAUTHORIZED=false`. |
| `Too many connections` | Set `DB_CONNECTION_LIMIT=2`. |
| Cannot sign in after deploy | Tables or demo data were not created (Step 2). |
| Upload fails | File larger than 4 MB, or not PDF/DOC/DOCX. |

## Run locally (XAMPP) as before
Keep `UPLOAD_STORAGE` empty and `DB_SSL=false`, then `npm run db:init -- --fresh --seed` and `npm run dev`.
