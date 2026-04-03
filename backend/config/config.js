require("dotenv").config();

const baseConfig = {
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  dialect: process.env.DB_DIALECT || "postgres",
  port: process.env.DB_PORT || 5432,
  logging: false,
};

module.exports = {
  development: {
    ...baseConfig,
  },
  test: {
    ...baseConfig,
  },
  production: {
    ...baseConfig,
    pool: {
      max: Number(process.env.DB_POOL_MAX || 20),
      min: Number(process.env.DB_POOL_MIN || 5),
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions:
      process.env.DB_SSL === "true"
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
  },
};
