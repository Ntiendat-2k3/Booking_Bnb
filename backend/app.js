var createError = require("http-errors");
var express = require("express");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const passport = require("passport");
const cors = require("cors");
require("dotenv").config();

const apiRouter = require("./routes/api");
const passportLocal = require("./passports/passport.local");
const passportGoogle = require("./passports/passport.google");
const { sequelize } = require("./models/index");

var app = express();

// CORS for FE
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Passport (API only => no session)
app.use(passport.initialize());
passport.use("local", passportLocal);
passport.use("google", passportGoogle);

// Health + API
app.get("/health", async (_req, res) => {
  try {
    await sequelize.authenticate();
    return res.json({ ok: true, db: "connected" });
  } catch {
    return res.status(500).json({ ok: false, db: "disconnected" });
  }
});
app.use("/api", apiRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler (API-friendly)
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    status: "error",
    message: err.message || "Server error",
  });
});

module.exports = app;
