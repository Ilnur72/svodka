import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

/**
 * Optional `?theme=light|dark` override. Without it the palette follows the OS
 * colour scheme; the CSS covers all three states.
 */
const theme = new URLSearchParams(window.location.search).get("theme");
if (theme === "light" || theme === "dark") {
  document.documentElement.setAttribute("data-theme", theme);
}

const container = document.getElementById("root");
if (!container) throw new Error("#root topilmadi");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
