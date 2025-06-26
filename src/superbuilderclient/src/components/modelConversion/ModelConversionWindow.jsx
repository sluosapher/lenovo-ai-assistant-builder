import React from "react";
import ReactDOM from "react-dom/client";
import ModelConversion from "./ModelConversion";
import { initializeI18n } from '../../i18n';

const startApp = async () => {
    await initializeI18n();
    ReactDOM.createRoot(document.getElementById("modelConversionWindow")).render(<ModelConversion />);
}

startApp();