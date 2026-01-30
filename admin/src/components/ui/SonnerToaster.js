"use client";

import { Toaster } from "sonner";

export default function SonnerToaster() {
  return (
    <Toaster
      richColors
      theme="dark"
      position="top-right"
      closeButton
      toastOptions={{
        style: {
          background: "rgba(18, 17, 26, 0.95)",
          border: "1px solid rgba(42, 39, 64, 0.95)",
          color: "#f4f4f8",
        },
      }}
    />
  );
}
