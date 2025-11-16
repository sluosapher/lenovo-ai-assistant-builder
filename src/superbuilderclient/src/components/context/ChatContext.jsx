import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useState, createContext, useEffect, useContext, useRef, React } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { RagReadyContext } from "./RagReadyContext";
import { produce } from "immer";
import useDataStore from "../../stores/DataStore";
import { useTranslation } from 'react-i18next';
import { WorkflowContext } from "./WorkflowContext";
import { AppStatusContext } from "./AppStatusContext";
export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { ready: ragReady } = useContext(RagReadyContext);
  const {isAppReady : isChatReady, setIsAppReady : setIsChatReady} = useContext(AppStatusContext); // for now chat ready just means app is ready
  const { setWorkflow, buildPromptRequest } = useContext(WorkflowContext);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(0);
  const [sessionSwitched, setSessionSwitched] = useState(false); // notifies other components of session switch even if session doesn't change, value doesn't matter
  const [isWaitingForFirstToken, setWaitingForFirstToken] = useState(false);
  const [isStreamCompleted, setStreamCompleted] = useState(true);
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef([]);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false); // only load chat history on start
  const [modelLoaded, setModelLoaded] = useState(false); // keep track for cold start status
  const [chatHistorySize, setChatHistorySize] = useState(0); // changing will not do anything, controlled by MW config DB
  const { assistant } = useDataStore(); // Access assistant from useDataStore
  const [newChatModelNeeded,setNewChatModelNeeded] = useState(false); //control to allow selecting new model when chat load
  const[isModelSettingsReady,setIsModelSettingsReady] = useState(true);
  const { t } = useTranslation();
  const [useSemanticSplitter, setUseSemanticSplitter] = useState(0); // changing will not do anything, controlled by MW config DB
  const [useAllFiles, setUseAllFiles] = useState(0); // set from config, always selects all files to be active whenever possible
  const selectedSessionRef = useRef(0);

  // keep refs in sync with latest state
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { selectedSessionRef.current = selectedSession; }, [selectedSession]);

  // Extract chatHistorySize from assistant.parameters
  useEffect(() => {
    const fetchChatHistorySizeFromParameters = () => {
      try {
        if (!assistant.parameters) {
          return;
        }

        const parameters = JSON.parse(assistant.parameters); // Parse parameters JSON
        const otherCategory = parameters.categories.find(
          (category) => category.name === "other"
        ); // Find the "other" category

        if (otherCategory) {
          const conversationHistoryField = otherCategory.fields.find(
            (field) => field.name === "conversation_history"
          ); // Find the "conversation_history" field

          if (conversationHistoryField && conversationHistoryField.user_value) {
            setChatHistorySize(conversationHistoryField.user_value); // Set chatHistorySize
            console.log(
              "Loaded chatHistorySize from assistant.parameters:",
              conversationHistoryField.user_value
            );
          }

          const useSemanticSplitterField = otherCategory.fields.find(
            (field) => field.name === "use_semantic_splitter"
          ); // Find the "use_semantic_splitter" field

          if (useSemanticSplitterField && useSemanticSplitterField.user_value) {
            setUseSemanticSplitter(useSemanticSplitterField.user_value); // Set UseSemanticSplitter
            console.log(
              "Loaded use_semantic_splitter from assistant.parameters:",
              conversationHistoryField.user_value
            );
          }

          const useAllFilesField = otherCategory.fields.find(
            (field) => field.name === "use_all_files"
          );
          if (useAllFilesField && useAllFilesField.user_value != null) {
            setUseAllFiles(useAllFilesField.user_value);
            console.log(
              "Loaded use_all_files from assistant.parameters:",
              useAllFilesField.user_value
            );
          }
        }
      } catch (error) {
        console.error("Failed to fetch chatHistorySize from parameters:", error);
      }
    };

    fetchChatHistorySizeFromParameters();
  }, [assistant.parameters]); // Run whenever assistant.parameters changes

  const selectSession = (sessionId) => {
    if (!isChatReady) {
      return;
    }

    if (selectedSession === sessionId) {
      setSessionSwitched(!sessionSwitched);
      return;
    }
    const selectedIdx = sessions.findIndex(
      (session) => session.id === selectedSession
    );
    const nextSessionIndex = sessions.findIndex(
      (session) => session.id === sessionId
    );
    const newSessions = produce(sessions, (draft) => {
      draft[selectedIdx].messages = [...messages];
      draft[selectedIdx].selected = false;
      draft[nextSessionIndex].selected = true;
    });
    console.log("newSelectedSessions", newSessions);
    setSessions(newSessions);
    setMessages([...newSessions[nextSessionIndex].messages]);
    setSelectedSession(sessionId);
    if (newSessions[nextSessionIndex].messages.length > 0) {
      const firstMessage = newSessions[nextSessionIndex].messages[0];
      console.log(firstMessage.queryType);
      let queryName = firstMessage.queryType.name || ""; // try and get query name
      setWorkflow(queryName === "" ? "Generic" : queryName); // set workflow to this session's special query type
    }
    setSessionSwitched(!sessionSwitched);
  };

  const setSessionName = async (sessionId, sessionName) => {
    console.log("Setting session ", sessionId, " name to ", sessionName);
    const result = await invoke("set_session_name", {
      sid: sessionId,
      name: sessionName,
    });
    if (result) {
      console.log("Session name saved.");
    } else {
      console.log("Session name unable to be saved.");
    }
  };

  const newSession = () => {
    console.log("Adding new session...");

    if (!isChatReady) {
      console.log("Unable to add new session: chat is not ready.");
      return;
    }

    if (messages.length <= 0) {
      console.log(
        "Unable to add new session: current session is already empty."
      );
      setSessionSwitched(!sessionSwitched);
      return;
    }

    console.log(sessions);
    console.log(selectedSession);
    const selectedIdx = sessions.findIndex(
      (session) => session.id === selectedSession
    );
    const maxId = sessions.reduce(
      (max, obj) => (obj.id > max ? obj.id : max),
      0
    );
    var newSessionId = maxId + 1;
    const newSession = {
      id: newSessionId,
      name: t('chat.new_session'),
      date: new Date(),
      messages: [],
      selected: true,
    };
    setSessions(
      produce(sessions, (draft) => {
        if (selectedIdx >= 0 && selectedIdx < draft.length) {
          draft[selectedIdx].messages = [...messages];
          draft[selectedIdx].selected = false;
          draft.push(newSession);
        } else {
          console.error(`selectedIdx ${selectedIdx} is out of bounds`);
        }
      })
    );
    setMessages([...newSession.messages]);
    setSelectedSession(newSessionId);
    // file-based chat logging removed
    setSessionSwitched(!sessionSwitched);
    console.log("New session added with id of: ", newSessionId);
  };

  const removeSessions = async (sessionId) => {
    console.log("Attempting to remove session: ", sessionId);

    if (!isChatReady) {
      console.log("Unable to remove session: chat is not ready");
      return;
    }

    const sessionIndex = sessions.findIndex(
      (session) => session.id === sessionId
    );
    console.log("sessionIndex", sessionIndex);

    if (sessionIndex === -1) {
      console.log("Unable to remove session: session was not found");
      return;
    }

    var currentSession = sessions[sessionIndex];
    console.log("Session to remove: ", currentSession);
    var isEmptySession =
      currentSession.name === "<New Session>" &&
      currentSession.messages.length <= 0;

    if (!isEmptySession) {
      var removeSuccess = false;
      try {
        removeSuccess = await invoke("remove_session", { sid: sessionId });
        console.log("Database removal: ", removeSuccess);
      } catch (error) {
        console.error("Error while removing session: ", error);
      }

      if (!removeSuccess) {
        console.error(
          "Session was unable to be removed due to middleware error, exiting."
        );
        return;
      }
    } else {
      console.log(
        "This session is empty, removing without accessing database..."
      );
    }

    const updatedSessions = sessions.filter(
      (session) => session.id !== sessionId
    );

    if (selectedSession === sessionId) {
      const nextIndex = sessionIndex === 0 ? 0 : sessionIndex - 1;
      setMessages([...updatedSessions[nextIndex].messages]);
      setSelectedSession(updatedSessions[nextIndex].id);
      updatedSessions[nextIndex] = {
        ...updatedSessions[nextIndex],
        selected: true,
      };
    }
    setSessions(updatedSessions);
    console.log("Removed session: ", sessionId);
  };

  useEffect(() => {
    const bool =
      ragReady &&
      isStreamCompleted &&
      !newChatModelNeeded &&
      isModelSettingsReady;
    console.log(
      "isChatReady changed",
      bool,
      ragReady,
      isStreamCompleted,
      !newChatModelNeeded,
      isModelSettingsReady
    );
    //Set chat ready if all flags are returning true.
    setIsChatReady(
      ragReady &&
        isStreamCompleted &&
        !newChatModelNeeded &&
        isModelSettingsReady
    );
  }, [ragReady, isStreamCompleted, newChatModelNeeded, isModelSettingsReady]);

  useEffect(() => {
    let isSubscribed = true;
    const unlistenFirstword = listen("first_word", (_event) => {
      if (!isSubscribed) {
        return;
      }

      setWaitingForFirstToken(false);
      setModelLoaded(true); // model is now loaded
    });

    return () => {
      isSubscribed = false;
      unlistenFirstword.then((f) => f());
    };
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    let unlistenData;
    const setupDataListener = async () => {
      unlistenData = await listen("new_message", (event) => {
        if (!isSubscribed) {
          return;
        }
        let chatResponse = JSON.parse(event.payload);
        // console.log(chatResponse);
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages];
          const lastIndex = updatedMessages.length - 1;
          if (lastIndex >= 0) {
            updatedMessages[lastIndex] = {
              ...updatedMessages[lastIndex],
              text: updatedMessages[lastIndex].text + chatResponse.message,
              references: chatResponse.references,
            };
          }
          return updatedMessages;
        });
      });
    };
    setupDataListener();

    let unlistenCompleted;
    const setupCompletedListener = async () => {
      unlistenCompleted = await listen("stream-completed", () => {
        if (!isSubscribed) {
          return;
        }
        setStreamCompleted(true);
      });
    };
    setupCompletedListener();

    return () => {
      isSubscribed = false;
      if (unlistenData) unlistenData();
      if (unlistenCompleted) unlistenCompleted();
    };
  }, []);

  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        setSessions([]);
        console.log("Getting chat session history from DB...");
        const chatHistoryResponse = await invoke("get_chat_history", {});
        const chatHistory = JSON.parse(chatHistoryResponse);
        console.log(chatHistory);

        var maxSessionId = -1;
        console.log(
          "Adding " + chatHistory.length + " chat sessions to session list..."
        );
        for (let i = 0; i < chatHistory.length; i++) {
          var session = chatHistory[i];
          const sessionId = session.sid;
          //console.log("Session ", sessionId, ": " + session.name);

          var newMessages = [];
          for (let j = 0; j < session.messages.length; j++) {
            var m = session.messages[j];
            let queryData;
            try {
              queryData = JSON.parse(m.query_type); // attempt to parse as JSON
            } catch (e) {
              queryData = {name: m.query_type}; // fallback to string value
            }
            var newMessage = {
              id: m.timestamp,
              text: m.text,
              sender: m.sender,
              queryType: queryData,
              references: m.references ? m.references : [], // set references if they exist, otherwise empty list
              attachedFiles: JSON.parse(m.attached_files), // set attached files if they exist
            };
            newMessages.push(newMessage);
          }

          const creationDate = new Date(session.date);
          const newSession = {
            id: sessionId,
            name: session.name,
            date: creationDate,
            messages: newMessages,
            selected: false,
          };
          setSessions((prevSession) => [...prevSession, newSession]);

          if (sessionId > maxSessionId) {
            maxSessionId = sessionId;
          }
        }

        const newSessionId = maxSessionId + 1;
        console.log("Opening new session: ", newSessionId);
        const newSession = {
          id: newSessionId,
          name: t('chat.new_session'),
          date: new Date(),
          messages: [],
          selected: true,
        };
        setSessions((prevSession) => [...prevSession, newSession]);
        setSelectedSession(newSessionId);
        // file-based chat logging removed
        setMessages([]);
      } catch (error) {
        console.error("Error while loading chat history: ", error);
      }
    };

    // only get and load history if not loaded before and client is ready
    if (ragReady && !isHistoryLoaded) {
      fetchChatHistory();
      setIsHistoryLoaded(true);
    }
  }, [ragReady]);

  const getChatMessages = (messageSlice, messageSliceSize) => {
    if (messageSliceSize <= 0 || messageSlice.length <= 0) {
      return [];
    }
    // Work through chat history backwards to select first messageSliceSsize messages
    let messageHistory = [];
    for (let i = messageSlice.length - 1; i >= 0; i--) {
      let currentMessage = messageSlice[i];
      // append message and return if at message size limit
      messageHistory.push(currentMessage);
      if (messageHistory.length >= messageSliceSize) {
        break;
      }
    }
    return messageHistory.reverse(); // reverse to be in correct order for backend
  };

  const sendMessage = async (input, resubmitIndex = -1, selectedFiles=[], queryType={name: "Generic"}) => {
    let previousMessages = messages;

    // If resubmitting, only use chat messages before resubmission as chat history
    if (resubmitIndex !== -1) {
      previousMessages = previousMessages.slice(0, resubmitIndex);
    }

    // get double chatHistorySize to account for q&a pairs
    previousMessages = getChatMessages(previousMessages, chatHistorySize * 2);
    // console.warn("previous", messages);

    // format messages properly for API
    const sessionNote = "\n\nThe current session Id: " + String(selectedSession);
    let contextHistory = [];
    previousMessages.forEach((message) => {
      if (message.text != "") {
        const content = message.sender === "user" ? (message.text + sessionNote) : message.text;
        contextHistory.push({ Role: message.sender, Content: content });
      }
    });

    const newMessage = {
      id: new Date().getTime(),
      text: input,
      sender: "user",
      queryType: queryType,
      attachedFiles: selectedFiles,
    };

    const responseMessage = {
      id: new Date().getTime() + 1,
      text: "",
      sender: "assistant",
      queryType: queryType,
      attachedFiles: selectedFiles,
    };

    if (messages.length <= 2) {
      setSessions(
        produce(sessions, (draft) => {
          const selectedIdx = draft.findIndex(
            (session) => session.id === selectedSession
          );
          draft[selectedIdx].name = input;
        })
      );
    }

    const promptOptions = buildPromptRequest(queryType);

    setMessages([...messages, newMessage, responseMessage]);
    setWaitingForFirstToken(true);
    setStreamCompleted(false);
    try {
      console.log(
        "Sending prompt: ",
        input,
        "\nChat History: ",
        contextHistory,
        "\nSession ID: ",
        selectedSession.toString(),
        "\nAttached Files: ",
        selectedFiles.toString(),
        "\nPrompt Options: ",
        promptOptions,
      );
      const promptForLLM = input + sessionNote;
      await invoke("call_chat", {
        name: "UI",
        prompt: promptForLLM,
        conversationHistory: contextHistory,
        sid: selectedSession,
        files: JSON.stringify(selectedFiles),
        promptOptions: promptOptions,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setWaitingForFirstToken(false);
      setStreamCompleted(true);
    }
  };

  const stopChatGeneration = async () => {
    console.log("Stopping chat stream early...");
    await invoke("stop_chat");
    setStreamCompleted(true);
  };

  const getFileName = (filepath, lengthLimit = 0) => {
    let filepathSplit = filepath.split("\\");
    let fileName = filepathSplit[filepathSplit.length - 1];
    if (fileName.length <= lengthLimit) {
      return fileName;
    }
    return fileName.substring(0, lengthLimit) + "...";
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        sendMessage,
        stopChatGeneration,
        isStreamCompleted,
        isWaitingForFirstToken,
        isChatReady,
        setIsChatReady,
        sessions,
        newSession,
        removeSessions,
        selectSession,
        modelLoaded,
        setModelLoaded,
        chatHistorySize,
        setChatHistorySize,
        setUseSemanticSplitter,
        setSessionName,
        getFileName,
        newChatModelNeeded,
        setNewChatModelNeeded,
        setIsModelSettingsReady,
        sessionSwitched,
        useAllFiles,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
