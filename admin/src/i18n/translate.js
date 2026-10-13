/** Dịch khóa lồng nhau và thay các tham số trong thông điệp. */
export function translate(messages, key, values = {}) {
  const value = key.split(".").reduce((current, part) => current?.[part], messages);
  if (typeof value !== "string") return key;
  return value.replace(/\{(\w+)\}/g, (match, name) => {
    const replacement = values[name];
    return replacement === undefined || replacement === null ? match : String(replacement);
  });
}
