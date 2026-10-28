"use client";

import { useCallback, useState } from "react";
import { listingFormValues } from "../utils/payload";

/** Dùng chung trạng thái form tạo/sửa; chỉ lấy các trường được phép chỉnh sửa từ dữ liệu API. */
export function useListingForm() {
  const [form, setForm] = useState(listingFormValues);
  const [picked, setPicked] = useState(() => new Set());

  const resetForm = useCallback((listing) => {
    setForm(listingFormValues(listing));
    setPicked(new Set((listing?.amenities || []).map((item) => item.id)));
  }, []);

  function setField(key, value) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function toggleAmenity(id) {
    setPicked((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return { form, setForm, setField, picked, toggleAmenity, resetForm };
}
