const express = require('express');
const router = express.Router();
const CategoriesController = require('../controllers/CategoriesController');
const ProductsController = require('../controllers/ProductsController');
const OrderController = require('../controllers/OrderController');
const AccountController = require('../controllers/AccountController');
const categoryUpload = require('../config/multerCategories');
const productUpload = require('../config/multerProducts');
const accountUpload = require('../config/multerAccounts');
const { isAuthenticated, isAdmin, isAdminOrCustomer } = require('../middleware/auth');

// phan quyen
router.use(isAdmin);

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



// -----------------------------------tai khoan
router.get('/accounts', (req, res) => {
  res.render('admin/accounts/index');
});

router.get('/accounts/profile', isAuthenticated, (req, res) => {
  res.render('admin/profile/MyInfoAndChangePassword');
});

router.get('/accounts/customers', isAdmin, AccountController.getCustomers);

router.get('/accounts/me', isAuthenticated, AccountController.getMyAccount);

router.put('/accounts/update-profile', isAuthenticated, accountUpload.single('avatar'), AccountController.updateProfile);

router.put('/accounts/change-password', isAuthenticated, AccountController.changePassword);

router.get('/accounts/:id', isAdminOrCustomer, AccountController.getAccountById);

router.put('/accounts/:id/toggle-status', isAdmin, AccountController.toggleAccountStatus);

// -------------------------------------------------------------------
module.exports = router;