/** Chỉ đưa tên công khai của người gửi và tin được trả lời vào payload. */
module.exports = function chatMessageView(message) {
  const replyTo = message.replyTo ? { ...message.replyTo,
    sender_name: message.replyTo.sender?.full_name || message.replyTo.sender_name || null } : message.replyTo;
  if (replyTo) delete replyTo.sender;
  const view = { ...message, sender_name: message.sender?.full_name || message.sender_name || null,
    replyTo };
  delete view.sender;
  return view;
};
