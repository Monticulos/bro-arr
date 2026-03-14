const TIMEZONE = "Europe/Oslo";

const osloFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  timeZoneName: "shortOffset",
});

export function norwegianTimeToUtc(localDatetime: string): string {
  const [datePart, timePart = "00:00:00"] = localDatetime.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second = 0] = timePart.split(":").map(Number);

  const asUtcMs = Date.UTC(year, month - 1, day, hour, minute, second);

  const osloOffsetHours = getOsloOffsetHours(new Date(asUtcMs));
  const utcMs = asUtcMs - osloOffsetHours * 60 * 60 * 1000;

  return new Date(utcMs).toISOString();
}

function getOsloOffsetHours(approximateDate: Date): number {
  const timeZonePart = osloFormatter
    .formatToParts(approximateDate)
    .find((part) => part.type === "timeZoneName");

  if (!timeZonePart) {
    throw new Error("Could not determine UTC offset for Europe/Oslo");
  }

  return parseInt(timeZonePart.value.replace("GMT", ""), 10);
}
