# Change Log

All notable changes to the "vscode-isg-cnc" extension will be documented in this file

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file
Types of changes

    - Added for new features.
    - Changed for changes in existing functionality.
    - Deprecated for soon-to-be removed features.
    - Removed for now removed features.
    - Fixed for any bug fixes.
    - Security in case of vulnerabilities.

## [Unreleased]

## [V0.2.5]

### Added

- Added NC labels to syntax highlighting
- Added extension documentation
- Added visual studio code market and open vsx registry to the action main.yml

### Fixed

- Fixed startnumber for adding blocknumbers didnt work
- Fixed adding or renumber blocknumbers in conjunction with nc labels
- Fixed format code issue. Sometimes the current position was wrong calculated
- Fixed format code issue. Formating in conjunction with blocknumbers [Issue #10](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/10)

## [V0.2.4]

### Added

- Added snippets for isg cnc cycle error definition files

### Fixed

- Fixed format code, add blocknumbers, remove blocknumbers function for nc labels (example N10:) [Issue #6](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/6)
- Fixed typescript issues and namespace convention

### Removed

- Removed unused files
- Removed gitlab files

## [V0.2.3]

### Fixed

- Fixed aliases for language selection list. Now you can select CNC or List format
- Fixed some type warnings

### Added

- More Tags for the Marketplace

### Changed

- Simplified the StartDocu and GetContextbasedSite function to start browser with search url
- Example Url for the documentation setting
- IsNumeric return typ from any to number
- Color for numbers in the light theme for better reading

## [V0.2.2]

### Fixed

- PI detection for syntax highlighting
- Comment issues with parens in comment
- Syntax highlighting for comments with #COMMENT BEGIN and #COMMENT END (only blocknumbers and whitespaces are allowed before comment commands)
- Start of the isg cnc documentation on linux
- Typescript linting errors

## [V0.2.1]

### Changed

- Optimized syntax highlighting for parameter, value, comment
- Optimzed colors for better reading in dark and light theme

## [V0.2.0]

### Fixed

- Syntax highlighting for comments with "/\* \*/"
- Colors for light and dark theme for comments and values
- Parameter and value recognition in list files

## [V0.1.9]

### Added

- Support list files

## [V0.1.8]

### Added

- Finding non ASCII Characters

### Fixed

- Syntax highlighting for L CYCLE command

## [V0.1.7]

### Added

- Add document formating

## [V0.1.6]

### Added

- Recognize closing brackets for comments

### Fixed

- Powershell call opening documentation in browser

## [V0.1.5]

### Added

- Add #GANTRY commands

### Fixed

- Now recognizing commands with multiple whitespaces also

### Changed

- Extended DIST PROG START choice

## [V0.1.4]

### Fixed

- Wrong highlighting for line comment semicolon ";"

## [V0.1.3]

### Fixed

- Wrong highlighting for operators

### Changed

- Changed Keybinding to strg+i + second shortcut, because for example strg+s is colliding with file save

## [V0.1.2]

### Added

- Start with sourcecontrol git
- Add file offset info box

### Fixed

- Syntax highlighting extended to "\\b" for not detected words. Fixed constants detection

### Changed

- changed color schemes for constants to bold and italic
- Update dependencies
- Cleanup code and formatted
- Optimize and changed keybindings, because some similar keybindings blocked our keybindings

## V0.1.1

### Fixed

- Add/Replace block numbers

### Changed

- Change document variable from let to const

## V0.1.0

### Added

- Add missing highlighted commands

### Fixed

- Wrong highlighted commands

### Changed

- Better readable colors for light and dark theme

## V0.0.3

### Added

- Add hashtag commands
- Add context menu for isg-cnc documents

### Fixed

- Syntax highlighting failure
- #channel command snippet and highlighting

## V0.0.2

### Added

- Add snippets for all g-code and m-code
- Add extensions .plc and .sub
- Add images

### Changed

- Change README.md
- Change standard encoding to windows1252

### Fixed

- Adding missing hashtag commands
- G04 snippet
- First try to use utf-8, if this fails then change to windows-1252
- Add online documentation support
- Colorized document tag after variable
- (...\n will not be recognized as comment

## V0.0.1

- Adding color themes
- Initial release of the extension for testing

[Unreleased]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/main...develop
[V0.2.5]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.2.4...V0.2.5
[V0.2.4]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.2.3...V0.2.4
[V0.2.3]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.2.2...V0.2.3
[V0.2.2]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.2.1...V0.2.2
[V0.2.1]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.2.0...V0.2.1
[V0.2.0]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.1.9...V0.2.0
[V0.1.9]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.1.8...V0.1.9
[V0.1.8]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.1.7...V0.1.8
[V0.1.7]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.1.6...V0.1.7
[V0.1.6]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.1.5...V0.1.6
[V0.1.5]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.1.4...V0.1.5
[V0.1.4]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.1.3...V0.1.4
[V0.1.3]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.1.2...V0.1.3
[V0.1.2]: https://github.com/isg-stuttgart/vscode-isg-cnc/releases/tag/V0.1.2
