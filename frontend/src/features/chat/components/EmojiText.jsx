"use client";

import { useEffect, useState } from "react";

const spriteUrl = "https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.0.1/img/apple/sheets-256/64.png";
const emojiPattern = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u;
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
let emojiMap;
let sheet;
let loading;

/** Chỉ tải dữ liệu và sprite Apple khi chat thực sự có emoji cần hiển thị. */
function loadEmojiAssets() {
  if (!loading) {
    loading = Promise.all([
      import("@emoji-mart/data/sets/15/apple.json"),
      new Promise((resolve, reject) => {
        const image = new window.Image();
        image.onload = resolve;
        image.onerror = reject;
        image.src = spriteUrl;
      }),
    ]).then(([{ default: data }]) => {
      sheet = data.sheet;
      emojiMap = new Map();
      for (const emoji of Object.values(data.emojis)) {
        for (const skin of emoji.skins) {
          emojiMap.set(skin.native.replaceAll("\ufe0f", ""), skin);
        }
      }
    }).catch(() => { /* Giữ emoji Unicode khi không tải được sprite Apple. */ });
  }
  return loading;
}

export default function EmojiText({ text }) {
  const value = String(text ?? "");
  const hasEmoji = emojiPattern.test(value);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hasEmoji || ready) return;
    let active = true;
    loadEmojiAssets().then(() => { if (active && emojiMap) setReady(true); });
    return () => { active = false; };
  }, [hasEmoji, ready]);

  if (!hasEmoji || !ready || !emojiMap) return value;

  const parts = [];
  let plain = "";
  for (const { segment, index } of segmenter.segment(value)) {
    const skin = emojiMap.get(segment.replaceAll("\ufe0f", ""));
    if (!skin) { plain += segment; continue; }
    if (plain) { parts.push(plain); plain = ""; }
    parts.push(<span key={index} role="img" aria-label={segment} className="inline-block align-[-0.2em]"
      style={{
        width: "1.35em", height: "1.35em", backgroundImage: `url(${spriteUrl})`,
        backgroundSize: `${sheet.cols * 100}% ${sheet.rows * 100}%`,
        backgroundPosition: `${100 * skin.x / (sheet.cols - 1)}% ${100 * skin.y / (sheet.rows - 1)}%`,
      }} />);
  }
  if (plain) parts.push(plain);
  return parts;
}
