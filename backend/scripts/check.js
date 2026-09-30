const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
let checked = 0;
function checkDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", "tmp", ".git"].includes(entry.name)) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) checkDirectory(filename);
    else if (filename.endsWith(".js") || filename === path.join(root, "bin", "www")) {
      const result = spawnSync(process.execPath, ["--check", filename], { stdio: "inherit" });
      if (result.status !== 0) process.exit(result.status || 1);
      checked++;
    }
  }
}
checkDirectory(root);
console.log(`Kiểm tra cú pháp thành công: ${checked} file.`);
