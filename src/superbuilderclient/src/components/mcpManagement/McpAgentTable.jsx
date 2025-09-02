import React, { useContext } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Paper, Box, Button } from "@mui/material";
import { useTranslation } from "react-i18next";

import "./McpServerTable.css";
import useMcpStore from "../../stores/McpStore";
import { ChatContext } from "../context/ChatContext";

export default function McpAgentTable() {
  const { t } = useTranslation();
  const mcpAgents = useMcpStore((state) => state.mcpAgents);
  const loadingMcpAgents = useMcpStore((state) => state.loadingMcpAgents);
  const runningMcpAgents = useMcpStore((state) => state.runningMcpAgents);
  const mcpServers = useMcpStore((state) => state.mcpServers);
  const mcpRemoveModalOpen = useMcpStore((state) => state.mcpRemoveModalOpen);
  const { isChatReady, setIsChatReady } = useContext(ChatContext);

  const handleDetailsClick = (id) => {
    const selectedAgent = mcpAgents.find((agent) => agent.id === id);
    console.log("Selected MCP Agent:", selectedAgent);
    useMcpStore.getState().openMcpAgentInput("Update");
    useMcpStore.getState().setMcpAgentInput({
      id: selectedAgent.id,
      agentName: selectedAgent.name || "",
      description: selectedAgent.desc || "",
      systemMessage: selectedAgent.message || "",
      mcpServerIds: selectedAgent.server_ids || "",
    });
  };

  const handleRemoveMcpAgent = (id) => {
    setIsChatReady(false);
    const selectedAgent = mcpAgents.find((agent) => agent.id === id);
    useMcpStore.getState().setSelectedMcpAgent([selectedAgent]);
    useMcpStore.getState().setMcpRemoveType("agent");
    useMcpStore.getState().setMcpRemoveModalOpen(true);
    setIsChatReady(true);
  };

  const handleStartMcpAgent = async (name) => {
    setIsChatReady(false);
    await useMcpStore.getState().startMcpAgent(name);
    setIsChatReady(true);
  };

  const handleStopMcpAgent = async (name) => {
    setIsChatReady(false);
    await useMcpStore.getState().stopMcpAgent(name);
    setIsChatReady(true);
  };

  const commandColumns = [
    {
      field: "name",
      headerName: t("mcp.agent_table.agent_name"),
      flex: 0.5,
    },
    {
      field: "desc",
      headerName: t("mcp.agent_table.agent_description"),
      flex: 1,
    },
    {
      field: "message",
      headerName: t("mcp.agent_table.system_prompt"),
      flex: 1,
    },
    {
      field: "server_ids",
      headerName: t("mcp.agent_table.mcp_server"),
      flex: 1,
      renderCell: (params) => {
        if (!params.value || !Array.isArray(params.value)) return "";
        const names = params.value
          .map((id) => {
            const server = mcpServers.find((s) => s.id === id);
            return server ? server.server_name : id;
          })
          .join(", ");
        return names;
      },
    },
    {
      field: "actions",
      headerName: t("mcp.agent_table.actions"),
      flex: 1,
      minWidth: 234,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const isWide = window.innerWidth > 1750;
        const loadingPosition = isWide ? "end" : "center";
        return (
          <>
            {runningMcpAgents.includes(params.row.name) ? (
              <Button
                size="small"
                variant="contained"
                disabled={!isChatReady}
                loading={loadingMcpAgents.includes(params.row.name)}
                loadingPosition={loadingPosition}
                className={"mcp-table-status-btn status-btn-stop"}
                onClick={() => handleStopMcpAgent(params.row.name)}
              >
                {loadingMcpAgents.includes(params.row.name)
                  ? isWide
                    ? t("mcp.server_table.stopping")
                    : ""
                  : t("mcp.server_table.stop")}
              </Button>
            ) : (
              <Button
                variant="contained"
                disabled={!isChatReady || params.row.server_ids.length === 0}
                loading={loadingMcpAgents.includes(params.row.name)}
                loadingPosition={loadingPosition}
                size="small"
                className={"mcp-table-status-btn status-btn-start"}
                onClick={() => handleStartMcpAgent(params.row.name)}
              >
                {loadingMcpAgents.includes(params.row.name)
                  ? isWide
                    ? t("mcp.server_table.starting")
                    : ""
                  : t("mcp.server_table.start")}
              </Button>
            )}
            <Button
              size="small"
              variant="contained"
              className="mcp-table-status-btn"
              disabled={
                !isChatReady || runningMcpAgents.includes(params.row.name)
              }
              sx={{ marginLeft: 1 }}
              onClick={() => handleDetailsClick(params.row.id)}
            >
              {t("mcp.server_table.edit")}
            </Button>
            <Button
              size="small"
              variant="contained"
              className="mcp-table-status-btn status-btn-remove"
              disabled={
                !isChatReady || runningMcpAgents.includes(params.row.name)
              }
              sx={{ marginLeft: 1 }}
              onClick={() => handleRemoveMcpAgent(params.row.id)}
            >
              {t("mcp.agent_table.remove")}
            </Button>
          </>
        );
      },
    },
  ];

  return (
    <Box sx={{ width: "100%", height: "100%" }}>
      <Paper sx={{ height: "100%", width: "100%", overflow: "auto" }}>
        <DataGrid
          rows={mcpAgents}
          columns={commandColumns}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          pageSizeOptions={[5, 10, 25, 50]}
          onRowDoubleClick={(params) => handleDetailsClick(params.row.id)}
          disableRowSelectionOnClick
          sx={{ height: "95%" }}
        />
      </Paper>
    </Box>
  );
}
