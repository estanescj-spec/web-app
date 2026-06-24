const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

// Load model definers
const UserDefiner = require('./user');
const StoreProfileDefiner = require('./storeProfile');
const CustomerProfileDefiner = require('./customerProfile');
const AddressDefiner = require('./address');
const CategoryDefiner = require('./category');
const ProductDefiner = require('./product');
const WishlistDefiner = require('./wishlist');
const ReviewDefiner = require('./review');
const OrderDefiner = require('./order');
const OrderLineDefiner = require('./orderLine');
const DeliveryDefiner = require('./delivery');
const InventoryLogDefiner = require('./inventoryLog');
const AdminLogDefiner = require('./adminLog');
const PromoCodeDefiner = require('./promoCode');

// Initialize database object
const db = {};

db.User = UserDefiner(sequelize, DataTypes);
db.StoreProfile = StoreProfileDefiner(sequelize, DataTypes);
db.CustomerProfile = CustomerProfileDefiner(sequelize, DataTypes);
db.Address = AddressDefiner(sequelize, DataTypes);
db.Category = CategoryDefiner(sequelize, DataTypes);
db.Product = ProductDefiner(sequelize, DataTypes);
db.Wishlist = WishlistDefiner(sequelize, DataTypes);
db.Review = ReviewDefiner(sequelize, DataTypes);
db.Order = OrderDefiner(sequelize, DataTypes);
db.OrderLine = OrderLineDefiner(sequelize, DataTypes);
db.Delivery = DeliveryDefiner(sequelize, DataTypes);
db.InventoryLog = InventoryLogDefiner(sequelize, DataTypes);
db.AdminLog = AdminLogDefiner(sequelize, DataTypes);
db.PromoCode = PromoCodeDefiner(sequelize, DataTypes);

// ASSOCIATIONS

// User <-> Profiles
db.User.hasOne(db.CustomerProfile, { foreignKey: 'user_id', onDelete: 'CASCADE' });
db.CustomerProfile.belongsTo(db.User, { foreignKey: 'user_id' });

db.User.hasOne(db.StoreProfile, { foreignKey: 'user_id', onDelete: 'CASCADE' });
db.StoreProfile.belongsTo(db.User, { foreignKey: 'user_id' });

// User <-> Addresses
db.User.hasMany(db.Address, { foreignKey: 'user_id', onDelete: 'CASCADE' });
db.Address.belongsTo(db.User, { foreignKey: 'user_id' });

// Category <-> Product
db.Category.hasMany(db.Product, { foreignKey: 'category_id', onDelete: 'RESTRICT' });
db.Product.belongsTo(db.Category, { foreignKey: 'category_id' });

// Seller (User) <-> Product
db.User.hasMany(db.Product, { as: 'Listings', foreignKey: 'seller_id', onDelete: 'CASCADE' });
db.Product.belongsTo(db.User, { as: 'Seller', foreignKey: 'seller_id' });

// Wishlist Associations
db.User.hasMany(db.Wishlist, { foreignKey: 'user_id', onDelete: 'CASCADE' });
db.Wishlist.belongsTo(db.User, { foreignKey: 'user_id' });
db.Product.hasMany(db.Wishlist, { foreignKey: 'product_id', onDelete: 'CASCADE' });
db.Wishlist.belongsTo(db.Product, { foreignKey: 'product_id' });

// Review Associations
db.Product.hasMany(db.Review, { foreignKey: 'product_id', onDelete: 'CASCADE' });
db.Review.belongsTo(db.Product, { foreignKey: 'product_id' });
db.User.hasMany(db.Review, { foreignKey: 'customer_id', onDelete: 'CASCADE' });
db.Review.belongsTo(db.User, { as: 'Customer', foreignKey: 'customer_id' });

// Order Associations
db.User.hasMany(db.Order, { foreignKey: 'buyer_id', onDelete: 'CASCADE' });
db.Order.belongsTo(db.User, { as: 'Buyer', foreignKey: 'buyer_id' });

db.Order.hasMany(db.OrderLine, { foreignKey: 'order_id', onDelete: 'CASCADE' });
db.OrderLine.belongsTo(db.Order, { foreignKey: 'order_id' });

db.Product.hasMany(db.OrderLine, { foreignKey: 'product_id', onDelete: 'RESTRICT' });
db.OrderLine.belongsTo(db.Product, { foreignKey: 'product_id' });

// Delivery Associations
db.Order.hasOne(db.Delivery, { foreignKey: 'order_id', onDelete: 'CASCADE' });
db.Delivery.belongsTo(db.Order, { foreignKey: 'order_id' });

db.User.hasMany(db.Delivery, { foreignKey: 'courier_id', onDelete: 'SET NULL' });
db.Delivery.belongsTo(db.User, { as: 'Courier', foreignKey: 'courier_id' });

// Inventory Log Associations
db.Product.hasMany(db.InventoryLog, { foreignKey: 'product_id', onDelete: 'CASCADE' });
db.InventoryLog.belongsTo(db.Product, { foreignKey: 'product_id' });

db.User.hasMany(db.InventoryLog, { foreignKey: 'user_id', onDelete: 'SET NULL' });
db.InventoryLog.belongsTo(db.User, { foreignKey: 'user_id' });

// Admin Log Associations
db.User.hasMany(db.AdminLog, { foreignKey: 'admin_id', onDelete: 'CASCADE' });
db.AdminLog.belongsTo(db.User, { as: 'Admin', foreignKey: 'admin_id' });

db.sequelize = sequelize;
db.Sequelize = require('sequelize');

module.exports = db;