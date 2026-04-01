"use client";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile } from "@/store/authThunks";
import Link from "next/link";
import Image from "next/image";
import {
  User,
  Mail,
  Calendar,
  ShieldCheck,
  Settings,
  Star,
  MapPin,
  Camera,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { logout } from "@/store/authThunks";
import Container from "@/components/layout/Container";

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { user, status, error } = useSelector((s) => s.auth);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (!user) dispatch(fetchProfile());
  }, [dispatch, user]);

  if (!isMounted) {
    return null; // Tránh Hydration error bằng cách không render cho đến khi mount xong ở client
  }

  if (!user) {
    return (
      <Container className="py-20 text-center">
        <div className="max-w-md mx-auto p-10 bg-white border border-slate-100 rounded-[40px] shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={40} className="text-slate-300" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Chào mừng bạn
          </h1>
          <p className="text-slate-500 mb-8">
            Vui lòng đăng nhập để xem thông tin hồ sơ của bạn.
          </p>
          <Link
            className="block w-full py-4 bg-brand text-white font-bold rounded-2xl hover:bg-brand-dark transition-all shadow-lg shadow-brand/20"
            href="/login"
          >
            Đăng nhập ngay
          </Link>
          {status === "loading" && (
            <p className="mt-4 text-sm animate-pulse text-brand">
              Đang kết nối...
            </p>
          )}
        </div>
      </Container>
    );
  }

  const joinDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("vi-VN", {
        month: "long",
        year: "numeric",
      })
    : "Thành viên mới";

  return (
    <div className="min-h-screen bg-[#F7F7F7] pb-20">
      {/* Dynamic Header Background */}
      <div className="h-64 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand/20 to-purple-500/20 mix-blend-overlay"></div>
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#F7F7F7] to-transparent"></div>
      </div>

      <Container className="-mt-32 relative z-10">
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Essential Info */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-8 rounded-[40px] border border-white shadow-xl shadow-slate-200/50 text-center">
              <div className="relative w-32 h-32 mx-auto mb-6">
                <div className="w-full h-full rounded-full overflow-hidden border-4 border-white shadow-lg ring-1 ring-slate-100">
                  <Image
                    src={user.avatar_url || "https://i.pravatar.cc/150"}
                    alt={user.full_name}
                    fill
                    className="object-cover"
                  />
                </div>
                <Link
                  href="/account/settings?tab=profile"
                  className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-slate-100 text-slate-600 hover:text-brand transition-colors"
                >
                  <Camera size={18} />
                </Link>
              </div>

              <h1 className="text-2xl font-black text-slate-900 leading-tight">
                {user.full_name}
              </h1>
              <p className="text-brand font-bold text-sm tracking-widest uppercase mt-1">
                {user.role === "host" ? "Chủ nhà siêu cấp" : "Khách du lịch"}
              </p>

              <div className="mt-8 pt-8 border-t border-slate-50 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xl font-black text-slate-900">
                    {user.reviews?.length || 0}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Đánh giá
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-black text-slate-900">
                    {joinDate ? joinDate.split(" ").slice(-2).join(" ") : "Mới"}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Đã tham gia
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[40px] border border-white shadow-sm space-y-6">
              <h3 className="font-bold text-slate-900 text-lg">
                Thông tin xác minh
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-600">
                  <ShieldCheck size={20} className="text-emerald-500" />
                  <span className="text-sm font-medium">
                    Danh tính đã xác minh
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <Mail size={20} className="text-emerald-500" />
                  <span className="text-sm font-medium truncate max-w-[150px]" title={user.email}>
                    {user.email || "Email chưa xác minh"}
                  </span>
                </div>
                <div className={`flex items-center gap-3 ${user.phone ? "text-slate-600" : "text-slate-400"}`}>
                  {user.phone ? (
                    <ShieldCheck size={20} className="text-emerald-500" />
                  ) : (
                    <div className="w-5 h-5 flex items-center justify-center">
                      <span className="text-xs font-bold underline">?</span>
                    </div>
                  )}
                  <span className="text-sm font-medium">
                    {user.phone ? user.phone : "Số điện thoại (chưa)"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Detailed Content */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-10 rounded-[40px] border border-white shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-slate-900">Về tôi</h2>
                <Link
                  href="/account/settings"
                  className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-brand transition-colors"
                >
                  Sửa hồ sơ <ChevronRight size={16} />
                </Link>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <div className="flex gap-4 p-6 bg-slate-50 rounded-3xl group hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-brand shadow-sm transition-colors">
                    <Calendar size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Gia nhập từ
                    </p>
                    <p className="font-bold text-slate-900 mt-1">{joinDate}</p>
                  </div>
                </div>

                <div className="flex gap-4 p-6 bg-slate-50 rounded-3xl group hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-brand shadow-sm transition-colors">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      Sống tại
                    </p>
                    <p className="font-bold text-slate-900 mt-1">
                      {user.location || "Chưa cập nhật"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-10 p-8 border-2 border-dashed border-slate-100 rounded-[32px] text-center">
                <p className="text-slate-400 italic">
                  {user.about || "Ghi lại một vài dòng giới thiệu về bản thân để mọi người biết thêm về bạn nhé!"}
                </p>
                {!user.about && (
                  <Link
                    href="/account/settings"
                    className="inline-block mt-4 text-brand font-bold hover:underline"
                  >
                    Thêm giới thiệu
                  </Link>
                )}
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <Link href="/account/settings" className="group">
                <div className="h-full bg-white p-8 rounded-[40px] border border-white shadow-sm flex items-center justify-between group-hover:shadow-lg transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand group-hover:text-white transition-all">
                      <Settings size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 leading-none">
                        Cài đặt
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Quản lý tài khoản và bảo mật
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={20}
                    className="text-slate-200 group-hover:text-brand"
                  />
                </div>
              </Link>

              <button
                onClick={() => dispatch(logout())}
                className="group w-full text-left"
              >
                <div className="h-full bg-white p-8 rounded-[40px] border border-white shadow-sm flex items-center justify-between group-hover:shadow-lg transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-all">
                      <LogOut size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 leading-none text-rose-500">
                        Đăng xuất
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        Thoát khỏi phiên làm việc
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={20}
                    className="text-slate-200 group-hover:text-rose-500"
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
