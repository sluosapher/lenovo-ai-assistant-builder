import { useEffect, useState } from "react";
import "./AssistantLogo.css";
import useDataStore from "../../stores/DataStore";

const AssistantLogo = () => {
  const { assistant, assistantLogo } = useDataStore();
  const [assistantLogoImage, setAssistantLogoImage] = useState(null);

  // useEffect(() => {
  //   if (assistant.logo_image == "default") {
  //     setAssistantLogoImage(null);
  //   } else {
  //     setAssistantLogoImage(assistant.logo_image)
  //   }
  // }, [assistant]);

  if (assistantLogo === "default") {
    document.documentElement.style.setProperty(
      "--me-background-color",
      assistant.header_bg_color
    );
    document.documentElement.style.setProperty(
      "--me-background-color-setting",
      assistant.header_bg_color
    );
    document.documentElement.style.setProperty(
      "--me-text-color",
      assistant.header_text_bg_color
    );
  }
  else {
    document.documentElement.style.setProperty(
      "--me-background-color",
      "transparent"
    );
    document.documentElement.style.setProperty(
      "--me-background-color-setting",
      "transparent"
    );
  }

  return (
    <div className="rectangle-container">
      <div className="rectangle outer">
        <div className="rectangle me">
          {
            assistantLogo === "default" ? assistant.short_name : <img className="assistant-logo" src={assistantLogo} />
          }
        </div>
        <div className="rectangle inner" />
      </div>
    </div>
  );
};

export default AssistantLogo;
