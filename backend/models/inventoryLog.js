module.exports = (sequelize, DataTypes) => {
    const InventoryLog = sequelize.define('InventoryLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'products',
                key: 'id'
            }
        },
        change_type: {
            type: DataTypes.ENUM('purchase', 'cancellation', 'restock', 'return'),
            allowNull: false
        },
        quantity_change: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        previous_stock: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        new_stock: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        }
    }, {
        tableName: 'inventory_logs',
        timestamps: true,
        underscored: true
    });

    return InventoryLog;
};
