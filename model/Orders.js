const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    product_name: {
        type: String,
        required: true
    },
    product_image: {
        type: String,
        default: '/images/default-product.jpg'
    },
    variant_id: {
        type: String,
        default: null
    },
    variant_color: {
        type: String,
        default: null
    },
    size: {
        type: String,
        default: null
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    total: {
        type: Number,
        required: true,
        min: 0
    }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    order_number: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        default: null
    },
    // ttin khach hang
    customer_info: {
        full_name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        phone: {
            type: String,
            required: true,
            trim: true
        },
        address: {
            type: String,
            required: true,
            trim: true
        },
        note: {
            type: String,
            trim: true,
            default: null
        }
    },
    items: {
        type: [orderItemSchema],
        required: true,
        validate: {
            validator: function (items) {
                return items && items.length > 0;
            },
            message: 'Đơn hàng phải có ít nhất 1 sản phẩm'
        }
    },
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    shipping_fee: {
        type: Number,
        required: true,
        min: 0,
        default: 30000
    },
    discount: {
        type: Number,
        default: 0,
        min: 0
    },
    total: {
        type: Number,
        required: true,
        min: 0
    },
    payment_method: {
        type: String,
        enum: ['cod', 'bank_transfer', 'momo', 'vnpay', 'zalopay'],
        default: 'cod',
        required: true
    },
    payment_status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    payment_info: {
        transaction_id: String,
        payment_time: Date,
        payment_details: mongoose.Schema.Types.Mixed
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled'],
        default: 'pending',
        index: true
    },
    status_history: [{
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled']
        },
        note: String,
        updated_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Account'
        },
        updated_at: {
            type: Date,
            default: Date.now
        }
    }],
    admin_note: {
        type: String,
        trim: true,
        default: null
    },
    ordered_at: {
        type: Date,
        default: Date.now,
        index: true
    },
    confirmed_at: Date,
    shipping_at: Date,
    delivered_at: Date,
    cancelled_at: Date
}, {
    timestamps: true,
    versionKey: false
});

orderSchema.index({ order_number: 1 });
orderSchema.index({ 'customer_info.email': 1 });
orderSchema.index({ 'customer_info.phone': 1 });
orderSchema.index({ status: 1, ordered_at: -1 });
orderSchema.index({ user_id: 1, ordered_at: -1 });

orderSchema.virtual('total_items').get(function () {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

orderSchema.statics.generateOrderNumber = async function () {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const prefix = `KR${year}${month}${day}`;

    const count = await this.countDocuments({
        order_number: new RegExp(`^${prefix}`)
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}${sequence}`;
};

orderSchema.methods.updateStatus = function (newStatus, note = null, updatedBy = null) {
    this.status = newStatus;

    this.status_history.push({
        status: newStatus,
        note: note,
        updated_by: updatedBy,
        updated_at: new Date()
    });

    const now = new Date();
    switch (newStatus) {
        case 'confirmed':
            this.confirmed_at = now;
            break;
        case 'shipping':
            this.shipping_at = now;
            break;
        case 'delivered':
            this.delivered_at = now;
            this.payment_status = 'paid';
            break;
        case 'cancelled':
            this.cancelled_at = now;
            break;
    }

    return this.save();
};

orderSchema.methods.updatePayment = function (paymentStatus, transactionId = null, paymentDetails = null) {
    this.payment_status = paymentStatus;

    if (paymentStatus === 'paid') {
        this.payment_info = {
            transaction_id: transactionId,
            payment_time: new Date(),
            payment_details: paymentDetails
        };
    }

    return this.save();
};

orderSchema.pre('save', function (next) {
    if (this.isModified('items') || this.isModified('shipping_fee') || this.isModified('discount')) {

        this.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);

        this.total = this.subtotal + this.shipping_fee - this.discount;
    }

    next();
});

orderSchema.pre('save', function (next) {
    if (this.isNew) {
        this.status_history.push({
            status: this.status,
            note: 'Đơn hàng được tạo',
            updated_at: new Date()
        });
    }

    next();
});

orderSchema.pre(/^find/, function (next) {
    this.select('-__v');
    next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;