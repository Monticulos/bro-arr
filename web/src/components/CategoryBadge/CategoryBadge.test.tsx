import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CategoryBadge from "./CategoryBadge";
import type { Event } from "../../types/event";

const CATEGORIES: { category: Event["category"]; label: string; color: string }[] = [
  { category: "musikk", label: "Musikk", color: "accent" },
  { category: "kino", label: "Kino", color: "brand2" },
  { category: "quiz", label: "Quiz", color: "brand1" },
  { category: "mat-og-drikke", label: "Mat og drikke", color: "accent" },
  { category: "barn-og-ungdom", label: "Barn og ungdom", color: "brand1" },
  { category: "næringsliv", label: "Næringsliv", color: "neutral" },
  { category: "kunst-og-kultur", label: "Kunst og kultur", color: "brand2" },
  { category: "kommunalt", label: "Kommunalt", color: "neutral" },
  { category: "tro-og-livssyn", label: "Tro og livssyn", color: "brand1" },
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
