const db = require('../models');
const Order = db.Order;
const OrderLine = db.OrderLine;
const Product = db.Product;
const Category = db.Category;
const User = db.User;
const StoreProfile = db.StoreProfile;
const Review = db.Review;
const Address = db.Address;
const { Op } = require('sequelize');

const getUserId = (req) => req.user?.id || req.body?.user?.id;

// Dashboard chart: customers per city (admin)
exports.getAddressChartData = async (req, res) => {
    try {
        const caller = await User.findByPk(getUserId(req));
        if (!caller || caller.role !== 'admin') {
            return res.status(403).json({ error: 'Admin privileges required' });
        }

        const addresses = await Address.findAll();
        const cityCounts = {};

        addresses.forEach(addr => {
            const city = addr.city || 'Unknown';
            cityCounts[city] = (cityCounts[city] || 0) + 1;
        });

        const rows = Object.entries(cityCounts).map(([city, total]) => ({
            addressline: city,
            total
        }));

        return res.status(200).json({ success: true, rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error generating address chart data' });
    }
};

// Dashboard chart: monthly sales (admin)
exports.getSalesChartData = async (req, res) => {
    try {
        const caller = await User.findByPk(getUserId(req));
        if (!caller || caller.role !== 'admin') {
            return res.status(403).json({ error: 'Admin privileges required' });
        }

        const orders = await Order.findAll({
            where: { status: { [Op.ne]: 'cancelled' } }
        });

        const monthTotals = {};
        orders.forEach(order => {
            const date = new Date(order.date_placed);
            const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            monthTotals[month] = (monthTotals[month] || 0) + parseFloat(order.total_price || 0);
        });

        const rows = Object.entries(monthTotals).map(([month, total]) => ({
            month,
            total
        }));

        return res.status(200).json({ success: true, rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error generating sales chart data' });
    }
};

// Dashboard chart: top sold products (admin)
exports.getItemsChartData = async (req, res) => {
    try {
        const caller = await User.findByPk(getUserId(req));
        if (!caller || caller.role !== 'admin') {
            return res.status(403).json({ error: 'Admin privileges required' });
        }

        const orderLines = await OrderLine.findAll({
            include: [{ model: Product }]
        });

        const itemCounts = {};
        orderLines.forEach(line => {
            const name = line.Product?.title || `Product ${line.product_id}`;
            itemCounts[name] = (itemCounts[name] || 0) + line.quantity;
        });

        const rows = Object.entries(itemCounts).map(([items, total]) => ({
            items,
            total
        }));

        return res.status(200).json({ success: true, rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error generating items chart data' });
    }
};

// Sales Report Data (FR8.1)
exports.getSalesReportData = async (req, res) => {
    try {
        const userId = getUserId(req);
        const user = await User.findByPk(userId);

        let whereClause = {};
        // If regular user (seller), filter orders to only include their products
        if (user.role !== 'admin') {
            whereClause['$OrderLines.Product.seller_id$'] = userId;
        }

        const orders = await Order.findAll({
            where: { status: { [Op.ne]: 'cancelled' } },
            include: [
                {
                    model: OrderLine,
                    include: [{ model: Product }]
                },
                { model: User, as: 'Buyer', attributes: ['name', 'email'] }
            ]
        });

        // Parse metrics
        let totalRevenue = 0;
        let totalOrders = 0;
        const salesByMonth = {};

        orders.forEach(order => {
            let orderTotalForUser = 0;
            let hasProduct = false;

            order.OrderLines.forEach(line => {
                if (user.role === 'admin' || line.Product?.seller_id === userId) {
                    orderTotalForUser += parseFloat(line.price_at_purchase) * line.quantity;
                    hasProduct = true;
                }
            });

            if (hasProduct) {
                totalRevenue += orderTotalForUser;
                totalOrders++;

                const date = new Date(order.date_placed);
                const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
                salesByMonth[month] = (salesByMonth[month] || 0) + orderTotalForUser;
            }
        });

        return res.status(200).json({
            success: true,
            totalRevenue,
            totalOrders,
            salesByMonth,
            rawOrders: orders
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error generating sales report' });
    }
};

// Inventory Report Data (FR8.2)
exports.getInventoryReportData = async (req, res) => {
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

        const totalStock = products.reduce((sum, p) => sum + p.stock_quantity, 0);
        const totalValuation = products.reduce((sum, p) => sum + (p.stock_quantity * parseFloat(p.sell_price)), 0);
        const lowStockItems = products.filter(p => p.stock_quantity <= 5);

        return res.status(200).json({
            success: true,
            totalItems: products.length,
            totalStock,
            totalValuation,
            lowStockCount: lowStockItems.length,
            products,
            lowStockItems
        });
    } catch (error) {
        return res.status(500).json({ error: 'Error generating inventory report' });
    }
};

// Product Trends Report (FR8.3)
exports.getProductTrendsData = async (req, res) => {
    try {
        const userId = getUserId(req);
        const user = await User.findByPk(userId);

        let whereClause = {};
        if (user.role !== 'admin') {
            whereClause.seller_id = userId;
        }

        const products = await Product.findAll({
            where: whereClause,
            include: [
                { model: OrderLine },
                { model: Category }
            ]
        });

        const trends = products.map(p => {
            const unitsSold = p.OrderLines.reduce((sum, l) => sum + l.quantity, 0);
            const revenue = p.OrderLines.reduce((sum, l) => sum + (l.quantity * parseFloat(l.price_at_purchase)), 0);
            return {
                id: p.id,
                title: p.title,
                category: p.Category?.name,
                unitsSold,
                revenue
            };
        }).sort((a, b) => b.unitsSold - a.unitsSold);

        return res.status(200).json({ success: true, trends });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error generating trends report' });
    }
};

// Seller Performance Report (FR8.4)
exports.getSellerPerformanceData = async (req, res) => {
    try {
        const sellers = await User.findAll({
            where: { role: 'user' },
            include: [
                { model: StoreProfile },
                { 
                    model: Product, 
                    as: 'Listings',
                    include: [{ model: Review }]
                }
            ]
        });

        const performance = sellers.map(seller => {
            if (!seller.StoreProfile) return null;

            const listings = seller.Listings || [];
            const approvedCount = listings.filter(l => l.status === 'approved').length;
            
            let totalReviews = 0;
            let ratingSum = 0;
            listings.forEach(l => {
                l.Reviews.forEach(r => {
                    totalReviews++;
                    ratingSum += r.rating;
                });
            });

            const avgRating = totalReviews > 0 ? (ratingSum / totalReviews).toFixed(1) : 'N/A';

            return {
                sellerId: seller.id,
                sellerName: seller.name,
                storeName: seller.StoreProfile.store_name,
                isVerified: seller.StoreProfile.is_verified,
                listingsCount: listings.length,
                approvedListings: approvedCount,
                averageRating: avgRating,
                totalReviews
            };
        }).filter(item => item !== null);

        return res.status(200).json({ success: true, performance });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Error fetching seller performance' });
    }
};

// Export to CSV (FR8.5)
exports.exportCSV = async (req, res) => {
    try {
        const { type } = req.query; // 'sales', 'inventory', 'trends', 'performance'
        const userId = getUserId(req);
        const user = await User.findByPk(userId);

        let csvContent = "";
        let filename = `${type}_report.csv`;

        if (type === 'sales') {
            let whereClause = {};
            if (user.role !== 'admin') {
                whereClause['$OrderLines.Product.seller_id$'] = userId;
            }

            const orders = await Order.findAll({
                include: [
                    {
                        model: OrderLine,
                        include: [{ model: Product }]
                    },
                    { model: User, as: 'Buyer', attributes: ['name', 'email'] }
                ]
            });

            csvContent = "Order ID,Buyer Name,Buyer Email,Total Price,Status,Date Placed,Items\n";
            orders.forEach(o => {
                const itemNames = o.OrderLines.map(l => `${l.Product?.title || 'Unknown'} (x${l.quantity})`).join('; ');
                csvContent += `${o.id},"${o.Buyer?.name || ''}","${o.Buyer?.email || ''}",${o.total_price},${o.status},"${o.date_placed}","${itemNames}"\n`;
            });

        } else if (type === 'inventory') {
            let whereClause = {};
            if (user.role !== 'admin') {
                whereClause.seller_id = userId;
            }
            const products = await Product.findAll({
                where: whereClause,
                include: [{ model: Category }]
            });

            csvContent = "Product ID,Title,Category,Cost Price,Sell Price,Stock Quantity,Color,Storage,Status\n";
            products.forEach(p => {
                csvContent += `${p.id},"${p.title}","${p.Category?.name || ''}",${p.cost_price},${p.sell_price},${p.stock_quantity},"${p.color || ''}","${p.storage || ''}",${p.status}\n`;
            });

        } else if (type === 'trends') {
            let whereClause = {};
            if (user.role !== 'admin') {
                whereClause.seller_id = userId;
            }
            const products = await Product.findAll({
                where: whereClause,
                include: [{ model: OrderLine }, { model: Category }]
            });

            csvContent = "Product ID,Title,Category,Units Sold,Revenue Generated\n";
            products.forEach(p => {
                const unitsSold = p.OrderLines.reduce((sum, l) => sum + l.quantity, 0);
                const revenue = p.OrderLines.reduce((sum, l) => sum + (l.quantity * parseFloat(l.price_at_purchase)), 0);
                csvContent += `${p.id},"${p.title}","${p.Category?.name || ''}",${unitsSold},${revenue.toFixed(2)}\n`;
            });

        } else if (type === 'performance') {
            if (user.role !== 'admin') {
                return res.status(403).json({ error: 'Access denied' });
            }
            const sellers = await User.findAll({
                where: { role: 'user' },
                include: [
                    { model: StoreProfile },
                    { model: Product, as: 'Listings', include: [{ model: Review }] }
                ]
            });

            csvContent = "Seller ID,Seller Name,Store Name,Is Verified,Listings Count,Avg Rating\n";
            sellers.forEach(seller => {
                if (!seller.StoreProfile) return;
                const listings = seller.Listings || [];
                let totalReviews = 0;
                let ratingSum = 0;
                listings.forEach(l => {
                    l.Reviews.forEach(r => {
                        totalReviews++;
                        ratingSum += r.rating;
                    });
                });
                const avgRating = totalReviews > 0 ? (ratingSum / totalReviews).toFixed(1) : 'N/A';
                csvContent += `${seller.id},"${seller.name}","${seller.StoreProfile.store_name}",${seller.StoreProfile.is_verified},${listings.length},${avgRating}\n`;
            });
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.status(200).send(csvContent);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'CSV export error' });
    }
};

// Export to Print PDF HTML Page (FR8.5)
exports.exportPDFHtml = async (req, res) => {
    try {
        const { type } = req.query;
        const userId = getUserId(req);
        const user = await User.findByPk(userId);

        let reportTitle = `${type.toUpperCase()} REPORT - MacSphere`;
        let htmlTableContent = "";

        if (type === 'sales') {
            let whereClause = {};
            if (user.role !== 'admin') {
                whereClause['$OrderLines.Product.seller_id$'] = userId;
            }
            const orders = await Order.findAll({
                include: [
                    { model: OrderLine, include: [{ model: Product }] },
                    { model: User, as: 'Buyer', attributes: ['name'] }
                ]
            });

            htmlTableContent = `
                <tr>
                    <th>Order ID</th>
                    <th>Buyer</th>
                    <th>Total Price</th>
                    <th>Status</th>
                    <th>Date Placed</th>
                </tr>
            `;
            orders.forEach(o => {
                htmlTableContent += `
                    <tr>
                        <td>${o.id}</td>
                        <td>${o.Buyer?.name || 'Guest'}</td>
                        <td>₱${parseFloat(o.total_price).toFixed(2)}</td>
                        <td>${o.status.toUpperCase()}</td>
                        <td>${new Date(o.date_placed).toLocaleDateString()}</td>
                    </tr>
                `;
            });

        } else if (type === 'inventory') {
            let whereClause = {};
            if (user.role !== 'admin') {
                whereClause.seller_id = userId;
            }
            const products = await Product.findAll({
                where: whereClause,
                include: [{ model: Category }]
            });

            htmlTableContent = `
                <tr>
                    <th>ID</th>
                    <th>Product Title</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Color</th>
                    <th>Storage</th>
                </tr>
            `;
            products.forEach(p => {
                htmlTableContent += `
                    <tr>
                        <td>${p.id}</td>
                        <td>${p.title}</td>
                        <td>${p.Category?.name || ''}</td>
                        <td>₱${parseFloat(p.sell_price).toFixed(2)}</td>
                        <td>${p.stock_quantity}</td>
                        <td>${p.color || 'N/A'}</td>
                        <td>${p.storage || 'N/A'}</td>
                    </tr>
                `;
            });
        } else {
            htmlTableContent = "<tr><td>No data available.</td></tr>";
        }

        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${reportTitle}</title>
                <style>
                    body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; }
                    h1 { text-align: center; color: #111; margin-bottom: 30px; font-weight: 300; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th { background-color: #f5f5f7; font-weight: bold; }
                    tr:nth-child(even) { background-color: #fafafa; }
                    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #888; }
                    @media print {
                        .print-btn { display: none; }
                    }
                    .print-btn {
                        display: block; width: 120px; margin: 0 auto 30px auto; padding: 10px;
                        background: #0071e3; color: white; border: none; border-radius: 5px;
                        text-align: center; cursor: pointer; font-size: 14px;
                    }
                </style>
            </head>
            <body>
                <button class="print-btn" onclick="window.print()">Print to PDF</button>
                <h1>${reportTitle}</h1>
                <p>Generated on: ${new Date().toLocaleString()}</p>
                <p>Operator ID: ${user.id} (${user.name})</p>
                <table>
                    ${htmlTableContent}
                </table>
                <div class="footer">
                    <p>© 2026 MacSphere Apple Products E-Commerce Platform. Confidential audit document.</p>
                </div>
                <script>
                    // Auto open print dialog
                    window.onload = function() {
                        setTimeout(function() { window.print(); }, 500);
                    }
                </script>
            </body>
            </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(fullHtml);

    } catch (error) {
        console.error(error);
        return res.status(500).send("Error exporting PDF report");
    }
};
