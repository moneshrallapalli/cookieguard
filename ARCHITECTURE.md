# CookieGuard Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Web Browser                          │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │              Visited Website                        │ │
│  │  • Sets cookies via HTTP headers                   │ │
│  │  • Manipulates cookies via JavaScript              │ │
│  │  • Accesses localStorage/sessionStorage            │ │
│  └─────────────┬──────────────────────────────────────┘ │
│                │                                         │
│                ▼                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │         CookieGuard Extension                       │ │
│  │                                                     │ │
│  │  ┌──────────────┐  ┌────────────┐  ┌────────────┐ │ │
│  │  │   Content    │  │ Background │  │   Popup    │ │ │
│  │  │   Script     │──│  Service   │──│     UI     │ │ │
│  │  │              │  │   Worker   │  │            │ │ │
│  │  └──────────────┘  └─────┬──────┘  └────────────┘ │ │
│  │                           │                         │ │
│  │                           ▼                         │ │
│  │                  ┌────────────────┐                │ │
│  │                  │  ML Classifier │                │ │
│  │                  │  (ONNX Model)  │                │ │
│  │                  └────────────────┘                │ │
│  │                           │                         │ │
│  │                           ▼                         │ │
│  │                  ┌────────────────┐                │ │
│  │                  │   IndexedDB    │                │ │
│  │                  └────────────────┘                │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Content Script (`content/content-script.js`)

**Purpose**: Injected into every web page to monitor client-side cookie operations

**Responsibilities**:
- Hook `document.cookie` getter/setter
- Monitor `localStorage.setItem()` calls
- Detect canvas fingerprinting attempts
- Track performance resources related to tracking

**Communication**:
```javascript
// Sends messages to background worker
chrome.runtime.sendMessage({
  type: 'JS_COOKIE_ACCESS',
  data: { operation, cookie, url, timestamp }
});
```

**Injection**: Runs at `document_start` to intercept early cookie operations

### 2. Background Service Worker (`background/service-worker.js`)

**Purpose**: Central orchestrator for cookie interception and classification

**Lifecycle**:
1. **Initialization** (`onInstalled`):
   - Initialize IndexedDB
   - Load ONNX model
   - Set default settings

2. **Cookie Detection** (`cookies.onChanged`):
   - Intercepts all cookie changes
   - Queues cookies for processing
   - Processes queue asynchronously

3. **Classification Pipeline**:
   ```javascript
   Cookie → Extract Features → Run ML Model → Store Result → Apply Rules → Block/Allow
   ```

4. **Message Handling**:
   - `GET_STATS`: Return cookie statistics
   - `SET_MODE`: Change protection mode
   - `CLEAR_COOKIES`: Delete cookies by category
   - `GET_COOKIE_DETAILS`: Fetch domain-specific cookies

**Performance Optimizations**:
- Batch processing with async queue
- Classification caching (5-minute TTL)
- Debounced database writes

### 3. ML Classifier (`lib/classifier.js`)

**Architecture**:
```
Cookie Input
    │
    ▼
Feature Extraction (16 features)
    │
    ├─► Check Cache (5-min TTL)
    │   └─► Return cached result
    │
    ▼
ONNX Model Available?
    │
    ├─► Yes: ML Classification
    │   └─► ONNX.js Inference
    │       └─► 6-class softmax output
    │
    └─► No: Rule-based Classification
        └─► Heuristic pattern matching
```

**Feature Vector** (16 dimensions):
```javascript
[
  nameLength,          // 0-255
  valueLength,         // 0-4096
  hasSecure,           // 0 or 1
  hasHttpOnly,         // 0 or 1
  sameSite,            // 0 (None), 1 (Lax), 2 (Strict)
  isSession,           // 0 or 1
  expirationDays,      // 0-3650
  isFirstParty,        // 0 or 1
  domainDepth,         // 1-5
  nameEntropy,         // 0-8
  valueEntropy,        // 0-8
  matchesTrackingPattern, // 0 or 1
  hasPII,              // 0 or 1
  hasUUID,             // 0 or 1
  hasNumericOnly,      // 0 or 1
  hasBase64            // 0 or 1
]
```

