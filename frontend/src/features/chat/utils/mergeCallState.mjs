const terminal = new Set(["declined", "cancelled", "no_answer", "ended", "failed"]);

/** Event trễ không được ghi đè snapshot mới hoặc hồi sinh call đã terminal. */
export function mergeCallState(current, next) {
  if (!next) return current;
  if (!current) return next;
  if (current.id !== next.id) {
    const currentCreated = new Date(current.created_at || current.last_state_changed_at).getTime();
    const nextCreated = new Date(next.created_at || next.last_state_changed_at).getTime();
    return nextCreated > currentCreated ? next : current;
  }
  if (terminal.has(current.status) && !terminal.has(next.status)) return current;
  if (Number.isInteger(current.revision) && Number.isInteger(next.revision)) {
    return next.revision < current.revision ? current : next;
  }
  const previousAt = new Date(current.last_state_changed_at).getTime();
  const nextAt = new Date(next.last_state_changed_at).getTime();
  if (nextAt < previousAt) return current;
  return next;
}

export function isTerminalCall(call) {
  return Boolean(call && terminal.has(call.status));
}
