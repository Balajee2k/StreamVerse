import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router()

router.route("/register").post(
    upload.fields([
        //avatar & cover img do file check kre
        {
            name: "avatar",
            maxCount: 1 //no of file want to accept
        }, 
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
    )
//phir iska jo bhi url banega wo aise banega :
//https://localhost:8000/user/register

router.route("/login").post(loginUser)
/*secured routes (yaha middleware use kiye
authentication of token ke liye bcz uske bina logout hoga hi nahi)*/
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken)

export default router
