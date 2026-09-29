import UserModel from "../models/user.model.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import sessionModel from "../models/session.model.js";
import {sendEmail} from "../services/email.service.js";
import otpModel from "../models/otp.model.js";
import{ generateOtp , getOtpHtml} from "../utils/utils.js";


export async function register(req, res) { 
    try {
        console.log("REQUEST BODY:", req.body);

        const { username, email, password } = req.body;

        console.log("username:", username);
        console.log("email:", email);
        console.log("password:", password);

        // Validate fields
        if (!username || !email || !password) {
            return res.status(400).json({
                message: "Username, email and password are required"
            });
        }

        // Check duplicate username or email
        const isAlreadyRegistered = await UserModel.findOne({
            $or: [
                { username },
                { email }
            ]
        });

        if (isAlreadyRegistered) {
            return res.status(409).json({
                message: "Username or email already exists"
            });
        }

        // Hash password
        const hashedPassword = crypto
            .createHash("sha256")
            .update(password)
            .digest("hex");

        // Create user
        const user = await UserModel.create({
            username,
            email,
            password: hashedPassword
        });

       const otp = generateOtp();
       const html = getOtpHtml(otp);
       
       const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

       await otpModel.create({
            email,
            user: user._id,
            otpHash
       })

       await sendEmail(email, "Otp verification" , `your OTP code is ${otp}`,html)


    //   const refreshToken = jwt.sign(
    //         {
    //             id: user._id
    //         },
    //         config.JWT_SECRET,
    //         {
    //             expiresIn: "7d"
    //         }
    //     );

    //     const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    //      const session = await sessionModel.create({
    //         user : user._id,
    //         refreshTokenHash,
    //         ip: req.ip,
    //         userAgent: req.headers["user-agent"]
    //     })
    //     // Generate JWT
    //     const accesstoken = jwt.sign(
    //         {
    //             id: user._id,
    //             sessionId: session._id
    //         },
    //         config.JWT_SECRET,
    //         {
    //             expiresIn: "15min"
    //         }
    //     );

    //     res.cookie("refreshToken",refreshToken,{
    //         httpOnly: true,
    //         secure: true,
    //         sameSite: "strict",
    //         maxAge: 7 * 24 * 60 * 60 * 1000 //7days
    //     })


        res.status(201).json({
            message: "User registered successfully",
            user: {
                username: user.username,
                email: user.email,
                verified: user.verified
            },
            
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);

        return res.status(500).json({
            message: "Registration failed",
            error: error.message
        });
    }
}

export async function login (req,res){
   const{email ,password} = req.body;
   const user = await UserModel.findOne({email})

   if(!user){
     return res.status(401).json({
        message: "Invalid email nd password"
    })
   }

   if(!user.verified){
    return res.status(401).json({
        message: "Email not verified"
    })
   }

   const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");
   const ispasswordValid = hashedPassword === user.password;

   if(!ispasswordValid){
    return res.status(401).json({
        message: " Invalid email or password"
    })
   }

   const refreshToken = jwt.sign({
    id: user._id
   },
   config.JWT_SECRET,
   {
    expiresIn: "7d"
   }
)
const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
const session = await sessionModel.create({
    user: user._id,
    refreshTokenHash,
    ip: req.ip,
    userAgent: req.headers["user-agent"]
})

const accessToken = jwt.sign({
    id: user._id,
    sessionId: session._id
},config.JWT_SECRET,{
    expiresIn: "15m"
}
)

res.cookie("refreshToken", refreshToken,{
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000
})
  res.status(200).json({
    message: "Logged in successfully",
    user: {
        username: user.username,
        email: user.email,
    },
    accessToken,
  })
}

export async function getMe(req, res) {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized"
            });
        }

        const decoded = jwt.verify(
            token,
            config.JWT_SECRET
        );

        const user = await UserModel.findById(decoded.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        return res.status(200).json({
            message: "User fetched successfully",
            user: {
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}

export async function refreshToken(req ,res){
    const refreshToken = req.cookies.refreshToken;

    if(!refreshToken){
        return res.status(401).json({
            message: "Refresh Token Not Found"
        })
    }

    const decoded = jwt.verify(refreshToken , config.JWT_SECRET)


    const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    const session =await sessionModel. findOne({
         refreshTokenHash,
         revoked: false
    })

    if(!session){
        return res.status(401).json({
            message: "Invalid Refresh Token"
        })
    }

    const accessToken = jwt.sign({
        id : decoded.id
    },
    config.JWT_SECRET,
    {
        expiresIn : "15m"
    }
     )

    const newRefreshToken = jwt.sign({

            id : decoded.id
    },
    config.JWT_SECRET,
    {
        expiresIn : "7d"
    
    })

    const newRefreshTokenHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");

    session.refreshTokenHash = newRefreshTokenHash;
    await session.save();


    res.cookie("refreshToken", newRefreshToken,{
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    })

     res.status(200).json({
        message:"Access Token refreshed successfully",
        accessToken
     })
}

export async function logout(req,res){
   const refreshToken = req.cookies.refreshToken;

   if(!refreshToken){
    return res.status(400).json({
       message: "Refresh token not found" 
    })
   }

   const refreshTokenHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

   const session = await sessionModel.findOne({
    refreshTokenHash,
    revoked: false
   })

   if(!session){
    return res.status(400).json({
        message: "Invalid refresh token"
    })
   }

   session.revoke = true;
   await session.save();
   res.clearCookie("refreshToken")

   res.status(200).json({
    message: "Logged Out successfullt"
   })
}

export async function logoutAll(req,res){
    const refreshToken = req.cookies.refreshToken;

    if(!refreshToken){
        return res.status(400).json({
            message:"Refresh token not found"
        })
    }
    const decoded = jwt.verify(refreshToken , config.JWT_SECRET)
    await sessionModel.updateMany({
        user: decoded.id,
        revoked: false
    },
{
    revoked: true
})

 res.clearCookie("refreshToken")

 res.status(200).json({
   message:"Logged Out from all devices Successfully"
 })

}

export async function verifyEmail(req, res) {

    const { otp, email } = req.body;

    const otpHash = crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");

    const otpDoc = await otpModel.findOne({
        email,
        otpHash
    });

    if (!otpDoc) {
        return res.status(400).json({
            message: "Invalid OTP"
        });
    }

    const user = await UserModel.findByIdAndUpdate(
        otpDoc.user,
        {
            verified: true
        },
        {
            new: true
        }
    );

    await otpModel.deleteMany({
        user: otpDoc.user
    });

    return res.status(200).json({
        message: "Email Verified Successfully",
        user: {
            username: user.username,
            email: user.email,
            verified: user.verified
        }
    });
}



