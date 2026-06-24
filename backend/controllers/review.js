const db = require('../models');
const Review = db.Review;
const Order = db.Order;
const OrderLine = db.OrderLine;

const getUserId = (req) => req.user?.id || req.body?.user?.id;

// Add rating & review for verified buyers (FR1.5)
exports.addReview = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { product_id, rating, comment } = req.body;

        if (!product_id || !rating) {
            return res.status(400).json({ error: 'Product ID and Rating are required' });
        }

        // Verify if the user is a buyer of this product and has a delivered status (FR1.5)
        const purchaseVerified = await Order.count({
            where: { buyer_id: userId, status: 'delivered' },
            include: [{
                model: OrderLine,
                where: { product_id: parseInt(product_id) }
            }]
        });

        if (purchaseVerified === 0) {
            return res.status(403).json({ 
                error: 'Only verified buyers who have completed their delivery can submit reviews' 
            });
        }

        let imagePath = null;
        if (req.file) {
            imagePath = 'images/' + req.file.filename;
        }

        const review = await Review.create({
            product_id: parseInt(product_id),
            customer_id: userId,
            rating: parseInt(rating),
            comment: comment || '',
            photo_path: imagePath
        });

        return res.status(201).json({
            success: true,
            message: 'Review submitted successfully',
            review
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error submitting review', details: error.message });
    }
};

// Get reviews for a product
exports.getProductReviews = async (req, res) => {
    try {
        const { product_id } = req.params;
        const reviews = await Review.findAll({
            where: { product_id },
            include: [{ model: db.User, as: 'Customer', attributes: ['name'] }]
        });
        return res.status(200).json({ success: true, rows: reviews });
    } catch (error) {
        return res.status(500).json({ error: 'Error fetching reviews' });
    }
};
