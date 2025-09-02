import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import useAppStore from "./AppStore";

const useMcpStore = create((set, get) => ({
  mcpManagementOpen: false,
  openMcpManagement: () => set({ mcpManagementOpen: true }),
  closeMcpManagement: () => set({ mcpManagementOpen: false }),

  // Add a refresh trigger
  refreshTrigger: 0,
  triggerRefresh: () =>
    set((state) => ({ refreshTrigger: state.refreshTrigger + 1 })),

  // MCP Server Management
  mcpInputOpen: false,
  mcpInputType: "",
  mcpInputSource: "",
  mcpInput: {},
  openMcpInput: (type, source) =>
    set({ mcpInputOpen: true, mcpInputType: type, mcpInputSource: source }),
  closeMcpInput: () =>
    set({
      mcpInputOpen: false,
      mcpInputType: "",
      mcpInputSource: "url",
      mcpServerTools: [],
    }),
  setMcpInput: (input) =>
    set({
      mcpInput: input,
    }),

  setMcpInputSource: (source) =>
    set({
      mcpInputSource: source,
    }),

  mcpServers: [],
  getMcpServer: async () => {
    try {
      const response = await invoke("get_mcp_servers");
      const parsedJSONResult = JSON.parse(response);
      console.log("Parsed MCP Server JSON Result:", parsedJSONResult);
      set({ mcpServers: parsedJSONResult });
    } catch (error) {
      console.error("Failed to fetch MCP Servers:", error);
    }
  },

  addMcpServer: async () => {
    try {
      const server = get().mcpInput;
      console.debug("Adding MCP Server:", server);
      const response = await invoke("add_mcp_server", {
        serverName: server.mcpServerName.trim(),
        url: server.mcpServerUrl.trim(),
        env: server.mcpServerEnv,
        command: server.mcpServerCommand,
        args: server.mcpServerCommandArgs,
        disabled: server.mcpServerDisabled,
      });
      console.log(response);
      if (response.success) {
        console.log("MCP Server added successfully:", server.mcpServerName);
        get().getMcpServer(); // Refresh the list after adding
      } else {
        console.error("Failed to add MCP Server:", response.message);
        useAppStore
          .getState()
          .showNotification(
            `Failed to add MCP Server "${server.mcpServerName}": ${response.message}`,
            "error"
          );
        return false;
      }
      return true;
    } catch (error) {
      console.error("Failed to add MCP Server:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to add MCP Server "${server.mcpServerName}": ${error}`,
          "error"
        );
      return false;
    }
  },

  updateMcpServer: async () => {
    try {
      const server = get().mcpInput;
      console.debug("Updating MCP Server:", server);
      const response = await invoke("edit_mcp_server", {
        id: server.mcpServerId,
        serverName: server.mcpServerName.trim(),
        url: server.mcpServerUrl.trim(),
        env: server.mcpServerEnv,
        command: server.mcpServerCommand,
        args: server.mcpServerCommandArgs,
        disabled: server.mcpServerDisabled,
      });
      console.log(response);

      if (response.success) {
        console.log("MCP Server updated successfully:", server.mcpServerName);
        get().getMcpServer(); // Refresh the list after adding
      } else {
        console.error("Failed to update MCP Server:", response.message);
        useAppStore
          .getState()
          .showNotification(
            `Failed to update MCP Server "${server.mcpServerName}": ${response.message}`,
            "error"
          );
        return false;
      }
      return true;
    } catch (error) {
      console.error("Failed to update MCP Server:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to update MCP Server "${server.mcpServerName}": ${error}`,
          "error"
        );
      return false;
    }
  },

  removeMcpServer: async () => {
    try {
      const selectedServers = get().selectedMcpServer;
      for (const server of selectedServers) {
        console.debug("Removing MCP Server:", server.server_name);
        const response = await invoke("remove_mcp_server", {
          serverName: server.server_name,
        });
        get().getMcpServer();
        if (response === "MCP server removed successfully.") {
          console.log("MCP Server removed successfully:", server.server_name);
          // get().getMcpServer(); // Refresh the list after removal
        }
      }
      // Clear the selected servers after successful removal
      set({ selectedMcpServer: [] });
      return true;
    } catch (error) {
      console.error("Failed to remove MCP servers:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to remove MCP Server "${server.server_name}": ${error}`,
          "error"
        );
      return false;
    }
  },

  loadingMcpServers: [],
  startMcpServers: async (name) => {
    try {
      console.debug("Starting MCP Servers...", name);
      set({ loadingMcpServers: [name] });
      const response = await invoke("start_mcp_server", {
        serverName: name,
      });
      if (response === "MCP server loaded successfully.") {
        console.log("MCP Servers loaded successfully.");
        useMcpStore.getState().getActiveMcpServers();
      }
    } catch (error) {
      console.error("Failed to load MCP Servers:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to start MCP Server "${name}": ${error}`,
          "error"
        );
    } finally {
      set({ loadingMcpServers: [] });
    }
  },

  stopMcpServers: async (name) => {
    try {
      console.debug("Stopping MCP Servers...", name);
      set({ loadingMcpServers: [name] });
      const response = await invoke("stop_mcp_server", {
        serverName: name,
      });
      console.log("Stop MCP Servers Response:", response);
      if (response === `MCP Server(${name}) Stopped`) {
        console.log("MCP Servers stopped successfully.");
        useMcpStore.getState().getActiveMcpServers();
      }
    } catch (error) {
      console.error("Failed to stop MCP Servers:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to stop MCP Server "${name}": ${error}`,
          "error"
        );
    } finally {
      set({ loadingMcpServers: [] });
    }
  },

  mcpServerTools: [],
  fetchingMcpServerTools: false,
  resetMcpServerTools: () => set({ mcpServerTools: [] }),
  getMcpServerTools: async (server_name) => {
    try {
      set({ fetchingMcpServerTools: true });
      console.debug("Fetching MCP Server Tools...");
      const response = await invoke("get_mcp_server_tools", {
        serverName: server_name,
      });
      const parsedJSONResult = JSON.parse(response);
      console.log(server_name, "Tools:", parsedJSONResult);
      set({ mcpServerTools: parsedJSONResult });
    } catch (error) {
      console.log("Failed to fetch MCP Server Tools:", error);
      // Handle GRPC style error messages
      const errorMessage = error.toString().includes("Status(StatusCode=")
        ? error.split('Detail="')[1].split('"')[0]
        : error.message || "Failed to fetch MCP Server Tools";
      set({
        mcpServerTools: [
          {
            name: "Error",
            description: errorMessage,
            type: "error",
          },
        ],
      });
    } finally {
      set({ fetchingMcpServerTools: false });
    }
  },

  selectedMcpServerId: [],
  setSelectedMcpServerId: (selected) => set({ selectedMcpServerId: selected }),

  selectedMcpServer: [],
  setSelectedMcpServer: (selected) => set({ selectedMcpServer: selected }),

  runningMcpServers: [],
  getActiveMcpServers: async () => {
    try {
      console.debug("Fetching active MCP Servers...");
      const response = await invoke("get_active_mcp_servers");
      const parsedJSONResult = JSON.parse(response);
      console.log("Active MCP Servers:", parsedJSONResult);
      set({ runningMcpServers: parsedJSONResult });
    } catch (error) {
      console.error("Failed to fetch active MCP Servers:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to fetch active MCP Servers: ${error}`,
          "error"
        );
    }
  },

  // MCP Agent Management
  mcpAgentInputOpen: false,
  mcpAgentInput: {},
  mcpAgentInputType: "",
  openMcpAgentInput: (type) =>
    set({
      mcpAgentInputOpen: true,
      mcpAgentInputType: type,
    }),
  closeMcpAgentInput: () =>
    set({
      mcpAgentInputOpen: false,
      mcpAgentInputType: "",
    }),
  setMcpAgentInput: (input) =>
    set({
      mcpAgentInput: input,
    }),

  selectedMcpAgent: [],
  setSelectedMcpAgent: (selected) => set({ selectedMcpAgent: selected }),

  mcpAgents: [],
  getMcpAgent: async () => {
    try {
      const response = await invoke("get_mcp_agents");
      const parsedJSONResult = JSON.parse(response);
      console.log("Parsed MCP Agents JSON Result:", parsedJSONResult);
      set({ mcpAgents: parsedJSONResult });
    } catch (error) {
      console.error("Failed to fetch MCP Servers:", error);
    }
  },

  addMcpAgent: async () => {
    try {
      const agentInput = get().mcpAgentInput;
      console.log("Adding MCP Agent Input:", agentInput);
      console.debug("Adding MCP Agent:", agentInput);

      const response = await invoke("add_mcp_agent", {
        agentName: agentInput.agentName.trim(),
        agentDesc: agentInput.description,
        agentMessage: agentInput.systemMessage,
        serverIds: agentInput.mcpServerIds || [],
      });

      console.log("Add MCP Agent Response:", response);
      if (response.success) {
        console.log("MCP Agent added successfully:", agentInput.agentName);
        get().getMcpAgent(); // Refresh the list after adding
        return true;
      } else {
        console.error("Failed to add MCP Agent:", response.message);
        useAppStore
          .getState()
          .showNotification(
            `Failed to add MCP Agent "${agentInput.agentName}": ${response.message}`,
            "error"
          );
        return false;
      }
    } catch (error) {
      console.error("Failed to add MCP Agent:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to add MCP Agent "${agentInput.agentName}": ${error}`,
          "error"
        );
      return false;
    }
  },

  updateMcpAgent: async () => {
    try {
      const agentInput = get().mcpAgentInput;
      console.debug("Updating MCP Agent:", agentInput);

      const response = await invoke("edit_mcp_agent", {
        agentId: agentInput.id,
        agentName: agentInput.agentName,
        agentDesc: agentInput.description,
        agentMessage: agentInput.systemMessage,
        serverIds: agentInput.mcpServerIds || [],
      });

      console.log("Update MCP Agent Response:", response);
      if (response) {
        console.log("MCP Agent updated successfully:", agentInput.agentName);
        get().getMcpAgent(); // Refresh the list after updating
        return true;
      } else {
        console.error("Failed to update MCP Agent");
        useAppStore
          .getState()
          .showNotification(
            `Failed to update MCP Agent "${agentInput.agentName}": ${response.message}`,
            "error"
          );
        return false;
      }
    } catch (error) {
      console.error("Failed to update MCP Agent:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to update MCP Agent "${agentInput.agentName}": ${error}`,
          "error"
        );
      return false;
    }
  },

  removeMcpAgent: async () => {
    try {
      const selectedAgents = get().selectedMcpAgent;
      for (const agent of selectedAgents) {
        console.debug("Removing MCP Agent:", agent.name);

        const response = await invoke("remove_mcp_agent", {
          agentName: agent.name,
        });

        console.log("Remove MCP Agent Response:", response);
        if (response) {
          console.log("MCP Agent removed successfully:", agent.name);
        } else {
          console.error("Failed to remove MCP Agent:", agent.name);
          useAppStore
            .getState()
            .showNotification(
              `Failed to remove MCP Agent "${agent.name}": ${response.message}`,
              "error"
            );
        }
      }
      get().getMcpAgent(); // Refresh the list after removal
      return true;
    } catch (error) {
      console.error("Failed to remove MCP agents:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to remove MCP Agent "${agent.name}": ${error}`,
          "error"
        );
      return false;
    }
  },

  // Remove MCP Server / Agent Modal
  mcpRemoveModalOpen: false,
  setMcpRemoveModalOpen: (open) => set({ mcpRemoveModalOpen: open }),
  mcpRemoveType: "",
  setMcpRemoveType: (type) => set({ mcpRemoveType: type }),

  loadingMcpAgents: [],
  startMcpAgent: async (name) => {
    try {
      console.debug("Starting MCP Agent...", name);

      // Get server_ids from mcpAgents by name
      const mcpAgents = get().mcpAgents;
      const agent = mcpAgents.find((agent) => agent.name === name);
      const serverIds = agent ? agent.server_ids : [];
      // Get server names from serverIds using mcpServers
      const mcpServers = get().mcpServers;
      const serverNames = serverIds
        .map((serverId) => {
          const server = mcpServers.find((server) => server.id === serverId);
          return server ? server.server_name : null;
        })
        .filter((name) => name !== null);

      set({ loadingMcpAgents: [name], loadingMcpServers: serverNames });
      const response = await invoke("start_mcp_agent", {
        agentName: name,
      });

      console.log("Start MCP Agent Response:", response);
      if (response) {
        console.log("MCP Agent started successfully:", name);
        get().getActiveMcpAgents();
        get().getActiveMcpServers();
      }
    } catch (error) {
      console.error("Failed to start MCP Agent:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to start MCP Agent "${name}": ${error}`,
          "error"
        );
    } finally {
      set({ loadingMcpAgents: [], loadingMcpServers: [] });
    }
  },

  stopMcpAgent: async (name) => {
    try {
      console.debug("Stopping MCP Agent...", name);
      set({ loadingMcpAgents: [name] });
      const response = await invoke("stop_mcp_agent", {
        agentName: name,
      });

      console.log("Stop MCP Agent Response:", response);
      if (response) {
        console.log("MCP Agent stopped successfully:", name);

        get().getActiveMcpAgents();
        get().getActiveMcpServers();
      }
    } catch (error) {
      console.error("Failed to stop MCP Agent:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to stop MCP Agent "${name}": ${error}`,
          "error"
        );
    } finally {
      set({ loadingMcpAgents: [] });
    }
  },

  runningMcpAgents: [],

  getActiveMcpAgents: async () => {
    try {
      const response = await invoke("get_active_mcp_agents");
      const parsedJSONResult = JSON.parse(response);
      console.log("Active MCP Agent:", parsedJSONResult);
      set({ runningMcpAgents: parsedJSONResult });
    } catch (error) {
      console.error("Failed to fetch active MCP Servers:", error);
      useAppStore
        .getState()
        .showNotification(
          `Failed to fetch active MCP Agents: ${error}`,
          "error"
        );
    }
  },
}));

export default useMcpStore;
