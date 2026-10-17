# Jimma University — Community-Based Education (CBE) Training Management System

A web application for managing Jimma University's Community-Based Education (CBE) training program: students, community sites and partners, placements, attendance, fieldwork reports, competency assessments, and analytics. Built with Node.js, Express, EJS, and MySQL (XAMPP/MariaDB).

---

## Features

- **Public website** — a public interface with Home, About, Mission, Vision, and Contact Us pages, plus a contact form that notifies administrators.
- **Role-based access control** for five roles: Admin, Coordinator, Instructor, Student, Partner.
- **Students** — registration, editing, CSV import, and per-student history.
- **Community programs & activities** — CBE programs with planned training activities.
- **Community sites & partners** — sites, partner organizations, and partner user accounts.
- **Placements** — assign students to sites/groups/supervisors, bulk placement, withdrawal.
- **Attendance** — record sessions, per-student attendance, and statistics.
- **Fieldwork reports** — students submit reports; instructors/coordinators review, approve, or return with feedback.
- **Assessments** — configurable weighted criteria, per-student scoring, automatic grading, and release/revoke of results.
- **Analytics & CSV exports** — student registration, placements, attendance, assessments, fieldwork, program completion, and department performance.
- **Notifications & announcements** — in-app notifications and role-targeted announcements.
- **Admin** — user accounts, departments, academic years, student groups, announcements, system settings, and audit logs.
- **Partner portal** — partners confirm participation and submit feedback on assigned students.
- **Security** — bcrypt password hashing, parameterized SQL, per-session CSRF protection, role guards, and audit logging.

---

## Requirements

- **Node.js** 18+ (developed on Node 24)
- **XAMPP** (Apache optional, MySQL/MariaDB required) — or any MySQL 5.7+/MariaDB 10.4+
- A modern browser
- VS Code (recommended editor)

All front-end libraries (Bootstrap, Bootstrap Icons, Chart.js) are bundled locally under `public/vendor/`, so the app works fully **offline** — no CDN required.

---

## Installation & Setup

### 1. Start MySQL

Open the **XAMPP Control Panel** and start **MySQL**. Alternatively, from a terminal:

```powershell
Start-Process -FilePath "C:\xampp\mysql\bin\mysqld.exe" -ArgumentList "--defaults-file=C:\xampp\mysql\bin\my.ini" -WindowStyle Hidden
```

If MySQL fails to start, delete the stale PID file and try again: `C:\xampp\mysql\data\mysql.pid`.

### 2. Install dependencies

From the project root (`C:\xampp\htdocs\ju-cbe-training`):

```powershell
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` and adjust if needed:

```powershell
Copy-Item .env.example .env
```

Default values match a stock XAMPP install (user `root`, empty password). Key variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `SESSION_SECRET` | — | **Change in production** |
| `SESSION_MAX_AGE_HOURS` | `8` | Session lifetime |
| `DB_HOST` / `DB_PORT` | `127.0.0.1` / `3306` | MySQL host/port |
| `DB_USER` / `DB_PASSWORD` | `root` / (empty) | MySQL credentials |
| `DB_NAME` | `ju_cbe_training` | Database name |
| `UPLOAD_MAX_SIZE_MB` | `10` | Max upload size |
| `DEFAULT_USER_PASSWORD` | `Password@123` | Default password for new accounts |

### 4. Create the database and seed sample data

```powershell
npm run db:init -- --fresh --seed
```

- `--fresh` drops and recreates the database.
- `--seed` loads demo data (users, students, programs, sites, placements, attendance, reports, assessments).

Expected output: `Schema created successfully.` then `Sample data seeded successfully.`

### 5. Run the app

Development (auto-restart on changes):

```powershell
npm run dev
```

Production / plain start:

```powershell
npm start
```

Then open **http://localhost:3000**.

---

## Test Accounts

All seeded accounts use the password **`Password@123`**.

| Role | Username |
|---|---|
| Admin | `admin` |
| Coordinator | `coordinator` |
| Instructor | `instructor` |
| Student | `student` |
| Partner | `partner` |

Change the password after first login (Profile → Change password), and update `DEFAULT_USER_PASSWORD` and `SESSION_SECRET` for any real deployment.

---

## Running the Tests

The smoke test boots the app on an ephemeral port, logs in as all five roles, and crawls ~100 pages, flagging any 5xx responses or "Something went wrong" pages.

