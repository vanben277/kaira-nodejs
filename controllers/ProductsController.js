const Product = require('../model/Products');
const Category = require('../model/Categories');
const fs = require('fs');
const path = require('path');
const { log } = require('console');

// Hàm tạo slug
function createSlug(str) {
    str = str.toLowerCase();
    str = str.replace(/á|à|ả|ã|ạ|ă|ắ|ằ|ẳ|ẵ|ặ|â|ấ|ầ|ẩ|ẫ|ậ/gi, 'a');
    str = str.replace(/é|è|ẻ|ẽ|ẹ|ê|ế|ề|ể|ễ|ệ/gi, 'e');
    str = str.replace(/i|í|ì|ỉ|ĩ|ị/gi, 'i');
    str = str.replace(/ó|ò|ỏ|õ|ọ|ô|ố|ồ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/gi, 'o');
    str = str.replace(/ú|ù|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/gi, 'u');
    str = str.replace(/ý|ỳ|ỷ|ỹ|ỵ/gi, 'y');
    str = str.replace(/đ/gi, 'd');
    str = str.replace(/\s+/g, '-');
    str = str.replace(/[^a-z0-9\-]/g, '');
    str = str.replace(/-+/g, '-');
    str = str.replace(/^-+|-+$/g, '');
    return str;
}

