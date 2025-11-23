const Order = require('../model/Orders');
const Product = require('../model/Products');
const Account = require('../model/Accounts');

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
                payment_method,
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


                console.log('=== DEBUG ITEM ===');
                console.log('Product:', product.name);
                console.log('Item from cart:', JSON.stringify(item, null, 2));
                console.log('Product has_variants:', product.has_variants);
                console.log('Product variants count:', product.variants?.length);

                let price = 0;
                let image = product.thumbnail || '/images/default-product.jpg';
                let colorName = null;

                if (product.has_variants && item.variantId && item.size) {
                    console.log('Looking for variantId:', item.variantId);
                    console.log('Available variant IDs:', product.variants.map(v => v._id.toString()));

                    const variant = product.variants.find(v =>
                        v._id.toString() === item.variantId.toString()
                    );

                    console.log('Found variant:', variant ? 'YES' : 'NO');

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
                payment_method: payment_method || 'cod',
            });

            await order.save();

            for (const item of items) {
                const product = products.find(p => p._id.toString() === item.productId.toString());

                let result;
                if (product.has_variants && item.variantId && item.size) {
                    const mongoose = require('mongoose');
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

            const order = await Order.findById(orderId);

            if (!order) {
                return res.redirect('/');
            }

            res.render('user/OrderSuccess', { order });
        } catch (error) {
            console.error('Error showing order success:', error);
            res.redirect('/');
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
}

module.exports = new CheckoutController();