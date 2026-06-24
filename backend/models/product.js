module.exports = (sequelize, DataTypes) => {
    const Product = sequelize.define('Product', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        category_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'categories',
                key: 'id'
            }
        },
        seller_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        cost_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        sell_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        stock_quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        color: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        storage: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        warranty: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            allowNull: false,
            defaultValue: 'pending'
        },
        is_featured: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        img_path: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    }, {
        tableName: 'products',
        timestamps: true,
        underscored: true
    });

    return Product;
};
