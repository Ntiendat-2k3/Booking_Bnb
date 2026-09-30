import Image from "next/image";
import { SITE_IMAGES } from "@/lib/constants";

export default function AuthTemplate({ title, description, coverTitle, coverDescription, coverAlt, children }) {
  return (
    <div className="surface-panel mx-auto grid w-full max-w-5xl overflow-hidden lg:grid-cols-[0.95fr_1.05fr]">
      <div className="hidden flex-col bg-muted-surface p-4 lg:flex">
        <div className="relative min-h-80 flex-1 overflow-hidden rounded-control">
          <Image src={SITE_IMAGES.interior} alt={coverAlt} fill sizes="(max-width: 1024px) 100vw, 440px" className="object-cover" priority />
        </div>
        <div className="p-6 pb-8 text-ink">
          <h2 className="text-3xl font-bold leading-tight tracking-[-0.04em]">{coverTitle || title}</h2>
          <p className="mt-3 text-sm leading-7 text-muted-ink">{coverDescription || description}</p>
        </div>
      </div>
      <div className="min-w-0 self-center p-6 sm:p-10 lg:p-12">
        <h1 className="page-heading">{title}</h1>
        <p className="mb-8 mt-3 text-sm leading-7 text-muted-ink">{description}</p>
        {children}
      </div>
    </div>
  );
}
