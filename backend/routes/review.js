const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review');
const { isAuthenticatedUser } = require('../middlewares/auth');
const upload = require('../utils/multer');

router.post('/reviews', isAuthenticatedUser, upload.single('photo'), reviewController.addReview);
router.get('/products/:product_id/reviews', reviewController.getProductReviews);

module.exports = router;
