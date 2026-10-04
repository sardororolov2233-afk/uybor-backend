import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction): void => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error: any) {
    if (error instanceof ZodError) {
      res.status(400).json({ error: (error as any).errors });
    } else {
      res.status(400).json({ error: 'Validation failed' });
    }
  }
};
