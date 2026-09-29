import { Router } from "express";
import * as authController from "../controllers/auth.Controller.js";

const authRouter = Router();
//POST /api/auth/register
authRouter.post("/register", authController.register)

authRouter.post("/login",authController.login)

// Get /api/auth/get-me
authRouter.get("/get-me",authController.getMe)


// Get /api/auth/refresh-token
authRouter.get("/refresh-token", authController.refreshToken)


//Get /api/auth/logout
authRouter.get("/logout",authController.logout)

authRouter.get("/logoutall",authController.logoutAll)

authRouter.get("/verify-email",authController.verifyEmail)
export default authRouter;