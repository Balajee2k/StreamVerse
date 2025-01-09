import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
      
      cb(null, file.originalname)
    }
  })
  
export const upload = multer({ 
    storage, 
})

//multer use kar ke humlog pahle temporary file apne server pe rakh lenge(jaise apne public temp )
//then  uploaded file ko cloudinary pe upload and temperory file ko delete kar denge