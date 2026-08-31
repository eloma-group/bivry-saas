# BIVRY SaaS - database reference

> GENERATED FILE. Do not edit by hand.
> Source of truth: `backend/prisma/schema.prisma`. Regenerate with `npm run db:sql`.

This file exists so nobody has to open the database, or Prisma Studio, just to
look up a column. Every table, column, type, default and relation is below.

**38 tables, 16 enum types.**

## Tables

- [`admins`](#admins)
- [`customers`](#customers)
- [`customer_contacts`](#customercontacts)
- [`customer_additional_contacts`](#customeradditionalcontacts)
- [`customer_warehouses`](#customerwarehouses)
- [`customer_directors`](#customerdirectors)
- [`customer_addresses`](#customeraddresses)
- [`customer_billings`](#customerbillings)
- [`customer_documents`](#customerdocuments)
- [`vendors`](#vendors)
- [`vendor_contacts`](#vendorcontacts)
- [`vendor_directors`](#vendordirectors)
- [`vendor_bank_details`](#vendorbankdetails)
- [`vendor_coverages`](#vendorcoverages)
- [`vendor_warehouses`](#vendorwarehouses)
- [`vendor_yards`](#vendoryards)
- [`vendor_addresses`](#vendoraddresses)
- [`vendor_accreditations`](#vendoraccreditations)
- [`vendor_insurances`](#vendorinsurances)
- [`vendor_documents`](#vendordocuments)
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
- [`bookings`](#bookings)
- [`booking_stops`](#bookingstops)
- [`booking_lanes`](#bookinglanes)

## Enum types

| Type | Values |
| --- | --- |
| `actor_type` | `ADMIN`, `CUSTOMER`, `VENDOR`, `EMPLOYEE`, `DRIVER` |
| `account_status` | `PENDING`, `ACTIVE`, `SUSPENDED`, `DEACTIVATED` |
| `onboarding_status` | `NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED` |
| `verification_status` | `PENDING`, `VERIFIED`, `REJECTED`, `EXPIRED` |
| `address_type` | `CURRENT`, `PERMANENT` |
| `vendor_address_type` | `PRINCIPAL`, `BILLING` |
| `licence_type` | `CAR`, `HEAVY_RIGID`, `HEAVY_COMBINATION`, `MULTI_COMBINATION`, `MOTORCYCLE` |
| `driver_document_type` | `PROFILE_PHOTO`, `LICENCE_FRONT`, `LICENCE_BACK`, `DRIVING_HISTORY`, `POLICE_VERIFICATION`, `VISA`, `MEDICAL`, `DRUG_TEST`, `PASSPORT_FRONT`, `PASSPORT_BACK`, `MEDICARE`, `ADDITIONAL` |
| `vendor_contact_type` | `OPERATIONS`, `COMPLIANCE`, `ADMIN`, `DISPATCH` |
| `vendor_insurance_type` | `PRODUCT_LIABILITY`, `PUBLIC_LIABILITY`, `WORK_COVER`, `MARINE_GENERAL`, `MARINE_ALCOHOL`, `COC` |
| `vendor_document_type` | `COMPANY_LOGO`, `ACCREDITATION`, `INSURANCE_PRODUCT_LIABILITY`, `INSURANCE_PUBLIC_LIABILITY`, `INSURANCE_WORK_COVER`, `INSURANCE_MARINE_GENERAL`, `INSURANCE_MARINE_ALCOHOL`, `INSURANCE_COC`, `COMPLIANCE_DRUG`, `COMPLIANCE_ALCOHOL_POLICY`, `COMPLIANCE_PROCEDURE`, `COMPLIANCE_RISK_MANAGEMENT`, `COMPLIANCE_SPEED_POLICY`, `COMPLIANCE_FATIGUE_POLICY`, `COMPLIANCE_GPS_SNAPSHOT`, `COMPLIANCE_WHS_POLICY`, `COMPLIANCE_ADDITIONAL` |
| `customer_contact_type` | `MAIN`, `OPERATIONS`, `ACCOUNTS`, `DISPATCH` |
| `customer_address_type` | `PRINCIPAL`, `BILLING` |
| `customer_billing_type` | `INVOICING`, `RCTI` |
| `customer_document_type` | `COMPANY_LOGO`, `CONTRACT`, `ADDITIONAL` |
| `booking_stop_type` | `PICKUP`, `DELIVERY` |

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
| `account_number` | text | NULL |  | unique; Human readable customer reference (CAN5000). Assigned by the server when\nthe account is created and never typed in; the booking form reads it back. |
| `cid` | text | NULL |  | unique; The customer identifier the rest of the product quotes (CUST-3000 onwards).\nHanded out by the server on the first onboarding load, never typed in, and\nwhat a customer is looked up by outside this module. |
| `first_name` | text | NOT NULL |  |  |
| `last_name` | text | NULL |  |  |
| `company_name` | text | NULL |  |  |
| `designation` | text | NULL |  | What the person named above does at the company: CEO, Director, and so on. |
| `trading_names` | text | NOT NULL |  | Every name the business trades under, newest first as the Business\nRegister lists them. The first is the one shown wherever only one fits. |
| `legal_name` | text | NULL |  |  |
| `abn` | text | NULL |  |  |
| `acn` | text | NULL |  | Australian Company Number, nine digits. Only a registered company has one. |
| `abn_status` | text | NULL |  | What the Business Register says about the ABN, in its own words. |
| `entity_type` | text | NULL |  |  |
| `gst` | text | NULL |  |  |
| `website_address` | text | NULL |  |  |
| `creation_date` | date | NULL |  | The day the customer record was opened, as the form asks for it. Defaults\nto today in the form and can be changed, so it is not `created_at`. |
| `avatar_url` | text | NULL |  |  |
| `logo_url` | text | NULL |  |  |
| `billing_same_as_principal` | boolean | NOT NULL | false | Whether the billing address is a copy of the principal one. Stored so the\ntick comes back ticked; both rows are written out either way. |
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

- many `customer_addresses`
- many `customer_additional_contacts`
- optional one `customer_billings`
- many `customer_contacts`
- many `customer_directors`
- many `customer_documents`
- many `customer_warehouses`

### `customer_contacts`

One contact block per department, as the customer form asks for them.\n\nThe form only asks for the operations block and offers the other three as a\ntick that copies it. There is no column for that tick: a copied block holds\ndetails identical to the operations one, so the tick is read back off the\nrows themselves rather than stored a second time where it could disagree.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `customer_id` | uuid | NOT NULL |  | FK to `customers` (cascade delete) |
| `type` | customer_contact_type | NOT NULL |  |  |
| `contact_person` | text | NULL |  |  |
| `designation` | text | NULL |  |  |
| `contact_number` | text | NULL |  |  |
| `email` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Constraints**

- unique: (`customerId`, `type`)

**Relations**

- one `customers`

### `customer_additional_contacts`

A contact block the customer added themselves, beyond the four departments\nabove.\n\nA table of its own rather than a fifth enum value on `customer_contacts`:\nthat table holds one row per department and says so with a unique index, and\na customer can add as many of these as they like. Kept apart, a build from\nbefore this change goes on reading the four departments unchanged and simply\ndoes not see the extra ones.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `customer_id` | uuid | NOT NULL |  | FK to `customers` (cascade delete) |
| `position` | integer | NOT NULL | 0 | Keeps the rows in the order the customer entered them. |
| `label` | text | NULL |  | What this block is for, in the customer's own words: "Legal", "After\nhours". The equivalent of the department name on a fixed block. |
| `contact_person` | text | NULL |  |  |
| `designation` | text | NULL |  |  |
| `contact_number` | text | NULL |  |  |
| `email` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Relations**

- one `customers`

### `customer_warehouses`

A warehouse the customer operates: a site we may collect from or deliver to.\n\nThe same shape the vendor's warehouses have, and separate from\n`customer_addresses` for the same reason: that table holds the two addresses\nthe company is registered at, one row each, and there can be any number of\nthese.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `customer_id` | uuid | NOT NULL |  | FK to `customers` (cascade delete) |
| `position` | integer | NOT NULL | 0 | Keeps "Warehouse 1", "Warehouse 2" in the order they were entered. |
| `street1` | text | NULL |  |  |
| `street2` | text | NULL |  |  |
| `suburb` | text | NULL |  |  |
| `state` | text | NULL |  |  |
| `country` | text | NULL |  |  |
| `post_code` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Relations**

- one `customers`

### `customer_directors`

The customer's directors. As many as the business has.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `customer_id` | uuid | NOT NULL |  | FK to `customers` (cascade delete) |
| `position` | integer | NOT NULL | 0 | Keeps the rows in the order the customer entered them. |
| `name` | text | NULL |  | Full name, as it reads on the document naming them. |
| `designation` | text | NULL |  |  |
| `email` | text | NULL |  |  |
| `contact_number` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Relations**

- one `customers`

### `customer_addresses`

The two addresses a customer is registered at: where the business is run\nfrom, and where its invoices go.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `customer_id` | uuid | NOT NULL |  | FK to `customers` (cascade delete) |
| `type` | customer_address_type | NOT NULL |  |  |
| `street1` | text | NULL |  |  |
| `street2` | text | NULL |  |  |
| `suburb` | text | NULL |  |  |
| `state` | text | NULL |  |  |
| `country` | text | NULL |  |  |
| `post_code` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Constraints**

- unique: (`customerId`, `type`)

**Relations**

- one `customers`

### `customer_billings`

How the customer is billed: the payment term, and whether they are invoiced\nor run on RCTI. One row per customer.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `customer_id` | uuid | NOT NULL |  | unique; FK to `customers` (cascade delete) |
| `term` | text | NULL |  | The payment term as the accounts team words it: "Net 30". |
| `billing_type` | customer_billing_type | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Relations**

- one `customers`

### `customer_documents`

Every file a customer uploads. `category` names the extra document rows the\ncustomer adds beyond the two fixed slots.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `customer_id` | uuid | NOT NULL |  | FK to `customers` (cascade delete) |
| `doc_type` | customer_document_type | NOT NULL |  |  |
| `category` | text | NULL |  |  |
| `issue_date` | date | NULL |  |  |
| `expiry_date` | date | NULL |  |  |
| `file_name` | text | NOT NULL |  |  |
| `storage_key` | text | NOT NULL |  |  |
| `storage_url` | text | NULL |  |  |
| `mime_type` | text | NOT NULL |  |  |
| `size_in_bytes` | integer | NOT NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |
| `deleted_at` | timestamp(3) | NULL |  |  |

**Relations**

- one `customers`

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
| `acn` | text | NULL |  | Australian Company Number, nine digits. Only a registered company has one,\nso a sole trader carries an ABN here and nothing in this column. |
| `abn_status` | text | NULL |  | What the Business Register says about the ABN, in its own words:\n"Active from 24 Nov 2025". Filled by the lookup, never typed. |
| `entity_type` | text | NULL |  | "Australian Private Company", "Individual/Sole Trader". Also from the\nregister, and what says whether an ACN should exist at all. |
| `gst` | text | NULL |  | Where the business stands on GST, in the register's own words:\n"Registered from 01 Jul 2000". Filled by the lookup, and correctable by\nhand for the rare business the register has nothing on. |
| `logo_url` | text | NULL |  |  |
| `vendor_code` | text | NULL |  | unique; Human readable vendor reference (BIVRY-5000). Handed out by the server\non the first onboarding load, never typed in. |
| `trading_names` | text | NOT NULL |  | Every name the business trades under. The Business Register lists them\nnewest first and a company can hold several, so this is a list rather\nthan the single name it used to be. The first is the one shown wherever\nonly one will fit. |
| `legal_name` | text | NULL |  |  |
| `website_address` | text | NULL |  |  |
| `billing_same_as_principal` | boolean | NOT NULL | false | Whether the billing address is a copy of the principal one. Stored so the\ntick comes back ticked; both rows are written out either way. |
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

- optional one `vendor_accreditations`
- many `vendor_addresses`
- optional one `vendor_bank_details`
- many `vendor_contacts`
- optional one `vendor_coverages`
- many `vendor_directors`
- many `vendor_documents`
- many `vendor_insurances`
- many `vendor_warehouses`
- many `vendor_yards`

### `vendor_contacts`

One contact block per department, as the vendor form asks for them.\n\nThe form only asks for the operations block and offers the other three as a\ntick that copies it. There is no column for that tick: a copied block holds\ndetails identical to the operations one, so the tick is read back off the\nrows themselves. Storing it as well would be a second answer to a question\nthe data already answers, free to disagree with it.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `vendor_id` | uuid | NOT NULL |  | FK to `vendors` (cascade delete) |
| `type` | vendor_contact_type | NOT NULL |  |  |
| `contact_person` | text | NULL |  |  |
| `designation` | text | NULL |  |  |
| `contact_number` | text | NULL |  |  |
| `email` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Constraints**

- unique: (`vendorId`, `type`)

**Relations**

- one `vendors`

### `vendor_directors`

Company C-suite. A vendor lists as many directors as it has.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `vendor_id` | uuid | NOT NULL |  | FK to `vendors` (cascade delete) |
| `position` | integer | NOT NULL | 0 | Keeps the rows in the order the vendor entered them. |
| `name` | text | NULL |  | The director's full name, as it reads on the document naming them. |
| `email` | text | NULL |  |  |
| `contact_number` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Relations**

- one `vendors`

### `vendor_bank_details`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `vendor_id` | uuid | NOT NULL |  | unique; FK to `vendors` (cascade delete) |
| `account_name` | text | NULL |  |  |
| `bank_name` | text | NULL |  |  |
| `bsb` | text | NULL |  |  |
| `account_number` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Relations**

- one `vendors`

### `vendor_coverages`

Where the vendor operates. Both columns hold several selections.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `vendor_id` | uuid | NOT NULL |  | unique; FK to `vendors` (cascade delete) |
| `areas_covered` | text | NOT NULL |  |  |
| `business_operations` | text | NOT NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Relations**

- one `vendors`

### `vendor_warehouses`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `vendor_id` | uuid | NOT NULL |  | FK to `vendors` (cascade delete) |
| `position` | integer | NOT NULL | 0 | Keeps "Address 1", "Address 2" in the order they were entered. |
| `street1` | text | NULL |  |  |
| `street2` | text | NULL |  |  |
| `suburb` | text | NULL |  |  |
| `state` | text | NULL |  |  |
| `country` | text | NULL |  |  |
| `post_code` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Relations**

- one `vendors`

### `vendor_yards`

A yard: a site the vendor parks or stages at, kept apart from the\nwarehouses because it is not somewhere freight is collected from or\ndelivered to. Optional, and there can be several.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `vendor_id` | uuid | NOT NULL |  | FK to `vendors` (cascade delete) |
| `position` | integer | NOT NULL | 0 | Keeps "Yard 1", "Yard 2" in the order they were entered. |
| `street1` | text | NULL |  |  |
| `street2` | text | NULL |  |  |
| `suburb` | text | NULL |  |  |
| `state` | text | NULL |  |  |
| `country` | text | NULL |  |  |
| `post_code` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Relations**

- one `vendors`

### `vendor_addresses`

The two addresses a vendor is registered at: where the business is run\nfrom, and where its invoices go. A warehouse is a different thing - a site\nfreight moves through - and keeps its own table.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `vendor_id` | uuid | NOT NULL |  | FK to `vendors` (cascade delete) |
| `type` | vendor_address_type | NOT NULL |  |  |
| `street1` | text | NULL |  |  |
| `street2` | text | NULL |  |  |
| `suburb` | text | NULL |  |  |
| `state` | text | NULL |  |  |
| `country` | text | NULL |  |  |
| `post_code` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Constraints**

- unique: (`vendorId`, `type`)

**Relations**

- one `vendors`

### `vendor_accreditations`

Certificate of accreditation. One per vendor, several expiry dates on it.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `vendor_id` | uuid | NOT NULL |  | unique; FK to `vendors` (cascade delete) |
| `accreditation_number` | text | NULL |  |  |
| `expiry_date` | date | NULL |  | When the accreditation itself lapses, as distinct from the scheme expiry\ndates below, which each belong to one module of it. |
| `mass_management_expiry` | date | NULL |  |  |
| `dangerous_goods_expiry` | date | NULL |  |  |
| `nhvas_expiry` | date | NULL |  |  |
| `haccp_expiry` | date | NULL |  |  |
| `verification_status` | verification_status | NOT NULL | 'PENDING' |  |
| `verified_at` | timestamp(3) | NULL |  |  |
| `verified_by` | uuid | NULL |  | Admin id that verified this record (no FK - verifier may be admin or employee). |
| `remarks` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Relations**

- one `vendors`

### `vendor_insurances`

One row per policy the vendor holds. Work cover carries its own columns.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `vendor_id` | uuid | NOT NULL |  | FK to `vendors` (cascade delete) |
| `type` | vendor_insurance_type | NOT NULL |  |  |
| `policy_number` | text | NULL |  |  |
| `insurer` | text | NULL |  |  |
| `issue_date` | date | NULL |  | When the policy was issued. Asked for on every policy, work cover\nincluded, alongside whichever window that policy is keyed by. |
| `expiry_date` | date | NULL |  |  |
| `sum_assured` | text | NULL |  |  |
| `employer_number` | text | NULL |  | Work cover only: it is keyed by employer number and a validity window. |
| `valid_from` | date | NULL |  |  |
| `valid_till` | date | NULL |  |  |
| `due_in_days` | integer | NULL |  |  |
| `verification_status` | verification_status | NOT NULL | 'PENDING' |  |
| `verified_at` | timestamp(3) | NULL |  |  |
| `verified_by` | uuid | NULL |  |  |
| `remarks` | text | NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |

**Constraints**

- unique: (`vendorId`, `type`)

**Relations**

- one `vendors`

### `vendor_documents`

Every file a vendor uploads. `category` names the extra compliance rows\nthe vendor adds beyond the fixed list.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `vendor_id` | uuid | NOT NULL |  | FK to `vendors` (cascade delete) |
| `doc_type` | vendor_document_type | NOT NULL |  |  |
| `category` | text | NULL |  |  |
| `issue_date` | date | NULL |  | Compliance documents carry both; the rest hold their dates on their section. |
| `expiry_date` | date | NULL |  |  |
| `file_name` | text | NOT NULL |  |  |
| `storage_key` | text | NOT NULL |  |  |
| `storage_url` | text | NULL |  |  |
| `mime_type` | text | NOT NULL |  |  |
| `size_in_bytes` | integer | NOT NULL |  |  |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |
| `deleted_at` | timestamp(3) | NULL |  |  |

**Relations**

- one `vendors`

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
| `country` | text | NULL |  | The country on the driver's passport, held as the country itself -\n"Australia", not "Australian". |
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

### `bookings`

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `job_number` | text | NOT NULL |  | unique; Human readable reference, BIVRY-<financial year>-<sequence>. |
| `booking_received_date` | text | NULL |  | The date the booking was received, as typed (YYYY-MM-DD). |
| `financial_year` | text | NULL |  | Australian financial year the booking falls in, e.g. "26-27". |
| `customer_id` | uuid | NULL |  | The chosen customer. Id only, plus a snapshot of the name and account\nnumber as they read when the booking was raised. |
| `customer_name` | text | NULL |  |  |
| `customer_account_number` | text | NULL |  |  |
| `account_status` | text | NULL |  |  |
| `agreement_type` | text | NULL |  |  |
| `reference` | text | NULL |  |  |
| `invoice_term` | integer | NULL |  | How many days the invoice runs for, as the admin types it. A count of\ndays, so it is a number rather than a term worded in prose. |
| `cargo_type` | text | NULL |  |  |
| `vehicle_type` | text | NULL |  |  |
| `trailer_category` | text | NULL |  |  |
| `price_gross_amount` | decimal | NULL |  |  |
| `price_fuel_levy_pct` | decimal | NULL |  |  |
| `price_fuel_levy_amount` | decimal | NULL |  |  |
| `price_gst_pct` | decimal | NULL |  |  |
| `price_gst_amount` | decimal | NULL |  |  |
| `price_net_amount` | decimal | NULL |  |  |
| `price_total_amount` | decimal | NULL |  |  |
| `vendor_id` | uuid | NULL |  |  |
| `vendor_name` | text | NULL |  |  |
| `vendor_gross_amount` | decimal | NULL |  |  |
| `vendor_fuel_levy_pct` | decimal | NULL |  |  |
| `vendor_fuel_levy_amount` | decimal | NULL |  |  |
| `vendor_gst_pct` | decimal | NULL |  |  |
| `vendor_gst_amount` | decimal | NULL |  |  |
| `vendor_net_amount` | decimal | NULL |  |  |
| `vendor_total_amount` | decimal | NULL |  |  |
| `created_by_admin_id` | uuid | NULL |  | Admin id that raised the booking (no FK - a verifier may be an employee later). |
| `created_at` | timestamp(3) | NOT NULL | now() |  |
| `updated_at` | timestamp(3) | NOT NULL |  | set on every update |
| `deleted_at` | timestamp(3) | NULL |  |  |

**Relations**

- many `booking_stops`
- many `booking_lanes`

### `booking_stops`

One pickup or delivery on a booking. The two share every field, so they are\none table split by `type` and ordered by `position`.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `booking_id` | uuid | NOT NULL |  | FK to `bookings` (cascade delete) |
| `type` | booking_stop_type | NOT NULL |  |  |
| `position` | integer | NOT NULL |  | Order within its own kind: pickup 0, pickup 1, delivery 0, and so on. |
| `client_job_number` | text | NULL |  |  |
| `trailer` | text | NULL |  |  |
| `scheduled_at` | text | NULL |  | When it is scheduled, as typed (YYYY-MM-DDTHH:mm). |
| `company` | text | NULL |  |  |
| `address` | text | NULL |  |  |
| `city` | text | NULL |  |  |
| `suburb` | text | NULL |  |  |
| `state` | text | NULL |  |  |
| `country` | text | NULL |  |  |
| `instructions` | text | NULL |  |  |

**Relations**

- one `bookings`

### `booking_lanes`

A lane worked out from a pickup/delivery pair: the trailer and the\n"Pick-Up City - Delivery City" line, kept so a saved booking carries them.

| Column | Type | Null | Default | Notes |
| --- | --- | --- | --- | --- |
| `id` | uuid | NOT NULL | uuid() | primary key |
| `booking_id` | uuid | NOT NULL |  | FK to `bookings` (cascade delete) |
| `position` | integer | NOT NULL |  |  |
| `trailer` | text | NULL |  |  |
| `lane` | text | NULL |  |  |

**Relations**

- one `bookings`
