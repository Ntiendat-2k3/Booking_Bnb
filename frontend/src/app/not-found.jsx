import Link from "next/link";
import Container from "@/components/layout/Container";

export const metadata = {
  title: "404 | Booking BnB",
  description: "Trang bạn tìm kiếm không tồn tại hoặc đã bị xoá.",
};

export default function NotFound() {
  return (
    <Container className="py-16">
      <div className="max-w-2xl p-6 mx-auto bg-white border rounded-2xl">
        <h1 className="text-2xl font-bold text-slate-900">Không tìm thấy trang</h1>
        <p className="mt-2 text-slate-600">
          Link có thể đã sai hoặc nội dung đã bị gỡ.
        </p>
        <div className="flex gap-3 mt-6">
          <Link
            href="/"
            className="px-4 py-2 text-sm font-semibold text-white rounded-xl bg-brand hover:opacity-90"
          >
            Về trang chủ
          </Link>
          <Link
            href="/search"
            className="px-4 py-2 text-sm font-semibold border rounded-xl hover:bg-slate-50"
          >
            Tới tìm kiếm
          </Link>
        </div>
      </div>
    </Container>
  );
}
