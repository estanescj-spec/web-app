const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.post('/orders', isAuthenticatedUser, orderController.createOrder);
router.get('/orders', isAuthenticatedUser, orderController.getMyOrders);
router.get('/store-orders', isAuthenticatedUser, orderController.getStoreOrders);
router.get('/admin/orders', isAuthenticatedUser, orderController.getAllOrders);
router.put('/orders/:id/status', isAuthenticatedUser, orderController.updateOrderStatus);
router.put('/orders/:id/cancel', isAuthenticatedUser, orderController.cancelOrder);

module.exports = router;