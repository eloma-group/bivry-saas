# BIVRY SaaS - database reference

> GENERATED FILE. Do not edit by hand.
> Source of truth: `backend/prisma/schema.prisma`. Regenerate with `npm run db:sql`.

This file exists so nobody has to open the database, or Prisma Studio, just to
look up a column. Every table, column, type, default and relation is below.

**18 tables, 7 enum types.**

## Tables

- [`admins`](#admins)
- [`customers`](#customers)
- [`vendors`](#vendors)
- [`employees`](#employees)
- [`drivers`](#drivers)
- [`driver_addresses`](#driveraddresses)
- [`driver_licences`](#driverlicences)
- [`driver_driving_histories`](#driverdrivinghistories)
- [`driver_police_verifications`](#driverpoliceverifications)
- [`driver_visas`](#drivervisas)
- [`driver_medicals`](#drivermedicals)
- [`driver_drug_tests`](#driverdrugtests)
- [`driver_passports`](#driverpassports)
- [`driver_medicares`](#drivermedicares)
- [`driver_documents`](#driverdocuments)
- [`refresh_tokens`](#refreshtokens)
- [`password_reset_tokens`](#passwordresettokens)
- [`login_attempts`](#loginattempts)

## Enum types

| Type | Values |
| --- | --- |
| `actor_type` | `ADMIN`, `CUSTOMER`, `VENDOR`, `EMPLOYEE`, `DRIVER` |
| `account_status` | `PENDING`, `ACTIVE`, `SUSPENDED`, `DEACTIVATED` |
| `onboarding_status` | `NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED` |
| `verification_status` | `PENDING`, `VERIFIED`, `REJECTED`, `EXPIRED` |
| `address_type` | `CURRENT`, `PERMANENT` |
| `licence_type` | `CAR`, `HEAVY_RIGID`, `HEAVY_COMBINATION`, `MULTI_COMBINATION`, `MOTORCYCLE` |
| `driver_document_type` | `PROFILE_PHOTO`, `LICENCE_FRONT`, `LICENCE_BACK`, `DRIVING_HISTORY`, `POLICE_VERIFICATION`, `VISA`, `MEDICAL`, `DRUG_TEST`, `PASSPORT_FRONT`, `PASSPORT_BACK`, `MEDICARE`, `ADDITIONAL` |

## Table detail

### `admins`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `email` | text | NOT NULL |  | unique |
| `phone` | text | NULL |  | unique |
| `password_hash` | text | NOT NULL |  |  |
| `first_name` | text | NOT NULL |  |  |
| `last_name` | text | NULL |  |  |
| `avatar_url` | text | NULL |  |  |
| `is_super_admin` | boolean | NOT NULL | false | Super admins can manage other admins. |
| `status` | account_status | NOT NULL | 'ACTIVE' |  |
| `email_verified_at` | timestamp(3) | NULL |  |  |
| `last_login_at` | timestamp(3) | NULL |  |  |
| `failed_login_attempts` | integer | NOT NULL | 0 |  |
| `locked_until` | timestamp(3) | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |
| `deleted_at` | timestamp(3) | NULL |  |  |

### `customers`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `email` | text | NOT NULL |  | unique |
| `phone` | text | NULL |  | unique |
| `password_hash` | text | NOT NULL |  |  |
| `first_name` | text | NOT NULL |  |  |
| `last_name` | text | NULL |  |  |
| `company_name` | text | NULL |  |  |
| `avatar_url` | text | NULL |  |  |
| `status` | account_status | NOT NULL | 'PENDING' |  |
| `email_verified_at` | timestamp(3) | NULL |  |  |
| `last_login_at` | timestamp(3) | NULL |  |  |
| `failed_login_attempts` | integer | NOT NULL | 0 |  |
| `locked_until` | timestamp(3) | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |
| `deleted_at` | timestamp(3) | NULL |  |  |

### `vendors`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `email` | text | NOT NULL |  | unique |
| `phone` | text | NULL |  | unique |
| `password_hash` | text | NOT NULL |  |  |
| `company_name` | text | NOT NULL |  |  |
| `contact_person` | text | NULL |  |  |
| `abn` | text | NULL |  |  |
| `logo_url` | text | NULL |  |  |
| `status` | account_status | NOT NULL | 'PENDING' |  |
| `email_verified_at` | timestamp(3) | NULL |  |  |
| `last_login_at` | timestamp(3) | NULL |  |  |
| `failed_login_attempts` | integer | NOT NULL | 0 |  |
| `locked_until` | timestamp(3) | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |
| `deleted_at` | timestamp(3) | NULL |  |  |

### `employees`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `email` | text | NOT NULL |  | unique |
| `phone` | text | NULL |  | unique |
| `password_hash` | text | NOT NULL |  |  |
| `employee_code` | text | NULL |  | unique |
| `first_name` | text | NOT NULL |  |  |
| `last_name` | text | NULL |  |  |
| `department` | text | NULL |  |  |
| `designation` | text | NULL |  |  |
| `avatar_url` | text | NULL |  |  |
| `status` | account_status | NOT NULL | 'PENDING' |  |
| `email_verified_at` | timestamp(3) | NULL |  |  |
| `last_login_at` | timestamp(3) | NULL |  |  |
| `failed_login_attempts` | integer | NOT NULL | 0 |  |
| `locked_until` | timestamp(3) | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |
| `deleted_at` | timestamp(3) | NULL |  |  |

### `drivers`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `email` | text | NOT NULL |  | unique |
| `phone` | text | NULL |  | unique |
| `password_hash` | text | NOT NULL |  |  |
| `first_name` | text | NOT NULL |  |  |
| `middle_name` | text | NULL |  |  |
| `last_name` | text | NULL |  |  |
| `date_of_birth` | date | NULL |  |  |
| `nationality` | text | NULL |  |  |
| `avatar_url` | text | NULL |  |  |
| `status` | account_status | NOT NULL | 'PENDING' |  |
| `onboarding_status` | onboarding_status | NOT NULL | 'NOT_STARTED' |  |
| `onboarding_step` | integer | NOT NULL | 0 | Index of the last completed onboarding step, used to resume the wizard. |
| `submitted_at` | timestamp(3) | NULL |  |  |
| `approved_at` | timestamp(3) | NULL |  |  |
| `rejection_reason` | text | NULL |  |  |
| `email_verified_at` | timestamp(3) | NULL |  |  |
| `last_login_at` | timestamp(3) | NULL |  |  |
| `failed_login_attempts` | integer | NOT NULL | 0 |  |
| `locked_until` | timestamp(3) | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |
| `deleted_at` | timestamp(3) | NULL |  |  |

**Relations**

- many `driver_addresses`
- many `driver_documents`
- optional one `driver_driving_histories`
- optional one `driver_drug_tests`
- optional one `driver_licences`
- optional one `driver_medicals`
- optional one `driver_medicares`
- optional one `driver_passports`
- optional one `driver_police_verifications`
- optional one `driver_visas`

### `driver_addresses`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `driver_id` | uuid | NOT NULL |  | FK to `drivers` (cascade delete) |
| `type` | address_type | NOT NULL |  |  |
| `house_number` | text | NULL |  |  |
| `street` | text | NULL |  |  |
| `suburb` | text | NULL |  |  |
| `state` | text | NULL |  |  |
| `country` | text | NULL |  |  |
| `post_code` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Constraints**

- unique: (`driverId`, `type`)

**Relations**

- one `drivers`

### `driver_licences`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `driver_id` | uuid | NOT NULL |  | unique; FK to `drivers` (cascade delete) |
| `licence_number` | text | NULL |  |  |
| `licence_card_number` | text | NULL |  |  |
| `licence_type` | licence_type | NULL |  |  |
| `issuing_state` | text | NULL |  |  |
| `expiry_date` | date | NULL |  |  |
| `verification_status` | verification_status | NOT NULL | 'PENDING' |  |
| `verified_at` | timestamp(3) | NULL |  |  |
| `verified_by` | uuid | NULL |  | Admin id that verified this record (no FK - verifier may be admin or employee). |
| `remarks` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Relations**

- one `drivers`

### `driver_driving_histories`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `driver_id` | uuid | NOT NULL |  | unique; FK to `drivers` (cascade delete) |
| `issue_date` | date | NULL |  |  |
| `expiry_date` | date | NULL |  |  |
| `verification_status` | verification_status | NOT NULL | 'PENDING' |  |
| `verified_at` | timestamp(3) | NULL |  |  |
| `verified_by` | uuid | NULL |  |  |
| `remarks` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Relations**

- one `drivers`

### `driver_police_verifications`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `driver_id` | uuid | NOT NULL |  | unique; FK to `drivers` (cascade delete) |
| `issue_date` | date | NULL |  |  |
| `expiry_date` | date | NULL |  |  |
| `verification_status` | verification_status | NOT NULL | 'PENDING' |  |
| `verified_at` | timestamp(3) | NULL |  |  |
| `verified_by` | uuid | NULL |  |  |
| `remarks` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Relations**

- one `drivers`

### `driver_visas`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `driver_id` | uuid | NOT NULL |  | unique; FK to `drivers` (cascade delete) |
| `visa_status` | text | NULL |  |  |
| `visa_type` | text | NULL |  |  |
| `expiry_date` | date | NULL |  |  |
| `verification_status` | verification_status | NOT NULL | 'PENDING' |  |
| `verified_at` | timestamp(3) | NULL |  |  |
| `verified_by` | uuid | NULL |  |  |
| `remarks` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Relations**

- one `drivers`

### `driver_medicals`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `driver_id` | uuid | NOT NULL |  | unique; FK to `drivers` (cascade delete) |
| `issue_date` | date | NULL |  |  |
| `expiry_date` | date | NULL |  |  |
| `verification_status` | verification_status | NOT NULL | 'PENDING' |  |
| `verified_at` | timestamp(3) | NULL |  |  |
| `verified_by` | uuid | NULL |  |  |
| `remarks` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Relations**

- one `drivers`

### `driver_drug_tests`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `driver_id` | uuid | NOT NULL |  | unique; FK to `drivers` (cascade delete) |
| `issue_date` | date | NULL |  |  |
| `expiry_date` | date | NULL |  | Always six months after the issue date - the form fills it in. |
| `verification_status` | verification_status | NOT NULL | 'PENDING' |  |
| `verified_at` | timestamp(3) | NULL |  |  |
| `verified_by` | uuid | NULL |  |  |
| `remarks` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Relations**

- one `drivers`

### `driver_passports`

Passport details. Asked of Australian nationals, who carry no visa.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `driver_id` | uuid | NOT NULL |  | unique; FK to `drivers` (cascade delete) |
| `passport_number` | text | NULL |  |  |
| `expiry_date` | date | NULL |  |  |
| `verification_status` | verification_status | NOT NULL | 'PENDING' |  |
| `verified_at` | timestamp(3) | NULL |  |  |
| `verified_by` | uuid | NULL |  |  |
| `remarks` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Relations**

- one `drivers`

### `driver_medicares`

Medicare card details. Asked of Australian nationals alongside the passport.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `driver_id` | uuid | NOT NULL |  | unique; FK to `drivers` (cascade delete) |
| `card_number` | text | NULL |  |  |
| `expiry_date` | date | NULL |  |  |
| `verification_status` | verification_status | NOT NULL | 'PENDING' |  |
| `verified_at` | timestamp(3) | NULL |  |  |
| `verified_by` | uuid | NULL |  |  |
| `remarks` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Relations**

- one `drivers`

### `driver_documents`

Every file a driver uploads. `category` is only used by ADDITIONAL docs.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `driver_id` | uuid | NOT NULL |  | FK to `drivers` (cascade delete) |
| `doc_type` | driver_document_type | NOT NULL |  |  |
| `category` | text | NULL |  |  |
| `expiry_date` | date | NULL |  | Only ADDITIONAL documents carry one: every other type has a section that\nholds its own expiry date. |
| `file_name` | text | NOT NULL |  |  |
| `storage_key` | text | NOT NULL |  |  |
| `storage_url` | text | NULL |  |  |
| `mime_type` | text | NOT NULL |  |  |
| `size_in_bytes` | integer | NOT NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |
| `deleted_at` | timestamp(3) | NULL |  |  |

**Relations**

- one `drivers`

### `refresh_tokens`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `actor_type` | actor_type | NOT NULL |  |  |
| `actor_id` | uuid | NOT NULL |  |  |
| `token_hash` | text | NOT NULL |  | unique; SHA-256 of the refresh token. The raw token is never stored. |
| `expires_at` | timestamp(3) | NOT NULL |  |  |
| `revoked_at` | timestamp(3) | NULL |  |  |
| `user_agent` | text | NULL |  |  |
| `ip_address` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |

### `password_reset_tokens`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `actor_type` | actor_type | NOT NULL |  |  |
| `actor_id` | uuid | NOT NULL |  |  |
| `token_hash` | text | NOT NULL |  | unique; SHA-256 of the reset token that was emailed to the user. |
| `expires_at` | timestamp(3) | NOT NULL |  |  |
| `used_at` | timestamp(3) | NULL |  |  |
| `requested_ip` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |

### `login_attempts`

Audit trail of every login attempt, used for lockout and security review.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `actor_type` | actor_type | NOT NULL |  |  |
| `email` | text | NOT NULL |  |  |
| `successful` | boolean | NOT NULL | false |  |
| `reason` | text | NULL |  |  |
| `ip_address` | text | NULL |  |  |
| `user_agent` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
