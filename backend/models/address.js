module.exports = (sequelize, DataTypes) => {
    const Address = sequelize.define('Address', {
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
        is_default: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'addresses',
        timestamps: true,
        underscored: true
    });

    return Address;
};
