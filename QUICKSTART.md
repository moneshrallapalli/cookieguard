# CookieGuard - Quick Start Guide

## Prerequisites

- Node.js (v14+)
- Python 3.8+
- Chrome browser
- ChromeDriver (for data collection)

## Step 1: Install Dependencies

```bash
cd cookieguard

# Install Node dependencies
npm install

# Set up Python environment
cd ml-pipeline
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

## Step 2: Train the ML Model

### Option A: Automated Training (Recommended)

```bash
npm run train
```

This will:
1. Collect cookies from sample websites (~10 minutes)
2. Train the Random Forest model
3. Convert to ONNX format
4. Place model in `extension/models/`

### Option B: Manual Training

```bash
# 1. Collect data
npm run collect-data

# 2. Train model
npm run train-model

# 3. Convert to ONNX
npm run convert-onnx
```

### Option C: Use Jupyter Notebooks (For Learning)

```bash
cd ml-pipeline
jupyter notebook

# Open and run notebooks in order:
# 1. 01-data-collection.ipynb
# 2. 02-feature-engineering.ipynb
# 3. 03-model-training.ipynb
```

## Step 3: Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `cookieguard/extension` folder
5. The CookieGuard icon should appear in your toolbar

## Step 4: Test the Extension

1. Click the CookieGuard icon - you should see the popup interface
2. Visit any website (e.g., https://www.cnn.com)
3. Click the icon again to see detected cookies
4. Click "View Dashboard" for detailed analytics

## Troubleshooting

### Extension doesn't load

- Check Chrome DevTools console for errors
- Verify all files are in place
- Make sure manifest.json is valid

### No cookies detected

- The extension needs the ONNX model to classify cookies
- Check if `extension/models/cookie-classifier.onnx` exists
- If not, run training pipeline first

### Data collection fails

- Ensure ChromeDriver is installed and in PATH
- Check internet connection
- Some sites may block automated access

### Model training errors

- Verify Python dependencies are installed: `pip list`
- Check that scikit-learn version is compatible
- Ensure you have enough disk space (>100MB)

## Development Mode

### Watch for errors

Open Chrome DevTools:
1. Right-click the extension icon → "Inspect popup"
2. Go to `chrome://extensions/` → Click "background page" under CookieGuard
3. Check the Console tab for errors

### Test on specific sites

```javascript
// In the background service worker console:
chrome.cookies.getAll({}, (cookies) => {
  console.log(`Found ${cookies.length} cookies`);
});
```

### Clear extension data

```javascript
// In the popup console:
indexedDB.deleteDatabase('CookieGuardDB');
chrome.storage.local.clear();
```

## Next Steps

1. **Customize Classification**: Edit `extension/lib/classifier.js` to adjust rules
2. **Add More Training Data**: Modify `ml-pipeline/src/data_collector.py` with more URLs
3. **Improve UI**: Customize `extension/popup/popup.css` and `extension/dashboard/dashboard.css`
4. **Add Icons**: Place icon files in `extension/icons/`

## Common Commands

```bash
# Collect new training data
npm run collect-data

# Retrain with new data
npm run train-model

# Convert updated model
npm run convert-onnx

# Lint code
npm run lint

# View project structure
tree -L 3 -I 'node_modules|venv|__pycache__'
```

## Performance Tips

- The extension caches classifications for 5 minutes
- IndexedDB auto-cleans data older than 7 days
- Adjust cache TTL in `extension/lib/classifier.js`

## Resources

- [Chrome Extension Docs](https://developer.chrome.com/docs/extensions/)
- [ONNX.js Documentation](https://github.com/microsoft/onnxjs)
- [scikit-learn Random Forest](https://scikit-learn.org/stable/modules/ensemble.html#forest)

---

**Need help?** Open an issue on GitHub or check the full README.md
