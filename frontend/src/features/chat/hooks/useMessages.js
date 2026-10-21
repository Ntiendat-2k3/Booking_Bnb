"use client";

import { useCallback, useEffect, useState } from "react";
import { chatApi } from "../api/chatApi";
import { mergeMessage } from "../utils/mergeMessage.mjs";

export function useMessages(conversationId) {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [olderLoading, setOlderLoading] = useState(false);
  const [error, setError] = useState(null);
  const reload = useCallback(() => {
    if (!conversationId) return Promise.resolve();
    return chatApi.messages(conversationId).then((data) => {
      setItems((current) => current.filter((item) => item.status)
        .reduce((items, item) => mergeMessage(items, item), data.items));
      setCursor(data.nextCursor); setError(null);
    }).catch((cause) => setError(cause)).finally(() => setLoading(false));
  }, [conversationId]);
  useEffect(() => { reload(); }, [reload]);
  const loadOlder = async () => {
    if (!cursor || olderLoading) return;
    setOlderLoading(true);
    try {
      const data = await chatApi.messages(conversationId, { before: cursor });
      setItems((current) => data.items.reduce(mergeMessage, current));
      setCursor(data.nextCursor); setError(null);
    } catch (cause) { setError(cause); }
    finally { setOlderLoading(false); }
  };
  const receive = (message) => {
    if (message.conversation_id !== conversationId) return;
    setItems((current) => mergeMessage(current, message));
  };
  const receiveUpdate = (message) => {
    if (message.conversation_id !== conversationId) return;
    setItems((current) => current.map((item) => {
      if (item.id === message.id) {
        if (Number(item.revision || 0) > Number(message.revision || 0) ||
          (item.recalled_at && !message.recalled_at) ||
          (item.edited_at && !message.recalled_at &&
            new Date(item.edited_at) > new Date(message.edited_at || 0))) return item;
        return { ...item, ...message };
      }
      if (item.reply_to_id === message.id) return { ...item, replyTo: {
        id: message.id, sender_id: message.sender_id, type: message.type,
        body: message.body, recalled_at: message.recalled_at,
      } };
      return item;
    }));
  };
  const receiveReaction = (reaction) => {
    if (reaction.conversation_id !== conversationId) return;
    setItems((current) => current.map((item) => {
      if (item.id !== reaction.message_id) return item;
      const reactions = (item.reactions || []).filter((entry) =>
        !(entry.user_id === reaction.user_id && entry.emoji === reaction.emoji));
      return { ...item, reactions: reaction.active
        ? [...reactions, { user_id: reaction.user_id, emoji: reaction.emoji }] : reactions };
    }));
  };
  const send = async (userId, draft) => {
    const key = draft?.client_key || crypto.randomUUID();
    const type = draft?.type || "text";
    const body = type === "text" ? draft?.body : null;
    const file = draft?.file || draft?.local_file;
    const replyToId = draft?.reply_to_message_id || draft?.replyTo?.id;
    const pending = { id: `pending:${key}`, client_key: key, conversation_id: conversationId,
      sender_id: userId, body, type, local_file: file,
      reply_to_id: replyToId, replyTo: draft?.replyTo,
      created_at: new Date().toISOString(), status: "pending" };
    setItems((current) => mergeMessage(current, pending));
    try {
      receive(type === "text" ? await chatApi.send(conversationId, body, key, replyToId)
        : await chatApi.sendMedia(conversationId, file, key, replyToId));
      return true;
    }
    catch {
      setItems((current) => current.map((item) => item.client_key === key && item.status === "pending" ? { ...pending, status: "failed" } : item));
      return false;
    }
  };
  return { items, cursor, loading, olderLoading, error, reload, loadOlder, receive,
    receiveUpdate, receiveReaction, send };
}
