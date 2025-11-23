const express = require('express');
const router = express.Router();
const CategoriesController = require('../controllers/CategoriesController');
const ProductsController = require('../controllers/ProductsController');
const OrderController = require('../controllers/OrderController');
const categoryUpload = require('../config/multerCategories');
const productUpload = require('../config/multerProducts');
const authMiddleware = require('../middleware/auth');

// phan quyen
router.use(authMiddleware.isAdmin);

// -----------------------------------dashboard
router.get('/', (req, res) => {
  res.render('admin/dashboard/index');
});

// -----------------------------------danh mục
router.get('/categories', CategoriesController.index);

router.get('/categories/add', CategoriesController.showAdd);

router.post('/categories/create', categoryUpload.single('banner_url'), CategoriesController.create);

router.get('/categories/edit/:id', CategoriesController.showEdit);

router.post('/categories/update/:id', categoryUpload.single('banner_url'), CategoriesController.update);

router.get('/categories/view/:id', CategoriesController.showView);

// xoa mem
router.post('/categories/delete/:id', CategoriesController.delete);

// khoi phuc
router.post('/categories/restore/:id', CategoriesController.restore);

// xoa cung
router.delete('/categories/force-delete/:id', CategoriesController.forceDelete);

// --------------------------------------------------------------------

// -----------------------------------san pham
router.get('/products', ProductsController.index);
router.get('/products/add', ProductsController.showAdd);
router.post('/products/create', productUpload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'images', maxCount: 10 },
  ...Array.from({ length: 20 }, (_, i) => ({
    name: `variants[${i}][images]`,
    maxCount: 10
  }))
]), ProductsController.create);

router.get('/products/view/:id', ProductsController.showView);
router.get('/products/edit/:id', ProductsController.showEdit);
router.post('/products/update/:id', productUpload.fields([
  { name: 'thumbnail', maxCount: 1 },
  { name: 'images', maxCount: 10 },
  ...Array.from({ length: 20 }, (_, i) => ({
    name: `variants[${i}][images]`,
    maxCount: 10
  }))
]), ProductsController.update);
router.post('/products/delete/:id', ProductsController.delete);
router.post('/products/restore/:id', ProductsController.restore);
router.delete('/products/force-delete/:id', ProductsController.forceDelete);

// -------------------------------------------------------------------
// -----------------------------------don hang
router.get('/orders', OrderController.index);
router.get('/orders/detail/:id', OrderController.getDetailPopup);
router.post('/orders/update-status', OrderController.updateStatus);
// -------------------------------------------------------------------
module.exports = router;