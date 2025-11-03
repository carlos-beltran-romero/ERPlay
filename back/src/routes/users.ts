// ================================
// src/routes/users.routes.ts
// Routes for user management
// ================================
import { Router } from 'express';
import { body, param } from 'express-validator';

import usersController from '../controllers/users';
import { authenticate } from '../middlewares/authenticate';
import authorize from '../middlewares/authorize';
import validateDto from '../middlewares/validateDto';

const router = Router();

router.get('/me', authenticate, usersController.getProfile);

router.put(
  '/me',
  authenticate,
  validateDto([
    body('name').optional().isString().trim().notEmpty().withMessage('Nombre inválido'),
    body('lastName').optional().isString().trim(),
    body('email').optional().isEmail().withMessage('Email inválido'),
  ]),
  usersController.updateMyProfile,
);

router.post(
  '/me/password',
  authenticate,
  validateDto([
    body('currentPassword').isString().notEmpty().withMessage('Contraseña actual requerida'),
    body('newPassword')
      .isString()
      .isLength({ min: 6 })
      .withMessage('La nueva contraseña debe tener al menos 6 caracteres'),
  ]),
  usersController.changeMyPassword,
);

router.get('/', authenticate, authorize('supervisor'), usersController.listUsers);

router.post(
  '/batch',
  authenticate,
  authorize('supervisor'),
  validateDto([
    body('users').isArray({ min: 1 }).withMessage('Users array is required'),
    body('users.*.email').isEmail().withMessage('Each user must have a valid email'),
    body('users.*.password')
      .isString()
      .isLength({ min: 6 })
      .withMessage('Each user password must be at least 6 characters'),
  ]),
  usersController.batchCreateUsers,
);

router.get(
  '/:userId',
  authenticate,
  authorize('alumno', 'supervisor'),
  validateDto([param('userId').isUUID().withMessage('Invalid userId')]),
  usersController.getUserById,
);

router.put(
  '/:userId',
  authenticate,
  authorize('alumno', 'supervisor'),
  validateDto([
    param('userId').isUUID().withMessage('Invalid userId'),
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('name').optional().isString().trim().notEmpty().withMessage('Nombre requerido'),
    body('lastName').optional().isString().trim(),
    body('password')
      .optional()
      .isString()
      .isLength({ min: 6 })
      .withMessage('Contraseña mínima de 6 caracteres'),
  ]),
  usersController.updateUser,
);

router.delete(
  '/:userId',
  authenticate,
  authorize('supervisor'),
  validateDto([param('userId').isUUID().withMessage('Invalid userId')]),
  usersController.deleteUser,
);

export default router;
