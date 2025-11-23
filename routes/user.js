const express = require('express');
const router = express.Router();
const CategoriesController = require('../controllers/CategoriesController');
const ProductsController = require('../controllers/ProductsController');

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