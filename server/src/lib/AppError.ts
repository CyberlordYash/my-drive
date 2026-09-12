/**
 * Every intentional failure in the app is thrown as an AppError with a
 * stable machine-readable `code` the frontend switches on. Controllers
 * should never throw a bare `Error` — that path falls through to the
 * generic 500 handler and loses the specific status/code.
 */
export class AppError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;
  /** When false, the error message itself is hidden from the client response
   *  (still logged in full server-side). Used for anything that might leak
   *  internals. */
  public readonly expose: boolean;

  constructor(status: number, code: string, message: string, details?: unknown, expose = true) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = expose;
  }

  static badRequest(code: string, message: string, details?: unknown) {
    return new AppError(400, code, message, details);
  }
  static unauthorized(message = 'Authentication required', code = 'UNAUTHENTICATED') {
    return new AppError(401, code, message);
  }
  static forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
    return new AppError(403, code, message);
  }
  /** Used for both "does not exist" and "exists but you can't see it" —
   *  never leak existence of a resource the caller has no access to. */
  static notFound(code = 'NOT_FOUND', message = 'Resource not found') {
    return new AppError(404, code, message);
  }
  static conflict(code: string, message: string, details?: unknown) {
    return new AppError(409, code, message, details);
  }
  static payloadTooLarge(code: string, message: string) {
    return new AppError(413, code, message);
  }
  static unsupportedType(message = 'Unsupported file type') {
    return new AppError(415, 'UNSUPPORTED_TYPE', message);
  }
  static validation(details?: unknown) {
    return new AppError(422, 'VALIDATION_ERROR', 'Invalid request', details);
  }
  static tooManyRequests(message = 'Too many requests') {
    return new AppError(429, 'RATE_LIMITED', message);
  }
  static quotaExceeded(message = 'Storage quota exceeded') {
    return new AppError(507, 'QUOTA_EXCEEDED', message);
  }
  static internal(message = 'Internal server error') {
    return new AppError(500, 'INTERNAL_ERROR', message, undefined, false);
  }
}
