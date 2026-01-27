const express = require("express");
const env = require("./config/env");
const { connectDb } = require("./config/database");
const routes = require("./routes");

const app = express();

app.use(express.json());
app.use("/api", routes);

async function start() {
  await connectDb();
  app.listen(env.port, () => console.log(`🚀 API running on :${env.port}`));
}

start();

module.exports = app;
