import * as vscode from 'vscode';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
    console.log('Dreyze AI Agent is now active!');

    const provider = new DreyzeAIChatViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(DreyzeAIChatViewProvider.viewType, provider)
    );

    let disposable = vscode.commands.registerCommand('dreyze-ai.startAgent', () => {
        vscode.commands.executeCommand('workbench.view.extension.dreyze-ai-sidebar');
    });

    context.subscriptions.push(disposable);
}

class DreyzeAIChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'dreyze-ai.chatView';
    private _view?: vscode.WebviewView;

    // Use the same API endpoint from the backend
    private apiUrl = 'https://api.vibecode-claude.online/v1/chat/completions';
    private apiKey = ''; // User will configure this in settings or UI

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };
        webviewView.webview.html = this._getHtmlForWebview();

        webviewView.webview.onDidReceiveMessage(async (data) => {
            if (data.type === 'setApiKey') {
                this.apiKey = data.value;
                vscode.window.showInformationMessage('Dreyze AI: API Ключ сохранен!');
                return;
            }

            if (data.type === 'sendMessage') {
                if (!this.apiKey) {
                    this._view?.webview.postMessage({ type: 'receiveMessage', value: 'Пожалуйста, укажите API ключ (sk-...) перед началом.', role: 'error' });
                    return;
                }

                const userMessage = data.value;
                this._view?.webview.postMessage({ type: 'receiveMessage', value: 'Обдумываю и пишу код...', role: 'system' });
                
                try {
                    await this._handleAgentInteraction(userMessage);
                } catch (error: any) {
                    this._view?.webview.postMessage({ type: 'receiveMessage', value: `Ошибка: ${error.message}`, role: 'error' });
                }
            }
        });
    }

    private async _handleAgentInteraction(userMessage: string) {
        // Gather Workspace Context
        let workspaceContext = "No workspace opened.";
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const folder = vscode.workspace.workspaceFolders[0].uri;
            // Get list of top level files for context
            const files = await vscode.workspace.fs.readDirectory(folder);
            workspaceContext = `Workspace files: ${files.map(f => f[0]).join(', ')}`;
        }

        const systemPrompt = `Ты — Dreyze AI Agent, встроенный в IDE Dreyze Code. 
Твоя задача — помогать писать код, планировать архитектуру и изменять файлы.
Текущий контекст рабочей области: ${workspaceContext}

Если пользователь просит тебя создать или изменить файл, ты должен вернуть ответ строго в формате JSON, обернутом в блок кода \`\`\`json.
Формат JSON:
{
  "action": "edit",
  "files": [
    {
      "path": "относительный путь к файлу, например src/main.js",
      "content": "полный новый код файла"
    }
  ],
  "message": "Сообщение для пользователя о том, что ты сделал"
}

Если менять файлы не нужно, отвечай обычным текстом.`;

        const response = await axios.post(this.apiUrl, {
            model: "opus 4.5", // Using the default model from ai_service.py
            messages: [
                { role: "system", "content": systemPrompt },
                { role: "user", "content": userMessage }
            ],
            temperature: 0.7
        }, {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`,
                "HTTP-Referer": "https://dreyzfarid.online",
                "X-Title": "Dreyze Code Agent"
            }
        });

        const aiText = response.data.choices[0].message.content;
        
        // Parse agent response for JSON file edits
        const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
            try {
                const command = JSON.parse(jsonMatch[1]);
                if (command.action === 'edit' && command.files) {
                    for (const file of command.files) {
                        const wsPath = vscode.workspace.workspaceFolders?.[0].uri;
                        if (wsPath) {
                            const fileUri = vscode.Uri.joinPath(wsPath, file.path);
                            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(file.content, 'utf8'));
                        }
                    }
                    this._view?.webview.postMessage({ type: 'receiveMessage', value: command.message || "Файлы успешно изменены!", role: 'agent' });
                    return;
                }
            } catch (e) {
                console.error("Agent JSON parse error", e);
            }
        }

        // Standard text response
        this._view?.webview.postMessage({ type: 'receiveMessage', value: aiText, role: 'agent' });
    }

    private _getHtmlForWebview() {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Dreyze AI</title>
                <style>
                    body { font-family: var(--vscode-font-family); padding: 10px; color: var(--vscode-foreground); display: flex; flex-direction: column; height: 100vh; margin: 0; box-sizing: border-box;}
                    .header { padding-bottom: 10px; border-bottom: 1px solid var(--vscode-panel-border); margin-bottom: 10px; }
                    .chat-box { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-bottom: 10px;}
                    .message { padding: 8px 12px; border-radius: 6px; max-width: 90%; word-wrap: break-word; }
                    .message.user { background: var(--vscode-button-background); color: var(--vscode-button-foreground); align-self: flex-end; }
                    .message.agent { background: var(--vscode-editor-inactiveSelectionBackground); align-self: flex-start; }
                    .message.system { color: var(--vscode-descriptionForeground); font-size: 11px; align-self: center; background: transparent; }
                    .message.error { color: var(--vscode-errorForeground); align-self: center; background: transparent; font-weight: bold;}
                    .input-box { display: flex; flex-direction: column; gap: 5px; margin-top: auto;}
                    .row { display: flex; gap: 5px; }
                    input { flex: 1; padding: 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 4px; }
                    button { padding: 8px 12px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer; }
                    button:hover { background: var(--vscode-button-hoverBackground); }
                    .api-key-box { display: flex; gap: 5px; margin-bottom: 10px;}
                </style>
            </head>
            <body>
                <div class="header">
                    <h3 style="margin: 0 0 10px 0;">Dreyze AI Agent</h3>
                    <div class="api-key-box">
                        <input type="password" id="apiKey" placeholder="API Key (sk-...)" />
                        <button id="saveKey">💾</button>
                    </div>
                </div>
                
                <div class="chat-box" id="chat">
                    <div class="message agent">Привет! Я встроенный ИИ-агент Dreyze. Укажите ваш API ключ сверху, и я смогу читать файлы проекта и писать код прямо в вашем редакторе!</div>
                </div>
                <div class="input-box">
                    <div class="row">
                        <input type="text" id="prompt" placeholder="Создай файл index.html с..." />
                        <button id="send">▶</button>
                    </div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const chat = document.getElementById('chat');
                    const prompt = document.getElementById('prompt');
                    const sendBtn = document.getElementById('send');
                    const apiKeyInput = document.getElementById('apiKey');
                    const saveKeyBtn = document.getElementById('saveKey');

                    saveKeyBtn.addEventListener('click', () => {
                        const key = apiKeyInput.value.trim();
                        if (key) {
                            vscode.postMessage({ type: 'setApiKey', value: key });
                            apiKeyInput.placeholder = 'API Key сохранен';
                            apiKeyInput.value = '';
                        }
                    });

                    function addMessage(text, role) {
                        const msg = document.createElement('div');
                        msg.className = 'message ' + role;
                        msg.innerText = text;
                        chat.appendChild(msg);
                        chat.scrollTop = chat.scrollHeight;
                    }

                    sendBtn.addEventListener('click', () => {
                        const text = prompt.value.trim();
                        if (!text) return;
                        addMessage(text, 'user');
                        vscode.postMessage({ type: 'sendMessage', value: text });
                        prompt.value = '';
                    });
                    
                    prompt.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') sendBtn.click();
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.type === 'receiveMessage') {
                            addMessage(message.value, message.role);
                        }
                    });
                </script>
            </body>
            </html>`;
    }
}

export function deactivate() {}
