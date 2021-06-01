# ISG CNC (vscode-isg-cnc README)  [![Deploy Extension](https://github.com/isg-stuttgart/vscode-isg-cnc/actions/workflows/main.yml/badge.svg?branch=master)](https://github.com/isg-stuttgart/vscode-isg-cnc/actions/workflows/main.yml)

This extension for [Visual Studio Code](https://code.visualstudio.com/) should help you write nc code for the ISG CNC kernel.
We support syntax highlighting, snippets and many more features.\
The keyboard bindings can be changed at the keyboard preferences.\
For keyboard preferences press `CTRL+SHIFT+P` and type keyboard. Select Preferences: Open Keyboard Shortcuts.
Now you can search for isg-cnc to find or change shortcuts.\
After pressing `CTRL+SHIFT+P` you can also type ISG-CNC to find all exported commands for this extension.
You can choose special color themes ISG-CNC Light and Dark by pressing F1 and type theme, select Preferences: Color Theme.
The documentation for ISG-CNC start with or without selection.\
If text is selected the documentation will opened with search results in the documentation.

## Features

- Syntax highlighting
- Code completion
- Add and remove blocknumbers
- Find technology like T, F, S commands
- Show and jump to fileoffset
- Open documentation in browser
- Light and dark color theme for ISG CNC language

## Requirements

Visual Studio Code V1.46.0 or higher

## License

See license in file LICENSE

## Installation

For details look at the project [wiki](https://github.com/isg-stuttgart/vscode-isg-cnc/wiki).

## Extension Settings

There are some settings to prepare the extension. The Browser path and the ISG documentation path must be set correctly. You can easily change it at the extensionsettings.

This extension contributes the following settings with default values (json format, Settings must be seperated by comma):

- Path to the browser to open the documentation on windows systems. (Standard browser: Firefox)\
  `"isg-cnc.browser-windows": "C:\\Program Files\\Mozilla Firefox\\firefox.exe"`

- Path to the browser to open the documentation on linux systems. (Standard browser: Firefox)\
  `"isg-cnc.browser-linux": "/usr/bin/firefox"`

- Path to the ISG documentation\
  `"isg-cnc.documentation": "https://www.isg-stuttgart.de/kernel-html5/"`

- Choose the language (en-GB, de-DE ...)\
  `"isg-cnc.locale": "de-DE"`

- Enable/Disable Outputchannel\
  `"isg-cnc.outputchannel": false`

## Known Issues

Please find and report issues on [git issues](https://github.com/isg-stuttgart/vscode-isg-cnc/issues).

## Release Notes

For release notes see [changlog.md](CHANGELOG.md).

## Trademarks

The license does not grant permission to use the trade names, trademarks, service marks, logos or product names of ISG Industrielle Steuerungstechnik GmbH,
except as required for reasonable and customary use in describing the origin of the work and reproducing the content of any notice file.
All other brand names, product names, or trademarks belong to their respective holders.
ISG is not responsible for typographical or graphical errors that may appear in this document.
