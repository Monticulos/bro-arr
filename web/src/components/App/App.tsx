import { Outlet } from "react-router-dom";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import ViewNavigation from "../ViewNavigation/ViewNavigation";
import eventsData from "../../../../shared/data/events.json";
import type { EventsData } from "../../types/event";
import type { ViewOutletContext } from "../../types/outletContext";
import { withFallbackCategory } from "../../utils/withFallbackCategory";
import styles from "./App.module.css";

export default function App() {
  const { events, updatedAt } = eventsData as EventsData;
  const outletContext: ViewOutletContext = {
    events: events.map(withFallbackCategory),
  };

  return (
    <>
      <Header />
      <ViewNavigation />
      <main className={styles.main}>
        <Outlet context={outletContext} />
      </main>
      <Footer updatedAt={updatedAt} />
    </>
  );
}
