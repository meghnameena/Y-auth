export function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getOtpHtml(otp) {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
            <h2>Email Verification</h2>

            <p>Your OTP for email verification is:</p>

            <h1 style="letter-spacing: 8px;">${otp}</h1>

            <p>This OTP is valid for a limited time.</p>

            <p>If you did not request this OTP, please ignore this email.</p>

            <br>

            <p>Regards,<br>
            Y-Auth Team</p>
        </div>
    `;
}