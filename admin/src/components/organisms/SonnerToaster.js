"use client";

import { Toaster } from "sonner";
import { useTheme } from "next-themes";

export default function SonnerToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      richColors
      theme={resolvedTheme || "system"}
      position="top-right"
      closeButton
      toastOptions={{
        style: {
          background: "var(--admin-surface)",
          border: "1px solid var(--admin-line)",
          color: "var(--admin-ink)",
        },
      }}
    />
  );
}