```powershell
npm test
```

Expected result: `Checks: 97, Failures: 0`.

---

## Project Structure

```
ju-cbe-training/
├── server.js                 # Entry point
├── .env / .env.example       # Configuration
├── package.json
├── database/
│   ├── schema.sql            # Tables, keys, constraints
│   └── seed.sql              # Demo data
├── scripts/
│   ├── init-db.js            # Create schema (+ --fresh, --seed)
│   └── seed.js               # Load seed data
├── src/
│   ├── app.js                # Express setup, session, middleware, route mounting
│   ├── config/db.js          # MySQL connection pool
│   ├── middleware/           # auth, csrf, upload, flash, audit, validation
│   ├── models/               # Data access (parameterized SQL)
│   ├── controllers/          # Request handlers
│   ├── routes/               # Express routers (mounted in app.js)
│   └── utils/helpers.js      # View helpers (dates, badges, grades, etc.)
├── views/                    # EJS templates (layouts, partials, pages)
├── public/
│   ├── css/app.css           # Custom styling
│   ├── js/app.js             # Client behaviors (confirm, filters, sort)
│   └── vendor/               # Bootstrap, Icons, Chart.js (offline)
├── uploads/                  # Uploaded fieldwork reports
└── tests/smoke.js            # End-to-end page crawl
```

---

## Campus Network Deployment Notes

- Set a strong, random `SESSION_SECRET` and a non-empty database password.
- Set `NODE_ENV=production`.
- Run behind a reverse proxy or process manager (e.g., PM2, IIS with `iisnode`, or `nginx`).
- Use HTTPS; set `app.set('trust proxy', 1)` behind a proxy if you rely on secure cookies.
- Schedule regular backups of the `ju_cbe_training` database and the `uploads/` directory.
- Do not commit the `.env` file or uploaded files to version control.

---

## Public Website & Branding

The app exposes a public (unauthenticated) interface at the site root:

| Path | Page |
|---|---|
| `/` | Home |
| `/about` | About |
| `/mission` | Mission |
| `/vision` | Vision |
| `/contact` | Contact Us (with a message form) |

Signed-in users still reach their workspace via **Dashboard**; the public navbar shows a **Dashboard** button instead of **Sign in** when authenticated.

### Logo

A small Jimma University logo is shown at the top of the public navbar, the authenticated top bar, the sidebar, and the login page. The logo is served from:

```
public/img/ju-logo.jpg
```

The source image is kept in the `logo/` folder (`logo/Jimma-University-New-Logo.jpg`) and copied to `public/img/ju-logo.jpg`. To update the logo, replace `public/img/ju-logo.jpg` with a new image of the same name (a square/transparent PNG works best), or update the references in `views/layouts/public.ejs`, `views/partials/topbar.ejs`, `views/partials/sidebar.ejs`, and `views/auth/login.ejs`.

### Contact details

The public Contact Us page reads `contact_email`, `contact_phone`, and `contact_address` from **Admin → Settings**. Set them there so the contact page displays real details. Contact form submissions generate an in-app notification for all active administrators.

---

## CSV Import Format (Students)

When importing students (Students → Import), provide a CSV with a header row. Recognized columns:

| Column | Required | Notes |
|---|---|---|
| `student_id` | Yes | Unique student registration number |
| `full_name` | Yes | |
| `gender` | No | `Male`, `Female`, or `Other` (defaults to `Other`) |
| `department_code` | No | Matched against the department **code** (e.g. `PH`) |
| `year_of_study` | No | Integer (defaults to `1`) |
| `date_of_birth` | No | `YYYY-MM-DD` |
| `email` | No | |
| `phone` | No | |
| `address` | No | |

The username is set to the `student_id`, and the account password defaults to `DEFAULT_USER_PASSWORD`. Rows missing `student_id`/`full_name`, or with an existing student ID, are reported and skipped.

Example:

```csv
student_id,full_name,gender,department_code,year_of_study,email,phone,address
CBE/001/2016,Jane Doe,Female,PH,3,jane@example.com,0911000001,Jimma
```

---

## License

Developed for Jimma University internal use.

---

## Deploying on Vercel

See **DEPLOY_VERCEL.md** for the step-by-step guide. In short: hosted MySQL + `npm run db:init`,
push to GitHub, import into Vercel, add the environment variables, deploy.
