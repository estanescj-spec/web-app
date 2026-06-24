const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/delivery');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.post('/admin/deliveries/assign', isAuthenticatedUser, deliveryController.assignCourier);
router.get('/courier/deliveries', isAuthenticatedUser, deliveryController.getCourierDeliveries);
router.put('/courier/deliveries/:id/status', isAuthenticatedUser, deliveryController.updateDeliveryStatus);

module.exports = router;
