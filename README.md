# CookieGuard: ML-Powered Cookie Security Extension

CookieGuard is a Chrome extension that uses machine learning to detect and categorize cookies in real-time, providing users with granular control over their privacy.

## Features

- **Real-time Cookie Classification**: ML-based categorization of cookies into 6 categories (Essential, Functional, Analytics, Advertising, Social, Unknown)
- **Intelligent Blocking**: Three protection modes (Observe, Balanced, Strict) with adaptive blocking
- **Privacy Dashboard**: Interactive visualizations showing cookie distribution, top domains, and privacy metrics
- **Local Processing**: All ML inference happens locally in the browser - no external API calls
- **Performance Optimized**: Sub-10ms cookie processing with intelligent caching
- **Privacy-First Design**: SHA-256 hashing of sensitive values, no data transmission

## Project Structure

```
cookieguard/
├── extension/              # Chrome extension code
│   ├── manifest.json       # Extension manifest (V3)
│   ├── background/         # Service worker for cookie interception
│   ├── content/            # Content scripts for JS detection
│   ├── popup/              # Quick-access popup interface
│   ├── dashboard/          # Full analytics dashboard with D3.js
│   ├── lib/                # Core libraries (classifier, features, DB)
│   └── models/             # ONNX model (placed here after training)
│
└── ml-pipeline/            # Machine learning pipeline
    ├── src/                # Python source code
    │   ├── data_collector.py      # Collect cookies from websites
    │   ├── feature_extractor.py   # Extract ML features
    │   ├── model_trainer.py       # Train Random Forest
    │   └── onnx_converter.py      # Convert to browser format
    ├── notebooks/          # Jupyter notebooks for training
    ├── data/               # Training datasets (raw/processed)
    ├── models/             # Trained models
    └── requirements.txt    # Python dependencies
```

## Installation

### Extension Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd cookieguard
```

2. Install dependencies:
```bash
npm install
```

3. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `cookieguard/extension` folder

### ML Pipeline Setup

1. Create a Python virtual environment:
```bash
cd ml-pipeline
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install Python dependencies:
```bash
pip install -r requirements.txt
```

3. You'll also need ChromeDriver for data collection:
```bash
# macOS
brew install chromedriver

# Ubuntu
sudo apt-get install chromium-chromedriver

# Or download from: https://chromedriver.chromium.org/
```

## Training the Model

### Quick Start

Run the complete pipeline:
```bash
npm run train
```

This will:
1. Collect cookies from sample websites
2. Extract features and generate labels
3. Train the Random Forest model
4. Convert to ONNX format
5. Place the model in `extension/models/`

### Step-by-Step Training

1. **Collect Cookie Data**:
```bash
npm run collect-data
```
This scrapes cookies from popular websites and saves to `ml-pipeline/data/raw/cookies.json`

2. **Train the Model**:
```bash
npm run train-model
```
This extracts features, trains the Random Forest, and saves to `ml-pipeline/models/cookie_classifier.pkl`

3. **Convert to ONNX**:
```bash
npm run convert-onnx
```
This converts the model to ONNX format for browser deployment

### Using Jupyter Notebooks

For interactive training and experimentation:

```bash
cd ml-pipeline
jupyter notebook
```

Open the notebooks in order:
1. `01-data-collection.ipynb` - Collect and analyze cookie data
2. `02-feature-engineering.ipynb` - Explore feature extraction
3. `03-model-training.ipynb` - Train and evaluate the model

## Usage

### Popup Interface

Click the CookieGuard icon to:
- View cookie statistics for the current site
- Change protection mode (Observe/Balanced/Strict)
- Clear advertising cookies
- Access the full dashboard

### Dashboard

Click "View Dashboard" for:
- Pie chart of cookie categories
- Bar chart of top cookie domains
- Timeline of cookie activity
- Detailed cookie table with search/filter

### Protection Modes

- **Observe**: Log all cookies, block nothing (for testing)
- **Balanced**: Block advertising and social tracking cookies
- **Strict**: Block all except essential and functional cookies

## Architecture

### Extension Components

1. **Background Service Worker** (`background/service-worker.js`)
   - Intercepts cookies via Chrome APIs
   - Runs ML classification
   - Enforces blocking rules
   - Manages IndexedDB storage

2. **Content Script** (`content/content-script.js`)
   - Hooks `document.cookie` API
   - Detects localStorage tracking
   - Monitors canvas fingerprinting
   - Reports to background worker

3. **Classifier** (`lib/classifier.js`)
   - Loads ONNX model via onnxruntime-web
   - Extracts 16 features per cookie
   - Runs inference in <5ms
   - Falls back to rule-based classification

4. **IndexedDB Manager** (`lib/db-manager.js`)
   - Stores cookie metadata (not values)
   - Tracks classifications
   - Provides statistics
   - Auto-cleanup of old data

### ML Pipeline

1. **Data Collection**
   - Selenium-based web scraping
   - EasyList domain integration
   - Captures 10+ cookie attributes

2. **Feature Engineering**
   - 16 features per cookie
   - Name/value entropy calculation
   - Pattern matching (tracking/PII)
   - Domain relationship analysis

3. **Model Training**
   - Random Forest (100 trees, depth 20)
   - 6-class classification
   - Cross-validation
   - Target: 85-95% accuracy

4. **ONNX Conversion**
   - Model quantization
   - Browser-compatible format
   - <1MB model size

## Performance

- Cookie processing: <10ms per cookie
- Page load impact: <100ms
- Memory usage: <50MB
- Storage: <10MB

## Security & Privacy

- All processing is local (no external servers)
- Cookie values are SHA-256 hashed before storage
- No raw cookie data leaves the browser
- PII detection without value storage
- Encrypted export via Web Crypto API

## Development

### Running Tests

```bash
npm test  # (Not yet implemented)
```

### Linting

```bash
npm run lint
```

### Building for Production

To package the extension:
```bash
cd extension
zip -r ../cookieguard.zip . -x "*.DS_Store"
```

## Evaluation Metrics

The model is evaluated on:
- **Classification Accuracy**: Precision/Recall per category
- **Processing Speed**: Latency per cookie
- **Memory Efficiency**: RAM and storage usage
- **Compatibility**: Tested on top 100 websites
- **User Experience**: No visible impact on browsing

## Future Enhancements

- [ ] Deep learning models for improved accuracy
- [ ] Cross-browser support (Firefox, Edge)
- [ ] Enterprise API for centralized management
- [ ] User feedback loop for continuous learning
- [ ] Advanced fingerprinting detection
- [ ] Cookie consent banner detection

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- EasyList tracking protection lists
- Mozilla WebXray dataset
- Academic research on web tracking (see proposal references)

## Contact

For questions or issues, please open a GitHub issue or contact the team.

---

**Built for FA25: Security for Networked Systems (8365)**
