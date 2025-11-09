const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/news_temp');
        console.log('Kết nối thành công');
    } catch (error) {
        console.error('Lỗi kết nối:', error);
        process.exit(1);
    }
};

module.exports = connectDB;