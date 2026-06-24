const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlist');
const { isAuthenticatedUser } = require('../middlewares/auth');

router.get('/wishlist', isAuthenticatedUser, wishlistController.getWishlist);
router.post('/wishlist', isAuthenticatedUser, wishlistController.addToWishlist);
router.delete('/wishlist/:id', isAuthenticatedUser, wishlistController.removeFromWishlist);
router.put('/wishlist/:id/organize', isAuthenticatedUser, wishlistController.organizeWishlist);

module.exports = router;
