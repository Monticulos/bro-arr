import type { RouteObject } from "react-router-dom";
import App from "../components/App/App";
import ListPage from "./ListPage/ListPage";
import CalendarPage from "./CalendarPage/CalendarPage";

export const routes: RouteObject[] = [
  {
    element: <App />,
    children: [
      { index: true, element: <ListPage /> },
      { path: "calendar", element: <CalendarPage /> },
    ],
  },
];
