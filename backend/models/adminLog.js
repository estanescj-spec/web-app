module.exports = (sequelize, DataTypes) => {
    const AdminLog = sequelize.define('AdminLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        admin_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        action_type: {
            type: DataTypes.STRING(100),
            allowNull: false
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        tableName: 'admin_logs',
        timestamps: true,
        underscored: true
    });

    return AdminLog;
};
