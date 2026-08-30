import path from 'path';
import dotenv from 'dotenv';

// Load backend/.env regardless of the directory the process was started from.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

function num(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Comma separated value into a trimmed list, empty entries dropped. */
function list(key: string): string[] {
  return (process.env[key] ?? '')
    .split(',')
    .map((item) => item.trim().replace(/\/+$/, ''))
    .filter((item) => item !== '');
}

function bool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  return raw.toLowerCase() === 'true' || raw === '1';
}

const nodeEnv = optional('NODE_ENV', 'development');
const isProduction = nodeEnv === 'production';

/**
 * Placeholder sender. Exported so the mail service can tell whether MAIL_FROM
 * was actually configured: a provider accepts mail from an unverified sender
 * and then discards it, so the failure is invisible without this check.
 */
export const DEFAULT_MAIL_FROM = 'BIVRY <no-reply@bivry.com>';

export const env = {
  nodeEnv,
  isProduction,
  isDevelopment: !isProduction,
  port: num('PORT', 5000),
  /** Canonical frontend origin. Used for CORS and for password reset links. */
  frontendUrl: optional('FRONTEND_URL', 'http://localhost:5173').replace(/\/+$/, ''),
  /**
   * Extra allowed origins, comma separated. Static Web Apps serves pull request
   * previews from their own `...-<branch>.azurestaticapps.net` hostnames, so
   * those go here rather than in FRONTEND_URL.
   */
  extraOrigins: list('CORS_EXTRA_ORIGINS'),

  databaseUrl: optional('DATABASE_URL', ''),

  jwt: {
    // In development we fall back to a placeholder so the server boots before
    // the Azure database and real secrets are wired up. Production must set them.
    accessSecret: isProduction
      ? required('JWT_ACCESS_SECRET')
      : optional('JWT_ACCESS_SECRET', 'dev-only-access-secret'),
    refreshSecret: isProduction
      ? required('JWT_REFRESH_SECRET')
      : optional('JWT_REFRESH_SECRET', 'dev-only-refresh-secret'),
    accessExpiresIn: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
    refreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
  },

  passwordReset: {
    ttlMinutes: num('PASSWORD_RESET_TOKEN_TTL_MINUTES', 30),
  },

  lockout: {
    maxFailedAttempts: num('MAX_FAILED_LOGIN_ATTEMPTS', 5),
    lockMinutes: num('ACCOUNT_LOCK_MINUTES', 15),
  },

  signup: {
    admin: bool('ALLOW_ADMIN_SIGNUP', false),
    employee: bool('ALLOW_EMPLOYEE_SIGNUP', false),
    customer: bool('ALLOW_CUSTOMER_SIGNUP', true),
    vendor: bool('ALLOW_VENDOR_SIGNUP', true),
    driver: bool('ALLOW_DRIVER_SIGNUP', true),
  },

  upload: {
    maxSizeMb: num('MAX_UPLOAD_SIZE_MB', 15),
    /** Local folder used only by the `local` storage driver in development. */
    localDir: optional('UPLOAD_DIR', 'uploads'),
  },

  /**
   * File storage. Production always uses Azure Blob Storage; the local disk
   * driver exists so `npm run dev` works before any Azure account is wired up.
   * App Service instances have an ephemeral filesystem, so writing uploads to
   * disk there would silently lose files on every restart or scale event.
   */
  storage: {
    connectionString: optional('AZURE_STORAGE_CONNECTION_STRING', ''),
    accountName: optional('AZURE_STORAGE_ACCOUNT_NAME', ''),
    accountKey: optional('AZURE_STORAGE_ACCOUNT_KEY', ''),
    /**
     * One container per area, so a driver's documents, a vendor's documents, a
     * customer's documents and an admin's own files are never mixed together
     * and can be governed separately (retention, access reviews, deletion on
     * request).
     */
    driverContainer: optional('AZURE_STORAGE_CONTAINER', 'driver-documents'),
    adminContainer: optional('AZURE_STORAGE_CONTAINER_ADMIN', 'admin'),
    vendorContainer: optional('AZURE_STORAGE_CONTAINER_VENDOR', 'vendor'),
    customerContainer: optional('AZURE_STORAGE_CONTAINER_CUSTOMER', 'customer'),
    /** Lifetime of the short lived read URL handed to the browser. */
    sasTtlMinutes: num('AZURE_STORAGE_SAS_TTL_MINUTES', 15),
    get isBlobConfigured(): boolean {
      return Boolean(
        process.env.AZURE_STORAGE_CONNECTION_STRING ||
          (process.env.AZURE_STORAGE_ACCOUNT_NAME && process.env.AZURE_STORAGE_ACCOUNT_KEY),
      );
    },
    get driver(): 'blob' | 'local' {
      return this.isBlobConfigured ? 'blob' : 'local';
    },
  },

  /**
   * The Australian Business Register, which a vendor's ABN is looked up
   * against so the register fills in the company details it already holds.
   *
   * No credential is needed to run: without ABR_GUID the service reads the
   * public ABN Lookup page instead of the JSON web service. A GUID is issued
   * per registered party and cannot be provisioned from here, so the feature
   * would otherwise sit dead on arrival. Set one and the JSON service takes
   * over on its own.
   */
  abr: {
    enabled: bool('ABN_LOOKUP_ENABLED', true),
    url: optional('ABR_URL', 'https://abr.business.gov.au'),
    guid: optional('ABR_GUID', ''),
    /** The register asks callers to identify themselves. */
    userAgent: optional('ABR_USER_AGENT', 'BIVRY-SaaS (+https://bivry.com)'),
  },

  mail: {
    host: optional('SMTP_HOST', ''),
    port: num('SMTP_PORT', 587),
    /** Port 465 is implicit TLS, 587 upgrades with STARTTLS. */
    secure: bool('SMTP_SECURE', num('SMTP_PORT', 587) === 465),
    user: optional('SMTP_USER', ''),
    password: optional('SMTP_PASSWORD', ''),
    from: optional('MAIL_FROM', DEFAULT_MAIL_FROM),
    get isConfigured(): boolean {
      return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
    },
  },
} as const;

/**
 * Fails fast at boot when production is missing something that would otherwise
 * break silently at runtime (lost uploads, password reset emails going nowhere).
 */
export function assertProductionConfig(): void {
  if (!isProduction) return;

  const problems: string[] = [];
  if (!env.databaseUrl) problems.push('DATABASE_URL is not set');
  if (!env.storage.isBlobConfigured) {
    problems.push(
      'Azure Blob Storage is not configured (set AZURE_STORAGE_CONNECTION_STRING). ' +
        'App Service disks are ephemeral, so uploads would be lost.',
    );
  }
  if (!env.mail.isConfigured) {
    problems.push('SMTP is not configured, so password reset emails cannot be delivered');
  }
  if (env.frontendUrl.startsWith('http://localhost')) {
    problems.push('FRONTEND_URL still points at localhost, so CORS and reset links will be wrong');
  }

  if (problems.length > 0) {
    throw new Error(`Invalid production configuration:\n  - ${problems.join('\n  - ')}`);
  }
}
