import * as vscode from "vscode";
import { getEnableOutputchannel } from "./config";
const outputChannel = vscode.window.createOutputChannel("ISG-CNC");
vscode.workspace.onDidChangeConfiguration(() => {
    updateOutputchannel();
});
updateOutputchannel();

export function getISGCNCOutputChannel(): vscode.OutputChannel {
    return outputChannel;
}

export function printToOutputchannel(text: string): void {
    outputChannel.appendLine(text);
}

export function updateOutputchannel(): void {
    if (getEnableOutputchannel()) {
        outputChannel.show();
    } else {
        outputChannel.hide();
    }
}

export function disposeOutputchannel(): void {
    outputChannel.dispose();
}