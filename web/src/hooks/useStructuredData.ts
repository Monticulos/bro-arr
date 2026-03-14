import { useEffect } from "react";
import type { Event } from "../types/event";
import { buildEventsJsonLd } from "../utils/structuredData";

const SCRIPT_ID = "structured-data-json-ld";

export function useStructuredData(events: Event[]): void {
  useEffect(() => {
    if (events.length === 0) return;

    const scriptElement =
      (document.getElementById(SCRIPT_ID) as HTMLScriptElement | null) ??
      document.createElement("script");
    scriptElement.id = SCRIPT_ID;
    scriptElement.type = "application/ld+json";
    scriptElement.textContent = JSON.stringify(buildEventsJsonLd(events));

    if (!scriptElement.parentNode) {
      document.head.appendChild(scriptElement);
    }

    return () => {
      scriptElement.remove();
    };
  }, [events]);
}
