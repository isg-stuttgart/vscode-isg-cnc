import * as vscode from 'vscode';
import { alignComments, alignEqualSigns } from './util/aligning';
import { addBlocknumbersCommand, removeAllBlocknumbers } from './util/blockNumbers';
import { goToPosition, showCursorFileOffsetInfobox } from './util/editorOffset';
import { findAllToolCalls, findNextTFS } from './util/fileNavigation/findTFS';
import { highlightNonAsciiCharacters } from './util/fileNavigation/nonAscii';
import { openBrowserDocumentation } from './util/config/config';
import { jumpIntoFileAtOffsetForWeb } from './util/fileNavigation/fileOffsetBrowser';
import { changeLanguageModeForWeb } from './util/config/configCommandsBrowser';
import { addToIgnoreForWeb } from './util/config/ignoreFIleCommandsBrowser';

async function findAllToolCallsInBrowser(): Promise<boolean> {
  const availableCommands = await vscode.commands.getCommands(true);
  if (!availableCommands.includes('workbench.action.findInFiles')) {
    void vscode.window.showInformationMessage('Find all tool calls is not available in this Monaco workbench.');
    return false;
  }

  await findAllToolCalls();
  return true;
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'isg-cnc.AlignEqualSigns',
      (documentUri?: string, rangeArgs?: [number, number, number, number]) =>
        alignEqualSigns(documentUri, rangeArgs)
    ),
    vscode.commands.registerCommand('isg-cnc.AlignComments', () => alignComments()),
    vscode.commands.registerCommand('isg-cnc.FindAllToolCalls', () => findAllToolCallsInBrowser()),
    vscode.commands.registerCommand('isg-cnc.FindNextTFS', () => findNextTFS()),
    vscode.commands.registerCommand('isg-cnc.jumpIntoFileAtOffset', (fileUriOrPath?: string, offset?: number) =>
      jumpIntoFileAtOffsetForWeb(fileUriOrPath, offset)
    ),
    vscode.commands.registerCommand('isg-cnc.AddBlocknumbers', (start?: number, step?: number) => addBlocknumbersCommand(start, step)),
    vscode.commands.registerCommand('isg-cnc.RemoveAllBlocknumbers', () => removeAllBlocknumbers()),
    vscode.commands.registerCommand('isg-cnc.addToIgnore', (uri?: vscode.Uri) => addToIgnoreForWeb(uri)),
    vscode.commands.registerCommand('isg-cnc.changeLanguageMode', (uri?: vscode.Uri, languageId?: string) =>
      changeLanguageModeForWeb(uri, languageId)
    ),
    vscode.commands.registerCommand('isg-cnc.GoToPosition', (offset?: number) => goToPosition(offset)),
    vscode.commands.registerCommand('isg-cnc.changeCycleSnippetsToSingleLine', async () =>
      vscode.workspace.getConfiguration('isg-cnc').update(
        'cycleSnippetFormatting',
        'single-line',
        vscode.ConfigurationTarget.Workspace
      )
    ),
    vscode.commands.registerCommand('isg-cnc.ShowCursorFileOffsetInfobox', () => showCursorFileOffsetInfobox()),
    vscode.commands.registerCommand('isg-cnc.FindNonAsciiCharacters', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return 0;
      }
      const ranges = highlightNonAsciiCharacters(editor);
      void vscode.window.showInformationMessage(`${ranges.length} non-ASCII character range(s) highlighted.`);
      return ranges.length;
    }),
    vscode.commands.registerCommand('isg-cnc.StartDocu', () => openBrowserDocumentation()),
    vscode.commands.registerCommand('isg-cnc.openDocuWithId', (id: string) => openBrowserDocumentation(id)),
    vscode.commands.registerCommand('isg-cnc.changeCycleSnippetsToMultiLine', async () =>
      vscode.workspace.getConfiguration('isg-cnc').update(
        'cycleSnippetFormatting',
        'multi-line',
        vscode.ConfigurationTarget.Workspace
      )
    )
  );
}