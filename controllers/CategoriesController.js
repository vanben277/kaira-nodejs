const Category = require('../model/Categories');
const Product = require('../model/Products');
const fs = require('fs');
const path = require('path');

// Helper function để tạo slug từ tiếng Việt
const createSlug = (text) => {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
};

class CategoriesController {

    // [GET] /admin/categories
    async index(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const totalCategories = await Category.countDocuments();
            const totalPages = Math.ceil(totalCategories / limit);

            const categories = await Category.find()
                .populate('parent_id', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            res.render('admin/categories/index', {
                categories,
                moment: require('moment'),
                pagination: {
                    page: page,
                    limit: limit,
                    totalPages: totalPages,
                    totalCategories: totalCategories
                }
            });
        } catch (error) {
            console.error('Lỗi lấy danh sách danh mục:', error);
            res.status(500).render('errors/500', { error: error.message });
        }
    }

    // [GET] /admin/categories/view/id 
    async showView(req, res) {
        try {
            const { id } = req.params;

            const category = await Category.findById(id).populate('parent_id', 'name'); // Lấy danh mục cha 

            if (!category) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục' });
            }

            // Để hiển thị mô tả đầy đủ hơn nếu cần
            const descriptionHtml = category.description ? category.description.replace(/\n/g, '<br>') : '';

            res.json({
                success: true,
                category: {
                    _id: category._id,
                    name: category.name,
                    slug: category.slug,
                    banner_url: category.banner_url,
                    description: descriptionHtml,
                    parent_id: category.parent_id ? category.parent_id.name : 'Danh mục gốc',
                    is_active: category.is_active,
                    createdAt: category.createdAt,
                    updatedAt: category.updatedAt
                }
            });

        } catch (error) {
            console.error('Lỗi lấy chi tiết danh mục:', error);
            res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message }); // Trả về JSON cho AJAX
        }
    }



    // [GET] /admin/categories/add 
    async showAdd(req, res) {
        try {
            // Lấy danh sách danh mục cha 
            const categories = await Category.find({ parent_id: null, is_active: true })
                .select('name _id')
                .sort({ name: 1 });

            res.render('admin/categories/add', { categories });
        } catch (error) {
            console.error('Lỗi hiển thị form:', error);
            res.status(500).render('errors/500', { error: error.message });
        }
    }

    // [POST] /admin/categories/create 
    async create(req, res) {
        try {
            const { name, slug, parent_id, description, is_active } = req.body;

            // Tạo slug tự động nếu không có
            const finalSlug = slug && slug.trim() !== '' ? createSlug(slug) : createSlug(name);

            // Kiểm tra slug đã tồn tại chưa
            const existingSlug = await Category.findOne({ slug: finalSlug });
            if (existingSlug) {
                return res.status(400).render('errors/400', {
                    message: 'Slug đã tồn tại, vui lòng chọn slug khác'
                });
            }

            let banner_url = null;
            if (req.file) {
                banner_url = `/uploads/categories/${req.file.filename}`;
            }

            const categoryData = {
                name: name.trim(),
                slug: finalSlug,
                banner_url,
                description: description ? description.trim() : null,
                parent_id: parent_id && parent_id !== '' ? parent_id : null,
                is_active: is_active === 'on' || is_active === true
            };

            const newCategory = await Category.create(categoryData);

            console.log('Tạo danh mục thành công:', newCategory);
            res.redirect('/admin/categories');

        } catch (error) {
            console.error('Lỗi tạo danh mục:', error);

            // Xóa file đã upload nếu có lỗi
            if (req.file) {
                const filePath = path.join(__dirname, '../public/uploads/categories', req.file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            if (error.code === 11000) {
                return res.status(400).render('errors/400', {
                    message: 'Tên danh mục hoặc slug đã tồn tại'
                });
            }

            res.status(500).render('errors/500', { message: error.message });
        }
    }

    // [GET] /admin/categories/edit/:id 
    async showEdit(req, res) {
        try {
            const { id } = req.params;

            const category = await Category.findById(id);
            if (!category) {
                return res.status(404).render('errors/404', {
                    message: 'Không tìm thấy danh mục'
                });
            }

            // Lấy danh sách danh mục cha
            const categories = await Category.find({
                parent_id: null,
                is_active: true,
                _id: { $ne: id }
            }).select('name _id').sort({ name: 1 });

            res.render('admin/categories/update', {
                category,
                categories
            });
        } catch (error) {
            console.error('Lỗi hiển thị form sửa:', error);
            res.status(500).render('errors/500', { message: error.message });
        }
    }

    // [POST] /admin/categories/update/:id
    async update(req, res) {
        try {
            const { id } = req.params;
            const { name, slug, parent_id, description, is_active, remove_image } = req.body;

            const category = await Category.findById(id);
            if (!category) {
                return res.status(404).render('errors/404', {
                    message: 'Không tìm thấy danh mục'
                });
            }

            // Tạo slug cuối cùng
            const finalSlug = slug && slug.trim() !== '' ? createSlug(slug) : createSlug(name);

            // Kiểm tra slug trùng
            const existingSlug = await Category.findOne({
                slug: finalSlug,
                _id: { $ne: id }
            });
            if (existingSlug) {
                return res.status(400).render('errors/400', {
                    message: 'Slug đã tồn tại, vui lòng chọn slug khác'
                });
            }

            let banner_url = category.banner_url;

            if (remove_image === '1' && category.banner_url) {
                const oldImagePath = path.join(
                    __dirname,
                    '../public',
                    category.banner_url.replace(/^\//, '')
                );
                console.log('🧩 Xóa ảnh cũ:', oldImagePath);

                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                    console.log('Đã xóa ảnh:', oldImagePath);
                } else {
                    console.warn('File không tồn tại:', oldImagePath);
                }

                banner_url = null;
            }

            if (req.file) {
                if (category.banner_url) {
                    const oldImagePath = path.join(
                        __dirname,
                        '../public',
                        category.banner_url.replace(/^\//, '')
                    );
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                        console.log('Đã xóa ảnh cũ khi upload ảnh mới:', oldImagePath);
                    }
                }

                banner_url = `/uploads/categories/${req.file.filename}`;
            }

            category.name = name.trim();
            category.slug = finalSlug;
            category.banner_url = banner_url;
            category.description = description ? description.trim() : null;
            category.parent_id = parent_id && parent_id !== '' ? parent_id : null;
            category.is_active = is_active === 'on' || is_active === true;

            await category.save();

            console.log('Cập nhật danh mục thành công:', category);
            res.redirect('/admin/categories');

        } catch (error) {
            console.error('Lỗi cập nhật danh mục:', error);

            if (req.file) {
                const filePath = path.join(__dirname, '../public/uploads/categories', req.file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }

            res.status(500).render('errors/500', { message: error.message });
        }
    }


    // [POST] /admin/categories/delete/:id 
    async delete(req, res) {
        try {
            const { id } = req.params;

            const category = await Category.findById(id);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy danh mục'
                });
            }

            // Kiểm tra có danh mục con không
            const hasChildren = await Category.findOne({ parent_id: id });
            if (hasChildren) {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể xóa danh mục có danh mục con'
                });
            }

            // set trạng thái
            category.is_active = false;
            await category.save();

            console.log('Xóa tạm danh mục:', category);
            res.json({
                success: true,
                message: 'Xóa danh mục thành công'
            });

        } catch (error) {
            console.error('Lỗi xóa danh mục:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // [POST] /admin/categories/restore/:id
    async restore(req, res) {
        try {
            const { id } = req.params;

            const category = await Category.findById(id);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy danh mục'
                });
            }

            category.is_active = true;
            await category.save();

            console.log('Khôi phục danh mục:', category);
            res.json({
                success: true,
                message: 'Khôi phục danh mục thành công'
            });

        } catch (error) {
            console.error('Lỗi khôi phục danh mục:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // [DELETE] /admin/categories/force-delete/:id
    async forceDelete(req, res) {
        try {
            const { id } = req.params;

            const category = await Category.findById(id);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy danh mục'
                });
            }

            if (category.banner_url) {
                const imagePath = path.join(__dirname, '../public', category.banner_url);
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            await Category.findByIdAndDelete(id);

            console.log('Xóa vĩnh viễn danh mục:', id);
            res.json({
                success: true,
                message: 'Xóa vĩnh viễn danh mục thành công'
            });

        } catch (error) {
            console.error('Lỗi xóa vĩnh viễn:', error);
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // [GET] /categories/nested  
    async getNestedCategories(req, res) {
        try {
            // Hàm đệ quy để xây dựng cây danh mục
            const buildCategoryTree = async (parentId = null) => {
                const categories = await Category.find({ parent_id: parentId, is_active: true }).sort({ name: 1 });
                const categoryTree = [];

                for (const category of categories) {
                    const children = await buildCategoryTree(category._id);
                    categoryTree.push({
                        _id: category._id,
                        name: category.name,
                        slug: category.slug,
                        children: children.length > 0 ? children : undefined,
                    });
                }
                return categoryTree;
            };

            const nestedCategories = await buildCategoryTree();
            res.json({ success: true, categories: nestedCategories });
        } catch (error) {
            console.error('Lỗi lấy danh mục phân cấp:', error);
            res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
        }
    }

    // [GET] /api/categories/all-children
    async getAllChildrenCategories(req, res) {
        try {
            const childrenCategories = await Category.find({ parent_id: { $ne: null }, is_active: true })
                .populate('parent_id', 'name slug')
                .select('name slug banner_url description parent_id')
                .sort({ name: 1 });

            res.json({ success: true, categories: childrenCategories });
        } catch (error) {
            console.error('Lỗi lấy tất cả danh mục con:', error);
            res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message });
        }
    }

    // [GET] /categories
    async getCategories(req, res) {
        try {
            const categories = await Category.find({
                is_active: true,
                parent_id: { $ne: null }
            })
                .select('name slug parent_id');

            const categoriesWithCount = await Promise.all(
                categories.map(async (cat) => {
                    const count = await Product.countDocuments({
                        category_id: cat._id,
                        is_active: true
                    });
                    return {
                        ...cat.toObject(),
                        productCount: count
                    };
                })
            );

            res.json({
                success: true,
                data: categoriesWithCount
            });

        } catch (error) {
            console.error('Error getting categories:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi lấy danh mục',
                error: error.message
            });
        }
    }

}

module.exports = new CategoriesController();