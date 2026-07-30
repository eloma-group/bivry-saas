import fs from 'fs';
import path from 'path';

/**
 * Identifies the build that is actually running.
 *
 * CI writes `build-info.json` next to the compiled output, and `/api/health`
 * reports it back. The deploy workflow then asserts that the commit it just
 * built is the commit answering requests.
 *
 * Without this, the smoke test only proves that *an* API is up. A deploy that
 * uploaded successfully but never swapped the running app still answers health
 * checks with the previous build, and the workflow goes green anyway. That has
 * already happened once here.
 */
export interface BuildInfo {
  commit: string;
  builtAt: string | null;
}

function read(): BuildInfo {
  // __dirname is dist/config at runtime, so the file sits one level up.
  const file = path.resolve(__dirname, '..', 'build-info.json');

  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<BuildInfo>;
    if (typeof parsed.commit === 'string' && parsed.commit !== '') {
      return { commit: parsed.commit, builtAt: parsed.builtAt ?? null };
    }
  } catch {
    // Running from source with tsx, or a build that predates the stamp.
  }

  return { commit: 'unknown', builtAt: null };
}

export const buildInfo: BuildInfo = read();
