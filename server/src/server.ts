import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	TextDocumentSyncKind,
	InitializeResult
} from 'vscode-languageserver/node';
import { fileURLToPath } from 'node:url';
import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import * as parser from './getDefinitionAndReferences';
import { Position } from './parserClasses';
import * as config from './config';
import { getCompletions, updateStaticCycleCompletions, updateStaticGeneralCompletions } from './completion';
import { getHoverInformation } from './hover';
import { ParseResults } from './parsingResults';
// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let rootPath: string | null;
let workspaceFolderUris: string[] | null = null;

connection.onInitialize(async (params: InitializeParams) => {
	console.log("Initializing ISG-CNC Language Server");
	const capabilities = params.capabilities;

	// save rootPath and convert it to normal fs-path
	rootPath = params.rootUri;
	workspaceFolderUris = params.workspaceFolders?.map(wF => wF.uri) || null;
	if (rootPath) {
		rootPath = fileURLToPath(rootPath);
	}

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			definitionProvider: true,
			referencesProvider: true,
			completionProvider: {
				completionItem: {
					labelDetailsSupport: false
				},
				resolveProvider: false,
				triggerCharacters: ["=", "@", "\\", "[", "]", "(", ")"]
			},
			hoverProvider: true
		}
	};
	console.log("ISG-CNC Language Server initialized");
	return result;
});

connection.onInitialized(async () => {
	if (hasConfigurationCapability) {
		// Register for all configuration changes.
		connection.client.register(DidChangeConfigurationNotification.type, undefined);
	}
	// change workspace folders when getting notification from client
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			const addedUris = _event.added.map(folder => folder.uri);
			const removedUris = _event.removed.map(folder => folder.uri);
			// add new folders to workspaceFolders
			if (workspaceFolderUris) {
				workspaceFolderUris.push(...addedUris);
			} else {
				workspaceFolderUris = addedUris;
			}
			// remove folders from workspaceFolders
			workspaceFolderUris = workspaceFolderUris.filter(folderUri => !removedUris.includes(folderUri));
		});
	}
	await updateConfig();
	connection.window.showInformationMessage("ISG-CNC Language Server started.");
});

/** Provides the "Go to Definition" functionality. Returns the location of the definition fitting to the specified position, null when no definition found. */
connection.onDefinition((docPos) => {
	try {
		const textDocument = documents.get(docPos.textDocument.uri);
		if (!textDocument) {
			return null;
		}
		const text = textDocument.getText();
		const position: Position = docPos.position;
		return parser.getDefinition(new ParseResults(text), position, docPos.textDocument.uri, getRootPaths(), getOpenDocs()).definitionRanges;
	} catch (error) {
		console.error("Getting definition failed: " + JSON.stringify(error));
		connection.window.showErrorMessage("Getting definition failed: " + JSON.stringify(error));
	}
});

/** Provides the "Go to References" functionality. Returns the locations of the references fitting to the specified position, null when no reference found. */
connection.onReferences(async (docPos) => {
	try {
		const textDocument = documents.get(docPos.textDocument.uri);
		if (!textDocument) {
			return null;
		}
		const text = textDocument.getText();
		const position: Position = docPos.position;
		const openFiles = new Map<string, string>();
		const allDocs = documents.all();
		for (const doc of allDocs) {
			openFiles.set(doc.uri, doc.getText());
		}

		const references = parser.getReferences(text, position, docPos.textDocument.uri, getRootPaths(), openFiles, connection);
		return references;
	} catch (error) {
		console.error("Getting references failed: " + JSON.stringify(error));
		connection.window.showErrorMessage("Getting references failed: " + JSON.stringify(error));
	}
});

/**
 * Provides completion items with snippet insertion, based on the current position in the document.
 */
connection.onCompletion((docPos) => {
	try {
		const textDocument = documents.get(docPos.textDocument.uri);
		if (!textDocument) {
			return null;
		}
		const position: Position = docPos.position;
		return getCompletions(position, textDocument);
	} catch (error) {
		console.error("Getting completions failed: " + JSON.stringify(error));
		connection.window.showErrorMessage("Getting completions failed: " + JSON.stringify(error));
	}
});

/** Provides the "Hover" functionality. Returns the hover information fitting to the specified position.*/
connection.onHover((docPos) => {
	try {
		const textDocument = documents.get(docPos.textDocument.uri);
		if (!textDocument) {
			return null;
		}
		const position: Position = docPos.position;
		const openDocs = getOpenDocs();
		return getHoverInformation(position, textDocument, getRootPaths(), openDocs);
	} catch (error) {
		console.error("Getting hover information failed: " + JSON.stringify(error));
		connection.window.showErrorMessage("Getting hover information failed: " + JSON.stringify(error));
	}
});

function getOpenDocs(): Map<string, TextDocument> {
	const openDocs = new Map<string, TextDocument>();
	const allDocs = documents.all();
	for (const doc of allDocs) {
		openDocs.set(doc.uri, doc);
	}
	return openDocs;
}

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

/**
 * Returns the rootPaths of the workspace. 
 * If the workspace has multiple folders, the rootPaths are the paths of the folders. 
 * If the client did not provide worksspaceFolders the given rootPath is returned. 
 * If no folder is open, null is returned.
 * @returns rootPaths of the workspace
 */
function getRootPaths() {
	let rootPaths: string[] | null;
	if (workspaceFolderUris) {
		rootPaths = workspaceFolderUris.map(folder => fileURLToPath(folder));
	} else if (rootPath) {
		rootPaths = [rootPath];
	} else {
		rootPaths = null;
	}
	return rootPaths;
}


connection.onDidChangeConfiguration(async () => {
	await updateConfig();
});

/**
 * Fetches the workspace configuration and updates the languageIDs associated with the isg-cnc language.
 */
async function updateConfig() {
	// update settings
	const oldDocuPath = config.getDocumentationPathWithLocale();
	const oldCycleSnippetFormatting = config.getCycleSnippetFormatting();
	const oldExtensionForCycles = config.getExtensionForCycles();

	// update settings
	const workspaceConfig = await connection.workspace.getConfiguration();
	config.updateSettings(workspaceConfig);

	// if a setting, relevant for cycle settings is changed, update the cycle completions
	if (
		oldDocuPath !== config.getDocumentationPathWithLocale() ||
		oldCycleSnippetFormatting !== config.getCycleSnippetFormatting() ||
		oldExtensionForCycles !== config.getExtensionForCycles()
	) {
		updateStaticCycleCompletions();
	}
	// if docupath changed, update general completions
	if (oldDocuPath !== config.getDocumentationPathWithLocale()) {
		updateStaticGeneralCompletions();
	}
}


