module.exports = (sequelize, DataTypes) => {
    const StoreProfile = sequelize.define('StoreProfile', {
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
        store_name: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        store_description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        is_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {
        tableName: 'store_profiles',
        timestamps: true,
        underscored: true
    });

    return StoreProfile;
};
