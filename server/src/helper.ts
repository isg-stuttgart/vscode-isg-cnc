import { URI } from 'vscode-uri';


/**
 * @returns a markdown string that contains a clickable command uri to open the documentation with the given id
 */
export function getCommandUriToOpenDocu(id: string | undefined): string {
  if (!id) {
    return "";
  }
  const commandUri = URI.parse(`command:isg-cnc.openDocuWithId?${encodeURIComponent(JSON.stringify([id]))}`);
  return commandUri.toString();
}