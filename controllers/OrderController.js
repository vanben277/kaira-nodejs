const Order = require('../model/Orders');
const Product = require('../model/Products');
const mongoose = require('mongoose');

class CheckoutController {
    // GET /checkout
    async showCheckoutPage(req, res) {
        try {
            res.render('user/Checkout');
        } catch (error) {
            console.error('Error showing checkout page:', error);
            res.status(500).render('error', { message: 'Có lỗi xảy ra' });
        }
    }

    // [POST] /checkout/create-order 
    async createOrder(req, res) {
        try {
            const {
                customer_info,
                items,
                payment_method = 'cod',
                coupon_code
            } = req.body;

            if (!customer_info || !items || items.length === 0) {
                return res.status(400).json({ success: false, message: 'Thiếu thông tin đơn hàng' });
            }

            const { full_name, email, phone, address, note } = customer_info;
            if (!full_name || !email || !phone || !address) {
                return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin giao hàng' });
            }

            const productIds = items.map(i => i.productId);
            const products = await Product.find({ _id: { $in: productIds } });

            if (products.length !== productIds.length) {
                return res.status(400).json({ success: false, message: 'Một số sản phẩm không tồn tại' });
            }

            const orderItems = [];
            let subtotal = 0;

            for (const item of items) {
                const product = products.find(p => p._id.toString() === item.productId.toString());
                if (!product) continue;

                let price = 0;
                let image = product.thumbnail || '/images/default-product.jpg';
                let colorName = null;

                if (product.has_variants && item.variantId && item.size) {
                    const variant = product.variants.find(v =>
                        v._id.toString() === item.variantId.toString()
                    );

                    if (!variant) {
                        return res.status(400).json({ success: false, message: `Không tìm thấy biến thể của sản phẩm "${product.name}"` });
                    }

                    const sizeObj = variant.sizes.find(s => s.size === item.size);
                    if (!sizeObj) {
                        return res.status(400).json({ success: false, message: `Size ${item.size} không tồn tại cho "${product.name}"` });
                    }

                    if (sizeObj.stock < item.quantity) {
                        return res.status(400).json({
                            success: false,
                            message: `Sản phẩm "${product.name}" - ${variant.color} - Size ${item.size} chỉ còn ${sizeObj.stock} sản phẩm`
                        });
                    }

                    price = sizeObj.price;
                    colorName = variant.color;
                    if (variant.images?.length > 0) image = variant.images[0];

                } else {
                    if (product.price == null) {
                        return res.status(400).json({ success: false, message: `Sản phẩm "${product.name}" chưa có giá` });
                    }
                    if (product.stock < item.quantity) {
                        return res.status(400).json({
                            success: false,
                            message: `Sản phẩm "${product.name}" chỉ còn ${product.stock} sản phẩm`
                        });
                    }
                    price = product.price;
                }

                const itemTotal = price * item.quantity;
                subtotal += itemTotal;

                orderItems.push({
                    product_id: product._id,
                    product_name: product.name,
                    product_image: image,
                    variant_id: item.variantId || null,
                    variant_color: colorName,
                    size: item.size || null,
                    price,
                    quantity: item.quantity,
                    total: itemTotal
                });
            }

            const shipping_fee = 30000;
            const discount = 0;
            const total = subtotal + shipping_fee - discount;

            const order_number = await Order.generateOrderNumber();
            const user_id = req.session?.userId || null;

            const order = new Order({
                order_number,
                user_id,
                customer_info: {
                    full_name: full_name.trim(),
                    email: email.trim().toLowerCase(),
                    phone: phone.trim(),
                    address: address.trim(),
                    note: note?.trim() || null
                },
                items: orderItems,
                subtotal,
                shipping_fee,
                discount,
                total,
                payment_method: payment_method,
                payment_status: payment_method === 'bank_transfer' ? 'pending' : 'unpaid'
            });

            await order.save();

            for (const item of items) {
                const product = products.find(p => p._id.toString() === item.productId.toString());
                let result;

                if (product.has_variants && item.variantId && item.size) {
                    const variantObjectId = new mongoose.Types.ObjectId(item.variantId);
                    result = await Product.updateOne(
                        {
                            _id: product._id,
                            'variants._id': variantObjectId,
                            'variants.sizes.size': item.size,
                            'variants.sizes.stock': { $gte: item.quantity }
                        },
                        {
                            $inc: { 'variants.$[v].sizes.$[s].stock': -item.quantity }
                        },
                        {
                            arrayFilters: [
                                { 'v._id': variantObjectId },
                                { 's.size': item.size }
                            ]
                        }
                    );
                } else {
                    result = await Product.updateOne(
                        {
                            _id: product._id,
                            stock: { $gte: item.quantity }
                        },
                        { $inc: { stock: -item.quantity } }
                    );
                }

                if (result.modifiedCount === 0) {
                    await Order.findByIdAndDelete(order._id);
                    return res.status(400).json({
                        success: false,
                        message: `Rất tiếc! Sản phẩm bạn vừa đặt đã hết hàng. Vui lòng thử lại!`
                    });
                }
            }

            if (payment_method === 'bank_transfer') {
                return res.status(201).json({
                    success: true,
                    message: 'Đặt hàng thành công! Vui lòng chuyển khoản để hoàn tất.',
                    order: {
                        order_number: order.order_number,
                        total: order.total,
                        _id: order._id
                    },
                    payment_method: 'bank_transfer'
                });
            }

            return res.status(201).json({
                success: true,
                message: 'Đặt hàng thành công!',
                order: {
                    order_number: order.order_number,
                    total: order.total,
                    _id: order._id
                }
            });

        } catch (error) {
            console.error('Error creating order:', error);
            return res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra khi tạo đơn hàng',
                error: error.message
            });
        }
    }

    // GET /order-success/:orderId
    async orderSuccess(req, res) {
        try {
            const { orderId } = req.params;
            const order = await Order.findById(orderId).lean();

            if (!order) {
                return res.redirect('/');
            }

            res.render('user/OrderSuccess', {
                order,
                isPendingPayment: order.payment_method === 'bank_transfer' && order.payment_status === 'pending'
            });
        } catch (error) {
            console.error('Error showing order success:', error);
            res.redirect('/');
        }
    }

    // GET /order/:id/status
    async getOrderStatus(req, res) {
        try {
            const { id } = req.params;
            const order = await Order.findById(id).select('payment_status payment_method total order_number');

            if (!order) {
                return res.status(404).json({ success: false, message: 'Đơn hàng không tồn tại' });
            }

            res.json({
                success: true,
                paid: order.payment_status === 'paid',
                pending: order.payment_status === 'pending',
                payment_method: order.payment_method,
                total: order.total,
                order_number: order.order_number
            });
        } catch (error) {
            console.error('Error getting order status:', error);
            res.status(500).json({ success: false, message: 'Lỗi server' });
        }
    }

    // GET /order-tracking/:orderNumber
    async trackOrder(req, res) {
        try {
            const { orderNumber } = req.params;
            const order = await Order.findOne({ order_number: orderNumber });

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Không tìm thấy đơn hàng'
                });
            }

            res.json({
                success: true,
                order: order
            });
        } catch (error) {
            console.error('Error tracking order:', error);
            res.status(500).json({
                success: false,
                message: 'Có lỗi xảy ra'
            });
        }
    }

    // [GET] /admin/orders
    async index(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const filter = {};
            if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;
            if (req.query.payment && req.query.payment !== 'all') filter.payment_status = req.query.payment;
            if (req.query.search) {
                const search = req.query.search.trim();
                filter.$or = [
                    { order_number: { $regex: search, $options: 'i' } },
                    { 'customer_info.full_name': { $regex: search, $options: 'i' } },
                    { 'customer_info.phone': { $regex: search, $options: 'i' } }
                ];
            }

            const totalOrders = await Order.countDocuments(filter);
            const totalPages = Math.ceil(totalOrders / limit);

            const orders = await Order.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            res.render('admin/orders/index', {
                orders,
                moment: require('moment'),
                pagination: {
                    page,
                    limit,
                    totalPages,
                    totalOrders
                },
                query: req.query
            });
        } catch (error) {
            console.error('Lỗi lấy danh sách đơn hàng:', error);
            res.status(500).render('errors/500');
        }
    }

    // [GET] /orders/by-user/:id
    async getOrdersByUser(req, res) {
        try {
            const userId = req.params.id;
            const sessionUserId = req.session.userId;
            const userRole = req.session.role;

            if (userRole !== 'ADMIN' && sessionUserId !== userId) {
                return res.status(403).json({
                    success: false,
                    message: 'Bạn không có quyền xem đơn hàng này'
                });
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const status = req.query.status;
            let query = { user_id: userId };

            if (status && ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled'].includes(status)) {
                query.status = status;
            }

            const total = await Order.countDocuments(query);

            const orders = await Order.find(query)
                .sort({ ordered_at: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            return res.status(200).json({
                success: true,
                data: orders,
                pagination: {
                    current_page: page,
                    total_pages: Math.ceil(total / limit),
                    total_items: total,
                    per_page: limit
                }
            });

        } catch (err) {
            console.error('Error getting orders by user:', err);

            return res.status(500).json({
                success: false,
                message: "Không thể lấy danh sách đơn hàng",
                error: err.message
            });
        }
    }

    // [GET] /admin/orders/detail/:id
    async getDetailPopup(req, res) {
        try {
            const order = await Order.findById(req.params.id).lean();
            if (!order) return res.status(404).json({ success: false });
            res.json(order);
        } catch (err) {
            res.status(500).json({ success: false });
        }
    }

    // [POST] /admin/orders/update-status
    async updateStatus(req, res) {
        try {
            const { orderId, status, payment_status } = req.body;
            const update = {};
            if (status) update.status = status;
            if (payment_status) update.payment_status = payment_status;

            const order = await Order.findByIdAndUpdate(orderId, update, { new: true });
            res.json({ success: true, order });
        } catch (err) {
            res.json({ success: false, message: err.message });
        }
    }

}

module.exports = new CheckoutController();