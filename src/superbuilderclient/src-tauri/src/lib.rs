// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod grpc_client;
use grpc_client::{ SharedClient, super_builder };
use grpc_client::{
    initialize_client,
    call_chat,
    connect_client,
    get_config,
    mw_say_hello,
    llm_health_check,
    remove_file,
    upload_file,
    send_feedback,
    download_file,
    get_file_list,
    pyllm_say_hello,
    stop_chat,
    stop_upload_file,
    set_assistant_view_model,
    update_notification,
    get_chat_history,
    remove_session,
    send_email,
    set_models,
    update_db_models,
    set_parameters,
    load_models,
    upload_model,
    set_session_name,
    set_user_config_view_model,
    convert_model,
    export_user_config,
    import_user_config,
    remove_model,
    get_mcp_agents,
    get_active_mcp_agents,
    add_mcp_agent,
    edit_mcp_agent,
    remove_mcp_agent,
    start_mcp_agent,
    stop_mcp_agent,
    get_mcp_servers,
    add_mcp_server,
    edit_mcp_server,
    remove_mcp_server,
    start_mcp_server,
    stop_mcp_server,
    get_active_mcp_servers,
    get_mcp_server_tools,
    validate_model,
};
//use reqwest::Client;
use tauri::{ AppHandle, Manager };
use tauri::Emitter;
//use tokio::fs::File;
//use tokio::io::AsyncWriteExt;
mod config;
mod status;
use std::env;
use std::fs;
// (Removed) OpenOptions previously used for file-based logging
use std::path::Path;
// (Removed) Write previously used for file-based logging
// (Removed) SystemTime/UNIX_EPOCH previously used for file-based logging
use serde::Serialize;
use std::process::Command;
use base64::{ engine::general_purpose::STANDARD, Engine as _ };
use image::imageops::FilterType;
use image::ImageReader as ImageReader;
use std::io::Cursor;
use image::GenericImageView;
use axum::{Router, routing::{post, get}, extract::{State as AxumState, Query as AxumQuery}, Json as AxumJson};
use axum::http::StatusCode as AxumStatusCode;
use serde::Deserialize as AxumDeserialize;
use std::net::SocketAddr;

#[derive(Serialize)]
struct MissingModelsResponse {
    missing_models: Vec<String>,
    models_dir_path: String,
}

#[tauri::command]
fn get_system_language() -> String {
    use sys_locale::get_locale;

    get_locale().unwrap_or_else(|| String::from("en"))
}

#[tauri::command]
async fn get_missing_models(
    models_abs_path: String,
    models: Vec<String>
) -> Result<MissingModelsResponse, String> {
    // Get the current executable path

    // Ensure the models directory exists
    let models_dir_path = Path::new(&models_abs_path);

    if !models_dir_path.exists() {
        println!("Models directory does not exist, creating...");
        fs::create_dir_all(&models_dir_path).map_err(|e| e.to_string())?;
    } else {
        println!("Models directory already exists.");
    }

    // List the files in the models directory
    let mut files_in_directory = Vec::new();
    if let Ok(entries) = fs::read_dir(&models_dir_path) {
        for entry in entries.flatten() {
            if let Ok(file_name) = entry.file_name().into_string() {
                files_in_directory.push(file_name);
            }
        }
    }
    println!("Files in directory: {:?}", files_in_directory);

    // Determine which models are missing
    let missing_models = models
        .into_iter()
        .filter(|model| !files_in_directory.contains(model))
        .collect::<Vec<_>>();

    println!("Missing models: {:?}", missing_models);

    let response = MissingModelsResponse {
        missing_models,
        models_dir_path: format!("{}", models_dir_path.display()),
    };

    Ok(response)
}

#[tauri::command]
fn path_exists(path: String) -> bool {
    std::path::Path::new(&path).exists()
}

#[tauri::command]
fn check_openvino_model(folder_path: String) -> bool {
    let folder_path = Path::new(&folder_path);
    let file1_path = folder_path.join("openvino_model.bin");
    let file2_path = folder_path.join("openvino_model.xml");

    file1_path.exists() && file2_path.exists()
}

