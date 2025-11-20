const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const connectDB = require('./config/db/Connection');
const flash = require('connect-flash');

const app = express();
const PORT = 5001;

connectDB();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Cấu hình session
app.use(session({
    secret: 'my-news-app-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false // Để true nếu dùng HTTPS
    }
}));

app.use(flash());

// Middleware truyền session vào view
app.use((req, res, next) => {
    res.locals.session = req.session || {};
    next();
});

// Static files
app.use(express.static('public'));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');

app.use('/', userRoutes);
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);


app.listen(PORT, () => {
    console.log(`Máy chủ đang chạy trên http://localhost:${PORT}`);
});