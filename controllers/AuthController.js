const Account = require('../model/Accounts');
const crypto = require('crypto');
const { sendVerificationEmail, sendResetPasswordEmail, sendPasswordChangedEmail } = require('../config/email');

class AccountsController {

    // [POST] /auth/signup
    async register(req, res) {
        try {
            const { email, password, confirmPassword, first_name, last_name } = req.body;

            if (!email || !password || !confirmPassword || !first_name || !last_name) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin'
                });
            }

            if (password !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Mật khẩu không khớp'
                });
            }

            const existingAccount = await Account.findByEmail(email);
            if (existingAccount) {
                return res.status(400).json({
                    success: false,
                    message: 'Email đã được sử dụng'
                });
            }

            const newAccount = new Account({
                email,
                password,
                first_name,
                last_name,
                role: 'CUSTOMER'
            });

            // Tạo verification token
            const verificationToken = newAccount.createVerificationToken();

            await newAccount.save();

            // Gửi email xác thực
            try {
                await sendVerificationEmail(email, verificationToken, newAccount.full_name);
            } catch (emailError) {
                console.error('Lỗi gửi email:', emailError);
            }

            res.status(201).json({
                success: true,
                message: 'Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.',
                data: {
                    id: newAccount._id,
                    email: newAccount.email,
                    full_name: newAccount.full_name
                }
            });

        } catch (error) {
            console.error('Lỗi đăng ký:', error);

            if (error.name === 'ValidationError') {
                const messages = Object.values(error.errors).map(err => err.message);
                return res.status(400).json({
                    success: false,
                    message: messages.join(', ')
                });
            }

            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi, vui lòng thử lại'
            });
        }
    }

    // [GET] /auth/verify-email?token=xxx
    async verifyEmail(req, res) {
        try {
            const { token } = req.query;

            if (!token) {
                return res.status(400).render('auth/VerifyResult', {
                    success: false,
                    message: 'Token không hợp lệ'
                });
            }

            // Hash token để so sánh
            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

            // Tìm account với token
            const account = await Account.findOne({
                verification_token: hashedToken,
                verification_token_expires: { $gt: Date.now() }
            });

            if (!account) {
                return res.status(400).render('auth/VerifyResult', {
                    success: false,
                    message: 'Token không hợp lệ hoặc đã hết hạn'
                });
            }
            // Xác thực tài khoản
            account.is_verified = true;
            account.verification_token = undefined;
            account.verification_token_expires = undefined;
            await account.save();

            res.render('auth/VerifyResult', {
                success: true,
                message: 'Xác thực email thành công! Bạn có thể đăng nhập ngay.'
            });

        } catch (error) {
            console.error('Lỗi xác thực email:', error);
            res.status(500).render('auth/VerifyResult', {
                success: false,
                message: 'Đã xảy ra lỗi, vui lòng thử lại'
            });
        }
    }

    // [POST] /auth/resend-verification - gửi email xác thực
    async resendVerification(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập email'
                });
            }

            const account = await Account.findByEmail(email);

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy tài khoản'
                });
            }

            if (account.is_verified) {
                return res.status(400).json({
                    success: false,
                    message: 'Tài khoản đã được xác thực'
                });
            }

            // Tạo token mới
            const verificationToken = account.createVerificationToken();
            await account.save();

            await sendVerificationEmail(email, verificationToken, account.full_name);

            res.json({
                success: true,
                message: 'Email xác thực đã được gửi lại'
            });

        } catch (error) {
            console.error('Lỗi gửi lại email:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi, vui lòng thử lại'
            });
        }
    }

    // [POST] /auth/signin
    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập email và mật khẩu'
                });
            }

            const account = await Account.findOne({ email: email.toLowerCase() }).select('+password');

            if (!account || !(await account.comparePassword(password))) {
                return res.status(401).json({
                    success: false,
                    message: 'Email hoặc mật khẩu không đúng'
                });
            }

            if (!account.is_verified) {
                return res.status(403).json({
                    success: false,
                    message: 'Tài khoản của bạn chưa được xác thực. Vui lòng kiểm tra email để xác thực tài khoản.'
                });
            }

            account.last_login = new Date();
            await account.save();

            req.session.userId = account._id;
            req.session.email = account.email;
            req.session.role = account.role;
            const fullName = `${account.first_name} ${account.last_name}`;
            req.session.fullName = fullName;
            req.session.avatar = account.avatar;

            // Đăng nhập thành công
            res.status(200).json({
                success: true,
                message: 'Đăng nhập thành công!',
                data: account.toJSON()
            });

        } catch (error) {
            console.error('Lỗi đăng nhập:', error);
            res.status(500).json({
                success: false,
                message: 'Đã xảy ra lỗi, vui lòng thử lại'
            });
        }
    }

    // [GET] /auth/forgot-password
    forgotPassword(req, res) {
        res.render('auth/ForgotPassword');
    }

    // [POST] /auth/forgot-password
    async handleForgotPassword(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ success: false, message: 'Vui lòng nhập địa chỉ email.' });
            }

            const account = await Account.findByEmail(email);
            if (!account) {
                // Bảo mật: Không tiết lộ email có tồn tại hay không
                return res.status(200).json({ success: true, message: 'Nếu email của bạn tồn tại trong hệ thống, một liên kết đặt lại mật khẩu đã được gửi.' });
            }

            const resetToken = account.createPasswordResetToken();
            await account.save();

            await sendResetPasswordEmail(account.email, resetToken, account.full_name);

            res.status(200).json({ success: true, message: 'Nếu email của bạn tồn tại trong hệ thống, một liên kết đặt lại mật khẩu đã được gửi.' });

        } catch (error) {
            console.error('Lỗi khi xử lý quên mật khẩu:', error);
            res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi gửi yêu cầu. Vui lòng thử lại sau.' });
        }
    }

    // [GET] /auth/reset-password
    async resetPassword(req, res) {
        try {
            const { token } = req.query;

            if (!token) {
                return res.render('auth/ResetPassword', { error: 'Token đặt lại mật khẩu không hợp lệ.' });
            }

            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

            const account = await Account.findOne({
                password_reset_token: hashedToken,
                password_reset_expires: { $gt: Date.now() }
            }).select('+password_reset_token +password_reset_expires');


            if (!account) {
                return res.render('auth/ResetPassword', { error: 'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
            }

            res.render('auth/ResetPassword', { token, error: null });

        } catch (error) {
            console.error('Lỗi khi hiển thị trang đặt lại mật khẩu:', error);
            res.status(500).render('auth/ResetPassword', { error: 'Đã xảy ra lỗi. Vui lòng thử lại sau.' });
        }
    }

    // [PUT] /auth/reset-password
    async handleResetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                return res.status(400).json({ success: false, message: 'Thiếu token hoặc mật khẩu mới.' });
            }

            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

            const account = await Account.findOne({
                password_reset_token: hashedToken,
                password_reset_expires: { $gt: Date.now() }
            }).select('+password_reset_token +password_reset_expires +password');

            if (!account) {
                return res.status(400).json({ success: false, message: 'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.' });
            }

            account.password = newPassword;
            account.password_reset_token = undefined;
            account.password_reset_expires = undefined;
            await account.save();

            await sendPasswordChangedEmail(account.email, account.full_name);

            res.status(200).json({ success: true, message: 'Mật khẩu của bạn đã được đặt lại thành công. Bạn sẽ được chuyển hướng đến trang đăng nhập.' });

        } catch (error) {
            console.error('Lỗi khi đặt lại mật khẩu:', error);
            res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi đặt lại mật khẩu. Vui lòng thử lại sau.' });
        }
    }

    async logout(req, res) {
        req.session.destroy(err => {
            if (err) {
                console.error('Lỗi khi hủy session:', err);
                return res.status(500).json({ success: false, message: 'Không thể đăng xuất.' });
            }

            res.clearCookie('connect.sid');

            res.status(200).json({ success: true, message: 'Đăng xuất thành công.', redirect: '/auth/signin' });

        });
    }
}

module.exports = new AccountsController();