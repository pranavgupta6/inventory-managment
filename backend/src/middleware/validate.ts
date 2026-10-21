import type { Request, Response, NextFunction } from 'express';
import type { ZodError, ZodType } from 'zod';
import { ValidationError } from './error-handler.js';

type Target = 'body' | 'query' | 'params';

/**
 * Returns an Express middleware that validates req[target] against the
 * provided Zod schema and attaches the parsed output back to req[target].
 * Throws a ValidationError (400) on failure — caught by errorHandler.
 */
export function validate(schema: ZodType, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const message = formatZodError(result.error);
      return next(new ValidationError(message));
    }
    // Replace the target with the parsed (coerced/transformed) value
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    req[target] = result.data;
    next();
  };
}

function formatZodError(error: ZodError): string {
  return error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
}
