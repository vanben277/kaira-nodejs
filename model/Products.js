const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    category_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },

    price: {
        type: Number,
        min: 0
    },
    stock: {
        type: Number,
        min: 0,
        default: 0
    },
    sku: {
        type: String,
        trim: true,
        sparse: true
    },

    has_variants: {
        type: Boolean,
        default: false
    },

    variants: [{
        color: {
            type: String,
            required: true,
            trim: true
        },
        color_code: {
            type: String, // Mã màu hex: #FF0000
            trim: true
        },
        images: [{
            type: String
        }],
        sizes: [{
            size: {
                type: String,
                required: true,
                trim: true // S, M, L, XL, XXL
            },
            stock: {
                type: Number,
                required: true,
                min: 0,
                default: 0
            },
            price: {
                type: Number,
                required: true,
                min: 0
            },
            sku: {
                type: String,
                trim: true,
                sparse: true
            }
        }]
    }],

    thumbnail: {
        type: String
    },

    images: [{
        type: String
    }],

    is_active: {
        type: Boolean,
        default: true
    },

    total_sold: {
        type: Number,
        default: 0,
        min: 0
    },

    rating: {
        average: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        count: {
            type: Number,
            default: 0,
            min: 0
        }
    },

    views: {
        type: Number,
        default: 0,
        min: 0
    }
}, {
    timestamps: true
});

ProductSchema.pre('save', function (next) {
    if (!this.has_variants && !this.price) {
        next(new Error('Sản phẩm không có biến thể phải có giá'));
    }

    if (this.has_variants && (!this.variants || this.variants.length === 0)) {
        next(new Error('Sản phẩm có biến thể phải có ít nhất 1 biến thể'));
    }

    next();
});

ProductSchema.index({ category_id: 1 });
ProductSchema.index({ is_active: 1 });
ProductSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', ProductSchema);