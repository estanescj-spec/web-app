const db = require('../models');
const Delivery = db.Delivery;
const Order = db.Order;
const User = db.User;
const sendEmail = require('../utils/sendEmail');

const getUserId = (req) => req.user?.id || req.body?.user?.id;

// Admin assigns courier to an order delivery (FR6.1)
exports.assignCourier = async (req, res) => {
    try {
        const { orderId, courierId } = req.body;

        // Only admins may assign couriers
        const caller = await User.findByPk(getUserId(req));
        if (!caller || caller.role !== 'admin') {
            return res.status(403).json({ error: 'Admin privileges required' });
        }

        if (!orderId || !courierId) {
            return res.status(400).json({ error: 'Order ID and Courier ID are required' });
        }

        const delivery = await Delivery.findOne({ where: { order_id: orderId } });
        if (!delivery) {
            return res.status(404).json({ error: 'Delivery record not found for this order' });
        }

        const courier = await User.findByPk(courierId);
        if (!courier) {
            return res.status(404).json({ error: 'Courier user not found' });
        }

        const oldCourierId = delivery.courier_id;
        await delivery.update({
            courier_id: courierId,
            status: 'assigned',
            notes: `Assigned to courier ${courier.name}`
        });

        // Notify affected courier (FR6.5)
        await sendEmail({
            email: courier.email,
            subject: 'New Delivery Assigned',
            message: `Hi ${courier.name}, you have been assigned to deliver Order ID ${orderId}. Please check your dashboard.`
        });

        // Notify old courier if reassigned (FR6.5)
        if (oldCourierId && oldCourierId !== parseInt(courierId)) {
            const oldCourier = await User.findByPk(oldCourierId);
            if (oldCourier) {
                await sendEmail({
                    email: oldCourier.email,
                    subject: 'Delivery Reassigned',
                    message: `Hi ${oldCourier.name}, Order ID ${orderId} has been reassigned to another delivery staff.`
                });
            }
        }

        return res.status(200).json({ success: true, message: 'Courier assigned successfully', delivery });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error assigning courier' });
    }
};

// Courier gets their assigned deliveries (FR6.2)
exports.getCourierDeliveries = async (req, res) => {
    try {
        const courierId = getUserId(req);
        const deliveries = await Delivery.findAll({
            where: { courier_id: courierId },
            include: [
                {
                    model: Order,
                    include: [{ model: User, as: 'Buyer', attributes: ['name', 'email'] }]
                }
            ],
            order: [['updated_at', 'DESC']]
        });
        return res.status(200).json({ success: true, rows: deliveries });
    } catch (error) {
        return res.status(500).json({ error: 'Error fetching deliveries' });
    }
};

// Courier updates delivery status (FR6.3, FR6.4, FR6.6)
exports.updateDeliveryStatus = async (req, res) => {
    try {
        const courierId = getUserId(req);
        const { id } = req.params; // Delivery ID
        const { status, notes } = req.body;

        if (!['assigned', 'picked_up', 'out_for_delivery', 'delivered', 'failed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid delivery status' });
        }

        const delivery = await Delivery.findOne({
            where: { id, courier_id: courierId },
            include: [{ model: Order, include: [{ model: User, as: 'Buyer' }] }]
        });

        if (!delivery) {
            return res.status(404).json({ error: 'Delivery assignment not found' });
        }

        const updates = { status, notes };

        if (status === 'failed') {
            updates.failed_attempts = delivery.failed_attempts + 1;
        }

        await delivery.update(updates);

        // Map delivery status to order status (FR6.4)
        let orderStatus = delivery.Order.status;
        if (status === 'picked_up' || status === 'out_for_delivery') {
            orderStatus = 'shipped';
        } else if (status === 'delivered') {
            orderStatus = 'delivered';
        } else if (status === 'failed') {
            // Keep order as shipped but flag issue
            orderStatus = 'shipped';
        }

        await delivery.Order.update({ status: orderStatus });

        // Email buyer about shipping update (FR6.4, FR6.6)
        if (delivery.Order.Buyer) {
            let emailMsg = `Hi ${delivery.Order.Buyer.name}, your delivery status has been updated to "${status.toUpperCase()}".`;
            if (status === 'failed') {
                emailMsg += ` Reason: ${notes || 'Undeliverable address/recipient unavailable'}. We will attempt re-delivery soon.`;
            }
            await sendEmail({
                email: delivery.Order.Buyer.email,
                subject: `Delivery Tracking Alert - Order ID ${delivery.Order.id}`,
                message: emailMsg
            });
        }

        return res.status(200).json({ success: true, message: 'Delivery status updated', delivery });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error updating delivery status' });
    }
};
