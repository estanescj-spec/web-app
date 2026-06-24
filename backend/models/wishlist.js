module.exports = (sequelize, DataTypes) => {
    const Wishlist = sequelize.define('Wishlist', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'products',
                key: 'id'
            }
        },
        wishlist_category: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: 'General'
        },
        notify_discounts: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        notify_restock: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'wishlists',
        timestamps: true,
        underscored: true
    });

    return Wishlist;
};
