const express = require('express');
const router = express.Router();
const CategoriesController = require('../controllers/CategoriesController');
const ProductsController = require('../controllers/ProductsController');

router.get('/', (req, res) => {
    res.render('user/HomePage');
});

// categories
router.get('/categories/nested', CategoriesController.getNestedCategories);
router.get('/categories/all-children', CategoriesController.getAllChildrenCategories);


// products
router.get('/products/latest', ProductsController.getLatestProducts);
router.get('/product-detail', (req, res) => {
    res.render('user/ProductDetails');
});
router.get('/products/:id', ProductsController.getProductDetail);

// Example controller
router.get('/cart', (req, res) => {
    const cartItems = [
        {
            product: {
                id: 1,
                name: 'Product Name',
                price: 29.99,
                category: 'Category Name'
            },
            quantity: 2
        }
    ];

    // Tính tổng
    const cartTotal = cartItems.reduce((sum, item) =>
        sum + (item.product.price * item.quantity), 0
    );

    res.render('user/CartPage', {
        cartItems: cartItems,
        cartTotal: cartTotal
    });
});


module.exports = router;