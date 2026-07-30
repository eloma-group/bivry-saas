# BIVRY SaaS - Database

PostgreSQL 16 on **Azure Database for PostgreSQL - Flexible Server**.
Prisma is the ORM and `backend/prisma/schema.prisma` is the single source of truth.

## What lives where

```
backend/prisma/
├── schema.prisma          <- SOURCE OF TRUTH. Edit this, nothing else.
├── migrations/            <- generated, committed, applied by `prisma migrate deploy`
└── seed.ts                <- dev accounts, one per portal

database/                  <- REFERENCE ONLY. Nothing here is executed by the app.
├── schema.md              <- every table, column, type, default and relation
├── prisma/
│   └── schema.snapshot.prisma   <- verbatim copy of the live schema
└── sql/
    ├── schema.sql         <- full CREATE script for an empty database
    ├── 00-bootstrap.sql   <- one time: CREATE DATABASE, extensions, app role
    └── 90-useful-queries.sql
```

The schema lives under `backend/` so that `cd backend && npm ci && npm run build`
is completely self contained. That is exactly what Azure and GitHub Actions run,
and a schema sitting outside the deployed folder breaks both.

**`database/` is generated, and it is generated on purpose:** open
[`schema.md`](schema.md) instead of connecting to the database when you need to
know what a column is called.

Regenerate all three files after any schema change:

```bash
npm run db:sql          # from the repo root, or from backend/
```

`.github/workflows/backend.yml` fails the build if they are out of date, so this
folder can never drift from reality.

## Connection string

`DATABASE_URL` in `backend/.env` locally, and an App Service application setting
in production. Azure requires TLS:

```
DATABASE_URL="postgresql://bivryadmin:PASSWORD@bivry.postgres.database.azure.com:5432/bivry-db?sslmode=require"
```

Notes for Flexible Server:

- Add your dev machine IP under **Networking > Firewall rules**.
- The username is plain (`bivryadmin`), not `bivryadmin@servername`. That older
  form was only for the retired Single Server.
- URL encode special characters in the password: `@` becomes `%40`, `#` becomes
  `%23`, `/` becomes `%2F`.
- Add `&connection_limit=5&pool_timeout=20` once the App Service plan scales out.
  Burstable tiers allow very few connections and each instance opens its own pool.

## Commands

Run from the repo root or from `backend/`.

| Command | What it does |
| --- | --- |
| `npm run db:generate` | Regenerate the Prisma client. Needed after every schema edit. |
| `npm run db:migrate` | Development: create a migration from the schema diff and apply it |
| `npm run db:deploy` | Production and CI: apply pending migrations, never generate new ones |
| `npm run db:sql` | Regenerate `schema.md`, `sql/schema.sql` and the snapshot |
| `npm run db:studio` | Browse and edit data in a local UI |
| `npm run db:seed` | Insert one dev account per portal |
| `npm run db:push` | Push the schema with no migration file. **Local scratch databases only.** |

Never run `db:push` or `db:migrate` against production: both can drop data, and
`db:push` records nothing in `_prisma_migrations`.

## Schema shape

Five independent login tables, one per portal:

| Table | Login page |
| --- | --- |
| `admins` | `/admin/login` |
| `customers` | `/customer/login` |
| `vendors` | `/vendor/login` |
| `employees` | `/employee/login` |
| `drivers` | `/driver/login` |

A credential lookup only ever runs against the table that owns the login page
the request came from, so a driver can never authenticate through the admin page
even if the same email exists in both tables.

Shared auth tables (`refresh_tokens`, `password_reset_tokens`, `login_attempts`)
are polymorphic on `actor_type` + `actor_id`. Prisma cannot express a
polymorphic foreign key, so integrity is enforced in the service layer.

Driver onboarding data lives in `driver_addresses`, `driver_licences`,
`driver_driving_histories`, `driver_police_verifications`, `driver_visas`,
`driver_medicals`, `driver_drug_tests` and `driver_documents`.

`driver_documents.storage_key` is the path inside the Azure Blob Storage
container, not a local filesystem path. The file bytes are never in Postgres.

## Seed accounts

`npm run db:seed` creates one account per portal with the password `Bivry@123`
(override with `SEED_PASSWORD`). Seeding is safe to re-run, every account is
upserted by email. Do not seed production.
