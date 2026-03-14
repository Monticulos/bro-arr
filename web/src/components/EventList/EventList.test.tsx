import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventList from "./EventList";
import type { Event } from "../../types/event";

function createEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "1",
    title: "Test Event",
    description: "Description",
    category: "annet",
    startDate: "2025-06-15T18:00:00Z",
    collectedAt: "2025-06-01T00:00:00Z",
    ...overrides,
  };
}

describe("EventList", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-10T12:00:00Z"));
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows spinner when loading", () => {
    render(<EventList events={[]} loading={true} error={null} />);
    expect(screen.getByLabelText("Laster arrangementer")).toBeInTheDocument();
  });

  it("shows error alert when error is set", () => {
    render(<EventList events={[]} loading={false} error="Network error" />);
    expect(screen.getByText(/Kunne ikke laste data/)).toBeInTheDocument();
    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });

  it("shows upcoming events", () => {
    const upcomingEvent = createEvent({
      id: "1",
      title: "Future Event",
      startDate: "2025-06-20T10:00:00Z",
    });

    render(<EventList events={[upcomingEvent]} loading={false} error={null} />);
    expect(screen.getByText("Future Event")).toBeInTheDocument();
  });

  it("shows 'Ingen kommende arrangementer' when no upcoming events", () => {
    const pastEvent = createEvent({
      id: "1",
      title: "Past Event",
      startDate: "2025-05-01T10:00:00Z",
    });

    render(<EventList events={[pastEvent]} loading={false} error={null} />);
    expect(screen.getByText(/Ingen kommende arrangementer/)).toBeInTheDocument();
  });

  it("does not show past events", () => {
    const events = [
      createEvent({ id: "1", title: "Past Event", startDate: "2025-05-01T10:00:00Z" }),
      createEvent({ id: "2", title: "Future Event", startDate: "2025-07-01T10:00:00Z" }),
    ];

    render(<EventList events={events} loading={false} error={null} />);
    expect(screen.getByText("Future Event")).toBeInTheDocument();
    expect(screen.queryByText("Past Event")).not.toBeInTheDocument();
  });

  it("shows all events when no category filter is selected", () => {
    const events = [
      createEvent({ id: "1", title: "Concert", category: "musikk", startDate: "2025-06-20T10:00:00Z" }),
      createEvent({ id: "2", title: "Football", category: "kino", startDate: "2025-06-21T10:00:00Z" }),
    ];

    render(<EventList events={events} loading={false} error={null} />);
    expect(screen.getByText("Concert")).toBeInTheDocument();
    expect(screen.getByText("Football")).toBeInTheDocument();
  });

  it("does not show filter chips in loading state", () => {
    render(<EventList events={[]} loading={true} error={null} />);
    expect(screen.queryByRole("group", { name: "Filter" })).not.toBeInTheDocument();
  });

  it("does not show filter chips when no upcoming events", () => {
    const pastEvent = createEvent({
      id: "1",
      title: "Past Event",
      startDate: "2025-05-01T10:00:00Z",
    });

    render(<EventList events={[pastEvent]} loading={false} error={null} />);
    expect(screen.queryByRole("group", { name: "Filter" })).not.toBeInTheDocument();
  });

  it("does not show Favoritter section by default", () => {
    const event = createEvent({ id: "1", title: "Future Event", startDate: "2025-06-20T10:00:00Z" });

    render(<EventList events={[event]} loading={false} error={null} />);
    expect(screen.queryByRole("heading", { name: "Favoritter" })).not.toBeInTheDocument();
  });

  it("does not show past events in Favoritter section", () => {
    localStorage.setItem("broarr-favorites", JSON.stringify(["past-1"]));

    const events = [
      createEvent({ id: "past-1", title: "Past Event", startDate: "2025-05-01T10:00:00Z" }),
      createEvent({ id: "future-1", title: "Future Event", startDate: "2025-06-20T10:00:00Z" }),
    ];

    render(<EventList events={events} loading={false} error={null} />);

    expect(screen.queryByRole("heading", { name: "Favoritter" })).not.toBeInTheDocument();
  });
});

function createFutureEvent(overrides: Partial<Event> = {}): Event {
  return createEvent({ startDate: "2099-06-20T10:00:00Z", ...overrides });
}

