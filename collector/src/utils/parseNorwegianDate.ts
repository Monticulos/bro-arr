const MONTH_PREFIXES = [
  "jan", "feb", "mar", "apr", "mai", "jun",
  "jul", "aug", "sep", "okt", "nov", "des",
];

const NUMERIC_DATE = /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2,4})/;
const NAMED_MONTH_DATE = /(\d{1,2})\.?\s*([a-zæøå]{3,})\.?\s*(\d{4})?/;
const DAY_AND_MONTH = /(\d{1,2})\.\s*(\d{1,2})(?!\d)/;
const TIME = /(\d{1,2})[:.](\d{2})/;

const MIDNIGHT = "00:00:00";
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/** A date this far in the past is read as next year's date rather than a date that has been and gone. */
const DAYS_BEFORE_NEXT_YEAR = 31;

interface FoundDate {
  match: string;
  day: number;
  month: number;
  year?: number;
}

/** Turns Norwegian date text into local ISO 8601 without a zone, or null when it holds no date. */
export function parseNorwegianDate(text: string, today: Date): string | null {
  const found = findDate(text.toLowerCase());
  if (!found) return null;

  const year = found.year ?? inferYear(found, today);
  if (!isRealDate(year, found.month, found.day)) return null;

  const time = findTime(text.replace(found.match, " "));
  return `${year}-${pad(found.month)}-${pad(found.day)}T${time}`;
}

function findDate(text: string): FoundDate | null {
  return (
    findNumericDate(text) ?? findNamedMonthDate(text) ?? findDayAndMonth(text)
  );
}

function findNumericDate(text: string): FoundDate | null {
  const match = NUMERIC_DATE.exec(text);
  if (!match) return null;

  const [whole, day, month, year] = match;
  return toFoundDate(whole, Number(day), Number(month), fullYear(Number(year)));
}

function findNamedMonthDate(text: string): FoundDate | null {
  const match = NAMED_MONTH_DATE.exec(text);
  if (!match) return null;

  const [whole, day, monthName, year] = match;
  const month = MONTH_PREFIXES.indexOf(monthName.slice(0, 3)) + 1;
  return toFoundDate(whole, Number(day), month, year ? Number(year) : undefined);
}

function findDayAndMonth(text: string): FoundDate | null {
  const match = DAY_AND_MONTH.exec(text);
  if (!match) return null;

  const [whole, day, month] = match;
  return toFoundDate(whole, Number(day), Number(month), undefined);
}

function toFoundDate(
  match: string,
  day: number,
  month: number,
  year: number | undefined,
): FoundDate | null {
  const isInRange = day >= 1 && day <= 31 && month >= 1 && month <= 12;
  return isInRange ? { match, day, month, year } : null;
}

function fullYear(year: number): number {
  return year < 100 ? 2000 + year : year;
}

function inferYear({ day, month }: FoundDate, today: Date): number {
  const thisYear = today.getUTCFullYear();
  const daysPast =
    (today.getTime() - Date.UTC(thisYear, month - 1, day)) /
    MILLISECONDS_PER_DAY;

  return daysPast > DAYS_BEFORE_NEXT_YEAR ? thisYear + 1 : thisYear;
}

function isRealDate(year: number, month: number, day: number): boolean {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDate() === day;
}

function findTime(text: string): string {
  const match = TIME.exec(text);
  if (!match) return MIDNIGHT;

  const [, hour, minute] = match;
  const isInRange = Number(hour) < 24 && Number(minute) < 60;
  return isInRange ? `${pad(Number(hour))}:${minute}:00` : MIDNIGHT;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
