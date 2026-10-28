"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chatApi } from "../api/chatApi";

export function useConversations(userId, search) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadedFor, setLoadedFor] = useState(null);
  const activeRequest = useRef(null);
  const key = `${userId || ""}:${search}`;
  /** Gom sự kiện đến khi đang tải; lượt kế tiếp vẫn lấy dữ liệu mới nhất, không cache hội thoại riêng tư. */
  const reload = useCallback(() => {
    if (!userId) return Promise.resolve();
    const running = activeRequest.current;
    if (running?.key === key && running.kind === "reload") {
      running.refresh = true;
      return running.promise;
    }
    running?.controller.abort();
    const request = { key, kind: "reload", controller: new AbortController(), refresh: false };
    activeRequest.current = request;
    request.promise = (async () => {
      do {
        request.refresh = false;
        try {
          const data = await chatApi.list({ search, page: 1 }, request.controller.signal);
          if (request.controller.signal.aborted || activeRequest.current !== request) return;
          setItems(data.items); setPage(1); setHasMore(data.hasMore); setError(null);
          setLoadedFor(key);
        } catch (cause) {
          if (request.controller.signal.aborted || activeRequest.current !== request) return;
          setError(cause); setLoadedFor(key);
        }
      } while (request.refresh && !request.controller.signal.aborted);
    })().finally(() => {
      if (activeRequest.current !== request) return;
      activeRequest.current = null;
      setLoading(false);
    });
    return request.promise;
  }, [userId, search, key]);
  useEffect(() => {
    void reload();
    return () => { activeRequest.current?.controller.abort(); activeRequest.current = null; };
  }, [reload]);
  const loadMore = async () => {
    if (!hasMore || loading || activeRequest.current) return;
    const request = { key, kind: "page", controller: new AbortController() };
    activeRequest.current = request;
    setLoading(true);
    try {
      const data = await chatApi.list({ search, page: page + 1 }, request.controller.signal);
      if (request.controller.signal.aborted || activeRequest.current !== request) return;
      setItems((current) => [...current, ...data.items.filter((item) => !current.some((old) => old.id === item.id))]);
      setPage(page + 1); setHasMore(data.hasMore); setError(null);
    } catch (cause) {
      if (!request.controller.signal.aborted && activeRequest.current === request) setError(cause);
    } finally {
      if (activeRequest.current === request) { activeRequest.current = null; setLoading(false); }
    }
  };
  return { items: loadedFor === key && !error ? items : [], hasMore: loadedFor === key && hasMore,
    loading: loadedFor !== key || loading, error: loadedFor === key ? error : null, reload, loadMore };
}
