const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('user/HomePage');
});

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