import { Suspense } from "react";
import ChatLayout from "@/features/chat/components/ChatLayout";

export default function MessagesLayout({ children }) {
  return <div className="chat-page">
    <Suspense fallback={<div className="h-full bg-surface" />}>
      <ChatLayout />
    </Suspense>
    {children}
  </div>;
}
