use tauri::Emitter;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command(async)]
fn list_files(path: &str) -> Result<Vec<String>, String> {
    use std::env;

    // Resolve path from project root (same logic as read_file_async)
    let full_path = if path.starts_with("/") || (cfg!(windows) && path.len() > 1 && path.chars().nth(1) == Some(':')) {
        std::path::PathBuf::from(path)
    } else {
        let mut project_root = env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?;
        if project_root.ends_with("src-tauri") {
            project_root.pop();
        }
        project_root.join(path)
    };

    let entries = full_path.read_dir()
        .map_err(|e| format!("Failed to read directory {}: {}", full_path.display(), e))?
        .filter_map(|entry| {
            entry.ok().and_then(|e| {
                e.file_name().to_str().map(|s| s.to_owned())
            })
        })
        .collect::<Vec<String>>();

    Ok(entries)
}

#[tauri::command]
async fn write_file_async(filename: &str, content: &str) -> Result<String, String> {
    use tokio::fs;
    use std::env;
    
    // Get the current working directory and resolve relative paths
    let path = if filename.starts_with("/") || (cfg!(windows) && filename.len() > 1 && filename.chars().nth(1) == Some(':')) {
        // Absolute path
        std::path::PathBuf::from(filename)
    } else {
        // Relative path - resolve from project root
        let mut project_root = env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?;
        if project_root.ends_with("src-tauri") {
            project_root.pop(); // Go up one level if we're in src-tauri
        }
        project_root.join(filename)
    };
    
    // Create parent directories if they don't exist
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await.map_err(|e| format!("Failed to create parent directories: {}", e))?;
    }
    
    match fs::write(&path, content).await {
        Ok(_) => Ok(format!("Successfully wrote to {}", path.display())),
        Err(e) => Err(format!("Failed to write file: {}", e))
    }
}

#[tauri::command]
async fn read_file_async(filename: &str) -> Result<String, String> {
    use tokio::fs;
    use std::env;
    
    // Get the current working directory and resolve relative paths
    let path = if filename.starts_with("/") || (cfg!(windows) && filename.len() > 1 && filename.chars().nth(1) == Some(':')) {
        // Absolute path
        std::path::PathBuf::from(filename)
    } else {
        // Relative path - resolve from project root
        let mut project_root = env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?;
        if project_root.ends_with("src-tauri") {
            project_root.pop(); // Go up one level if we're in src-tauri
        }
        project_root.join(filename)
    };
    
    match fs::read_to_string(&path).await {
        Ok(content) => Ok(content),
        Err(e) => Err(format!("Failed to read file {}: {}", path.display(), e))
    }
}

#[tauri::command]
async fn copy_file_async(source: &str, destination: &str) -> Result<String, String> {
    use tokio::fs;
    
    match fs::copy(source, destination).await {
        Ok(bytes_copied) => Ok(format!("Successfully copied {} bytes from {} to {}", bytes_copied, source, destination)),
        Err(e) => Err(format!("Failed to copy file: {}", e))
    }
}

#[tauri::command]
async fn rename_file_async(old_name: &str, new_name: &str) -> Result<String, String> {
    use tokio::fs;
    
    match fs::rename(old_name, new_name).await {
        Ok(_) => Ok(format!("Successfully renamed {} to {}", old_name, new_name)),
        Err(e) => Err(format!("Failed to rename file: {}", e))
    }
}

#[tauri::command]
async fn delete_file_async(filename: &str) -> Result<String, String> {
    use tokio::fs;
    
    match fs::remove_file(filename).await {
        Ok(_) => Ok(format!("Successfully deleted {}", filename)),
        Err(e) => Err(format!("Failed to delete file: {}", e))
    }
}

#[tauri::command]
async fn create_directory_async(dirname: &str) -> Result<String, String> {
    use tokio::fs;
    use std::env;
    
    // Get the current working directory and resolve relative paths
    let path = if dirname.starts_with("/") || (cfg!(windows) && dirname.len() > 1 && dirname.chars().nth(1) == Some(':')) {
        // Absolute path
        std::path::PathBuf::from(dirname)
    } else {
        // Relative path - resolve from project root
        let mut project_root = env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?;
        if project_root.ends_with("src-tauri") {
            project_root.pop(); // Go up one level if we're in src-tauri
        }
        project_root.join(dirname)
    };
    
    match fs::create_dir_all(&path).await {
        Ok(_) => Ok(format!("Successfully created directory {}", path.display())),
        Err(e) => Err(format!("Failed to create directory: {}", e))
    }
}

#[tauri::command]
async fn remove_directory_async(dirname: &str) -> Result<String, String> {
    use tokio::fs;
    
    match fs::remove_dir_all(dirname).await {
        Ok(_) => Ok(format!("Successfully removed directory {}", dirname)),
        Err(e) => Err(format!("Failed to remove directory: {}", e))
    }
}

#[tauri::command]
async fn file_exists_async(filename: &str) -> Result<bool, String> {
    use tokio::fs;
    
    match fs::try_exists(filename).await {
        Ok(exists) => Ok(exists),
        Err(e) => Err(format!("Failed to check file existence: {}", e))
    }
}

