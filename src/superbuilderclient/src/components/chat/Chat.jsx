import React, { useEffect, useState, useRef, useContext } from "react";
import "./Chat.css";
import AssistantLogo from "../assistantLogo/assistantLogo";
import FeedbackRow from "../feedback/Feedback";
import DragAndDrop from "../dragAndDrop/DragAndDrop";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark } from "react-syntax-highlighter/dist/esm/styles/prism"; // Choose any style
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import AttachedFilesIcon from "@mui/icons-material/AttachFile";
import { tooltipClasses } from "@mui/material/Tooltip";
import { ChatContext } from "../context/ChatContext";
import ErrorIcon from "@mui/icons-material/Error";
import { invoke } from "@tauri-apps/api/core";
import { IconButton, Typography, Box } from "@mui/material";
import useDataStore from "../../stores/DataStore";

import { useTranslation } from 'react-i18next';
import i18n from 'i18next';

const CodeBlock = ({ language, value }) => {
  return (
    <SyntaxHighlighter language={language} style={materialDark}>
      {value}
    </SyntaxHighlighter>
  );
};

const ChatMessage = ({ text }) => {
  const { attachedFileQueryType } = useContext(ChatContext);
  const { assistant } = useDataStore();

  console.log(attachedFileQueryType, assistant.models.chat_model);

  return (
    <div className="chat-message">
      <ReactMarkdown
        children={text}
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            return !inline && match ? (
              <CodeBlock
                language={match[1]}
                value={String(children).replace(/\n$/, "")}
                {...props}
              />
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          img({ node, ...props }) {
            return (
              <div className="chat-image">
                <img
                  src={`data:image/png;base64, ${props.src}`}
                  alt={props.alt || "Image"}
                />
              </div>
            );
          },
          table({ children, ...props }) {
            return <table className="chat-markdown-table" {...props}>{children}</table>;
          },
          th({ children, ...props }) {
            return <th {...props}>{children}</th>;
          },
          td({ children, ...props }) {
            return <td {...props}>{children}</td>;
          },
        }}
      />
    </div>
  );
};

