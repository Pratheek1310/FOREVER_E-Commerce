import express from 'express';
import { loginUSer, registerUser, adminLogin } from '../controllers/userController.js';

const userRouter = express.Router();

userRouter.post('/register',registerUser)
userRouter.post('/login',loginUSer)
userRouter.post('/admin',adminLogin)

export default userRouter;