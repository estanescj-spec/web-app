const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.get('/address-chart', isAuthenticatedUser, reportController.getAddressChartData);
router.get('/sales-chart', isAuthenticatedUser, reportController.getSalesChartData);
router.get('/items-chart', isAuthenticatedUser, reportController.getItemsChartData);

router.get('/reports/sales', isAuthenticatedUser, reportController.getSalesReportData);
router.get('/reports/inventory', isAuthenticatedUser, reportController.getInventoryReportData);
router.get('/reports/trends', isAuthenticatedUser, reportController.getProductTrendsData);
router.get('/reports/performance', isAuthenticatedUser, reportController.getSellerPerformanceData);
router.get('/reports/export/csv', isAuthenticatedUser, reportController.exportCSV);
router.get('/reports/export/pdf-html', isAuthenticatedUser, reportController.exportPDFHtml);

module.exports = router;
