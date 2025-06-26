import React, { useState, useEffect, useContext, useRef } from "react";
import "./Feedback.css";
import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { ChatContext } from "../context/ChatContext";
import { EmailWindowContext } from "../context/EmailWindowContext";
import { FileManagementContext } from "../context/FileManagementContext";
import { useTranslation } from 'react-i18next';

const FeedbackRow = ({ question, message, messageIndex }) => {
  const { t } = useTranslation();
  const { sendMessage, setIsChatReady, isChatReady } = useContext(ChatContext);
  const { updateTable } = useContext(FileManagementContext);
  const { appendMessageToEmail } = useContext(EmailWindowContext);
  const inputRef = useRef(null);

  // Array of logos (example URLs)
  const logos = [
    { alt: "/path/to/logo1.png", function: "feedback-thumbs-up" },
    { alt: "/path/to/logo2.png", function: "feedback-thumbs-down" },
    { alt: "/path/to/logo3.png", function: "feedback-divider" },
    { alt: "/path/to/logo4.png", function: "feedback-refresh" },
    { alt: "/path/to/logo5.png", function: "feedback-copy" },
    // { alt: "download", function: "feedback-download" },
    // { alt: "share", function: "feedback-share" },
    { alt: "email", function: "feedback-email" },
  ];
  const quickposfeedback = ["Nice", "It's correct!", "Thanks!"];
  const quicknegfeedback = ["Incorrect", "Incomplete", "Misleading"];
  const [input, setInput] = useState(""); //for reading in text
  const [showInput, setShowInput] = useState(false); //for if the dialog box is active or not
  const [feedbackInfo, setFeedbackInfo] = useState({
    chatbotResponse: "",
    functionName: "",
  }); //to maintain info retrieved from chat throughout instance.
  const [feedbackReceived, setFeedbackReceived] = useState(false);
  const [fadeOut, setFadeOut] = useState(false); // State to control fade-out effect
  const [feedbackColor, setFeedbackColor] = useState(true);
  const [upSelected, setUpSelected] = useState(false);
  const [downSelected, setDownSelected] = useState(false);
  const [qButtonsVisible, setQButtonsVisible] = useState(false);
  const [qButtons, setQButtons] = useState([]);
  const [emailAppend, setEmailAppend] = useState(false);

  useEffect(() => {
    if (showInput && inputRef.current) {
      inputRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [showInput]);

  const handleQButtonClick = (buttonText) => {
    setInput(buttonText);
    // setQButtons(qButtons.filter(button => button !== buttonText));  // Remove button after clicked
  };

  const loadEmail = () => {
    appendMessageToEmail(question, message); // append question and message to new or existing email window
    setEmailAppend(true);
    setTimeout(() => {
      setEmailAppend(false);
    }, 3000);
  };

  /**************** Feedback button logic  *******************************/
  const handleButtonClick = async (functionName) => {
    console.log(`Button pressed: ${functionName}`);
    switch(functionName) {
      case "feedback-thumbs-up":
        setInput("");
        setFeedbackInfo({ message, functionName });
        setUpSelected(!upSelected);
        setDownSelected(false);
        setQButtons(quickposfeedback);
        if (downSelected == false) {
          setQButtonsVisible(!qButtonsVisible);
          setShowInput(!showInput);
        }
        break;
      case "feedback-thumbs-down":
        setInput("");
        setFeedbackInfo({ message, functionName });
        setUpSelected(false);
        setDownSelected(!downSelected);
        setQButtons(quicknegfeedback);
        if (upSelected == false) {
          setQButtonsVisible(!qButtonsVisible);
          setShowInput(!showInput);
        }
        break;
      case "feedback-refresh":
        if (!isChatReady) return;
        console.log("Re-submitting prompt at message index: ", messageIndex-1);
        await sendMessage(question, messageIndex-1); // return the original question index for chat history context
        break;
      case "feedback-copy":
        try {
          const copiedText = "Question: " + question + "\n\nResponse: " + message;
          await writeText(copiedText);
          console.log("Copied to clipboard");
        } catch (e) {
          console.log("Error copying: ", e);
        }
        break;
      case "feedback-email":
        loadEmail();
        break;
      default:
        console.error("Function name %s is not defined.", functionName);
    }
  };

  const openEmailForm = () => {
    openModal();
  };

  /***********Feedback input field logic ***************************************/
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSendMessage(e);
    }
  };

  const handleSendMessage = async () => {
    if (input.trim()) {
      console.log(input);
      const { chatbotResponse, functionName } = feedbackInfo;
      console.log(
        `Sending message with feedback info: ${chatbotResponse}, ${functionName}`
      );
      setInput("");
      setFeedbackInfo({ chatbotResponse: "", functionName: "" });
      setShowInput(false);
      setUpSelected(false);
      setDownSelected(false);
      setQButtonsVisible(false);
      console.log(input);
      setIsChatReady(false);
      const reply = await invoke("send_feedback", {
        feedback: input,
        question: question,
        type: functionName,
        answer: message,
      });
      await updateTable(); // update file list to include uploaded feedback
      setIsChatReady(true);
      console.log("feedback reply: ", reply);
      setFeedbackReceived(true);
      setTimeout(() => {
        setFeedbackReceived(false);
      }, 3000);
    }
  };

  /************ Display logic *********************************************/
  useEffect(() => {
    let timeoutId;
    if (feedbackReceived) {
      // Set a timeout to start the fade-out effect after a few seconds
      timeoutId = setTimeout(() => {
        setFadeOut(true);
        // Optionally, set another timeout to hide the message completely after the fade-out
        setTimeout(() => {
          setFeedbackReceived(false);
          setFadeOut(false); // Reset fade-out state for the next message
        }, 500); // This should match the CSS transition duration
      }, 2500); // 2.5 seconds before starting to fade out
    }
    return () => {
      // Clear the timeout if the component unmounts
      clearTimeout(timeoutId);
    };
  }, [feedbackReceived]);

  return (
    <div className="feedbackrow">
      <div className="topfeedbackrow">
        {/* {qButtonsVisible && (
          <div className="quick-buttons-column">
            {qButtons.map((button) => (
              <button
                key={button}
                className={`quick-button ${
                  upSelected ? "up" : downSelected ? "down" : ""
                }`}
                onClick={() => handleQButtonClick(button)}
              >
                {button}
              </button>
            ))}
          </div>
        )} */}

        <div className="feedback-buttons-column">
          {logos.map((logo, index) => (
            <div key={index}>
              {
                <button
                  className={`feedback-button ${logo.function} ${
                    upSelected ? "up" : downSelected ? "down" : ""
                  }`}
                  alt={logo.alt}
                  onClick={() => handleButtonClick(logo.function)} // Add the onClick event handler
                  disabled={!isChatReady}
                />
              }
            </div>
          ))}
        </div>
      </div>

      <div className="bottomfeedbackrow">
        {showInput && (
          <div className="feedback-chat-container">
            <input
              ref={inputRef}
              type="text"
              placeholder={
                upSelected ? t('feedback.placeholder_1') : 
                t('feedback.placeholder_2')
              }
              value={input}
              onKeyDown={handleKeyDown}
              onChange={(e) => setInput(e.target.value)}
              className="enter-your-feedback"
            />

            <button
              onClick={handleSendMessage}
              className={`feedback-send-button ${
                upSelected ? "up" : downSelected ? "down" : ""
              }`}
            />
          </div>
        )}
        {emailAppend && (
          <span
            className={`email-appended-message ${
              fadeOut ? "email-appended-message-fade-out" : ""
            }`}
          >
            {t('feedback.copy_to_email')}
          </span>
        )}

        {feedbackReceived && (
          <span
            className={`feedback-received-message ${
              fadeOut ? "feedback-received-message-fade-out" : ""
            } ${
              feedbackColor
                ? "feedback-received-message-green"
                : "feedback-received-message-red"
            }`}
          >
            {t('feedback.feedback_received')}
          </span>
        )}
      </div>
    </div>
  );
};

export default FeedbackRow;