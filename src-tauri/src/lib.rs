use std::path::Path;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command(async)]
fn list_files(path: &str) -> Vec<String> {
    let path = Path::new(path);

    path.read_dir()
        .unwrap()
        .map(|entry| {
            entry.unwrap().file_name().to_str().unwrap().to_owned()
        })
        .collect::<Vec<String>>()
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
            get_file_metadata_async
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
