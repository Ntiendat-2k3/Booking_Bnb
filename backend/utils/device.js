/** Tên thiết bị chỉ giúp người dùng nhận diện phiên; User-Agent không phải bằng chứng xác thực. */
function safeDevice(userAgent) {
  const ua = String(userAgent || "").slice(0, 512);
  const browser = /Edg(?:iOS)?\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" :
    /Chrome\//.test(ua) || /CriOS\//.test(ua) ? "Chrome" :
      /Firefox\//.test(ua) || /FxiOS\//.test(ua) ? "Firefox" :
        /Safari\//.test(ua) ? "Safari" : "Trình duyệt khác";
  const os = /Windows NT/.test(ua) ? "Windows" : /iPhone|iPad/.test(ua) ? "iOS" :
    /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" :
      /Linux/.test(ua) ? "Linux" : "Thiết bị khác";
  return { browser, os };
}

module.exports = { safeDevice };
