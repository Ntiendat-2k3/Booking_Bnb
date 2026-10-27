// Nhận diện lời xã giao và đơn vị tiền trong câu tìm phòng trước khi áp bộ lọc dữ liệu thật.

/** Phản hồi lời chào hoặc câu hỏi về khả năng tìm phòng mà không tốn lượt gọi AI. */
function socialIntent(text) {
  const message = text.replace(/[!?.,]+/g, " ").replace(/\s+/g, " ").trim();
  if (/^(xin chao|chao|hello|hi|hey|alo)( (ban|ai|nhe|a))?$/.test(message)) return "greeting";
  if (/\bhoi (ban|ai|tro ly) (nhung )?gi\b/.test(message) ||
    /\b(ban|ai|tro ly) (co the )?(lam|giup|ho tro).*\bgi\b/.test(message) ||
    /\bwhat can you do\b/.test(message)) return "help";
  return null;
}

/** Chỉ chuẩn hóa số tiền khi khách ghi rõ đơn vị; số nhỏ không có đơn vị cần hỏi lại. */
function budgetMention(text) {
  const explicit = [...text.matchAll(/(?:^|[^\d])(\d[\d.,]*)\s*(trieu|tr|nghin|ngan|k|vnd|dong|d)(?=$|[^a-z\d])/g)].at(-1);
  if (explicit) {
    const raw = explicit[1];
    const grouped = /^\d{1,3}(?:[.,]\d{3})+$/.test(raw);
    const number = Number(grouped ? raw.replace(/[.,]/g, "") : raw.replace(",", "."));
    const unit = explicit[2];
    const multiplier = ["trieu", "tr"].includes(unit) ? 1000000
      : ["nghin", "ngan", "k"].includes(unit) ? 1000 : 1;
    const amount = Math.round(number * multiplier);
    return Number.isSafeInteger(amount) && amount > 0 ? { amount } : null;
  }
  const unclear = [...text.matchAll(/(?:ngan sach|muc gia|gia|duoi|toi da|khong qua|tam)\D{0,24}(\d[\d.,]*)/g)].at(-1);
  if (!unclear) return null;
  const raw = unclear[1];
  const grouped = /^\d{1,3}(?:[.,]\d{3})+$/.test(raw);
  const amount = Number(grouped ? raw.replace(/[.,]/g, "") : raw.replace(",", "."));
  return Number.isInteger(amount) && amount > 0 && amount < 10000 ? { ambiguous: amount } : null;
}

module.exports = { socialIntent, budgetMention };
