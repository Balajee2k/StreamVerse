import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js"; 
import { User } from "../models/user.model.js";


export const verifyJWT=asyncHandler(async(req,res,
    next)=>{
        
    try {
        const token=req.cookies?.accessToken || req.header
        ("Authorization")?.replace("Bearer","")
    
        //TOKEN NAHI HAI TO
        if(!token){
            throw new ApiError(401,"Unauthorized request")
        }
        //NOW TOKEN HAI TO verify karo sahi hai ki nahi to ye kam jwt se karwayenge kyuki wahi decode kar sakta
        const decodedToken =
        jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
    
        /*now ek database request marenge kyuki dekh ki user milgaya ki nahi uske liye*/
        const user=
        await User.findById(decodedToken?._id).select("-password -refreshToken")

        //agar user nahi mila to error throw
        if(!user){
            //next video me ye discussion hoga
            throw new ApiError(401,"Invalid Access Token")
        }
        req.user=user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }

})
