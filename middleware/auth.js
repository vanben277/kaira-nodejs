exports.isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/auth/signin');
};

exports.isAdmin = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.redirect('/auth/signin');
    }


    if (req.session.role !== 'ADMIN') {
        return res.status(403).render('errors/403', {
            message: 'Bạn không có quyền truy cập trang này. Chỉ quản trị viên được phép.'
        });
    }
    next();
};

exports.isAdminOrCustomer = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.redirect('/auth/signin');
    }

    if (req.session.role !== 'ADMIN' && req.session.role !== 'CUSTOMER') {

        return res.status(403).render('errors/403', {
            message: 'Bạn không có quyền truy cập.'
        });
    }
    next();
};