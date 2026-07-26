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

    private apiUrl = 'https://api.vibecode-claude.online/v1/chat/completions';
    private apiKey = '';
    private isLoggedIn = false;
    private accessToken = '';

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true, localResourceRoots: [this._extensionUri] };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            if (data.type === 'login') {
                try {
                    const response = await axios.post('https://dreyzfarid.online/api/auth/login', {
                        email: data.email,
                        password: data.password
                    });
                    this.accessToken = response.data.access_token;
                    this.isLoggedIn = true;
                    this._view?.webview.postMessage({ type: 'loginSuccess' });
                    vscode.window.showInformationMessage('Dreyze AI: Успешный вход!');
                } catch (error: any) {
                    this._view?.webview.postMessage({ type: 'loginError', message: 'Ошибка входа. Проверьте почту и пароль.' });
                }
                return;
            }

            if (data.type === 'setApiKey') {
                this.apiKey = data.value;
                vscode.window.showInformationMessage('Dreyze AI: API Ключ сохранен!');
                return;
            }

            if (data.type === 'sendMessage') {
                if (!this.isLoggedIn) {
                    this._view?.webview.postMessage({ type: 'receiveMessage', value: 'Пожалуйста, войдите в аккаунт перед началом.', role: 'error' });
                    return;
                }
                if (!this.apiKey) {
                    this._view?.webview.postMessage({ type: 'receiveMessage', value: 'Пожалуйста, укажите API ключ перед началом.', role: 'error' });
                    return;
                }

                const userMessage = data.value;
                const selectedModel = data.model;
                const selectedMode = data.mode;
                
                this._view?.webview.postMessage({ type: 'receiveMessage', value: 'Обдумываю...', role: 'system' });
                
                try {
                    await this._handleAgentInteraction(userMessage, selectedModel, selectedMode);
                } catch (error: any) {
                    this._view?.webview.postMessage({ type: 'receiveMessage', value: `Ошибка: ${error.message}`, role: 'error' });
                }
            }
        });
    }

    private async _handleAgentInteraction(userMessage: string, model: string, mode: string) {
        // Gather Workspace Context
        let workspaceContext = "No workspace opened.";
        if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
            const folder = vscode.workspace.workspaceFolders[0].uri;
            const files = await vscode.workspace.fs.readDirectory(folder);
            workspaceContext = `Workspace files: ${files.map(f => f[0]).join(', ')}`;
        }

        let systemPrompt = `Ты — Dreyze AI Agent, встроенный в IDE Dreyze Code.
Текущий контекст рабочей области: ${workspaceContext}\n`;

        if (mode === 'Planning') {
            systemPrompt += `РЕЖИМ ПЛАНИРОВАНИЯ: Твоя задача — составить подробный архитектурный план и шаги для реализации. НЕ генерируй JSON для изменения файлов, просто отвечай текстом и кодовыми блоками.`;
        } else {
            systemPrompt += `РЕЖИМ АГЕНТА: Твоя задача — писать код, изменять файлы и выполнять команды.
Если ты хочешь создать или изменить файл, ты ДОЛЖЕН вернуть ответ строго в формате JSON, обернутом в блок кода \`\`\`json.
Формат JSON:
{
  "action": "edit",
  "files": [
    {
      "path": "относительный путь к файлу, например src/main.js",
      "content": "полный новый код файла"
    }
  ],
  "message": "Сообщение для пользователя"
}
Если менять файлы не нужно, отвечай обычным текстом.`;
        }

        const response = await axios.post(this.apiUrl, {
            model: model,
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
        
        if (mode === 'Agent') {
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
        }

        this._view?.webview.postMessage({ type: 'receiveMessage', value: aiText, role: 'agent' });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        // Logo URI mapping
        // We assume the extension is at /root/project/dreyze-ide/extensions/dreyze-ai
        // The logo is at /root/project/logo/Photoroom_20260716_034127.PNG
        // We need to resolve the path securely for the webview.
        const logoUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, '..', '..', '..', 'logo', 'Photoroom_20260716_034127.PNG'));

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Dreyze AI</title>
                <style>
                    body { font-family: var(--vscode-font-family); padding: 0; color: var(--vscode-foreground); display: flex; flex-direction: column; height: 100vh; margin: 0; box-sizing: border-box;}
                    .logo-header { background: black; padding: 15px; text-align: center; border-bottom: 1px solid var(--vscode-panel-border); }
                    .logo-header img { max-width: 150px; height: auto; }
                    .content { padding: 15px; display: flex; flex-direction: column; flex: 1; overflow: hidden; }
                    
                    /* Auth Screen */
                    #auth-screen { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
                    .input-group { display: flex; flex-direction: column; gap: 5px; }
                    
                    /* Chat Screen */
                    #chat-screen { display: none; flex-direction: column; height: 100%; gap: 10px; }
                    .toolbar { display: flex; flex-direction: column; gap: 8px; padding-bottom: 10px; border-bottom: 1px solid var(--vscode-panel-border); }
                    .toolbar-row { display: flex; gap: 10px; }
                    .toolbar-row select { flex: 1; padding: 5px; background: var(--vscode-dropdown-background); color: var(--vscode-dropdown-foreground); border: 1px solid var(--vscode-dropdown-border); border-radius: 4px; }
                    .api-key-box { display: flex; gap: 5px; }
                    
                    .chat-box { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-bottom: 10px; margin-top: 10px;}
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
                    button:disabled { opacity: 0.5; cursor: not-allowed; }
                </style>
            </head>
            <body>
                <div class="logo-header">
                    <img src="${logoUri}" alt="Dreyze AI Logo" />
                </div>
                
                <div class="content">
                    <!-- Login Screen -->
                    <div id="auth-screen">
                        <h3 style="margin-top:0;">Вход в аккаунт</h3>
                        <p style="font-size: 12px; color: var(--vscode-descriptionForeground);">Для использования Dreyze AI войдите через ваш аккаунт dreyzfarid.online</p>
                        <div class="input-group">
                            <label>Email</label>
                            <input type="email" id="loginEmail" placeholder="user@example.com" />
                        </div>
                        <div class="input-group">
                            <label>Пароль</label>
                            <input type="password" id="loginPass" placeholder="••••••••" />
                        </div>
                        <button id="loginBtn" style="margin-top: 10px;">Войти</button>
                        <div id="loginError" style="color: var(--vscode-errorForeground); font-size: 12px; margin-top: 5px;"></div>
                    </div>

                    <!-- Chat Screen -->
                    <div id="chat-screen">
                        <div class="toolbar">
                            <div class="api-key-box">
                                <input type="password" id="apiKey" placeholder="API Key (sk-...)" />
                                <button id="saveKey">💾</button>
                            </div>
                            <div class="toolbar-row">
                                <select id="modelSelect">
                                    <option value="opus 4.6">Opus 4.6</option>
                                    <option value="sonnet 4.6">Sonnet 4.6</option>
                                    <option value="opus 4.5">Opus 4.5</option>
                                    <option value="sonnet 4.5">Sonnet 4.5</option>
                                </select>
                                <select id="modeSelect">
                                    <option value="Agent">Agent (Код & Файлы)</option>
                                    <option value="Planning">Planning (План)</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="chat-box" id="chat">
                            <div class="message agent">Привет! Я встроенный ИИ-агент Dreyze. Выберите модель, укажите API ключ и начнем работу!</div>
                        </div>
                        <div class="input-box">
                            <div class="row">
                                <input type="text" id="prompt" placeholder="Напиши код для..." />
                                <button id="send">▶</button>
                            </div>
                        </div>
                    </div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    
                    // Elements
                    const authScreen = document.getElementById('auth-screen');
                    const chatScreen = document.getElementById('chat-screen');
                    const loginBtn = document.getElementById('loginBtn');
                    const loginEmail = document.getElementById('loginEmail');
                    const loginPass = document.getElementById('loginPass');
                    const loginError = document.getElementById('loginError');
                    
                    const chat = document.getElementById('chat');
                    const prompt = document.getElementById('prompt');
                    const sendBtn = document.getElementById('send');
                    const apiKeyInput = document.getElementById('apiKey');
                    const saveKeyBtn = document.getElementById('saveKey');
                    const modelSelect = document.getElementById('modelSelect');
                    const modeSelect = document.getElementById('modeSelect');

                    // Auth Logic
                    loginBtn.addEventListener('click', () => {
                        const email = loginEmail.value.trim();
                        const password = loginPass.value.trim();
                        if (!email || !password) return;
                        
                        loginBtn.innerText = 'Вход...';
                        loginBtn.disabled = true;
                        loginError.innerText = '';
                        vscode.postMessage({ type: 'login', email, password });
                    });

                    // Settings Logic
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

                    // Chat Logic
                    sendBtn.addEventListener('click', () => {
                        const text = prompt.value.trim();
                        if (!text) return;
                        addMessage(text, 'user');
                        vscode.postMessage({ 
                            type: 'sendMessage', 
                            value: text,
                            model: modelSelect.value,
                            mode: modeSelect.value
                        });
                        prompt.value = '';
                    });
                    
                    prompt.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') sendBtn.click();
                    });

                    window.addEventListener('message', event => {
                        const message = event.data;
                        if (message.type === 'loginSuccess') {
                            authScreen.style.display = 'none';
                            chatScreen.style.display = 'flex';
                        } else if (message.type === 'loginError') {
                            loginBtn.innerText = 'Войти';
                            loginBtn.disabled = false;
                            loginError.innerText = message.message;
                        } else if (message.type === 'receiveMessage') {
                            addMessage(message.value, message.role);
                        }
                    });
                </script>
            </body>
            </html>`;
    }
}

export function deactivate() {}
