const db = require('../models');
const Product = db.Product;
const Category = db.Category;
const User = db.User;
const StoreProfile = db.StoreProfile;
const Review = db.Review;
const InventoryLog = db.InventoryLog;
const { Op } = require('sequelize');

const getUserId = (req) => req.user?.id || req.body?.user?.id;

// List all categories
exports.getCategories = async (req, res) => {
    try {
        const categories = await Category.findAll({ order: [['name', 'ASC']] });
        return res.status(200).json({ success: true, rows: categories });
    } catch (error) {
        return res.status(500).json({ error: 'Error fetching categories' });
    }
};

// Admin: list all products (all statuses)
exports.adminGetAllProducts = async (req, res) => {
    try {
        const caller = await User.findByPk(getUserId(req));
        if (!caller || caller.role !== 'admin') {
            return res.status(403).json({ error: 'Admin privileges required' });
        }

        const products = await Product.findAll({
            include: [
                { model: Category },
                { model: User, as: 'Seller', attributes: ['id', 'name', 'email'] }
            ],
            order: [['id', 'DESC']]
        });

        return res.status(200).json({ success: true, rows: products });
    } catch (error) {
        return res.status(500).json({ error: 'Error fetching products' });
    }
};

// Get all products with query filters (FR1.2)
exports.getAllProducts = async (req, res) => {
    try {
        const { category, min_price, max_price, storage, color, rating, availability, search } = req.query;

        let whereClause = { status: 'approved' }; // Only show approved products to visitors/customers
        let categoryWhere = {};

        // Search text filter
        if (search) {
            whereClause[Op.or] = [
                { title: { [Op.like]: `%${search}%` } },
                { description: { [Op.like]: `%${search}%` } }
            ];
        }

        // Category filter
        if (category) {
            categoryWhere.name = category;
        }

        // Price range filter
        if (min_price || max_price) {
            whereClause.sell_price = {};
            if (min_price) whereClause.sell_price[Op.gte] = parseFloat(min_price);
            if (max_price) whereClause.sell_price[Op.lte] = parseFloat(max_price);
        }

        // Storage filter
        if (storage) {
            whereClause.storage = { [Op.like]: `%${storage}%` };
        }

        // Color filter
        if (color) {
            whereClause.color = { [Op.like]: `%${color}%` };
        }

        // Availability filter
        if (availability) {
            if (availability === 'in_stock') {
                whereClause.stock_quantity = { [Op.gt]: 0 };
            } else if (availability === 'low_stock') {
                whereClause.stock_quantity = { [Op.and]: [{ [Op.gt]: 0 }, { [Op.lte]: 5 }] };
            } else if (availability === 'out_of_stock') {
                whereClause.stock_quantity = 0;
            }
        }

        // Fetch products
        let products = await Product.findAll({
            where: whereClause,
            include: [
                { model: Category, where: categoryWhere },
                { model: Review },
                { 
                    model: User, 
                    as: 'Seller', 
                    include: [{ model: StoreProfile }] 
                }
            ]
        });

        // Filter by average rating (FR1.2) if requested
        if (rating) {
            const reqRating = parseFloat(rating);
            products = products.filter(p => {
                if (p.Reviews.length === 0) return reqRating === 0;
                const avg = p.Reviews.reduce((sum, r) => sum + r.rating, 0) / p.Reviews.length;
                return avg >= reqRating;
            });
        }

        return res.status(200).json({ success: true, rows: products });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error fetching products', details: error.message });
    }
};

// Get single product with full specs, reviews, and seller details (FR1.1)
exports.getSingleProduct = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id, {
            include: [
                { model: Category },
                { 
                    model: Review,
                    include: [{ model: User, as: 'Customer', attributes: ['name'] }]
                },
                { 
                    model: User, 
                    as: 'Seller', 
                    include: [{ model: StoreProfile }] 
                }
            ]
        });

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        return res.status(200).json({ success: true, result: product });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error fetching product' });
    }
};

