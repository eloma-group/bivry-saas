# BIVRY SaaS - Azure deployment

End to end setup for the Azure resources you already created, wired to
GitHub Actions. Follow the steps in order; each one assumes the previous one is
done.

If you only want the day to day commands, jump to
[Working on the schema](#working-on-the-schema).

---

## 0. Architecture

```
                                       ┌──────────────────────────────────┐
   browser ──── HTTPS ────────────────►│ Azure Static Web App             │
                                       │ bivry-dashboard                  │
                                       │ React + Vite build (dist/)       │
                                       │ SPA fallback -> index.html       │
                                       └──────────────────────────────────┘
                │
                │  XHR to https://bivry-api.azurewebsites.net/api
                │  Authorization: Bearer <access token>
                ▼
   ┌────────────────────────────────────┐
   │ Azure App Service (Linux, Node 20) │
   │ bivry-api                          │
   │ Express + Prisma, node dist/server │
   └───────┬────────────────────┬───────┘
           │                    │
           │ TLS               │ HTTPS + SAS
           ▼                    ▼
 ┌───────────────────┐  ┌──────────────────────────┐
 │ PostgreSQL        │  │ Blob Storage             │
 │ Flexible Server   │  │ container: driver-        │
 │ database: bivry-db│  │ documents (private)      │
 └───────────────────┘  └──────────────────────────┘
```

Two independent deploy pipelines, so a frontend change never restarts the API:

| Workflow | Triggered by | Does |
| --- | --- | --- |
| `.github/workflows/backend.yml` | changes under `backend/` or `database/` | install, generate Prisma client, typecheck, verify `database/` docs, compile, `prisma migrate deploy`, deploy to App Service, health check |
| `.github/workflows/frontend.yml` | changes under `frontend/` | install, build with `VITE_API_URL`, deploy to Static Web Apps |

**Why the frontend and API are on separate origins.** Static Web Apps can only
proxy `/api` to your own App Service on the Standard plan ("linked backend").
On the Free plan the frontend calls the API's own hostname directly, which is
why CORS and the `SameSite=None` refresh cookie both matter below. Refresh
tokens are also sent in the request body, so the app keeps working even if a
browser blocks third party cookies entirely.

---

## 1. Resource names

These are the real resource names for this project. Everything below uses them
literally, so you can copy commands and settings without editing them.

| Thing | Name | Notes |
| --- | --- | --- |
| Resource group | `BivrySoftware` | - |
| Region | whatever the App Service uses | keep every resource in the SAME region |
| Postgres server | `bivry` | -> `bivry.postgres.database.azure.com` |
| Postgres admin user | `bivryadmin` | - |
| Database name | `bivry-db` | created in step 2. **Different from the server name.** The hyphen means it must be quoted in raw SQL. |
| App Service | `bivry-api` | -> `https://bivry-api.azurewebsites.net` |
| Static Web App | `bivry-dashboard` | -> `https://<generated>.azurestaticapps.net` |
| Storage account | `bivrystorage` | - |
| Blob container | `driver-documents` | created in step 3 |
| Key Vault | `bivry-keyvault` | optional, see step 5 |

Same region for all of them is not cosmetic: cross region traffic adds latency to
every query and every file read, and you pay egress for it.

---

## 2. PostgreSQL Flexible Server

### 2.1 Allow yourself in

Portal -> `bivry` (the server) -> **Settings > Networking**:

1. **Public access** should be selected (private VNet access needs an App
   Service in the same VNet, which the Basic plan cannot do).
2. Tick **Allow public access from any Azure service within Azure to this
   server**. This is what lets the App Service connect.
3. **+ Add current client IP address** so you can connect from your laptop.
4. Confirm **Require secure transport** is **ON** (the default). Every
   connection string below therefore ends in `sslmode=require`.
5. **Save**, and wait for the deployment to finish.

> Your home IP changes. When migrations suddenly fail with
> `P1001: Can't reach database server`, re-add your current IP here first.

### 2.2 Create the database

The server ships with a `postgres` database; the app gets its own. Easiest way
without installing anything:

Portal -> `bivry` -> **Databases** -> **+ Add**, name `bivry-db`, charset
`UTF8`, collation `en_US.utf8`.

If you prefer SQL, `database/sql/00-bootstrap.sql` does the same thing plus the
`pgcrypto` extension:

```bash
psql "host=bivry.postgres.database.azure.com port=5432 dbname=postgres user=bivryadmin sslmode=require" \
  -f database/sql/00-bootstrap.sql
```

### 2.3 Build the connection string

```
postgresql://bivryadmin:PASSWORD@bivry.postgres.database.azure.com:5432/bivry-db?sslmode=require
```

Three things that break this and are hard to spot:

- **URL encode the password.** `@` -> `%40`, `#` -> `%23`, `/` -> `%2F`,
  `:` -> `%3A`. An unencoded `@` makes Prisma parse the wrong hostname.
- **The username is plain `bivryadmin`**, not `bivryadmin@bivry`. The
  `user@server` form only applied to the retired Single Server.
- **Keep `?sslmode=require`.** Without it the server rejects the connection.

Do not create tables yet. Prisma does that in step 7.

---

## 3. Blob Storage

This is where every driver licence, medical certificate and police check ends
up. Treat the settings below as security settings, not defaults to click past.

### 3.1 Create the storage account

Portal -> search **Storage accounts** -> **+ Create**.

**Basics tab**

| Field | Value | Why |
| --- | --- | --- |
| Subscription | your subscription | |
| Resource group | `BivrySoftware` | same group as everything else |
| Storage account name | `bivrystorage` | 3-24 characters, **lowercase letters and digits only**, and globally unique across all of Azure. If it is taken, add a suffix: `bivrystorageau`. |
| Region | **the same region as the App Service** | every upload and download crosses this link. A different region adds latency to each one and you pay egress for it. |
| Primary service | Azure Blob Storage or Azure Data Lake Storage Gen2 | |
| Performance | **Standard** | Premium is for single digit millisecond latency. Documents do not need it and it costs several times more. |
| Redundancy | **LRS** (Locally redundant storage) | three copies in one datacentre. Cheapest, and enough to start. Choose **GRS** instead if losing these documents to a regional outage would be a compliance problem - it replicates to a second region for roughly twice the price. |

**Advanced tab** - this is the one that matters:

| Field | Value | Why |
| --- | --- | --- |
| Require secure transfer for REST API operations | **Enabled** | rejects plain HTTP |
| Allow enabling anonymous access on individual containers | **Disabled** | with this off, nobody can ever make a container public by accident. The app never needs it: it signs time limited URLs instead. |
| Enable storage account key access | **Enabled** | required. The app signs SAS URLs with the account key. |
| Default to Microsoft Entra authorization in the Azure portal | Enabled (optional) | only affects the portal UI |
| Minimum TLS version | **1.2** | |
| Permitted scope for copy operations | From any storage account | default |
| Enable hierarchical namespace | **Unchecked** | that is Data Lake Gen2. It changes the API surface and breaks nothing here, but you do not need it. |
| Access tier | **Hot** | documents are read while a driver is being onboarded and reviewed. Cool tier charges for early deletion and for reads. |

**Networking tab**

| Field | Value |
| --- | --- |
| Network access | **Enable public access from all networks** |
| Routing preference | Microsoft network routing |

Public access here means *reachable at a URL*, not *readable by anyone*. Every
request still needs a key or a signature. Restricting to selected networks
requires the App Service to be VNet integrated, which the Basic plan cannot do -
revisit it if you move to a Premium plan.

**Data protection tab**

| Field | Value | Why |
| --- | --- | --- |
| Enable soft delete for blobs | **On, 7 days** | the API hard deletes a blob when a driver removes a document. Soft delete gives you a week to undo a mistake. Worth it. |
| Enable soft delete for containers | On, 7 days | protects against deleting the whole container |
| Enable versioning | Off | each upload already gets a unique timestamped key, so nothing is ever overwritten |

**Encryption tab** - leave the defaults (Microsoft managed keys, all services
encrypted).

**Review + create** -> **Create**. Takes about 30 seconds.

<details>
<summary>Azure CLI equivalent</summary>

```bash
az storage account create \
  --name bivrystorage \
  --resource-group BivrySoftware \
  --location australiaeast \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot \
  --min-tls-version TLS1_2 \
  --https-only true \
  --allow-blob-public-access false

az storage blob service-properties delete-policy update \
  --account-name bivrystorage --enable true --days-retained 7
```
</details>

### 3.2 Create the container

Storage account -> **Data storage > Containers** -> **+ Container**

| Field | Value |
| --- | --- |
| Name | `driver-documents` |
| Anonymous access level | **Private (no anonymous access)** |

Private is the whole point. Driver licences, medicals and police checks must
never be reachable by guessing a URL. The API hands out a signature that expires
after 15 minutes instead.

The name must match `AZURE_STORAGE_CONTAINER`. If you skip this step the app
creates the container itself on first use, privately, so it is safe either way -
but creating it now means you find a wrong key immediately rather than on a
driver's first upload.

### 3.3 Copy the connection string

Storage account -> **Security + networking > Access keys** -> **key1** ->
**Show** -> copy **Connection string** (not the key on its own).

It looks like:

```
DefaultEndpointsProtocol=https;AccountName=bivrystorage;AccountKey=abc...==;EndpointSuffix=core.windows.net
```

This single string carries full read/write access to the account. Treat it like
a password: it belongs in `backend/.env` locally (git ignored) and in an App
Service application setting in production. Never in the frontend, never in a
commit.

There are two keys so you can rotate without downtime: switch everything to
key2, then regenerate key1.

### 3.4 Test it before deploying

Paste the connection string into `backend/.env`:

```
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=..."
AZURE_STORAGE_CONTAINER=driver-documents
```

Then:

```bash
npm run check:storage --prefix backend
```

It uploads a test file, reads it back, signs a URL, fetches that URL with no
credentials to prove it opens in a browser, deletes the file and confirms it is
gone. Everything should say `PASS` and the driver should read `blob`:

```
driver     : blob
  PASS  connect to storage
  PASS  upload a file  https://bivrystorage.blob.core.windows.net/driver-documents/...
  PASS  read it back  44 bytes, text/plain
  PASS  sign a preview URL  expires 2026-07-30T08:15:00.000Z
  PASS  open the signed URL anonymously
  PASS  delete it
```

If it says `driver : local`, the connection string was not picked up - check for
a typo in the variable name, and that you edited `backend/.env` and not
`backend/.env.example`.

Common failures:

| Message | Cause |
| --- | --- |
| `AuthenticationFailed` / `Signature did not match` | connection string truncated when copying, or key rotated since |
| `getaddrinfo ENOTFOUND` | account name typo in the connection string |
| `AuthorizationFailure` | "Enable storage account key access" is off (step 3.1, Advanced tab) |
| `no SAS signature in the URL` | the connection string has no `AccountKey`. A SAS-only or Entra-only string cannot sign URLs. |

### 3.5 Lifecycle rule (recommended)

An upload writes the blob before the database row, so a request that dies in
between leaves an orphan. This sweeps them up.

**Data management > Lifecycle management** -> **+ Add a rule**

- Rule name: `purge-old-blobs`
- Rule scope: **Limit blobs with filters**
- Blob type: Block blobs, Base blobs
- Prefix match: `driver-documents/drivers/`
- Condition: **Delete the blob** `365` days after last modification

365 days is deliberately conservative: these are compliance documents, and a
blob still referenced by a live database row would be deleted too. Only shorten
it if you are certain about your retention rules.

### 3.6 CORS (only if you need it)

Not required for the current app. The browser puts signed URLs into `<img src>`
and `<a href>` tags, which are not subject to CORS. It becomes necessary the
moment anything calls `fetch()` on a blob URL - an in-page PDF viewer, or a
canvas thumbnail.

**Settings > Resource sharing (CORS)** -> **Blob service**:

| Allowed origins | Allowed methods | Allowed headers | Exposed headers | Max age |
| --- | --- | --- | --- | --- |
| your Static Web App URL | GET, HEAD | `*` | `*` | 3600 |

List the exact origin. `*` with credentials is rejected by browsers anyway.

---

## 4. App Service (the API)

Portal -> `bivry-api` -> **Settings > Configuration**.

### 4.1 General settings

| Setting | Value | Why |
| --- | --- | --- |
| Stack | Node | |
| Major version | Node 20 LTS | matches `engines` in `backend/package.json` and the CI runner |
| Startup Command | `node dist/server.js` | the artifact is prebuilt, so nothing should try to build or guess an entry point |
| Always On | **On** | without it the app is unloaded when idle and the first request after that takes 20+ seconds. Needs Basic or higher. |
| HTTP version | 2.0 | |
| HTTPS Only | **On** | the refresh cookie is `Secure`, so it is never sent over plain HTTP |
| Minimum TLS version | 1.2 | |

### 4.2 Health check

**Monitoring > Health check** -> Enable, path `/api/health`.

That endpoint runs `SELECT 1`, so an instance that lost the database is taken
out of rotation instead of serving errors.

### 4.3 Do NOT configure App Service CORS

**API > CORS** must be left **empty**.

Express already handles CORS in `backend/src/app.ts`. If you also fill in the
App Service CORS blade, the platform intercepts the preflight and strips the
`Access-Control-Allow-Credentials` header that the refresh cookie needs. The
symptom is login working in Postman but failing in the browser with an opaque
CORS error.

---

## 5. Application settings (the API's environment)

**Settings > Environment variables > App settings** -> **+ Add** for each row,
then **Apply**. These arrive in the process as ordinary environment variables,
which is why there is no `.env` file in production.

| Name | Value | Notes |
| --- | --- | --- |
| `NODE_ENV` | `production` | turns on the strict startup checks, `Secure` cookies and the CORS allow list |
| `WEBSITE_RUN_FROM_PACKAGE` | `1` | run from the deployed zip: faster cold start, atomic swap |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` | CI already built it. Leaving this on makes Azure re-run npm install and it will fail without a schema present. |
| `FRONTEND_URL` | `https://<your-swa>.azurestaticapps.net` | **no trailing slash.** CORS allow list + the host in password reset links. |
| `DATABASE_URL` | the string from step 2.3 | |
| `JWT_ACCESS_SECRET` | 96 hex chars | see below |
| `JWT_REFRESH_SECRET` | a *different* 96 hex chars | |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | |
| `AZURE_STORAGE_CONNECTION_STRING` | from step 3.2 | |
| `AZURE_STORAGE_CONTAINER` | `driver-documents` | |
| `AZURE_STORAGE_SAS_TTL_MINUTES` | `15` | |
| `MAX_UPLOAD_SIZE_MB` | `15` | |
| `SMTP_HOST` | e.g. `smtp.azurecomm.net` | |
| `SMTP_PORT` | `587` | **port 25 is blocked on Azure.** Use 587 or 465. |
| `SMTP_SECURE` | `false` | `true` only for port 465 |
| `SMTP_USER` | your SMTP username | |
| `SMTP_PASSWORD` | your SMTP password | |
| `MAIL_FROM` | `BIVRY <no-reply@yourdomain.com>` | must be an address your SMTP provider has verified |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES` | `30` | |
| `MAX_FAILED_LOGIN_ATTEMPTS` | `5` | |
| `ACCOUNT_LOCK_MINUTES` | `15` | |
| `ALLOW_ADMIN_SIGNUP` | `false` | |
| `ALLOW_EMPLOYEE_SIGNUP` | `false` | |
| `ALLOW_CUSTOMER_SIGNUP` | `true` | |
| `ALLOW_VENDOR_SIGNUP` | `true` | |
| `ALLOW_DRIVER_SIGNUP` | `true` | |

Generate each JWT secret separately:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**The server refuses to boot in production** if `DATABASE_URL`,
`AZURE_STORAGE_CONNECTION_STRING` or the SMTP settings are missing, or if
`FRONTEND_URL` still points at localhost. That check lives in
`assertProductionConfig()` in `backend/src/config/env.ts`. It is deliberate: all
three failures are silent otherwise. Missing storage means uploads vanish on the
next restart, and missing SMTP means every password reset email goes nowhere with
a success message on screen.

### Optional: move the secrets into Key Vault

Once it works, replace the four secret values with Key Vault references so
nobody reads them off the portal blade:

1. App Service `bivry-api` -> **Identity** -> System assigned -> **On**. Copy
   the object ID it shows.
2. Key Vault `bivry-keyvault` -> **Access control (IAM)** -> **+ Add role
   assignment** -> **Key Vault Secrets User** -> assign to that managed
   identity. (If the vault still uses access policies rather than RBAC, use
   **Access policies** -> **Create** -> **Get** + **List** on secrets instead.)
3. Key Vault -> **Objects > Secrets** -> **+ Generate/Import** for each one,
   e.g. a secret named `database-url`.
4. Change the app setting value to a reference:

   ```
   @Microsoft.KeyVault(SecretUri=https://bivry-keyvault.vault.azure.net/secrets/database-url/)
   ```

   The App Service resolves it at startup. If it shows up literally in
   **Environment variables** with a red "Key vault reference" status, the role
   assignment has not propagated yet - wait a minute and restart the app.

---

## 6. Static Web App (the frontend)

Portal -> `bivry-dashboard`:

1. **Overview** -> copy the URL (`https://something-1234.azurestaticapps.net`).
   Put it in the App Service's `FRONTEND_URL` from step 5 if you have not
   already.
2. **Overview > Manage deployment token** -> **Copy**. Needed in step 7.
3. If Static Web Apps already created its own workflow file when you connected
   the repo (`.github/workflows/azure-static-web-apps-*.yml`), **delete that
   file**. `.github/workflows/frontend.yml` in this repo replaces it and does the
   build correctly; two workflows deploying the same app fight each other.

### SPA fallback - already handled

`frontend/public/staticwebapp.config.json` is copied into `dist/` by Vite on
every build. It contains:

```json
"navigationFallback": { "rewrite": "/index.html", "exclude": ["/assets/*", ...] }
```

Without it, opening or refreshing `https://.../driver/login` asks Static Web Apps
for a file at that path, which does not exist, and you get a 404 instead of your
app. With it, any non asset path serves `index.html` and React Router takes over,
so a refresh on a protected page lands on that portal's login page exactly as it
does locally.

`/assets/*` is excluded so a genuinely missing JS or CSS file 404s honestly
instead of returning HTML with a 200, which would otherwise surface as
`Unexpected token '<'` in the console.

---

## 7. GitHub secrets and variables

Repo -> **Settings > Secrets and variables > Actions**.

### Secrets tab

| Name | Where to get it |
| --- | --- |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | App Service -> **Overview** -> **Download publish profile**. Paste the whole XML file contents. |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | the deployment token from step 6.2 |
| `DATABASE_URL` | same connection string as step 2.3. The workflow uses it for `prisma migrate deploy`. |

If **Download publish profile** is greyed out: App Service ->
**Settings > Configuration > General settings** -> set **SCM Basic Auth
Publishing Credentials** to **On**.

### Variables tab

| Name | Value |
| --- | --- |
| `VITE_API_URL` | `https://bivry-api.azurewebsites.net/api` |

A variable, not a secret: Vite bakes it into the JavaScript bundle, so it is
public by definition. The workflow fails fast if it is missing, because the
alternative is a deployed frontend that silently calls the wrong host.

### Optional: protect production

**Settings > Environments > New environment** -> `production` -> add yourself as
a **Required reviewer**. The backend workflow already targets this environment,
so every deploy then waits for a click. Worth it once you have real users,
because the deploy job is what runs migrations.

---

## 8. First run

### 8.1 Local setup

```bash
# From the repo root
npm install                    # root: concurrently only
npm install --prefix backend
npm install --prefix frontend

cp backend/.env.example backend/.env
```

Edit `backend/.env` and set at minimum `DATABASE_URL` (from step 2.3) plus the
two JWT secrets. Leave the storage and SMTP settings blank: locally, uploads go
to `backend/uploads` and reset links are printed to the console.

### 8.2 Create the tables

```bash
npm run db:deploy    # applies backend/prisma/migrations to the Azure database
npm run db:seed      # one account per portal, password Bivry@123
```

`db:deploy` applies the committed `0_init` migration. It never invents a
migration and never drops anything, which is why the same command is safe in CI.

Verify:

```bash
npm run db:studio    # opens a browser UI on the Azure database
```

You should see 16 tables plus `_prisma_migrations`.

> **Already have tables in the database** from an earlier `db push`? Baseline
> instead of applying:
> `npx prisma migrate resolve --applied 0_init` from `backend/`.
> That records the migration as done without re-running the SQL.

### 8.3 Run it locally

```bash
npm run dev          # API on :5000, frontend on :5173
```

The boot log tells you the state of all three dependencies:

```
OK    BIVRY API listening on port 5000
INFO  Database    : connected
INFO  Storage     : local
INFO  Mail        : ready
```

### 8.4 Deploy

```bash
git add -A
git commit -m "Set up Azure deployment"
git push origin main
```

Both workflows run. Watch them under the repo's **Actions** tab. The backend
workflow finishes with a health check, so a green run means the API really did
boot and really can reach the database.

---

## 9. Verify the whole thing

Open the Static Web App URL and walk through all of it. Every row here has
failed for a real reason during a first deploy.

| Check | Expected | If it fails |
| --- | --- | --- |
| `https://bivry-api.azurewebsites.net/api/health` | `{"status":"ok","database":"connected"}` | see [Troubleshooting](#10-troubleshooting) |
| Open `/driver/login` directly in a new tab | login page renders | SPA fallback: is `staticwebapp.config.json` in `dist/`? |
| Log in as `driver@bivry.com` / `Bivry@123` | lands on the driver onboarding form | check the browser console for a CORS error |
| **Refresh the page while logged in** | stays logged in, no 404 | session is in localStorage; a 404 means the SPA fallback is missing |
| Refresh a protected page while logged out | redirected to that portal's login page | |
| Register a new driver | account created, signed in | `ALLOW_DRIVER_SIGNUP` must be `true` |
| Forgot password -> submit email | email arrives with a reset link | App Service **Log stream** shows SMTP errors |
| Open the reset link, set a new password | success, and every other session is logged out | |
| Log in with the new password | works | |
| Log in with the old password | rejected | |
| Wrong password 5 times | account locked for 15 minutes | |
| Log in as a driver, then open `/admin` | bounced back to the driver portal | |
| Upload a licence photo | succeeds | check `AZURE_STORAGE_CONNECTION_STRING` |
| Storage account -> container -> browse | blob at `drivers/<id>/LICENCE_FRONT/...` | if it is on the App Service disk instead, storage is not configured |
| **Restart the App Service, reload the form** | the uploaded document is still there | this is the test the old disk based code failed |
| Delete a document | gone from the list and from the container | |

Seeded accounts: `admin@bivry.com`, `customer@bivry.com`, `vendor@bivry.com`,
`employee@bivry.com`, `driver@bivry.com`, all with `Bivry@123`.
**Change or delete them before you have real users.**

---

## 10. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `P1001: Can't reach database server` | firewall | step 2.1: add your IP; tick "allow Azure services" |
| `P1000: Authentication failed` | unencoded password, or `user@server` form | step 2.3 |
| `Error: Invalid production configuration` in the log | a required app setting is missing. The message names it. | step 5 |
| `@prisma/client did not initialize yet` | client never generated for that tree | the workflow runs `prisma generate` before `tsc` and again after `npm prune`. Do not remove either. |
| CORS error in the browser, Postman fine | `FRONTEND_URL` mismatch (trailing slash counts), or App Service CORS is filled in | steps 4.3 and 5 |
| Login works, then 401 a few minutes later | refresh call failing | check the Network tab for `POST /api/auth/<role>/refresh`. Cross site cookie needs `NODE_ENV=production` for `SameSite=None`. |
| 404 on refresh of any deep link | SPA fallback missing | is `staticwebapp.config.json` in `dist/`? Did an old auto generated SWA workflow overwrite the deploy? |
| `Unexpected token '<'` in the console | the SPA fallback is serving HTML for a missing JS file | do not remove `/assets/*` from `navigationFallback.exclude` |
| Uploads work then files disappear | storage fell back to the local disk driver | `AZURE_STORAGE_CONNECTION_STRING` is missing. The boot log prints `Storage: local`. |
| Reset emails never arrive | SMTP rejected, or blocked port 25 | App Service **Log stream** shows the real SMTP error. Use 587. |
| First request after idle takes 20s | Always On is off | step 4.1 (needs Basic or higher) |
| `too many connections` | every instance opens its own pool | add `&connection_limit=5&pool_timeout=20` to `DATABASE_URL` |
| CI: `database/ is out of date` | schema changed, docs not regenerated | `npm run db:sql` and commit |
| Deploy is green but the site is unchanged | build cached, or two workflows deploying | check for a leftover `azure-static-web-apps-*.yml` |

**Where to look first, always:** App Service ->
**Monitoring > Log stream**. Startup errors, SMTP errors and unhandled
rejections all land there.

---

## Working on the schema

`backend/prisma/schema.prisma` is the only file you edit. Everything else is
generated.

### Day to day

```bash
# 1. Edit backend/prisma/schema.prisma

# 2. Create and apply a migration locally
npm run db:migrate            # prompts for a name, e.g. add_vehicle_table

# 3. Refresh the generated docs in database/
npm run db:sql

# 4. Commit the schema, the migration AND the regenerated docs together
git add backend/prisma database
git commit -m "Add vehicle table"
git push
```

Pushing is enough: the backend workflow runs `prisma migrate deploy` against
Azure before it deploys the new code.

### Command reference

| Command | Use it when |
| --- | --- |
| `npm run db:generate` | after editing the schema, to refresh the TypeScript types |
| `npm run db:migrate` | development: create + apply a migration |
| `npm run db:deploy` | production/CI: apply pending migrations only |
| `npm run db:sql` | after any schema change, to regenerate `database/` |
| `npm run db:studio` | browse or edit rows |
| `npm run db:seed` | reset dev accounts |
| `npm run db:push` | **local scratch databases only** - no migration file, can drop columns |

Never point `db:push` or `db:migrate` at production. `db:push` records nothing in
`_prisma_migrations`, so the next `migrate deploy` sees a database it does not
recognise.

### Why the schema lives under `backend/`

`prisma generate` has to run inside the folder that gets deployed, with the
schema next to it. It used to live in `database/` with a `prisma.config.ts`
pointing across folders, and the generated client was written to
`backend/src/generated/`. That built fine on a laptop and was broken in two ways
in production:

- `tsc` only emits `.ts` files, so the generated client never reached `dist/`.
  `node dist/server.js` failed with
  `Cannot find module '../generated/prisma'` - the compiled server could not
  start at all.
- The Prisma CLI could not find the schema when only `backend/` was deployed.

Now the schema is at the default `backend/prisma/schema.prisma`, the client
generates into `node_modules/.prisma/client` and is imported as
`@prisma/client`, and `cd backend && npm ci && npm run build` works identically
on your laptop, in CI and on Azure. `database/` keeps a generated, readable copy
of everything so you never have to open the database to answer a question about
it.

### Where dependencies live

- **`backend/package.json`** - everything the API needs. `prisma` is a runtime
  dependency, not a dev dependency, so that `npm prune --omit=dev` in CI leaves
  the CLI in place and the client can be regenerated for the pruned tree.
- **`frontend/package.json`** - everything the UI needs.
- **root `package.json`** - `concurrently` only. No runtime dependencies at all.

The root used to also list `prisma` and `@prisma/client`. Locally, Node walks up
the folder tree and finds them, so everything works. Azure builds inside
`backend/` and never installs the root, so anything that only resolved through
the root would fail in CI while passing on your machine. Each deployable folder
now declares its own complete dependency list.

---

## Costs and next steps

Rough monthly floor for a working setup (Australia East, pay as you go):

| Resource | Tier | Note |
| --- | --- | --- |
| App Service | B1 Basic | needed for Always On and a custom domain |
| PostgreSQL | B1ms Burstable, 32 GB | fine until real traffic; watch the CPU credit balance |
| Storage | Standard LRS, hot | pennies at this volume |
| Static Web App | Free | 100 GB bandwidth per month |

Worth doing once it is live:

1. **Backups.** Flexible Server keeps 7 days of automatic backups by default.
   Raise it, and turn on geo redundancy if the data matters.
2. **Application Insights.** App Service -> Application Insights -> Enable.
   Gives you real error traces and request timings.
3. **Custom domain.** `app.yourdomain.com` on the Static Web App,
   `api.yourdomain.com` on the App Service. Update `FRONTEND_URL` and
   `VITE_API_URL` afterwards.
4. **Key Vault** for the secrets (step 5).
5. **Least privilege database user.** Right now the API connects as the server
   admin. The commented block at the bottom of `database/sql/00-bootstrap.sql`
   creates a `bivry_app` role that can read and write rows but cannot drop
   tables. Run it after the first migration and swap the user in `DATABASE_URL`,
   keeping the admin credentials for migrations only.
6. **Staging slot.** App Service -> Deployment slots -> add `staging`, deploy
   there first, then swap. The swap is near instant and instantly reversible.
