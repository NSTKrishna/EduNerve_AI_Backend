import { AppError } from "../utils/AppError.js";

/**
 * Validate req[source] with a zod schema and replace it with the parsed value
 * (trimmed, lower-cased, defaults applied, unknown keys stripped).
 */
export const validate =
  (schema, source = "body") =>
  (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      const first = details[0];
      const message = first.field ? `${first.field}: ${first.message}` : first.message;
      return next(new AppError(400, "VALIDATION_ERROR", message, details));
    }
    // `req.query` is a getter in Express 5, so keep parsed values elsewhere for it.
    if (source === "query") req.validatedQuery = result.data;
    else req[source] = result.data;
    next();
  };
