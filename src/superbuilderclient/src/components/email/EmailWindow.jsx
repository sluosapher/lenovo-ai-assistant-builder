import React from "react";
import ReactDOM from "react-dom/client";
import EmailForm from "./Email";
import App from "../App"; // DO NOT REMOVE (not an unused import)

import { initializeI18n } from '../../i18n';

const startApp = async () => {
  await initializeI18n();

  ReactDOM.createRoot(document.getElementById("EmailWindow")).render(
    <React.StrictMode>
    <EmailForm></EmailForm>
    </React.StrictMode>,
  );
}

startApp();