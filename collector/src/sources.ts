export interface Source {
  url: string;
  name: string;
}

export const TARGET_SOURCES: Source[] = [
  {
    url: "https://www.bronnoy.kommune.no/",
    name: "Brønnøy kommune",
  },
  {
    url: "https://www.bronnoy.kommune.no/kino/",
    name: "Brønnøy kino",
  },
  {
    url: "https://bronnoybibliotek.no/arrangementer#/",
    name: "Brønnøy bibliotek",
  },
  {
    url: "https://www.bronnoy.kirken.no/Kalender",
    name: "Brønnøy kirke",
  },
];
