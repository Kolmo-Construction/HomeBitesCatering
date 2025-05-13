import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext";
import { StrictMode } from "react";

// Get the root element
const rootElement = document.getElementById("root");

// Ensure we have a root element to render into
if (!rootElement) {
  console.error("No root element found in the document");
} else {
  // Create a root
  const root = createRoot(rootElement);
  
  // Render the app
  root.render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>
  );
}
