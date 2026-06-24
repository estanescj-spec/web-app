const express = require('express');
const app = express();
const cors = require('cors');
const path = require('path');

// Import new routers
const userRouter = require('./routes/user');
const productRouter = require('./routes/product');
const wishlistRouter = require('./routes/wishlist');
const orderRouter = require('./routes/order');
const deliveryRouter = require('./routes/delivery');
const reportRouter = require('./routes/report');
const reviewRouter = require('./routes/review');
const inventoryRouter = require('./routes/inventory');

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static images folder
app.use('/images', express.static(path.join(__dirname, 'images')));

// Mount routes
app.use('/api/v1', userRouter);
app.use('/api/v1', productRouter);
app.use('/api/v1', wishlistRouter);
app.use('/api/v1', orderRouter);
app.use('/api/v1', deliveryRouter);
app.use('/api/v1', reportRouter);
app.use('/api/v1', reviewRouter);
app.use('/api/v1', inventoryRouter);

module.exports = app;