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
          background: "rgba(15,23,42,.95)",
          border: "1px solid rgba(35,48,74,.9)",
          color: "#e5e7eb",
        },
      }}
    />
  );
}
