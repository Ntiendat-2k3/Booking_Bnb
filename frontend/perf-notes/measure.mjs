// Đo route production và Lighthouse mobile bằng dữ liệu fixture; chỉ lưu báo cáo đã loại tham số nhạy cảm.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { gzipSync } from "node:zlib";
import os from "node:os";

const notes = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.dirname(notes);
const label = process.argv[2];
if (!/^(before|after|phase-[0-9])$/.test(label || "")) throw new Error("Nhãn phép đo không hợp lệ.");
const lighthouseCli = process.argv[3];
const origin = "http://127.0.0.1:3851";
const manifest = JSON.parse(await fs.readFile(path.join(frontend, ".next/server/app-paths-manifest.json"), "utf8"));
const routes = Object.keys(manifest).filter((key) => key.endsWith("/page") && !key.startsWith("/_"))
  .map((key) => key.slice(0, -5).replaceAll("[id]", "fixture-0").replaceAll("[conversationId]", "fixture-conversation") || "/");

/** Loại giá trị token/header khỏi report, không đọc hoặc xuất nội dung file env. */
function redact(value) {
  if (typeof value === "string") return value.replace(/([?&](?:access_token|token|key|client_secret|code|state)=)[^&\s"'<>]+/gi, "$1[REDACTED]");
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== "object") return value;
  if (/^(authorization|cookie|set-cookie|x-csrf-token)$/i.test(value.name || "")) return { ...value, value: "[REDACTED]" };
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, /^(authorization|cookie|set-cookie|x-csrf-token)$/i.test(key) ? "[REDACTED]" : redact(item)]));
}

const sizes = [];
for (const route of routes) {
  const response = await fetch(origin + route, { signal: AbortSignal.timeout(15000) });
  const html = await response.text();
  const scripts = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((match) => match[1]))];
  let bytes = 0, gzipBytes = 0;
  for (const url of scripts) {
    if (!url.startsWith("/_next/static/")) throw new Error("Script ngoài build trong phép đo route.");
    const filename = path.resolve(frontend, ".next", url.replace(/^\/_next\//, ""));
    if (!filename.startsWith(path.join(frontend, ".next/static") + path.sep)) throw new Error("Tài nguyên nằm ngoài build.");
    const data = await fs.readFile(filename);
    bytes += data.length; gzipBytes += gzipSync(data).length;
  }
  sizes.push({ route: route.replace("fixture-0", "[id]").replace("fixture-conversation", "[conversationId]"), status: response.status,
    initialScriptBytes: bytes, initialScriptGzipBytes: gzipBytes, scripts: scripts.length });
}
await fs.writeFile(path.join(notes, `${label}-routes.json`), JSON.stringify(sizes, null, 2) + "\n");
console.log(JSON.stringify({ label, routes: sizes.length, routeMeasurement: "HTML script tags, includes nomodule" }));

if (lighthouseCli) {
  const summary = [];
  for (const [name, route] of [["home", "/"], ["search", "/search?limit=24"], ["room", "/rooms/fixture-0"]]) {
    for (let sample = 1; sample <= 3; sample++) {
      await (await fetch(origin + route)).text();
      const temporary = path.join(os.tmpdir(), `booking-${label}-${name}-${sample}.json`);
      let output = "";
      const child = spawn(process.execPath, [lighthouseCli, origin + route, "--only-categories=performance", "--output=json",
        `--output-path=${temporary}`, "--quiet", "--chrome-flags=--headless --no-first-run --no-default-browser-check", "--max-wait-for-load=20000"], {
        cwd: frontend, windowsHide: true, env: { ...process.env, CHROME_PATH: "C:/Program Files/Google/Chrome/Application/chrome.exe" },
        stdio: ["ignore", "pipe", "pipe"],
      });
      child.stdout.on("data", (chunk) => { output += chunk.toString(); });
      child.stderr.on("data", (chunk) => { output += chunk.toString(); });
      const exitCode = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", resolve); });
      if (exitCode !== 0) {
        summary.push({ name, sample, error: redact(output).slice(-1000), exitCode });
      } else {
        const report = redact(JSON.parse(await fs.readFile(temporary, "utf8")));
        await fs.writeFile(path.join(notes, `${label}-${name}-${sample}.json`), JSON.stringify(report));
        summary.push({ name, sample, lighthouseVersion: report.lighthouseVersion, runtimeError: report.runtimeError,
          lcpMs: report.audits["largest-contentful-paint"]?.numericValue,
          tbtMs: report.audits["total-blocking-time"]?.numericValue,
          cls: report.audits["cumulative-layout-shift"]?.numericValue,
          jsTransferBytes: report.audits["resource-summary"]?.details?.items?.find((item) => item.resourceType === "script")?.transferSize,
          formFactor: report.configSettings.formFactor });
        await fs.unlink(temporary);
      }
      await fs.writeFile(path.join(notes, `${label}-lighthouse-summary.json`), JSON.stringify(summary, null, 2) + "\n");
      console.log(JSON.stringify(summary.at(-1)));
    }
  }
}
