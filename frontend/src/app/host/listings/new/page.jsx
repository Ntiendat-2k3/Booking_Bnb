"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { ensureCsrf, fetchProfile } from "@/store/authThunks";
import { notifyError, notifySuccess } from "@/lib/notify";

import { useAmenities } from "@/features/hostListings/hooks/useAmenities";
import { HostListingsApi } from "@/features/hostListings/api/hostListingsApi";
import { buildListingPayload } from "@/features/hostListings/utils/payload";
import ListingFieldsCard from "@/features/hostListings/components/ListingFieldsCard";
import AmenitiesPickerCard from "@/features/hostListings/components/AmenitiesPickerCard";

export default function HostListingNewPage() {
  const router = useRouter();
  const dispatch = useDispatch();

  const { grouped } = useAmenities();

  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    address: "",
    city: "",
    country: "",
    lat: "",
    lng: "",
    price_per_night: "",
    max_guests: "",
    bedrooms: "",
    beds: "",
    bathrooms: "",
    property_type: "",
    room_type: "",
  });

  const [picked, setPicked] = useState(new Set());

  function setField(k, v) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function toggleAmenity(id) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    async function boot() {
      try {
        await dispatch(ensureCsrf());
        await dispatch(fetchProfile());
      } catch (e) {
        if (e?.status === 401) return router.push("/login");
        if (e?.status === 403) return router.push("/host");
      }
    }
    boot();
  }, [dispatch, router]);

  async function onCreate(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await HostListingsApi.create(buildListingPayload(form));
      const listing = res.data?.listing;
      if (!listing?.id) throw new Error("Create failed");

      if (picked.size) {
        await HostListingsApi.setAmenities(listing.id, Array.from(picked));
      }

      notifySuccess("Đã tạo phòng (draft). Hãy thêm ảnh và gửi duyệt.");
      router.push(`/host/listings/${listing.id}`);
    } catch (e2) {
      if (e2?.status === 401) return router.push("/login");
      if (e2?.status === 403) return router.push("/host");
      notifyError(e2?.message || "Tạo phòng thất bại");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Tạo phòng mới (Draft)</h1>
        </div>
        <Link
          href="/host/listings"
          className="px-4 py-2 text-sm font-semibold border rounded-xl hover:bg-slate-50"
        >
          ← Quay lại
        </Link>
      </div>

      <form onSubmit={onCreate} className="grid gap-6 lg:grid-cols-3">
        {/* CỘT TRÁI: CHIẾM 2 PHẦN */}
        <div className="space-y-4 lg:col-span-2">
          <ListingFieldsCard form={form} setField={setField} />
        </div>

        {/* CỘT PHẢI */}
        <div className="space-y-4">
          <AmenitiesPickerCard grouped={grouped} picked={picked} onToggle={toggleAmenity} />

          <button
            type="submit"
            disabled={busy}
            className="w-full px-4 py-3 text-base font-bold text-white transition-all rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? "Đang xử lý..." : "Tạo phòng (Draft)"}
          </button>
        </div>
      </form>
    </div>
  );
}
