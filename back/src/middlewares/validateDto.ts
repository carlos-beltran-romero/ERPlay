/**
 * Módulo de middleware de validación de DTOs
 * Proporciona validación automática de datos de entrada usando express-validator
 * @module middlewares/validateDto
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
 * @example
 * // Definir reglas de validación
 * const loginValidations = [
 *   body('email').isEmail().withMessage('Email inválido'),
 *   body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
 * ];
 * 
 * @example
 * // Usar en una ruta
 * router.post('/login', validateDto(loginValidations), loginController);
 * 
 * @example
 * // Respuesta de error cuando la validación falla
 * // Status: 400
 * // Body: {
 * //   "errors": [
 * //     { "msg": "Email inválido", "param": "email", "location": "body" },
 * //     { "msg": "La contraseña debe tener al menos 6 caracteres", "param": "password", "location": "body" }
 * //   ]
 * // }
 * 
 * @example
 * // Validaciones complejas con múltiples campos
 * const createUserValidations = [
 *   body('name').trim().notEmpty().withMessage('El nombre es obligatorio'),
 *   body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
 *   body('age').optional().isInt({ min: 18 }).withMessage('Debe ser mayor de 18'),
 *   body('role').isIn(['STUDENT', 'SUPERVISOR']).withMessage('Rol inválido')
 * ];
 * 
 * @see {@link https://express-validator.github.io/docs/|Express Validator Documentation}
 * @public
 */
export default function validateDto(validations: ValidationChain[]): RequestHandler {
  return async (req, res, next) => {
    // Ejecutar todas las validaciones en paralelo sobre el request
    await Promise.all(validations.map((validation) => validation.run(req)));
    
    // Recopilar todos los errores de validación encontrados
    const errors = validationResult(req);

    // Si hay errores, retornar respuesta 400 con detalles
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    // Todas las validaciones pasaron, continuar al siguiente middleware
    next();
  };
}