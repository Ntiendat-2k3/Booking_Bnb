import { apiFetch } from "@/lib/api";
import api from "@/lib/api";
import { apiUpload } from "@/lib/apiUpload";

const root = "/api/v1/chat";
export const chatApi = {
  socketTicket: () => apiFetch(`${root}/socket-ticket`).then((res) => res.data.ticket),
  list: (params) => apiFetch(root, { params }).then((res) => res.data),
  unread: () => apiFetch(`${root}/unread`).then((res) => res.data.count),
  searchUsers: (search, signal) => apiFetch(`${root}/users`, { params: { search }, signal }).then((res) => res.data),
  publicProfile: (userId) => apiFetch(`${root}/users/${userId}`).then((res) => res.data),
  setUserBlock: (userId, blocked) => apiFetch(`${root}/users/${userId}/block`, {
    method: "PUT", body: { blocked },
  }).then((res) => res.data),
  createDirect: (userId) => apiFetch(`${root}/users/${userId}/conversation`, {
    method: "POST", body: {},
  }).then((res) => res.data),
  detail: (id) => apiFetch(`${root}/${id}`).then((res) => res.data),
  messages: (id, params) => apiFetch(`${root}/${id}/messages`, { params }).then((res) => res.data),
  searchMessages: (id, search, page = 1) => apiFetch(`${root}/${id}/messages/search`, {
    params: { search, page },
  }).then((res) => res.data),
  sharedMessages: (id, type, page = 1) => apiFetch(`${root}/${id}/shared`, {
    params: { type, page },
  }).then((res) => res.data),
  pinnedMessages: (id) => apiFetch(`${root}/${id}/pins`).then((res) => res.data),
  setMessagePin: (id, messageId, pinned) => apiFetch(`${root}/${id}/messages/${messageId}/pin`, {
    method: "PUT", body: { pinned },
  }).then((res) => res.data),
  send: (id, body, client_key, reply_to_message_id) => apiFetch(`${root}/${id}/messages`, {
    method: "POST", body: { body, client_key, ...(reply_to_message_id ? { reply_to_message_id } : {}) },
  }).then((res) => res.data),
  sendMedia: (id, file, client_key, reply_to_message_id) => {
    const data = new FormData();
    data.append("client_key", client_key);
    if (reply_to_message_id) data.append("reply_to_message_id", reply_to_message_id);
    data.append("media", file);
    return apiUpload(`${root}/${id}/messages/media`, data, { timeoutMs: 60000 }).then((res) => res.data);
  },
  setReaction: (id, messageId, emoji, active) => apiFetch(`${root}/${id}/messages/${messageId}/reaction`, {
    method: "PUT", body: { emoji, active },
  }).then((res) => res.data),
  editMessage: (id, messageId, body) => apiFetch(`${root}/${id}/messages/${messageId}`, {
    method: "PATCH", body: { body },
  }).then((res) => res.data),
  recallMessage: (id, messageId) => apiFetch(`${root}/${id}/messages/${messageId}/recall`, {
    method: "POST", body: {},
  }).then((res) => res.data),
  mediaUrl: (conversationId, messageId) =>
    `${(api.defaults.baseURL || "").replace(/\/$/, "")}${root}/${conversationId}/messages/${messageId}/media`,
  fileUrl: (conversationId, messageId, index) =>
    `${(api.defaults.baseURL || "").replace(/\/$/, "")}${root}/${conversationId}/messages/${messageId}/files/${index}`,
  read: (id, message_id) => apiFetch(`${root}/${id}/read`, {
    method: "PATCH", body: { message_id },
  }).then((res) => res.data),
  contact: (listingId, clientKey) => apiFetch(`${root}/listings/${listingId}`, {
    method: "POST", body: { client_key: clientKey },
  }).then((res) => res.data),
  activeCall: () => apiFetch(`${root}/calls/active`).then((res) => res.data),
  getCall: (callId) => apiFetch(`${root}/calls/${callId}`).then((res) => res.data),
  createCall: (conversationId, instanceId) => apiFetch(`${root}/${conversationId}/calls`, {
    method: "POST", body: { instance_id: instanceId },
  }).then((res) => res.data),
  acceptCall: (callId, instanceId) => apiFetch(`${root}/calls/${callId}/accept`, {
    method: "POST", body: { instance_id: instanceId },
  }).then((res) => res.data),
  declineCall: (callId) => apiFetch(`${root}/calls/${callId}/decline`, {
    method: "POST", body: {},
  }).then((res) => res.data),
  cancelCall: (callId) => apiFetch(`${root}/calls/${callId}/cancel`, {
    method: "POST", body: {},
  }).then((res) => res.data),
  endCall: (callId) => apiFetch(`${root}/calls/${callId}/end`, {
    method: "POST", body: {},
  }).then((res) => res.data),
  reportCall: (callId, instanceId, connection) => apiFetch(`${root}/calls/${callId}/report-connection`, {
    method: "POST", body: { instance_id: instanceId, connection },
  }).then((res) => res.data),
};
