const express = require('express');
const router = express.Router();
const CategoriesController = require('../controllers/CategoriesController');
const upload = require('../config/multerCategories');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware.isAdmin);

// -----------------------------------dashboard
router.get('/', (req, res) => {
  res.render('admin/dashboard/index');
});

// -----------------------------------danh mục
router.get('/categories', CategoriesController.index);

router.get('/categories/add', CategoriesController.showAdd);

router.post('/categories/create', upload.single('banner_url'), CategoriesController.create);

router.get('/categories/edit/:id', CategoriesController.showEdit);

router.post('/categories/update/:id', upload.single('banner_url'), CategoriesController.update);

router.get('/categories/view/:id', CategoriesController.showView);

// xoa mem
router.post('/categories/delete/:id', CategoriesController.delete);

// khoi phuc
router.post('/categories/restore/:id', CategoriesController.restore);

// xoa cung
router.delete('/categories/force-delete/:id', CategoriesController.forceDelete);

// --------------------------------------------------------------------

module.exports = router;