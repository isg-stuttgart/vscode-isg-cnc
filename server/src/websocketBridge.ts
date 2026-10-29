#!/usr/bin/env node
import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { createConnection, createStreamConnection } from 'vscode-ws-jsonrpc/server';
import { WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc/socket';
import { WebSocketServer } from 'ws';

// Use a custom server path when the language server is installed outside this package.
const serverEntry = process.env.ISG_LSP_SERVER_JS
  ? path.resolve(process.env.ISG_LSP_SERVER_JS)
  : path.join(__dirname, 'server.js');

// These settings control where browser clients can connect. Keep the default local-only.
const host = process.env.ISG_LSP_HOST ?? '127.0.0.1';
const port = Number(process.env.ISG_LSP_PORT ?? '30000');
const webSocketServer = new WebSocketServer({ host, port, path: '/isg-cnc' });

webSocketServer.on('connection', (socket) => {
  // Adapt the WebSocket library to the reader/writer interface used by JSON-RPC.
  const adapter = {
    send(content: string) {
      socket.send(content);
    },
    onMessage(callback: (message: string) => void) {
      socket.on('message', (data) => callback(data.toString()));
    },
    onError(callback: (error: Error) => void) {
      socket.on('error', callback);
    },
    onClose(callback: (code: number, reason: string) => void) {
      socket.on('close', (code, reason) => callback(code, reason.toString()));
    },
    dispose() {
      socket.terminate();
    },
  };

  // Read and write Language Server Protocol (LSP) messages on the browser connection.
  const clientConnection = createConnection(
    new WebSocketMessageReader(adapter),
    new WebSocketMessageWriter(adapter),
    () => socket.close()
  );

  // Run one language-server process for this browser client. LSP messages travel
  // through the process's stdin and stdout; stderr remains available for diagnostics.
  const serverProcess = spawn(process.execPath, [serverEntry, '--stdio'], {
    cwd: path.dirname(serverEntry),
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: false,
  });

  // Turn the server process streams into a JSON-RPC connection, like the WebSocket above.
  const serverConnection = createStreamConnection(serverProcess.stdout!, serverProcess.stdin!, () => serverProcess.kill());

  // Keep server diagnostics visible in the terminal running this bridge.
  serverProcess.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(`ISG-CNC LSP: ${data.toString()}`);
  });
  serverProcess.on('error', (error) => {
    process.stderr.write(`Could not start ISG-CNC language server: ${error.message}\n`);
    socket.close();
  });
  // Close the browser connection if its language-server process exits.
  serverProcess.on('exit', () => socket.close());
  // Stop the child process when the browser disconnects.
  socket.on('close', () => serverProcess.kill());

  // Forward every LSP message in both directions without changing its contents.
  clientConnection.reader.listen((message) => serverConnection.writer.write(message));
  serverConnection.reader.listen((message) => clientConnection.writer.write(message));
  serverConnection.onClose?.(() => clientConnection.dispose());
});

// This confirms that the bridge is ready to accept browser connections.
webSocketServer.on('listening', () => {
  console.log(`ISG-CNC LSP bridge listening on ws://${host}:${port}/isg-cnc`);
});

// Report startup failures, such as a port already being in use.
webSocketServer.on('error', (error) => {
  console.error(`ISG-CNC LSP bridge failed: ${error.message}`);
  process.exitCode = 1;
});

function closeBridge(): void {
  webSocketServer.close();
}

// Shut down cleanly when the process receives Ctrl+C or a termination signal.
process.once('SIGINT', closeBridge);
process.once('SIGTERM', closeBridge);
