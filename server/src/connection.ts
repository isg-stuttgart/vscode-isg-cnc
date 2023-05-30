import { Connection } from "vscode-languageserver";

// Create a connection for the server, using Node's IPC as a transport.
let connection: Connection | null = null;

export function getConnection() {
    return connection;
}

export function setConnection(conn: Connection) {
    connection = conn;
}
