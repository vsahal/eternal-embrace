import { Authenticator } from "@aws-amplify/ui-react";
import '@aws-amplify/ui-react/styles.css';
import { Amplify } from "aws-amplify";
import React from "react";
import ReactDOM from "react-dom/client";
import outputs from "../amplify_outputs.json";
import App from "./App.tsx";
import "./index.css";

Amplify.configure(outputs);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Centered Container */}
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", marginTop: "20px" }}>
      <h1 style={{ paddingTop: "100px" }}>
        Eternal Embrace
      </h1>
      <img src="/eternal_embrace_v1.png" alt="Eternam Embrace Logo" style={{ width: "100px", height: "100px", marginTop: "100px" }} />
    </div>
    <Authenticator>
      <App />
    </Authenticator>
  </React.StrictMode>
);
