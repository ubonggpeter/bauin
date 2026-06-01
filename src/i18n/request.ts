import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const LOCALES = ["en", "yo", "ha", "ig"] as const;
export type Locale = (typeof LOCALES)[number];

function isLocale(v: string | undefined): v is Locale {
  return LOCALES.includes(v as Locale);
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get("bauin-locale")?.value;
  const locale: Locale = isLocale(raw) ? raw : "en";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
