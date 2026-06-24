module.exports = (sequelize, DataTypes) => {
    const PromoCode = sequelize.define('PromoCode', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        },
        discount_percentage: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 0,
                max: 100
            }
        },
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        }
    }, {
        tableName: 'promo_codes',
        timestamps: false
    });

    return PromoCode;
};
