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


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![greet, list_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
