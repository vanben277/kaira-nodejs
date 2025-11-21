const express = require('express');
const router = express.Router();
const CategoriesController = require('../controllers/CategoriesController');
const ProductsController = require('../controllers/ProductsController');

router.get('/', (req, res) => {
    res.render('user/HomePage');
});

// --- categories ---
router.get('/categories', CategoriesController.getCategories);

router.get('/categories/nested', CategoriesController.getNestedCategories);

router.get('/categories/all-children', CategoriesController.getAllChildrenCategories);


// --- products ---
router.get('/products', ProductsController.getProducts);

router.get('/products/latest', ProductsController.getLatestProducts);

router.get('/products/random', ProductsController.getRandomProducts);

router.get('/products/search', ProductsController.searchProducts);

router.get('/products/filter-options', ProductsController.getFilterOptions);

router.get('/products/:id', ProductsController.getProductDetail);

router.get('/product-detail', (req, res) => {
    res.render('user/ProductDetails');
});

router.get('/cart', (req, res) => {
    const cartItems = [
        {
            product: { id: 1, name: 'Product Name', price: 29.99, category: 'Category Name' },
            quantity: 2
        }
    ];
    const cartTotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    res.render('user/CartPage', {
        cartItems: cartItems,
        cartTotal: cartTotal
    });
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

module.exports = router;