import { workspace, WorkspaceConfiguration } from "vscode";

class Config {
    private isgcncConfig: WorkspaceConfiguration;
    private vscodeConfig: WorkspaceConfiguration;

    constructor() {
        workspace.onDidChangeConfiguration((e) => this.reloadConfig());
        this.vscodeConfig = workspace.getConfiguration();
        this.isgcncConfig = workspace.getConfiguration("isg-cnc");
    }

    public getParam(param: string): any {
        return this.isgcncConfig.get(param);
    }

    public getVscodeParam(param: string): any {
        return this.vscodeConfig.get(param);
    }

    private reloadConfig() {
        this.vscodeConfig = workspace.getConfiguration();
        this.isgcncConfig = workspace.getConfiguration("isg-cnc");
    }
}

export const config = new Config();
