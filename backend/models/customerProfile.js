module.exports = (sequelize, DataTypes) => {
    const CustomerProfile = sequelize.define('CustomerProfile', {
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
        fname: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        lname: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        image_path: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    }, {
        tableName: 'customer_profiles',
        timestamps: true,
        underscored: true
    });

    return CustomerProfile;
};
