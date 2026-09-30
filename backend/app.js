var createError = require("http-errors");
var express = require("express");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const passport = require("passport");
const cors = require("cors");
require("dotenv").config();

const { connectRedis } = require("./utils/redis");

const apiRouter = require("./routes/api");
const passportLocal = require("./passports/passport.local");
const passportGoogle = require("./passports/passport.google");
const { sequelize } = require("./models/index");

var app = express();
app.set("trust proxy", 1);

connectRedis().catch(() => {});

const helmet = require("helmet");

const allowedOrigins = (
  process.env.CORS_ORIGINS ||
  process.env.FRONTEND_URL ||
  ""
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Cho phép client API không gửi Origin.
      if (!origin) return callback(null, true);

      if (allowedOrigins.length === 0) return callback(null, false);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(Object.assign(new Error("Not allowed by CORS"), { status: 403 }));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  }),
);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

app.use(logger(process.env.NODE_ENV === "production" ? "combined" : "dev"));
// Stripe cần raw body để kiểm tra chữ ký trước các parser JSON.
app.use("/api/v1/payments/stripe/webhook", express.raw({ type: 'application/json' }));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());

app.use(passport.initialize());
passport.use("local", passportLocal);
passport.use("google", passportGoogle);

app.get("/", (_req, res) => res.json({ status: "ok" }));

app.get("/health", async (_req, res) => {
  try {
    await sequelize.authenticate();
    return res.json({ ok: true, db: "connected" });
  } catch {
    return res.status(500).json({ ok: false, db: "disconnected" });
  }
});
app.use("/api", apiRouter);

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(require("./middlewares/error.middleware"));

module.exports = app;
