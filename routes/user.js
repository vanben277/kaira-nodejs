const express = require('express');
const router = express.Router();
const CategoriesController = require('../controllers/CategoriesController');
const ProductsController = require('../controllers/ProductsController');
const CheckoutController = require('../controllers/CheckoutController');
const authMiddleware = require('../middleware/auth');

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
router.get('/checkout', authMiddleware.isAuthenticated, CheckoutController.showCheckoutPage);
router.post('/checkout/create-order', authMiddleware.isAuthenticated, CheckoutController.createOrder);
router.get('/order-success/:orderId', authMiddleware.isAuthenticated, CheckoutController.orderSuccess);
router.get('/order-tracking/:orderNumber', authMiddleware.isAuthenticated, CheckoutController.trackOrder);

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

module.exports = router;