const INDENT = "  ";

function errorArguments(error: unknown): unknown[] {
  return error === undefined ? [] : [error];
}

export function logPhase(message: string): void {
  console.log(message);
}

export function logDetail(message: string): void {
  console.log(INDENT + message);
}

export function warnPhase(message: string, error?: unknown): void {
  console.warn(message, ...errorArguments(error));
}

export function warnDetail(message: string, error?: unknown): void {
  console.warn(INDENT + message, ...errorArguments(error));
}
