import { describe, it, expect } from "vitest";
import { mapLocation, LOCATION_MAP } from "./mapLocation.js";

describe("mapLocation", () => {
  it.each(Object.entries(LOCATION_MAP))(
    "maps '%s' to venue '%s'",
    (written, expectedVenue) => {
      expect(mapLocation(written)).toBe(expectedVenue);
    },
  );

  it("maps an address embedded in a longer string", () => {
    expect(mapLocation("Storgata 70, 8900 Brønnøysund")).toBe(
      "Den andre puben",
    );
  });

  it("drops a town written after the venue name", () => {
    expect(mapLocation("Brønnøy bibliotek Brønnøysund")).toBe(
      "Brønnøy bibliotek",
    );
  });

  it("returns the location unchanged when nothing matches", () => {
    expect(mapLocation("Ukjent sted")).toBe("Ukjent sted");
  });

  it("returns an empty location unchanged", () => {
    expect(mapLocation("")).toBe("");
  });
});
