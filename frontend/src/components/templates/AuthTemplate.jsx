import Image from "next/image";

export default function AuthTemplate({ title, description, coverTitle, coverDescription, coverAlt, children }) {
  return (
    <div className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-[20px] border border-line bg-surface shadow-soft lg:grid-cols-2">
      <div className="relative hidden min-h-[560px] lg:block">
        <Image src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=1000&auto=format&fit=crop" alt={coverAlt} fill sizes="50vw" className="object-cover" />
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 to-transparent p-8 text-white">
          <h2 className="text-3xl font-bold tracking-tight">{coverTitle || title}</h2>
          <p className="mt-3 leading-7 text-white/90">{coverDescription || description}</p>
        </div>
      </div>
      <div className="min-w-0 p-6 sm:p-10">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mb-8 mt-2 text-sm leading-6 text-muted-ink">{description}</p>
        {children}
      </div>
    </div>
  );
}
