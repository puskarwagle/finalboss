<script lang="ts">
    import { invoke } from "@tauri-apps/api/core"

    let name = $state("");
    let greetMsg = $state("");

    let output = $state<string[]>([]);

    // File operations test variables
    let filename = $state("");
    let fileContent = $state("");
    let writeResult = $state("");
    let readResult = $state("");
    let sourceFile = $state("");
    let destinationFile = $state("");
    let copyResult = $state("");
    let oldName = $state("");
    let newName = $state("");
    let renameResult = $state("");
    let deleteFile = $state("");
    let deleteResult = $state("");
    let dirName = $state("");
    let dirResult = $state("");
    let metadataFile = $state("");
    let metadataResult = $state("");
    let existsFile = $state("");
    let existsResult = $state("");

    async function greet(event: Event) {
        event.preventDefault();
        greetMsg = await invoke("greet", { name });
    }

    async function readDirectory(path: string) {
        output = await invoke<string[]>("list_files", { path });
    }

    async function writeFile(event: Event) {
        event.preventDefault();
        try {
            writeResult = await invoke<string>("write_file_async", { 
                filename: filename,
                content: fileContent 
            });
        } catch (error) {
            writeResult = `Error: ${error}`;
        }
    }

    async function readFile(event: Event) {
        event.preventDefault();
        try {
            readResult = await invoke<string>("read_file_async", { 
                filename: filename 
            });
        } catch (error) {
            readResult = `Error: ${error}`;
        }
    }

    async function copyFile(event: Event) {
        event.preventDefault();
        try {
            copyResult = await invoke<string>("copy_file_async", { 
                source: sourceFile,
                destination: destinationFile 
            });
        } catch (error) {
            copyResult = `Error: ${error}`;
        }
    }

    async function renameFile(event: Event) {
        event.preventDefault();
        try {
            renameResult = await invoke<string>("rename_file_async", { 
                oldName: oldName,
                newName: newName 
            });
        } catch (error) {
            renameResult = `Error: ${error}`;
        }
    }

    async function deleteFileFunc(event: Event) {
        event.preventDefault();
        try {
            deleteResult = await invoke<string>("delete_file_async", { 
                filename: deleteFile 
            });
        } catch (error) {
            deleteResult = `Error: ${error}`;
        }
    }

    async function createDirectory(event: Event) {
        event.preventDefault();
        try {
            dirResult = await invoke<string>("create_directory_async", { 
                dirname: dirName 
            });
        } catch (error) {
            dirResult = `Error: ${error}`;
        }
    }

    async function getMetadata(event: Event) {
        event.preventDefault();
        try {
            metadataResult = await invoke<string>("get_file_metadata_async", { 
                filename: metadataFile 
            });
        } catch (error) {
            metadataResult = `Error: ${error}`;
        }
    }

    async function checkExists(event: Event) {
        event.preventDefault();
        try {
            const exists = await invoke<boolean>("file_exists_async", { 
                filename: existsFile 
            });
            existsResult = `File ${existsFile} ${exists ? 'EXISTS' : 'DOES NOT EXIST'}`;
        } catch (error) {
            existsResult = `Error: ${error}`;
        }
    }

