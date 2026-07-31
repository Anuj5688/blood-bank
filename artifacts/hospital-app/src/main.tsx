import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// When the API is deployed as a separate service (its own domain), point
// requests there. If unset, requests stay relative to this app's own
// origin (e.g. when a reverse proxy serves both under one domain).
const apiUrl = import.meta.env.VITE_API_URL;
if (apiUrl) {
  setBaseUrl(apiUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
