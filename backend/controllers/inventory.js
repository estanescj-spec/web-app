const db = require('../models');
const Product = db.Product;
const InventoryLog = db.InventoryLog;
const Category = db.Category;
const User = db.User;

const getUserId = (req) => req.user?.id || req.body?.user?.id;

// Get inventory tracking levels (FR4.1, FR4.3)
exports.getInventoryStatus = async (req, res) => {
    try {
        const userId = getUserId(req);
        const user = await User.findByPk(userId);

        let whereClause = {};
        if (user.role !== 'admin') {
            whereClause.seller_id = userId;
        }

        const products = await Product.findAll({
            where: whereClause,
            include: [{ model: Category }]
        });

        const report = products.map(p => {
            let stockStatus = 'In Stock';
            if (p.stock_quantity === 0) {
                stockStatus = 'Out of Stock';
            } else if (p.stock_quantity <= 5) {
                stockStatus = 'Low Stock';
            }

            return {
                id: p.id,
                title: p.title,
                category: p.Category?.name,
                stock_quantity: p.stock_quantity,
                cost_price: p.cost_price,
                sell_price: p.sell_price,
                stockStatus
            };
        });

        return res.status(200).json({ success: true, rows: report });
    } catch (error) {
        return res.status(500).json({ error: 'Error fetching inventory status' });
    }
};

// Record restocks manually (FR4.5)
exports.restockProduct = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;
        const { quantity, change_type } = req.body; // change_type: 'restock' or 'return'

        if (!quantity || quantity <= 0) {
            return res.status(400).json({ error: 'Quantity must be greater than zero' });
        }

        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const user = await User.findByPk(userId);
        if (product.seller_id !== userId && user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const prevStock = product.stock_quantity;
        const newStock = prevStock + parseInt(quantity);
        const resolvedChangeType = change_type === 'return' ? 'return' : 'restock';

        await product.update({ stock_quantity: newStock });

        // Log audit (FR4.6)
        const log = await InventoryLog.create({
            product_id: product.id,
            change_type: resolvedChangeType,
            quantity_change: parseInt(quantity),
            previous_stock: prevStock,
            new_stock: newStock,
            user_id: userId
        });

        return res.status(200).json({ 
            success: true, 
            message: `Recorded ${resolvedChangeType} of ${quantity} units. New stock: ${newStock}`, 
            product,
            log 
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error recording restock' });
    }
};

// Get low stock alerts (FR4.4)
exports.getLowStockAlerts = async (req, res) => {
    try {
        const userId = getUserId(req);
        const user = await User.findByPk(userId);

        let whereClause = {
            stock_quantity: {
                [db.Sequelize.Op.and]: [
                    { [db.Sequelize.Op.gt]: 0 },
                    { [db.Sequelize.Op.lte]: 5 }
                ]
            }
        };

        if (user.role !== 'admin') {
            whereClause.seller_id = userId;
        }

        const lowStockProducts = await Product.findAll({ where: whereClause });
        return res.status(200).json({ success: true, rows: lowStockProducts });
    } catch (error) {
        return res.status(500).json({ error: 'Error fetching low stock alerts' });
    }
};

// Get audit logs (FR4.6)
exports.getInventoryAuditLog = async (req, res) => {
    try {
        const userId = getUserId(req);
        const user = await User.findByPk(userId);

        let includeClause = {
            model: Product,
            required: true
        };

        if (user.role !== 'admin') {
            includeClause.where = { seller_id: userId };
        }

        const logs = await InventoryLog.findAll({
            include: [
                includeClause,
                { model: User, attributes: ['name', 'email'] }
            ],
            order: [['created_at', 'DESC']]
        });

        return res.status(200).json({ success: true, rows: logs });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error fetching inventory audit log' });
    }
};