**Output Categories**:
- **essential**: Authentication, session management, security
- **functional**: User preferences, shopping carts, language
- **analytics**: Google Analytics, site statistics
- **advertising**: Ad networks, behavioral targeting
- **social**: Social media widgets, sharing
- **unknown**: Unclassified cookies

### 4. Feature Extractor (`lib/feature-extractor.js`)

**Pattern Matching**:
```javascript
TRACKING_PATTERNS = [
  /^(_ga|_gid|_gat)/,        // Google Analytics
  /^(__utm[a-z])/,            // Google UTM
  /^(fr|datr|c_user)/,        // Facebook
  /^(_fbp|_fbc)/,             // Facebook Pixel
  /(uuid|guid|visitor)/i,     // Identifiers
  /(doubleclick|adsense)/i    // Ad networks
];
```

**Entropy Calculation**:
```
H(X) = -Σ p(x) * log₂(p(x))
```
Higher entropy → more random → likely tracking identifier

### 5. IndexedDB Manager (`lib/db-manager.js`)

**Schema**:
```
CookieGuardDB (v1)
│
├── cookies (Object Store)
│   ├── Key: id (auto-increment)
│   ├── Indexes: domain, name, timestamp
│   └── Data: { name, domain, path, valueHash, secure, httpOnly, ... }
│
├── classifications (Object Store)
│   ├── Key: cookieId
│   ├── Indexes: category, confidence
│   └── Data: { cookieId, category, confidence, method, features }
│
└── settings (Object Store)
    ├── Key: key (string)
    └── Data: { key, value }
```

**Privacy Measures**:
- Cookie values are SHA-256 hashed, not stored plaintext
- Automatic cleanup of data >7 days old
- No PII stored

### 6. Popup UI (`popup/popup.html`)

**Components**:
- Stats overview (total, blocked)
- Mode selector dropdown
- Category breakdown with color coding
- Quick actions (clear cookies, open dashboard)
- Privacy score calculation

**Data Flow**:
```
Popup Opens → Request Stats → Background Worker → Query DB → Return Stats → Update UI
```

**Real-time Updates**:
```javascript
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'COOKIE_CLASSIFIED') {
    setTimeout(loadStats, 100);  // Refresh stats
  }
});
```

### 7. Dashboard (`dashboard/dashboard.html`)

**Visualizations** (D3.js):

1. **Pie Chart**: Category distribution
   - Donut chart with color-coded segments
   - Interactive hover effects
   - Legend with counts

2. **Bar Chart**: Top 10 domains
   - Horizontal bars
   - Sorted by cookie count
   - Rotated labels

3. **Timeline**: 24-hour activity
   - Line chart with hourly buckets
   - Shows cookie creation patterns
   - Smooth curve interpolation

4. **Data Table**: Cookie details
   - Sortable columns
   - Search and filter
   - Pagination (100 per page)
   - Category badges

## ML Pipeline Architecture

```
┌─────────────────────────────────────────────────────────┐
│              ML Training Pipeline                        │
│                                                          │
│  ┌────────────┐    ┌──────────────┐    ┌─────────────┐ │
│  │   Data     │───▶│   Feature    │───▶│   Model     │ │
│  │ Collection │    │  Extraction  │    │  Training   │ │
│  └────────────┘    └──────────────┘    └──────┬──────┘ │
│        │                   │                   │        │
│        ▼                   ▼                   ▼        │
│  EasyList URLs      16 Features        Random Forest   │
│  +                  + Heuristic        100 trees        │
│  Website Scraping   Labels             max_depth=20    │
│                                                │        │
│                                                ▼        │
│                                        ┌──────────────┐ │
│                                        │    ONNX      │ │
│                                        │  Conversion  │ │
│                                        └──────┬───────┘ │
│                                               │         │
│                                               ▼         │
│                                        cookie-classifier.onnx
│                                        (Deployed to extension)
└─────────────────────────────────────────────────────────┘
```

### Data Collection (`data_collector.py`)

**Process**:
1. Fetch EasyList tracking domains
2. Generate URL list (Fortune 500, news, tech sites)
3. Use Selenium to visit each URL
4. Extract cookies via WebDriver API
5. Enrich with metadata
6. Save to JSON

