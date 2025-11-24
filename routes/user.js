const express = require('express');
const router = express.Router();
const CategoriesController = require('../controllers/CategoriesController');
const ProductsController = require('../controllers/ProductsController');
const CheckoutController = require('../controllers/OrderController');
const AccountController = require('../controllers/AccountController');
const OrderController = require('../controllers/OrderController');
const accountUpload = require('../config/multerAccounts');
const { isAuthenticated, isAdminOrCustomer } = require('../middleware/auth');

router.get('/', (req, res) => {
    res.render('user/HomePage');
});

// categories
router.get('/categories', CategoriesController.getCategories);
router.get('/categories/nested', CategoriesController.getNestedCategories);
router.get('/categories/all-children', CategoriesController.getAllChildrenCategories);

// products
router.get('/products', ProductsController.getProducts);
router.get('/products/latest', ProductsController.getLatestProducts);
router.get('/products/random', ProductsController.getRandomProducts);
router.get('/products/search', ProductsController.searchProducts);
router.get('/products/filter-options', ProductsController.getFilterOptions);
router.post('/products/by-ids', ProductsController.getProductsByIds);
router.get('/products/:id', ProductsController.getProductDetail);
router.get('/product-detail', (req, res) => {
    res.render('user/ProductDetails');
});

// cart
router.get('/cart', (req, res) => {
    res.render('user/CartPage');
});

// Checkout
router.get('/checkout', isAuthenticated, CheckoutController.showCheckoutPage);
router.post('/checkout/create-order', isAuthenticated, CheckoutController.createOrder);
router.get('/order-success/:orderId', isAuthenticated, CheckoutController.orderSuccess);
router.get('/order/:id/status', isAuthenticated, CheckoutController.getOrderStatus);
router.get('/order-tracking/:orderNumber', isAuthenticated, CheckoutController.trackOrder);

router.get('/category/:slug', (req, res) => {
    res.render('user/Containers', {
        currentCategorySlug: req.params.slug
    });
});

router.get('/containers', (req, res) => {
    res.render('user/Containers', {
        currentCategorySlug: null
    });
});

router.get('/wishlist', (req, res) => {
    res.render('user/WishList');
});

router.get('/orders/by-user/:id', isAdminOrCustomer, OrderController.getOrdersByUser);
router.get('/orders/detail/:id', OrderController.getDetailPopup);

router.get('/accounts/profile', isAuthenticated, (req, res) => {
    res.render('user/MyInfo');
});

router.get('/accounts/me', isAuthenticated, AccountController.getMyAccount);

router.put('/accounts/update-profile', isAuthenticated, accountUpload.single('avatar'), AccountController.updateProfile);

router.put('/accounts/change-password', isAuthenticated, AccountController.changePassword);

router.get('/accounts/:id', isAdminOrCustomer, AccountController.getAccountById);

module.exports = router;