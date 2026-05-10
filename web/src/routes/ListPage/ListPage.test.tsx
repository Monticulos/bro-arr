import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import type { ViewOutletContext } from "../../types/outletContext";
import { createEvent } from "../../test/factories";
import ListPage from "./ListPage";

function renderListPage(context: ViewOutletContext) {
  function Wrapper() {
    return <Outlet context={context} />;
  }

  return render(
    <MemoryRouter>
      <Routes>
        <Route element={<Wrapper />}>
          <Route index element={<ListPage />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("ListPage", () => {
  it("renders events", () => {
    const futureEvent = createEvent({
      title: "Future Event",
      startDate: "2099-06-20T18:00:00Z",
    });

    renderListPage({ events: [futureEvent] });

    expect(screen.getByText("Future Event")).toBeInTheDocument();
  });
});
