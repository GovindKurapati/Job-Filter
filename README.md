# Job Filter - Chrome Extension

A powerful Chrome extension that filters job postings on LinkedIn. Hide unwanted companies, filter out applied jobs, promoted posts, and reposted positions with a beautiful blur effect.

## 🎥 Demo

![Job Filter Demo](Job-Filter-Demo.gif)

*Watch the extension in action - filtering jobs with blur effects and individual unblocking*

## ✨ Features

### 🎯 **Smart Job Filtering**
- **Company Blocking**: Hide jobs from specific companies
- **Applied Jobs**: Automatically hide jobs you've already applied to
- **Promoted Jobs**: Filter out sponsored/promoted job postings
- **Reposted Jobs**: Hide jobs that have been reposted
- **Individual Unblocking**: Unblock specific jobs while keeping others filtered

### 🎨 **Beautiful User Experience**
- **Blur Effect**: Jobs are blurred instead of hidden for better UX
- **Unblock Button**: Click to unblock specific jobs directly from the interface
- **Real-time Filtering**: Jobs are filtered as soon as they load
- **Smooth Animations**: Elegant fade effects when hiding/showing jobs

### 🔧 **Advanced Features**
- **Cross-platform Sync**: Settings sync across all your devices
- **Persistent Storage**: Your preferences are saved between sessions
- **Smart Detection**: Uses LinkedIn's footer text for accurate job status detection
- **Comprehensive Matching**: Searches entire job card text for company names

## 🚀 Installation

### **Manual Installation (Developer)**
1. Download all files to a folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked" and select your folder
5. Pin the extension to your toolbar

## 📖 How to Use

### **Adding Companies to Block**
1. Click the extension icon in your toolbar
2. Type a company name in the input field
3. Click "Add Company" or press Enter
4. Jobs from that company will be immediately blurred

### **Using Filter Toggles**
- **🚫 Already Applied Jobs**: Hide jobs you've already applied to
- **💰 Promoted/Sponsored Jobs**: Filter out paid job postings
- **🔄 Reposted Jobs**: Hide jobs that have been reposted

### **Unblocking Specific Jobs**
- Click the "👁️ Unblock" button on any blurred job card
- Only that specific job will be unblocked
- Other jobs from the same company remain filtered

### **Managing Your List**
- **Remove Companies**: Click "Remove" next to any company
- **Clear All**: Click "Clear All" to remove all blocked companies
- **Real-time Updates**: Changes apply immediately

## 🎯 Supported Websites

- **LinkedIn Jobs**: `linkedin.com/jobs/*`

## 🔧 How It Works

### **Smart Job Detection**
1. **Company Matching**: Searches entire job card text for company names
2. **Status Detection**: Uses LinkedIn's footer text for job status
3. **Real-time Filtering**: Monitors page changes and filters new jobs
4. **Individual Control**: Allows unblocking specific jobs

### **Technical Features**
- **Mutation Observer**: Watches for new job cards as they load
- **Comprehensive Text Search**: Searches all text in job cards
- **Cross-device Sync**: Settings saved to Chrome sync storage
- **Performance Optimized**: Efficient filtering without page slowdown

## 🎨 Visual Design

### **Professional Interface**
- **LinkedIn/Indeed Colors**: Blue gradient matching brand colors
- **Modern UI**: Clean, professional popup interface
- **Toggle Switches**: Easy-to-use filter controls
- **Status Indicators**: Clear feedback on current settings

### **Job Card Effects**
- **Blur Effect**: Jobs are blurred with reduced opacity
- **Smooth Transitions**: Elegant fade animations
- **Unblock Button**: Clearly visible on filtered jobs
- **Visual Feedback**: Red border indicates filtered status

## 📁 Project Structure

```
job-filter/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── content.js            # Main filtering logic
├── icon.svg              # Extension icon
└── README.md             # This file
```

## 🤝 Contributing

### **Suggestions Welcome!**
- Report bugs or issues
- Suggest new features
- Improve the documentation
- Share your experience

### **Development Setup:**
1. Clone or download the project
2. Load as unpacked extension in Chrome
3. Make your changes
4. Test thoroughly
5. Submit your improvements

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- **LinkedIn**: For providing job search platform
- **Indeed**: For job search functionality
- **Chrome Extensions API**: For the development platform
- **Community**: For feedback and suggestions

---

**Job Filter** - Making your job search more focused and efficient! 🎯 