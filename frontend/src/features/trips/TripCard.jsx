import Link from "next/link";
import Image from "next/image";
import { formatVND } from "@/lib/format";

function badge(status) {
  const base = "rounded-full px-2 py-0.5 text-xs font-semibold";
  switch (status) {
    case "confirmed":
      return `${base} bg-emerald-50 text-emerald-700`;
    case "pending_payment":
      return `${base} bg-amber-50 text-amber-700`;
    case "cancelled":
      return `${base} bg-slate-100 text-slate-700`;
    case "completed":
      return `${base} bg-sky-50 text-sky-700`;
    default:
      return `${base} bg-slate-100 text-slate-700`;
  }
}

function statusLabel(status) {
  switch (status) {
    case "pending_payment":
      return "Chờ thanh toán";
    case "confirmed":
      return "Đã xác nhận";
    case "completed":
      return "Đã checkout";
    case "cancelled":
      return "Đã hủy";
    default:
      return status;
  }
}

export default function TripCard({
  booking,
  busy,
  onCheckout,
  onRepay,
  onCancel,
}) {
  const listing = booking.listing;
  const cover = listing?.cover_url;
  const lastPayment = (booking.payments || [])[0];
  const isPaid = lastPayment?.status === "succeeded";

  return (
    <div className="p-4 bg-white border rounded-2xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full h-28 sm:w-44">
          <Image
            src={cover || "https://picsum.photos/seed/trip/600/400"}
            alt={listing?.title || "Trip"}
            fill
            sizes="(max-width: 640px) 100vw, 176px"
            className="object-cover rounded-xl"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-lg font-semibold truncate">
              {listing?.title || "Phòng"}
            </div>
            <span className={badge(booking.status)}>
              {statusLabel(booking.status)}
            </span>
          </div>
          <div className="mt-1 text-sm text-slate-600">
            {booking.check_in} → {booking.check_out} • {booking.guests_count} khách
          </div>
          <div className="mt-1 text-sm text-slate-700">
            Tổng: <span className="font-semibold">{formatVND(booking.total_amount)}</span>
          </div>
          {lastPayment && (
            <div className="mt-1 text-xs text-slate-500">
              Payment: {lastPayment.provider} • {lastPayment.status}
            </div>
          )}

          {booking.review && (
            <div className="mt-2 text-xs text-slate-600">
              Bạn đã đánh giá: <span className="font-semibold">{booking.review.rating}★</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap shrink-0 gap-2">
          <Link
            href={`/rooms/${listing?.id}`}
            className="px-3 py-2 text-sm font-semibold border rounded-xl hover:bg-slate-50"
          >
            Xem phòng
          </Link>

          {!booking.can_review && booking.review && (
            <Link
              href={`/rooms/${listing?.id}#reviews`}
              className="px-3 py-2 text-sm font-semibold border rounded-xl hover:bg-slate-50"
            >
              Xem đánh giá
            </Link>
          )}

          {booking.can_review && (
            <Link
              href={`/rooms/${listing?.id}?review=1#reviews`}
              className="px-3 py-2 text-sm font-semibold text-white rounded-xl bg-brand hover:bg-brand-dark"
            >
              Đánh giá
            </Link>
          )}

          {booking.status === "confirmed" && isPaid && (
            <button
              onClick={() => onCheckout(booking.id)}
              disabled={busy.checkoutId === booking.id}
              className={`rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {busy.checkoutId === booking.id ? "Đang checkout..." : "Checkout"}
            </button>
          )}

          {booking.status === "pending_payment" && (
            <>
              <button
                onClick={() => onRepay(booking.id)}
                disabled={busy.repayId === booking.id}
                className="px-3 py-2 text-sm font-semibold text-white rounded-xl bg-brand hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy.repayId === booking.id ? "Đang tạo..." : "Thanh toán"}
              </button>
              <button
                onClick={() => onCancel(booking.id)}
                disabled={busy.cancelId === booking.id}
                className="px-3 py-2 text-sm font-semibold border rounded-xl hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy.cancelId === booking.id ? "Đang hủy..." : "Hủy"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
