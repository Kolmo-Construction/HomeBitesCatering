import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { StrictMode } from "react";
import { initTheme } from "./lib/theme";

initTheme();

// Create a simplified setup
const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Root element not found");
} else {
  const root = createRoot(rootElement);
  
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
