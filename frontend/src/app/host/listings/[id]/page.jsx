"use client";
import { useTranslations } from "@/i18n/LocaleProvider";


import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/atoms/Button";
import Badge from "@/components/atoms/Badge";
import { useDispatch } from "react-redux";
import { ensureCsrf, fetchProfile } from "@/store/authThunks";
import { notifyError, notifySuccess } from "@/lib/notify";

import ListingImageUploader from "@/components/ListingImageUploader";
import { useAmenities } from "@/features/hostListings/hooks/useAmenities";
import { HostListingsApi } from "@/features/hostListings/api/hostListingsApi";
import { buildListingPayload } from "@/features/hostListings/utils/payload";
import ListingFieldsCard from "@/features/hostListings/components/ListingFieldsCard";
import AmenitiesPickerCard from "@/features/hostListings/components/AmenitiesPickerCard";


export default function HostListingManagePage() {
  const t = useTranslations();
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const dispatch = useDispatch();

  const { grouped, loadingAmenities, amenitiesError, retryAmenities } = useAmenities();

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
        else notifyError(e?.message || t("common.loadFailed"));
      } finally {
        setLoading(false);
      }
    }
    boot();
  }, [dispatch, id, router, t]);

  const status = listing?.status || "draft";

  async function onSave() {
    if (!id) return;
    setSaving(true);
    try {
      await HostListingsApi.patch(id, buildListingPayload(form));
      await HostListingsApi.setAmenities(id, Array.from(picked));
      notifySuccess(t("common.saved"));
    } catch (e) {
      if (e?.status === 401) router.replace("/login");
      else if (e?.status === 403) router.replace("/host");
      else notifyError(e?.message || t("common.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit() {
    if (!id || saving) return;
    setSaving(true);
    try {
      await HostListingsApi.submit(id);
      notifySuccess(t("host.submitted"));
      const current = await HostListingsApi.getOne(id);
      setListing(current.data?.listing);
    } catch (e) {
      notifyError(e?.message || t("host.submitFailed"));
    } finally { setSaving(false); }
  }

  async function onPause() {
    if (!id) return;
    try {
      await HostListingsApi.pause(id);
      notifySuccess(t("host.pauseSuccess"));
      const current = await HostListingsApi.getOne(id);
      setListing(current.data?.listing);
    } catch (e) {
      notifyError(e?.message || t("host.pauseFailed"));
    } finally { setSaving(false); }
  }

  async function onResume() {
    if (!id) return;
    try {
      await HostListingsApi.resume(id);
      notifySuccess(t("host.resumed"));
      const current = await HostListingsApi.getOne(id);
      setListing(current.data?.listing);
    } catch (e) {
      notifyError(e?.message || t("host.resumeFailed"));
    } finally { setSaving(false); }
  }

  async function onDelete() {
    if (!id || saving) return;
    const ok = window.confirm(t("host.deleteConfirm"));
    if (!ok) return;
    setSaving(true);
    try {
      await HostListingsApi.remove(id);
      notifySuccess(t("host.deletedAlt"));
      router.replace("/host/listings");
    } catch (e) {
      notifyError(e?.message || t("host.deleteFailedAlt"));
    } finally { setSaving(false); }
  }

  if (loading) {
    return <div className="p-6">{t("common.loading")}</div>;
  }

  if (!listing) {
    return <div className="p-6">{t("host.notFound")}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="page-heading">{t("host.manageTitle")}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-ink">
            <span>{t("common.identifier")}{listing.id}</span>
            <Badge tone={status === "published" ? "success" : status === "pending" ? "warning" : status === "rejected" ? "danger" : "neutral"}>{t(`host.${status}`)}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            href="/host/listings"
            variant="secondary"
          >{t("common.back")}</Button>

          <Button
            onClick={onSave}
            loading={saving}
            variant="secondary"
          >
            {saving ? t("common.saving") : t("common.save")}
          </Button>

          {(status === "draft" || status === "rejected") ? (
            <Button
              onClick={onSubmit} disabled={saving}
            >{t("host.submit")}</Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ListingFieldsCard form={form} setField={setField} setForm={setForm} disabled={saving} />
        </div>

        <div className="space-y-4">
          <div className="surface-panel p-6">
            <div className="mb-3 text-sm font-semibold">{t("host.images")}</div>
            <ListingImageUploader listingId={listing.id} />
          </div>

          <AmenitiesPickerCard grouped={grouped} picked={picked} onToggle={toggleAmenity} loading={loadingAmenities} error={amenitiesError} onRetry={retryAmenities} disabled={saving} />

          <div className="surface-panel space-y-2 p-6">
            <div className="text-sm font-semibold">{t("host.status")}</div>
            <div className="text-sm text-muted-ink">
              {status === "published" ? t("host.visible") : t("host.hidden")}
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              {status === "published" ? (
                <Button onClick={onPause} disabled={saving} variant="secondary" size="sm">{t("host.paused")}</Button>
              ) : null}

              {status === "paused" ? (
                <Button onClick={onResume} disabled={saving} variant="secondary" size="sm">{t("host.resume")}</Button>
              ) : null}

              <Button onClick={onDelete} disabled={saving} variant="danger" size="sm">{t("common.delete")}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
