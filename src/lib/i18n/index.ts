import { DEFAULT_LOCALE, type Locale } from "./config";
import { messages, type MessageKey } from "./messages";

export type { Locale } from "./config";
export type { MessageKey } from "./messages";

/** Translate a key; `{name}` placeholders are replaced from `vars`. */
export type Translator = (
  key: MessageKey,
  vars?: Record<string, string | number>,
) => string;

/** Build a translator bound to a locale (falls back to the default locale,
 * then to the raw key). Usable on server and client. */
export function getT(locale: Locale): Translator {
  const dict = messages[locale] ?? messages[DEFAULT_LOCALE];
  return (key, vars) => {
    let text: string = dict[key] ?? messages[DEFAULT_LOCALE][key] ?? key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replace(`{${name}}`, String(value));
      }
    }
    return text;
  };
}
