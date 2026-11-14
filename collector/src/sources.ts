export interface Source {
  url: string;
  name: string;
  selector?: string;
}

export const TARGET_SOURCES: Source[] = [
  {
    url: "https://www.bronnoy.kommune.no/",
    name: "Brønnøy kommune",
    selector: "#bottom-boxes",
  },
  {
    url: "https://www.bronnoy.kommune.no/kino/",
    name: "Brønnøy kino",
    selector: ".InnholdTabell",
  },
  {
    url: "https://bronnoybibliotek.no/arrangementer#/",
    name: "Brønnøy bibliotek",
    selector: ".arena-events-container",
  },
  {
    url: "https://www.bronnoy.kirken.no/Kalender",
    name: "Brønnøy kirke",
    selector: ".calendar",
  },
];