#[tauri::command]
async fn get_file_metadata_async(filename: &str) -> Result<String, String> {
    use tokio::fs;
    
    match fs::metadata(filename).await {
        Ok(metadata) => {
            let info = format!(
                "File: {}\nSize: {} bytes\nIs file: {}\nIs directory: {}\nReadonly: {}\nModified: {:?}",
                filename,
                metadata.len(),
                metadata.is_file(),
                metadata.is_dir(),
                metadata.permissions().readonly(),
                metadata.modified()
            );
            Ok(info)
        },
        Err(e) => Err(format!("Failed to get metadata: {}", e))
    }
}

#[tauri::command]
async fn run_python_script(script_path: &str) -> Result<String, String> {
    use tokio::process::Command;
    use std::env;
    
    // Get the current working directory and resolve relative paths
    let path = if script_path.starts_with("/") || (cfg!(windows) && script_path.len() > 1 && script_path.chars().nth(1) == Some(':')) {
        // Absolute path
        std::path::PathBuf::from(script_path)
    } else {
        // Relative path - resolve from project root
        let mut project_root = env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?;
        if project_root.ends_with("src-tauri") {
            project_root.pop(); // Go up one level if we're in src-tauri
        }
        project_root.join(script_path)
    };
    
    // Check if the script exists
    if !path.exists() {
        return Err(format!("Python script not found: {}", path.display()));
    }
    
    // Run the Python script
    let output = Command::new("python3")
        .arg(path.to_str().unwrap())
        .current_dir({
            let mut dir = env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?;
            if dir.ends_with("src-tauri") {
                dir.pop(); // Go up one level if we're in src-tauri
            }
            dir
        })
        .output()
        .await
        .map_err(|e| format!("Failed to execute python script: {}", e))?;
    
    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        Ok(format!("Script executed successfully!\nOutput: {}\nErrors: {}", stdout, stderr))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Script execution failed with exit code: {}\nError: {}", output.status.code().unwrap_or(-1), stderr))
    }
}

#[tauri::command]
async fn run_javascript_script(script_path: &str, args: Option<Vec<String>>) -> Result<String, String> {
    use tokio::process::Command;
    use std::env;

    // Get the current working directory and resolve relative paths
    let path = if script_path.starts_with("/") || (cfg!(windows) && script_path.len() > 1 && script_path.chars().nth(1) == Some(':')) {
        // Absolute path
        std::path::PathBuf::from(script_path)
    } else {
        // Relative path - resolve from project root
        let mut project_root = env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?;
        if project_root.ends_with("src-tauri") {
            project_root.pop(); // Go up one level if we're in src-tauri
        }
        project_root.join(script_path)
    };

    // Check if the script exists
    if !path.exists() {
        return Err(format!("JavaScript script not found: {}", path.display()));
    }

    // Build command with arguments
    let mut cmd = Command::new("bun");
    cmd.arg(path.to_str().unwrap());

    // Add arguments if provided
    if let Some(args) = args {
        for arg in args {
            cmd.arg(&arg);
        }
    }

    let output = cmd
        .current_dir({
            let mut dir = env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?;
            if dir.ends_with("src-tauri") {
                dir.pop(); // Go up one level if we're in src-tauri
            }
            dir
        })
        .output()
        .await
        .map_err(|e| format!("Failed to execute javascript script with bun: {}", e))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        Ok(format!("Script executed successfully!\nOutput: {}\nErrors: {}", stdout, stderr))
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Script execution failed with exit code: {}\nError: {}", output.status.code().unwrap_or(-1), stderr))
    }
}

#[tauri::command]
async fn run_bot_streaming(
    app: tauri::AppHandle,
    bot_name: String
) -> Result<String, String> {
    use tokio::process::Command;
    use tokio::io::{BufReader, AsyncBufReadExt};
    use std::process::Stdio;
    use std::env;

    // Resolve project root
    let mut project_root = env::current_dir().map_err(|e| format!("Failed to get current directory: {}", e))?;
    if project_root.ends_with("src-tauri") {
        project_root.pop();
    }

    let script_path = project_root.join("src/bots/bot_starter.ts");

    if !script_path.exists() {
        return Err(format!("Bot starter script not found: {}", script_path.display()));
    }

    // Spawn bot process with piped stdout
    let mut child = Command::new("bun")
        .arg(script_path.to_str().unwrap())
        .arg(&bot_name)
        .current_dir(&project_root)
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit()) // Debug logs show in terminal
        .spawn()
        .map_err(|e| format!("Failed to spawn bot process: {}", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();

    // Clone app handle for use in async task (AppHandle is Clone)
    let app_clone = app.clone();

    // Spawn task to stream stdout lines as Tauri events
    tokio::spawn(async move {
        while let Ok(Some(line)) = lines.next_line().await {
            // Filter for structured events with [BOT_EVENT] prefix
            if line.starts_with("[BOT_EVENT]") {
                let json_str = &line[11..]; // Remove prefix
                if let Ok(event) = serde_json::from_str::<serde_json::Value>(json_str) {
                    // Emit to UI (using cloned app handle)
                    let _ = app_clone.emit("bot-progress", event);
                }
            }
            // All other lines are debug logs - ignored by UI
        }
    });

    // Wait for bot process to complete
    tokio::spawn(async move {
        let _ = child.wait().await;
    });

    Ok(format!("Bot '{}' started successfully", bot_name))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            list_files,
            write_file_async,
            read_file_async,
            copy_file_async,
            rename_file_async,
            delete_file_async,
            create_directory_async,
            remove_directory_async,
            file_exists_async,
            get_file_metadata_async,
            run_python_script,
            run_javascript_script,
            run_bot_streaming
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
