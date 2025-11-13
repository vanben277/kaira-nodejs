const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 50
    },
    banner_url: {
        type: String,
        trim: true,
        default: null
    },
    parent_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
    },
    slug: {
        type: String,
        unique: true,
        trim: true,
        lowercase: true
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true  // createdAt + updatedAt
});

// Virtual để lấy danh sách danh mục con
categorySchema.virtual('children', {
    ref: 'Category',
    localField: '_id',
    foreignField: 'parent_id'
});

// Virtual để kiểm tra có phải danh mục cha không
categorySchema.virtual('isParent').get(function () {
    return this.parent_id === null;
});

categorySchema.set('toJSON', { virtuals: true });
categorySchema.set('toObject', { virtuals: true });

// Index để tìm kiếm nhanh
categorySchema.index({ parent_id: 1 });

module.exports = mongoose.model('Category', categorySchema);