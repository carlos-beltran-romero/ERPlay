/**
 * Módulo de rutas de autenticación
 * Define endpoints para login, logout, refresh token y recuperación de contraseña
 * @module routes/auth
 */

import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import validateDto from "../middlewares/validateDto";
import * as authController from "../controllers/auth";
import { authenticate } from "../middlewares/authenticate";

const router = Router();

/**
 * POST /api/auth/login
 * Autentica usuario y retorna tokens de acceso y refresco
 * @access Público
 */
router.post(
  "/login",
  validateDto([
    body("email").isEmail().withMessage("Email inválido"),
    body("password")
      .isString()
      .isLength({ min: 6 })
      .withMessage("La contraseña debe tener al menos 6 caracteres"),
  ]),
  (req: Request, res: Response, next: NextFunction) =>
    authController.login(req, res, next)
);

/**
 * POST /api/auth/logout
 * Invalida el refresh token del usuario
 * @access Privado (requiere autenticación)
 */
router.post(
  "/logout",
  authenticate,
  (req: Request, res: Response, next: NextFunction) =>
    authController.logout(req, res, next)
);

/**
 * POST /api/auth/refresh
 * Renueva el access token usando un refresh token válido
 * @access Público
 */
router.post(
  "/refresh",
  validateDto([
    body("refreshToken").isString().withMessage("Refresh token requerido"),
  ]),
  (req: Request, res: Response, next: NextFunction) =>
    authController.refreshToken(req, res, next)
);

/**
 * POST /api/auth/forgot-password
 * Envía email de recuperación de contraseña
 * @access Público
 */
router.post(
  "/forgot-password",
  validateDto([body("email").isEmail().withMessage("Email inválido")]),
  (req: Request, res: Response, next: NextFunction) =>
    authController.forgotPassword(req, res, next)
);

/**
 * POST /api/auth/reset-password
 * Restablece la contraseña del usuario con token válido
 * @access Público
 */
router.post(
  "/reset-password",
  validateDto([
    body("token").isString().withMessage("Token requerido"),
    body("newPassword")
      .isString()
      .isLength({ min: 6 })
      .withMessage("La nueva contraseña debe tener al menos 6 caracteres"),
  ]),
  (req: Request, res: Response, next: NextFunction) =>
    authController.resetPassword(req, res, next)
);

export default router;
