/**
 * @module middlewares/validateDto
 */
import { RequestHandler } from 'express';
import { ValidationChain, validationResult } from 'express-validator';

export default function validateDto(validations: ValidationChain[]): RequestHandler {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    next();
  };
}
