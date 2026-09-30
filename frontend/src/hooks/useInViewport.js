"use client";

import { useCallback, useEffect, useState } from "react";

/** Chỉ kích hoạt tính năng nặng khi vùng hiển thị xuất hiện; giữ kích hoạt sau lần đầu. */
export function useInViewport(containerRef) {
  const [element, setElement] = useState(null);
  const [visible, setVisible] = useState(false);
  const viewportRef = useCallback((node) => {
    containerRef.current = node;
    setElement(node);
  }, [containerRef]);

  useEffect(() => {
    if (!element || visible) return;
    let cancelled = false;
    if (typeof IntersectionObserver === "undefined") {
      Promise.resolve().then(() => { if (!cancelled) setVisible(true); });
      return () => { cancelled = true; };
    }
    const observer = new IntersectionObserver((entries) => {
      if (!cancelled && entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(element);
    return () => { cancelled = true; observer.disconnect(); };
  }, [element, visible]);

  return { viewportRef, visible };
}
