import { Request, Response, NextFunction } from 'express';

export function validateRequest(validator: (body: any) => { valid: boolean; errors: string[] }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { valid, errors } = validator(req.body);
    if (!valid) {
      res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'INVALID_PAYLOAD',
          errors,
        },
      });
      return;
    }
    next();
  };
}
