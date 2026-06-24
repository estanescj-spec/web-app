module.exports = (sequelize, DataTypes) => {
    const Order = sequelize.define('Order', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        buyer_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        address_line: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        zipcode: {
            type: DataTypes.STRING(20),
            allowNull: false
        },
        city: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        total_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        promo_code: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        payment_method: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'Cash on Delivery'
        },
        status: {
            type: DataTypes.ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
            allowNull: false,
            defaultValue: 'pending'
        },
        date_placed: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        date_shipped: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'orders',
        timestamps: true,
        underscored: true
    });

    return Order;
};
