"use client";

import { useEffect } from "react";
import { apiFetch } from "@/lib/api";

/** Một phiên trình duyệt được tính tối đa một lượt xem cho mỗi phòng trong ngày. */
export default function ListingViewTracker({ listingId }) {
  useEffect(() => {
    try {
      const key = "booking-bnb-analytics-visitor";
      let visitor = sessionStorage.getItem(key);
      if (!visitor) {
        visitor = crypto.randomUUID();
        sessionStorage.setItem(key, visitor);
      }
      void apiFetch(`/api/v1/listings/${listingId}/view`, {
        method: "POST", body: { visitor_key: visitor },
      }).catch(() => {});
    } catch { /* Thống kê không cản việc xem phòng khi trình duyệt chặn bộ nhớ. */ }
  }, [listingId]);
  return null;
}
