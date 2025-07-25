# Change Log

All notable changes to the "vscode-isg-cnc" extension will be documented in this file

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

Types of changes:

- Added for new features.
- Changed for changes in existing functionality.
- Deprecated for soon-to-be removed features.
- Removed for now removed features.
- Fixed for any bug fixes.
- Security in case of vulnerabilities.

## [Unreleased]

## [V1.2.0]

### Added

- Hover information for calls of self-defined subrograms/cycles based on program comments above their definition [Issue #155](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/155)
- Update CNC-cycles hovering and snippets informations. [Issue #160](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/160)

### Fixed

- Fix add blocknumbers bug for adding block number in front of program name line and in some multilines.  [Issue #158](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/158)

## [V1.1.0]

### Added

- Snippet-Completion for ISG-Cycle-Calls and their parameters [Issue #91](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/91)
- Hover-Information for ISG-Cycle-Calls and their parameters [Issue #91](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/91)
- Command to switch between single and multi line cycle call snippets [Issue #91](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/91)
- Syntax highlighting for `#START`, `#LOCK`and `#UNLOCK` commands and `V.I.`-Variables [Issue #151](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/151)
- Command to jump into the selected file at the optionally selected offset [Issue #149](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/149)

## [V1.0.0]

### Added

- Mocha tests for the client and server side of the extension [Issue #137](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/137)
- Possibility to define if adding blocknumbers should include numbering of comments
- Command to align line comments in a selected range [Issue # 138](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/138)

### Fixed

- Different fixes/improvements on adding/removing blocknumbers regarding comments, blocknumber labels and other special cases
- Fixes/Improvments on references/definitions for variables

### Removed

- Removed the decrypt command because of new security EU-guidelines
  
## [V0.4.6]

### Fixed

- Correction of npm dependencies because language server crash at startup.

## [V0.4.5]

### Added

- Command to change the language mode of a selected file or directory. This can be found in the context menu of the explorer (not in the ISG Command Submenu). [Issue #132](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/132)

### Fixed

- Language server now properly checks for the file association by glob patterns instead of only be able to handle file extensions[Issue #132](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/132)

## [V0.4.4]

### Added

- Language icon for "isg-cnc", "isg-list" and "isg-cnc-cycle-error"
- Multi-root-workspace support for language server features (Go To Definition and Go To References) [Issue #117](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/117)
- .isg-cnc-ignore to ignore paths (files/directories) while searching for references/definitions

### Fixed

- V.CYC variables have not been included in the grammar for self defined local variables but now are [Issue #119](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/119)
- Cancel file parsing when taking too long. Show Progress of Referencing Searching to User. Skip non CNC-associated files while searching references.
[Issue #124](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/124)
- Use String-based (instead parser-based) search for variables. This is needed because of an incomplete grammar. [Issue #120](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/120)

## [V0.4.3]

### Added

- Adding "Go To Definition" feature for program calls, goto-statements and self-defined variables (last one only rudimentary) [Issue #90](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/90)
- Adding "Go To References" feature for program calls, goto-statements and self-defined variables (last one only rudimentary) [Issue #108](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/108)

### Fixed

- Sidebar showed some wrong information because of grammar bugs [Issue #104](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/104)
- Sidebar uses the name of the called programs instead of the whole calling-string for higlighting and grouping [Issue #114](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/114)

## [V0.4.2]

### Added

- Align equal signs in selected range via command [Issue #29](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/29)
- Formatting by default VSCode standard, old command for beautifying was removed [Issue #99](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/99)

### Fixed

- Fix/Improve "Add Blocknumbers" especially for skip lines [Issue #76](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/76)
- Sidebar works for all files which vscode associates with CNC language, not only typical endings [Issue #92](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/92)

## [V0.4.0]

### Added

- Added region folding [Pull #73](https://github.com/isg-stuttgart/vscode-isg-cnc/pull/73)
- "Format Code" command now indents multilines
- Autogenerate github pages at push to main branch
- Filter option to either show grouped or line-by-line sorting of matches in sidebar [Pull #79](https://github.com/isg-stuttgart/vscode-isg-cnc/pull/79)

### Fixed

- Sidebar cuts off all matches over 500 to prevent performance issues [Pull #74](https://github.com/isg-stuttgart/vscode-isg-cnc/pull/74)
- Reinclude fixed docu feature [Issue #58](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/58)
- Add toLowerCase for nc file detection
- Improved performance of sidebar [Issue #52](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/52)
- Sidebar activates works with other cnc-file-extensions than ".nc" [Pull #70](https://github.com/isg-stuttgart/vscode-isg-cnc/pull/70)

## [V0.3.4]

### Fixed

- Remove docu feature to fix corrupt version V0.3.3. [Issue #56](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/56)

## [V0.3.3]

### Fixed

- Building the extension won't contain required .js files because they don't land in the outDir. [Issue #54](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/54)

## [V0.3.0]

### Added

- Sidebar feature to show important passages (at the moment: Tool calls and Program calls) of the currently opened NC-file. [Issue #27](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/17)
- Added feature to encrypt/decrypt any file (or especially the currently opened file) via command. [Issue #16](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/16)

### Fixed

- Fix open ISG-Documentation per command [Issue #19 reported by georgulbrich-isg](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/19) and [Issue #31 reported by jurekseverin-isg](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/31)
- Fix lack of usability in the Extension Configuration-Settings (default browser and language) [Issue #32 reported by jurekseverin-isg](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/32) and [Issue #33 reported by jurekseverin-isg](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/33)
- Fix bug, where Error occured when calling ISG-commands while no .nc-file is opened [Issue #30 reported by jurekseverin-isg](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/30)

## [V0.2.8]

### Added

### Fixed

- Fix syntax highlighting for .lis files after change to standard scopes in themes. [Issue #26 reported by lukashettler-isg](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/26)

## [V0.2.7]

### Added

- Add function to search for all toolcalls

### Fixed

- Added standard scopes for syntax highlighting to use more themes than isg themes [Issue #18 reported by mpacher](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/18)
- Fix syntax highlighting for nc MOD operator
- Fix folding for lines with NC-block number [Issue #23 reported by lukashettler](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/23)

## [V0.2.6]

### Added

- #RT CYCLE command [Issue #12 reported by lukashettler](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/12)
- SYN snippet after #WAIT and #SIGNAL command [Issue #12 reported by lukashettler](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/12)
- Add 'U','V','W' to syntax highlighting coordinates
- Added galleryBanner in package.json

### Fixed

- Syntax highlighting of coordinates with '+' (e.g. X+10) [Issue #12 reported by lukashettler](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/12)
- Syntax highlighting of SYN after #WAIT and #SIGNAL command [Issue #12 reported by lukashettler](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/12)

## [V0.2.5]

### Added

- Added NC labels to syntax highlighting
- Added extension documentation
- Added visual studio code market and open vsx registry to the action main.yml

### Fixed

- Fixed startnumber for adding blocknumbers didnt work
- Fixed adding or renumber blocknumbers in conjunction with nc labels
- Fixed format code issue. Sometimes the current position was wrong calculated
- Fixed format code issue. Formating in conjunction with blocknumbers [Issue #10 reported by AurelWM](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/10)

## [V0.2.4]

### Added

- Added snippets for isg cnc cycle error definition files

### Fixed

- Fixed format code, add blocknumbers, remove blocknumbers function for nc labels (example N10:) [Issue #6 reported by AurelWM](https://github.com/isg-stuttgart/vscode-isg-cnc/issues/6)
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
[V1.2.0]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V1.1.0...V1.2.0
[V1.1.0]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V1.0.0...V1.1.0
[V1.0.0]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.4.6...V1.0.0
[V0.4.6]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.4.5...V0.4.6
[V0.4.5]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.4.4...V0.4.5
[V0.4.4]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.4.3...V0.4.4
[V0.4.3]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.4.2...V0.4.3
[V0.4.2]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.4.2...V0.4.0
[V0.4.0]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.4.0...V0.3.5
[V0.3.5]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.3.4...V0.3.5
[V0.3.4]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.3.3...V0.3.4
[V0.3.3]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.3.0...V0.3.3
[V0.3.0]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.2.8...V0.3.0
[V0.2.8]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.2.7...V0.2.8
[V0.2.7]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.2.6...V0.2.7
[V0.2.6]: https://github.com/isg-stuttgart/vscode-isg-cnc/compare/V0.2.5...V0.2.6
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
