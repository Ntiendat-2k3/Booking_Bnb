// Tạo âm báo tạm bằng Web Audio; thay nội dung hai hàm phát âm khi có file từ người dùng.
let audioContext;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  try {
    audioContext ||= new AudioContextClass();
    if (audioContext.state === "suspended") void audioContext.resume().catch(() => {});
    return audioContext.state === "running" ? audioContext : null;
  } catch { return null; }
}

/** Mở quyền phát âm sau thao tác của người dùng theo chính sách autoplay của trình duyệt. */
export function unlockChatAudio() {
  getAudioContext();
}

function playTone(context, frequency, delay, duration, volume) {
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  oscillator.start(start);
  oscillator.stop(start + duration);
  return oscillator;
}

/** Mỗi sự kiện tin mới chỉ phát một tiếng ngắn, kể cả khi nhiều màn hình cùng nghe socket. */
export function playMessageSound() {
  const context = getAudioContext();
  if (!context) return;
  playTone(context, 660, 0, 0.12, 0.045);
  playTone(context, 880, 0.13, 0.18, 0.04);
}

/** Chuông chỉ chạy trong lúc call còn chờ nhận và dừng ngay khi trạng thái đổi hoặc hết hạn. */
export function startIncomingCallRingtone(expiresAt) {
  const oscillators = new Set();
  let stopped = false;
  let timer;
  let expiryTimer;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearInterval(timer);
    window.clearTimeout(expiryTimer);
    for (const oscillator of oscillators) {
      try { oscillator.stop(); } catch { /* Dao động đã kết thúc. */ }
    }
    oscillators.clear();
  };
  const ring = () => {
    if (stopped) return;
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) { stop(); return; }
    const context = getAudioContext();
    if (!context) return;
    for (const [frequency, delay] of [[440, 0], [554, 0.34], [659, 0.68]]) {
      const oscillator = playTone(context, frequency, delay, 0.27, 0.05);
      oscillators.add(oscillator);
      oscillator.addEventListener("ended", () => oscillators.delete(oscillator), { once: true });
    }
  };
  timer = window.setInterval(ring, 2300);
  ring();
  if (!stopped && expiresAt) {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    if (Number.isFinite(remaining)) expiryTimer = window.setTimeout(stop, Math.max(0, remaining));
  }
  return stop;
}
