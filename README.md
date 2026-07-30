# BIVRY - Fleet Management SaaS

A production-ready, authenticated **SaaS platform** for fleet management, built to feel
like Stripe / Linear / Vercel / Ramp - minimal, premium, enterprise-grade.

The repo is split so each deployable folder is completely self contained: it
declares its own dependencies and builds with nothing but `npm ci && npm run
build` inside it. That is what Azure and CI run, and anything that only resolves
through the repo root passes locally and fails there.

```
bivry-saas/
├── frontend/     React 18 + TypeScript + Vite + Tailwind   -> Azure Static Web App
├── backend/      Express + TypeScript + Prisma             -> Azure App Service
│   └── prisma/   schema.prisma (source of truth) + migrations + seed
├── database/     GENERATED reference: schema.md, DDL, SQL   -> read, never edit
├── .github/      one deploy workflow per deployable folder
└── package.json  concurrently only, no runtime dependencies
```

Deploying to Azure: **[DEPLOYMENT.md](DEPLOYMENT.md)**.
Looking up a table or column: **[database/schema.md](database/schema.md)** - no
need to open the database.

## Getting started

```bash
npm run install:all      # installs root, backend and frontend dependencies
                         # (to install just one, `cd` into that folder first -
                         #  `npm install --prefix backend` from the root can add
                         #  the root package as a dependency of the backend)
cp backend/.env.example backend/.env
# set DATABASE_URL and the two JWT secrets in backend/.env
npm run db:deploy        # create the tables
npm run db:seed          # one account per portal, password Bivry@123
npm run dev              # API on :5000, app on :5173
```

Locally, uploads go to `backend/uploads` and password reset links are printed to
the API console, so nothing external is needed to work on the app.

Other useful scripts from the repo root:

| Script | What it does |
| --- | --- |
| `npm run dev` | Runs backend and frontend together |
| `npm run dev:backend` / `npm run dev:frontend` | Runs just one side |
| `npm run build` | Type checks and builds both |
| `npm run typecheck` | Type checks both without emitting |
| `npm run db:generate` | Regenerates the Prisma client |
| `npm run db:migrate` | Creates and applies a migration (development) |
| `npm run db:deploy` | Applies pending migrations (production and CI) |
| `npm run db:sql` | Regenerates everything in `database/` from the schema |
| `npm run db:seed` | Inserts one dev account per role |
| `npm run db:studio` | Opens Prisma Studio |

## The five portals

Every role has its **own login page, its own API namespace and its own database
table**. A credential check only ever runs against the table belonging to the portal
the request came from, so a role mismatch cannot happen.

| Role | Login page | API namespace | Table |
| --- | --- | --- | --- |
| Admin | `/admin/login` | `/api/auth/admin` | `admins` |
| Customer | `/customer/login` | `/api/auth/customer` | `customers` |
| Vendor | `/vendor/login` | `/api/auth/vendor` | `vendors` |
| Employee | `/employee/login` | `/api/auth/employee` | `employees` |
| Driver | `/driver/login` | `/api/auth/driver` | `drivers` |

Each portal also has `/register` (where self signup is enabled), `/forgot-password`
and `/reset-password`.

### Auth endpoints (identical for all five portals)

```
POST   /api/auth/:role/register
POST   /api/auth/:role/login
POST   /api/auth/:role/refresh
POST   /api/auth/:role/logout
POST   /api/auth/:role/logout-all        (auth)
GET    /api/auth/:role/me                (auth)
POST   /api/auth/:role/forgot-password
GET    /api/auth/:role/verify-reset-token
POST   /api/auth/:role/reset-password
POST   /api/auth/:role/change-password   (auth)
```

Security built in: bcrypt hashing, short lived JWT access tokens, rotating refresh
tokens with reuse detection, account lockout after repeated failures, per endpoint
rate limits, a login audit trail, and hashed single use password reset tokens.

## Frontend structure

```
frontend/src/
  components/
    auth/       AuthShell · FormField · FormAlert
    layout/     sidebar/ · navbar/ · DashboardLayout · Logo
    driver/     DriverOnboarding · Stepper · ExpiryBadge · AvatarUpload · SuccessDialog
      forms/    reusable Fields + one component per section
      upload/   FileUpload · FormUpload
      camera/   CameraCapture (webcam dialog)
      summary/  SummaryCard (sticky)
    ui/         shadcn-style primitives
    common/     FullPageLoader
  config/       roles (the five portals)
  context/      AuthContext
  routes/       AppRoutes · ProtectedRoute · PublicOnlyRoute
  services/     api (axios + token refresh) · authService · driverService · session
  pages/        auth/ (login, register, forgot, reset) · PortalPicker · driver onboarding
  hooks/        useCamera · useDriverProgress · useAuthForm
  types/        auth · driver · nav
  utils/        date · validation
```

## Backend structure

```
backend/
  prisma/       schema.prisma (source of truth) · migrations/ · seed.ts
  scripts/      export-schema.mjs (regenerates database/)
  src/
    config/       env · prisma · roles (the role registry)
    controllers/  auth/ (one per portal) · driver
    services/     auth/ (auth, token, password) · driver · storage · mail
    middleware/   auth · error · rateLimiter · validate · upload
    routes/       auth/ (one per portal) · driver · admin · customer · vendor · employee
    validators/   auth · driver
    types/        auth.types · express.d.ts
    utils/        apiError · apiResponse · asyncHandler · duration · logger
```

## Driver Onboarding - features

- Horizontal **animated stepper** with live overall completion %
- **9 sections**: Personal, Address, Licence, Driving History, Police, Visa, Medical,
  Drug Test, Additional Documents
- **Live webcam capture** (`getUserMedia`) for profile photo + licence front/back
- **Automatic date logic** with green / orange / red expiry badges
- **Conditional rendering** for permanent address and visa
- **Sticky summary card** and real-time validation
- Fully **responsive** from mobile to 4K

## Infrastructure

| Piece | Runs on | Notes |
| --- | --- | --- |
| Frontend | Azure Static Web App | SPA fallback in `frontend/public/staticwebapp.config.json`, so a refresh on any deep link works |
| API | Azure App Service (Linux, Node 20) | prebuilt artifact, started with `node dist/server.js` |
| Database | Azure Database for PostgreSQL Flexible Server | schema owned by Prisma migrations |
| Uploaded files | Azure Blob Storage, private container | served to the browser as 15 minute SAS links |

Uploads go through `backend/src/services/storage.service.ts`, which picks its
driver from the environment: Blob Storage whenever
`AZURE_STORAGE_CONNECTION_STRING` is set, local disk otherwise. Nothing else in
the codebase knows which one is active, and production refuses to start on the
local driver - App Service disks are wiped on every restart.

Brand assets live in `frontend/public/brand/`.

Full setup, environment variables and a troubleshooting table:
**[DEPLOYMENT.md](DEPLOYMENT.md)**.
