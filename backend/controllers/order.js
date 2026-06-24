const db = require('../models');
const Order = db.Order;
const OrderLine = db.OrderLine;
const Product = db.Product;
const Address = db.Address;
const User = db.User;
const StoreProfile = db.StoreProfile;
const Delivery = db.Delivery;
const InventoryLog = db.InventoryLog;
const PromoCode = db.PromoCode;
const sendEmail = require('../utils/sendEmail');
const sequelize = db.sequelize;

const getUserId = (req) => req.user?.id || req.body?.user?.id;

// Create Order (Checkout) (FR3.1, FR3.2, FR3.3, FR4.2)
exports.createOrder = async (req, res) => {
    const buyerId = getUserId(req);
    const { cart, address_id, address_line, zipcode, city, promo_code, payment_method } = req.body;

    if (!cart || cart.length === 0) {
        return res.status(400).json({ error: 'Cart is empty' });
    }

    let resolvedAddress = { address_line, zipcode, city };

    // Resolve address from id if provided
    if (address_id) {
        const addr = await Address.findOne({ where: { id: address_id, user_id: buyerId } });
        if (addr) {
            resolvedAddress = {
                address_line: addr.address_line,
                zipcode: addr.zipcode,
                city: addr.city
            };
        }
    }

    if (!resolvedAddress.address_line || !resolvedAddress.zipcode || !resolvedAddress.city) {
        return res.status(400).json({ error: 'Valid delivery address is required' });
    }

    const transaction = await sequelize.transaction();

    try {
        let discountPercentage = 0;
        if (promo_code) {
            const promo = await PromoCode.findOne({ where: { code: promo_code, active: true } });
            if (promo) {
                discountPercentage = promo.discount_percentage;
            }
        }

        let totalSum = 0;
        const lineItemsToCreate = [];
        const stockUpdates = [];

        // Validate products and stock levels
        for (const item of cart) {
            const product = await Product.findByPk(item.product_id, { transaction });
            if (!product) {
                await transaction.rollback();
                return res.status(404).json({ error: `Product ID ${item.product_id} not found` });
            }

            if (product.stock_quantity < item.quantity) {
                await transaction.rollback();
                return res.status(400).json({ error: `Insufficient stock for ${product.title}. Available: ${product.stock_quantity}` });
            }

            const itemTotal = parseFloat(product.sell_price) * parseInt(item.quantity);
            totalSum += itemTotal;

            lineItemsToCreate.push({
                product_id: product.id,
                quantity: parseInt(item.quantity),
                price_at_purchase: parseFloat(product.sell_price),
                productTitle: product.title,
                sellerId: product.seller_id,
                prevStock: product.stock_quantity,
                newStock: product.stock_quantity - parseInt(item.quantity)
            });

            // Prepare product stock update
            stockUpdates.push({
                product,
                newStock: product.stock_quantity - parseInt(item.quantity),
                prevStock: product.stock_quantity,
                quantityChanged: parseInt(item.quantity)
            });
        }

        // Apply discount code
        const finalPrice = totalSum * (1 - discountPercentage / 100);

        // Create Order
        const order = await Order.create({
            buyer_id: buyerId,
            address_line: resolvedAddress.address_line,
            zipcode: resolvedAddress.zipcode,
            city: resolvedAddress.city,
            total_price: finalPrice,
            promo_code: promo_code || null,
            payment_method: payment_method || 'Cash on Delivery',
            status: 'pending'
        }, { transaction });

        // Update stocks, create orderlines, log audits
        for (const update of stockUpdates) {
            await update.product.update({ stock_quantity: update.newStock }, { transaction });

            // Create OrderLine
            await OrderLine.create({
                order_id: order.id,
                product_id: update.product.id,
                quantity: update.quantityChanged,
                price_at_purchase: update.product.sell_price
            }, { transaction });

            // Log Inventory audit (FR4.2, FR4.6)
            await InventoryLog.create({
                product_id: update.product.id,
                change_type: 'purchase',
                quantity_change: -update.quantityChanged,
                previous_stock: update.prevStock,
                new_stock: update.newStock,
                user_id: buyerId
            }, { transaction });

            // Low stock alert check (FR4.4)
            if (update.newStock <= 5) {
                // Find seller details
                const sellerUser = await User.findByPk(update.product.seller_id, { transaction });
                if (sellerUser) {
                    console.log(`[LOW STOCK ALERT] Seller ${sellerUser.email} notified: ${update.product.title} is low in stock (${update.newStock} remaining)`);
                    await sendEmail({
                        email: sellerUser.email,
                        subject: `Low Stock Alert: ${update.product.title}`,
                        message: `Your listing for "${update.product.title}" has reached a low stock level of ${update.newStock}. Please restock soon.`
                    });
                }
            }
        }

        // Create blank delivery Courier assignment (FR6.1)
        await Delivery.create({
            order_id: order.id,
            status: 'assigned',
            notes: 'Pending courier assignment'
        }, { transaction });

        await transaction.commit();

        // Send confirmation email (FR3.7)
        const buyerUser = await User.findByPk(buyerId);
        if (buyerUser) {
            await sendEmail({
                email: buyerUser.email,
                subject: `Order Placed - ID ${order.id}`,
                message: `Hi ${buyerUser.name}, your order containing ${cart.length} item(s) has been successfully placed! Total Amount: ₱${finalPrice.toFixed(2)}. Method: ${payment_method}`
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            order_id: order.id,
            total_price: finalPrice
        });

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        return res.status(500).json({ error: 'Error processing order checkouts', details: error.message });
    }
};

// Get Buyer's Order History (FR5.2)
exports.getMyOrders = async (req, res) => {
    try {
        const buyerId = getUserId(req);
        const orders = await Order.findAll({
            where: { buyer_id: buyerId },
            include: [
                {
                    model: OrderLine,
                    include: [{ model: Product }]
                },
                { model: Delivery }
            ],
            order: [['created_at', 'DESC']]
        });
        return res.status(200).json({ success: true, rows: orders });
    } catch (error) {
        return res.status(500).json({ error: 'Error fetching orders' });
    }
};

// Get Orders for items sold by the Seller's store (FR3.4)
exports.getStoreOrders = async (req, res) => {
    try {
        const sellerId = getUserId(req);
        // Find orders containing products that belong to this seller
        const orders = await Order.findAll({
            include: [
                {
                    model: OrderLine,
                    required: true,
                    include: [{
                        model: Product,
                        required: true,
                        where: { seller_id: sellerId }
                    }]
                },
                { model: Delivery },
                { model: User, as: 'Buyer', attributes: ['name', 'email'] }
            ],
            order: [['created_at', 'DESC']]
        });
        return res.status(200).json({ success: true, rows: orders });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error fetching store orders' });
    }
};

// Admin visibility over all orders (FR3.5)
exports.getAllOrders = async (req, res) => {
    try {
        // Only admins may view all orders
        const caller = await User.findByPk(getUserId(req));
        if (!caller || caller.role !== 'admin') {
            return res.status(403).json({ error: 'Admin privileges required' });
        }

        const orders = await Order.findAll({
            include: [
                {
                    model: OrderLine,
                    include: [{ model: Product }]
                },
                { model: Delivery },
                { model: User, as: 'Buyer', attributes: ['name', 'email'] }
            ],
            order: [['created_at', 'DESC']]
        });
        return res.status(200).json({ success: true, rows: orders });
    } catch (error) {
        return res.status(500).json({ error: 'Error fetching all orders' });
    }
};

// Seller/Admin updates order status (FR3.4)
exports.updateOrderStatus = async (req, res) => {
    try {
        const userId = getUserId(req);
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }

        const order = await Order.findByPk(id, {
            include: [{ model: User, as: 'Buyer' }]
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Only admin or sellers of products in this order may update status
        const caller = await User.findByPk(userId);
        if (!caller) return res.status(403).json({ error: 'Unauthorized' });

        if (caller.role !== 'admin') {
            // check seller ownership across the order lines
            const orderLines = await OrderLine.findAll({ where: { order_id: order.id }, include: [{ model: Product }] });
            const isSeller = orderLines.some(line => line.Product && line.Product.seller_id === userId);
            if (!isSeller) {
                return res.status(403).json({ error: 'Only admin or seller can update this order status' });
            }
        }

        const updates = { status };
        if (status === 'shipped') {
            updates.date_shipped = new Date();
        }

        await order.update(updates);

        // Notify Buyer of status change (FR3.7)
        if (order.Buyer) {
            await sendEmail({
                email: order.Buyer.email,
                subject: `Order Status Updated - ID ${order.id}`,
                message: `Hi ${order.Buyer.name}, your order status has been updated to "${status.toUpperCase()}".`
            });
        }

        return res.status(200).json({ success: true, message: `Order status updated to ${status}`, order });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error updating order status' });
    }
};

// Customer cancels order before shipment (FR3.6, FR4.2)
exports.cancelOrder = async (req, res) => {
    const buyerId = getUserId(req);
    const { id } = req.params;

    const order = await Order.findOne({
        where: { id, buyer_id: buyerId },
        include: [{ model: OrderLine }]
    });

    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    // Cancellation only allowed before shipping
    if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
        return res.status(400).json({ error: `Cannot cancel order. Current status: ${order.status}` });
    }

    const transaction = await sequelize.transaction();

    try {
        // Restore stock levels and log inventory audits
        for (const line of order.OrderLines) {
            const product = await Product.findByPk(line.product_id, { transaction });
            if (product) {
                const prevStock = product.stock_quantity;
                const newStock = prevStock + line.quantity;

                await product.update({ stock_quantity: newStock }, { transaction });

                // Log Inventory cancellation restore (FR4.2, FR4.6)
                await InventoryLog.create({
                    product_id: product.id,
                    change_type: 'cancellation',
                    quantity_change: line.quantity,
                    previous_stock: prevStock,
                    new_stock: newStock,
                    user_id: buyerId
                }, { transaction });
            }
        }

        await order.update({ status: 'cancelled' }, { transaction });
        
        // Update delivery record to cancelled
        await Delivery.update({ status: 'failed', notes: 'Order cancelled by buyer' }, { where: { order_id: order.id }, transaction });

        await transaction.commit();

        return res.status(200).json({ success: true, message: 'Order successfully cancelled and stocks restored.' });

    } catch (error) {
        await transaction.rollback();
        console.error(error);
        return res.status(500).json({ error: 'Error cancelling order', details: error.message });
    }
};