"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { ensureCsrf, fetchProfile } from "@/store/authThunks";
import { notifyError, notifySuccess } from "@/lib/notify";

import ListingImageUploader from "@/components/ListingImageUploader";
import { useAmenities } from "@/features/hostListings/hooks/useAmenities";
import { HostListingsApi } from "@/features/hostListings/api/hostListingsApi";
import { buildListingPayload } from "@/features/hostListings/utils/payload";
import ListingFieldsCard from "@/features/hostListings/components/ListingFieldsCard";
import AmenitiesPickerCard from "@/features/hostListings/components/AmenitiesPickerCard";

function Badge({ status }) {
  const map = {
    draft: "bg-slate-100 text-slate-700",
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-rose-100 text-rose-700",
    paused: "bg-slate-200 text-slate-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        map[status] || "bg-slate-100 text-slate-700"
      }`}
    >
      {status}
    </span>
  );
}

export default function HostListingManagePage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const dispatch = useDispatch();

  const { grouped } = useAmenities();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [listing, setListing] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    address: "",
    city: "",
    country: "Vietnam",
    property_type: "",
    room_type: "",
    price_per_night: "",
    max_guests: "",
    bedrooms: "",
    beds: "",
    bathrooms: "",
    lat: "",
    lng: "",
  });

  const [picked, setPicked] = useState(new Set());

  function setField(k, v) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function toggleAmenity(aid) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(aid)) next.delete(aid);
      else next.add(aid);
      return next;
    });
  }

  useEffect(() => {
    async function boot() {
      if (!id) return;
      setLoading(true);
      try {
        await dispatch(ensureCsrf());
        await dispatch(fetchProfile());

        const r = await HostListingsApi.getOne(id);
        const l = r.data?.listing;
        setListing(l);

        setForm({
          title: l?.title || "",
          description: l?.description || "",
          address: l?.address || "",
          city: l?.city || "",
          country: l?.country || "Vietnam",
          property_type: l?.property_type || "",
          room_type: l?.room_type || "",
          price_per_night: l?.price_per_night ?? "",
          max_guests: l?.max_guests ?? "",
          bedrooms: l?.bedrooms ?? "",
          beds: l?.beds ?? "",
          bathrooms: l?.bathrooms ?? "",
          lat: l?.lat ?? "",
          lng: l?.lng ?? "",
        });

        setPicked(new Set((l?.amenities || []).map((x) => x.id)));
      } catch (e) {
        if (e?.status === 401) router.replace("/login");
        else if (e?.status === 403) router.replace("/host");
        else notifyError(e?.message || "Không tải được dữ liệu");
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, [dispatch, id, router]);

  const status = listing?.status || "draft";

  async function onSave() {
    if (!id) return;
    setSaving(true);
    try {
      await HostListingsApi.patch(id, buildListingPayload(form));
      await HostListingsApi.setAmenities(id, Array.from(picked));
      notifySuccess("Đã lưu thay đổi");
    } catch (e) {
      if (e?.status === 401) router.replace("/login");
      else if (e?.status === 403) router.replace("/host");
      else notifyError(e?.message || "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit() {
    if (!id) return;
    try {
      await HostListingsApi.submit(id);
      notifySuccess("Đã gửi duyệt");
      router.refresh();
    } catch (e) {
      notifyError(e?.message || "Không gửi duyệt được");
    }
  }

  async function onPause() {
    if (!id) return;
    try {
      await HostListingsApi.pause(id);
      notifySuccess("Đã tạm dừng");
      router.refresh();
    } catch (e) {
      notifyError(e?.message || "Không tạm dừng được");
    }
  }

  async function onResume() {
    if (!id) return;
    try {
      await HostListingsApi.resume(id);
      notifySuccess("Đã kích hoạt lại");
      router.refresh();
    } catch (e) {
      notifyError(e?.message || "Không kích hoạt lại được");
    }
  }

  async function onDelete() {
    if (!id) return;
    const ok = window.confirm("Xoá phòng này?");
    if (!ok) return;
    try {
      await HostListingsApi.remove(id);
      notifySuccess("Đã xoá");
      router.replace("/host/listings");
    } catch (e) {
      notifyError(e?.message || "Không xoá được");
    }
  }

  if (loading) {
    return <div className="p-6">Đang tải...</div>;
  }

  if (!listing) {
    return <div className="p-6">Không tìm thấy phòng.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Quản lý phòng</h1>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>ID: {listing.id}</span>
            <Badge status={status} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/host/listings"
            className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            ← Quay lại
          </Link>

          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            {saving ? "Đang lưu..." : "Lưu"}
          </button>

          {(status === "draft" || status === "rejected") ? (
            <button
              onClick={onSubmit}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Gửi duyệt
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ListingFieldsCard form={form} setField={setField} setForm={setForm} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border bg-white p-6">
            <div className="mb-3 text-sm font-semibold">Ảnh</div>
            <ListingImageUploader listingId={listing.id} />
          </div>

          <AmenitiesPickerCard grouped={grouped} picked={picked} onToggle={toggleAmenity} />

          <div className="rounded-2xl border bg-white p-6 space-y-2">
            <div className="text-sm font-semibold">Trạng thái</div>
            <div className="text-sm text-slate-600">
              {status === "approved" ? "Đang hiển thị cho khách." : "Chưa hiển thị cho khách."}
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              {status === "approved" ? (
                <button onClick={onPause} className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                  Tạm dừng
                </button>
              ) : null}

              {status === "paused" ? (
                <button onClick={onResume} className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                  Kích hoạt lại
                </button>
              ) : null}

              <button onClick={onDelete} className="rounded-xl border px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50">
                Xoá
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