describe("EventList favorites", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows Favoritter section after starring an event", async () => {
    const user = userEvent.setup();
    const event = createFutureEvent({ id: "1", title: "Future Event" });

    render(<EventList events={[event]} loading={false} error={null} />);

    await user.click(screen.getByRole("button", { name: "Legg til i favoritter" }));

    expect(screen.getByRole("heading", { name: "Favoritter" })).toBeInTheDocument();
  });

  it("shows event in both Favoritter section and month group when starred", async () => {
    const user = userEvent.setup();
    const event = createFutureEvent({ id: "1", title: "Future Event" });

    render(<EventList events={[event]} loading={false} error={null} />);

    await user.click(screen.getByRole("button", { name: "Legg til i favoritter" }));

    expect(screen.getAllByText("Future Event")).toHaveLength(2);
  });

  it("hides Favoritter section when category filter excludes favorited event", async () => {
    const user = userEvent.setup();
    localStorage.setItem("broarr-favorites", JSON.stringify(["future-1"]));

    const events = [
      createFutureEvent({ id: "future-1", title: "Konsert", category: "musikk" }),
      createFutureEvent({ id: "future-2", title: "Fotball", category: "kino", startDate: "2099-06-21T10:00:00Z" }),
    ];

    render(<EventList events={events} loading={false} error={null} />);
    expect(screen.getByRole("heading", { name: "Favoritter" })).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Kino" }));

    expect(screen.queryByRole("heading", { name: "Favoritter" })).not.toBeInTheDocument();
  });

  it("hides Favoritter section when search excludes favorited event", async () => {
    const user = userEvent.setup();
    localStorage.setItem("broarr-favorites", JSON.stringify(["future-1"]));

    const events = [
      createFutureEvent({ id: "future-1", title: "Konsert" }),
    ];

    render(<EventList events={events} loading={false} error={null} />);
    expect(screen.getByRole("heading", { name: "Favoritter" })).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), "fotball");

    expect(screen.queryByRole("heading", { name: "Favoritter" })).not.toBeInTheDocument();
  });

  it("hides Favoritter section after unstarring all events", async () => {
    const user = userEvent.setup();
    const event = createFutureEvent({ id: "1", title: "Future Event" });

    render(<EventList events={[event]} loading={false} error={null} />);

    await user.click(screen.getByRole("button", { name: "Legg til i favoritter" }));
    expect(screen.getByRole("heading", { name: "Favoritter" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Fjern fra favoritter" })[0]);

    expect(screen.queryByRole("heading", { name: "Favoritter" })).not.toBeInTheDocument();
  });
});

describe("EventList category filtering", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("filters events when a category chip is clicked", async () => {
    const user = userEvent.setup();
    const events = [
      createFutureEvent({ id: "1", title: "Concert", category: "musikk" }),
      createFutureEvent({ id: "2", title: "Football", category: "kino", startDate: "2099-06-21T10:00:00Z" }),
    ];

    render(<EventList events={events} loading={false} error={null} />);

    await user.click(screen.getByRole("checkbox", { name: "Musikk" }));

    expect(screen.getByText("Concert")).toBeInTheDocument();
    expect(screen.queryByText("Football")).not.toBeInTheDocument();
  });

  it("shows only matching events when a different chip is clicked", async () => {
    const user = userEvent.setup();
    const events = [
      createFutureEvent({ id: "1", title: "Concert", category: "musikk" }),
      createFutureEvent({ id: "2", title: "Football", category: "kino", startDate: "2099-06-21T10:00:00Z" }),
    ];

    render(<EventList events={events} loading={false} error={null} />);

    await user.click(screen.getByRole("checkbox", { name: "Kino" }));

    expect(screen.getByText("Football")).toBeInTheDocument();
    expect(screen.queryByText("Concert")).not.toBeInTheDocument();
  });

  it("deselecting all chips shows all events again", async () => {
    const user = userEvent.setup();
    const events = [
      createFutureEvent({ id: "1", title: "Concert", category: "musikk" }),
      createFutureEvent({ id: "2", title: "Football", category: "kino", startDate: "2099-06-21T10:00:00Z" }),
    ];

    render(<EventList events={events} loading={false} error={null} />);

    await user.click(screen.getByRole("checkbox", { name: "Musikk" }));
    expect(screen.queryByText("Football")).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Musikk" }));
    expect(screen.getByText("Concert")).toBeInTheDocument();
    expect(screen.getByText("Football")).toBeInTheDocument();
  });
});

