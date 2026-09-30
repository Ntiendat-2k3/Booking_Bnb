import Link from "next/link";
import {
  FacebookLogo,
  InstagramLogo,
  XLogo,
} from "@phosphor-icons/react/dist/ssr";
import { getServerTranslator } from "@/i18n/server";
import Container from "@/components/layout/Container";
import LocaleSwitcher from "@/components/molecules/LocaleSwitcher";
import { FOOTER_LINKS } from "@/lib/constants";

const SOCIAL_LINKS = [
  { label: "footer.social.facebook", href: "https://facebook.com", Icon: FacebookLogo },
  { label: "footer.social.x", href: "https://x.com", Icon: XLogo },
  { label: "footer.social.instagram", href: "https://instagram.com", Icon: InstagramLogo },
];

export default async function Footer() {
  const { t } = await getServerTranslator();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer mt-20 border-t border-line bg-surface">
      <Container>
        <div className="flex flex-col gap-3 border-b border-line py-8 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="site-wordmark w-fit text-2xl tracking-[-0.05em] text-ink">{t("seo.siteName")}</Link>
          <p className="text-sm text-muted-ink">{t("footer.tagline")}</p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 py-10 lg:grid-cols-4">
          {FOOTER_LINKS.map((section) => (
            <section key={section.titleKey}>
              <h2 className="mb-4 text-sm font-bold text-ink">
                {t(section.titleKey)}
              </h2>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.labelKey}>
                    {link.href ? (
                      <Link
                        href={link.href}
                        className="text-sm text-muted-ink transition hover:text-ink hover:underline"
                      >
                        {t(link.labelKey)}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-ink/70">
                        {t(link.labelKey)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="flex flex-col gap-5 border-t border-line py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-ink">
            <span>{t("footer.copyright", { year })}</span>
            <span aria-hidden>·</span>
            <span>{t("footer.privacy")}</span>
            <span aria-hidden>·</span>
            <span>{t("footer.terms")}</span>
            <span aria-hidden>·</span>
            <Link
              href="/sitemap.xml"
              className="transition hover:text-ink hover:underline"
            >
              {t("footer.sitemap")}
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LocaleSwitcher />
            <span className="text-sm font-semibold text-ink">{t("common.currencyDisplay")}</span>
            <div className="ml-1 flex items-center gap-1">
              {SOCIAL_LINKS.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(label)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink transition hover:bg-surface hover:text-brand"
                >
                  <Icon aria-hidden size={20} weight="fill" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </footer>
  );
}
