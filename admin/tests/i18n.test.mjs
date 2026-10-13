import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));
const en = JSON.parse(readFileSync(join(root, "src/i18n/en.json"), "utf8"));
const vn = JSON.parse(readFileSync(join(root, "src/i18n/vn.json"), "utf8"));

function flatten(value, prefix = "") {
  return Object.entries(value).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof entry === "string" ? [[path, entry]] : flatten(entry, path);
  });
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.[jt]sx?$/.test(entry.name) ? [path] : [];
  });
}

test("bộ từ điển có cùng khóa và cùng tham số", () => {
  const english = new Map(flatten(en));
  const vietnamese = new Map(flatten(vn));
  assert.deepEqual([...english.keys()].sort(), [...vietnamese.keys()].sort());
  for (const [key, text] of english) {
    const params = (value) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    assert.deepEqual(params(text), params(vietnamese.get(key)), key);
  }
});

test("mọi khóa dịch tĩnh trong UI đều tồn tại", () => {
  const keys = new Set(flatten(en).map(([key]) => key));
  for (const file of sourceFiles(join(root, "src"))) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(/\bt\(["']([\w.]+)["']/g)) {
      assert.ok(keys.has(match[1]), `${file}: ${match[1]}`);
    }
  }
});