**Output Format**:
```json
{
  "name": "_ga",
  "value": "GA1.2.123456789.1234567890",
  "domain": ".example.com",
  "path": "/",
  "secure": false,
  "httpOnly": false,
  "sameSite": "Lax",
  "expirationDate": 1735689600,
  "source_url": "https://example.com",
  "hostOnly": false
}
```

### Feature Engineering (`feature_extractor.py`)

Mirrors JavaScript implementation for consistency.

### Model Training (`model_trainer.py`)

**Algorithm**: Random Forest Classifier

**Hyperparameters**:
- `n_estimators`: 100 trees
- `max_depth`: 20
- `min_samples_split`: 5
- `min_samples_leaf`: 2
- `class_weight`: balanced

**Training Process**:
1. Load labeled cookies
2. Extract features
3. Split 80/20 train/test
4. Train with cross-validation
5. Evaluate on test set
6. Save model as pickle

**Expected Performance**:
- Accuracy: 85-95%
- Precision/Recall: >0.85 per class
- Cross-validation: <5% variance

### ONNX Conversion (`onnx_converter.py`)

**Process**:
```python
sklearn_model → skl2onnx → ONNX graph → Optimize → Export
```

**Optimizations**:
- Operator fusion
- Constant folding
- Dead code elimination
- Target opset: 12 (browser compatible)

**Output**: `cookie-classifier.onnx` (<1MB)

## Data Flow

### Cookie Detection Flow

```
Website Sets Cookie
    │
    ▼
Chrome Cookie API (cookies.onChanged)
    │
    ▼
Background Worker (Cookie Queue)
    │
    ▼
Feature Extraction (16 features, <1ms)
    │
    ▼
Classification Cache Check
    │
    ├─► Cache Hit: Return cached result
    │
    └─► Cache Miss:
        │
        ▼
    ML Model Inference (<5ms)
        │
        ▼
    Store in IndexedDB (<2ms)
        │
        ▼
    Check Blocking Rules
        │
        ├─► Block: chrome.cookies.remove()
        │
        └─► Allow: No action
```

**Total Latency**: <10ms per cookie

### UI Update Flow

```
Cookie Classified
    │
    ▼
Background sends message to Popup
    │
    ▼
Popup requests updated stats
    │
    ▼
Background queries IndexedDB
    │
    ▼
Aggregates statistics
    │
    ▼
Returns to Popup
    │
    ▼
Popup updates UI elements
```

## Security Considerations

### Privacy Protection

1. **No External Communication**: All processing is local
2. **Value Hashing**: SHA-256 before storage
3. **No PII Logging**: Detection only, no storage
4. **Encrypted Export**: Web Crypto API for data export

### Extension Permissions

```json
{
  "permissions": [
    "cookies",      // Read/write cookies
    "storage",      // IndexedDB and chrome.storage
    "webRequest",   // Intercept HTTP headers
    "tabs",         // Access tab information
    "scripting"     // Inject content scripts
  ],
  "host_permissions": ["<all_urls>"]  // All domains
}
```

### Content Security Policy

Manifest V3 enforces strict CSP:
- No inline scripts
- No eval()
- All scripts must be in extension files

## Performance Optimization

### Caching Strategy

```
Layer 1: In-memory cache (5-minute TTL)
    └─► 1000 most recent classifications
Layer 2: IndexedDB (7-day TTL)
    └─► All historical data
```

### Async Processing

```javascript
// Non-blocking queue processing
async function processQueue() {
  if (queue.length === 0) return;

  const cookie = queue.shift();
  await classifyAndStore(cookie);

  setTimeout(processQueue, 0);  // Yield to event loop
}
```

### Lazy Loading

- ONNX model loaded on extension startup
- Dashboard visualizations rendered on demand
- Popup stats fetched only when opened

## Testing Strategy

### Unit Tests
- Feature extraction accuracy
- Classification rule logic
- Database operations

### Integration Tests
- End-to-end cookie interception
- ML model inference
- UI interaction

### Performance Tests
- Latency per cookie (<10ms)
- Memory usage (<50MB)
- Storage growth rate

### Compatibility Tests
- Top 100 websites
- Different cookie types
- Various blocking scenarios

---

This architecture enables real-time, privacy-preserving cookie classification with minimal performance impact.
