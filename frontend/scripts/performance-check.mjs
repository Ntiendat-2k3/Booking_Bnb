// Đo HTML streaming và tài nguyên production bằng fixture HTTP, không mở trình duyệt hay chạm dữ liệu thật.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextCli = path.join(frontend, "node_modules/next/dist/bin/next");
const fixturePort = 3850;
const websitePort = 3851;
const apiOrigin = `http://127.0.0.1:${fixturePort}`;
const origin = `http://127.0.0.1:${websitePort}`;
const latency = 350;
const samples = 5;
const argumentsList = process.argv.slice(2);
const outputIndex = argumentsList.indexOf("--output");
const output = outputIndex < 0 ? null : path.resolve(argumentsList[outputIndex + 1]);
const verify = argumentsList.includes("--verify");
const round = (number) => Math.round(number * 10) / 10;
let serverProcess;
let requests = [];
let fixtureBuildStarted = false;

function listing(index, city = "Hồ Chí Minh") {
  return {
    id: `fixture-${index}`, title: `Chỗ ở kiểm thử ${index}`, city, country: "Việt Nam",
    cover_url: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3",
    price_per_night: 850000 + index * 10000, avg_rating: "4.8", review_count: 12,
    lat: 10.77, lng: 106.7, max_guests: 4, bedrooms: 2, beds: 2, bathrooms: 1,
    property_type: "Căn hộ", room_type: "Toàn bộ căn hộ", status: "published",
    description: `Không gian nghỉ dưỡng ${index}. `.repeat(30), address: "Địa chỉ kiểm thử",
    host: { id: "fixture-host", full_name: "Chủ nhà kiểm thử", about: "Thông tin chủ nhà kiểm thử. ".repeat(20), location: city },
    images: [{ id: "fixture-image", url: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3", is_cover: true, sort_order: 0 }],
    amenities: [], created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z",
  };
}

const fixture = http.createServer((request, response) => {
  const url = new URL(request.url, apiOrigin);
  if (request.method !== "GET") { response.writeHead(405).end(); return; }
  requests.push(url.pathname + url.search);
  setTimeout(() => {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    if (url.pathname === "/api/v1/listings") {
      const limit = Number(url.searchParams.get("limit") || 20);
      const city = url.searchParams.get("city");
      const items = city === "Seoul" ? [] : Array.from({ length: limit }, (_, index) => listing(index, city || undefined));
      response.end(JSON.stringify({ status: "success", data: { items, meta: { page: 1, limit, total: items.length, total_pages: 1 } } }));
    } else if (url.pathname.startsWith("/api/v1/listings/")) {
      response.end(JSON.stringify({ status: "success", data: { listing: listing(0), reviews: [] } }));
    } else { response.writeHead(404).end(JSON.stringify({ message: "Fixture không có endpoint này" })); }
  }, latency);
});

function nextProcess(command, fixtureApi = true) {
  return spawn(process.execPath, [nextCli, ...command], {
    cwd: frontend, windowsHide: true,
    env: { ...process.env, ...(fixtureApi ? { NEXT_PUBLIC_API_BASE_URL: apiOrigin } : {}), NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** Build bằng cấu hình fixture khi đo; khôi phục cấu hình dự án trước khi kết thúc. */
async function buildWebsite(fixtureApi) {
  const build = nextProcess(["build"], fixtureApi);
  build.stdout.pipe(process.stdout);
  build.stderr.pipe(process.stderr);
  const buildCode = await new Promise((resolve, reject) => {
    build.once("error", reject);
    build.once("exit", resolve);
  });
  assert.equal(buildCode, 0, "Build production phải thành công");
}

async function stopWebsite() {
  if (!serverProcess) return;
  const child = serverProcess;
  serverProcess = null;
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve) => { child.once("exit", resolve); child.kill(); });
}

async function startWebsite() {
  let logs = "";
  serverProcess = nextProcess(["start", "-p", String(websitePort), "-H", "127.0.0.1"]);
  serverProcess.stdout.on("data", (data) => { logs += data; });
  serverProcess.stderr.on("data", (data) => { logs += data; });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (serverProcess.exitCode !== null) throw new Error(logs);
    if (logs.includes("Ready in")) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Server kiểm thử chưa sẵn sàng: " + logs);
}

/** Chỉ xóa entry cache do fixture riêng này tạo; không đụng cache API của dự án. */
async function clearFixtureCache() {
  const directory = path.join(frontend, ".next/cache/fetch-cache");
  let files;
  try { files = await fs.readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === "ENOENT") return; throw error; }
  for (const file of files) {
    if (!file.isFile()) continue;
    const target = path.resolve(directory, file.name);
    assert.equal(path.dirname(target), directory);
    let entry;
    try { entry = JSON.parse(await fs.readFile(target, "utf8")); } catch { continue; }
    if (entry.data?.url?.startsWith(apiOrigin + "/")) await fs.unlink(target);
  }
}

function measure(route) {
  return new Promise((resolve, reject) => {
    const started = performance.now();
    let firstByteMs, heroMs, html = "";
    const request = http.get(origin + route, { headers: { "Accept-Encoding": "identity", "User-Agent": "Mozilla/5.0 BookingPerformanceFixture" } }, (response) => {
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        firstByteMs ??= performance.now() - started;
        html += chunk;
        if (heroMs === undefined && html.includes('<h1 id="home-title"')) heroMs = performance.now() - started;
      });
      response.on("end", () => {
        if (response.statusCode !== 200) { reject(new Error(`HTTP ${response.statusCode}: ${route}`)); return; }
        resolve({ firstByteMs: round(firstByteMs), heroMs: heroMs === undefined ? null : round(heroMs), completeMs: round(performance.now() - started), htmlBytes: Buffer.byteLength(html), htmlGzipBytes: gzipSync(html).byteLength, html });
      });
      response.on("error", reject);
    });
    request.setTimeout(10000, () => request.destroy(new Error("HTTP kiểm thử quá thời gian")));
    request.on("error", reject);
  });
}

async function resourceSize(html) {
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]);
  const links = [...html.matchAll(/<link\b[^>]*>/g)].map((match) => match[0]);
  const css = links.filter((link) => /rel="stylesheet"/.test(link)).map((link) => link.match(/href="([^"]+)"/)?.[1]);
  const summarize = async (urls) => {
    const resources = [];
    for (const url of new Set(urls.filter(Boolean))) {
      assert(url.startsWith("/_next/static/"));
      const file = path.resolve(frontend, ".next", url.replace(/^\/_next\//, ""));
      assert(file.startsWith(path.join(frontend, ".next/static") + path.sep));
      const data = await fs.readFile(file);
      resources.push({ url, bytes: data.byteLength, gzipBytes: gzipSync(data).byteLength });
    }
    return { bytes: resources.reduce((sum, resource) => sum + resource.bytes, 0), gzipBytes: resources.reduce((sum, resource) => sum + resource.gzipBytes, 0), files: resources.length };
  };
  return { js: await summarize(scripts), css: await summarize(css) };
}

function summarize(results) {
  return Object.fromEntries(["firstByteMs", "heroMs", "completeMs", "htmlBytes", "htmlGzipBytes", "apiRequests"].map((key) => {
    const values = results.map((result) => result[key]).filter((value) => value !== null).sort((a, b) => a - b);
    return [key, { median: values[Math.floor(values.length / 2)], min: values[0], max: values.at(-1) }];
  }));
}

try {
  await new Promise((resolve, reject) => { fixture.once("error", reject); fixture.listen(fixturePort, "127.0.0.1", resolve); });
  console.log("Đang build production riêng cho benchmark với API fixture 350 ms...");
  fixtureBuildStarted = true;
  await buildWebsite(true);
  const cold = [];
  let homepageHtml;
  for (let sample = 0; sample < samples; sample++) {
    await clearFixtureCache();
    await startWebsite();
    requests = [];
    const result = await measure("/");
    homepageHtml = result.html;
    cold.push({ ...result, apiRequests: requests.length });
    await stopWebsite();
  }
  await startWebsite();
  await measure("/");
  const warm = [];
  for (let sample = 0; sample < samples; sample++) {
    requests = [];
    warm.push({ ...(await measure("/")), apiRequests: requests.length });
  }
  requests = [];
  const search = await measure("/search?limit=24");
  const searchRequests = requests.length;
  requests = [];
  await measure("/search?limit=24");
  const repeatedSearchRequests = requests.length;
  const room = await measure("/rooms/fixture-0");
  const resources = { home: await resourceSize(homepageHtml), search: await resourceSize(search.html), room: await resourceSize(room.html) };
  const report = { node: process.version, next: JSON.parse(await fs.readFile(path.join(frontend, "node_modules/next/package.json"), "utf8")).version, fixtureLatencyMs: latency, samples, cold: summarize(cold), warm: summarize(warm), searchRequests, repeatedSearchRequests, resources };
  if (output) await fs.writeFile(output, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  if (verify) {
    assert(report.cold.heroMs.median < 550, "Hero vượt budget streaming đã đo từ baseline 1093 ms");
    assert(report.warm.apiRequests.max === 0, "Cache công khai 60 giây phải được giữ");
    assert(searchRequests > 0 && repeatedSearchRequests > 0, "Tìm kiếm phải lấy dữ liệu mới, không dùng cache trang chủ");
    assert(!homepageHtml.includes("Thông tin chủ nhà kiểm thử"), "Homepage không gửi dữ liệu host không sử dụng xuống client");
    assert(!search.html.includes("Thông tin chủ nhà kiểm thử"), "Tìm kiếm không gửi dữ liệu host không sử dụng xuống client");
    assert(search.html.includes("Chỗ ở kiểm thử 23"), "Tìm kiếm phải giữ đủ 24 kết quả");
    assert(room.html.includes("Không gian nghỉ dưỡng"), "Chi tiết phòng phải giữ mô tả đầy đủ");
    assert(report.resources.home.js.gzipBytes < 270000, "JS homepage vượt budget đo từ baseline 281 KB");
    assert(report.resources.home.css.gzipBytes < 9200, "CSS homepage vượt budget 9,2 KB cho carousel có chiều sâu (baseline 13,8 KB)");
  }
  if (verify) console.log("Các giới hạn hiệu năng và kiểm tra dữ liệu đã đạt.");
} finally {
  await stopWebsite();
  await clearFixtureCache();
  await new Promise((resolve) => fixture.close(resolve));
  if (fixtureBuildStarted) {
    console.log("Đang khôi phục build production bằng cấu hình API của dự án...");
    await buildWebsite(false);
  }
}