fn set_window_borders(window: tauri::WebviewWindow) -> Result<(), String> {
    match window.hwnd() {
        #[cfg(target_os = "windows")]
        Ok(hwnd) => {
            use windows::Win32::{
                Graphics::Dwm::DwmExtendFrameIntoClientArea,
                UI::Controls::MARGINS,
                Foundation::HWND,
            };

            let margins = MARGINS {
                cxLeftWidth: 1,
                cxRightWidth: 1,
                cyTopHeight: 1,
                cyBottomHeight: 1,
            };

            unsafe {
                DwmExtendFrameIntoClientArea(HWND(hwnd.0 as isize), &margins).map_err(|err|
                    format!("Error: {:?}", err)
                )
            }
        }
        _ => Err("Unsupported platform".to_string()),
    }
}

#[tauri::command]
async fn set_window_borders_command(
    app: tauri::AppHandle,
    window_label: String
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_label) {
        set_window_borders(window)
    } else {
        Err("Window not found".to_string())
    }
}

async fn send_exit(app: &AppHandle) {
    let state = app.state::<SharedClient>();
    let mut client_guard = state.lock().await;
    let client = client_guard.as_mut().unwrap();
    client.disconnect_client(super_builder::DisconnectClientRequest {}).await.unwrap();
}

#[tauri::command]
async fn get_schema() -> Result<String, String> {
    let schema = include_str!(concat!(env!("OUT_DIR"), "/schema.json"));
    Ok(schema.to_string())
}

#[tauri::command]
fn open_in_explorer(path: &str) -> Result<(), String> {
    Command::new("explorer")
        .arg(path)
        .spawn()
        .map_err(|e| format!("Failed to open path in Explorer: {}", e))?;
    Ok(())
}

#[tauri::command]
fn open_file_and_return_as_base64(filename: String) -> Result<String, String> {
    let path = Path::new(&filename);
    let display = path.display();
    let file = match fs::read(path) {
        Ok(file) => file,
        Err(why) => panic!("couldn't open {}: {}", display, why),
    };

    // Load the image from the file
    let img = ImageReader::new(Cursor::new(file))
        .with_guessed_format()
        .map_err(|e| format!("Failed to read image: {}", e))?
        .decode()
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    let max_width = 48;
    let max_height = 48;
    // Check the image dimensions
    let (width, height) = img.dimensions();
    let resized_img = if width > max_width || height > max_height {
        println!(
            "Resizing image to fit within {w}x{h} while preserving aspect ratio",
            w = max_width,
            h = max_height
        );

        // Calculate scaling factor
        let scale = (max_width as f32) / (width.max(height) as f32);

        // Calculate new dimensions
        let new_width = ((width as f32) * scale).round() as u32;
        let new_height = ((height as f32) * scale).round() as u32;

        // Resize the image while keeping aspect ratio
        img.resize(new_width, new_height, FilterType::Lanczos3)
    } else {
        // Use the original image if it's already small enough
        img
    };

    // Encode the resized image to base64
    let mut buf = Vec::new();
    let mut cursor = Cursor::new(&mut buf);
    resized_img
        .write_to(&mut cursor, image::ImageFormat::from_extension("png").unwrap())
        .map_err(|e| format!("Failed to write image to buffer: {}", e))?;
    let base64 = STANDARD.encode(buf);

    Ok(base64)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[tokio::main]
pub async fn run() {
    let client = initialize_client().await;

    let app = tauri::Builder
        ::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            set_window_borders(window).unwrap();
            Ok(())
        })
        .manage(client)
        .invoke_handler(
            tauri::generate_handler![
                get_system_language,
                call_chat,
                check_openvino_model,
                connect_client,
                get_config,
                remove_file,
                mw_say_hello,
                download_file,
                llm_health_check,
                upload_file,
                send_feedback,
                get_missing_models,
                path_exists,
                get_file_list,
                pyllm_say_hello,
                stop_chat,
                stop_upload_file,
                update_notification,
                set_window_borders_command,
                open_in_explorer,
                set_assistant_view_model,
                get_chat_history,
                remove_session,
                send_email,
                set_models,
                update_db_models,
                set_parameters,
                load_models,
                convert_model,
                upload_model,
                set_session_name,
                open_file_and_return_as_base64,
                set_user_config_view_model,
                get_schema,
                import_user_config,
                export_user_config,
                remove_model,
                get_mcp_agents,
                get_active_mcp_agents,
                add_mcp_agent,
                edit_mcp_agent,
                remove_mcp_agent,
                start_mcp_agent,
                stop_mcp_agent,
                get_mcp_servers,
                add_mcp_server,
                edit_mcp_server,
                remove_mcp_server,
                start_mcp_server,
                stop_mcp_server,
                get_active_mcp_servers,
                get_mcp_server_tools,
                validate_model,
            ]
        )
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    // Start lightweight localhost HTTP server for external messages (PoC)
    let app_handle = app.handle();
    tokio::spawn(start_external_server(app_handle.clone()));

    app.run(|app, event| {
        match event {
            tauri::RunEvent::ExitRequested { .. } => {
                futures::executor::block_on(send_exit(app));
            }
            _ => {}
        }
    });
}

