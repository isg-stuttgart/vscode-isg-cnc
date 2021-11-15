# vscode-isg-cnc

## Getting started

### Installation

- Install Visual Studio Code first.
- Install the extension.

There are two ways to do that:  

1. You can install the extension in the Visual Studio Code extension manager by searching for isg-cnc.
1. If you dont have internet on the computer zou are want to install the extension you can download the vsix file and install Extension vscode-isg-cnc-<VERSIONNUMBER>.vsix (for example: vscode-isg-cnc-0.2.4.vsix) from Marketplaces.

Downloadlinks:  
[Visual Studio Code Marketplace - vscode-isg-cnc](https://marketplace.visualstudio.com/items?itemName=isg-cnc.vscode-isg-cnc&ssr=false#overview)  
[Open VSX Registry - vscode-isg-cnc](https://open-vsx.org/extension/isg-cnc/vscode-isg-cnc)  

Important: Doubleclick on vsix file didn't work! Install inside Visual Studio Code via **Visual Studio Code - Extensions - ... - Install from VSIX...**

### Configuration

After the installation you should select a color theme. You can choose isg-dark or isg-light so that the syntax highlighting is displayed correctly. Because we use our own scope names.  

#### Color Theme

- Choose your favorite color theme

![change color theme](https://github.com/isg-stuttgart/vscode-isg-cnc/blob/develop/images/vscode-isg-cnc-change-color-theme.png)

#### Common setting information

- You can change some more settings, the shown settings are the default settings:  

![settings](https://github.com/isg-stuttgart/vscode-isg-cnc/blob/develop/images/vscode-isg-cnc_settings.png)

- You can reset every setting by clicking the marked button and choose reset setting.  

![reset settings](https://github.com/isg-stuttgart/vscode-isg-cnc/blob/develop/images/vscode-isg-cnc_reset_setting.png)

#### Documentation settings
- Check the correct path to your documentation. [Default is ISG online documentation](https://www.isg-stuttgart.de/kernel-html5/)

![settings documentation](https://github.com/isg-stuttgart/vscode-isg-cnc/blob/develop/images/vscode-isg-cnc_documentation_settings.png)

- Check the correct path to your browser for linux or windows.

![settings browser](https://github.com/isg-stuttgart/vscode-isg-cnc/blob/develop/images/vscode-isg-cnc_browser_settings.png)

## FAQ

1. I have installed the extension, but the syntax highlighting is not correct. What can I do?  

- We use a separate scope namespace for syntax highlighting. Please set the color theme in the extension settings to isg-dark or isg-light.  
  [See also color theme settings](https://github.com/isg-stuttgart/vscode-isg-cnc/wiki#color-theme)