describe("EventList search filtering", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("filters events by title", async () => {
    const user = userEvent.setup();
    const events = [
      createFutureEvent({ id: "1", title: "Konsert i kulturhuset" }),
      createFutureEvent({ id: "2", title: "Fotballkamp", startDate: "2099-06-21T10:00:00Z" }),
    ];

    render(<EventList events={events} loading={false} error={null} />);

    await user.type(screen.getByRole("searchbox"), "konsert");

    expect(screen.getByText("Konsert i kulturhuset")).toBeInTheDocument();
    expect(screen.queryByText("Fotballkamp")).not.toBeInTheDocument();
  });

  it("filters events by description", async () => {
    const user = userEvent.setup();
    const events = [
      createFutureEvent({ id: "1", title: "Event A", description: "Jazz i parken" }),
      createFutureEvent({ id: "2", title: "Event B", description: "Håndball", startDate: "2099-06-21T10:00:00Z" }),
    ];

    render(<EventList events={events} loading={false} error={null} />);

    await user.type(screen.getByRole("searchbox"), "jazz");

    expect(screen.getByText("Event A")).toBeInTheDocument();
    expect(screen.queryByText("Event B")).not.toBeInTheDocument();
  });

  it("filters events by location", async () => {
    const user = userEvent.setup();
    const events = [
      createFutureEvent({ id: "1", title: "Event A", location: "Brønnøy kulturhus" }),
      createFutureEvent({ id: "2", title: "Event B", location: "Salhus arena", startDate: "2099-06-21T10:00:00Z" }),
    ];

    render(<EventList events={events} loading={false} error={null} />);

    await user.type(screen.getByRole("searchbox"), "salhus");

    expect(screen.getByText("Event B")).toBeInTheDocument();
    expect(screen.queryByText("Event A")).not.toBeInTheDocument();
  });

  it("shows no-results message when search matches nothing", async () => {
    const user = userEvent.setup();
    const events = [
      createFutureEvent({ id: "1", title: "Konsert" }),
    ];

    render(<EventList events={events} loading={false} error={null} />);

    await user.type(screen.getByRole("searchbox"), "finnes ikke");

    expect(screen.getByText(/Ingen arrangementer funnet/)).toBeInTheDocument();
  });

  it("shows all events when search is cleared", async () => {
    const user = userEvent.setup();
    const events = [
      createFutureEvent({ id: "1", title: "Konsert" }),
      createFutureEvent({ id: "2", title: "Fotballkamp", startDate: "2099-06-21T10:00:00Z" }),
    ];

    render(<EventList events={events} loading={false} error={null} />);

    await user.type(screen.getByRole("searchbox"), "konsert");
    expect(screen.queryByText("Fotballkamp")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox"));
    expect(screen.getByText("Konsert")).toBeInTheDocument();
    expect(screen.getByText("Fotballkamp")).toBeInTheDocument();
  });

  it("combines search with category filter", async () => {
    const user = userEvent.setup();
    const events = [
      createFutureEvent({ id: "1", title: "Jazzkonsert", category: "musikk" }),
      createFutureEvent({ id: "2", title: "Jazzfestival", category: "annet", startDate: "2099-06-21T10:00:00Z" }),
      createFutureEvent({ id: "3", title: "Fotballkamp", category: "kino", startDate: "2099-06-22T10:00:00Z" }),
    ];

    render(<EventList events={events} loading={false} error={null} />);

    await user.click(screen.getByRole("checkbox", { name: "Musikk" }));
    await user.type(screen.getByRole("searchbox"), "jazz");

    expect(screen.getByText("Jazzkonsert")).toBeInTheDocument();
    expect(screen.queryByText("Jazzfestival")).not.toBeInTheDocument();
    expect(screen.queryByText("Fotballkamp")).not.toBeInTheDocument();
  });
});