// Create product listing (FR1.3)
exports.createProduct = async (req, res) => {
    try {
        const sellerId = getUserId(req);
        const { title, description, category_id, cost_price, sell_price, stock_quantity, color, storage, warranty } = req.body;
        
        let imagePath = null;
        if (req.file) {
            imagePath = 'images/' + req.file.filename;
        }

        if (!title || !category_id || !cost_price || !sell_price) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const product = await Product.create({
            title,
            description,
            category_id: parseInt(category_id),
            seller_id: sellerId,
            cost_price: parseFloat(cost_price),
            sell_price: parseFloat(sell_price),
            stock_quantity: parseInt(stock_quantity) || 0,
            color,
            storage,
            warranty,
            status: 'pending', // Requires admin approval (FR1.4)
            img_path: imagePath
        });

        // Log initial stock load
        if (product.stock_quantity > 0) {
            await InventoryLog.create({
                product_id: product.id,
                change_type: 'restock',
                quantity_change: product.stock_quantity,
                previous_stock: 0,
                new_stock: product.stock_quantity,
                user_id: sellerId
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Product listing submitted and is pending approval',
            product
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error creating product', details: error.message });
    }
};

// Update product listing (FR1.3)
exports.updateProduct = async (req, res) => {
    try {
        const sellerId = getUserId(req);
        const { id } = req.params;
        const { title, description, category_id, cost_price, sell_price, stock_quantity, color, storage, warranty } = req.body;

        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check ownership (Sellers edit their own listings, Admin can edit anything)
        const user = await User.findByPk(sellerId);
        if (product.seller_id !== sellerId && user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized to modify this listing' });
        }

        let imagePath = product.img_path;
        if (req.file) {
            imagePath = 'images/' + req.file.filename;
        }

        const prevStock = product.stock_quantity;
        const newStock = stock_quantity !== undefined ? parseInt(stock_quantity) : prevStock;

        await product.update({
            title: title || product.title,
            description: description !== undefined ? description : product.description,
            category_id: category_id ? parseInt(category_id) : product.category_id,
            cost_price: cost_price ? parseFloat(cost_price) : product.cost_price,
            sell_price: sell_price ? parseFloat(sell_price) : product.sell_price,
            stock_quantity: newStock,
            color: color !== undefined ? color : product.color,
            storage: storage !== undefined ? storage : product.storage,
            warranty: warranty !== undefined ? warranty : product.warranty,
            img_path: imagePath,
            status: user.role === 'admin' ? product.status : 'pending' // Re-verify if seller updates it
        });

        // Audit inventory stock changes (FR4.5)
        if (newStock !== prevStock) {
            await InventoryLog.create({
                product_id: product.id,
                change_type: newStock > prevStock ? 'restock' : 'purchase',
                quantity_change: Math.abs(newStock - prevStock),
                previous_stock: prevStock,
                new_stock: newStock,
                user_id: sellerId
            });
        }

        return res.status(200).json({ success: true, message: 'Product listing updated successfully', product });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error updating product', details: error.message });
    }
};

// Delete product listing (FR1.3)
exports.deleteProduct = async (req, res) => {
    try {
        const sellerId = getUserId(req);
        const { id } = req.params;

        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const user = await User.findByPk(sellerId);
        if (product.seller_id !== sellerId && user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized to delete this listing' });
        }

        await product.destroy();
        return res.status(200).json({ success: true, message: 'Product listing deleted successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error deleting product' });
    }
};

// Admin approvals and featuring (FR1.4)
exports.getPendingProducts = async (req, res) => {
    try {
        // Only admins may fetch pending products
        const caller = await User.findByPk(getUserId(req));
        if (!caller || caller.role !== 'admin') {
            return res.status(403).json({ error: 'Admin privileges required' });
        }

        const pending = await Product.findAll({
            where: { status: 'pending' },
            include: [
                { model: Category },
                { 
                    model: User, 
                    as: 'Seller', 
                    include: [{ model: StoreProfile }] 
                }
            ]
        });
        return res.status(200).json({ success: true, rows: pending });
    } catch (error) {
        return res.status(500).json({ error: 'Error fetching pending products' });
    }
};

exports.adminModerateProduct = async (req, res) => {
    try {
        const adminId = getUserId(req);
        // Only admins may moderate products
        const caller = await User.findByPk(adminId);
        if (!caller || caller.role !== 'admin') {
            return res.status(403).json({ error: 'Admin privileges required' });
        }
        const { id } = req.params;
        const { status, is_featured } = req.body;

        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const updates = {};
        if (status && ['approved', 'rejected', 'pending'].includes(status)) {
            updates.status = status;
        }
        if (is_featured !== undefined) {
            updates.is_featured = !!is_featured;
        }

        await product.update(updates);

        // Log admin action (FR8.6)
        await db.AdminLog.create({
            admin_id: adminId,
            action_type: 'moderate_product',
            description: `Moderated product "${product.title}" (ID: ${product.id}): set status to ${status || product.status}, featured to ${is_featured !== undefined ? is_featured : product.is_featured}`
        });

        return res.status(200).json({ success: true, message: 'Product moderated successfully', product });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error moderating product' });
    }
};

// Get listings for a specific seller store (FR7.6)
exports.getStoreProducts = async (req, res) => {
    try {
        const { sellerId } = req.params;
        const products = await Product.findAll({
            where: { seller_id: sellerId, status: 'approved' },
            include: [{ model: Category }]
        });
        return res.status(200).json({ success: true, rows: products });
    } catch (error) {
        return res.status(500).json({ error: 'Error fetching store products' });
    }
};

// Seller's own listings dashboard (all statuses)
exports.getMyListings = async (req, res) => {
    try {
        const sellerId = getUserId(req);
        const products = await Product.findAll({
            where: { seller_id: sellerId },
            include: [{ model: Category }]
        });
        return res.status(200).json({ success: true, rows: products });
    } catch (error) {
        return res.status(500).json({ error: 'Error fetching listings' });
    }
};
