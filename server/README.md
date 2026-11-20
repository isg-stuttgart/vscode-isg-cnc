# CNC Language Server

This package builds the ISG-CNC Node language server and a WebSocket bridge for browser-based LSP clients.

```sh
npm install
npm run build
npm start
```

The bridge listens on `ws://127.0.0.1:30000/isg-cnc` by default and starts one stdio language-server process per connected client. Configure `ISG_LSP_HOST` and `ISG_LSP_PORT` to change the bind address and port.

Install the server's dependencies before packaging. `npm pack` runs the build and creates a distributable tarball containing the runtime dependencies and their license files. The tarball can be installed without registry access, for example with `npm install --offline --no-audit <path-to-tarball>`. Creating the tarball requires the build dependencies to be available. The optional native `ws` performance extensions are not included.

After installing the package in a Node application, start the bridge with `npx --no-install isg-cnc-language-server`. The browser client connects to the configured bridge URL. This first package targets single-file browser sessions; workspace-wide file access is future work.

The default bind address is loopback-only. Before exposing the bridge to a network, deploy it behind authenticated TLS and restrict allowed origins and clients.
