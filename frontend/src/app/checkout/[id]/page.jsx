"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import { createStripePayment } from "@/services/bookingService";
import { apiFetch } from "@/lib/api";
import { formatVND } from "@/lib/format";
import Container from "@/components/layout/Container";
import Image from "next/image";

export default function CheckoutPage() {
  const { id } = useParams();
  const router = useRouter();
  const user = useSelector((s) => s.auth.user);
  const isInitialized = useSelector((s) => s.auth.isInitialized);

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    async function fetchBooking() {
      if (!isInitialized) return;
      if (!user) {
        notifyInfo("Bạn cần đăng nhập để xem trang này.");
        router.push("/login");
        return;
      }

      try {
        setLoading(true);
        const res = await apiFetch(`/api/v1/bookings/${id}`);
        setBooking(res.data.booking);
      } catch (err) {
        notifyError("Không tìm thấy thông tin đặt phòng");
        router.push("/trips");
      } finally {
        setLoading(false);
      }
    }
    fetchBooking();
  }, [id, user, isInitialized, router]);

  async function handlePayment() {
    setPaying(true);
    try {
      const url = await createStripePayment(id);
      if (!url) throw new Error("Không tạo được URL thanh toán");
      notifySuccess("Đang chuyển tới trang thanh toán bảo mật...");
      window.location.href = url;
    } catch (e) {
      notifyError(e?.message || "Lỗi tạo thanh toán");
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <Container>
        <div className="py-20 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
        </div>
      </Container>
    );
  }

  if (!booking) return null;

  const { listing } = booking;
  const cover = listing?.images?.find((img) => img.is_cover) || listing?.images?.[0];

  return (
    <Container>
      <div className="py-10 lg:py-16">
        <h1 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          Xác nhận và thanh toán
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-12 lg:gap-20">
          {/* Left Column */}
          <div className="space-y-10">
            <section className="space-y-4 pb-10 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Chuyến đi của bạn</h2>
              
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-slate-800">Ngày</h3>
                  <p className="text-slate-600">{booking.check_in} – {booking.check_out}</p>
                </div>
                <button className="text-brand font-semibold hover:underline">Chỉnh sửa</button>
              </div>

              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-slate-800">Khách</h3>
                  <p className="text-slate-600">{booking.guests_count} khách</p>
                </div>
                <button className="text-brand font-semibold hover:underline">Chỉnh sửa</button>
              </div>
            </section>

            <section className="space-y-4 pb-10 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-900">Thanh toán bằng</h2>
              <div className="p-4 border border-slate-300 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-8 h-8 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.143-3.356-2.077 0-.741.761-1.36 2.053-1.36 1.705 0 3.098.667 4.14 1.488l1.373-3.037A8.995 8.995 0 0012.636 2.5C7.303 2.5 4.318 5.485 4.318 9.206c0 4.136 3.993 5.424 6.945 6.354 2.378.749 3.253 1.258 3.253 2.188 0 .863-.822 1.503-2.316 1.503-1.84 0-3.662-.878-4.81-1.815l-1.401 3.203a9.227 9.227 0 005.679 1.86c5.539 0 8.795-2.73 8.795-6.666 0-3.83-3.32-5.18-6.487-6.683z" />
                  </svg>
                  <span className="font-semibold">Thẻ Tín dụng / Thẻ Ghi nợ qua Stripe</span>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">Chính sách hủy</h2>
              <p className="text-slate-600">
                <span className="font-semibold text-slate-800">Hủy miễn phí trong vòng 48 giờ.</span> Sau đó, hủy trước ngày nhận phòng sẽ được hoàn lại 50% tiền phòng, không bao gồm phí dịch vụ.
              </p>
              <p className="text-xs text-slate-500 mt-4">
                Bằng việc chọn nút bên dưới, tôi đồng ý với Nội quy nhà của Chủ nhà, Chính sách cơ bản của Booking BnB cho Khách, Chính sách đặt lại phòng và hoàn tiền, đồng thời đồng ý rằng Booking BnB có thể tính phí vào phương thức thanh toán của tôi nếu tôi phải chịu trách nhiệm về thiệt hại.
              </p>
            </section>

            <button
              onClick={handlePayment}
              disabled={paying}
              className="w-full lg:w-max py-4 px-8 text-lg bg-brand text-white font-bold rounded-xl transition-all hover:bg-brand-dark disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {paying ? "Đang xử lý thiết lập..." : "Xác nhận và thanh toán"}
            </button>
          </div>

          {/* Right Column - Order Summary Box */}
          <div className="relative">
            <div className="sticky top-28 border border-slate-200 bg-white p-6 rounded-2xl shadow-xl shadow-slate-200/50">
              <div className="flex gap-4 pb-6 border-b border-slate-200">
                <div className="relative h-[106px] w-[124px] rounded-xl overflow-hidden shrink-0">
                  <Image 
                    src={cover?.url || "https://picsum.photos/seed/room/800/600"} 
                    alt={listing?.title || "Phòng"}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col justify-start">
                  <div className="text-xs text-slate-500 font-semibold uppercase mb-1">{listing?.category || "Chỗ ở"}</div>
                  <div className="text-sm text-slate-900 font-medium line-clamp-2">{listing?.title}</div>
                  <div className="mt-auto text-xs text-slate-600 flex items-center gap-1">
                    <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>Mới</span>
                  </div>
                </div>
              </div>

              <div className="py-6 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 mb-4">Chi tiết giá</h3>
                
                <div className="flex justify-between items-center text-slate-600 mb-3">
                  <span>{formatVND(booking.total_amount)}</span>
                </div>
                {/* Note: if you have night counts, we can display price * nights here */}
              </div>

              <div className="pt-6 flex justify-between items-center font-bold text-lg text-slate-900">
                <span>Tổng (VND)</span>
                <span>{formatVND(booking.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
