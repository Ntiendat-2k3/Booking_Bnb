"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminShell from "@/components/AdminShell";
import { apiFetch } from "@/lib/api";
import { adminService } from "@/services/adminService";
import Button from "@/components/ui/Button";
import {
  Users,
  Home,
  Sparkles,
  CalendarCheck,
  CreditCard,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
} from "lucide-react";
import RipleLoading from "@/components/loading/RipleLoading";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const MOCK_CHART_DATA = [
  { name: "Jan", value: 4000 },
  { name: "Feb", value: 3000 },
  { name: "Mar", value: 2000 },
  { name: "Apr", value: 2780 },
  { name: "May", value: 1890 },
  { name: "Jun", value: 2390 },
  { name: "Jul", value: 3490 },
];

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalUsers: 0,
    pendingListings: 0,
    activeBookings: 0,
    chartData: [],
  });

  useEffect(() => {
    let alive = true;
    async function boot() {
      try {
        await apiFetch("/api/v1/auth/csrf", { method: "GET" });
        const profile = await apiFetch("/api/v1/auth/profile", {
          method: "GET",
        });
        if (profile.data?.role !== "admin") throw new Error("not admin");

        // Fetch real stats
        const res = await adminService.getDashboardStats();
        if (alive && res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.error("Dashboard boot err:", err);
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

  if (loading) return <RipleLoading />;

  const statCards = [
    {
      label: "Total Revenue",
      value: (stats.totalRevenue || 0).toLocaleString() + " ₫",
      icon: CreditCard,
      trend: "+12.5%",
      up: true,
      color: "from-emerald-500/20 to-emerald-500/5",
    },
    {
      label: "Total Users",
      value: (stats.totalUsers || 0).toLocaleString(),
      icon: Users,
      trend: "+3.2%",
      up: true,
      color: "from-blue-500/20 to-blue-500/5",
    },
    {
      label: "Pending Listings",
      value: stats.pendingListings || 0,
      icon: Home,
      trend: "-2",
      up: false,
      color: "from-amber-500/20 to-amber-500/5",
    },
    {
      label: "Active Bookings",
      value: stats.activeBookings || 0,
      icon: CalendarCheck,
      trend: "+8.1%",
      up: true,
      color: "from-pink-500/20 to-pink-500/5",
    },
  ];

  const shortcuts = [
    { href: "/dashboard/users", label: "Users", icon: Users },
    { href: "/dashboard/listings", label: "Listings", icon: Home },
    { href: "/dashboard/amenities", label: "Amenities", icon: Sparkles },
    { href: "/dashboard/bookings", label: "Bookings", icon: CalendarCheck },
    { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
    { href: "/dashboard/reviews", label: "Reviews", icon: Star },
  ];

  return (
    <AdminShell>
      <div className="space-y-8 animate-fade-in">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`relative overflow-hidden rounded-3xl border ui-border glass p-6 transition hover:shadow-lg`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-40`}
              />
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-2xl bg-white/5">
                    <card.icon className="h-5 w-5 ui-muted" />
                  </div>
                  <div
                    className={`flex items-center gap-1 text-xs font-semibold ${card.up ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {card.up ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {card.trend}
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm font-medium ui-muted">
                    {card.label}
                  </div>
                  <div className="mt-1 text-2xl font-bold ui-fg">
                    {card.value}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-3xl border ui-border glass p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold ui-fg">Revenue Overview</h3>
                <p className="text-xs ui-muted">Monthly performance tracking</p>
              </div>
              <div className="p-2 rounded-xl bg-white/5">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.chartData || []}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff2d8a" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ff2d8a" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#7d7c98", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#12111a",
                      border: "1px solid #2a2740",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#ff2d8a"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border ui-border glass p-6 shadow-sm">
            <h3 className="text-lg font-bold ui-fg mb-4">Quick Links</h3>
            <div className="grid grid-cols-2 gap-3">
              {shortcuts.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 border border-white/5 transition hover:bg-white/10 hover:border-white/10"
                >
                  <s.icon className="h-6 w-6 ui-muted mb-2" />
                  <span className="text-xs font-semibold ui-fg">{s.label}</span>
                </Link>
              ))}
            </div>
            <div className="mt-6 p-4 rounded-2xl brand-gradient relative overflow-hidden group">
              <div className="relative z-10">
                <div className="text-sm font-bold text-white mb-1">
                  System Health
                </div>
                <div className="text-[10px] text-white/80">
                  All services are operational
                </div>
              </div>
              <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:scale-110 transition">
                <Sparkles className="h-10 w-10 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
