const db = require('../models');
const Wishlist = db.Wishlist;
const Product = db.Product;

const getUserId = (req) => req.user?.id || req.body?.user?.id;

exports.getWishlist = async (req, res) => {
    try {
        const userId = getUserId(req);
        const list = await Wishlist.findAll({
            where: { user_id: userId },
            include: [{ model: Product }]
        });
        return res.status(200).json({ success: true, rows: list });
    } catch (error) {
        return res.status(500).json({ error: 'Error fetching wishlist' });
    }
};

exports.addToWishlist = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { product_id, wishlist_category, notify_discounts, notify_restock } = req.body;

        if (!product_id) {
            return res.status(400).json({ error: 'Product ID is required' });
        }

        const [item, created] = await Wishlist.findOrCreate({
            where: { user_id: userId, product_id },
            defaults: {
                wishlist_category: wishlist_category || 'General',
                notify_discounts: notify_discounts !== undefined ? !!notify_discounts : true,
                notify_restock: notify_restock !== undefined ? !!notify_restock : true
            }
        });

        if (!created) {
            await item.update({
                wishlist_category: wishlist_category || item.wishlist_category,
                notify_discounts: notify_discounts !== undefined ? !!notify_discounts : item.notify_discounts,
                notify_restock: notify_restock !== undefined ? !!notify_restock : item.notify_restock
            });
        }

        return res.status(200).json({ success: true, message: 'Added to wishlist', item });
    } catch (error) {
        return res.status(500).json({ error: 'Error adding to wishlist', details: error.message });
    }
};

exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params; // Wishlist item ID

        await Wishlist.destroy({ where: { id, user_id: userId } });
        return res.status(200).json({ success: true, message: 'Removed from wishlist' });
    } catch (error) {
        return res.status(500).json({ error: 'Error removing from wishlist' });
    }
};

exports.organizeWishlist = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;
        const { wishlist_category } = req.body;

        const item = await Wishlist.findOne({ where: { id, user_id: userId } });
        if (!item) {
            return res.status(404).json({ error: 'Wishlist item not found' });
        }

        await item.update({ wishlist_category: wishlist_category || 'General' });
        return res.status(200).json({ success: true, message: 'Wishlist organized' });
    } catch (error) {
        return res.status(500).json({ error: 'Error organizing wishlist' });
    }
};
