/**
 * Proves the configured file storage actually works, end to end.
 *
 *   npm run check:storage
 *
 * Uploads a small test file, reads it back, signs a URL for it and deletes it.
 * Run it right after setting AZURE_STORAGE_CONNECTION_STRING, before deploying:
 * a wrong key or a missing container fails here in two seconds instead of on a
 * driver's first upload.
 *
 * It touches nothing else - the test blob is removed at the end and no database
 * row is created.
 */
import { env } from '../src/config/env';
import * as storage from '../src/services/storage.service';

const CHECKS: string[] = [];
let failed = false;

function pass(label: string, detail = ''): void {
  CHECKS.push(`  PASS  ${label}${detail ? `  ${detail}` : ''}`);
}

function fail(label: string, error: unknown): void {
  failed = true;
  const message = error instanceof Error ? error.message : String(error);
  CHECKS.push(`  FAIL  ${label}\n        ${message}`);
}

async function main(): Promise<void> {
  console.log('\nStorage check');
  console.log('-------------');
  console.log(`driver     : ${storage.storageDriver}`);
  console.log(`container  : ${env.storage.container}`);
  console.log(`account    : ${env.storage.accountName || '(from connection string)'}`);
  console.log(`SAS TTL    : ${env.storage.sasTtlMinutes} minutes\n`);

  if (storage.storageDriver === 'local') {
    console.log('AZURE_STORAGE_CONNECTION_STRING is not set, so this is checking');
    console.log('the local disk fallback. That is fine for development, but the');
    console.log('server will refuse to start in production without Blob Storage.\n');
  }

  const storageKey = storage.buildStorageKey({
    role: 'driver',
    actorId: '00000000-0000-0000-0000-000000000000',
    docType: 'ADDITIONAL',
    originalName: 'bivry-storage-check.txt',
  });
  const payload = `bivry storage check ${new Date().toISOString()}`;

  // 1. Reach the container.
  try {
    const ok = await storage.verifyStorage();
    if (!ok) throw new Error('verifyStorage() returned false, see the error above');
    pass('connect to storage');
  } catch (error) {
    fail('connect to storage', error);
    return report();
  }

  // 2. Upload.
  let uploaded = false;
  try {
    const saved = await storage.saveFile({
      storageKey,
      buffer: Buffer.from(payload, 'utf8'),
      mimeType: 'text/plain',
      fileName: 'bivry-storage-check.txt',
    });
    uploaded = true;
    pass('upload a file', saved.storageUrl ?? '(local disk)');
  } catch (error) {
    fail('upload a file', error);
    return report();
  }

  // 3. Read it back and confirm the bytes survived.
  try {
    const file = await storage.openFile(storageKey, 'text/plain');
    const chunks: Buffer[] = [];
    for await (const chunk of file.stream) chunks.push(Buffer.from(chunk));
    const roundTripped = Buffer.concat(chunks).toString('utf8');

    if (roundTripped !== payload) {
      throw new Error(`content changed in transit: got "${roundTripped}"`);
    }
    pass('read it back', `${file.contentLength ?? '?'} bytes, ${file.contentType}`);
  } catch (error) {
    fail('read it back', error);
  }

  // 4. Signed URL. This is what the browser gets, so it matters that the
  //    credential could actually be derived from the connection string.
  try {
    const link = await storage.createSignedLink({
      storageKey,
      fileName: 'bivry-storage-check.txt',
      fallbackPath: '/api/driver/documents/test/file',
    });

    if (storage.storageDriver === 'blob') {
      if (!link.url.includes('sig=')) {
        throw new Error(
          'no SAS signature in the URL. The account key could not be read, so ' +
            'previews will fall back to streaming through the API.',
        );
      }
      pass('sign a preview URL', `expires ${link.expiresAt?.toISOString()}`);

      // A signed URL is only useful if it really opens without any auth header.
      const response = await fetch(link.url);
      if (!response.ok) {
        throw new Error(`fetching the signed URL returned ${response.status}`);
      }
      const body = await response.text();
      if (body !== payload) throw new Error('signed URL served different content');
      pass('open the signed URL anonymously');
    } else {
      pass('sign a preview URL', '(local driver falls back to the API route)');
    }
  } catch (error) {
    fail('sign a preview URL', error);
  }

  // 5. Delete, and confirm it is really gone.
  try {
    await storage.deleteFile(storageKey);
    let stillThere = false;
    try {
      await storage.openFile(storageKey, 'text/plain');
      stillThere = true;
    } catch {
      // Expected: the file should no longer be readable.
    }
    if (stillThere) throw new Error('the file is still readable after deletion');
    uploaded = false;
    pass('delete it');
  } catch (error) {
    fail('delete it', error);
  }

  if (uploaded) {
    console.log(`\nNote: test blob may be left behind at ${storageKey}`);
  }

  report();
}

function report(): void {
  console.log(CHECKS.join('\n'));
  if (failed) {
    console.log('\nStorage is NOT ready. See DEPLOYMENT.md section 3.\n');
    process.exit(1);
  }
  console.log('\nStorage is ready.\n');
}

void main().catch((error) => {
  console.error('\nStorage check crashed:', error);
  process.exit(1);
});
