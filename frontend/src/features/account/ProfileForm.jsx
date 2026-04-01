"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useDispatch, useSelector } from "react-redux";
import { apiFetch } from "@/lib/api";
import { apiUpload } from "@/lib/apiUpload";
import { notifyError, notifySuccess } from "@/lib/notify";
import { setUser } from "@/store/authSlice";

import { Camera, Save, User as UserIcon, Phone as PhoneIcon, MapPin } from "lucide-react";

export default function ProfileForm() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.auth.user);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [about, setAbout] = useState("");
  const [location, setLocation] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setPhone(user.phone || "");
      setAbout(user.about || "");
      setLocation(user.location || "");
    }
  }, [user]);

  async function saveProfile() {
    setIsSaving(true);
    try {
      const res = await apiFetch("/api/v1/users/me", {
        method: "PATCH",
        body: { full_name: fullName, phone, about, location },
      });
      dispatch(setUser(res.data));
      notifySuccess("Đã cập nhật thông tin cá nhân");
    } catch (e) {
      notifyError(e?.errors ? Object.values(e.errors).join(", ") : e?.message || "Không thể cập nhật");
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadAvatar(file) {
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await apiUpload("/api/v1/users/me/avatar", fd, {
        method: "POST",
      });
      dispatch(setUser(res.data?.user));
      notifySuccess("Đã cập nhật ảnh đại diện");
    } catch (e) {
      notifyError(e?.message || "Không thể upload avatar");
    }
  }

  if (!user) return null;

  return (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
      <div className="p-8 border-b border-slate-50">
        <h2 className="text-xl font-bold text-slate-900">Thông tin cá nhân</h2>
        <p className="text-sm text-slate-500">Cập nhật tên và thông tin liên hệ của bạn.</p>
      </div>

      <div className="p-8">
        <div className="flex flex-col items-center gap-10 md:flex-row md:items-start">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-slate-50 transition-all group-hover:ring-brand/20">
              <Image
                src={user.avatar_url || "https://i.pravatar.cc/150"}
                alt={user.full_name || "Avatar"}
                width={128}
                height={128}
                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <label className="absolute bottom-0 right-0 p-2.5 bg-brand text-white rounded-full shadow-lg cursor-pointer transition-transform hover:scale-110 active:scale-95">
              <Camera size={18} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          <div className="flex-1 w-full space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <UserIcon size={16} className="text-slate-400" />
                  Họ và tên
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none"
                  placeholder="VD: Nguyễn Văn An"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <PhoneIcon size={16} className="text-slate-400" />
                  Số điện thoại
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none"
                  placeholder="0987 654 321"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <MapPin size={16} className="text-slate-400" />
                  Địa điểm
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none"
                  placeholder="VD: Hà Nội, Việt Nam"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  Giới thiệu bản thân
                </label>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  className="w-full h-32 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all outline-none resize-none"
                  placeholder="Chia sẻ một chút về bản thân bạn..."
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                disabled={isSaving}
                onClick={saveProfile}
                className="flex items-center gap-2 px-8 py-3 bg-brand text-white rounded-2xl font-bold shadow-lg shadow-brand/25 hover:bg-brand-dark hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save size={18} />
                )}
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
