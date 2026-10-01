const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createRequire } = require("node:module");
const { randomUUID } = require("node:crypto");
const Sequelize = require("sequelize");
const root = path.resolve(__dirname, "..");

/** Nạp source thật với model/dịch vụ ngoài thay thế; không đọc .env và không tạo kết nối mạng. */
function loadBackend(file, models, overrides = {}, env = {}) {
  const cache = new Map();
  const replacements = Object.fromEntries(Object.entries(overrides).map(([key, value]) => [path.resolve(root, key), value]));
  const load = (filename) => {
    if (filename === path.join(root, "models", "index.js")) return models;
    if (filename in replacements) return replacements[filename];
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const nativeRequire = createRequire(filename);
    const requireMock = (name) => {
      if (name === "dotenv") return { config: () => ({}) };
      if (!name.startsWith(".")) return nativeRequire(name);
      const resolved = nativeRequire.resolve(name);
      // Joi dùng instanceof RegExp; schema phải cùng realm với thư viện, không cần model hay .env.
      if (resolved.endsWith(".schema.js")) return nativeRequire(resolved);
      return load(resolved);
    };
    vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
      module, exports: module.exports, require: requireMock, __filename: filename, __dirname: path.dirname(filename),
      process: { env: { JWT_SECRET: "test-secret-only", ...env } }, console: { log() {}, warn() {}, error() {} },
      Buffer, Date, URL, AbortSignal, fetch, setInterval, clearInterval,
    }, { filename });
    return module.exports;
  };
  return load(path.resolve(root, file));
}

