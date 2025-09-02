import "./Sidebar.css";
import React, { useState, useEffect, useContext, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChatContext } from "../context/ChatContext";
import { WorkflowContext } from "../context/WorkflowContext";
import useDataStore from "../../stores/DataStore";
// import useMcpStore from "../../stores/McpStore";
import SettingsIcon from "@mui/icons-material/Settings";
import NewWorkflowIcon from "@mui/icons-material/AddCircle";
import HistoryIcon from "@mui/icons-material/History";
import AdminIcon from "@mui/icons-material/ManageAccounts";
// import mcpLogo from '../../assets/images/mcp-logo.svg';
import { useTranslation } from "react-i18next";
// import McpManagement from "../mcpManagement/McpManagement";
import { ChatHistory } from "./ChatHistory";
import WorkflowOptions from "../workflows/WorkflowOptions";
import SidebarOverlay from "./SidebarOverlay";
import Setting from "../setting/Setting";

const Sidebar = ({}) => {
  const { t } = useTranslation();
  const { config, getDBConfig } = useDataStore();
  const { newSession, isChatReady, newChatModelNeeded } = useContext(ChatContext);
  const {
    workflowSidebarVisible: isWorkflowOpen,
    setWorkflowSidebarVisible: setIsWorkflowOpen,
  } = useContext(WorkflowContext);
  const [isSettingOpen, setIsSettingOpen] = useState(false); // setting popout panel
  const [isHistoryOpen, setIsHistoryOpen] = useState(false); // chat history popout panel
  const sidebarRef = useRef(null);
  const [settingVisibility, setSettingVisibility] = useState(false);
  // const mcpManagementOpen = useMcpStore((state) => state.mcpManagementOpen);

  const handleSetAdmin = async () => {
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
  };

  const handleHistory = () => {
    setIsSettingOpen(false);
    setIsWorkflowOpen(false);
    setIsHistoryOpen(!isHistoryOpen);
  };

  const handleSetting = () => {
    setIsHistoryOpen(false);
    setIsWorkflowOpen(false);
    setIsSettingOpen(!isSettingOpen);
  };

  const handleWorkflow = () => {
    setIsHistoryOpen(false);
    setIsSettingOpen(false);
    setIsWorkflowOpen(!isWorkflowOpen);
  };

  const closePanels = () => {
    setIsSettingOpen(false);
    setIsHistoryOpen(false);
    setIsWorkflowOpen(false);
  };

  useEffect(() => {
    setSettingVisibility(config.is_admin);
  }, [config]);

  useEffect(() => {
    if (isChatReady == false && newChatModelNeeded == true && isSettingOpen == false) {
      handleSetting();
    }
  }, [isChatReady, newChatModelNeeded, isSettingOpen]);

  const isOpen = isSettingOpen || isHistoryOpen || isWorkflowOpen;

  const SidebarBox = ({
    isChatReady,
    toggleSetting,
    toggleHistory,
    toggleWorkflow,
    settingVisibility,
  }) => {
    const { t } = useTranslation();
    // const mcpManagementOpen = useMcpStore((state) => state.mcpManagementOpen);
    // const toggleMcpLibrary = () => {
    //   if (mcpManagementOpen) {
    //     useMcpStore.getState().closeMcpManagement();
    //   } else {
    //     useMcpStore.getState().openMcpManagement();
    //   }
    // };

    const SidebarButton = ({title, icon, onClick, additionalClasses=""}) => {
      return (
        <button
          title={title}
          className={`sidebar-button ` + additionalClasses}
          onClick={onClick}
          disabled={!isChatReady}
        >
          {icon}
        </button>
      );
    }

    return (
      <div className="sidebarbox">
        <SidebarButton
          additionalClasses="new-chat-button"
          title={t('sidebar.new_chat')}
          onClick={() => {
            if (isChatReady) {
              toggleWorkflow();
            }
          }}
          icon={<NewWorkflowIcon className="sidebar-icon" color="primary" sx={{fontSize: "50px"}}/>}
        />
        <SidebarButton
          title={t('sidebar.chat_history')}
          onClick={() => {
            if (isChatReady) {
              toggleHistory();
            }
          }}
          icon={<HistoryIcon className="sidebar-icon" fontSize="large"/>}
        />
        {/* <SidebarButton
          title={t("sidebar.mcp_manager")}
          onClick={toggleMcpLibrary}
          icon={<img className="sidebar-image-icon" src={mcpLogo} alt="MCP Logo" />}
        /> */}
        <div className="spacer"></div>
        <div className="admin">
          <SidebarButton
            title={t('sidebar.admin_mode') + ' - '  + (config.is_admin ? t('sidebar.mode_enable') : t('sidebar.mode_disable'))}
            onClick={handleSetAdmin}
            icon={<AdminIcon className="sidebar-icon" fontSize="large"/>}
          />
        </div>
        {settingVisibility && (
          <SidebarButton
            title={t('sidebar.setting')}
            onClick={toggleSetting}
            icon={<SettingsIcon className="sidebar-icon" fontSize="large"/>}
          />
        )}
      </div>
    );
  };

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
          isWorkflowOpen={isWorkflowOpen}
          toggleWorkflow={() => handleWorkflow()}
          settingVisibility={settingVisibility}
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
        {/* {mcpManagementOpen && (
          <McpManagement
            isSidebarOpen={isSettingOpen || isHistoryOpen}
            closePanels={closePanels}
          />
        )} */}
        <SidebarOverlay
          isOpen={isWorkflowOpen}
          onClose={() => {
            if (isChatReady) {
              setIsWorkflowOpen(false);
            }
          }}
          content={
            <WorkflowOptions
              onWorkflowSelected={() => {
                setIsWorkflowOpen(false)
                // if (mcpManagementOpen) {
                //   useMcpStore.getState().closeMcpManagement();
                // }
              }}
            />
          }
        />
      </div>
    </>
  );
};

export default Sidebar;

