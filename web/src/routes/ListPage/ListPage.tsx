import { useOutletContext } from "react-router-dom";
import type { ViewOutletContext } from "../../types/outletContext";
import EventList from "../../components/EventList/EventList";
import styles from "./ListPage.module.css";

export default function ListPage() {
  const { events } = useOutletContext<ViewOutletContext>();

  return (
    <div className={styles.container}>
      <EventList events={events} />
    </div>
  );
}
