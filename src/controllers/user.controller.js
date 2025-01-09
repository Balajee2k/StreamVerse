import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        /*refresh token ko humlog ko save karke db me bhi
         rakhna hoga taki bar bar password nahi mange
        login ke liye to ye karna jaruri hai isisliye save in db*/

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

/* For registering user we see first breakdown into small Steps:
1.Get user details :
 - Get user info like name, email, password, etc. from the frontend
   (if frontend nahi hai to, Postman se bhi request kar sakte hai).
2.Validate input :
 - Check if all required fields are filled (taki kuch empty na ho,
   backend validation se bhi ensure karenge).
3.Check if user already exists :
 - Check if the user is already registered by 
   checking the username or email (ya dono).
4.Check for avatar and images :
 - Ensure that the user has uploaded an avatar
   (important for profile setup) 
 and any other required images.
5.Upload images to Cloudinary :
 - Upload the avatar and other images to Cloudinary
   or another cloud storage service.
6.Create user in the database :
 - Create the user object and save it to the database
   (yaani DB mein user ka entry create karenge).
7.Remove sensitive fields from response :
 - Remove password and refresh token fields from the response
   (kyunki ye details frontend ko nahi deni hai, secure rakhna hai).
8.Check for user creation success :
 -Make sure that user creation was successful
  (response aaya ki nahi), and if successful,
  send a confirmation response to the frontend.
9.Send success response:
 - Return a "Yes" or success response 
 if everything went well and user creation was successful.
*/

const registerUser = asyncHandler(async (req, res) =>{
    //S1:Get user detail From req.body or agar url se araha hai to badh me dekhenge)

    const {fullName,email,username,password}=req.body
    //You could also write each field individually like const fullName=req.body.fullName;
    //console.log(email);//testing ke liye ki araha ki nahi

    /*
    S2: Validate that none of the required fields are empty:
     We use optional chaining (?.) to safely access the `trim` method
     which removes extra spaces from the start and end of a string. If any field is empty, we throw an error */
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    /*
    S3:Check if the user already exists using either username or email:
    Use the `User.findOne` method to search for a user with a matching 
    username or email using MongoDB's `$or` operator */

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    //console.log(req.files);

    /*
    S4:Checking if the avatar image has been uploaded
    req.files?.avatar[0]?.path` uses optional chaining to access the path of the first uploaded avatar file
    If `req.files` has a cover image, store its path, otherwise leave it as `undefined`
    */

    const avatarLocalPath = req.files?.avatar[0]?.path; /* is using optional chaining (?.) to access the path property of the 
    first element in the avatar array of the req.files object */
   /* const coverImageLocalPath = req.files?.coverImage[0]?.path; */

   //this is special one concept used in coverImageLocalPath
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage)
         && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    //S5:Uploading on cloudinary:

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    // Double-check that avatar was uploaded successfully
    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
   
    //S6:Create the user object with the necessary details and save it to the database

    const user = await User.create({
        fullName,   
        avatar: avatar.url,
        coverImage: coverImage?.url || "", //set coverImage to an empty string if not uploaded.
        email, 
        password,
        username: username.toLowerCase()
    })

   /* 
    S7 & S8: After creating the user, we need to make sure sensitive fields like 
    `password` and `refreshToken` are not sent back in the response.
    We use `select()` to exclude these fields when querying the user from the database.
    */
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" //iske andar jo bhi likha hai matlab wo nahi chahiye hoga
    )
    
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }
    //S9:

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})

/* Steps for Logging in a User:
S1.Retrieve user credentials (e.g., username, email, password)
 from the request body or form.
S2.Check if the user exists by using either the username or email
   - If the user doesn't exist, throw an error.
S3.If the user exists, verify the password.
   - If the password is incorrect, throw an error.
S4.If both the user and password are correct:
   - Generate an access token and a refresh token for the session.
S5.Store these tokens securely in cookies (e.g., HTTP-only and secure cookies).
S6.Respond to the client with a success message and the tokens in the cookies.
*/

