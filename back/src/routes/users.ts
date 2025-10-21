// ================================
// src/routes/users.routes.ts
// Routes for user management
// ================================
import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import validateDto from '../middlewares/validateDto';
import { authenticate } from '../middlewares/authenticate';
import authorize from '../middlewares/authorize';
import usersController from '../controllers/users';

const router = Router();

/**
 * @route   GET /api/users/me
 * @desc    Get the authenticated user's profile
 * @access  Private (student, supervisor)
 */
router.get(
  '/me',
  authenticate,
  (req: Request, res: Response, next: NextFunction) =>
    usersController.getProfile(req, res, next)
);

/**
 * ✅ AÑADIDO: PUT /api/users/me (debe ir ANTES de /:userId)
 */
router.put(
  '/me',
  authenticate,
  validateDto([
    body('name').optional().isString().trim().notEmpty().withMessage('Nombre inválido'),
    body('lastName').optional().isString().trim(),
    body('email').optional().isEmail().withMessage('Email inválido'),
  ]),
  (req: Request, res: Response, next: NextFunction) =>
    usersController.updateMyProfile(req, res)
);

/**
 * ✅ AÑADIDO: POST /api/users/me/password (debe ir ANTES de /:userId)
 */
router.post(
  '/me/password',
  authenticate,
  validateDto([
    body('currentPassword').isString().notEmpty().withMessage('Contraseña actual requerida'),
    body('newPassword').isString().isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
  ]),
  (req: Request, res: Response, next: NextFunction) =>
    usersController.changeMyPassword(req, res, next)
);

/**
 * @route   GET /api/users
 * @desc    List all supervised students
 * @access  Private (supervisor)
 */
router.get(
  '/',
  authenticate,
  authorize('supervisor'),
  (req: Request, res: Response, next: NextFunction) =>
    usersController.listUsers(req, res, next)
);

/**
 * @route   POST /api/users/batch
 * @desc    Bulk create students from JSON array
 * @access  Private (supervisor)
 */
router.post(
  '/batch',
  authenticate,
  authorize('supervisor'),
  validateDto([
    body('users')
      .isArray({ min: 1 })
      .withMessage('Users array is required'),
    body('users.*.email')
      .isEmail()
      .withMessage('Each user must have a valid email'),
    body('users.*.password')
      .isString()
      .isLength({ min: 6 })
      .withMessage('Each user password must be at least 6 characters'),
  ]),
  (req: Request, res: Response, next: NextFunction) =>
    usersController.batchCreateUsers(req, res, next)
);

/**
 * @route   GET /api/users/:userId
 * @desc    Retrieve a user by ID (self or supervised)
 * @access  Private (student, supervisor)
 */
router.get(
  '/:userId',
  authenticate,
  authorize('alumno', 'supervisor'),
  validateDto([
    param('userId').isUUID().withMessage('Invalid userId'),
  ]),
  (req: Request, res: Response, next: NextFunction) =>
    usersController.getUserById(req, res, next)
);

/**
 * @route   PUT /api/users/:userId
 * @desc    Update user details
 * @access  Private (student (self), supervisor)
 */
router.put(
  '/:userId',
  authenticate,
  authorize('alumno', 'supervisor'),
  validateDto([
    param('userId').isUUID().withMessage('Invalid userId'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('password')
      .optional()
      .isString()
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ]),
  (req: Request, res: Response, next: NextFunction) =>
    usersController.updateUser(req, res, next)
);

/**
 * @route   DELETE /api/users/:userId
 * @desc    Delete a student
 * @access  Private (supervisor)
 */
router.delete(
  '/:userId',
  authenticate,
  authorize('supervisor'),
  validateDto([
    param('userId').isUUID().withMessage('Invalid userId'),
  ]),
  (req: Request, res: Response, next: NextFunction) =>
    usersController.deleteUser(req, res, next)
);

/** (Ya lo tenías; puede quedar duplicado sin afectar porque arriba está el primero) */
router.post(
  '/batch',
  authenticate,
  authorize('supervisor'),
  validateDto([
    body('users').isArray({ min: 1 }).withMessage('Users array is required'),
    body('users.*.name').isString().trim().notEmpty().withMessage('Nombre requerido'),
    body('users.*.lastName').isString().trim().notEmpty().withMessage('Apellidos requeridos'),
    body('users.*.email').isEmail().withMessage('Email inválido'),
    body('users.*.password').isString().isLength({ min: 6 }).withMessage('Password mínimo 6'),
  ]),
  (req, res, next) => usersController.batchCreateUsers(req, res, next)
);

/** (También los tenías abajo; los de arriba se ejecutarán primero) */
router.put('/me', authenticate, usersController.updateMyProfile);
router.post('/me/password', authenticate, usersController.changeMyPassword);

export default router;
