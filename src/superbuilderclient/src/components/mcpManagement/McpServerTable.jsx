import React, { useContext, useEffect, useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Paper, Box, Button } from "@mui/material";
import { useTranslation } from "react-i18next";

import "./McpServerTable.css";
import useMcpStore from "../../stores/McpStore";
import { ChatContext } from "../context/ChatContext";

export default function McpServerTable() {
  const { t } = useTranslation();
  const mcpServers = useMcpStore((state) => state.mcpServers);
  const selectedMcpServer = useMcpStore((state) => state.selectedMcpServer);
  const runningMcpServers = useMcpStore((state) => state.runningMcpServers);
  const loadingMcpServers = useMcpStore((state) => state.loadingMcpServers);
  const { isChatReady, setIsChatReady } = useContext(ChatContext);
  const [rowSelectionModel, setRowSelectionModel] = useState({
    type: "include",
    ids: new Set(),
  });

  useEffect(() => {
    // Initialize row selection model with empty set
    if (selectedMcpServer.length == 0) {
      setRowSelectionModel({ type: "include", ids: new Set() });
    }
  }, [selectedMcpServer]);

  const handleSelectionChange = (selectionModel) => {
    console.debug("Selection Model:", selectionModel);
    setRowSelectionModel(selectionModel);

    let selectedIds;

    // Handle different selection model formats
    if (selectionModel.type === "exclude") {
      // When "select all" is used, we get {type: 'exclude', ids: Set()}
      // This means select all rows except those in the ids Set
      selectedIds = mcpServers
        .filter((server) => !selectionModel.ids.has(server.id))
        .map((server) => server.id);
    } else {
      // Normal selection - {type: 'include', ids: Set()}
      selectedIds = Array.from(selectionModel.ids);
    }

    console.debug("Selected MCP Server IDs:", selectedIds);
    useMcpStore.getState().setSelectedMcpServerId(selectedIds);

    const selectedServers = mcpServers.filter((server) =>
      selectedIds.includes(server.id)
    );
    console.debug("Selected MCP Servers:", selectedServers);
    useMcpStore.getState().setSelectedMcpServer(selectedServers);
  };

  const handleDetailsClick = (id) => {
    const selectedServer = mcpServers.find((server) => server.id === id);
    console.log("Selected MCP Server for details:", selectedServer);
    useMcpStore
      .getState()
      .openMcpInput("Update", selectedServer.url === "" ? "command" : "url");
    useMcpStore.getState().setMcpInput({
      mcpServerId: selectedServer.id,
      mcpServerName: selectedServer.server_name || "",
      mcpServerUrl: selectedServer.url || "",
      mcpServerEnv: selectedServer.env || "",
      mcpServerCommand: selectedServer.command || "",
      mcpServerCommandArgs: selectedServer.args || "",
      mcpServerDisabled: selectedServer.disabled || false,
    });
    if (runningMcpServers.includes(selectedServer.server_name)) {
      useMcpStore.getState().getMcpServerTools(selectedServer.server_name);
    }
  };

  const handleStartMcpServer = async (name) => {
    setIsChatReady(false);
    await useMcpStore.getState().startMcpServers(name);
    setIsChatReady(true);
  };

  const handleStopMcpServer = async (name) => {
    setIsChatReady(false);
    await useMcpStore.getState().stopMcpServers(name);
    setIsChatReady(true);
  };

  const commandColumns = [
    {
      field: "server_name",
      headerName: t("mcp.server_table.name"),
      flex: 0.5,
    },
    {
      field: "command",
      headerName: t("mcp.server_table.command"),
      flex: 0.6,
    },
    {
      field: "args",
      headerName: t("mcp.server_table.command_args"),
      flex: 1,
    },
    { field: "url", headerName: t("mcp.server_table.url"), flex: 1 },
    { field: "env", headerName: t("mcp.server_table.env"), flex: 0.7 },
    {
      field: "actions",
      headerName: t("mcp.server_table.actions"),
      flex: 1,
      minWidth: 175,
      sortable: false,
      filterable: false,
      renderCell: (params) => {
        const isWide = window.innerWidth > 1330;
        const loadingPosition = isWide ? "end" : "center";
        return (
          <>
            {/* {runningMcpServers.includes(params.row.server_name) ? (
              <Button
                size="small"
                variant="contained"
                disabled={!isChatReady}
                loading={loadingMcpServers === params.row.server_name}
                loadingPosition={loadingPosition}
                className={"mcp-table-status-btn status-btn-stop"}
                onClick={() => handleStopMcpServer(params.row.server_name)}
              >
                {loadingMcpServers === params.row.server_name
                  ? isWide
                    ? t("mcp.server_table.stopping")
                    : ""
                  : t("mcp.server_table.stop")}
              </Button>
            ) : (
              <Button
                variant="contained"
                disabled={!isChatReady}
                loading={loadingMcpServers === params.row.server_name}
                loadingPosition={loadingPosition}
                size="small"
                className={"mcp-table-status-btn status-btn-start"}
                onClick={() => handleStartMcpServer(params.row.server_name)}
              >
                {loadingMcpServers === params.row.server_name
                  ? isWide
                    ? t("mcp.server_table.starting")
                    : ""
                  : t("mcp.server_table.start")}
              </Button>
            )} */}

            <Button
              size="small"
              variant="contained"
              className="mcp-table-status-btn"
              disabled={
                !isChatReady ||
                loadingMcpServers.includes(params.row.server_name) ||
                runningMcpServers.includes(params.row.server_name)
              }
              sx={{ marginLeft: 1 }}
              onClick={() => handleDetailsClick(params.row.id)}
            >
              {t("mcp.server_table.edit")}
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
          rows={mcpServers}
          columns={commandColumns}
          initialState={{
            pagination: {
              paginationModel: { pageSize: 10 },
            },
          }}
          pageSizeOptions={[5, 10, 25, 50]}
          onRowDoubleClick={(params) => handleDetailsClick(params.row.id)}
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={rowSelectionModel}
          onRowSelectionModelChange={(newRowSelectionModel) => {
            handleSelectionChange(newRowSelectionModel);
          }}
          sx={{ height: "95%" }}
        />
      </Paper>
    </Box>
  );
}
