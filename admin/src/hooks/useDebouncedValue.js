"use client";

import { useEffect, useState } from "react";

/** Chờ người dùng ngừng nhập trước khi cập nhật giá trị dùng để gọi API. */
export default function useDebouncedValue(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
