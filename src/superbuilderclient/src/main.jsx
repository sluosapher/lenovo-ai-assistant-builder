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
import { WorkflowContextProvider } from "./components/context/WorkflowContext";

const startApp = async () => {
  await initializeI18n();
  // In development, load a simple test harness that exposes chat history utilities
  // on window.ChatHistoryTest for quick manual validation via DevTools.
  if (import.meta && import.meta.env && import.meta.env.DEV) {
    // Dynamic import to avoid affecting production bundles
    import("./dev/chatHistoryTestHarness").catch(() => {});
  }
  
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    // <React.StrictMode>
    <AppStatusProvider>
      <RagReadyProvider>
        <WorkflowContextProvider>
          <ChatProvider>
            <EmailWindowProvider>
              <ModelDownloaderProvider>
                <FileManagementProvider>
                  <App />
                </FileManagementProvider>
              </ModelDownloaderProvider>
            </EmailWindowProvider>
          </ChatProvider>
        </WorkflowContextProvider>
      </RagReadyProvider>
    </AppStatusProvider>
    // </React.StrictMode>
  );
};

startApp();
