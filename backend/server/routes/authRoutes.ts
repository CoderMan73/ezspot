import express from 'express';
import { casLogin } from '../auth/authLogin';
import { currentUser, login, logout } from '../auth/authController';
import { isAuthenticated } from '../auth/authStatus';

const router = express.Router();

router.get('/login', casLogin, login);
router.get('/logout', logout);
router.get('/currentUser', isAuthenticated, currentUser);

export default router;