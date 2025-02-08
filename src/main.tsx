import '@aws-amplify/ui-react/styles.css';
import React from "react";
import ReactDOM from "react-dom/client";
import { Authenticator } from "@aws-amplify/ui-react";
import App from "./App.tsx";
import "./index.css";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import '@aws-amplify/ui-react/styles.css';

Amplify.configure(outputs);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Centered Container */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", marginTop: "20px" }}>
      <h1>Dear Future</h1>
      <img src="/heart_clock.png" alt="Dear Future Logo" style={{ width: "100px", height: "100px" }} />
    </div>
    <Authenticator>
      <App />
    </Authenticator>
  </React.StrictMode>
);
