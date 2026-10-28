// Chạy tuần tự các cổng chất lượng của từng Phase, lưu kết quả thật và dừng ngay khi có lệnh lỗi.
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const notes = path.dirname(fileURLToPath(import.meta.url));
const frontend = path.dirname(notes);
const phase = process.argv[2];
if (!/^\d$/.test(phase || "")) throw new Error("Cần truyền số Phase từ 0 đến 9.");
const npmCli = path.join(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js");
const results = [];

for (const script of ["lint", "test", "test:performance", "build"]) {
  const started = Date.now();
  let output = "";
  const child = spawn(process.execPath, [npmCli, "run", script], {
    cwd: frontend, windowsHide: true,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const record = (chunk) => { output += chunk.toString(); };
  child.stdout.on("data", record);
  child.stderr.on("data", record);
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  });
  const filename = `phase-${phase}-${script.replaceAll(":", "-")}.txt`;
  await fs.writeFile(path.join(notes, filename), output);
  results.push({ script, exitCode: code, elapsedMs: Date.now() - started, log: filename });
  await fs.writeFile(path.join(notes, `phase-${phase}-checks.json`), JSON.stringify(results, null, 2) + "\n");
  console.log(JSON.stringify(results.at(-1)));
  if (code !== 0) { process.exitCode = 1; break; }
}
