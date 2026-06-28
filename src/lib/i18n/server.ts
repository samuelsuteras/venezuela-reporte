import "server-only";
import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "./config";
import { getT, type Translator } from "./index";

/** Locale from the cookie (server components / RSC), default Spanish. */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Translator for the current request's locale (server side). */
export async function getServerT(): Promise<Translator> {
  return getT(await getLocale());
}
