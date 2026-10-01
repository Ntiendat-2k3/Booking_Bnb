import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Mountains } from "@phosphor-icons/react/dist/ssr";
import { SITE_NAME } from "@/lib/constants";

/** Bố cục chung cho các màn xác thực, giữ ảnh và biểu mẫu phù hợp từng cỡ màn hình. */
export default function AuthTemplate({ title, description, coverAlt, homeLabel, children }) {
  return (
    <section className="auth-experience" aria-labelledby="auth-title">
      <div className="auth-card">
        <picture className="auth-backdrop">
          <source media="(max-width: 639px)" srcSet="/auth-background-mobile.webp" />
          <source media="(max-width: 1023px)" srcSet="/auth-background-tablet.webp" />
          <Image
            src="/auth-background-desktop.webp"
            alt={coverAlt}
            fill
            sizes="100vw"
            className="auth-backdrop-image"
            loading="eager"
            fetchPriority="high"
          />
        </picture>
        <div className="auth-visual" aria-hidden="true" />
        <div className="auth-panel">
          <div className="auth-panel-inner">
            <div className="auth-topline">
              <Link href="/" className="auth-brand" aria-label={SITE_NAME}>
                <Mountains aria-hidden size={38} weight="thin" />
                <span>{SITE_NAME}</span>
              </Link>
              <Link href="/" className="auth-home-link">
                <ArrowLeft aria-hidden size={17} />
                <span>{homeLabel}</span>
              </Link>
            </div>
            <h1 id="auth-title" className="auth-title">{title}</h1>
            <p className="auth-description">{description}</p>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
