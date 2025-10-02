import { ZodSchema } from "zod";
import { NextResponse } from "next/server";

/**
 * Validate the request body against a Zod schema.
 * Returns parsed data on success, or a NextResponse on failure.
 */
export async function validateRequest<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; response: NextResponse }> {
  const body = await req.json();
  const parseResult = schema.safeParse(body);

  if (!parseResult.success) {
    return {
      success: false,
      response: NextResponse.json({ error: parseResult.error.format() }, { status: 400 }),
    };
  }

  return { success: true, data: parseResult.data };
}



export function withValidation<T>(schema: ZodSchema<T>) {
  return (handler: (req: Request, ctx: any, data: T) => Promise<NextResponse>) => {
    return async (req: Request, ctx: any) => {
      const validation = await validateRequest(req, schema);
      if (!validation.success) return validation.response;

      // Call original handler with validated data
      return handler(req, ctx, validation.data);
    };
  };
}