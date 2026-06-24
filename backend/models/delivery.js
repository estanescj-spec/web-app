module.exports = (sequelize, DataTypes) => {
    const Delivery = sequelize.define('Delivery', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        order_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'orders',
                key: 'id'
            }
        },
        courier_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        status: {
            type: DataTypes.ENUM('assigned', 'picked_up', 'out_for_delivery', 'delivered', 'failed'),
            allowNull: false,
            defaultValue: 'assigned'
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        failed_attempts: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        }
    }, {
        tableName: 'deliveries',
        timestamps: true,
        underscored: true
    });

    return Delivery;
};
