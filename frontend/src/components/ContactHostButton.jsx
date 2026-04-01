"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { ChatIcon } from "@/components/icons";
import { apiFetch } from "@/lib/api";

export default function ContactHostButton({ hostId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const currentUser = useSelector((s) => s.auth.user);

  // Mặc định nạp sẵn email nếu Login
  const [email, setEmail] = useState(currentUser ? currentUser.email : "");
  const [phone, setPhone] = useState(currentUser ? currentUser.phone || "" : "");
  const [content, setContent] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !content) return;
    
    setLoading(true);
    try {
      await apiFetch(`/api/v1/hosts/${hostId}/contact`, {
        method: "POST",
        body: { email, phone, content },
      });
      setSuccess(true);
      setTimeout(() => {
         setIsOpen(false);
         setSuccess(false);
         setContent("");
      }, 3000);
    } catch (error) {
      console.error(error);
      alert("Đã xảy ra lỗi khi gửi yêu cầu. Xin hãy thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-900 bg-white md:px-5 px-4 py-2 text-[13px] md:text-sm font-semibold text-slate-900 hover:bg-slate-50 hover:shadow-sm transition-all"
      >
        <ChatIcon className="w-4 h-4" />
        Liên hệ chủ nhà
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl">
            {success ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Đã gửi liên hệ</h3>
                <p className="text-sm text-slate-500">
                  Cảm ơn bạn. Yêu cầu liên hệ đã được gửi đến chủ nhà bằng email. Họ sẽ sớm phản hồi bạn.
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Liên hệ</h3>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Email <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email nhận phản hồi"
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Số điện thoại (tùy chọn)</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Zalo / Điện thoại"
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1">Tin nhắn <span className="text-red-500">*</span></label>
                    <textarea
                      required
                      rows={4}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Xin chào, tôi muốn hỏi về..."
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !email || !content}
                    className="w-full py-3.5 bg-brand text-white font-bold rounded-xl hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      "Gửi tin nhắn"
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
