-- ---------------------------------------------------------------------------
-- BIVRY SaaS - queries worth keeping
--
-- Read only, safe to run against production. Handy when you need an answer that
-- the dashboard does not show yet.
-- ---------------------------------------------------------------------------

-- Which accounts exist per portal.
SELECT 'admin' AS portal, count(*) FROM admins WHERE deleted_at IS NULL
UNION ALL SELECT 'customer', count(*) FROM customers WHERE deleted_at IS NULL
UNION ALL SELECT 'vendor',   count(*) FROM vendors   WHERE deleted_at IS NULL
UNION ALL SELECT 'employee', count(*) FROM employees WHERE deleted_at IS NULL
UNION ALL SELECT 'driver',   count(*) FROM drivers   WHERE deleted_at IS NULL;

-- Driver onboarding funnel.
SELECT onboarding_status, count(*)
FROM drivers
WHERE deleted_at IS NULL
GROUP BY onboarding_status
ORDER BY count(*) DESC;

-- Drivers stuck part way through the wizard for more than three days.
SELECT id, email, onboarding_step, updated_at
FROM drivers
WHERE deleted_at IS NULL
  AND onboarding_status = 'IN_PROGRESS'
  AND updated_at < now() - interval '3 days'
ORDER BY updated_at;

-- Accounts currently locked out.
SELECT 'admin' AS portal, email, locked_until FROM admins WHERE locked_until > now()
UNION ALL SELECT 'driver', email, locked_until FROM drivers WHERE locked_until > now()
UNION ALL SELECT 'customer', email, locked_until FROM customers WHERE locked_until > now()
UNION ALL SELECT 'vendor', email, locked_until FROM vendors WHERE locked_until > now()
UNION ALL SELECT 'employee', email, locked_until FROM employees WHERE locked_until > now();

-- Failed logins in the last 24 hours, worst offenders first. Repeated hits from
-- one IP across many emails is credential stuffing.
SELECT ip_address, actor_type, count(*) AS attempts, count(DISTINCT email) AS emails_tried
FROM login_attempts
WHERE successful = false
  AND created_at > now() - interval '24 hours'
GROUP BY ip_address, actor_type
HAVING count(*) > 5
ORDER BY attempts DESC;

-- Documents uploaded per type, with total storage used.
SELECT doc_type,
       count(*) AS files,
       pg_size_pretty(sum(size_in_bytes)) AS total_size
FROM driver_documents
WHERE deleted_at IS NULL
GROUP BY doc_type
ORDER BY sum(size_in_bytes) DESC;

-- Soft deleted documents whose blobs can be purged from Azure Blob Storage.
SELECT id, storage_key, deleted_at
FROM driver_documents
WHERE deleted_at < now() - interval '30 days'
ORDER BY deleted_at;

-- Compliance documents expiring within 60 days.
SELECT d.email, 'licence' AS document, l.expiry_date
FROM driver_licences l JOIN drivers d ON d.id = l.driver_id
WHERE l.expiry_date BETWEEN current_date AND current_date + 60
UNION ALL
SELECT d.email, 'medical', m.expiry_date
FROM driver_medicals m JOIN drivers d ON d.id = m.driver_id
WHERE m.expiry_date BETWEEN current_date AND current_date + 60
UNION ALL
SELECT d.email, 'visa', v.expiry_date
FROM driver_visas v JOIN drivers d ON d.id = v.driver_id
WHERE v.expiry_date BETWEEN current_date AND current_date + 60
UNION ALL
SELECT d.email, 'police verification', p.expiry_date
FROM driver_police_verifications p JOIN drivers d ON d.id = p.driver_id
WHERE p.expiry_date BETWEEN current_date AND current_date + 60
ORDER BY expiry_date;

-- Maintenance: expired refresh and reset tokens that are safe to delete.
-- DELETE FROM refresh_tokens WHERE expires_at < now() - interval '30 days';
-- DELETE FROM password_reset_tokens WHERE expires_at < now() - interval '30 days';
-- DELETE FROM login_attempts WHERE created_at < now() - interval '90 days';

-- Which migrations have been applied.
SELECT migration_name, finished_at
FROM _prisma_migrations
ORDER BY finished_at;
