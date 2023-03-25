import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	TextDocumentSyncKind,
	InitializeResult
} from 'vscode-languageserver/node';
import { fileURLToPath } from 'node:url';
import {
	TextDocument
} from 'vscode-languageserver-textdocument';
import * as parser from './parserGlue';
import { Position } from './parserClasses';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;
let rootPath: string | null;
connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// save rootPath and convert it to normal fs-path
	rootPath = params.rootUri;
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
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		if (item.data === 1) {
			item.detail = 'TypeScript details';
			item.documentation = 'TypeScript documentation';
		} else if (item.data === 2) {
			item.detail = 'JavaScript details';
			item.documentation = 'JavaScript documentation';
		}
		return item;
	}
);

/** Provides the "Go to Definition" functionality. Returns the location of the definition fitting to the specified position, null when no definition found. */
connection.onDefinition((docPos) => {
	try {
		const textDocument = documents.get(docPos.textDocument.uri);
		if (!textDocument) {
			return null;
		}
		const text = textDocument.getText();
		const position: Position = docPos.position;
		return parser.getDefinition(text, position, docPos.textDocument.uri, rootPath);
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
		return parser.getReferences(text, position, docPos.textDocument.uri, rootPath, openFiles);
	} catch (error) {
		console.error(error);
	}
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();


