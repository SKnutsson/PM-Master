import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "@fontsource/bebas-neue/latin-400.css";
import "./index.css";

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
