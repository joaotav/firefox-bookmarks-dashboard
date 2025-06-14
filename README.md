# Firefox Bookmarks Dashboard

A modern, dark-themed bookmarks dashboard that replaces your new tab page in Firefox. This extension provides a beautiful and functional way to organize and access your bookmarks.

## Features

- Modern dark theme with high contrast
- Card-based layout for bookmarks and folders
- Drag-and-drop support for organizing bookmarks
- Collapsible bookmark folders
- Add/remove bookmarks and folders
- Rename folders
- Responsive design

## Installation

1. Clone this repository or download the source code
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on"
5. Navigate to the extension directory and select the `manifest.json` file

## Usage

- The dashboard will automatically appear when you open a new tab
- Click the ➕ button in a folder to add a new bookmark
- Click the ✖ button to remove a bookmark or folder
- Click and drag bookmarks to move them between folders
- Click the ▼/▶ button to collapse/expand a folder
- Click on a bookmark to open it in a new tab
- Click on a folder title to rename it

## Development

The extension is built using vanilla JavaScript and CSS. The main components are:

- `manifest.json`: Extension configuration
- `newtab.html`: The new tab page template
- `dashboard.js`: Core functionality for managing bookmarks
- `styles.css`: Styling for the dashboard
- `background.js`: Background script for initialization

## License

MIT License 