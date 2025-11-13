const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const generateEmailTemplate = (title, name, contentHtml) => `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }
            .header {
                background: #000;
                color: white;
                padding: 30px;
                text-align: center;
                border-radius: 10px 10px 0 0;
            }
            .content {
                background: #f9f9f9;
                padding: 30px;
                border-radius: 0 0 10px 10px;
            }
            .button {
                display: inline-block;
                padding: 15px 30px;
                background: #000;
                color: #fff;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
            }
            .footer {
                text-align: center;
                margin-top: 20px;
                color: #666;
                font-size: 12px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>${title}</h1>
            </div>
            <div class="content">
                <p>Xin chào <strong>${name}</strong>,</p>
                ${contentHtml}
            </div>
            <div class="footer">
                <p>© 2025 Kaira. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
`;

const sendVerificationEmail = async (toEmail, token, fullName) => {
    const verificationUrl = `${process.env.BASE_URL || 'http://localhost:5001'}/auth/verify-email?token=${token}`;

    const htmlContent = `
        <p>Cảm ơn bạn đã đăng ký tài khoản! Vui lòng nhấp vào nút bên dưới để xác thực email của bạn:</p>
        <center><a href="${verificationUrl}" class="button">Xác thực email</a></center>
        <p>Hoặc copy link này vào trình duyệt:</p>
        <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
        <p><strong>Lưu ý:</strong> Link này sẽ hết hạn sau 24 giờ.</p>
        <p>Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.</p>
        <p>Trân trọng,</p>
    `;

    const mailOptions = {
        from: `"Kaira" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'Xác thực tài khoản của bạn',
        html: generateEmailTemplate('Xác thực tài khoản', fullName, htmlContent)
    };

    await transporter.sendMail(mailOptions);
};

const sendResetPasswordEmail = async (toEmail, token, fullName) => {
    const resetUrl = `${process.env.BASE_URL || 'http://localhost:5001'}/auth/reset-password?token=${token}`;

    const htmlContent = `
        <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
        <center><a href="${resetUrl}" class="button">Đặt lại mật khẩu</a></center>
        <p>Hoặc copy link này vào trình duyệt:</p>
        <p style="word-break: break-all; color: #667eea;">${resetUrl}</p>
        <p>Liên kết này sẽ hết hạn sau 1 giờ.</p>
        <p>Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email này.</p>
        <p>Trân trọng,</p>
    `;

    const mailOptions = {
        from: `"Kaira" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'Yêu cầu đặt lại mật khẩu',
        html: generateEmailTemplate('Đặt lại mật khẩu', fullName, htmlContent)
    };

    await transporter.sendMail(mailOptions);
};

const sendPasswordChangedEmail = async (toEmail, fullName) => {
    const htmlContent = `
        <p>Mật khẩu tài khoản của bạn đã được thay đổi thành công.</p>
        <p>Nếu bạn không thực hiện thay đổi này, vui lòng liên hệ với chúng tôi ngay lập tức.</p>
        <p>Trân trọng,</p>
    `;

    const mailOptions = {
        from: `"Kaira" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: 'Mật khẩu của bạn đã được thay đổi',
        html: generateEmailTemplate('Mật khẩu đã thay đổi', fullName, htmlContent)
    };

    await transporter.sendMail(mailOptions);
};

module.exports = {
    sendVerificationEmail,
    sendResetPasswordEmail,
    sendPasswordChangedEmail
};
