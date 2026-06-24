const express = require('express');
const router = express.Router();
const productController = require('../controllers/product');
const { isAuthenticatedUser } = require('../middlewares/auth');
const upload = require('../utils/multer');

// Public catalog routes
router.get('/categories', productController.getCategories);
router.get('/products', productController.getAllProducts);
router.get('/products/:id', productController.getSingleProduct);
router.get('/stores/:sellerId/products', productController.getStoreProducts);

// Seller/User product listings routes
router.post('/products', isAuthenticatedUser, upload.single('image'), productController.createProduct);
router.put('/products/:id', isAuthenticatedUser, upload.single('image'), productController.updateProduct);
router.delete('/products/:id', isAuthenticatedUser, productController.deleteProduct);
router.get('/my-listings', isAuthenticatedUser, productController.getMyListings);

// Admin-only moderation routes
router.get('/admin/products', isAuthenticatedUser, productController.adminGetAllProducts);
router.get('/admin/products/pending', isAuthenticatedUser, productController.getPendingProducts);
router.put('/admin/products/:id/moderate', isAuthenticatedUser, productController.adminModerateProduct);

module.exports = router;
