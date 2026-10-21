/** Gộp HTTP/socket theo ID hoặc khóa retry; sequence server giữ thứ tự khi event đến trễ. */
export function mergeMessage(items, message) {
  const index = items.findIndex((item) => item.id === message.id ||
    (item.client_key && message.client_key && item.client_key === message.client_key &&
      item.sender_id === message.sender_id));
  const result = index < 0 ? [...items, message] : items.map((item, position) => {
    if (position !== index || (item.sequence && !message.sequence) ||
      (Number(item.revision || 0) > Number(message.revision || 0)) ||
      (item.recalled_at && !message.recalled_at) ||
      (item.edited_at && !message.recalled_at &&
        new Date(item.edited_at) > new Date(message.edited_at || 0))) return item;
    return message.reply_to_id === item.reply_to_id &&
      !Object.hasOwn(message, "replyTo") && item.replyTo
      ? { ...message, replyTo: item.replyTo } : message;
  });
  return result.sort((left, right) => {
    if (!left.sequence) return right.sequence ? 1 :
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
    if (!right.sequence) return -1;
    const first = BigInt(left.sequence);
    const second = BigInt(right.sequence);
    return first < second ? -1 : first > second ? 1 : 0;
  });
}
