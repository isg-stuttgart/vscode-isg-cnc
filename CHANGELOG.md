# Change Log

All notable changes to the "vscode-isg-cnc" extension will be documented in this file

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file

## [Unreleased]
- Recognize closing brackets for comments

### v0.1.6

- Fixed Powershell call opening documentation in browser

### v0.1.5

- Add #GANTRY commands
- Now recognizing commands with multiple whitespaces also
- Extended DIST PROG START choice

### v0.1.4

- Bugfix: Wrong highlighting for line comment semicolon ";"

### v0.1.3

- Bugfix: Wrong highlighting for operators
- Bugfix: Changed Keybinding to strg+i + second shortcut, because for example strg+s is colliding with file save

### v0.1.2

- changed color schemes for constants to bold and italic
- Bugfix: Syntax highlighting extended to "\\b" for not detected words. Fixed constants detection
- Update dependencies
- Cleanup code and formatted
- Optimize and changed keybindings, because some similar keybindings blocked our keybindings
- Add file offset info box

### v0.1.1

- Bugfix: Add/Replace block numbers
- Change document variable from let to const
- Increase version number

### V0.1.0

- Bugfix: wrong highlighted commands
- Bugfix: Add missing highlighted commands
- Better readable colors for light and dark theme

### V0.0.3

- Bugfix: Syntax highlighting failure
- Bugfix: #channel command snippet and highlighting
- Add context menu for isg-cnc documents
- Bugfix: Syntax Highlighting
- Add hashtag commands

### V0.0.2

- Bugfix: Adding missing hashtag commands
- Add images
- Change standard encoding to windows1252
- Bugfix: G04 snippet
- Change README.md
- Add snippets for all g-code and m-code
- Add extensions .plc and .sub
- Pre-Release version
- Bugfix: First try to use utf-8, if this fails then change to windows-1252
- Bugfix: Add online documentation support
- Bugfix: Colorized document tag after variable
- Bugfix: (...\n will not be recognized as comment

### V0.0.1

- Adding color themes
- Initial release of the extension for testing
