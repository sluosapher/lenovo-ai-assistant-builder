import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useState, createContext, useEffect, useContext, React } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { RagReadyContext } from "./RagReadyContext";
import { produce } from "immer";
import { FileManagementContext } from "./FileManagementContext";
import Chip from "@mui/material/Chip";
import GeneralFileQueryIcon from "@mui/icons-material/TopicTwoTone";
import ImageQueryIcon from "@mui/icons-material/PhotoCameraTwoTone";
import ImageGenerationIcon from "@mui/icons-material/PhotoTwoTone";
import SummarizeQueryIcon from "@mui/icons-material/SummarizeTwoTone";
import TableQueryIcon from "@mui/icons-material/TableChartTwoTone";
import ResumeQueryIcon from "@mui/icons-material/ArticleTwoTone";
import ClearQueryIcon from "@mui/icons-material/Clear";
import Tooltip, { tooltipClasses } from "@mui/material/Tooltip";
import { styled } from "@mui/material/styles";
import Zoom from "@mui/material/Zoom";
import { Switch } from "@mui/material";
import useDataStore from "../../stores/DataStore";
import { useTranslation } from 'react-i18next';
export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const { ready: ragReady } = useContext(RagReadyContext);
  const { updateTable } = useContext(FileManagementContext);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(0);
  const [isWaitingForFirstToken, setWaitingForFirstToken] = useState(false);
  const [isStreamCompleted, setStreamCompleted] = useState(true);
  const [messages, setMessages] = useState([]);
  const [isChatReady, setIsChatReady] = useState(false);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false); // only load chat history on start
  const [modelLoaded, setModelLoaded] = useState(false); // keep track for cold start status
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [attachedFileNames, setAttachedFileNames] = useState([]);
  const [attachedFileQueryType, setAttachedFileQueryType] = useState("");
  const validImageQueryExtensions = ["jpg", "jpeg", "png"];
  const validTableQueryExtensions = ["xlsx", "csv"];
  const validSummarizeQueryExtensions = ["pdf", "docx", "txt"];
  const validResumeQueryExtensions = ["pdf", "docx", "txt"];
  const validGeneralQueryExtensions = [
    "pdf",
    "docx",
    "txt",
    "md",
    "pptx",
    "xlsx",
    "csv",
  ];
  const [chatHistorySize, setChatHistorySize] = useState(0); // changing will not do anything, controlled by MW config DB
  const { assistant, enableAllFeature, setEnableAllFeature } = useDataStore(); // Access assistant from useDataStore
  const [newChatModelNeeded,setNewChatModelNeeded] = useState(false); //control to allow selecting new model when chat load 
  const[isModelSettingsReady,setIsModelSettingsReady] = useState(true);
  const { t } = useTranslation();
  const [fileLengthError, setFileLengthError] = useState(""); //
  const [useSemanticSplitter, setUseSemanticSplitter] = useState(0); // changing will not do anything, controlled by MW config DB
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

    const newMessages = newSessions[nextSessionIndex].messages;
    if (newMessages.length > 0) {
      const lastMessage = newMessages[newMessages.length - 1];
      const lastNonEmptyAttachedFilesMessage = newMessages
        .slice()
        .reverse()
        .find(
          (message) => message.attachedFiles && message.attachedFiles.length > 0
        );

      if (lastNonEmptyAttachedFilesMessage) {
        setAttachedFiles(lastNonEmptyAttachedFilesMessage.attachedFiles);
        setAttachedFileNames(
          getAttachedFileNames(lastNonEmptyAttachedFilesMessage.attachedFiles)
        );
      } else {
        setAttachedFiles([]);
        setAttachedFileNames([]);
      }
      setAttachedFileQueryType(lastMessage.queryType);
    } else {
      setAttachedFiles([]);
      setAttachedFileQueryType("");
    }
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

    // new session starts with no specific query on temporary files
    setAttachedFileQueryType("");
    setAttachedFiles([]);

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
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages];
          const lastIndex = updatedMessages.length - 1;
          if (lastIndex >= 0) {
            updatedMessages[lastIndex] = {
              ...updatedMessages[lastIndex],
              text: updatedMessages[lastIndex].text + event.payload,
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
            var newMessage = {
              id: m.timestamp,
              text: m.text,
              sender: m.sender,
              attachedFiles: JSON.parse(m.attached_files), // for now parse all file lists..
              queryType: m.query_type,
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

      // When there is a query type, only add chat history up to ChatHistorySize with the same attachements
      if (
        attachedFileQueryType !== "" &&
        (attachedFiles !== currentMessage.attachedFiles ||
          attachedFileQueryType !== currentMessage.queryType)
      ) {
        console.log(
          attachedFiles + " is not same as " + currentMessage.attachedFiles
        );
        break; // exit since no longer same attachments in message chain
      }

      // append message and return if at message size limit
      messageHistory.push(currentMessage);
      if (messageHistory.length >= messageSliceSize) {
        break;
      }
    }
    return messageHistory.reverse(); // reverse to be in correct order for backend
  };

  const findLastUserMessage = (messages) => {
    var lastUserMessageIndex = null;
    var result = {};

    for (let i = 0; i < messages.length; i++) {
      if (messages[i].sender === "user") {
        lastUserMessageIndex = i;
      }
    }
    if (lastUserMessageIndex != null) {
      result = messages[lastUserMessageIndex];
    }
    return result;
  };

  const sendMessage = async (input, resubmitIndex = -1) => {
    let previousMessages = messages;

    // If resubmitting, only use chat messages before resubmission as chat history
    if (resubmitIndex !== -1) {
      previousMessages = previousMessages.slice(0, resubmitIndex);
    }

    // get double chatHistorySize to account for q&a pairs
    previousMessages = getChatMessages(previousMessages, chatHistorySize * 2);
    console.warn("previous", messages);

    // format messages properly for API
    let contextHistory = [];
    previousMessages.forEach((message) => {
      if (message.text != "") {
        contextHistory.push({ Role: message.sender, Content: message.text });
      }
    });

    if (Array.isArray(input)) {
      input = input.join("");
    }

    // use the resubmission question's query type and attached files if it exists
    let currentAttachedFiles = attachedFiles;
    let currentQueryType = attachedFileQueryType;
    if (resubmitIndex != -1) {
      let resubmitMessage = messages[resubmitIndex];
      currentAttachedFiles = resubmitMessage.attachedFiles;
      currentQueryType = resubmitMessage.queryType;

      // update future messages to use resubmission attachments and query type
      setAttachedFiles(currentAttachedFiles);
      setAttachedFileQueryType(currentQueryType);
      setAttachedFileNames(getAttachedFileNames(currentAttachedFiles));
    }

    console.log("Input:", input);
    const newMessage = {
      id: new Date().getTime(),
      text: input,
      sender: "user",
      queryType: currentQueryType, // type of query to perform on attached files (empty if none)
      attachedFiles: currentAttachedFiles, // set attached files specific to this query
    };

    // if previous user message and new message has the same query type
    // we want to assume the user is asking a follow up question
    // so we want to attach the same files to the new message
    var last_message = findLastUserMessage(messages);
    if (
      last_message.queryType === currentQueryType &&
      newMessage.attachedFiles.length == 0
    ) {
      newMessage.attachedFiles = last_message.attachedFiles;
      console.log(`reattach file to new message : ${newMessage.attachedFiles}`);
    }

    const responseMessage = {
      id: new Date().getTime() + 1,
      text: "",
      sender: "assistant",
      queryType: currentQueryType,
      attachedFiles: currentAttachedFiles, // set attached files specific to this query
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
        selectedSession.toString()
      );
      await invoke("call_chat", {
        name: "UI",
        prompt: input,
        conversationHistory: contextHistory,
        sid: selectedSession,
        query: currentQueryType,
        files: JSON.stringify(currentAttachedFiles),
      });
    } catch (error) {
      console.error(error);
    } finally {
      setWaitingForFirstToken(false);
      setStreamCompleted(true);
      setAttachedFiles([]);
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

  const getAttachedFileNames = (filepaths) => {
    let filepathNames = [];
    filepaths.forEach((filepath) => {
      let filepathName = getFileName(filepath, 50);
      filepathNames.push(filepathName);
    });
    return filepathNames;
  };

  // Prompt user to attach files to current chat query
  const setAttachmentFiles = async (attachmentType) => {
    let fileLengthLimit = -1; // use all files if set to -1
    let allowedFileExtensions = [];
    let filePathDialogTitle = ""
    switch (attachmentType) {
      case "image":
        fileLengthLimit = 3;
        allowedFileExtensions = validImageQueryExtensions;
        filePathDialogTitle = t('chat.attach.file_path_dialog_title_image')
        break;
      case "table":
        fileLengthLimit = 1;
        allowedFileExtensions = validTableQueryExtensions;
        filePathDialogTitle = t('chat.attach.file_path_dialog_title_table')
        break;
      case "summarize":
        fileLengthLimit = 3;
        allowedFileExtensions = validSummarizeQueryExtensions;
        filePathDialogTitle = t('chat.attach.file_path_dialog_title_summarize')
        break;
      case "resume":
        fileLengthLimit = Infinity;
        allowedFileExtensions = validResumeQueryExtensions;
        filePathDialogTitle = t('chat.attach.file_path_dialog_title_resume')
        break;
      default:
        fileLengthLimit = 3;
        allowedFileExtensions = validGeneralQueryExtensions;
        filePathDialogTitle = t('chat.attach.file_path_dialog_title_summarize')
    }

    let filepaths = await open({
      title: "Select file(s) for " + attachmentType + " query",
      multiple: true,
      directory: false,
      filters: [
        {
          name: "Files",
          extensions: allowedFileExtensions, // Filter by extension
        },
      ],
    });

    if (!filepaths) {
      console.log("Attachment canceled.");
      return 0; // canceled so return 0 files attached
    }

    if (fileLengthLimit > -1 && filepaths.length > fileLengthLimit) {
      filepaths = filepaths.splice(0, fileLengthLimit);
      setFileLengthError(`Maximum of only ${fileLengthLimit} file(s) allowed.`);
    } else {
      setFileLengthError("");
    }

    console.log("Attaching files: " + filepaths);
    setAttachedFiles(filepaths); // set the current attached files
    setAttachedFileQueryType(attachmentType);

    // Convert the array into a string with ", " between filenames
    setAttachedFileNames(getAttachedFileNames(filepaths));

    return filepaths.length; // files selected, return the amount attached
  };

  const generalFileFeature = (_onclick) => {
    return (
      <Chip
        className="file-query-chip"
        icon=<GeneralFileQueryIcon className="file-attachment-icon" />
        label="Query Documents"
        variant="outlined"
        color="primary"
        size="medium"
        onClick={_onclick}
      />
    );
  };

  const LightTooltip = styled(
    ({ className, placement = "top-start", ...props }) => (
      <Tooltip
        {...props}
        arrow
        placement={placement}
        classes={{ popper: className }}
        slots={{ transition: Zoom }}
      />
    )
  )(({ theme }) => ({
    [`& .${tooltipClasses.tooltip}`]: {
      backgroundColor: "rgba(238, 238, 238, 0.87)",
      color: "rgba(0, 0, 0, 0.87)",
      boxShadow: theme.shadows[1],
      fontSize: 11,
    },
  }));

  const QueryFeature = ({label, description, icon, query, _onclick}) => {
    return (
      <LightTooltip title={description}>
        <Chip
          className="file-query-chip"
          icon={icon}
          label={label}
          variant={query === attachedFileQueryType ? "filled" : "outlined"}
          color="primary"
          size="medium"
          onClick={_onclick}
        />
      </LightTooltip>
    );
  };

  const SummarizeQueryFeature = (_onclick) => {
    return (
      <QueryFeature
        label={t('chat.attach.summary')}
        description={t('chat.attach.summary_tips')}
        icon={<SummarizeQueryIcon className="file-attachment-icon" />}
        query="summarize"
        _onclick={_onclick}
      />
    );
  };

  const tableFeature = (_onclick) => {
    return (
      <QueryFeature
        label={t('chat.attach.data')}
        description={t('chat.attach.data_tips')}
        icon={<TableQueryIcon className="file-attachment-icon" />}
        query="table"
        _onclick={_onclick}
      />
    );
  };

  const imageFeature = (_onclick) => {
    return (
      <QueryFeature
        label={t('chat.attach.images')}
        description={t('chat.attach.images_tips')}
        icon={<ImageQueryIcon className="file-attachment-icon" />}
        query="image"
        _onclick={_onclick}
      />
    );
  };

  const generateImageFeature = (_onclick) => {
    return (
      <Chip
        className="file-query-chip"
        icon={<ImageGenerationIcon className="file-attachment-icon" />}
        label={t('chat.attach.generate_images')}
        variant="outlined"
        color="primary"
        size="medium"
        onClick={_onclick}
      />
    );
  };

  const resumeFeature = (_onclick) => {
    return (
      <QueryFeature
        label={t('chat.attach.resume')}
        description={t('chat.attach.resume_tips')}
        icon={<ResumeQueryIcon className="file-attachment-icon" />}
        query="resume"
        _onclick={_onclick}
      />
    );
  };

  const clearFeature = (_onclick) => {
    return (
      <LightTooltip title={t('chat.attach.clear_tips')}>
        <Chip
          className="file-query-chip"
          icon={<ClearQueryIcon className="file-attachment-icon" />}
          label={t('chat.attach.clear')}
          variant="outlined"
          color="default"
          size="medium"
          onClick={_onclick}
        />
      </LightTooltip>
    );
  };

  const enableAllFeatures = (_onclick) => {
    const _handleCheckbox = () => {
      _onclick(!enableAllFeature);

      // set checkbox state to opposite of current state
      setEnableAllFeature(!enableAllFeature);
    };

    return (
      <Chip
        className="file-query-chip"
        label={t('chat.attach.all_features')}
        variant="outlined"
        color="primary"
        size="medium"
        onClick={_handleCheckbox}
        icon={<Switch checked={enableAllFeature} color="primary" />}
      />
    );
  };

  const renderChatFeature = (listOfFeature, onclickFunctions = {}) => {
    return (
      <>
        {listOfFeature.includes("GeneralFile")
          ? generalFileFeature(onclickFunctions["GeneralFile"])
          : null}
        {listOfFeature.includes("Summarize")
          ? SummarizeQueryFeature(onclickFunctions["SummarizeQuery"])
          : null}
        {listOfFeature.includes("Table")
          ? tableFeature(onclickFunctions["Table"])
          : null}
        {listOfFeature.includes("Image")
          ? imageFeature(onclickFunctions["Image"])
          : null}
        {listOfFeature.includes("GenImage")
          ? generateImageFeature(onclickFunctions["GenImage"])
          : null}
        {listOfFeature.includes("Resume")
          ? resumeFeature(onclickFunctions["Resume"])
          : null}
        {enableAllFeatures(onclickFunctions["EnableAllFeatures"])}
        {listOfFeature.includes("Clear")
          ? clearFeature(onclickFunctions["Clear"])
          : null}
      </>
    );
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
        setAttachmentFiles,
        attachedFiles,
        attachedFileQueryType,
        setAttachedFileQueryType,
        setAttachedFiles,
        attachedFileNames,
        getFileName,
        renderChatFeature,
        newChatModelNeeded,
        setNewChatModelNeeded,
        setIsModelSettingsReady,
        fileLengthError,
        setFileLengthError,
        LightTooltip,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
