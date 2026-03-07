const NORWEGIAN_LOCALE = "nb-NO";
const NORWEGIAN_TIMEZONE = "Europe/Oslo";

export function formatMonthHeading(iso: string): string {
  const formatted = new Intl.DateTimeFormat(NORWEGIAN_LOCALE, {
    month: "long",
    year: "numeric",
    timeZone: NORWEGIAN_TIMEZONE,
  }).format(new Date(iso));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatEventDate(iso: string): string {
  return new Intl.DateTimeFormat(NORWEGIAN_LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: NORWEGIAN_TIMEZONE,
  }).format(new Date(iso));
}

export function formatUpdatedAtDate(iso: string): string {
  return new Intl.DateTimeFormat(NORWEGIAN_LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: NORWEGIAN_TIMEZONE,
  }).format(new Date(iso));
}
