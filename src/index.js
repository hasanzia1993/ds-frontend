import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// Firebase doesn't require MSAL-style initialization before render
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
