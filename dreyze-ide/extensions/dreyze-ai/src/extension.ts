import * as vscode from 'vscode';
import axios from 'axios';

type ChatRole = 'system' | 'user' | 'assistant';
type ChatMessage = { role: ChatRole; content: string };

const SECRET_KEY = 'dreyze-ai.anymodelApiKey';
const HISTORY_KEY = 'dreyze-ai.agentHistory';
const MAX_HISTORY = 24;
const MAX_CONTEXT_CHARS = 24000;

const MODELS = [
	{ id: 'ag/claude-sonnet-4-6', label: 'Claude', provider: 'Anthropic' },
	{ id: 'am/qwen3.6-35b-a3b', label: 'Qwen', provider: 'Alibaba Cloud' },
	{ id: 'am/deepseek-v4-pro', label: 'DeepSeek', provider: 'DeepSeek' },
	{ id: 'glm/glm-5.1', label: 'GLM', provider: 'Zhipu AI' },
	{ id: 'xai/grok-code-fast-1', label: 'Grok', provider: 'xAI' },
	{ id: 'gc/gemini-2.5-flash', label: 'Gemini', provider: 'Google' },
	{ id: 'cx/gpt-5.6-sol', label: 'GPT', provider: 'OpenAI' },
	{ id: 'kmc/kimi-for-coding', label: 'Dreyze AI', provider: 'Kimi' },
];

export function activate(context: vscode.ExtensionContext) {
	const provider = new DreyzeAIChatViewProvider(context);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(DreyzeAIChatViewProvider.viewType, provider, {
			webviewOptions: { retainContextWhenHidden: true },
		}),
		vscode.commands.registerCommand('dreyze-ai.startAgent', () => {
			vscode.commands.executeCommand('workbench.view.extension.dreyze-ai-sidebar');
		}),
		vscode.commands.registerCommand('dreyze-ai.setApiKey', () => provider.setApiKey()),
		vscode.commands.registerCommand('dreyze-ai.clearContext', () => provider.clearContext())
	);
}

class DreyzeAIChatViewProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'dreyze-ai.chatView';

	private view?: vscode.WebviewView;
	private history: ChatMessage[];

	constructor(private readonly extensionContext: vscode.ExtensionContext) {
		this.history = extensionContext.workspaceState.get<ChatMessage[]>(HISTORY_KEY, []);
	}

	public async resolveWebviewView(webviewView: vscode.WebviewView) {
		this.view = webviewView;
		webviewView.webview.options = { enableScripts: true };
		webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
		webviewView.webview.onDidReceiveMessage((message) => this.handleWebviewMessage(message));
		await this.syncState();
	}

	public async setApiKey() {
		const key = await vscode.window.showInputBox({
			title: 'Dreyze AI AnyModel API Key',
			prompt: 'Введите AnyModel API key. Он сохранится в защищенном хранилище IDE.',
			password: true,
			ignoreFocusOut: true,
		});

		if (!key?.trim()) {
			return;
		}

		await this.extensionContext.secrets.store(SECRET_KEY, key.trim());
		await this.syncState();
		vscode.window.showInformationMessage('Dreyze AI: API ключ сохранен.');
	}

	public async clearContext() {
		this.history = [];
		await this.extensionContext.workspaceState.update(HISTORY_KEY, this.history);
		await this.syncState();
		vscode.window.showInformationMessage('Dreyze AI: контекст очищен.');
	}

	private async handleWebviewMessage(message: { type: string; [key: string]: unknown }) {
		try {
			if (message.type === 'setApiKey') {
				await this.setApiKey();
				return;
			}
			if (message.type === 'clear') {
				await this.clearContext();
				return;
			}
			if (message.type === 'attachActiveFile') {
				await this.attachActiveFile();
				return;
			}
			if (message.type === 'applyToActiveFile') {
				await this.applyToActiveFile(String(message.content ?? ''));
				return;
			}
			if (message.type === 'runCommand') {
				await this.runCommand(String(message.command ?? ''));
				return;
			}
			if (message.type === 'selectModel') {
				await vscode.workspace.getConfiguration('dreyze-ai').update('model', String(message.model), vscode.ConfigurationTarget.Global);
				return;
			}
			if (message.type === 'sendMessage') {
				await this.sendAgentMessage(String(message.value ?? ''), String(message.mode ?? 'agent'), String(message.model ?? ''));
			}
		} catch (error) {
			this.post({ type: 'error', value: error instanceof Error ? error.message : String(error) });
		}
	}

	private async sendAgentMessage(userMessage: string, mode: string, model: string) {
		const cleanMessage = userMessage.trim();
		if (!cleanMessage) {
			return;
		}

		const apiKey = await this.extensionContext.secrets.get(SECRET_KEY);
		if (!apiKey) {
			await this.setApiKey();
			return;
		}

		const selectedModel = this.resolveModel(model);
		const baseUrl = this.normalizeBaseUrl(vscode.workspace.getConfiguration('dreyze-ai').get<string>('baseUrl'));
		const workspaceContext = await this.buildWorkspaceContext(mode === 'plan');
		const systemPrompt = this.buildSystemPrompt(mode, workspaceContext);

		this.history.push({ role: 'user', content: cleanMessage });
		this.trimHistory();
		await this.persistHistory();
		this.post({ type: 'message', role: 'user', value: cleanMessage });
		this.post({ type: 'status', value: 'Dreyze AI думает...' });

		const messages: ChatMessage[] = [
			{ role: 'system', content: systemPrompt },
			...this.history.slice(-MAX_HISTORY),
		];

		const response = await axios.post(
			baseUrl,
			{
				model: selectedModel,
				messages,
				temperature: mode === 'plan' ? 0.35 : 0.2,
			},
			{
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`,
					'HTTP-Referer': 'https://dreyzfarid.online',
					'X-Title': 'Dreyze Code Agent',
				},
				timeout: 120000,
			}
		);

		const aiText = response.data?.choices?.[0]?.message?.content ?? '';
		if (!aiText) {
			throw new Error('AnyModel вернул пустой ответ.');
		}

		this.history.push({ role: 'assistant', content: aiText });
		this.trimHistory();
		await this.persistHistory();
		this.post({ type: 'message', role: 'assistant', value: aiText, actions: this.extractActions(aiText) });
		this.post({ type: 'status', value: '' });
	}

	private async attachActiveFile() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			this.post({ type: 'error', value: 'Откройте файл, который нужно добавить в контекст.' });
			return;
		}

		const relativePath = vscode.workspace.asRelativePath(editor.document.uri, false);
		const selection = editor.selection.isEmpty ? undefined : editor.document.getText(editor.selection);
		const content = selection ?? editor.document.getText();
		const clipped = content.slice(0, MAX_CONTEXT_CHARS);
		const contextText = `[Контекст файла: ${relativePath}${selection ? ', выделение' : ''}]\n${clipped}`;
		this.history.push({ role: 'user', content: contextText });
		this.trimHistory();
		await this.persistHistory();
		this.post({ type: 'message', role: 'system', value: `Добавлен контекст: ${relativePath}` });
	}

	private async applyToActiveFile(content: string) {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			this.post({ type: 'error', value: 'Нет активного файла для вставки кода.' });
			return;
		}

		const edit = new vscode.WorkspaceEdit();
		if (editor.selection.isEmpty) {
			edit.insert(editor.document.uri, editor.selection.active, content);
		} else {
			edit.replace(editor.document.uri, editor.selection, content);
		}
		await vscode.workspace.applyEdit(edit);
		await editor.document.save();
	}

	private async runCommand(command: string) {
		const cleanCommand = command.trim();
		if (!cleanCommand) {
			return;
		}
		const terminal = vscode.window.createTerminal({ name: 'Dreyze AI' });
		terminal.show();
		terminal.sendText(cleanCommand);
	}

	private async buildWorkspaceContext(fullTree: boolean): Promise<string> {
		const editor = vscode.window.activeTextEditor;
		const workspaceFolders = vscode.workspace.workspaceFolders;
		const root = workspaceFolders?.[0];
		const lines: string[] = [];

		if (root) {
			lines.push(`Workspace root: ${root.name}`);
			const files = await vscode.workspace.findFiles('**/*', '{**/node_modules/**,**/.git/**,**/out/**,**/dist/**,**/.next/**}', fullTree ? 80 : 35);
			lines.push(`Files: ${files.map((file) => vscode.workspace.asRelativePath(file, false)).join(', ') || 'no files found'}`);
		} else {
			lines.push('Workspace root: none');
		}

		if (editor) {
			const relativePath = vscode.workspace.asRelativePath(editor.document.uri, false);
			const selectedText = editor.selection.isEmpty ? '' : editor.document.getText(editor.selection);
			const activeText = selectedText || editor.document.getText();
			lines.push(`Active file: ${relativePath}`);
			lines.push(`Active ${selectedText ? 'selection' : 'file'} content:\n${activeText.slice(0, MAX_CONTEXT_CHARS)}`);
		}

		return lines.join('\n\n');
	}

	private buildSystemPrompt(mode: string, workspaceContext: string): string {
		const behavior = mode === 'plan'
			? 'Сначала составляй короткий план, затем указывай конкретные файлы и команды. Не меняй файлы сам без команды пользователя.'
			: 'Работай как coding agent: держи контекст диалога, объясняй план, пиши код, предлагай команды и явно отмечай, куда применить код.';

		return `Ты Dreyze AI Agent внутри Dreyze Code IDE.
${behavior}
Если нужно выполнить shell-команду, дай отдельный fenced block с языком shell.
Если нужно вставить код в активный файл, дай отдельный fenced block с подходящим языком.
Не проси пользователя повторять контекст, если он уже есть в истории.

Текущий контекст IDE:
${workspaceContext}`;
	}

	private extractActions(text: string) {
		const actions: { kind: 'command' | 'code'; label: string; value: string }[] = [];
		const blocks = text.matchAll(/```(\w+)?\n([\s\S]*?)```/g);
		for (const match of blocks) {
			const language = (match[1] ?? '').toLowerCase();
			const value = match[2].trim();
			if (!value) {
				continue;
			}
			if (['sh', 'shell', 'bash', 'zsh', 'powershell', 'cmd'].includes(language)) {
				actions.push({ kind: 'command', label: 'Выполнить команду', value });
			} else if (language && language !== 'text' && language !== 'markdown') {
				actions.push({ kind: 'code', label: 'Вставить в активный файл', value });
			}
		}
		return actions.slice(0, 6);
	}

	private resolveModel(model: string) {
		const configured = vscode.workspace.getConfiguration('dreyze-ai').get<string>('model') ?? 'kmc/kimi-for-coding';
		return MODELS.some((item) => item.id === model) ? model : configured;
	}

	private normalizeBaseUrl(baseUrl: string | undefined) {
		const cleanBaseUrl = (baseUrl || 'https://anymodel.org/v1').trim().replace(/\/$/, '');
		return cleanBaseUrl.endsWith('/chat/completions') ? cleanBaseUrl : `${cleanBaseUrl}/chat/completions`;
	}

	private trimHistory() {
		if (this.history.length > MAX_HISTORY) {
			this.history = this.history.slice(-MAX_HISTORY);
		}
	}

	private async persistHistory() {
		await this.extensionContext.workspaceState.update(HISTORY_KEY, this.history);
	}

	private async syncState() {
		this.post({
			type: 'state',
			hasApiKey: Boolean(await this.extensionContext.secrets.get(SECRET_KEY)),
			models: MODELS,
			model: vscode.workspace.getConfiguration('dreyze-ai').get<string>('model') ?? 'kmc/kimi-for-coding',
			history: this.history.filter((message) => !message.content.startsWith('[Контекст файла:')),
		});
	}

	private post(message: unknown) {
		this.view?.webview.postMessage(message);
	}

	private getHtmlForWebview(webview: vscode.Webview) {
		const nonce = getNonce();
		const csp = [
			"default-src 'none'",
			`style-src ${webview.cspSource} 'unsafe-inline'`,
			`script-src 'nonce-${nonce}'`,
		].join('; ');

		return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="${csp}">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Dreyze AI</title>
	<style>
		body { margin: 0; padding: 0; height: 100vh; color: var(--vscode-foreground); background: var(--vscode-sideBar-background); font-family: var(--vscode-font-family); }
		.app { height: 100vh; display: flex; flex-direction: column; }
		.header { padding: 10px 12px; border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border); display: flex; align-items: center; justify-content: space-between; gap: 8px; }
		.brand { font-weight: 700; font-size: 13px; }
		.status { color: var(--vscode-descriptionForeground); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.controls { padding: 10px 12px; display: grid; gap: 8px; border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border); }
		select, textarea, button { font: inherit; }
		select, textarea { width: 100%; box-sizing: border-box; color: var(--vscode-input-foreground); background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); border-radius: 4px; }
		select { height: 30px; padding: 0 8px; }
		.row { display: flex; gap: 6px; }
		button { border: 0; border-radius: 4px; padding: 7px 9px; cursor: pointer; color: var(--vscode-button-foreground); background: var(--vscode-button-background); }
		button.secondary { color: var(--vscode-button-secondaryForeground); background: var(--vscode-button-secondaryBackground); }
		button:hover { background: var(--vscode-button-hoverBackground); }
		button:disabled { opacity: .55; cursor: default; }
		.messages { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
		.message { white-space: pre-wrap; overflow-wrap: anywhere; border-radius: 6px; padding: 8px 10px; line-height: 1.45; border: 1px solid transparent; }
		.user { align-self: flex-end; max-width: 92%; background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
		.assistant { align-self: flex-start; max-width: 96%; background: var(--vscode-editor-inactiveSelectionBackground); }
		.system { align-self: center; max-width: 96%; color: var(--vscode-descriptionForeground); font-size: 12px; padding: 4px 0; }
		.error { align-self: center; max-width: 96%; color: var(--vscode-errorForeground); font-size: 12px; }
		pre { overflow-x: auto; background: var(--vscode-textCodeBlock-background); padding: 8px; border-radius: 4px; }
		.actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
		.composer { padding: 10px 12px; display: grid; gap: 8px; border-top: 1px solid var(--vscode-sideBarSectionHeader-border); }
		textarea { min-height: 74px; resize: vertical; padding: 8px; }
	</style>
</head>
<body>
	<div class="app">
		<div class="header">
			<div class="brand">Dreyze AI Agent</div>
			<div class="status" id="keyStatus">ключ не задан</div>
		</div>
		<div class="controls">
			<select id="model"></select>
			<select id="mode">
				<option value="agent">Agent: код и команды</option>
				<option value="plan">Plan: план без правок</option>
			</select>
			<div class="row">
				<button id="setKey">API key</button>
				<button class="secondary" id="attach">Файл</button>
				<button class="secondary" id="clear">Очистить</button>
			</div>
		</div>
		<div class="messages" id="messages"></div>
		<div class="composer">
			<textarea id="prompt" placeholder="Что сделать в проекте?"></textarea>
			<button id="send">Отправить</button>
		</div>
	</div>
	<script nonce="${nonce}">
		const vscode = acquireVsCodeApi();
		const modelSelect = document.getElementById('model');
		const modeSelect = document.getElementById('mode');
		const messages = document.getElementById('messages');
		const prompt = document.getElementById('prompt');
		const send = document.getElementById('send');
		const keyStatus = document.getElementById('keyStatus');

		document.getElementById('setKey').addEventListener('click', () => vscode.postMessage({ type: 'setApiKey' }));
		document.getElementById('attach').addEventListener('click', () => vscode.postMessage({ type: 'attachActiveFile' }));
		document.getElementById('clear').addEventListener('click', () => { messages.innerHTML = ''; vscode.postMessage({ type: 'clear' }); });
		modelSelect.addEventListener('change', () => vscode.postMessage({ type: 'selectModel', model: modelSelect.value }));
		send.addEventListener('click', submit);
		prompt.addEventListener('keydown', (event) => {
			if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submit();
		});

		function submit() {
			const value = prompt.value.trim();
			if (!value) return;
			send.disabled = true;
			vscode.postMessage({ type: 'sendMessage', value, mode: modeSelect.value, model: modelSelect.value });
			prompt.value = '';
		}

		function addMessage(role, value, actions) {
			const item = document.createElement('div');
			item.className = 'message ' + role;
			item.textContent = value;
			if (Array.isArray(actions) && actions.length) {
				const actionRow = document.createElement('div');
				actionRow.className = 'actions';
				actions.forEach((action) => {
					const button = document.createElement('button');
					button.className = 'secondary';
					button.textContent = action.label;
					button.addEventListener('click', () => {
						vscode.postMessage(action.kind === 'command'
							? { type: 'runCommand', command: action.value }
							: { type: 'applyToActiveFile', content: action.value });
					});
					actionRow.appendChild(button);
				});
				item.appendChild(actionRow);
			}
			messages.appendChild(item);
			messages.scrollTop = messages.scrollHeight;
		}

		window.addEventListener('message', (event) => {
			const message = event.data;
			if (message.type === 'state') {
				keyStatus.textContent = message.hasApiKey ? 'ключ сохранен' : 'ключ не задан';
				modelSelect.innerHTML = '';
				message.models.forEach((model) => {
					const option = document.createElement('option');
					option.value = model.id;
					option.textContent = model.label + ' - ' + model.provider;
					modelSelect.appendChild(option);
				});
				modelSelect.value = message.model;
				messages.innerHTML = '';
				message.history.forEach((item) => addMessage(item.role === 'assistant' ? 'assistant' : item.role, item.content));
			}
			if (message.type === 'message') addMessage(message.role, message.value, message.actions);
			if (message.type === 'status') { keyStatus.textContent = message.value || keyStatus.textContent; send.disabled = false; }
			if (message.type === 'error') { addMessage('error', message.value); send.disabled = false; }
		});
	</script>
</body>
</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

export function deactivate() {}