// Removed legacy file-based chat logging; chat history is accessed via middleware APIs.

#[derive(Clone)]
struct HttpState {
    app_handle: AppHandle,
}

#[derive(AxumDeserialize)]
struct ExternalMessagePayload {
    text: String,
    #[allow(dead_code)]
    #[serde(default)]
    chatId: Option<i32>,
}

#[derive(AxumDeserialize)]
struct ChatHistoryQuery {
    #[serde(default)]
    sid: Option<i32>,
}

async fn healthz_handler() -> (AxumStatusCode, AxumJson<serde_json::Value>) {
    (AxumStatusCode::OK, AxumJson(serde_json::json!({"ok": true})))
}

async fn external_message_handler(
    AxumState(state): AxumState<HttpState>,
    AxumJson(payload): AxumJson<ExternalMessagePayload>,
) -> (AxumStatusCode, AxumJson<serde_json::Value>) {
    if payload.text.trim().is_empty() {
        return (
            AxumStatusCode::BAD_REQUEST,
            AxumJson(serde_json::json!({"error": "text is required"})),
        );
    }

    // Emit to renderer; UI will listen for "external_prompt"
    let _ = state
        .app_handle
        .emit("external_prompt", serde_json::json!({
            "text": payload.text,
            "chatId": payload.chatId,
        }));

    (
        AxumStatusCode::ACCEPTED,
        AxumJson(serde_json::json!({"status": "queued"})),
    )
}

async fn chat_history_handler(
    AxumState(state): AxumState<HttpState>,
    AxumQuery(params): AxumQuery<ChatHistoryQuery>,
) -> (AxumStatusCode, AxumJson<serde_json::Value>) {
    // Access shared gRPC client from Tauri state
    let shared_client = state
        .app_handle
        .state::<SharedClient>()
        .inner()
        .clone();

    let mut guard = shared_client.lock().await;

    let client_ref = match guard.as_mut() {
        Some(c) => c,
        None => {
            return (
                AxumStatusCode::SERVICE_UNAVAILABLE,
                AxumJson(serde_json::json!({"error": "client not initialized"})),
            );
        }
    };

    let request = super_builder::GetChatHistoryRequest {};
    let response = match client_ref.get_chat_history(request).await {
        Ok(r) => r,
        Err(e) => {
            return (
                AxumStatusCode::BAD_GATEWAY,
                AxumJson(serde_json::json!({"error": format!("grpc error: {}", e)})),
            );
        }
    };

    let data = response.into_inner().data;
    let mut value: serde_json::Value = match serde_json::from_str(&data) {
        Ok(v) => v,
        Err(e) => {
            return (
                AxumStatusCode::INTERNAL_SERVER_ERROR,
                AxumJson(serde_json::json!({"error": format!("invalid json: {}", e)})),
            );
        }
    };

    if let Some(target_sid) = params.sid {
        // Filter array by sid if provided
        if let serde_json::Value::Array(arr) = value {
            let filtered: Vec<serde_json::Value> = arr
                .into_iter()
                .filter(|s| s.get("sid").and_then(|v| v.as_i64()).map(|v| v as i32 == target_sid).unwrap_or(false))
                .collect();
            value = serde_json::Value::Array(filtered);
        }
    }

    (AxumStatusCode::OK, AxumJson(value))
}

async fn start_external_server(app_handle: AppHandle) {
    let state = HttpState { app_handle };

    let router = Router::new()
        .route("/healthz", get(healthz_handler))
        .route("/external-message", post(external_message_handler))
        .route("/chat-history", get(chat_history_handler))
        .with_state(state);

    let addr: SocketAddr = "127.0.0.1:6225".parse().unwrap();

    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("[external-server] Failed to bind 127.0.0.1:6225: {e}");
            return;
        }
    };

    if let Err(e) = axum::serve(listener, router).await {
        eprintln!("[external-server] HTTP server error: {e}");
    }
}
