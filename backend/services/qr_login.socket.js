/** Socket.IO chỉ báo trạng thái QR; việc cấp phiên luôn nằm ở API HTTP. */
const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { getRedis } = require("../utils/redis");
const qr = require("./qr_login.service");

let io;
let clients = [];

async function attach(server) {
  const origins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "http://localhost:3001")
    .split(",").map((origin) => origin.trim()).filter(Boolean);
  io = new Server(server, { path: "/socket.io", transports: ["websocket"],
    allowRequest: (request, callback) => callback(null, origins.includes(request.headers.origin)) });
  io.of("/qr-login").use(async (socket, next) => {
    try {
      const { id, ticket } = socket.handshake.auth || {};
      if (!await qr.authorizeSocket(id, ticket)) return next(new Error("QR subscription denied"));
      socket.data.pairingId = id;
      return next();
    } catch { return next(new Error("QR subscription denied")); }
  });
  io.of("/qr-login").on("connection", (socket) => socket.join(socket.data.pairingId));

  const redis = getRedis();
  if (redis) {
    const pub = redis.duplicate();
    const sub = redis.duplicate();
    try {
      await Promise.all([pub.connect(), sub.connect()]);
      io.adapter(createAdapter(pub, sub));
      clients = [pub, sub];
    } catch (error) {
      await Promise.allSettled([pub.quit(), sub.quit()]);
      console.error("[qr] Redis adapter unavailable:", error.name);
    }
  }
}

function emitStatus(id, state) {
  io?.of("/qr-login").to(id).emit("qr:status", { state });
}

async function close() {
  io?.disconnectSockets(true);
  await Promise.allSettled(clients.map((client) => client.quit()));
  clients = [];
}

module.exports = { attach, emitStatus, close, getIO: () => io };
