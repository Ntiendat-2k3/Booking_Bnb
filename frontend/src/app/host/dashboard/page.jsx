"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { apiFetch } from "@/lib/api";
import { formatVND } from "@/lib/format";
import Container from "@/components/layout/Container";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import Image from "next/image";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function HostDashboardPage() {
  const user = useSelector((s) => s.auth.user);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch("/api/v1/host/dashboard");
        setStats(res.data);
      } catch (err) {
        console.error("Lỗi khi tải thống kê:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <Container className="py-12 flex justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent"></div>
      </Container>
    );
  }

  if (!stats) return <Container className="py-12 text-center text-slate-500">Lỗi không thể tải dữ liệu.</Container>;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => formatVND(context.raw)
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (val) => formatVND(val)
        }
      }
    }
  };

  const lineData = {
    labels: stats.chartLabels,
    datasets: [
      {
        fill: true,
        label: 'Doanh thu',
        data: stats.chartValues,
        borderColor: '#FF385C',
        backgroundColor: 'rgba(255, 56, 92, 0.1)',
        tension: 0.4
      }
    ]
  };

  return (
    <Container className="py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Doanh thu & Thống kê</h1>
        <p className="text-slate-500 mt-2">Theo dõi hiệu suất kinh doanh từ các phòng cập nhật đến hôm nay.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <div className="text-slate-500 text-sm font-semibold uppercase mb-1">Tổng doanh thu</div>
          <div className="text-3xl font-bold text-slate-900">{formatVND(stats.totalRevenue)}</div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <div className="text-slate-500 text-sm font-semibold uppercase mb-1">Số phòng đã đặt</div>
          <div className="text-3xl font-bold text-slate-900">{stats.totalBookings}</div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <div className="text-slate-500 text-sm font-semibold uppercase mb-1">Đang chờ thanh toán</div>
          <div className="text-3xl font-bold text-slate-900">{stats.pendingBookings}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm h-[400px]">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Biểu đồ 6 tháng gần nhất</h3>
        <Line options={chartOptions} data={lineData} />
      </div>

      {/* Recent Bookings List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-200 bg-slate-50">
            <h3 className="text-lg font-bold text-slate-900">Giao dịch gần đây</h3>
         </div>
         <div className="divide-y divide-slate-200">
           {stats.recentBookings.length === 0 ? (
             <div className="p-6 text-center text-slate-500">Chưa có giao dịch nào.</div>
           ) : (
             stats.recentBookings.map((b) => (
               <div key={b.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 relative rounded-full overflow-hidden bg-slate-200 border">
                     {b.guest?.avatar_url ? (
                       <Image src={b.guest.avatar_url} alt="Guest" fill className="object-cover" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center font-bold text-slate-500">
                         {b.guest?.full_name?.charAt(0)}
                       </div>
                     )}
                   </div>
                   <div>
                     <div className="font-semibold text-slate-900">{b.listing?.title}</div>
                     <div className="text-sm text-slate-500">Khách: {b.guest?.full_name}</div>
                   </div>
                 </div>
                 <div className="text-right">
                   <div className="font-bold text-slate-900">{formatVND(b.total_amount)}</div>
                   <div className="text-xs text-slate-500">
                     {new Date(b.created_at).toLocaleDateString('vi-VN')}
                   </div>
                 </div>
               </div>
             ))
           )}
         </div>
      </div>
    </Container>
  );
}
