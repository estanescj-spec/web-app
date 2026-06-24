const express = require('express');
const router = express.Router();
const userController = require('../controllers/user');
const { isAuthenticatedUser } = require('../middlewares/auth');
const upload = require('../utils/multer');

// Public auth routes
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

// Profile routes
router.get('/profile', isAuthenticatedUser, userController.getProfile);
router.put('/profile', isAuthenticatedUser, upload.single('avatar'), userController.updateProfile);
router.post('/store-profile', isAuthenticatedUser, userController.createStoreProfile);

// Address routes
router.get('/addresses', isAuthenticatedUser, userController.getAddresses);
router.post('/addresses', isAuthenticatedUser, userController.addAddress);
router.delete('/addresses/:id', isAuthenticatedUser, userController.deleteAddress);

// Admin-only routes
router.get('/admin/users', isAuthenticatedUser, userController.adminGetUsers);
router.put('/admin/users/:id/role', isAuthenticatedUser, userController.adminUpdateUserRole);
router.put('/admin/stores/:id/approve', isAuthenticatedUser, userController.adminApproveStore);

module.exports = router;