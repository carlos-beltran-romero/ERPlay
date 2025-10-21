// ================================
// src/routes/auth.routes.ts
// Rutas de autenticación
// ================================
import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import validateDto from '../middlewares/validateDto';
import * as authController from '../controllers/auth';
import { authenticate } from '../middlewares/authenticate'; 

const router = Router();

/**
 * @route POST /api/auth/login
 * @desc Authenticate user and return access & refresh tokens
 * @access Public
 */
router.post(
  '/login',
  validateDto([
    body('email').isEmail().withMessage('Email inválido'),
    body('password')
      .isString()
      .isLength({ min: 6 })
      .withMessage('La contraseña debe tener al menos 6 caracteres'),
  ]),
  (req: Request, res: Response, next: NextFunction) =>
    authController.login(req, res, next)
);

/**
 * @route POST /api/auth/logout
 * @desc Invalidate refresh token
 * @access Private
 */
router.post(
  '/logout',
  authenticate,
  (req: Request, res: Response, next: NextFunction) =>
    authController.logout(req, res, next)
);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token using refresh token
 * @access Public
 */
router.post(
  '/refresh',
  validateDto([
    body('refreshToken')
      .isString()
      .withMessage('Refresh token requerido'),
  ]),
  (req: Request, res: Response, next: NextFunction) =>
    authController.refreshToken(req, res, next)
);

/**
 * @route POST /api/auth/forgot-password
 * @desc Send password reset email
 * @access Public
 */

router.post(
  '/forgot-password',
  validateDto([
    body('email').isEmail().withMessage('Email inválido'),
  ]),
  (req: Request, res: Response, next: NextFunction) =>
    authController.forgotPassword(req, res, next)
);

/**
 * @route POST /api/auth/reset-password
 * @desc Reset user password
 * @access Public
 */
router.post(
  '/reset-password',
  validateDto([
    body('token').isString().withMessage('Token requerido'),
    body('newPassword')
      .isString()
      .isLength({ min: 6 })
      .withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
  ]),
  (req: Request, res: Response, next: NextFunction) =>
    authController.resetPassword(req, res, next)
);

export default router;