/** Mô phỏng commit/rollback và khóa từng row, không tuần tự hóa toàn bộ transaction. */
function database(seed = {}) {
  const tables = new Map();
  const locks = new Map();
  const failures = new Map();
  const calls = [];
  const names = ["Listing", "Booking", "Payment", "User", "Notification", "UploadedAsset", "ListingImage", "Amenity", "ListingAmenity", "PaymentMethod", "UserSetting", "RefreshToken", "BackgroundJob"];
  for (const name of names) tables.set(name, new Map((seed[name] || []).map((row) => [row.id || row.public_id || row.user_id, { ...row }])));
  const keyOf = (row) => row.id || row.public_id || row.user_id;
  const view = (name, tx) => {
    const rows = new Map(tables.get(name));
    for (const [key, row] of tx?.writes.get(name) || []) row === null ? rows.delete(key) : rows.set(key, row);
    return [...rows.values()];
  };
  const lock = async (key, tx) => {
    if (tx.held.has(key)) return;
    const previous = locks.get(key) || Promise.resolve();
    let release;
    const current = new Promise((resolve) => { release = resolve; });
    locks.set(key, current);
    await previous;
    tx.held.add(key);
    tx.releases.push(() => { release(); if (locks.get(key) === current) locks.delete(key); });
  };
  const matchValue = (value, expected) => {
    if (Array.isArray(expected)) return expected.includes(value);
    if (expected && typeof expected === "object" && !(expected instanceof Date)) {
      return Reflect.ownKeys(expected).every((op) => {
        const right = expected[op];
        if (op === Sequelize.Op.ne) return value !== right;
        if (op === Sequelize.Op.in) return right.includes(value);
        if (op === Sequelize.Op.lt) return value < right;
        if (op === Sequelize.Op.lte) return value <= right;
        if (op === Sequelize.Op.gt) return value > right;
        if (op === Sequelize.Op.gte) return value >= right;
        return true;
      });
    }
    return expected === null ? value == null : value === expected;
  };
  const matches = (row, where = {}) => {
    if (where instanceof Sequelize.Utils.Where && where.attribute?.fn === "lower") {
      return String(row[where.attribute.args[0].col]).toLowerCase() === where.logic;
    }
    return Reflect.ownKeys(where).every((key) => {
      if (key === Sequelize.Op.or) return where[key].some((part) => matches(row, part));
      if (key === Sequelize.Op.and) return Array.isArray(where[key]) ? where[key].every((part) => matches(row, part)) : true;
      return matchValue(row[key], where[key]);
    });
  };
  const write = (name, key, row, tx) => {
    if (failures.has(name)) { const error = failures.get(name); failures.delete(name); throw error; }
    if (tx) { if (!tx.writes.has(name)) tx.writes.set(name, new Map()); tx.writes.get(name).set(key, row); }
    else row === null ? tables.get(name).delete(key) : tables.get(name).set(key, row);
  };
  const wrap = (name, data, tx) => {
    if (!data) return null;
    const row = { ...data };
    Object.defineProperties(row, {
      toJSON: { value: () => ({ ...row }) },
      update: { value: async (patch, opts = {}) => { Object.assign(row, patch); write(name, keyOf(row), { ...row }, opts.transaction || tx); return row; } },
      save: { value: async (opts = {}) => { write(name, keyOf(row), { ...row }, opts.transaction || tx); return row; } },
      destroy: { value: async (opts = {}) => write(name, keyOf(row), null, opts.transaction || tx) },
    });
    return row;
  };
  const models = { Sequelize };
  for (const name of names) {
    const find = async (options = {}) => {
      calls.push({ model: name, operation: "find", options });
      if (options.lock && options.transaction) {
        const candidate = view(name, options.transaction).find((row) => matches(row, options.where));
        if (candidate) await lock(`${name}:${keyOf(candidate)}`, options.transaction);
      }
      let rows = view(name, options.transaction).filter((row) => matches(row, options.where));
      if (options.offset) rows = rows.slice(options.offset);
      if (options.limit) rows = rows.slice(0, options.limit);
      return rows.map((row) => wrap(name, row, options.transaction));
    };
    models[name] = {
      findAll: find,
      findOne: async (options) => (await find(options))[0] || null,
      findByPk: async (key, options = {}) => {
        if (options.lock && options.transaction) await lock(`${name}:${key}`, options.transaction);
        return wrap(name, view(name, options.transaction).find((row) => keyOf(row) === key), options.transaction);
      },
      findAndCountAll: async (options) => ({ rows: await find(options), count: view(name, options.transaction).filter((row) => matches(row, options.where)).length }),
      count: async (options = {}) => (await find(options)).length,
      max: async (column, options) => { const rows = await find(options); return rows.length ? Math.max(...rows.map((row) => row[column])) : null; },
      create: async (data, options = {}) => {
        const row = { id: randomUUID(), created_at: new Date(), status: name === "BackgroundJob" ? "pending" : undefined, attempts: 0, available_at: new Date(), ...data };
        if (name === "UploadedAsset") delete row.id;
        write(name, keyOf(row), row, options.transaction);
        return wrap(name, row, options.transaction);
      },
      update: async (patch, options) => { const rows = await find(options); for (const row of rows) await row.update(patch, options); return [rows.length]; },
      destroy: async (options) => { const rows = await find(options); for (const row of rows) await row.destroy(options); return rows.length; },
      bulkCreate: async (rows, options) => Promise.all(rows.map((row) => models[name].create(row, options))),
      findOrCreate: async ({ where, defaults, ...options }) => { const row = await models[name].findOne({ where, ...options }); return row ? [row, false] : [await models[name].create({ ...defaults, ...where }, options), true]; },
    };
  }
  models.sequelize = {
    async transaction(work) {
      const tx = { writes: new Map(), held: new Set(), releases: [], LOCK: { UPDATE: "UPDATE" } };
      try {
        const result = await work(tx);
        for (const [name, changes] of tx.writes) for (const [key, row] of changes) row === null ? tables.get(name).delete(key) : tables.get(name).set(key, row);
        return result;
      } finally { tx.releases.forEach((release) => release()); }
    },
  };
  return { models, calls, rows: (name) => [...tables.get(name).values()], failNextWrite: (name, error = new Error("Injected DB failure")) => failures.set(name, error) };
}

module.exports = { loadBackend, database };
