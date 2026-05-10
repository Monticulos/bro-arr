import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { routes } from "../../routes/routes";

function renderApp(initialRoute = "/") {
  const router = createMemoryRouter(routes, {
    initialEntries: [initialRoute],
  });
  return render(<RouterProvider router={router} />);
}

describe("App", () => {
  it("renders the navigation", () => {
    renderApp();

    expect(screen.getByRole("link", { name: /liste/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /kalender/i })).toBeInTheDocument();
  });

  it("renders the list page by default", () => {
    renderApp();

    expect(screen.getByRole("link", { name: /liste/i }).className).toMatch(
      /active/,
    );
  });

  it("renders the calendar page on /calendar", () => {
    renderApp("/calendar");

    expect(screen.getByRole("link", { name: /kalender/i }).className).toMatch(
      /active/,
    );
  });
});
