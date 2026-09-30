import Link from "next/link";
import { getServerTranslator } from "@/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerTranslator();
  return { title: t("notFound.title"), description: t("notFound.description") };
}
export default async function NotFound() {
  const { t } = await getServerTranslator();
  return <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-6 sm:p-10">
    <h1 className="text-2xl font-bold text-ink">{t("notFound.title")}</h1>
    <p className="mt-3 leading-7 text-muted-ink">{t("notFound.hint")}</p>
    <div className="mt-6 flex flex-wrap gap-3">
      <Link href="/" className="inline-flex min-h-11 items-center rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-on-brand hover:bg-brand-dark">{t("common.backHome")}</Link>
      <Link href="/search" className="inline-flex min-h-11 items-center rounded-xl border border-line px-5 py-3 text-sm font-semibold hover:bg-muted-surface">{t("common.goSearch")}</Link>
    </div>
  </div>;
}