const loginUser=asyncHandler(async(req,res)=>{
    //S1
    const {email,username,password}=req.body
    console.log(email) //for testing
    
    if(!username && !email){
        throw new ApiError(400,"username or password is required") 
    }
    /*S2
     agar username ke base pe dhundna hai to user.findone({username})
     and email hai to email dal do but ya email ya username karna hoga to then use $or
     */
    const user= await User.findOne({
        $or:[{username},{email}]
    })
    //agar user nahi mila to 
    if(!user){
        throw new ApiError(404,"user does not exist")
    }
    /* S3: bceypt use kar sakte hai to bcrypt ko use karenge for use see
     user.model.js methods jo humne khud banaye like isPasswordCorrect
      usko use karke humlog check karenge but ya we use this user<- not mongodb User<--
      because we made this method at own 
    */
   const isPasswordValid= await user.isPasswordCorrect(password)

   if(!isPasswordValid){
    throw new ApiError(401,"Invalid user credentials")
   }
   /* 
   S5> we use tokens in this step many time so we make seperate in 
   generateAccessAndRefereshTokens() line 9 so that we directly use here
   now for store in cookies,
   */
   const {accessToken, refreshToken}= await
   generateAccessAndRefereshTokens(user._id)

   const loggedInUser= await User.findById(user._id)
   .select("-password -refreshToken")
   /*
   now for store in cookies ,kuch option bhejne padte hai 
   httpOnly: true and secure: true karne se
   bas server hi access and modified kar sakta hai not frontend
   */
    const options = {
        httpOnly: true,
        secure: true
    }
    //now send response
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    //final send json response
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User logged in Successfully"
        )
    )

})

/* Steps for Logging Out a User:
1. Clear Authentication Tokens: 
   - Remove the `access token` and `refresh token` from the cookies
    or local storage (wherever they were stored).
   - If tokens are stored in cookies, clear them using the`res.clearCookie()` method.
2.Clear Session (if applicable): 
   - If using server-side sessions (e.g., `express-session`),
    destroy the session using `req.session.destroy()`.
3.Send a Success Response: 
   - Send a response to the client confirming that the logout was successful.
   - The response could be a simple success message like `"Logout successful"`.
*/

const logoutUser=asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id, //ye req ka acess now a gya
        {
            $set:{ //ye update ka command hai
                refreshToken: undefined
            }
        },
        {
            new:true
        }
     )


    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User Logout succesfully"))
     
})

/*steps to refresh Access token when expired
1.Extract refresh token from cookies or body.
2.If no token, throw unauthorized error.
3.Verify refresh token using jwt.verify() and REFRESH_TOKEN_SECRET.
4.Find the user in the database using the ID from the decoded token.
 If no user found, throw an error.
5.Check if the incoming refresh token matches the one stored for the user.
 If not, throw an error.
6.Generate new access and refresh tokens.
7.Send the new tokens back in both cookies and the JSON response.
8.If any errors occur, catch and throw the appropriate error.
*/

const refreshAccessToken = asyncHandler(async (req, res) => {
       //Step1
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        //Step3(ab jo humlog ka incm token hai wo decoded me change ho gya )
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        //Step4
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
        //Step5
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }

        /*
        This sets the cookie options: httpOnly ensures the token cannot
        be accessed via JavaScript on the client side, and secure ensures
        the token is only sent over HTTPS.*/

        const options = {
            httpOnly: true,
            secure: true
        }

        //Step6
        const {accessToken, newRefreshToken} = await
         generateAccessAndRefereshTokens(user._id)

        //Step7
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

/* Steps to change the user's password
1. Extract `oldPassword` and `newPassword` from `req.body`.
2. Find the user in the database using `req.user?._id`.
3. Verify the `oldPassword` using the user's `isPasswordCorrect` method.
   - If the old password is invalid, throw a 400 error.
4. Update the user's password field with `newPassword`.
5. Save the updated user to the database with `validateBeforeSave: false`.
6. Send a 200 response with a success message.
*/

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body


    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

/* Steps to update account details
1. Extract `fullName` and `email` from `req.body`.
2. Check if `fullName` and `email` are provided.
   - If either is missing, throw a 400 error with "All fields are required."
3. Use `User.findByIdAndUpdate` to update the user's `fullName` and `email` in the database:
   - Identify the user by `req.user?._id`.
   - Use `$set` to update the specified fields.
   - Set the `new: true` option to return the updated document.
4. Exclude the `password` field from the returned user object using `.select("-password")`.
5. Send a 200 response with the updated user object and a success message.
*/

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});

