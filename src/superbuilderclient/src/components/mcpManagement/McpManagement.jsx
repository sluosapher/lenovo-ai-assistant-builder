import React, { useState, useEffect, useContext } from "react";
import {
  Box,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  Typography,
  TextField,
} from "@mui/material";
import ArrowCircleLeft from "@mui/icons-material/ArrowCircleLeft";
import Autocomplete from "@mui/material/Autocomplete";
import "./McpManagement.css";
import McpAgentTable from "./McpAgentTable";
import McpServerTable from "./McpServerTable";
import FluidModal from "../FluidModal/FluidModal";
import useDataStore from "../../stores/DataStore";
import useMcpStore from "../../stores/McpStore";
import { useTranslation } from "react-i18next";
import { ChatContext } from "../context/ChatContext";

const McpManagement = ({ isSidebarOpen = false, closePanels = () => {} }) => {
  const { t } = useTranslation();
  const { isChatReady, setIsChatReady } = useContext(ChatContext);
  const assistant = useDataStore((state) => state.assistant);
  const mcpManagementOpen = useMcpStore((state) => state.mcpManagementOpen);
  const mcpAgents = useMcpStore((state) => state.mcpAgents);
  const mcpServers = useMcpStore((state) => state.mcpServers);
  const selectedMcpServerId = useMcpStore((state) => state.selectedMcpServerId);
  const selectedMcpServer = useMcpStore((state) => state.selectedMcpServer);
  const mcpInputOpen = useMcpStore((state) => state.mcpInputOpen);
  const mcpInputType = useMcpStore((state) => state.mcpInputType);
  const mcpInputSource = useMcpStore((state) => state.mcpInputSource);
  const mcpInput = useMcpStore((state) => state.mcpInput);
  const mcpServerTools = useMcpStore((state) => state.mcpServerTools);
  const runningMcpServers = useMcpStore((state) => state.runningMcpServers);
  const loadingMcpServers = useMcpStore((state) => state.loadingMcpServers);
  const fetchingMcpServerTools = useMcpStore(
    (state) => state.fetchingMcpServerTools
  );
  const mcpAgentInput = useMcpStore((state) => state.mcpAgentInput);
  const mcpAgentInputOpen = useMcpStore((state) => state.mcpAgentInputOpen);
  const mcpAgentInputType = useMcpStore((state) => state.mcpAgentInputType);
  const mcpRemoveModalOpen = useMcpStore((state) => state.mcpRemoveModalOpen);
  const mcpRemoveType = useMcpStore((state) => state.mcpRemoveType);

  const [mcpInputError, setMcpServerInputError] = useState({});
  const [mcpAgentInputError, setMcpAgentInputError] = useState({});
  const runningMcpAgents = useMcpStore((state) => state.runningMcpAgents);
  const loadingMcpAgents = useMcpStore((state) => state.loadingMcpAgents);

  const refreshTrigger = useMcpStore((state) => state.refreshTrigger);

  useEffect(() => {
    if (mcpManagementOpen) {
      useMcpStore.getState().getMcpAgent();
      useMcpStore.getState().getActiveMcpAgents();
      useMcpStore.getState().getMcpServer();
      useMcpStore.getState().getActiveMcpServers();
    }
  }, [mcpManagementOpen, refreshTrigger]);

  useEffect(() => {
    if (mcpInputOpen) {
      setMcpServerInputError({
        mcpServerName: false,
        mcpServerNameDuplicate: false,
        mcpServerCommand: false,
        mcpServerCommandArgs: false,
        mcpServerUrl: false,
        mcpServerEnv: false,
      });
    }
  }, [mcpInputOpen]);

  useEffect(() => {
    if (mcpAgentInputOpen) {
      setMcpAgentInputError({
        agentName: false,
        agentNameDuplicate: false,
        description: false,
        systemMessage: false,
        mcpServerIds: false,
      });
    }
  }, [mcpAgentInputOpen]);

  const handleInputSourceChange = (source) => {
    useMcpStore.getState().setMcpInputSource(source);
    if (source === "command") {
      useMcpStore.getState().setMcpInput({
        ...mcpInput,
        mcpServerUrl: "",
        mcpServerEnv: "",
      });
      setMcpServerInputError((prev) => ({
        ...prev,
        mcpServerUrl: false,
      }));
    } else {
      useMcpStore.getState().setMcpInput({
        ...mcpInput,
        mcpServerCommand: "",
        mcpServerCommandArgs: "",
        mcpServerEnv: "",
      });
      setMcpServerInputError((prev) => ({
        ...prev,
        mcpServerCommand: false,
        mcpServerCommandArgs: false,
      }));
    }
  };

  const handleManagementUIClose = () => {
    useMcpStore.getState().closeMcpManagement();
  };

  const handleInputModalClose = () => {
    useMcpStore.getState().closeMcpInput();
  };

  const handleInputModalOpen = (type) => {
    useMcpStore.getState().openMcpInput(type, "url");
    if (type === "Add") {
      useMcpStore.getState().setMcpInput({
        mcpServerName: "",
        mcpServerCommand: "",
        mcpServerCommandArgs: "",
        mcpServerUrl: "",
        mcpServerEnv: "",
        mcpServerDisabled: false,
      });
    }
  };

  const handleAgentInputModalClose = () => {
    useMcpStore.getState().closeMcpAgentInput();
  };

  const handleAgentInputModalOpen = (type) => {
    useMcpStore.getState().openMcpAgentInput(type);
    if (type === "Add") {
      useMcpStore.getState().setMcpAgentInput({
        agentName: "",
        description: "",
        systemMessage:
          "You are a helpful assistant who first analyzes the ultimate needs of the customer. Then, you select the appropriate tool or multiple tools based on the needs and solve them step by step until the user's ultimate needs are met.",
        mcpServerIds: [], // Initialize as empty array
      });
    }
  };

  const handleMcpServerSubmit = (type) => {
    setIsChatReady(false);
    // Validate input before submission
    if (!Object.values(mcpInputError).every((v) => v === false)) {
      return;
    }

    // Strip double quotes from mcpServerCommand
    if (
      mcpInputSource === "command" &&
      typeof mcpInput.mcpServerCommand === "string"
    ) {
      const strippedCommand = mcpInput.mcpServerCommand.replace(/^"+|"+$/g, "");
      useMcpStore.getState().setMcpInput({
        ...mcpInput,
        mcpServerCommand: strippedCommand,
      });
    }

    let result;
    if (type === "Add") {
      result = useMcpStore.getState().addMcpServer();
    } else {
      result = useMcpStore.getState().updateMcpServer();
    }

    if (result) {
      setIsChatReady(true);
    }
    useMcpStore.getState().closeMcpInput();
  };

  const namePattern = /^[A-Za-z0-9_-]+$/;

  const handleInputChange = (field) => (event) => {
    const value =
      field !== "mcpServerDisabled" ? event.target.value : event.target.checked;

    if (field === "mcpServerName") {
      setMcpServerInputError((prev) => ({
        ...prev,
        mcpServerNameDuplicate: mcpServers.some(
          (server) => server.server_name === value.trim()
        ),
        mcpServerName: !value.trim(),
        mcpServerNameInvalid: value.trim() && !namePattern.test(value.trim()),
      }));
    }

    if (mcpInputSource === "url") {
      if (field === "mcpServerUrl") {
        if (!value.trim()) {
          setMcpServerInputError((prev) => ({
            ...prev,
            mcpServerUrl: true,
          }));
        } else {
          try {
            new URL(value);
            setMcpServerInputError((prev) => ({
              ...prev,
              mcpServerUrl: false,
            }));
          } catch (e) {
            setMcpServerInputError((prev) => ({
              ...prev,
              mcpServerUrl: true,
            }));
          }
        }
      }
    } else if (mcpInputSource === "command") {
      if (field === "mcpServerCommand") {
        setMcpServerInputError((prev) => ({
          ...prev,
          [field]: !value.trim(),
        }));
      }
    }

    // Add validation for environment variables format
    if (field === "mcpServerEnv") {
      // Validate environment variable format (KEY=VALUE or KEY:VALUE)
      if (value.trim() && !value.match(/^[A-Z_][A-Z0-9_]*[:=].+$/i)) {
        setMcpServerInputError((prev) => ({
          ...prev,
          mcpServerEnv: true,
        }));
      } else {
        setMcpServerInputError((prev) => ({
          ...prev,
          mcpServerEnv: false,
        }));
      }
    }

    useMcpStore.getState().setMcpInput({
      ...mcpInput,
      [field]: value,
    });
  };

  const handleRemoveMcpServer = () => {
    setIsChatReady(false);
    useMcpStore.getState().removeMcpServer();
    setIsChatReady(true);
  };

  const handleMcpAgentSubmit = (type) => {
    setIsChatReady(false);

    if (!Object.values(mcpAgentInputError).every((v) => v === false)) {
      return;
    }

    let result;
    if (type === "Add") {
      result = useMcpStore.getState().addMcpAgent();
    } else {
      result = useMcpStore.getState().updateMcpAgent();
    }

    if (result) {
      setIsChatReady(true);
    }

    useMcpStore.getState().closeMcpAgentInput();
  };

  const handleAgentInputChange = (field) => (event) => {
    const value = event.target.value;

    if (field === "agentName") {
      setMcpAgentInputError((prev) => ({
        ...prev,
        agentNameDuplicate: mcpAgents.some(
          (agent) => agent.name === value.trim()
        ),
        agentName: !value.trim(),
        agentNameInvalid: value.trim() && !namePattern.test(value.trim()),
      }));
    } else {
      setMcpAgentInputError((prev) => ({
        ...prev,
        [field]: !value.trim(),
      }));
    }

    useMcpStore.getState().setMcpAgentInput({
      ...mcpAgentInput,
      [field]: value,
    });
  };

  const handleRemoveMcpAgent = () => {
    setIsChatReady(false);
    useMcpStore.getState().removeMcpAgent();
    setIsChatReady(true);
  };

  return (
    <>
      {isSidebarOpen && <div onClick={closePanels} />}
      <div className="mcp-modal-overlay" onClick={(e) => e.stopPropagation()}>
        <Box
          sx={{
            justifyContent: "space-between",
            display: "flex",
          }}
        >
          <Button
            variant="contained"
            className="close-button"
            onClick={handleManagementUIClose}
            sx={{ height: "30px", gap: "10px" }}
          >
            <ArrowCircleLeft />
            {t("mcp.ui.back")}
          </Button>
          <Button
            variant="contained"
            className="close-button"
            sx={{ height: "30px" }}
            disabled={!isChatReady}
            onClick={() => handleAgentInputModalOpen("Add")}
          >
            {t("mcp.ui.add_agent_button")}
          </Button>
        </Box>

        {/* Agent Table */}
        <div className="filebox">
          <McpAgentTable />
        </div>

        {/* Server Table */}
        <div className="filebox">
          <McpServerTable />
        </div>

        <div className="add-remove-button-container">
          <Button
            variant="contained"
            disabled={!isChatReady || loadingMcpServers.length > 0}
            className="add-buttons"
            onClick={() => handleInputModalOpen("Add")}
          >
            {t("mcp.ui.add")}
          </Button>
          <Button
            id="remove"
            disabled={
              !isChatReady ||
              selectedMcpServer.length === 0 ||
              (selectedMcpServer.length > 0 &&
                (selectedMcpServer.some((server) =>
                  runningMcpServers.includes(server.server_name)
                ) ||
                  selectedMcpServerId.some((id) =>
                    mcpAgents.some((agent) => agent.server_ids.includes(id))
                  )))
            }
            variant="contained"
            className="remove-buttons"
            onClick={() => {
              useMcpStore.getState().setMcpRemoveType("server");
              useMcpStore.getState().setMcpRemoveModalOpen(true);
            }}
          >
            {" "}
            {t("mcp.ui.remove")}
          </Button>
        </div>
      </div>

      {/* Remove Modal */}
      <FluidModal
        open={mcpRemoveModalOpen}
        handleClose={() => useMcpStore.getState().setMcpRemoveModalOpen(false)}
        header={
          <strong>
            {t("mcp.ui.confirm_remove")}{" "}
            {mcpRemoveType === "server"
              ? t("mcp.ui.mcp_server")
              : t("mcp.ui.mcp_agent")}
          </strong>
        }
        width="40%"
        footer={
          <>
            <div className="mcpmodal-footer">
              <div className="button">
                <Button
                  size="m"
                  variant="text"
                  onClick={() => {
                    useMcpStore.getState().setMcpRemoveModalOpen(false);

                    if (mcpRemoveType === "agent") {
                      useMcpStore.getState().setSelectedMcpAgent([]);
                    }
                  }}
                >
                  {t("mcp.ui.close_button")}
                </Button>
              </div>
              <div className="button">
                <Button
                  size="m"
                  variant="contained"
                  sx={{ backgroundColor: "#c73d3d" }}
                  onClick={() => {
                    if (mcpRemoveType === "server") {
                      handleRemoveMcpServer();
                    } else {
                      handleRemoveMcpAgent();
                    }
                    useMcpStore.getState().setMcpRemoveModalOpen(false);
                  }}
                >
                  {t("mcp.ui.remove_button")}
                </Button>
              </div>
            </div>
          </>
        }
        assistant={assistant}
      >
        <div className="mcpmodal">
          <div className="mcpmodal-container">
            <div className="mcpmodal-content">
              <Typography component="div">
                {t("mcp.ui.confirm_remove_message")}{" "}
                {mcpRemoveType === "server"
                  ? t("mcp.ui.mcp_server")
                  : t("mcp.ui.mcp_agent")}
                <br />
                {mcpRemoveType === "server" ? (
                  <ul>
                    {useMcpStore.getState().selectedMcpServer.map((server) => (
                      <li key={server.server_name}>{server.server_name}</li>
                    ))}
                  </ul>
                ) : (
                  <ul>
                    {useMcpStore.getState().selectedMcpAgent.map((agent) => (
                      <li key={agent.name}>{agent.name}</li>
                    ))}
                  </ul>
                )}
              </Typography>
            </div>
          </div>
        </div>
      </FluidModal>

      {/* MCP Agent Modal */}
      <FluidModal
        open={mcpAgentInputOpen}
        handleClose={handleAgentInputModalClose}
        header={
          <strong>
            {mcpAgentInputType === "Add"
              ? t("mcp.ui.add_agent")
              : t("mcp.ui.edit_agent")}
          </strong>
        }
        width="50%"
        footer={
          <>
            <div className="mcpmodal-footer">
              <div className="button">
                <Button
                  size="m"
                  variant="text"
                  onClick={handleAgentInputModalClose}
                >
                  {t("mcp.ui.close_button")}
                </Button>
              </div>
              <div className="button">
                <Button
                  size="m"
                  variant="contained"
                  onClick={() => handleMcpAgentSubmit(mcpAgentInputType)}
                  disabled={
                    Object.values(mcpAgentInputError).some(
                      (error) => error === true
                    ) ||
                    !(mcpAgentInput.agentName ?? "").trim() ||
                    !(mcpAgentInput.description ?? "").trim() ||
                    !(mcpAgentInput.systemMessage ?? "").trim() ||
                    !Array.isArray(mcpAgentInput.mcpServerIds) ||
                    runningMcpAgents.includes(mcpAgentInput.agentName)
                  }
                >
                  {mcpAgentInputType === "Add"
                    ? t("mcp.ui.add_button")
                    : t("mcp.ui.save_button")}
                </Button>
              </div>
            </div>
          </>
        }
        assistant={assistant}
      >
        <div className="mcpmodal">
          <div className="mcpmodal-container">
            <div className="mcpmodal-content">
              <Typography className="textfield-title">
                <span style={{ color: "red" }}>*</span>{" "}
                {t("mcp.ui.mcp_agent_name")}
              </Typography>
              <TextField
                value={mcpAgentInput.agentName}
                disabled={
                  mcpAgentInputType === "Update" &&
                  (loadingMcpAgents.includes(mcpAgentInput.agentName) ||
                    runningMcpAgents.includes(mcpAgentInput.agentName))
                }
                onChange={handleAgentInputChange("agentName")}
                fullWidth
                error={
                  mcpAgentInputError.agentName ||
                  mcpAgentInputError.agentNameDuplicate ||
                  mcpAgentInputError.agentNameInvalid
                }
                helperText={
                  mcpAgentInputError.agentName
                    ? "MCP Agent Name is required"
                    : mcpAgentInputError.agentNameDuplicate
                    ? "MCP Agent Name already exists"
                    : mcpAgentInputError.agentNameInvalid
                    ? "Only letters, numbers, dashes, and underscores are allowed"
                    : ""
                }
                slotProps={{
                  formHelperText: {
                    sx: { color: "red" },
                  },
                }}
              />
            </div>
            <div className="mcpmodal-content">
              <Typography className="textfield-title">
                <span style={{ color: "red" }}>*</span>{" "}
                {t("mcp.ui.mcp_agent_description")}
              </Typography>
              <TextField
                value={mcpAgentInput.description}
                disabled={
                  mcpAgentInputType === "Update" &&
                  (loadingMcpAgents.includes(mcpAgentInput.agentName) ||
                    runningMcpAgents.includes(mcpAgentInput.agentName))
                }
                onChange={handleAgentInputChange("description")}
                fullWidth
                error={mcpAgentInputError.description}
                helperText={
                  mcpAgentInputError.description
                    ? "MCP Agent Description is required"
                    : ""
                }
                slotProps={{
                  formHelperText: {
                    sx: { color: "red" },
                  },
                }}
              />
            </div>
            <div className="mcpmodal-content">
              <Typography className="textfield-title">
                <span style={{ color: "red" }}>*</span>{" "}
                {t("mcp.ui.mcp_agent_system_prompt")}
              </Typography>
              <TextField
                value={mcpAgentInput.systemMessage}
                disabled={
                  mcpAgentInputType === "Update" &&
                  (loadingMcpAgents.includes(mcpAgentInput.agentName) ||
                    runningMcpAgents.includes(mcpAgentInput.agentName))
                }
                onChange={handleAgentInputChange("systemMessage")}
                fullWidth
                error={mcpAgentInputError.systemMessage}
                helperText={
                  mcpAgentInputError.systemMessage
                    ? "MCP Agent System Prompt is required"
                    : ""
                }
                slotProps={{
                  formHelperText: {
                    sx: { color: "red" },
                  },
                }}
              />
            </div>
            <div className="mcpmodal-content">
              <Typography className="textfield-title">
                {t("mcp.ui.mcp_agent_mcp_server")}
              </Typography>
              <FormControl fullWidth>
                <Autocomplete
                  multiple
                  options={mcpServers}
                  getOptionLabel={(option) => option.server_name}
                  value={
                    Array.isArray(mcpAgentInput.mcpServerIds) &&
                    mcpAgentInput.mcpServerIds.length > 0
                      ? mcpServers.filter((server) =>
                          mcpAgentInput.mcpServerIds.includes(server.id)
                        )
                      : []
                  }
                  disabled={
                    mcpAgentInputType === "Update" &&
                    (loadingMcpAgents.includes(mcpAgentInput.agentName) ||
                      runningMcpAgents.includes(mcpAgentInput.agentName))
                  }
                  onChange={(_, selected) => {
                    useMcpStore.getState().setMcpAgentInput({
                      ...mcpAgentInput,
                      mcpServerIds: selected.map((server) => server.id), // Store as array of numbers
                    });
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      placeholder={t("mcp.ui.mcp_agent_mcp_server_placeholder")}
                      helperText={
                        mcpAgentInput.mcpServerIds.length === 0
                          ? t("mcp.ui.mcp_agent_mcp_server_note")
                          : ""
                      }
                    />
                  )}
                />
              </FormControl>
            </div>
          </div>
        </div>
      </FluidModal>

      {/* MCP Server Modal */}
      <FluidModal
        open={mcpInputOpen}
        handleClose={handleInputModalClose}
        header={
          <strong>
            {mcpInputType === "Add" ? t("mcp.ui.add") : t("mcp.ui.edit")}
          </strong>
        }
        width={mcpInputType === "Add" ? "40%" : "80%"}
        footer={
          <>
            <div className="mcpmodal-footer">
              <div className="button">
                <Button size="m" variant="text" onClick={handleInputModalClose}>
                  {t("mcp.ui.close_button")}
                </Button>
              </div>
              <div className="button">
                <Button
                  size="m"
                  variant="contained"
                  onClick={() => handleMcpServerSubmit(mcpInputType)}
                  disabled={
                    Object.values(mcpInputError).some(
                      (error) => error === true
                    ) ||
                    !(mcpInput.mcpServerName ?? "").trim() ||
                    (mcpInputSource === "url" &&
                      !(mcpInput.mcpServerUrl ?? "").trim()) ||
                    (mcpInputSource === "command" &&
                      !(mcpInput.mcpServerCommand ?? "").trim()) ||
                    loadingMcpServers.includes(mcpInput.mcpServerName) ||
                    runningMcpServers.includes(mcpInput.mcpServerName)
                  }
                >
                  {mcpInputType === "Add"
                    ? t("mcp.ui.add_button")
                    : t("mcp.ui.save_button")}
                </Button>
              </div>
            </div>
          </>
        }
        assistant={assistant}
      >
        <div className="mcpmodal">
          <div className="mcpmodal-container">
            <FormControl
              component="fieldset"
              className="small-form-control"
              disabled={
                mcpInputType === "Update" &&
                (loadingMcpServers.includes(mcpInput.mcpServerName) ||
                  runningMcpServers.includes(mcpInput.mcpServerName))
              }
            >
              <div
                className="radio-group-with-label"
                sx={{ display: "flex", width: "100%" }}
              >
                <RadioGroup
                  row
                  aria-label="model"
                  name="model"
                  value={mcpInputSource}
                  onChange={(e) => handleInputSourceChange(e.target.value)}
                >
                  <FormControlLabel
                    value="url"
                    control={<Radio color={"default"} />}
                    label={t("mcp.ui.url_radio")}
                  />
                  <FormControlLabel
                    value="command"
                    control={<Radio color={"default"} />}
                    label={t("mcp.ui.command_radio")}
                  />
                </RadioGroup>
              </div>
            </FormControl>

            <div className="mcpmodal-content">
              <Typography className="textfield-title">
                <span style={{ color: "red" }}>*</span>{" "}
                {t("mcp.ui.mcp_server_name")}
              </Typography>
              <TextField
                value={mcpInput.mcpServerName}
                placeholder=""
                onChange={handleInputChange("mcpServerName")}
                fullWidth
                disabled={
                  mcpInputType === "Update" &&
                  (loadingMcpServers.includes(mcpInput.mcpServerName) ||
                    runningMcpServers.includes(mcpInput.mcpServerName))
                }
                error={
                  mcpInputError.mcpServerName ||
                  mcpInputError.mcpServerNameDuplicate ||
                  mcpInputError.mcpServerNameInvalid
                }
                helperText={
                  mcpInputError.mcpServerName
                    ? "MCP Server Name is required"
                    : mcpInputError.mcpServerNameDuplicate
                    ? "MCP Server Name already exists"
                    : mcpInputError.mcpServerNameInvalid
                    ? "Only letters, numbers, dashes, and underscores are allowed"
                    : ""
                }
                slotProps={{
                  formHelperText: {
                    sx: { color: "red" },
                  },
                }}
              />
            </div>
            {mcpInputSource === "command" ? (
              <>
                <div className="mcpmodal-content">
                  <Typography>
                    <span style={{ color: "red" }}>*</span>{" "}
                    {t("mcp.ui.mcp_server_command")}
                  </Typography>
                  <TextField
                    value={mcpInput.mcpServerCommand}
                    placeholder="e.g. docker"
                    onChange={handleInputChange("mcpServerCommand")}
                    fullWidth
                    disabled={
                      mcpInputType === "Update" &&
                      (loadingMcpServers.includes(mcpInput.mcpServerName) ||
                        runningMcpServers.includes(mcpInput.mcpServerName))
                    }
                    error={mcpInputError.mcpServerCommand}
                    helperText={
                      mcpInputError.mcpServerCommand
                        ? "MCP Server Command is required"
                        : ""
                    }
                    slotProps={{
                      formHelperText: {
                        sx: { color: "red" },
                      },
                    }}
                  />
                </div>
                <div className="mcpmodal-content">
                  <Typography>{t("mcp.ui.mcp_server_command_args")}</Typography>
                  <TextField
                    value={mcpInput.mcpServerCommandArgs}
                    placeholder="e.g. run -i --rm mcp/time"
                    disabled={
                      mcpInputType === "Update" &&
                      (loadingMcpServers.includes(mcpInput.mcpServerName) ||
                        runningMcpServers.includes(mcpInput.mcpServerName))
                    }
                    onChange={handleInputChange("mcpServerCommandArgs")}
                    fullWidth
                  />
                </div>
              </>
            ) : (
              <>
                <div className="mcpmodal-content">
                  <Typography>
                    <span style={{ color: "red" }}>*</span>{" "}
                    {t("mcp.ui.mcp_server_url")}
                  </Typography>
                  <TextField
                    value={mcpInput.mcpServerUrl}
                    placeholder="e.g. http://127.0.0.1:3008/sse"
                    onChange={handleInputChange("mcpServerUrl")}
                    fullWidth
                    disabled={
                      mcpInputType === "Update" &&
                      (loadingMcpServers.includes(mcpInput.mcpServerName) ||
                        runningMcpServers.includes(mcpInput.mcpServerName))
                    }
                    error={mcpInputError.mcpServerUrl}
                    helperText={
                      mcpInputError.mcpServerUrl
                        ? !mcpInput.mcpServerUrl.trim()
                          ? "MCP Server URL is required"
                          : "MCP Server URL is invalid"
                        : ""
                    }
                    slotProps={{
                      formHelperText: {
                        sx: { color: "red" },
                      },
                    }}
                  />
                </div>
              </>
            )}
            <div className="mcpmodal-content">
              <Typography>{t("mcp.ui.mcp_server_env")}</Typography>
              <TextField
                value={mcpInput.mcpServerEnv}
                placeholder="e.g. API_KEY=your_api_key_here or API_KEY:your_api_key_here"
                onChange={handleInputChange("mcpServerEnv")}
                fullWidth
                disabled={
                  mcpInputType === "Update" &&
                  (loadingMcpServers.includes(mcpInput.mcpServerName) ||
                    runningMcpServers.includes(mcpInput.mcpServerName))
                }
                error={mcpInputError.mcpServerEnv}
                helperText={
                  mcpInputError.mcpServerEnv
                    ? "Environment variable format should be KEY=VALUE or KEY:VALUE"
                    : ""
                }
                slotProps={{
                  formHelperText: {
                    sx: { color: "red" },
                  },
                }}
              />
            </div>
            {/* <div className="mcpmodal-content">
              <FormControlLabel
                sx={{ display: "flex" }}
                label={t("mcp.ui.disabled_checkbox")}
                control={
                  <Checkbox
                    checked={mcpInput.mcpServerDisabled}
                    onChange={handleInputChange("mcpServerDisabled")}
                  />
                }
              />
            </div> */}
          </div>
          {mcpInputType === "Update" && (
            <div className="mcpmodal-container">
              <Typography>{t("mcp.ui.mcp_server_info")}</Typography>
              <div className="mcpmodal-metadata">
                {mcpServerTools.length > 0 ? (
                  mcpServerTools.map((tool, index) => (
                    <div key={index} className="mcpmodal-metadata-tool">
                      <div>
                        <strong>{tool.name}</strong>
                      </div>
                      <div>{tool.description}</div>
                    </div>
                  ))
                ) : fetchingMcpServerTools ? (
                  <div>{t("mcp.ui.mcp_server_info_fetching")}</div>
                ) : (
                  <div>{t("mcp.ui.mcp_server_info_empty")}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </FluidModal>
    </>
  );
};

export default McpManagement;