</script>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');

    .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem;
        font-family: 'Orbitron', monospace;
        color: #00ff00;
        min-height: calc(100vh - 120px);
    }

    .title {
        font-size: 2.5rem;
        font-weight: 900;
        color: #00ff00;
        text-align: center;
        margin-bottom: 3rem;
        text-transform: uppercase;
        letter-spacing: 0.2em;
        text-shadow: 0 0 20px #00ff0050;
    }

    .test-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 2rem;
        margin-bottom: 3rem;
    }

    .test-card {
        background: linear-gradient(135deg, #001100, #003300);
        border: 2px solid #00ff00;
        border-radius: 12px;
        padding: 2rem;
        transition: all 0.3s ease;
    }

    .test-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(0, 255, 0, 0.3);
        border-color: #00ffff;
    }

    .card-title {
        font-size: 1.2rem;
        font-weight: 700;
        color: #00ffff;
        margin-bottom: 1.5rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        text-align: center;
    }

    .form-row {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
        align-items: stretch;
    }

    .form-column {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin-bottom: 1rem;
    }

    input {
        flex: 1;
        padding: 0.75rem;
        background: #001100;
        border: 1px solid #00ff00;
        border-radius: 6px;
        color: #00ff00;
        font-family: 'Orbitron', monospace;
        font-size: 0.9rem;
    }

    textarea {
        width: 100%;
        padding: 0.75rem;
        background: #001100;
        border: 1px solid #00ff00;
        border-radius: 6px;
        color: #00ff00;
        font-family: 'Orbitron', monospace;
        font-size: 0.9rem;
        resize: vertical;
        min-height: 80px;
    }

    input::placeholder,
    textarea::placeholder {
        color: #00cc00;
        opacity: 0.7;
    }

    input:focus,
    textarea:focus {
        outline: none;
        border-color: #00ffff;
        box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
    }

    button {
        padding: 0.75rem 1.5rem;
        background: linear-gradient(45deg, #00ff00, #00ffff);
        color: #000;
        border: none;
        border-radius: 6px;
        font-family: 'Orbitron', monospace;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        cursor: pointer;
        transition: all 0.3s ease;
        min-width: 100px;
    }

    button:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(0, 255, 255, 0.4);
    }

    .result-box {
        margin-top: 1rem;
        padding: 1rem;
        background: #000;
        border: 1px solid #00ff00;
        border-radius: 6px;
        min-height: 3rem;
        font-family: 'Orbitron', monospace;
        font-size: 0.9rem;
        color: #00cc00;
        max-height: 200px;
        overflow-y: auto;
    }

    .directory-results {
        margin-top: 1rem;
        max-height: 300px;
        overflow-y: auto;
    }

    .file-item {
        padding: 0.5rem;
        margin: 0.25rem 0;
        background: #000;
        border: 1px solid #00aa00;
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 0.8rem;
        transition: all 0.2s ease;
    }

    .file-item:hover {
        background: #001100;
        border-color: #00ffff;
    }

    .empty-state {
        color: #00aa00;
        font-style: italic;
        text-align: center;
        padding: 2rem;
    }

    /* Scrollbar styling */
    ::-webkit-scrollbar {
        width: 8px;
    }

    ::-webkit-scrollbar-track {
        background: #001100;
        border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb {
        background: #00ff00;
        border-radius: 4px;
    }

    ::-webkit-scrollbar-thumb:hover {
        background: #00ffff;
    }
</style>

<div class="container">
    <h1 class="title">🧪 Test Functions</h1>
    
    <div class="test-grid">
        <!-- Greet Function Test -->
        <div class="test-card">
            <h2 class="card-title">🤖 Greet Function</h2>
            <form class="form-row" onsubmit={greet}>
                <input
                    id="greet-input"
                    type="text"
                    placeholder="Enter your name"
                    bind:value={name}
                />
                <button type="submit">Greet</button>
            </form>
            <div class="result-box">
                {greetMsg || "No greeting yet..."}
            </div>
        </div>

        <!-- Directory Reader Test -->
        <div class="test-card">
            <h2 class="card-title">📂 Directory Reader</h2>
            
            <button onclick={() => readDirectory("/home/wagle/finalboss")}>Read Directory</button>
            
            <div class="directory-results">
                {#if output.length > 0}
                    {#each output as item}
                        <div class="file-item">{item}</div>
                    {/each}
                {:else}
                    <div class="empty-state">No directory contents to display</div>
                {/if}
            </div>
        </div>

        <!-- File Writer Test -->
        <div class="test-card">
            <h2 class="card-title">📝 File Writer</h2>
            <form class="form-column" onsubmit={writeFile}>
                <input
                    type="text"
                    placeholder="Enter filename (e.g., test.txt)"
                    bind:value={filename}
                />
                <textarea
                    placeholder="Enter file content..."
                    bind:value={fileContent}
                ></textarea>
                <button type="submit">Write File</button>
            </form>
            <div class="result-box">
                {writeResult || "No file written yet..."}
            </div>
        </div>

        <!-- File Reader Test -->
        <div class="test-card">
            <h2 class="card-title">📖 File Reader</h2>
            <form class="form-column" onsubmit={readFile}>
                <input
                    type="text"
                    placeholder="Enter filename to read"
                    bind:value={filename}
                />
                <button type="submit">Read File</button>
            </form>
            <div class="result-box">
                {readResult || "No file read yet..."}
            </div>
        </div>

        <!-- File Copy Test -->
        <div class="test-card">
            <h2 class="card-title">📋 File Copier</h2>
            <form class="form-column" onsubmit={copyFile}>
                <input
                    type="text"
                    placeholder="Source file path"
                    bind:value={sourceFile}
                />
                <input
                    type="text"
                    placeholder="Destination file path"
                    bind:value={destinationFile}
                />
                <button type="submit">Copy File</button>
            </form>
            <div class="result-box">
                {copyResult || "No file copied yet..."}
            </div>
        </div>

        <!-- File Rename Test -->
        <div class="test-card">
            <h2 class="card-title">🔄 File Renamer</h2>
            <form class="form-column" onsubmit={renameFile}>
                <input
                    type="text"
                    placeholder="Current filename"
                    bind:value={oldName}
                />
                <input
                    type="text"
                    placeholder="New filename"
                    bind:value={newName}
                />
                <button type="submit">Rename File</button>
            </form>
            <div class="result-box">
                {renameResult || "No file renamed yet..."}
            </div>
        </div>

        <!-- File Delete Test -->
        <div class="test-card">
            <h2 class="card-title">🗑️ File Deleter</h2>
            <form class="form-column" onsubmit={deleteFileFunc}>
                <input
                    type="text"
                    placeholder="File to delete"
                    bind:value={deleteFile}
                />
                <button type="submit" style="background: linear-gradient(45deg, #ff0000, #ff6600);">Delete File</button>
            </form>
            <div class="result-box">
                {deleteResult || "No file deleted yet..."}
            </div>
        </div>

        <!-- Directory Creator Test -->
        <div class="test-card">
            <h2 class="card-title">📁 Directory Creator</h2>
            <form class="form-column" onsubmit={createDirectory}>
                <input
                    type="text"
                    placeholder="Directory path to create"
                    bind:value={dirName}
                />
                <button type="submit">Create Directory</button>
            </form>
            <div class="result-box">
                {dirResult || "No directory created yet..."}
            </div>
        </div>

        <!-- File Metadata Test -->
        <div class="test-card">
            <h2 class="card-title">📊 File Metadata</h2>
            <form class="form-column" onsubmit={getMetadata}>
                <input
                    type="text"
                    placeholder="File path for metadata"
                    bind:value={metadataFile}
                />
                <button type="submit">Get Metadata</button>
            </form>
            <div class="result-box">
                {metadataResult || "No metadata retrieved yet..."}
            </div>
        </div>

        <!-- File Exists Check -->
        <div class="test-card">
            <h2 class="card-title">🔍 File Exists Check</h2>
            <form class="form-column" onsubmit={checkExists}>
                <input
                    type="text"
                    placeholder="File path to check"
                    bind:value={existsFile}
                />
                <button type="submit">Check Exists</button>
            </form>
            <div class="result-box">
                {existsResult || "No existence check yet..."}
            </div>
        </div>
    </div>
</div>