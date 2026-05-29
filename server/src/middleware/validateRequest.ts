import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "../errors/AppError";

interface Schemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Express middleware factory that validates req.body / req.query / req.params
 * against Zod schemas. On failure, calls next(AppError VALIDATION_ERROR).
 * On success, replaces the properties with the parsed (coerced) values.
 *
 * @example
 * router.post('/register', validateRequest({ body: AuthSchemas.register }), handler);
 * router.get('/logs',      validateRequest({ query: AdminSchemas.logQuery }), handler);
 */
export function validateRequest(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const details: Record<string, unknown> = {};
    let hasError = false;

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        details.body = result.error.flatten().fieldErrors;
        hasError = true;
      } else {
        req.body = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        details.query = result.error.flatten().fieldErrors;
        hasError = true;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        req.query = result.data as any;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        details.params = result.error.flatten().fieldErrors;
        hasError = true;
      } else {
        req.params = result.data as Record<string, string>;
      }
    }

    if (hasError) {
      next(new AppError("VALIDATION_ERROR", "Invalid input", 400, details));
      return;
    }

    next();
  };
}
