import * as vscode from 'vscode';

export async function changeLanguageModeForWeb(inputUri?: vscode.Uri, languageId?: string): Promise<boolean> {
    const uri = inputUri ?? vscode.window.activeTextEditor?.document.uri;
    if (!uri) {
        void vscode.window.showErrorMessage('No file/folder selected.');
        return false;
    }

    try {
        const stat = await vscode.workspace.fs.stat(uri);
        let globPattern = uri.fsPath.replace(/\\/g, '/').replace(/\/$/, '');
        if ((stat.type & vscode.FileType.Directory) !== 0) {
            globPattern = `${globPattern}/**`;
        }

        const languages = await vscode.languages.getLanguages();
        const selectedLanguage = languageId ?? await vscode.window.showQuickPick(languages, {
            placeHolder: 'Select language mode',
        });
        if (!selectedLanguage) {
            return false;
        }

        const filesConfiguration = vscode.workspace.getConfiguration('files');
        const currentAssociations = filesConfiguration.get<Record<string, string>>('associations', {});
        await filesConfiguration.update(
            'associations',
            { ...currentAssociations, [globPattern]: selectedLanguage },
            vscode.ConfigurationTarget.Workspace
        );
        return true;
    } catch (error) {
        void vscode.window.showErrorMessage(`Could not change language mode: ${error instanceof Error ? error.message : String(error)}`);
        return false;
    }
}