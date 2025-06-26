import "./ModelSettings.css";
import React, { useState, useContext, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button, Checkbox, Tooltip, FormControlLabel } from "@mui/material";
import { TextField, Typography } from "@mui/material";
import { ChatContext } from "../context/ChatContext";
import SimpleAccordion from "../accordion/SimpleAccordion";
import AdvancedSlider from "../advancedSlider/AdvancedSlider";
import Ajv from "ajv";
import useDataStore from "../../stores/DataStore";
import { useTranslation } from "react-i18next";

const HighLowTooltipDescription = ({
  overall_description,
  high_description,
  low_description,
  isButton = false,
  onClick,
  children,
}) => {
  const { t } = useTranslation();
  
  const tooltipContent = (
    <span>
      {overall_description}
      {high_description && low_description && (
        <span>
          <br />
          <br />
          <b>{t("setting.parameters.high_value")} </b> {high_description}
          <br />
          <br />
          <b>{t("setting.parameters.low_value")} </b> {low_description}
        </span>
      )}
    </span>
  );

  return (
    <Tooltip
      title={tooltipContent}
      enterDelay={0}
      leaveDelay={0}
      placement="bottom-start"
    >
      {children ||
        (isButton ? (
          <Button
            onClick={onClick}
            sx={{ padding: 0, border: 'none', background: 'none' }}
          >
            <img
              className="infoshape"
              src="/images/normal_u151.svg"
              alt="Info Icon"
            />
          </Button>
        ) : (
          <img
            className="infoshape"
            src="/images/normal_u151.svg"
            alt="Info Icon"
          /> 
        ))}
    </Tooltip>
  );
};

