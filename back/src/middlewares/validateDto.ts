/**
 * Módulo de middleware de validación de DTOs
 * Proporciona validación automática de datos de entrada usando express-validator
 * @module back/middlewares/validateDto
 */

import { RequestHandler } from 'express';
import { ValidationChain, validationResult } from 'express-validator';

/**
 * Factory function que crea un middleware de validación para DTOs
 * Ejecuta una cadena de validaciones de express-validator y retorna errores formateados
 * si alguna validación falla.
 * 
 * @param validations Array de reglas de validación de express-validator a aplicar
 * @returns Middleware RequestHandler que ejecuta las validaciones
 * 
 * @remarks
 * Este middleware debe colocarse antes del controlador en las rutas que requieren validación.
 * Si hay errores de validación, responde con status 400 y un array de errores detallados.
 * Si todas las validaciones pasan, continúa al siguiente middleware/controlador.
 * 
 * Las validaciones se ejecutan en paralelo para mejor rendimiento.
 * El formato de respuesta de error es compatible con el estándar de express-validator.
 * 
 * @public
 */
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