import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { Readable } from 'stream';
import {
  BlobSASPermissions,
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  type ContainerClient,
} from '@azure/storage-blob';
import { env } from '../config/env';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';

/**
 * File storage abstraction.
 *
 * Two drivers, chosen automatically from the environment:
 *
 *   `blob`  - Azure Blob Storage. Used whenever AZURE_STORAGE_CONNECTION_STRING
 *             (or account name + key) is present, which is always the case in
 *             production. The container is private; the browser gets a short
 *             lived SAS URL instead of a public link.
 *   `local` - the `backend/uploads` folder. Development only. App Service
 *             instances have an ephemeral disk, so this must never be the
 *             production path (env.assertProductionConfig enforces that).
 *
 * Nothing outside this file knows which driver is active.
 */

/**
 * Which container a file belongs in. Driver documents and an admin's own files
 * are kept apart, so each can be governed on its own terms.
 */
export type StorageArea = 'driver' | 'admin';

const CONTAINERS: Record<StorageArea, string> = {
  driver: env.storage.driverContainer,
  admin: env.storage.adminContainer,
};

export const STORAGE_AREAS = Object.keys(CONTAINERS) as StorageArea[];

export function containerFor(area: StorageArea): string {
  return CONTAINERS[area];
}

export interface StoredFile {
  /** Path inside the container. This is what goes in `driver_documents.storage_key`. */
  storageKey: string;
  /** Canonical blob URL. Not publicly readable, kept for admin tooling and audits. */
  storageUrl: string | null;
}

export interface FileStream {
  stream: Readable;
  contentType: string;
  contentLength: number | null;
}