const ModelSettings = () => {
  const { t } = useTranslation();
  const [canChangeValue, setCanChangeValue] = useState(false);
  const {
    setIsModelSettingsReady,
    isChatReady,
    setChatHistorySize,
    setUseSemanticSplitter,
  } = useContext(ChatContext);
  const [schema, setSchema] = useState(null);
  const [isValid, setIsValid] = useState(false);
  const [sliderValues, setSliderValues] = useState({});
  const [textAreaValues, setTextAreaValues] = useState({});
  const ajv = new Ajv();
  const { config, assistant, getDBConfig } = useDataStore();

  useEffect(() => {
    setCanChangeValue(isChatReady);
  }, [isChatReady]);

  useEffect(() => {
    const validateWithSchema = async () => {
      try {
        const schema = await invoke("get_schema");
        setSchema(schema);
      } catch (error) {
        console.error("Failed to fetch schema:", error);
      }
      if (schema) {
        if (!assistant?.parameters) return;
        const parameters = JSON.parse(assistant.parameters);
        const schemaJson = JSON.parse(schema);
        const validate = ajv.compile(schemaJson);
        const valid = validate(parameters);

        if (!valid) {
          console.error("Initial validation errors:", validate.errors);
        }

        setIsValid(valid);
      }
    };
    validateWithSchema();
  }, [assistant, schema]);

  useEffect(() => {
    if (!assistant?.parameters) return;
    const parameters = JSON.parse(assistant.parameters);

    const newSliderValues = {};
    const newTextAreaValues = {};

    parameters.categories.forEach((category) => {
      category.fields.forEach((field) => {
        if (typeof field.user_value === "number") {
          newSliderValues[field.name] = field.user_value;
        } else if (typeof field.user_value === "string") {
          newTextAreaValues[field.name] = field.user_value;
        }
      });
    });

    setSliderValues(newSliderValues);
    setTextAreaValues(newTextAreaValues);
  }, [assistant?.parameters]);

  function snakeCaseToReadable(text) {
    return text
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function calculateStepSize(min, max) {
    const range = max - min;
    if (range <= 1) {
      return 0.01;
    } else {
      return 1;
    }
  }

  const applySetting = async (categoryName, fieldName, value) => {
    try {
      console.log(
        `Saving setting ${fieldName} in ${categoryName} with value of ${value}`
      );
      setIsModelSettingsReady(false);

      const parameters = JSON.parse(assistant.parameters);

      const category = parameters.categories.find(
        (cat) => cat.name === categoryName
      );
      if (category) {
        const field = category.fields.find((fld) => fld.name === fieldName);
        if (field && field.user_value !== value) {
          // Only update if the value has changed
          field.user_value = value;

          assistant.parameters = JSON.stringify(parameters);

          const updatedCategory = {
            name: category.name,
            description: category.description,
            fields: [field], // Only send the updated field
          };

          await invoke("set_parameters", {
            parametersJson: JSON.stringify({ categories: [updatedCategory] }),
          });

          if (fieldName == "conversation_history") {
            setChatHistorySize(value);
          }
        }
      }
      if (fieldName == "use_semantic_splitter") {
        setUseSemanticSplitter(value);
      }

      setIsModelSettingsReady(true);
      console.log("Setting applied!", value, assistant.parameters);
    } catch (error) {
      console.log(`Failed to save setting: ${error}`);
    }
  };

  const resetSectionToDefaults = async (categoryName) => {
    try {
      console.log(`Resetting category ${categoryName} to default values`);
      setIsModelSettingsReady(false);

      const parameters = JSON.parse(assistant.parameters);
      const category = parameters.categories.find(
        (cat) => cat.name === categoryName
      );
      if (category) {
        const updatedFields = []; // Collect only the fields to be updated
        const newSliderValues = { ...sliderValues };
        const newTextAreaValues = { ...textAreaValues };
        category.fields.forEach((field) => {
          if (
            field.default_value !== undefined &&
            field.default_value !== field.user_value
          ) {
            // Only update if the value has changed
            field.user_value = field.default_value;
            updatedFields.push(field); // Add the field to the list of updated fields
            if (typeof field.default_value === "number") {
              newSliderValues[field.name] = field.default_value;
            } else if (typeof field.default_value === "string") {
              newTextAreaValues[field.name] = field.default_value;
            }
          }
        });
        setSliderValues(newSliderValues);
        setTextAreaValues(newTextAreaValues);

        assistant.parameters = JSON.stringify(parameters);

        const updatedCategory = {
          name: category.name,
          description: category.description,
          fields: updatedFields, // Only send the updated fields
        };

        await invoke("set_parameters", {
          parametersJson: JSON.stringify({ categories: [updatedCategory] }),
        });

        setIsModelSettingsReady(true);
        console.log(`Category ${categoryName} reset to defaults`);
      }
    } catch (error) {
      console.log(`Failed to reset category: ${error}`);
    }
  };

  const renderParameter = (categoryName, fieldData) => {
    const { name, default_value, description, max, min, user_value } =
      fieldData;
    const displayName = snakeCaseToReadable(name);

    const highValueRegex = /Higher value:\s*(.*?)(?=Lower value:|$)/i;
    const lowValueRegex = /Lower value:\s*(.*?)(?=$)/i;

    const highMatch = description.match(highValueRegex);
    const lowMatch = description.match(lowValueRegex);

    const highDescription = highMatch ? highMatch[1].trim() : "";
    const lowDescription = lowMatch ? lowMatch[1].trim() : "";

    const overallDescription = description
      .replace(highValueRegex, "")
      .replace(lowValueRegex, "")
      .trim();

    if (typeof user_value === "boolean") {
      return (
        <div className="checkbox-container" key={displayName}>
          <FormControlLabel
            control={
              <Checkbox
                disabled={!canChangeValue}
                checked={user_value}
                onChange={(e) => applySetting(categoryName, name, e.target.checked)}
              />
            }
            label={
              <div className="information-container">
                <HighLowTooltipDescription
                  overall_description={overallDescription}
                  high_description={highDescription}
                  low_description={lowDescription}
                />             
                <span className="information-label">{displayName}</span>
              </div>
            }
          />
        </div>
      );
    } else if (typeof user_value === "number") {
      const sliderValue = sliderValues[name] || user_value;
      const stepSize = calculateStepSize(min, max);
      return (
        <AdvancedSlider
          key={displayName}
          label={displayName}
          value={sliderValue}
          onChange={(value) =>
            setSliderValues((prev) => ({ ...prev, [name]: value }))
          }
          onChangeCommitted={(value) => applySetting(categoryName, name, value)}
          min={min}
          max={max}
          step={stepSize}
          disabled={!canChangeValue}
          description={
            <HighLowTooltipDescription
              overall_description={overallDescription}
              high_description={highDescription}
              low_description={lowDescription}
            />
          }
        />
      );
    } else if (typeof user_value === "string") {
      const textAreaValue = textAreaValues[name] !== undefined ? textAreaValues[name] : user_value;
      return (
        <div key={displayName} className="text-input-container">
          <div className="information-container">
            <HighLowTooltipDescription
              overall_description={overallDescription}
            />
            <span className="information-label">{displayName}</span>
          </div>
          <TextField
            className="model-settings-text-input"
            multiline
            rows={4}
            disabled={!canChangeValue}
            value={textAreaValue}
            onBlur={(e) => applySetting(categoryName, name, e.target.value)}
            onChange={(e) =>
              setTextAreaValues((prev) => ({ ...prev, [name]: e.target.value }))
            }
            fullWidth
            variant="outlined"
          />
        </div>
      );
    }
    return null;
  };

  const renderAccordion = (categoryData) => {
    const { name, description, fields } = categoryData;
    const displayName = snakeCaseToReadable(name);

    return (
      <SimpleAccordion
        key={displayName}
        title={displayName}
        description={description}
      >
        <div className="accordion-section">
          {fields.map(
            (fieldData) =>
              fieldData.name !== "query_rewriting" &&
              renderParameter(name, fieldData)
          )}
          <Button
            variant="outlined"
            onClick={() => resetSectionToDefaults(name)}
            disabled={!canChangeValue}
          >
            {t("setting.parameters.reset_button")}
          </Button>
        </div>
      </SimpleAccordion>
    );
  };

  return isValid ? (
    <SimpleAccordion
      title={t("setting.parameters.title")}
      description={t("setting.parameters.description")}
    >
      {JSON.parse(assistant.parameters).categories.map((categoryData) =>
        renderAccordion(categoryData)
      )}
    </SimpleAccordion>
  ) : null;
};

export { ModelSettings, HighLowTooltipDescription };
