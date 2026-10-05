"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class PasskeyCredential extends Model {
    static associate(models) {
      PasskeyCredential.belongsTo(models.User, { foreignKey: "user_id", as: "user" });
    }
  }

  PasskeyCredential.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    user_id: { type: DataTypes.UUID, allowNull: false },
    credential_id: { type: DataTypes.TEXT, allowNull: false, unique: true },
    public_key: { type: DataTypes.BLOB, allowNull: false },
    counter: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
    transports: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    device_type: { type: DataTypes.STRING(20), allowNull: false },
    backed_up: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    name: { type: DataTypes.STRING(80), allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    last_used_at: { type: DataTypes.DATE, allowNull: true },
  }, {
    sequelize,
    modelName: "PasskeyCredential",
    tableName: "passkey_credentials",
    timestamps: false,
  });

  return PasskeyCredential;
};