export interface SignedLink {
  url: string;
  /** null when the driver cannot expire links (local dev). */
  expiresAt: Date | null;
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

function slugify(value: string): string {
  return (
    value
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
      .toLowerCase() || 'file'
  );
}

/**
 * Keys are grouped by role, then account, then document type, so a whole
 * account's files can be listed or deleted with one prefix query.
 *
 * drivers/<driverId>/LICENCE_FRONT/1738147200000-licence-front.jpg
 */
export function buildStorageKey(input: {
  role: string;
  actorId: string;
  docType: string;
  originalName: string;
}): string {
  // `path.basename` matches the extension case sensitively, so strip using the
  // original casing and only lower case it afterwards. Otherwise "photo.JPG"
  // keeps its extension in the slug and becomes "photo-jpg.jpg".
  const rawExtension = path.extname(input.originalName);
  const extension = rawExtension.toLowerCase();
  const base = slugify(path.basename(input.originalName, rawExtension));
  return [
    `${input.role}s`,
    input.actorId,
    input.docType,
    `${Date.now()}-${base}${extension}`,
  ].join('/');
}

/** Blocks a crafted key from escaping its container prefix. */
function assertSafeKey(storageKey: string): void {
  if (!storageKey || storageKey.includes('..') || storageKey.startsWith('/')) {
    throw ApiError.badRequest('Invalid document path');
  }
}

// ---------------------------------------------------------------------------
// Azure Blob Storage driver
// ---------------------------------------------------------------------------

/** One cached client per container, created on first use. */
const containerPromises = new Map<string, Promise<ContainerClient>>();

function createBlobServiceClient(): BlobServiceClient {
  if (env.storage.connectionString) {
    return BlobServiceClient.fromConnectionString(env.storage.connectionString);
  }
  const credential = new StorageSharedKeyCredential(
    env.storage.accountName,
    env.storage.accountKey,
  );
  return new BlobServiceClient(
    `https://${env.storage.accountName}.blob.core.windows.net`,
    credential,
  );
}

/** Container client, created on first use and reused for the process lifetime. */
function getContainer(area: StorageArea): Promise<ContainerClient> {
  const name = containerFor(area);
  const existing = containerPromises.get(name);
  if (existing) return existing;

  const created = (async () => {
    const container = createBlobServiceClient().getContainerClient(name);
    // No `access` option: the container stays private. Files are only reachable
    // through the API or a signed URL.
    await container.createIfNotExists();
    logger.info(`Blob container ready: ${name}`);
    return container;
  })().catch((error) => {
    // Do not cache a failed connection, the next request should retry.
    containerPromises.delete(name);
    throw error;
  });

  containerPromises.set(name, created);
  return created;
}

/** Shared key credential used to sign SAS URLs, or null when it cannot be derived. */
function getSasCredential(): StorageSharedKeyCredential | null {
  if (env.storage.accountName && env.storage.accountKey) {
    return new StorageSharedKeyCredential(env.storage.accountName, env.storage.accountKey);
  }

  // Pull the account name and key out of the connection string.
  const parts = new Map(
    env.storage.connectionString
      .split(';')
      .map((pair) => pair.split(/=(.*)/s, 2) as [string, string])
      .filter((pair) => pair.length === 2),
  );
  const name = parts.get('AccountName');
  const key = parts.get('AccountKey');
  if (!name || !key) return null;

  return new StorageSharedKeyCredential(name, key);
}

// ---------------------------------------------------------------------------
// Local disk driver (development only)
// ---------------------------------------------------------------------------

const localRoot = path.isAbsolute(env.upload.localDir)
  ? env.upload.localDir
  : path.resolve(__dirname, '../../', env.upload.localDir);

/** The local fallback mirrors the container layout, one folder per area. */
function localAreaRoot(area: StorageArea): string {
  return path.resolve(localRoot, containerFor(area));
}

function localPath(area: StorageArea, storageKey: string): string {
  assertSafeKey(storageKey);
  const root = localAreaRoot(area);
  const absolute = path.resolve(root, storageKey);
  if (!absolute.startsWith(root)) {
    throw ApiError.badRequest('Invalid document path');
  }
  return absolute;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const storageDriver = env.storage.driver;

export async function saveFile(input: {
  storageKey: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  /** Which container to write to. Defaults to the driver document store. */
  area?: StorageArea;
}): Promise<StoredFile> {
  assertSafeKey(input.storageKey);
  const area = input.area ?? 'driver';

  if (storageDriver === 'local') {
    const absolute = localPath(area, input.storageKey);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, input.buffer);
    return { storageKey: input.storageKey, storageUrl: null };
  }

  const container = await getContainer(area);
  const blob = container.getBlockBlobClient(input.storageKey);

  await blob.uploadData(input.buffer, {
    blobHTTPHeaders: {
      blobContentType: input.mimeType,
      // Preview in the browser rather than force a download, and keep the
      // original filename for when the driver does choose to save it.
      blobContentDisposition: `inline; filename="${input.fileName.replace(/"/g, '')}"`,
      // Immutable: every upload gets a new timestamped key, so a stored file is
      // never overwritten in place.
      blobCacheControl: 'private, max-age=31536000, immutable',
    },
  });

  return { storageKey: input.storageKey, storageUrl: blob.url };
}

export async function deleteFile(
  storageKey: string,
  area: StorageArea = 'driver',
): Promise<void> {
  assertSafeKey(storageKey);

  if (storageDriver === 'local') {
    await fs.unlink(localPath(area, storageKey));
    return;
  }

  const container = await getContainer(area);
  await container.getBlockBlobClient(storageKey).deleteIfExists();
}

/** Streams a file back through the API. Used for authenticated downloads. */
export async function openFile(
  storageKey: string,
  mimeType: string,
  area: StorageArea = 'driver',
): Promise<FileStream> {
  assertSafeKey(storageKey);

  if (storageDriver === 'local') {
    const absolute = localPath(area, storageKey);
    if (!fsSync.existsSync(absolute)) {
      throw ApiError.notFound('The stored file is missing');
    }
    const { size } = await fs.stat(absolute);
    return { stream: fsSync.createReadStream(absolute), contentType: mimeType, contentLength: size };
  }

  const container = await getContainer(area);
  const blob = container.getBlockBlobClient(storageKey);

  if (!(await blob.exists())) {
    throw ApiError.notFound('The stored file is missing');
  }

  const download = await blob.download();
  if (!download.readableStreamBody) {
    throw ApiError.internal('Could not read the stored file');
  }

  return {
    stream: download.readableStreamBody as Readable,
    contentType: download.contentType ?? mimeType,
    contentLength: download.contentLength ?? null,
  };
}

/**
 * Short lived read only URL the browser can put straight into an `<img src>` or
 * an `<a href>`, with no Authorization header. Falls back to the streaming API
 * route when the driver cannot sign URLs (local development).
 */
export async function createSignedLink(input: {
  storageKey: string;
  fileName: string;
  /** API path used as the fallback when signing is not available. */
  fallbackPath: string;
  area?: StorageArea;
}): Promise<SignedLink> {
  assertSafeKey(input.storageKey);
  const area = input.area ?? 'driver';

  if (storageDriver === 'local') {
    return { url: input.fallbackPath, expiresAt: null };
  }

  const credential = getSasCredential();
  if (!credential) {
    logger.warn('Blob storage has no shared key, falling back to streaming downloads');
    return { url: input.fallbackPath, expiresAt: null };
  }

  const container = await getContainer(area);
  const expiresOn = new Date(Date.now() + env.storage.sasTtlMinutes * 60 * 1000);

  const sas = generateBlobSASQueryParameters(
    {
      containerName: containerFor(area),
      blobName: input.storageKey,
      permissions: BlobSASPermissions.parse('r'),
      startsOn: new Date(Date.now() - 60 * 1000), // tolerate small clock skew
      expiresOn,
      contentDisposition: `inline; filename="${input.fileName.replace(/"/g, '')}"`,
    },
    credential,
  ).toString();

  const blobUrl = container.getBlockBlobClient(input.storageKey).url;
  return { url: `${blobUrl}?${sas}`, expiresAt: expiresOn };
}

/** Called at boot so a bad storage configuration surfaces immediately. */
export async function verifyStorage(): Promise<boolean> {
  if (storageDriver === 'local') {
    for (const area of STORAGE_AREAS) {
      await fs.mkdir(localAreaRoot(area), { recursive: true });
    }
    logger.warn(`Storage driver: local disk (${localRoot}). Development only.`);
    return true;
  }

  try {
    // Every container is opened up front: a missing or misnamed one must fail at
    // boot, not on the first upload that happens to need it.
    for (const area of STORAGE_AREAS) {
      await getContainer(area);
    }
    logger.success(
      `Storage driver: Azure Blob Storage (${STORAGE_AREAS.map(containerFor).join(', ')})`,
    );
    return true;
  } catch (error) {
    logger.error('Azure Blob Storage is not reachable', error);
    return false;
  }
}
