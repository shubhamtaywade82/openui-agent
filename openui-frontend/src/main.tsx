import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import "@openuidev/react-ui/styles/index.css"
import "./index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
