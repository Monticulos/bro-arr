import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventSection from "./EventSection";
import type { Event } from "../../types/event";

function createEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "1",
    title: "Test Event",
    description: "Description",
    category: "annet",
    startDate: "2099-06-20T10:00:00Z",
    collectedAt: "2025-06-01T00:00:00Z",
    ...overrides,
  };
}

const noop = () => {};
const alwaysFavorited = () => true;

describe("EventSection", () => {
  it("renders heading and events", () => {
    const event = createEvent({ title: "My Event" });

    render(
      <EventSection
        heading="Test Heading"
        events={[event]}
        isFavorited={alwaysFavorited}
        onToggleFavorite={noop}
      />
    );

    expect(screen.getByRole("heading", { name: "Test Heading" })).toBeInTheDocument();
    expect(screen.getByText("My Event")).toBeInTheDocument();
  });

  it("starts open by default", () => {
    render(
      <EventSection
        heading="Section"
        events={[createEvent()]}
        isFavorited={alwaysFavorited}
        onToggleFavorite={noop}
      />
    );

    expect(document.querySelector("details")).toHaveAttribute("open");
  });

  it("clicking the heading collapses the section", async () => {
    const user = userEvent.setup();

    render(
      <EventSection
        heading="Section"
        events={[createEvent()]}
        isFavorited={alwaysFavorited}
        onToggleFavorite={noop}
      />
    );

    const heading = screen.getByRole("heading", { name: "Section" });
    await user.click(heading);

    expect(heading.closest("details")).not.toHaveAttribute("open");
  });

  it("clicking a collapsed heading re-expands the section", async () => {
    const user = userEvent.setup();

    render(
      <EventSection
        heading="Section"
        events={[createEvent()]}
        isFavorited={alwaysFavorited}
        onToggleFavorite={noop}
      />
    );

    const heading = screen.getByRole("heading", { name: "Section" });
    await user.click(heading);
    await user.click(heading);

    expect(heading.closest("details")).toHaveAttribute("open");
  });

  it("collapsing one section does not affect another", async () => {
    const user = userEvent.setup();

    render(
      <>
        <EventSection
          heading="Section A"
          events={[createEvent({ id: "1" })]}
          isFavorited={alwaysFavorited}
          onToggleFavorite={noop}
        />
        <EventSection
          heading="Section B"
          events={[createEvent({ id: "2" })]}
          isFavorited={alwaysFavorited}
          onToggleFavorite={noop}
        />
      </>
    );

    const headingA = screen.getByRole("heading", { name: "Section A" });
    const headingB = screen.getByRole("heading", { name: "Section B" });

    await user.click(headingA);

    expect(headingA.closest("details")).not.toHaveAttribute("open");
    expect(headingB.closest("details")).toHaveAttribute("open");
  });
});
