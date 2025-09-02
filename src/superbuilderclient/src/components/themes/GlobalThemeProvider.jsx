import React, { useState, useEffect, useContext } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import useDataStore from "../../stores/DataStore";

// wrapper to apply consistent global assistant themes across different webview windows
const GlobalThemeProvider = ({ 
    children, 
    isSubWindow=true,
}) => {
    const { assistant } = useDataStore();
    const windowLabel = getCurrentWindow().label;
    useEffect(() => {
        // only start listening on component mount
        const unlistenPromise = listen('assistant-config-updated', async () => {
            // force sub-windows to get recent config to update the appearance
            if (isSubWindow) {
                console.log(`Fetching latest config for subwindow: ${windowLabel}`);
                await useDataStore.getState().getDBConfig(); 
            }
        });
        return () => {
            unlistenPromise.then(unlistenFn => unlistenFn()); // make sure to unlisten on umount
        };
    }, []);
    const globalTheme = createTheme({
        typography: {
            fontFamily: ["IntelOneDisplay", "sans-serif"].join(","),
        },
        palette: {
            primary: {
                main: assistant.header_bg_color,
                contrastText: assistant.header_text_bg_color,
            },
            secondary: {
                main: assistant.sidebar_box_bg_color,
            },
        },
        components: {
            MuiLink: {
                // color: "rgb(65, 148, 204)", 
            },
        },
    });

    return (
        <span
            // global variables for non-mui components to access global theme colors from
            style={{
                "--primary-main-color": globalTheme.palette.primary.main,
                "--primary-light-color": globalTheme.palette.primary.light,
                "--primary-dark-color": globalTheme.palette.primary.dark,
                "--primary-text-color": globalTheme.palette.primary.contrastText,
                "--secondary-main-color": globalTheme.palette.secondary.main,
                "--secondary-light-color": globalTheme.palette.secondary.light,
                "--secondary-dark-color": globalTheme.palette.secondary.dark,
                "--secondary-text-color": globalTheme.palette.secondary.contrastText,
            }}
        >
            <ThemeProvider theme={globalTheme}>
                {children}
            </ThemeProvider>
        </span>
        
    );
};

export default GlobalThemeProvider;