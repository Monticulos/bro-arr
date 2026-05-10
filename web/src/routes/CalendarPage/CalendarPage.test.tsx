import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import type { ViewOutletContext } from "../../types/outletContext";
import { createEvent } from "../../test/factories";
import CalendarPage from "./CalendarPage";

function renderCalendarPage(context: ViewOutletContext) {
  function Wrapper() {
    return <Outlet context={context} />;
  }

  return render(
    <MemoryRouter initialEntries={["/calendar"]}>
      <Routes>
        <Route element={<Wrapper />}>
          <Route path="calendar" element={<CalendarPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("CalendarPage", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders an event in the calendar", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00Z"));

    const event = createEvent({
      title: "Konsert på Kred",
      startDate: "2025-06-15T19:00:00Z",
    });

    renderCalendarPage({ events: [event] });

    expect(screen.getByText("Konsert på Kred")).toBeInTheDocument();
  });
});
