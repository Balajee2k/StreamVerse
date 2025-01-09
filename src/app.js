import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app=express()
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded({extended: true,limit:"16kb"}))
app.use(express.static("public"))
app.use(cookieParser())

//routes import

import userRouter from './routes/user.routes.js'

//routes declaration(humlog app.get isliye nahi use kar saskte bcz humlog route aur controller ko alg alg kr diye so middleware ke through use karna padega)

/*
app.use("/users",userRouter)
//jab bhi url banega aise banega http://localhost:8000/users
// uske badh /user ke badh jo bhi route hoga wo user.Router ko pass ho jayega 
*/

//But generallyt hamlog api likjte hai and then uska version so they write like this:
app.use("/api/v1/users",userRouter)//http://localhost:8000/api/v1/users/....


export { app }