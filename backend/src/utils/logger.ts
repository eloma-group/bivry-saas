/* Minimal console logger. Swap the sinks here if a log service is added later. */

function timestamp(): string {
  return new Date().toISOString();
}

export const logger = {
  info(message: string, meta?: unknown): void {
    console.log(`[${timestamp()}] INFO  ${message}`, meta ?? '');
  },
  success(message: string, meta?: unknown): void {
    console.log(`[${timestamp()}] OK    ${message}`, meta ?? '');
  },
  warn(message: string, meta?: unknown): void {
    console.warn(`[${timestamp()}] WARN  ${message}`, meta ?? '');
  },
  error(message: string, error?: unknown): void {
    console.error(`[${timestamp()}] ERROR ${message}`);
    if (error) console.error(error);
  },
};
