# Job Filter Chrome Extension

A Chrome extension that hides job postings from specific companies on LinkedIn and Indeed.

## Features

- **Easy Management**: Add and remove companies from your blocked list through a beautiful popup interface
- **Persistent Storage**: Your blocked companies list is saved and synced across devices
- **Real-time Filtering**: Jobs are filtered as soon as they appear on the page
- **Multiple Job Sites**: Works on LinkedIn Jobs and Indeed
- **Smart Matching**: Uses partial matching to catch variations in company names
- **Smooth Animations**: Jobs fade out smoothly when hidden

## Installation

1. **Download the Extension Files**
   - Download all files in this folder to your computer

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the folder containing these files

3. **Start Using**
   - Navigate to LinkedIn Jobs or Indeed
   - Click the extension icon in your toolbar
   - Add companies you want to block

## How to Use

### Adding Companies to Block
1. Click the extension icon in your Chrome toolbar
2. Type a company name in the input field
3. Click "Add Company" or press Enter
4. The company will be added to your blocked list

### Removing Companies
1. Click the extension icon
2. Find the company in your blocked list
3. Click the "Remove" button next to it

### Clearing All Companies
1. Click the extension icon
2. Click "Clear All" to remove all blocked companies

## Supported Websites

- **LinkedIn Jobs**: `linkedin.com/jobs/*`
- **Indeed**: `indeed.com/*`

## How It Works

The extension:
1. Loads your blocked companies list from Chrome storage
2. Scans job postings on supported websites
3. Extracts company names from job cards
4. Hides jobs from companies in your blocked list
5. Uses a mutation observer to catch new jobs as they load
6. Provides smooth fade-out animations when hiding jobs

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standard)
- **Permissions**: 
  - `activeTab`: To interact with job sites
  - `scripting`: To inject content scripts
  - `storage`: To save your blocked companies list
- **Content Scripts**: Automatically injected on LinkedIn and Indeed job pages
- **Storage**: Uses Chrome's sync storage for cross-device synchronization

## Troubleshooting

**Extension not working?**
- Make sure you're on LinkedIn Jobs or Indeed
- Check the browser console for any error messages
- Try refreshing the page

**Jobs not being hidden?**
- Company names might be slightly different than expected
- Try adding variations of the company name
- Check that the extension is enabled

**Popup not opening?**
- Right-click the extension icon and select "Inspect popup" to see any errors
- Make sure all files are in the same folder

## Development

To modify the extension:
1. Edit the files as needed
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Job Filter extension
4. Test your changes

## Files Overview

- `manifest.json`: Extension configuration
- `content.js`: Main filtering logic
- `popup.html`: Extension popup interface
- `popup.js`: Popup functionality
- `icon.svg`: Extension icon
- `README.md`: This file 