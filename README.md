# ![vscode-isg-cnc](/images/ISGCncEditor.png) ISG CNC (vscode-isg-cnc README)

This extension for [Visual Studio Code](https://code.visualstudio.com/) should help you write nc code for ISG CNC kernel.
We support syntax highlghting, snippets and many more features.\
The keyboard bindings can be changed at the keyboard preferences.\
For keyboard preferences press _F1_ and type keyboard. Select Preferences: Open Keyboard Shortcuts.
Now you can search for isg-cnc to find or change shortcuts.\
After pressing _F1_ you can also type ISG-CNC to find all exported commands for this extension.
You can choose special color themes ISG-CNC Light and Dark by pressing F1 and type theme, select Preferences: Color Theme.
The documentation for ISG-CNC start with or without selection.\
If text is selected the documentation will opened with search results in the documentation.

## Features

![Example 1](/images/nc.png) ![Example 2](/images/var.png) ![Example 3](/images/for.png)

## Requirements

There are no requirements.

## Installation

![Installation](images/install_steps_vscode.png)\
![Settings](images/settings_vscode.png)\
![ISG-CNC Settings](images/settings_vscode_isg_extension.png)

## Extension Settings

There are some settings to prepare the extension. The Browser path and the ISG documentation path must be set correctly. You can easily change it at the extensionsettings.

This extension contributes the following settings with default values (json format, Settings must be seperated by comma):

- Path to the browser to open the documentation. (Standard browser: Firefox)\
  `"isg-cnc.browser": "C:\\Program Files\\Mozilla Firefox\\firefox.exe"`

- Path to the ISG documentation\
  `"isg-cnc.documentation": "https://www.isg-stuttgart.de/kernel-html5/"`

- Choose the language (en-GB, de-DE ...)\
  `"isg-cnc.locale": "de-DE"`

- Enable/Disable Outputchannel\
  `"isg-cnc.outputchannel": false`

## Known Issues

Please find and report issues on [git issues](https://git/).

## Release Notes

For release notes see [changlog.md](CHANGELOG.md).

## Trademarks

The license does not grant permission to use the trade names, trademarks, service marks, logos or product names of ISG Industrielle Steuerungstechnik GmbH,
except as required for reasonable and customary use in describing the origin of the work and reproducing the content of any notice file.
All other brand names, product names, or trademarks belong to their respective holders.
ISG is not responsible for typographical or graphical errors that may appear in this document.

## Build package command

In case of building packages without online repository you have to overwrite baseContentUrl and baseImagesUrl:\
`vsce package --baseContentUrl https://none --baseImagesUrl https://none`
