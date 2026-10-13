import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const css = readFileSync(fileURLToPath(new URL("../src/app/globals.css", import.meta.url)), "utf8");

function themeTokens(selector) {
  const start = css.indexOf(`${selector} {`);
  assert.ok(start >= 0, `Thiếu khối màu ${selector}`);
  const block = css.slice(start, css.indexOf("}", start));
  return [...block.matchAll(/(--admin-[\w-]+)\s*:/g)].map((match) => match[1]).sort();
}

test("theme tối định nghĩa đầy đủ token của theme sáng", () => {
  assert.deepEqual(themeTokens(".dark"), themeTokens(":root"));
});
