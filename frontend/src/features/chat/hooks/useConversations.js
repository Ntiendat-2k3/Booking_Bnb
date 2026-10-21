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
  const requestId = useRef(0);
  const key = `${userId || ""}:${search}`;
  const reload = useCallback(() => {
    if (!userId) return Promise.resolve();
    const currentRequest = ++requestId.current;
    return chatApi.list({ search, page: 1 }).then((data) => {
      if (currentRequest !== requestId.current) return;
      setItems(data.items); setPage(1); setHasMore(data.hasMore); setError(null);
      setLoadedFor(`${userId}:${search}`);
    }).catch((cause) => { if (currentRequest === requestId.current) { setError(cause); setLoadedFor(`${userId}:${search}`); } })
      .finally(() => { if (currentRequest === requestId.current) setLoading(false); });
  }, [userId, search]);
  useEffect(() => { reload(); }, [reload]);
  const loadMore = async () => {
    if (!hasMore || loading) return;
    const currentRequest = ++requestId.current;
    setLoading(true);
    try {
      const data = await chatApi.list({ search, page: page + 1 });
      if (currentRequest !== requestId.current) return;
      setItems((current) => [...current, ...data.items.filter((item) => !current.some((old) => old.id === item.id))]);
      setPage(page + 1); setHasMore(data.hasMore); setError(null);
    } catch (cause) { if (currentRequest === requestId.current) setError(cause); }
    finally { if (currentRequest === requestId.current) setLoading(false); }
  };
  return { items: loadedFor === key && !error ? items : [], hasMore: loadedFor === key && hasMore,
    loading: loadedFor !== key || loading, error: loadedFor === key ? error : null, reload, loadMore };
}
