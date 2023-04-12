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
import * as parser from './parserGlue';
import { Position } from './parserClasses';
import * as config from './config';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;
let rootPath: string | null;
let workspaceFolderUris: string[] | null = null;

interface MyLanguageSettings {
	fileExtensions: string[];
}

connection.onInitialize(async (params: InitializeParams) => {
	const capabilities = params.capabilities;

	// save rootPath and convert it to normal fs-path
	rootPath = params.rootUri;
	workspaceFolderUris = params.workspaceFolders?.map(wF => wF.uri) || null;
	if (rootPath) {
		rootPath = fileURLToPath(rootPath);
	}

	// Fetch workspace configuration and set languageIDs
	/* const config = await connection.workspace.getConfiguration();
	const fileConfig = config.get('files');
	config.updateFileEndings(fileConfig); */

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	hasConfigurationCapability = !!(
		capabilities.workspace && !!capabilities.workspace.configuration
	);
	hasWorkspaceFolderCapability = !!(
		capabilities.workspace && !!capabilities.workspace.workspaceFolders
	);
	hasDiagnosticRelatedInformationCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			definitionProvider: true,
			referencesProvider: true
		}
	};

	return result;
});

connection.onInitialized(() => {
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
			workspaceFolderUris = workspaceFolderUris.filter(folderUri => !removedUris.some(removed => removed === folderUri));
		});
	}
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
		return parser.getDefinition(text, position, docPos.textDocument.uri, getRootPaths());
	} catch (error) {
		console.error(error);
	}
});

/** Provides the "Go to References" functionality. Returns the locations of the references fitting to the specified position, null when no reference found. */
connection.onReferences((docPos) => {
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
		return parser.getReferences(text, position, docPos.textDocument.uri, getRootPaths(), openFiles);
	} catch (error) {
		console.error(error);
	}
});

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

/**
 * Fetches the workspace configuration and updates the languageIDs associated with the cnc language.
 */
connection.onDidChangeConfiguration(async () => {
	const workspaceConfig = await connection.workspace.getConfiguration();
	const fileConfig = workspaceConfig['files'];
	config.updateFileEndings(fileConfig);
});