const Chat = () => {
  const {
    messages,
    sendMessage,
    stopChatGeneration,
    isStreamCompleted,
    isWaitingForFirstToken,
    isChatReady,
    modelLoaded,
    setAttachmentFiles,
    attachedFiles,
    attachedFileQueryType,
    setAttachedFiles,
    setAttachedFileQueryType,
    attachedFileNames,
    getFileName,
    renderChatFeature,
    fileLengthError,
    setFileLengthError,
    LightTooltip,
  } = useContext(ChatContext);
  const { t } = useTranslation();
  const { config, assistant, getDBConfig } =
    useDataStore();
  const [input, setInput] = useState("");
  const [attachmentVisible, setAttachmentVisible] = useState(false);
  const [queryIconVisibile, setQueryIconVisibile] = useState(false);
  const [placeholderText, setPlaceholderText] = useState(
    t('chat.placeholder')
  );
  const userName = useDataStore((state) => state.system_info?.UserName);

  const FileAttachmentList = ({ filesAttached, queryType }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
      <div className="file-attachment-list">
        {isOpen && (
          <ul className="no-style-list">
            {filesAttached.map((filepath) => (
              <li key={filepath}>
                <span
                  className="attached-file-link"
                  onClick={async () =>
                    await invoke("open_in_explorer", { path: filepath })
                  }
                >
                  {getFileName(filepath, 50)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (e.shiftKey) {
        setInput(input + "\n"); // Shift being pressed so line break
      } else {
        handleSendMessage(e); // send input message to LLM
        e.preventDefault();
      }
    }
  };
  const handleOpenFileLocation = async (filePath) => {
    try {
      await invoke("open_in_explorer", { path: filePath });
    } catch (error) {
      console.error("Error opening file location:", error);
    }
  };

  const focusChatInput = () => {
    document.getElementsByClassName("enter-your-question")[0].focus();
  };

  // Return text that is formatted for UI display and LLM input
  const formatUserInputText = (text) => {
    return text.trim(); //only trim whitespaces for now
  };

  const endRef = useRef();

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
    setAttachmentVisible(attachedFileQueryType !== ""); // only show query icons if files are attached
  }, [messages]);

  // focus on the input field when chat is ready
  useEffect(() => {
    if (isChatReady) {
      focusChatInput();
    }
  }, [isChatReady]);

  useEffect(() => {
    setQueryIconVisibile(config.is_admin);
    if (attachmentVisible && !config.is_admin) { setAttachmentVisible(false); }
  }, [config]);

  useEffect(() => {
    if (isStreamCompleted) {
      setPlaceholderText(t('chat.placeholder'));
    }
  }, [isStreamCompleted, i18n.language]);

  const handleSendMessage = async () => {
    if (!isChatReady) {
      console.log("Chat is not ready for input yet, please wait.");
      return;
    }

    if (input === "") {
      console.log("No input to send");
      return;
    }

    setInput(""); // clear input field
    setFileLengthError("");
    const formattedInput = formatUserInputText(input); // trim and clean up user input for better LLM performance
    sendMessage(formattedInput); // send chat message to Tauri Chat API
  };

  const grayedOutClass =
    assistant?.models["chat_model"] == "chat_model" ? "grayed-out" : "";
  const className = `chat-container ${grayedOutClass}`;

  if (
    assistant?.features.length > 0 &&
    assistant?.features.indexOf("Clear") == -1
  ) {
    assistant.features.push("Clear");
  }

  var chipTypes = [];
  if (assistant && assistant.features) {
    chipTypes = assistant.features;
  }

  var onclickFunctionsForRenderFeature = {};
  onclickFunctionsForRenderFeature["GeneralFile"] = async () => {
    const filesAttached = await setAttachmentFiles("document");
    if (filesAttached > 0) {
      focusChatInput();
      setInput("");
    }
  };

  onclickFunctionsForRenderFeature["SummarizeQuery"] = async () => {
    const filesAttached = await setAttachmentFiles("summarize");
    if (filesAttached > 0) {
      const placeholderInput =
        filesAttached > 1
          ? "Summarize the documents"
          : "Summarize the document";
      setInput(placeholderInput);
      focusChatInput();
    }
  };

  onclickFunctionsForRenderFeature["Table"] = async () => {
    const filesAttached = await setAttachmentFiles("table");
    if (filesAttached > 0) {
      const placeholderInput = "Describe the tabular data";
      setInput(placeholderInput);
      focusChatInput();
    }
  };

  onclickFunctionsForRenderFeature["Image"] = async () => {
    const filesAttached = await setAttachmentFiles("image");
    if (filesAttached > 0) {
      const placeholderInput =
        filesAttached > 1 ? "Describe the images" : "Describe the image";
      setInput(placeholderInput);
      focusChatInput();
    }
  };

  onclickFunctionsForRenderFeature["GenImage"] = async () => {
    setAttachedFileQueryType("generate_image");
    const placeholderInput = t("chat.placeholder_generate_image");
    setInput(placeholderInput);
    focusChatInput();
    setFileLengthError("");
  };

  onclickFunctionsForRenderFeature["EnableAllFeatures"] = async () => {
    getDBConfig();
  };

  onclickFunctionsForRenderFeature["Resume"] = async () => {
    const filesAttached = await setAttachmentFiles("resume");
    if (filesAttached > 0) {
      setInput("");
      setPlaceholderText("Enter Job Description");
      focusChatInput();
    }
  };

  onclickFunctionsForRenderFeature["Clear"] = async () => {
    setAttachedFileQueryType("");
    setAttachedFiles([]);
    setFileLengthError("");
    setAttachmentVisible(false);
    setInput("");
    setPlaceholderText(t('chat.placeholder'));
  };
  const [hasError, setHasError] = useState(true);

  return (
    <div className={className}>
      <DragAndDrop />
      {/* Messages area */}
      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={message.id}>
            <div className={`message ${message.sender}`}>
              <div className="sender-logo">
                {message.sender !== "user" ? (
                  <AssistantLogo assistant={assistant} />
                ) : (
                  <div className={`sender-logo ${message.sender}`} />
                )}
              </div>
              <div className={`message-text ${message.sender}`}>
                {message.sender === "assistant" ? (
                  <ChatMessage key={message.id} text={message.text} />
                ) : (
                  message.text
                )}
                {message.sender !== "user" &&
                  index === messages.length - 1 &&
                  isWaitingForFirstToken && (
                    <div className="loading-container">
                      <div className="loading-spinner"></div>
                      <p>{t('chat.processing')}</p>
                    </div>
                  )}
                {message.queryType !== "" && message.sender === "user" && (
                  <FileAttachmentList
                    filesAttached={message.attachedFiles}
                    queryType={message.queryType}
                  />
                )}
                {message.queryType === "image" &&
                  message.sender === "assistant" &&
                  assistant.models.chat_model.includes("vision") && (
                    <Typography variant="caption" sx={{ fontStyle: "italic" }}>
                      {t('chat.user.notice')}
                    </Typography>
                  )}
              </div>
            </div>
            <div>
              {index !== 0 && message.sender !== "user" ? (
                <FeedbackRow
                  question={messages[index - 1].text}
                  message={message.text}
                  messageIndex={index}
                />
              ) : (
                <div />
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {messages.length === 0 && !config.is_admin && (
        <div className="welcome-message">
          <h1>{t('chat.user.welcome')} {userName}</h1>
          <p>{t('chat.user.subwelcome')}</p>
        </div>
      )}

      {/* Input area */}

      <div className="chat-input-wrapper">
        {fileLengthError !== "" && (
          <div className="attach-file-error">
            <ErrorIcon className="attach-file-error-icon" color="action" />
            <p>
              {fileLengthError}
              {Array.isArray(attachedFiles) && attachedFiles.length > 0 && (
                <>
                  {" Using only "}
                  {attachedFiles.map((file, index) => (
                    <span
                      className="attached-file-link"
                      key={index}
                      onClick={() => handleOpenFileLocation(file)}
                      style={{ fontSize: "14px" }}
                    >
                      {getFileName(file, 70)}
                      {index < attachedFiles.length - 1 && ", "}
                    </span>
                  ))}
                </>
              )}
              {!Array.isArray(attachedFiles) && attachedFiles && (
                <>
                  {" Using only "}
                  <span
                    className="attached-file-link"
                    onClick={() => handleOpenFileLocation(attachedFiles)}
                    style={{ fontSize: "14px" }}
                  >
                    {attachedFiles}
                  </span>
                </>
              )}
            </p>
          </div>
        )}
        {attachmentVisible && (
          <div className="file-query-icons">
            {renderChatFeature(chipTypes, onclickFunctionsForRenderFeature)}
          </div>
        )}

        <div className="input-container">
          {chipTypes?.length > 0 && queryIconVisibile && (
            <LightTooltip
              title={`${attachedFileQueryType === "summarize"
                ? `${attachedFileNames.length
                } document(s) attached to summarize: ${attachedFileNames.join(
                  ", "
                )}`
                : attachedFileQueryType !== ""
                  ? `${attachedFileNames.length
                  } ${attachedFileQueryType}(s) attached: ${attachedFileNames.join(
                    ", "
                  )}`
                  : t('chat.attach.title')
                }`}
              placement="bottom-start"
              enterDelay={0}
              leaveDelay={0}
              sx={{
                [`& .${tooltipClasses.tooltip}`]: {
                  maxHeight: "42px",
                  maxWidth: "700px",
                },
              }}
            >
              <IconButton
                onClick={() => {
                  if (isChatReady) {
                    setAttachmentVisible(!attachmentVisible);
                  }
                }}
              >
                <AttachedFilesIcon
                  className={`file-attachment-icon ${
                    attachedFileQueryType != "" ? "file-attached" : ""
                  }`}
                />
              </IconButton>
            </LightTooltip>
          )}

          <textarea
            placeholder={placeholderText}
            value={input}
            onKeyDown={handleKeyDown}
            onChange={(e) => setInput(e.target.value)}
            className="enter-your-question"
            disabled={!isChatReady}
          />

          <div>
            {!isWaitingForFirstToken && !isStreamCompleted ? (
              <button
                onClick={stopChatGeneration}
                className="prompt-stop-button"
              >
                <StopCircleOutlinedIcon
                  className="prompt-stop-button-icon"
                  sx={{ color: "white" }}
                />
              </button>
            ) : (
              <button
                onClick={handleSendMessage}
                className="prompt-send-button"
                disabled={!isChatReady || input === ""}
              />
            )}
          </div>
        </div>
        <div className="chat-disclaimer">
          {t('chat.disclaimer')}
        </div>
      </div>
    </div>
  );
};

export default Chat;