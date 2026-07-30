import type { AuthenticatedActor } from './auth.types';

declare global {
  namespace Express {
    interface Request {
      /** Populated by the authenticate middleware. */
      auth?: AuthenticatedActor;
    }
  }
}

export {};
