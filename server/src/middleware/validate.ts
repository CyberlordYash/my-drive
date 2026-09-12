import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

interface ValidationSchemas {
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
}

/**
 * Parses req.{params,query,body} against the given zod schemas and, on
 * success, REPLACES each with the parsed value (coerced types, stripped
 * unknown keys). Every downstream controller therefore receives typed,
 * trusted data — it never has to re-validate or guess at shapes.
 *
 * On failure it throws (ZodError), which errorHandler.ts turns into a 422
 * with field-level details.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (schemas.params) {
      req.params = schemas.params.parse(req.params) as typeof req.params;
    }
    if (schemas.query) {
      // Express 5 makes req.query a getter-only property, so we can't
      // reassign it directly — stash the parsed value where controllers
      // actually read from instead.
      (req as Request & { validatedQuery?: unknown }).validatedQuery = schemas.query.parse(
        req.query,
      );
    }
    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }
    next();
  };
}
