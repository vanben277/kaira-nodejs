require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Kết nối thành công');
    } catch (error) {
        console.error('Lỗi kết nối:', error);
        process.exit(1);
    }
};

module.exports = connectDB;