// Hàm xóa file tải lên (dùng chung cho create và update)
function deleteUploadedFiles(files) {
    if (!files) return;

    try {
        if (files.thumbnail && files.thumbnail[0]) {
            const thumbnailPath = path.join(__dirname, '../public/uploads/products', files.thumbnail[0].filename);
            if (fs.existsSync(thumbnailPath)) {
                fs.unlinkSync(thumbnailPath);
            }
        }

        if (files.images) {
            files.images.forEach(file => {
                const filePath = path.join(__dirname, '../public/uploads/products', file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }

        // Xóa ảnh biến thể mới upload
        Object.keys(files).forEach(key => {
            if (key.startsWith('variants') && key.includes('[images]')) {
                files[key].forEach(file => {
                    const filePath = path.join(__dirname, '../public/uploads/products', file.filename);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                });
            }
        });
    } catch (error) {
        console.error('Lỗi khi xóa file tạm thời sau khi upload không thành công:', error);
    }
}

// Hàm xóa file vật lý dựa trên URL
function deletePhysicalFile(filePathRelativeToPublic) {
    try {
        const fullPath = path.join(__dirname, '../public', filePathRelativeToPublic);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            console.log(`Đã xóa file: ${fullPath}`);
        } else {
            console.warn(`Không tìm thấy file để xóa: ${fullPath}`);
        }
    } catch (error) {
        console.error(`Lỗi khi xóa file vật lý ${filePathRelativeToPublic}:`, error);
    }
}

// Hàm xử lý biến thể (dùng cho create và update)
function processVariants(req, existingProductVariants = []) {
    const variants = [];
    const variantsData = req.body.variants;

    if (!variantsData || typeof variantsData !== 'object') {
        return variants;
    }

    // Lấy các ảnh biến thể cũ được giữ lại từ form
    const keptVariantImagesMap = new Map(); // key: variant_index_from_form, value: array of image URLs
    if (req.body.existingVariantImages) {
        // req.body.existingVariantImages có thể là 1 chuỗi nếu chỉ có 1 ảnh, hoặc 1 mảng nếu nhiều
        const existingVariantImagesArray = Array.isArray(req.body.existingVariantImages) ? req.body.existingVariantImages : [req.body.existingVariantImages];
        existingVariantImagesArray.forEach(item => {
            const match = item.match(/variants\[(\d+)\]\[images\]\[(.+)\]/);
            if (match) {
                const variantIndex = parseInt(match[1]);
                const imageUrl = match[2];
                if (!keptVariantImagesMap.has(variantIndex)) {
                    keptVariantImagesMap.set(variantIndex, []);
                }
                keptVariantImagesMap.get(variantIndex).push(imageUrl);
            }
        });
    }

    for (const variantKey in variantsData) { // variantKey sẽ là "0", "1", ...
        const variantData = variantsData[variantKey];
        const variantIndex = parseInt(variantKey); // Chỉ số biến thể từ form

        if (!variantData.color) continue;

        const variant = {
            color: variantData.color.trim(),
            color_code: variantData.color_code || '#000000',
            images: [],
            sizes: []
        };

        // Thêm ảnh cũ đã được giữ lại
        if (keptVariantImagesMap.has(variantIndex)) {
            variant.images.push(...keptVariantImagesMap.get(variantIndex));
        }

        // Thêm ảnh mới nếu có
        const uploadedVariantImagesKey = `variants[${variantIndex}][images]`;
        if (req.files && req.files[uploadedVariantImagesKey]) {
            const uploadedImages = req.files[uploadedVariantImagesKey].map(
                file => `/uploads/products/${file.filename}`
            );
            variant.images.push(...uploadedImages);
        }

        if (variantData.sizes && typeof variantData.sizes === 'object') {
            for (const sizeKey in variantData.sizes) { // sizeKey sẽ là "0", "1", ...
                const sizeData = variantData.sizes[sizeKey];

                if (!sizeData.size || !sizeData.price) continue;

                variant.sizes.push({
                    size: sizeData.size.trim(),
                    price: parseFloat(sizeData.price),
                    stock: parseInt(sizeData.stock) || 0,
                    sku: sizeData.sku ? sizeData.sku.trim() : null
                });
            }
        }

        if (variant.sizes.length > 0) {
            variants.push(variant);
        }
    }
    return variants;
}


class ProductsController {

    // [GET] /admin/products/create
    async showAdd(req, res) {
        try {
            const categories = await Category.find({ is_active: true });
            res.render('admin/products/add', { categories });
        } catch (error) {
            console.error('Lỗi lấy danh mục:', error);
            res.status(500).render('errors/500', { message: error.message });
        }
    }

    // [POST] /admin/products/store
    async create(req, res) {
        try {
            const { name, slug, description, category_id, has_variants, price, stock, sku, is_active } = req.body;

            const finalSlug = slug && slug.trim() !== '' ? createSlug(slug) : createSlug(name);

            const existingSlug = await Product.findOne({ slug: finalSlug });
            if (existingSlug) {
                deleteUploadedFiles(req.files);
                return res.status(400).render('errors/400', {
                    message: 'Slug đã tồn tại, vui lòng chọn slug khác'
                });
            }

            let thumbnail = null;
            if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
                thumbnail = `/uploads/products/${req.files.thumbnail[0].filename}`;
            }

            const productData = {
                name: name.trim(),
                slug: finalSlug,
                description: description ? description.trim() : null,
                category_id,
                thumbnail,
                is_active: is_active === 'on' || is_active === true,
                has_variants: has_variants === 'on' || has_variants === true
            };

            if (productData.has_variants) {
                const variants = processVariants(req);

                if (!variants || variants.length === 0) {
                    deleteUploadedFiles(req.files);
                    return res.status(400).render('errors/400', {
                        message: 'Sản phẩm có biến thể phải có ít nhất 1 biến thể'
                    });
                }

                productData.variants = variants;
                // Đảm bảo các trường của sản phẩm đơn giản không tồn tại
                productData.price = undefined;
                productData.stock = undefined;
                productData.sku = undefined;
                productData.images = [];

            } else {
                if (!price || price <= 0) {
                    deleteUploadedFiles(req.files);
                    return res.status(400).render('errors/400', {
                        message: 'Sản phẩm không có biến thể phải có giá hợp lệ'
                    });
                }

                productData.price = parseFloat(price);
                productData.stock = parseInt(stock) || 0;
                productData.sku = sku ? sku.trim() : null;
                productData.variants = []; // Đảm bảo không có biến thể

                if (req.files && req.files.images) {
                    productData.images = req.files.images.map(file => `/uploads/products/${file.filename}`);
                }
            }

            const newProduct = await Product.create(productData);

            console.log('Tạo sản phẩm thành công:', newProduct);
            res.redirect('/admin/products');

        } catch (error) {
            console.error('Lỗi tạo sản phẩm:', error);

            deleteUploadedFiles(req.files); // Xóa các file đã upload nếu có lỗi

            if (error.code === 11000) {
                return res.status(400).render('errors/400', {
                    message: 'Tên sản phẩm hoặc slug đã tồn tại'
                });
            }

            res.status(500).render('errors/500', { message: error.message });
        }
    }

    // [GET] /admin/products
    async index(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;
            const categoryFilter = req.query.category || '';

            let query = {};
            if (categoryFilter && categoryFilter !== 'all') {
                query.category_id = categoryFilter;
            }

            const totalProducts = await Product.countDocuments(query);
            const totalPages = Math.ceil(totalProducts / limit);

            const products = await Product.find(query)
                .populate('category_id', 'name')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            const childrenCategories = await Category.find({
                parent_id: { $ne: null }
            }).populate('parent_id', 'name').sort({ name: 1 });

            res.render('admin/products/index', {
                products,
                moment: require('moment'),
                childrenCategories,
                currentCategory: categoryFilter,
                pagination: {
                    page: page,
                    limit: limit,
                    totalPages: totalPages,
                    totalProducts: totalProducts
                }
            });
        } catch (error) {
            console.error('Lỗi lấy danh sách sản phẩm:', error);
            res.status(500).render('errors/500', { message: error.message });
        }
    }

    // [GET] /admin/products/:id
    async showView(req, res) {
        try {
            const product = await Product.findById(req.params.id)
                .populate('category_id', 'name')
                .lean();

            if (!product) {
                return res.json({ success: false, message: 'Không tìm thấy sản phẩm' });
            }

            if (product.category_id) {
                product.category_id = product.category_id.name;
            } else {
                product.category_id = 'Chưa phân loại';
            }

            res.json({ success: true, product });
        } catch (error) {
            console.error('Lỗi lấy chi tiết sản phẩm:', error);
            res.status(500).json({ success: false, message: 'Lỗi server khi lấy chi tiết sản phẩm.' });
        }
    }

    // [GET] /admin/products/:id/edit
    async showEdit(req, res) {
        try {
            const product = await Product.findById(req.params.id)
                .populate('category_id');

            if (!product) {
                return res.status(404).render('errors/404', { message: 'Không tìm thấy sản phẩm để chỉnh sửa.' });
            }
            const categories = await Category.find({ is_active: true });
            res.render('admin/products/update', { product, categories });
        } catch (error) {
            console.error('Lỗi lấy sản phẩm để chỉnh sửa:', error);
            res.status(500).render('errors/500', { message: error.message });
        }
    }

    // [PUT] /admin/products/:id
    async update(req, res) {
        try {
            const productId = req.params.id;
            const { name, slug, description, category_id, has_variants, price, stock, sku, is_active } = req.body;
            const { deletedImages = [], deletedVariantImages = [], existingImages = [] } = req.body;

            const existingProduct = await Product.findById(productId);
            if (!existingProduct) {
                deleteUploadedFiles(req.files);
                return res.status(404).render('errors/404', { message: 'Không tìm thấy sản phẩm để cập nhật.' });
            }

            const finalSlug = slug && slug.trim() !== '' ? createSlug(slug) : createSlug(name);

            const slugConflict = await Product.findOne({ slug: finalSlug, _id: { $ne: productId } });
            if (slugConflict) {
                deleteUploadedFiles(req.files);
                return res.status(400).render('errors/400', {
                    message: 'Slug đã tồn tại cho một sản phẩm khác, vui lòng chọn slug khác'
                });
            }

            if (category_id === '' && Product.schema.path('category_id').isRequired) {
                deleteUploadedFiles(req.files);
                return res.status(400).render('errors/400', {
                    message: 'Danh mục sản phẩm là bắt buộc. Vui lòng chọn một danh mục.'
                });
            }

            const updateData = {
                name: name.trim(),
                slug: finalSlug,
                description: description ? description.trim() : null,
                category_id: category_id === '' ? null : category_id,
                is_active: is_active === 'on' || is_active === true,
                has_variants: has_variants === 'on' || has_variants === true
            };

            if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
                if (existingProduct.thumbnail) {
                    deletePhysicalFile(existingProduct.thumbnail);
                }
                updateData.thumbnail = `/uploads/products/${req.files.thumbnail[0].filename}`;
            }

            deletedImages.forEach(imagePath => deletePhysicalFile(imagePath));
            deletedVariantImages.forEach(imagePath => deletePhysicalFile(imagePath));

            if (updateData.has_variants) {
                if (!existingProduct.has_variants && existingProduct.images && existingProduct.images.length > 0) {
                    existingProduct.images.forEach(imagePath => deletePhysicalFile(imagePath));
                }

                const variants = processVariants(req, existingProduct.variants);

                if (!variants || variants.length === 0) {
                    deleteUploadedFiles(req.files);
                    return res.status(400).render('errors/400', {
                        message: 'Sản phẩm có biến thể phải có ít nhất 1 biến thể'
                    });
                }
                updateData.variants = variants;
                updateData.price = undefined;
                updateData.stock = undefined;
                updateData.sku = undefined;
                updateData.images = [];
            } else {
                if (existingProduct.has_variants && existingProduct.variants && existingProduct.variants.length > 0) {
                    existingProduct.variants.forEach(variant => {
                        if (variant.images && variant.images.length > 0) {
                            variant.images.forEach(imagePath => deletePhysicalFile(imagePath));
                        }
                    });
                }

                if (!price || price <= 0) {
                    deleteUploadedFiles(req.files);
                    return res.status(400).render('errors/400', {
                        message: 'Sản phẩm không có biến thể phải có giá hợp lệ'
                    });
                }

                updateData.price = parseFloat(price);
                updateData.stock = parseInt(stock) || 0;
                updateData.sku = sku ? sku.trim() : null;
                updateData.variants = [];

                const newImages = req.files && req.files.images ? req.files.images.map(file => `/uploads/products/${file.filename}`) : [];
                const keptExistingImages = Array.isArray(existingImages) ? existingImages : [existingImages].filter(Boolean); // Đảm bảo là mảng và lọc bỏ giá trị rỗng
                updateData.images = [...keptExistingImages, ...newImages];
            }

            const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, { new: true, runValidators: true });

            console.log('Cập nhật sản phẩm thành công:', updatedProduct);
            res.redirect('/admin/products');

        } catch (error) {
            console.error('Lỗi cập nhật sản phẩm:', error);
            deleteUploadedFiles(req.files);

            if (error.name === 'ValidationError' && error.errors && error.errors.category_id) {
                return res.status(400).render('errors/400', {
                    message: 'Danh mục sản phẩm là bắt buộc. Vui lòng chọn một danh mục.'
                });
            }

            if (error.code === 11000) {
                return res.status(400).render('errors/400', {
                    message: 'Tên sản phẩm hoặc slug đã tồn tại'
                });
            }
            res.status(500).render('errors/500', { message: error.message });
        }
    }

    // [DELETE] /admin/products/:id
    async delete(req, res) {
        try {
            const product = await Product.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true });
            if (!product) {
                return res.json({ success: false, message: 'Không tìm thấy sản phẩm để xóa.' });
            }
            res.json({ success: true, message: 'Xóa sản phẩm thành công.' });
        } catch (error) {
            console.error('Lỗi xóa sản phẩm (mềm):', error);
            res.status(500).json({ success: false, message: 'Lỗi server khi xóa sản phẩm.' });
        }
    }

    // [PATCH] /admin/products/:id/restore
    async restore(req, res) {
        try {
            const product = await Product.findByIdAndUpdate(req.params.id, { is_active: true }, { new: true });
            if (!product) {
                return res.json({ success: false, message: 'Không tìm thấy sản phẩm để khôi phục.' });
            }
            res.json({ success: true, message: 'Đã khôi phục sản phẩm thành công.' });
        } catch (error) {
            console.error('Lỗi khôi phục sản phẩm:', error);
            res.status(500).json({ success: false, message: 'Lỗi server khi khôi phục sản phẩm.' });
        }
    }

    // [DELETE] /admin/products/:id/force
    async forceDelete(req, res) {
        try {
            const product = await Product.findById(req.params.id);

            if (!product) {
                return res.json({ success: false, message: 'Không tìm thấy sản phẩm để xóa vĩnh viễn.' });
            }

            // Xóa tất cả các file liên quan đến sản phẩm này
            if (product.thumbnail) {
                deletePhysicalFile(product.thumbnail);
            }
            if (product.images && product.images.length > 0) {
                product.images.forEach(imagePath => deletePhysicalFile(imagePath));
            }
            if (product.variants && product.variants.length > 0) {
                product.variants.forEach(variant => {
                    if (variant.images && variant.images.length > 0) {
                        variant.images.forEach(imagePath => deletePhysicalFile(imagePath));
                    }
                });
            }

            await Product.deleteOne({ _id: req.params.id });
            res.json({ success: true, message: 'Đã xóa sản phẩm vĩnh viễn và các tệp liên quan.' });
        } catch (error) {
            console.error('Lỗi xóa vĩnh viễn sản phẩm:', error);
            res.status(500).json({ success: false, message: 'Lỗi server khi xóa vĩnh viễn sản phẩm.' });
        }
    }

    // [GET] /products/latest
    async getLatestProducts(req, res) {
        try {
            const products = await Product.find({ is_active: true })
                .sort({ createdAt: -1 })
                .limit(8);

            return res.json({
                success: true,
                products
            });

        } catch (error) {
            console.error("Lỗi khi lấy sản phẩm mới nhất:", error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // [GET] /products/:id
    async getProductDetail(req, res) {
        try {
            const { id } = req.params;
            const product = await Product.findById(id).populate('category_id');

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Sản phẩm không tồn tại'
                });
            }

            return res.status(200).json({
                success: true,
                product
            });

        } catch (error) {
            console.error("Lỗi khi lấy chi tiết sản phẩm:", error);

            if (error.name === 'CastError') {
                return res.status(400).json({
                    success: false,
                    message: 'ID sản phẩm không hợp lệ'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Lỗi server nội bộ'
            });
        }
    }

    // [GET] /products/random
    async getRandomProducts(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 8;

            const randomProducts = await Product.aggregate([
                { $sample: { size: limit } },
                {
                    $lookup: {
                        from: 'categories',
                        localField: 'category_id',
                        foreignField: '_id',
                        as: 'category'
                    }
                },
                { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } }
            ]);

            res.json({
                success: true,
                count: randomProducts.length,
                data: randomProducts
            });
        } catch (error) {
            console.error('Error getting random products:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi lấy sản phẩm ngẫu nhiên',
                error: error.message
            });
        }
    }

    // [GET] /products/search
    async searchProducts(req, res) {
        try {
            const { keyword } = req.query;

            if (!keyword || keyword.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: 'Vui lòng nhập từ khóa tìm kiếm'
                });
            }
            const query = {
                name: { $regex: keyword, $options: 'i' },
                is_active: true
            };

            const searchResults = await Product.find(query)
                .select('name price thumbnail images slug category_id has_variants variants')
                .limit(20);

            res.json({
                success: true,
                count: searchResults.length,
                data: searchResults
            });

        } catch (error) {
            console.error('Error searching products:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi tìm kiếm sản phẩm',
                error: error.message
            });
        }
    }

    // [GET] /products
    async getProducts(req, res) {
        try {
            const {
                page = 1,
                limit = 12,
                category,
                minPrice,
                maxPrice,
                size,
                color,
                sort = 'createdAt',
                order = 'desc',
                keyword
            } = req.query;

            const query = { is_active: true };

            if (keyword && keyword.trim() !== '') {
                query.name = { $regex: keyword, $options: 'i' };
            }

            if (category) {
                query.category_id = category;
            }

            if (minPrice || maxPrice) {
                const priceCondition = {};
                if (minPrice) priceCondition.$gte = Number(minPrice);
                if (maxPrice) priceCondition.$lte = Number(maxPrice);

                query.$or = [
                    { price: priceCondition },
                    { 'variants.sizes.price': priceCondition }
                ];
            }

            if (size) {
                query['variants.sizes.size'] = size;
            }

            if (color) {
                query['variants.color'] = color;
            }

            const sortObj = {};

            sortObj[sort] = order === 'asc' ? 1 : -1;

            const skip = (page - 1) * limit;

            const products = await Product.find(query)
                .select('name price thumbnail images slug category_id has_variants variants')
                .populate('category_id', 'name')
                .sort(sortObj)
                .skip(skip)
                .limit(Number(limit));

            const total = await Product.countDocuments(query);

            res.json({
                success: true,
                data: products,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            });

        } catch (error) {
            console.error('Error getting products:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi lấy danh sách sản phẩm',
                error: error.message
            });
        }
    }

    // [GET] /products/filter-options
    async getFilterOptions(req, res) {
        try {
            const products = await Product.find({
                is_active: true,
                has_variants: true
            }).select('variants');

            const sizes = new Set();
            const colors = new Set();

            products.forEach(product => {
                product.variants.forEach(variant => {
                    colors.add(JSON.stringify({
                        name: variant.color,
                        code: variant.color_code
                    }));
                    variant.sizes.forEach(size => {
                        sizes.add(size.size);
                    });
                });
            });

            res.json({
                success: true,
                data: {
                    sizes: Array.from(sizes).sort(),
                    colors: Array.from(colors).map(c => JSON.parse(c))
                }
            });

        } catch (error) {
            console.error('Error getting filter options:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi lấy options filter',
                error: error.message
            });
        }
    }

    // [POST] /products/by-ids
    async getProductsByIds(req, res) {
        try {
            const { productIds } = req.body;

            //console.log('Received productIds:', productIds);

            if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Danh sách ID sản phẩm không hợp lệ'
                });
            }

            const products = await Product.find({
                _id: { $in: productIds }
            }).lean();

            //console.log('Found products:', products.length);

            if (products.length === 0) {
                const objectIds = productIds.map(id => new mongoose.Types.ObjectId(id));
                const productsRetry = await Product.find({
                    _id: { $in: objectIds }
                }).lean();

                console.log('Found products after conversion:', productsRetry.length);

                return res.json({
                    success: true,
                    products: productsRetry,
                    count: productsRetry.length
                });
            }

            return res.json({
                success: true,
                products: products,
                count: products.length
            });

        } catch (error) {
            console.error('Error in getProductsByIds:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi tải sản phẩm',
                error: error.message
            });
        }
    }
}
module.exports = new ProductsController();