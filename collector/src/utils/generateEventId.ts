// Deterministic ID makes favorites in local storage stable across runs
export function generateEventId(sourceName: string, startDate: string): string {
  const normalizedDateTime = new Date(startDate).toISOString();
  const normalizedSourceName = sourceName.replaceAll(" ", "-");
  return `${normalizedSourceName}-${normalizedDateTime}`;
}
