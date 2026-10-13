"use client";

import { useState } from "react";
import Image from "next/image";

export default function UserAvatar({ user }) {
  const [failedUrl, setFailedUrl] = useState(null);
  const avatarUrl = user?.avatar_url;
  const initial = (user?.full_name || user?.email || "?").charAt(0).toUpperCase();

  return (
    <span className="admin-avatar overflow-hidden" aria-hidden="true">
      {avatarUrl && failedUrl !== avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          width={36}
          height={36}
          unoptimized
          className="h-full w-full object-cover"
          onError={() => setFailedUrl(avatarUrl)}
        />
      ) : initial}
    </span>
  );
}
