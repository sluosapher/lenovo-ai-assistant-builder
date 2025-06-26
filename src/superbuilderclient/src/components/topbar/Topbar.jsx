import "./Topbar.css";
import React, { useEffect, useState, useContext } from "react";
import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { exists } from "@tauri-apps/plugin-fs";
import AssistantLogo from "../assistantLogo/assistantLogo";
import ModalWrapper from "../generalUseModal/generalUseModal";
import { AppStatusContext } from "../context/AppStatusContext";

import { useTranslation } from 'react-i18next';

import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Link
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CloseIcon from '@mui/icons-material/Close';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';

import ModelLink from "../modelLink/ModelLink";
import useDataStore from "../../stores/DataStore";
const appWindow = getCurrentWindow();

const Topbar = ({ children }) => {
  const { t } = useTranslation();
  const { system_info, config, assistant, assistantName } = useDataStore();
  const [isMaximized, setMaximized] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const { setClosing } = useContext(AppStatusContext);
  const toggleInfo = () => {
    setIsInfoOpen(!isInfoOpen);
  };

  const openOSSFolder = async () => {
    try {
      let folderPath =
        "C:\\Program Files\\Intel Corporation\\Intel(R) AI Assistant Builder\\oss_info";
      const pathExists = await exists(folderPath);
      if (!pathExists) {
        console.error("Path does not exist:", folderPath);
        return;
      }
      await invoke("open_in_explorer", { path: folderPath });
    } catch (error) {
      console.error("Error opening folder:", error);
    }
  };

  useEffect(() => {
    const minimizeButton = document.getElementById("minimize");
    const restoreMaximizeButton = document.getElementById("restoreMaximize");
    const closeButton = document.getElementById("close");

    const handleResize = async () => {
      const maximized = await appWindow.isMaximized();
      setMaximized(maximized);
    };
    handleResize();

    window.addEventListener("resize", handleResize);

    const closeEmailWindow = async () => {
      setClosing(true);
    };

    const minimizeAction = () => {
      appWindow.minimize();
    };
    const restoreMaximizeAction = () => {
      appWindow.toggleMaximize();
    };
    const closeAction = async () => {
      await closeEmailWindow();
      const allWindows = await getAllWindows();
      allWindows.forEach((window) => {
        window.close();
      });
    };
    if (minimizeButton) {
      minimizeButton.addEventListener("click", minimizeAction);
    }
    if (restoreMaximizeButton) {
      restoreMaximizeButton.addEventListener("click", restoreMaximizeAction);
    }
    if (closeButton) {
      closeButton.addEventListener("click", closeAction);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (minimizeButton) {
        minimizeButton.removeEventListener("click", minimizeAction);
      }
      if (restoreMaximizeButton) {
        restoreMaximizeButton.removeEventListener(
          "click",
          restoreMaximizeAction
        );
      }
      if (closeButton) {
        closeButton.removeEventListener("click", closeAction);
      }
    };
  }, [setMaximized]);

  return (
    <div
      id="app-topbar"
      data-tauri-drag-region
      className="top-bar-container"
      style={{
        "--topbar-container-background-color": assistant.header_bg_color,
      }}
    >
      <div
        className="logo-container"
        style={{
          "--logo-container-background-color": assistant.header_text_bg_color,
        }}
      >
        <div className="logo">
          <AssistantLogo />
        </div>
      </div>
      <div className="title-container" data-tauri-drag-region>
        <div className="aia-title" data-tauri-drag-region style={{ color: assistant.header_text_bg_color }}>
          {assistantName}
          <IconButton
            size="small"
            onClick={toggleInfo}
            sx={{ color: assistant.header_text_bg_color }}
          >
            <InfoIcon />
          </IconButton>

          <ModalWrapper
            isOpen={isInfoOpen}
            toggleOpen={toggleInfo}
            header={`${t('topbar.title')} - ${assistantName}`}
            hideFooter={false}
            buttonName={t('topbar.content_part_10')}
          >
            <div>
              <div>
                <div>
                  <Typography variant="body1">
                    {t('topbar.content_part_1')}{" "}
                    <Link
                      href="https://www.intel.com/aipc"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('topbar.content_part_2')}
                    </Link>{" "}
                    {t('topbar.content_part_3')}
                  </Typography>
                  <br />
                  <Typography variant="body1">
                    {t('topbar.content_part_4')}{" "}
                    <b>
                      v{system_info?.CurrentVersion} | {t('topbar.content_part_4_1')}{" "}
                      <Link
                        href="https://aibuilder.intel.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t('topbar.content_part_5')}
                      </Link>
                    </b>
                  </Typography>
                  <Typography variant="body1">
                    {t('topbar.content_part_6')}{" "}
                    <b className="space-between">
                      {assistant["models"]["chat_model"]}
                    </b>
                    <b>
                      <ModelLink
                        modelName={assistant["models"]["chat_model"]}
                      />
                    </b>
                  </Typography>
                  <Typography variant="body1">
                    {t('topbar.content_part_7')}{" "}
                    <b className="space-between">
                      {assistant["models"]["embedding_model"]}
                    </b>
                    <b>
                      <ModelLink
                        modelName={assistant["models"]["embedding_model"]}
                      />
                    </b>
                  </Typography>
                  <Typography variant="body1">
                    {t('topbar.content_part_8')}{" "}
                    <b className="space-between">
                      {assistant["models"]["ranker_model"]}
                    </b>
                    <b>
                      <ModelLink
                        modelName={assistant["models"]["ranker_model"]}
                      />
                    </b>
                  </Typography>
                </div>
                <br />
                <div className="oss-info">
                  <Link
                    component="button"
                    variant="body1"
                    onClick={openOSSFolder}
                  >
                    {t('topbar.content_part_9')}
                  </Link>
                </div>
              </div>
            </div>
          </ModalWrapper>


        </div>
      </div>
      <div>{children}</div>

      <div
        className="window-controls"
        style={{
          "--top_bar_container_bg_color": assistant.top_bar_container_bg_color,
        }}
      >
        <IconButton
          className="window-control"
          id="minimize"
          size="small"
          sx={{ color: assistant.header_text_bg_color,
             '& .MuiSvgIcon-root': {
              color: assistant.header_text_bg_color,
             }
           }}
        >
          <MinimizeIcon fontSize="small" />
        </IconButton>

        <IconButton
          className="window-control"
          id="restoreMaximize"
          size="small"
          sx={{ color: assistant.header_text_bg_color,
             '& .MuiSvgIcon-root': {
              color: assistant.header_text_bg_color,
             }
           }}
        >
          {isMaximized ?
            <CloseFullscreenIcon fontSize="small" /> :
            <OpenInFullIcon fontSize="small" />
          }
        </IconButton>

        <IconButton
          className="window-control"
          id="close"
          size="small"
          sx={{ color: assistant.header_text_bg_color,
             '& .MuiSvgIcon-root': {
              color: assistant.header_text_bg_color,
             }
           }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>
    </div>
  );
};

export default Topbar;
