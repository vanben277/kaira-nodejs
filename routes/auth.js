const express = require('express');
const router = express.Router();
const AccountsController = require('../controllers/AuthController');

router.get('/signin', (req, res) => {
    res.render('auth/SignIn');
});

router.post('/signin', AccountsController.login);

router.get('/signup', (req, res) => {
    res.render('auth/SignUp');
});

router.post('/signup', AccountsController.register);

router.get('/verify-email', AccountsController.verifyEmail);

router.post('/resend-verification', AccountsController.resendVerification);

router.get('/signup-success', (req, res) => {
    res.render('auth/SignupSuccess');
});

router.get('/forgot-password', AccountsController.forgotPassword);

router.post('/forgot-password', AccountsController.handleForgotPassword);

router.get('/reset-password', AccountsController.resetPassword);

router.put('/reset-password', AccountsController.handleResetPassword);

router.post('/logout', AccountsController.logout);

module.exports = router;