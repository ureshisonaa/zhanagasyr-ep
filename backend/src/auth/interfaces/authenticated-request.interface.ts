import type { Request } from 'express';
import type { SanitizedUser } from './sanitized-user.interface';

export interface AuthenticatedRequest extends Request {
  user: SanitizedUser;
}
