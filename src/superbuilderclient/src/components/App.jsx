import React, { useState, useEffect, useContext } from "react";
import SideBar from "./sidebar/Sidebar";
import Chat from "./chat/Chat";
import Status from "./status/Status";
import ModelDownloader from "./modelDownloader/modelDownloader";
import Topbar from "./topbar/Topbar";
import "./App.css";
import { listen } from "@tauri-apps/api/event";
import { ModelDownloaderContext } from "./context/ModelDownloaderContext";
import ModalWrapper from "./generalUseModal/generalUseModal";
import useDataStore from "../stores/DataStore";
import { useTranslation } from "react-i18next";
import { IconButton } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";

function App() {
  const { t } = useTranslation();
  const { config, assistant } = useDataStore();
  const [isMinHWModalOpen, setIsMinHWModalOpen] = useState(false);
  const [isNonValidHWModalOpen, setIsNonValidHWModalOpen] = useState(false);
  const { downloadWindowsOpen, setDownloadWindowsOpen, setModelCards } =
    useContext(ModelDownloaderContext);

  useEffect(() => {
    if (assistant.all_models) {
      setModelCards(assistant.all_models);
    }
  }, [assistant]);

  useEffect(() => {
    const unlistenModelAdded = listen("new-model-added", (event) => {
      if (event.payload) {
        useDataStore.getState().getDBConfig();
      }
    });

    return () => {
      unlistenModelAdded.then((fn) => fn());
    };
  }, []);

  return (
    <div className="mainwindow">
      <Topbar>
        <div
          className="dl-button-container"
          title={t("minimum_hardware.model_download_status")}
        >
          <IconButton
            onClick={() => setDownloadWindowsOpen(!downloadWindowsOpen)}
            size="small"
            className="window-control"
            sx={{
              color: assistant?.header_text_bg_color,
              padding: "8px",
              borderRadius: 0,
              '& .MuiSvgIcon-root': {
                color: assistant?.header_text_bg_color,
              }
            }}
          >
            <DownloadIcon fontSize="small" />
          </IconButton>
        </div>
        <ModalWrapper
          isOpen={isMinHWModalOpen || isNonValidHWModalOpen}
          toggleOpen={() => {
            setIsMinHWModalOpen(false);
            setIsNonValidHWModalOpen(false);
          }}
          header={
            isNonValidHWModalOpen
              ? t("non_validate_hardware.title")
              : t("minimum_hardware.title")
          }
          hideFooter={isNonValidHWModalOpen ? false : true}
          buttonName={"OK"}
        >
          {isNonValidHWModalOpen ? (
            <div>
              <p>{t("non_validate_hardware.part_1")}</p>
              <p>{t("non_validate_hardware.part_2")}</p>
            </div>
          ) : (
            <div>
              <p>{t("minimum_hardware.part_1")}</p>
              <p>{t("minimum_hardware.part_2")}</p>
              <ul>
                <li>{t("minimum_hardware.part_3")}</li>
                <li>{t("minimum_hardware.part_4")}</li>
                <li>{t("minimum_hardware.part_5")}</li>
                <li>{t("minimum_hardware.part_6")}</li>
                <li>{t("minimum_hardware.part_7")}</li>
              </ul>
            </div>
          )}
        </ModalWrapper>
        {assistant.models["chat_model"] !== "chat_model" && <ModelDownloader />}
      </Topbar>
      <div className="appbody">
        <div className="sidebar">
          <SideBar />
        </div>
        <div className="chatbox">
          <Chat />
        </div>
      </div>
      <div>
        <Status
          setIsMinHWModalOpen={setIsMinHWModalOpen}
          setIsNonValidHWModalOpen={setIsNonValidHWModalOpen}
        />
      </div>
    </div>
  );
}

export default App;
