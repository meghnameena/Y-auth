import nodemailer from "nodemailer";
import config from "../config/config.js";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com", //Gmail ka SMTP server hai.
    port: 587, //email bhejne ke liye SMTP submission port hai.
    secure: false, //connection shuru mein direct TLS se start nahi hota; STARTTLS se secure hota hai.
    auth: {
        type: "OAuth2", //Gmail ke saath authenticate karne ke liye use hota hai.
        user: config.GOOGLE_USER,
        clientId: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        refreshToken: config.GOOGLE_REFRESH_TOKEN,
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
});

transporter.verify((error, success) => {
    if (error) {
        console.error(" Gmail connection error:", error);
    } else {
        console.log("Gmail server is ready");
    }
});

export const sendEmail = async (to, subject, text, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Y-Auth" <${config.GOOGLE_USER}>`,
            to,
            subject,
            text,
            html,
        });

        console.log(" Email sent:", info.messageId);

        return info;
    } catch (error) {
        console.error(" Error sending email:", error);
        throw error;
    }
};