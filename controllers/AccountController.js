const Account = require('../model/Accounts');
const bcrypt = require('bcryptjs');

class AccountController {
    // GET /accounts/customers
    async getCustomers(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Filter
            const search = req.query.search || '';
            const status = req.query.status;

            let query = { role: 'CUSTOMER' };

            if (search) {
                query.$or = [
                    { email: { $regex: search, $options: 'i' } },
                    { first_name: { $regex: search, $options: 'i' } },
                    { last_name: { $regex: search, $options: 'i' } }
                ];
            }

            if (status === 'active') {
                query.is_active = true;
            } else if (status === 'inactive') {
                query.is_active = false;
            }

            const total = await Account.countDocuments(query);
            const customers = await Account.find(query)
                .select('-password')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            return res.json({
                success: true,
                data: customers,
                pagination: {
                    current_page: page,
                    total_pages: Math.ceil(total / limit),
                    total_items: total,
                    per_page: limit
                }
            });

        } catch (error) {
            console.error('Error getting customers:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi tải danh sách khách hàng',
                error: error.message
            });
        }
    }

    // GET /accounts/:id
    async getAccountById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.session.userId;
            const userRole = req.session.role;

            if (userRole !== 'ADMIN' && userId !== id) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xem thông tin này'
                });
            }

            const account = await Account.findById(id).select('-password');

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy tài khoản'
                });
            }

            return res.json({
                success: true,
                data: account
            });

        } catch (error) {
            console.error('Error getting account:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra',
                error: error.message
            });
        }
    }

    // GET /accounts/me
    async getMyAccount(req, res) {
        try {
            const userId = req.session.userId;

            const account = await Account.findById(userId).select('-password');

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy tài khoản'
                });
            }

            return res.json({
                success: true,
                data: account
            });

        } catch (error) {
            console.error('Error getting my account:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra',
                error: error.message
            });
        }
    }

    // PUT /accounts/update-profile
    async updateProfile(req, res) {
        try {
            const userId = req.session.userId;
            const {
                first_name,
                last_name,
                phone,
                address,
                date_of_birth,
                gender
            } = req.body;

            const account = await Account.findById(userId);

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy tài khoản'
                });
            }

            if (first_name) account.first_name = first_name.trim();
            if (last_name) account.last_name = last_name.trim();
            if (phone !== undefined) account.phone = phone.trim();
            if (address !== undefined) account.address = address.trim();
            if (date_of_birth) account.date_of_birth = date_of_birth;
            if (gender && ['male', 'female', 'other'].includes(gender)) {
                account.gender = gender;
            }

            if (req.file) {
                account.avatar = `/uploads/avatars/${req.file.filename}`;
            }

            await account.save();

            return res.json({
                success: true,
                message: 'Cập nhật thông tin thành công',
                data: account.toJSON()
            });

        } catch (error) {
            console.error('Error updating profile:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi cập nhật thông tin',
                error: error.message
            });
        }
    }

    // PUT /accounts/change-password
    async changePassword(req, res) {
        try {
            const userId = req.session.userId;
            const { current_password, new_password, confirm_password } = req.body;

            // Validate
            if (!current_password || !new_password || !confirm_password) {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin'
                });
            }

            if (new_password !== confirm_password) {
                return res.status(400).json({
                    success: false,
                    message: 'Mật khẩu mới không khớp'
                });
            }

            if (new_password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
                });
            }

            const account = await Account.findById(userId).select('+password');

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy tài khoản'
                });
            }

            const isMatch = await account.comparePassword(current_password);

            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    message: 'Mật khẩu hiện tại không đúng'
                });
            }

            account.password = new_password;
            await account.save();

            return res.json({
                success: true,
                message: 'Đổi mật khẩu thành công'
            });

        } catch (error) {
            console.error('Error changing password:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi đổi mật khẩu',
                error: error.message
            });
        }
    }

    // PUT /accounts/:id/toggle-status
    async toggleAccountStatus(req, res) {
        try {
            const { id } = req.params;

            const account = await Account.findById(id);

            if (!account) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy tài khoản'
                });
            }

            if (account.role === 'ADMIN') {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể thay đổi trạng thái tài khoản Admin'
                });
            }

            account.is_active = !account.is_active;
            await account.save();

            return res.json({
                success: true,
                message: `Đã ${account.is_active ? 'kích hoạt' : 'vô hiệu hóa'} tài khoản`,
                data: {
                    _id: account._id,
                    is_active: account.is_active
                }
            });

        } catch (error) {
            console.error('Error toggling account status:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra',
                error: error.message
            });
        }
    }
}

module.exports = new AccountController();