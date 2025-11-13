const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const accountSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: [true, 'Email là bắt buộc'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ']
        },
        password: {
            type: String,
            required: [true, 'Mật khẩu là bắt buộc'],
            minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
            select: false
        },
        first_name: {
            type: String,
            required: [true, 'Tên là bắt buộc'],
            trim: true
        },
        last_name: {
            type: String,
            required: [true, 'Họ là bắt buộc'],
            trim: true
        },
        date_of_birth: {
            type: Date,
            required: false
        },
        gender: {
            type: String,
            enum: ['male', 'female', 'other'],
            required: false
        },
        avatar: {
            type: String,
            required: false
        },
        role: {
            type: String,
            enum: ['ADMIN', 'CUSTOMER'],
            default: 'CUSTOMER'
        },
        is_active: {
            type: Boolean,
            default: true
        },
        is_verified: {
            type: Boolean,
            default: false
        },
        verification_token: {
            type: String,
            select: false
        },
        verification_token_expires: {
            type: Date,
            select: false
        },
        password_reset_token: {
            type: String,
            select: false
        },
        password_reset_expires: {
            type: Date,
            select: false
        },
        last_login: {
            type: Date
        },
        phone: {
            type: String,
            trim: true
        },
        address: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true,
        collection: 'accounts'
    }
);

accountSchema.index({ role: 1 });
accountSchema.index({ is_active: 1 });
accountSchema.index({ verification_token: 1 });
accountSchema.index({ password_reset_token: 1 });


accountSchema.virtual('full_name').get(function () {
    return `${this.first_name} ${this.last_name}`;
});

accountSchema.pre('save', async function (next) {
    // Chỉ hash mật khẩu nếu nó đã được sửa đổi hoặc là mới
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

accountSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        if (!this.password) return false;
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error(error);
    }
};

// Tạo verification token
accountSchema.methods.createVerificationToken = function () {
    const token = crypto.randomBytes(32).toString('hex');
    this.verification_token = crypto.createHash('sha256').update(token).digest('hex');
    this.verification_token_expires = Date.now() + 24 * 60 * 60 * 1000;
    return token;
};

accountSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');
    this.password_reset_token = crypto.createHash('sha256').update(resetToken).digest('hex');
    this.password_reset_expires = Date.now() + 3600000;
    return resetToken;
};


accountSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.__v;
    delete obj.verification_token;
    delete obj.verification_token_expires;
    delete obj.password_reset_token;
    delete obj.password_reset_expires;
    return obj;
};

accountSchema.statics.findByEmail = function (email) {
    return this.findOne({ email: email.toLowerCase() });
};

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;