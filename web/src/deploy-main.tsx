import "./globals.js";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DeployApp } from "./DeployApp.js";
import "./index.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

createRoot(container).render(
  <StrictMode>
    <DeployApp />
  </StrictMode>,
);
