export const LOCATION_MAP: Record<string, string> = {
  "Storgata 70": "Den andre puben",
  "Storgata 61": "Kred",
  "Cafe Kred": "Kred",
  "Storgata 68": "Svang",
  "Skolegata 7": "Brønnøy bibliotek",
  "Brønnøy bibliotek": "Brønnøy bibliotek",
  "Skolegata 10": "Brønnøysund videregående skole",
  "Ytre Høgåsvei 37": "Forsamlingslokalet",
  "Gårdsøyveien 5": "Felleskjøpet",
  "Havnegata 16": "Cash bar",
  "Storgata 58": "Havnesenteret",
};

export function mapLocation(location: string): string {
  for (const [written, venueName] of Object.entries(LOCATION_MAP)) {
    if (location.includes(written)) return venueName;
  }
  return location;
}
