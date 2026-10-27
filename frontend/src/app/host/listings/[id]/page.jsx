"use client";
import { useTranslations } from "@/i18n/LocaleProvider";


import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/atoms/Button";
import Badge from "@/components/atoms/Badge";
import { useDispatch } from "react-redux";
import { ensureCsrf, fetchProfile } from "@/store/authThunks";
import { notifyConfirm, notifyError, notifySuccess } from "@/lib/notify";
import { ArrowLeft, Eye, FloppyDisk, Trash, WarningCircle } from "@phosphor-icons/react";

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
    cancellation_policy_code: "moderate",
    allow_pay_at_property: false,
    allow_pay_at_property: false,
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
          cancellation_policy_code: l?.cancellation_policy_code || "moderate",
          allow_pay_at_property: Boolean(l?.allow_pay_at_property),
          allow_pay_at_property: Boolean(l?.allow_pay_at_property),
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
    if (!id || saving) return;
    setSaving(true);
    try {
      await HostListingsApi.patch(id, buildListingPayload(form));
      const result = await HostListingsApi.setAmenities(id, Array.from(picked));
      setListing(result.data?.listing);
      notifySuccess(["published", "paused", "pending"].includes(status) ? t("host.savedForReview") : t("common.saved"));
    } catch (e) {
      if (e?.status === 401) router.replace("/login");
      else if (e?.status === 403) router.replace("/host");
      else {
        await refreshListingStatus();
        notifyError(e?.message || t("common.saveFailed"));
      }
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
    if (!id || saving) return;
    setSaving(true);
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
    if (!id || saving) return;
    setSaving(true);
    try {
      await HostListingsApi.resume(id);
      notifySuccess(t("host.resumed"));
      const current = await HostListingsApi.getOne(id);
      setListing(current.data?.listing);
    } catch (e) {
      notifyError(e?.message || t("host.resumeFailed"));
    } finally { setSaving(false); }
  }

  function onDelete() {
    if (!id || saving) return;
    notifyConfirm(t("host.deleteConfirm"), {
      id: `delete-listing-${id}`,
      confirmLabel: t("host.deleteListing"),
      cancelLabel: t("common.cancel"),
      onConfirm: async () => {
        setSaving(true);
        try {
          await HostListingsApi.remove(id);
          notifySuccess(t("host.deletedAlt"));
          router.replace("/host/listings");
        } catch (e) {
          notifyError(e?.message || t("host.deleteFailedAlt"));
        } finally { setSaving(false); }
      },
    });
  }

  async function refreshListingStatus() {
    try {
      const current = await HostListingsApi.getOne(id);
      setListing(current.data?.listing);
    } catch (error) {
      notifyError(error?.message || t("common.loadFailed"));
    }
  }

  if (loading) {
    return <div className="p-6">{t("common.loading")}</div>;
  }

  if (!listing) {
    return <div className="p-6">{t("host.notFound")}</div>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button href="/host/listings" variant="secondary" size="sm" aria-label={t("common.back")} className="!px-3"><ArrowLeft aria-hidden size={20} /></Button>
          <div className="min-w-0">
            <h1 className="page-heading">{t("host.manageTitle")}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-ink">
              <span className="truncate">{t("common.identifier")}{listing.listing_code || listing.id}</span>
              <Badge tone={status === "published" ? "success" : status === "pending" ? "warning" : status === "rejected" ? "danger" : "neutral"}>{t(`host.${status}`)}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status === "published" ? <Button href={`/rooms/${id}`} variant="secondary" size="sm"><Eye aria-hidden size={18} />{t("host.viewPublic")}</Button> : null}
          {(status === "draft" || status === "rejected") ? <Button onClick={onSubmit} disabled={saving} variant="secondary" size="sm">{t("host.submit")}</Button> : null}
          <Button onClick={onSave} loading={saving} variant="secondary" size="sm" className="!border-transparent !bg-[#e9c87c] !text-[#1a271d] hover:!bg-[#f2d596]"><FloppyDisk aria-hidden size={18} />{saving ? t("common.saving") : t("host.saveChanges")}</Button>
        </div>
      </header>

      {status === "pending" ? <div role="status" className="flex gap-2 rounded-control border border-caution/30 bg-caution/10 px-4 py-3 text-sm text-ink"><WarningCircle aria-hidden size={20} className="shrink-0 text-caution" />{t("host.pendingReviewNotice")}</div> : null}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
        <ListingFieldsCard form={form} setField={setField} setForm={setForm} disabled={saving} />

        <div className="min-w-0 space-y-4">
          <ListingImageUploader listingId={listing.id} onListingChange={refreshListingStatus} />
          <AmenitiesPickerCard grouped={grouped} picked={picked} onToggle={toggleAmenity} loading={loadingAmenities} error={amenitiesError} onRetry={retryAmenities} disabled={saving} />

          <section className="surface-panel space-y-4 p-4 sm:p-6">
            <div><h2 className="text-base font-semibold">{t("host.displayStatus")}</h2><p className="mt-1 text-sm text-muted-ink">{t("host.displayStatusHint")}</p></div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-muted-surface/40 p-3">
              <div className="flex items-center gap-2 text-sm"><span aria-hidden className={`h-2.5 w-2.5 rounded-full ${status === "published" ? "bg-positive" : status === "pending" ? "bg-caution" : "bg-muted-ink"}`} /><span className="font-semibold">{t(`host.${status}`)}</span></div>
              {status === "published" ? <Button onClick={onPause} disabled={saving} variant="secondary" size="sm">{t("host.paused")}</Button> : null}
              {status === "paused" ? <Button onClick={onResume} disabled={saving} variant="secondary" size="sm">{t("host.resume")}</Button> : null}
            </div>
            <p className="text-sm text-muted-ink">{status === "published" ? t("host.visible") : status === "pending" ? t("host.pendingReviewNotice") : status === "rejected" ? listing.reject_reason || t("host.hidden") : t("host.hidden")}</p>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-danger/30 bg-danger/5 p-4">
            <div className="flex items-start gap-2"><Trash aria-hidden size={20} className="mt-0.5 shrink-0 text-danger" /><div><h2 className="text-sm font-semibold text-danger">{t("host.dangerZone")}</h2><p className="mt-1 text-xs text-muted-ink">{t("host.dangerZoneHint")}</p></div></div>
            <Button onClick={onDelete} disabled={saving} variant="secondary" size="sm" className="!border-danger/40 !text-danger hover:!bg-danger/10"><Trash aria-hidden size={17} />{t("host.deleteListing")}</Button>
          </section>
        </div>
      </div>
    </div>
  );
}
