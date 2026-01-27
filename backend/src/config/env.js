require("dotenv").config();

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),

  db: {
    url: process.env.DATABASE_URL || null,
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME || "airbnb_app",
    user: process.env.DB_USER || "postgres",
    pass: process.env.DB_PASSWORD || "852003",
  },
};
