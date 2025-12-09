import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authenticate, adminOnly } from '../../middleware/auth.middleware.js';
import { getUserSchema, getUsersSchema, signinSchema, signupSchema, updateUserSchema, refreshTokenSchema, logoutSchema, updatePasswordSchema } from './auth.validation.js';

const router = Router();

function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const err = new Error(error.details.map((d) => d.message).join(', '));
      err.name = 'ValidationError';
      err.status = 422;
      return next(err);
    }
    return next();
  };
}

router.post('/signup', validate(signupSchema), AuthController.signup);
router.post('/signin', validate(signinSchema), AuthController.signin);
router.post('/refresh-token', validate(refreshTokenSchema), AuthController.refreshToken);
router.patch('/update-password',authenticate, validate(updatePasswordSchema), AuthController.updatePassword);
router.post('/logout',authenticate, validate(logoutSchema), AuthController.logout);
router.post('/logout-all', authenticate, AuthController.logoutAllDevices);
router.get('/getUser/:id',authenticate, validate(getUserSchema), AuthController.getUser);
router.delete('/deleteUser/:id',authenticate, adminOnly, validate(getUserSchema), AuthController.deleteUser);
router.put('/updateUser/:id',authenticate, validate(updateUserSchema), AuthController.updateUser);
router.get('/getAllUsers',authenticate, adminOnly, validate(getUsersSchema), AuthController.getAllUsers);
router.get('/profile', authenticate, AuthController.profile);

export default router;


