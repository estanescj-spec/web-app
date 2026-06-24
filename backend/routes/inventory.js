const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.get('/inventory/status', isAuthenticatedUser, inventoryController.getInventoryStatus);
router.put('/inventory/products/:id/restock', isAuthenticatedUser, inventoryController.restockProduct);
router.get('/inventory/alerts', isAuthenticatedUser, inventoryController.getLowStockAlerts);
router.get('/inventory/logs', isAuthenticatedUser, inventoryController.getInventoryAuditLog);

module.exports = router;
