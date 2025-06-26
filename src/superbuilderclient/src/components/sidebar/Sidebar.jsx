import "./Sidebar.css";
import React, { useState, useEffect, useContext, useRef } from "react";
import Setting from "../setting/Setting";
import { ChatHistory } from "./ChatHistory";
import { ChatContext } from "../context/ChatContext";
import { invoke } from "@tauri-apps/api/core";
import { EmailWindowContext } from "../context/EmailWindowContext";
import { open } from '@tauri-apps/plugin-shell';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import useDataStore from "../../stores/DataStore";
import { Button as MuiButton } from "@mui/material";
import {grey } from '@mui/material/colors';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import HelpIcon from '@mui/icons-material/Help';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTranslation } from 'react-i18next';

const Sidebar = ({ }) => {
  const { t } = useTranslation();
  const { config, assistant,getDBConfig } = useDataStore();
  const { newSession, isChatReady } = useContext(ChatContext);
  const [isSettingOpen, setIsSettingOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const sidebarRef = useRef(null);
  const { openBugReport } = useContext(EmailWindowContext);
  const [settingVisibility, setSettingVisibility] = useState(false);
  const handleSetting = () => {
    setIsSettingOpen(!isSettingOpen);
    setIsHistoryOpen(false);
  };
  const handleSetAdmin = async() => {
    const shallowNewData = Object.keys(config).reduce((acc, key) => {
      if (typeof config[key] !== "object" || config[key] === null) {
        acc[key] = config[key];
      }
      return acc;
    }, {});
    shallowNewData.is_admin = !config.is_admin;
    const viewModel = JSON.stringify(shallowNewData);
    await invoke("set_user_config_view_model", { vm: viewModel });
    getDBConfig();
  }

  const handleHistory = () => {
    setIsSettingOpen(false);
    setIsHistoryOpen(!isHistoryOpen);
  };

  const closePanels = () => {
    setIsSettingOpen(false);
    setIsHistoryOpen(false);
  };

  const adminIcon = () => {
    return (
      <button
        className={`admin-icon ${config.is_admin ? "admin-enabled" : "admin-disabled"}`}
        title={t('sidebar.admin_mode') + ' - '  + (config.is_admin ? t('sidebar.mode_enable') : t('sidebar.mode_disable'))}
        onClick={handleSetAdmin}
      />
    );
  };

  useEffect(() => {

    document.documentElement.style.setProperty(
      "--sidebar-refresh-bg-color",
      assistant.sidebar_box_refresh_bg_color
    );
    document.documentElement.style.setProperty(
      "--sidebar-refresh-hover-bg-color",
      assistant.sidebar_box_refresh_hover_bg_color
    );
    document.documentElement.style.setProperty(
      "--sidebarbox-bg-color",
      assistant.sidebar_box_bg_color
    );
    setSettingVisibility(config.is_admin);
  }, [config]);

  const isOpen = isSettingOpen || isHistoryOpen;

  return (
    <>
      {isOpen && <div className="overlay" onClick={closePanels} />}
      <div className="sidebar-container" ref={sidebarRef}>
        <SidebarBox
          isChatReady={isChatReady}
          newSession={newSession}
          isSettingOpen={isSettingOpen}
          toggleSetting={() => handleSetting()}
          isHistoryOpen={isHistoryOpen}
          toggleHistory={() => handleHistory()}
          openBugReport={openBugReport}
          settingVisibility={settingVisibility}
          adminIcon={adminIcon()}
        />
        <Setting
          isOpen={isSettingOpen}
          setIsOpen={setIsSettingOpen}
          onClose={() => setIsSettingOpen(false)}
        />
        <ChatHistory
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
        />
      </div>
    </>
  );
};

const SidebarBox = ({
  isChatReady,
  newSession,
  isSettingOpen,
  toggleSetting,
  isHistoryOpen,
  toggleHistory,
  openBugReport,
  settingVisibility,
  adminIcon
}) => {
  const { t } = useTranslation();
  return (
  <div className="sidebarbox">
    <div
      className={`chat-history ${!isChatReady ? "disabled" : ""}`}
      title={t('sidebar.chat_history')}
      onClick={() => {
        if (isChatReady) {
          toggleHistory();
        }
      }}
    >
      <img alt="Chat History" src="/images/normal_u17.svg" />
    </div>
    <button
      title={t('sidebar.new_chat')}
      className={`new-chat  ${!isChatReady ? "disabled" : ""}`}
      onClick={newSession}
      disabled={!isChatReady}
    />
    <div className="spacer"></div>
    <div className="bug" title={t('sidebar.report_bug')}>
      <button className="bug-button" onClick={openBugReport}></button>
    </div>
    <div className="help" title={t('sidebar.help')}>
      <button
        className="help-button"
        onClick={async () => {
          await open('https://aibuilder.intel.com/Intel%20AI%20Assistant%20Builder%20User%20Guide.pdf');
        }}
      >
        <HelpIcon className="help-icon" />
      </button>
    </div>
    <div className="admin">
      {adminIcon}
    </div>
    {settingVisibility && (
      <div className="Settings" title={t('sidebar.setting')}>
        <button className="setting-button" onClick={toggleSetting}>
          <SettingsIcon 
            className={`setting-icon ${isSettingOpen ? "open" : ""}`}
          />
        </button>
      </div>
    )}
  </div>
);
}

export default Sidebar;