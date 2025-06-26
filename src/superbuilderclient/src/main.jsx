import React from "react";
import ReactDOM from "react-dom/client";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import App from "./components/App";
import {initializeI18n} from './i18n';
import { RagReadyProvider } from './components/context/RagReadyContext';
import { ChatProvider } from "./components/context/ChatContext";
import { AppStatusProvider } from './components/context/AppStatusContext';
import { EmailWindowProvider } from './components/context/EmailWindowContext';
import { ModelDownloaderProvider } from './components/context/ModelDownloaderContext';
import { FileManagementProvider } from "./components/context/FileManagementContext";

const startApp = async () => {
  await initializeI18n();
  
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    // <React.StrictMode>
    <AppStatusProvider>
      <RagReadyProvider>
        <ChatProvider>
          <EmailWindowProvider>
            <ModelDownloaderProvider>
              <FileManagementProvider>
                <App />
              </FileManagementProvider>
            </ModelDownloaderProvider>
          </EmailWindowProvider>
        </ChatProvider>
      </RagReadyProvider>
    </AppStatusProvider>
    // </React.StrictMode>
  );
};

startApp();