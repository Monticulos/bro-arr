import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import nbLocale from "@fullcalendar/core/locales/nb";
import type { ViewOutletContext } from "../../types/outletContext";
import { mapEventsToCalendar } from "../../utils/mapEventsToCalendar";
import styles from "./CalendarPage.module.css";

const CALENDAR_PLUGINS = [timeGridPlugin];
const SLOT_MIN_TIME = "06:00:00";
const SLOT_DURATION = "01:00:00";
const DAY_HEADER_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "numeric",
};

function formatDayHeader(arg: { date: Date }) {
  return arg.date.toLocaleDateString("nb-NO", DAY_HEADER_FORMAT);
}

export default function CalendarPage() {
  const { events } = useOutletContext<ViewOutletContext>();
  const calendarEvents = useMemo(() => mapEventsToCalendar(events), [events]);

  return (
    <div className={styles.container}>
      <FullCalendar
        plugins={CALENDAR_PLUGINS}
        initialView="timeGridWeek"
        locale={nbLocale}
        height="auto"
        allDaySlot={false}
        headerToolbar={{
          left: "prev,next",
          center: "title",
          right: "timeGridWeek,timeGridDay",
        }}
        dayHeaderContent={formatDayHeader}
        slotMinTime={SLOT_MIN_TIME}
        slotDuration={SLOT_DURATION}
        events={calendarEvents}
      />
    </div>
  );
}
