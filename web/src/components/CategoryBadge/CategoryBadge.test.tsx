import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CategoryBadge from "./CategoryBadge";
import type { Event } from "../../types/event";

const CATEGORIES: { category: Event["category"]; label: string; color: string }[] = [
  { category: "musikk", label: "Musikk", color: "accent" },
  { category: "stand-up", label: "Stand-up", color: "brand1" },
  { category: "kino", label: "Kino", color: "brand2" },
  { category: "annet", label: "Annet", color: "neutral" },
];

describe("CategoryBadge", () => {
  it.each(CATEGORIES)(
    "renders label '$label' for category '$category'",
    ({ category, label }) => {
      render(<CategoryBadge category={category} />);
      expect(screen.getByText(label)).toBeInTheDocument();
    },
  );

  it.each(CATEGORIES)(
    "renders data-color '$color' for category '$category'",
    ({ category, color }) => {
      render(<CategoryBadge category={category} />);
      const element = screen.getByText(CATEGORIES.find((c) => c.category === category)!.label);
      expect(element.closest("[data-color]")).toHaveAttribute("data-color", color);
    },
  );
});
