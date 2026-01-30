"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/lib/api";
import Button from "@/components/ui/Button";
import {
  Users,
  Home,
  Sparkles,
  CalendarCheck,
  CreditCard,
  Star,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function boot() {
      try {
        await apiFetch("/api/v1/auth/csrf", { method: "GET" });

        try {
          const profile = await apiFetch("/api/v1/auth/profile", {
            method: "GET",
          });
          if (profile.data?.role !== "admin") throw new Error("not admin");
          if (alive) setMe(profile.data);
          return;
        } catch (e) {
          if (e?.status !== 401) throw e;
        }

        await apiFetch("/api/v1/auth/refresh", {
          method: "POST",
          body: JSON.stringify({}),
        });

        const profile2 = await apiFetch("/api/v1/auth/profile", {
          method: "GET",
        });
        if (profile2.data?.role !== "admin") throw new Error("not admin");
        if (alive) setMe(profile2.data);
      } catch {
        router.replace("/login");
      } finally {
        if (alive) setLoading(false);
      }
    }

    boot();
    return () => {
      alive = false;
    };
  }, [router]);

  if (loading) return <div className="p-6">Loading...</div>;

  const shortcuts = [
    {
      href: "/dashboard/users",
      label: "Users",
      icon: Users,
      desc: "Quản lý role & account",
    },
    {
      href: "/dashboard/listings",
      label: "Listings",
      icon: Home,
      desc: "Duyệt listing host gửi",
    },
    {
      href: "/dashboard/amenities",
      label: "Amenities",
      icon: Sparkles,
      desc: "CRUD tiện ích",
    },
    {
      href: "/dashboard/bookings",
      label: "Bookings",
      icon: CalendarCheck,
      desc: "Xem booking + payment",
    },
    {
      href: "/dashboard/payments",
      label: "Payments",
      icon: CreditCard,
      desc: "Theo dõi thanh toán",
    },
    {
      href: "/dashboard/reviews",
      label: "Reviews",
      icon: Star,
      desc: "Ẩn/hiện/xoá review",
    },
  ];

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className="group rounded-2xl border ui-border ui-panel p-5 shadow-sm transition hover:-translate-y-[1px] hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5 group-hover:bg-[#FF385C] transition">
                        <Icon className="w-5 h-5 transition ui-muted group-hover:text-white" />
                      </span>
                      <div className="text-base font-semibold ui-fg">
                        {s.label}
                      </div>
                    </div>
                    <div className="mt-2 text-sm ui-muted">{s.desc}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="pointer-events-none"
                  >
                    Open →
                  </Button>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AdminShell>
  );
}