/* Steps to update user avatar
1. Extract `avatarLocalPath` from the uploaded file (`req.file?.path`).
   - If no file is provided, throw a 400 error with "Avatar file is missing."
2. Upload the avatar to a cloud storage service using `uploadOnCloudinary(avatarLocalPath)`.
   - If the upload fails or doesn't return a URL, throw a 400 error with "Error while uploading avatar."
3. Use `User.findByIdAndUpdate` to update the user's `avatar` field in the database:
   - Identify the user by `req.user?._id`.
   - Use `$set` to update the `avatar` field with the uploaded image's URL.
   - Set the `new: true` option to return the updated document.
4. Exclude the `password` field from the returned user object using `.select("-password")`.
5. Send a 200 response with the updated user object and a success message.
6. (TODO: Add logic to delete the old avatar image to avoid orphaned files.)
*/

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})

/* Steps to get user channel profile
1. Extract `username` from `req.params`.
   - If `username` is missing or empty, throw a 400 error with "username is missing."
2. Use `User.aggregate` to fetch the channel profile:
   - Step 2.1: Match the `username` (converted to lowercase) with the user's data in the database.
   - Step 2.2: Perform a `$lookup` to fetch all subscribers for this channel:
     - Match the user `_id` with the `channel` field in the `subscriptions` collection.
   - Step 2.3: Perform another `$lookup` to fetch all channels the user is subscribed to:
     - Match the user `_id` with the `subscriber` field in the `subscriptions` collection.
   - Step 2.4: Add computed fields using `$addFields`:
     - `subscribersCount`: Count the number of subscribers using `$size`.
     - `channelsSubscribedToCount`: Count the number of channels subscribed to using `$size`.
     - `isSubscribed`: Check if the current user (`req.user?._id`) is among the subscribers using `$in` with a conditional (`$cond`).
   - Step 2.5: Use `$project` to include only the necessary fields in the final output:
     - Fields like `fullName`, `username`, `subscribersCount`, `channelsSubscribedToCount`, `isSubscribed`, `avatar`, `coverImage`, and `email`.
3. Check if the `channel` exists:
   - If no channel is found (`channel?.length` is 0), throw a 404 error with "channel does not exist."
4. Send a 200 response with the channel details and a success message.
*/


const getUserChannelProfile=asyncHandler(async(req,res)=>{
    const {username}=req.params

    if((!username?.trim())){
        throw new ApiError(400,"username is missing")
    }

    const channel=await User.aggregate([
        {
            $match: {
                username:username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
            }
        },
        {
            $lookup: {
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscriberTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size:"$subscribers"
                },
                channelsSubscribedTocount:{
                    $size:"$subscribeedTo"
                },
                isSubscribed:{
                  $count:{
                    if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                    then:true,
                    else:false
                  }  
                }
            }
        },
        {
            $project:{
                fullName:1,
                username:1,
                subscribersCount:1,
                channelsSubscribedTocount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                

            }
        }

    ])

    if(!channel?.length){
        throw new ApiError(404,"channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,channel[0],"User channel fetched successfully")
    )
})

/* Steps to get watch history
1. Use `User.aggregate` to fetch the user's watch history:
   - **Step 1.1**: Match the user by `_id` using the `req.user._id` value.
   - **Step 1.2**: Perform a `$lookup` to fetch video details:
     - Match the `watchHistory` field in the `User` collection with the `_id` field in the `videos` collection.
     - Rename the matched videos as `watchHistory`.
   - **Step 1.3**: Within the `videos` pipeline, perform another `$lookup` to fetch the owner details:
     - Match the `owner` field in the `videos` collection with the `_id` field in the `users` collection.
     - Return only selected owner fields (`fullName`, `username`, and `avatar`) using `$project`.
   - **Step 1.4**: Add the `owner` field to each video using `$addFields` and `$first` to extract the first element from the owner array.
2. Retrieve the watch history as `user[0].watchHistory` after aggregation.
3. Send a 200 response with the watch history and a success message.
*/

const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watch history fetched successfully"
        )
    )
})




export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}