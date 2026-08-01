import { Request, Response, NextFunction } from 'express';

/**
 * Validates request payload for creating a Session.
 */
export function validateSessionPayload(req: Request, res: Response, next: NextFunction): void {
  const errors: string[] = [];
  const body = req.body;

  if (!body) {
    res.status(400).json({ success: false, errors: ['Request body is missing'] });
    return;
  }

  // Validate required string fields
  const requiredStrings = ['website', 'url', 'pageTitle'];
  for (const field of requiredStrings) {
    if (typeof body[field] !== 'string' || body[field].trim() === '') {
      errors.push(`Field '${field}' is required and must be a non-empty string`);
    }
  }

  // Validate required non-negative integer fields
  const requiredNumbers = ['duration', 'clicks', 'keystrokes', 'scrollDepth', 'tabSwitches'];
  for (const field of requiredNumbers) {
    const val = body[field];
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 0) {
      errors.push(`Field '${field}' is required and must be a non-negative integer`);
    }
  }

  // Validate dates
  const validateDate = (field: string) => {
    const val = body[field];
    if (!val) {
      errors.push(`Field '${field}' is required`);
      return;
    }
    const timestamp = Date.parse(val);
    if (isNaN(timestamp)) {
      errors.push(`Field '${field}' must be a valid ISO date string or timestamp`);
    }
  };

  validateDate('startTime');
  validateDate('endTime');

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      errors
    });
    return;
  }

  next();
}
