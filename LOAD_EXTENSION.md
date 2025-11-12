# How to Load CookieGuard in Chrome

## ✅ Prerequisites Complete!

Your CookieGuard extension is now ready to run! The following have been completed:
- ✓ Node.js dependencies installed
- ✓ Python environment set up
- ✓ Training data generated (1000 labeled cookies)
- ✓ Random Forest model trained (100% accuracy on test set)
- ✓ ONNX model converted and placed in extension (523 KB)

## 🚀 Load Extension in Chrome

Follow these steps to load your extension:

### Step 1: Open Chrome Extensions Page

1. Open Google Chrome browser
2. Type in the address bar: `chrome://extensions/`
3. Press Enter

### Step 2: Enable Developer Mode

1. Look at the top-right corner of the page
2. Find the toggle switch labeled **"Developer mode"**
3. Turn it ON (it should be blue/highlighted)

### Step 3: Load Unpacked Extension

1. Click the **"Load unpacked"** button (appears after enabling Developer mode)
2. In the file browser, navigate to:
   ```
   /Users/monesh/University/sns/cookieguard/extension
   ```
3. Select the **`extension`** folder
4. Click **"Select"** or **"Open"**

### Step 4: Verify Installation

You should now see the CookieGuard extension card with:
- 🍪 CookieGuard logo (or a default icon if you haven't added custom icons)
- Version 1.0.0
- Description: "ML-Powered Cookie Security Extension"
- The extension should be enabled (toggle ON)

### Step 5: Pin Extension to Toolbar (Optional)

1. Click the puzzle piece icon (🧩) in Chrome's toolbar
2. Find "CookieGuard" in the list
3. Click the pin icon to add it to your toolbar

## 🧪 Test the Extension

### Test 1: Visit a Website

1. Navigate to any website, for example:
   - https://www.cnn.com
   - https://www.amazon.com
   - https://www.youtube.com

2. Click the CookieGuard icon in your toolbar

3. You should see:
   - Total cookies detected
   - Category breakdown (Essential, Analytics, Advertising, etc.)
   - Privacy score

### Test 2: View Dashboard

1. Click the CookieGuard icon
2. Click the **"View Dashboard"** button
3. A new tab should open showing:
   - Pie chart of cookie categories
   - Bar chart of top domains
   - Timeline of cookie activity
   - Detailed cookie table

### Test 3: Change Protection Mode

1. Click the CookieGuard icon
2. Change the mode dropdown:
   - **Observe**: Logs all cookies, blocks nothing
   - **Balanced**: Blocks advertising and social cookies (default)
   - **Strict**: Blocks everything except essential cookies

3. Refresh the website and see the difference in cookie counts

### Test 4: Clear Cookies

1. Click the CookieGuard icon
2. Click **"Clear Advertising Cookies"** button
3. Confirm the action
4. See how many cookies were removed

## 🔍 Debugging

### If Extension Doesn't Load

Check for errors:
1. Go back to `chrome://extensions/`
2. Find CookieGuard in the list
3. Click **"Errors"** if there's a red badge
4. Look for any JavaScript errors

Common issues:
- **Manifest errors**: Check that `manifest.json` is valid
- **Module loading**: Ensure all `.js` files are present
- **ONNX model**: Verify `models/cookie-classifier.onnx` exists

### View Console Logs

**Background Worker Console:**
1. Go to `chrome://extensions/`
2. Find CookieGuard
3. Click **"service worker"** link
4. Check console for messages

**Popup Console:**
1. Right-click the CookieGuard icon
2. Select **"Inspect popup"**
3. DevTools will open showing the popup's console

**Content Script Console:**
1. Open any website
2. Press F12 to open DevTools
3. Go to Console tab
4. Look for "CookieGuard content script loaded" message

### Test Classification

Open the background worker console and run:
```javascript
// Get all cookies
chrome.cookies.getAll({}, (cookies) => {
  console.log(`Total cookies: ${cookies.length}`);
});

// Check database
dbManager.getAllCookies().then(cookies => {
  console.log('Stored cookies:', cookies.length);
});

// Check classifications
dbManager.getStatsByCategory().then(stats => {
  console.log('Category stats:', stats);
});
```

## 📊 Understanding the Results

### Privacy Score
- **90-100**: Excellent - mostly essential cookies
- **70-89**: Good - some tracking but limited
- **50-69**: Fair - moderate tracking
- **<50**: Poor - heavy tracking

### Cookie Categories
- **Essential** (Green): Authentication, sessions, security
- **Functional** (Blue): User preferences, features
- **Analytics** (Yellow): Site statistics (e.g., Google Analytics)
- **Advertising** (Red): Ad tracking, behavioral targeting
- **Social** (Purple): Social media widgets
- **Unknown** (Gray): Unclassified

### Protection Modes
- **Observe**: Best for testing, no blocking
- **Balanced**: Recommended for daily use
- **Strict**: Maximum privacy, may break some sites

## 🎯 Next Steps

1. **Test on multiple websites** to see different cookie patterns
2. **Try different protection modes** to understand their impact
3. **View the dashboard** to analyze tracking across sites
4. **Check the console logs** to understand what's happening behind the scenes

## 💡 Tips

- CookieGuard works best on sites with many cookies (news sites, shopping sites)
- The first visit to a site may show fewer cookies as they're set gradually
- Dashboard data accumulates over time - the more you browse, the more data you'll see
- IndexedDB auto-cleans data older than 7 days

## 🐛 Common Issues

**No cookies showing:**
- Make sure you're visiting a website (not a blank tab)
- Some sites may not set cookies immediately
- Check if cookies are enabled in Chrome settings

**Extension icon not visible:**
- Extension might not be pinned - click the puzzle icon to pin it
- Extension might be disabled - check `chrome://extensions/`

**Dashboard not opening:**
- Check popup console for errors
- Ensure all dashboard files are present

**Classification not working:**
- Verify ONNX model exists: `/extension/models/cookie-classifier.onnx`
- Check background worker console for ML loading messages
- Extension falls back to rule-based classification if ML fails

## 📝 Notes

- This is a development version running in unpacked mode
- Perfect accuracy (100%) is because we used mock training data
- For production use, collect real cookie data and retrain the model
- Icon placeholders are used - add custom icons for a polished look

---

**Enjoy using CookieGuard! 🍪🛡️**
