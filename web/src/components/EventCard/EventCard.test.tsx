import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EventCard from "./EventCard";
import type { Event } from "../../types/event";

function createEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "1",
    title: "Test Event",
    description: "A test event description",
    category: "annet",
    startDate: "2025-06-15T18:00:00Z",
    collectedAt: "2025-06-01T00:00:00Z",
    ...overrides,
  };
}

function renderCard(overrides: Partial<Event> = {}, isFavorited = false) {
  const onToggleFavorite = vi.fn();
  render(
    <EventCard
      event={createEvent(overrides)}
      isFavorited={isFavorited}
      onToggleFavorite={onToggleFavorite}
    />
  );
  return { onToggleFavorite };
}

describe("EventCard", () => {
  it("renders title and description", () => {
    renderCard();

    expect(screen.getByText("Test Event")).toBeInTheDocument();
    expect(screen.getByText("A test event description")).toBeInTheDocument();
  });

  it("renders location when provided", () => {
    renderCard({ location: "Brønnøysund" });
    expect(screen.getByText(/Brønnøysund/)).toBeInTheDocument();
  });

  it("does not render location when missing", () => {
    renderCard({ location: undefined });
    expect(screen.queryByText("📍")).not.toBeInTheDocument();
  });

  it("renders link when url is provided", () => {
    renderCard({ url: "https://example.com" });
    const link = screen.getByText("Les mer →");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute("href", "https://example.com");
  });

  it("does not render link when url is missing", () => {
    renderCard({ url: undefined });
    expect(screen.queryByText("Les mer →")).not.toBeInTheDocument();
  });

  it("renders unfavorited star button", () => {
    renderCard({}, false);
    expect(screen.getByRole("button", { name: "Legg til i favoritter" })).toBeInTheDocument();
  });

  it("renders favorited star button", () => {
    renderCard({}, true);
    expect(screen.getByRole("button", { name: "Fjern fra favoritter" })).toBeInTheDocument();
  });

  it("calls onToggleFavorite with event id on click", async () => {
    const user = userEvent.setup();
    const { onToggleFavorite } = renderCard({ id: "event-99" }, false);

    await user.click(screen.getByRole("button", { name: "Legg til i favoritter" }));

    expect(onToggleFavorite).toHaveBeenCalledWith("event-99");
  });
});
