# AviDM Screenshot Validation Workflow

## Visual Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SCREENSHOT VALIDATION WORKFLOW                        │
└─────────────────────────────────────────────────────────────────────────┘

    START
      │
      ▼
┌──────────────────┐
│  Run Validation  │───────► ./scripts/run-screenshot-validation.sh
└──────────────────┘
      │
      ▼
┌──────────────────┐
│ Check Prerequisites│
│  - Node.js       │
│  - npm/npx       │
│  - curl          │
│  - Playwright    │
└──────────────────┘
      │
      ▼
┌──────────────────┐
│ Check Services   │
│  - API (3001)    │ ───► If not running ───► Start automatically
│  - Frontend      │
│    (5173)        │
└──────────────────┘
      │
      ▼
┌──────────────────┐
│ Launch Playwright│
│  - Chrome 1920x  │
│    1080          │
│  - DevTools ON   │
│  - Recording ON  │
└──────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     SCREENSHOT CAPTURE SEQUENCE                         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1️⃣  Load App (localhost:5173)                                         │
│       ↓                                                                │
│       📸 01-initial-state.png                                          │
│                                                                         │
│  2️⃣  Click Avi's Profile                                               │
│       ↓                                                                │
│       📸 02-avidm-interface.png                                        │
│                                                                         │
│  3️⃣  Type Test Message                                                 │
│       ↓                                                                │
│       📸 03-message-composed.png                                       │
│                                                                         │
│  4️⃣  Click Send Button                                                 │
│       ↓                                                                │
│       📸 04-message-sent.png                                           │
│       ↓                                                                │
│       🌐 Monitor: POST /api/avi-dm/chat                                │
│                                                                         │
│  5️⃣  Wait for Loading                                                  │
│       ↓                                                                │
│       📸 05-response-loading.png                                       │
│                                                                         │
│  6️⃣  Receive Response (wait up to 30s)                                 │
│       ↓                                                                │
│       📸 06-response-received.png                                      │
│                                                                         │
│  7️⃣  Open DevTools Console (F12)                                       │
│       ↓                                                                │
│       📸 07-console-clean.png                                          │
│                                                                         │
│  8️⃣  Switch to Network Tab                                             │
│       ↓                                                                │
│       📸 08-network-tab.png                                            │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
      │
      ▼
┌──────────────────┐
│ Collect Metadata │
│  - Network logs  │
│  - Console logs  │
│  - Timestamps    │
│  - Status codes  │
└──────────────────┘
      │
      ▼
┌──────────────────┐
│ Generate HTML    │
│  comparison.html │
│  - Before/After  │
│  - Gallery       │
│  - Metadata      │
└──────────────────┘
      │
      ▼
┌──────────────────┐
│ Export JSON      │
│  metadata.json   │
│  - Screenshots   │
│  - Network data  │
│  - Console logs  │
└──────────────────┘
      │
      ▼
┌──────────────────┐
│ Save Video       │
│  validation.webm │
│  Full session    │
└──────────────────┘
      │
      ▼
┌──────────────────┐
│ Verify Results   │
│  ✓ 8 screenshots │
│  ✓ HTML page     │
│  ✓ JSON metadata │
│  ✓ Video file    │
└──────────────────┘
      │
      ▼
┌──────────────────┐
│  Open Browser    │────► comparison.html
└──────────────────┘
      │
      ▼
    SUCCESS ✅
```

## File Generation Flow

```
run-screenshot-validation.sh
            │
            ├─► Check Prerequisites
            │   └─► Install if missing
            │
            ├─► Start Services
            │   ├─► API Server (3001)
            │   └─► Frontend (5173)
            │
            └─► Execute TypeScript Script
                │
                capture-avidm-fix-screenshots.ts
                            │
                            ├─► Initialize Playwright
                            │   ├─► Launch Chrome
                            │   ├─► Enable DevTools
                            │   └─► Start Recording
                            │
                            ├─► Setup Monitoring
                            │   ├─► Network Listener
                            │   └─► Console Listener
                            │
                            ├─► Run User Flow
                            │   ├─► Navigate to app
                            │   ├─► Click elements
                            │   ├─► Type message
                            │   ├─► Send request
                            │   └─► Wait for response
                            │
                            ├─► Capture Screenshots
                            │   ├─► 01-initial-state.png
                            │   ├─► 02-avidm-interface.png
                            │   ├─► 03-message-composed.png
                            │   ├─► 04-message-sent.png
                            │   ├─► 05-response-loading.png
                            │   ├─► 06-response-received.png
                            │   ├─► 07-console-clean.png
                            │   └─► 08-network-tab.png
                            │
                            ├─► Generate HTML
                            │   └─► comparison.html
                            │       ├─► Executive Summary
                            │       ├─► Before/After Grid
                            │       ├─► Screenshot Gallery
                            │       ├─► Network Summary
                            │       └─► Console Summary
                            │
                            ├─► Export Metadata
                            │   └─► metadata.json
                            │       ├─► screenshots[]
                            │       ├─► networkRequests[]
                            │       ├─► consoleMessages[]
                            │       └─► summary{}
                            │
                            └─► Save Video
                                └─► videos/validation.webm
```

## Network Monitoring Flow

```
User Action                Network Layer              Backend
    │                           │                         │
    ├─► Click "Send"            │                         │
    │                           │                         │
    │                           ├─► POST /api/avi-dm/chat │
    │                           │                         │
    │                           │   Request Captured ◄────┤
    │                           │   - Method: POST        │
    │                           │   - Headers             │
    │                           │   - Body                │
    │                           │                         │
    │                           │ ────────────────────► │
    │                           │                         │
    │                           │                    Process
    │                           │                    Request
    │                           │                         │
    │                           │ ◄──────────────────── │
    │                           │                         │
    │                           │   Response Captured     │
    │                           │   - Status: 200 OK ◄────┤
    │                           │   - Headers             │
    │                           │   - Body (JSON)         │
    │   ◄─────────── ◄──────────┤                         │
    │                           │                         │
    │   Display Response        │                         │
    │                           │                         │
    ▼                           ▼                         ▼

    📸 Screenshot Captured
    💾 Network Data Saved
    ✅ Validation Complete
```

## Console Monitoring Flow

```
Browser Console          Script Listener        Metadata Collector
        │                      │                         │
        ├─► console.log()      │                         │
        │                      │                         │
        │                      ├─► Capture              │
        │                      │   type: 'log'           │
        │                      │   text: '...'           │
        │                      │   timestamp             │
        │                      │                         │
        │                      │ ──────────────────────► │
        │                      │                         │
        ├─► console.error()    │                         │
        │                      │                         │
        │                      ├─► Capture              │
        │                      │   type: 'error' 🔴      │
        │                      │   text: '...'           │
        │                      │   timestamp             │
        │                      │                         │
        │                      │ ──────────────────────► │
        │                      │                         │
        ├─► Page Error         │                         │
        │                      │                         │
        │                      ├─► Capture              │
        │                      │   type: 'pageerror' 💥  │
        │                      │   message: '...'        │
        │                      │   timestamp             │
        │                      │                         │
        │                      │ ──────────────────────► │
        │                      │                         │
        ▼                      ▼                         ▼

                         Saved to metadata.json
                         consoleMessages: [...]
```

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         INPUT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Action ──► Playwright ──► Browser ──► API Server          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MONITORING LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Network Monitor ──► Captures all HTTP requests/responses        │
│  Console Monitor ──► Captures all console messages              │
│  Page Monitor    ──► Captures page errors and crashes           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     COLLECTION LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Screenshots[]     ──► PNG images with metadata                 │
│  NetworkRequests[] ──► Request/response pairs                   │
│  ConsoleMessages[] ──► Log entries with timestamps              │
│  VideoRecording    ──► Full session WebM video                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PROCESSING LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  HTML Generator    ──► Creates visual comparison page           │
│  JSON Exporter     ──► Exports technical metadata               │
│  Summary Builder   ──► Calculates success/failure metrics       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       OUTPUT LAYER                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📄 comparison.html    ──► Visual report for humans             │
│  📊 metadata.json      ──► Technical data for automation        │
│  📸 *.png (8 files)    ──► Individual screenshots               │
│  🎬 validation.webm    ──► Video recording                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VALIDATION LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Success Criteria:                                              │
│  ✅ All 8 screenshots captured                                  │
│  ✅ All API calls returned 200 OK                               │
│  ✅ No console errors detected                                  │
│  ✅ Full response received from Claude                          │
│  ✅ HTML and JSON generated successfully                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Timeline Visualization

```
Time (seconds)     Action                              Output
─────────────────────────────────────────────────────────────────────
0s                 Script starts
1s                 Browser launches
2s                 Navigate to app
3s                 Page loaded                         📸 01-initial-state.png
5s                 Click Avi profile
6s                 DM interface opens                  📸 02-avidm-interface.png
8s                 Type message
9s                 Message typed                       📸 03-message-composed.png
10s                Click Send
11s                Request sent                        📸 04-message-sent.png
                                                       🌐 POST /api/avi-dm/chat
12s                Loading...                          📸 05-response-loading.png
15s                (waiting for Claude...)
20s                (still waiting...)
25s                Response received!                  📸 06-response-received.png
                                                       ✅ Status: 200 OK
27s                Open DevTools
28s                Console tab visible                 📸 07-console-clean.png
30s                Switch to Network tab               📸 08-network-tab.png
32s                Generate HTML                       📄 comparison.html
33s                Export JSON                         📊 metadata.json
34s                Save video                          🎬 validation.webm
35s                Open browser
36s                ✅ COMPLETE
```

## Decision Tree

```
                        Start Validation
                              │
                              ▼
                    Services Running? ────NO───► Start Services
                              │                         │
                              YES                       │
                              │◄──────────────────────┘
                              ▼
                    Playwright Installed? ──NO─► Install Playwright
                              │                         │
                              YES                       │
                              │◄──────────────────────┘
                              ▼
                    API Key Configured? ──NO──► ⚠️ Warning (continue)
                              │                         │
                              YES                       │
                              │◄──────────────────────┘
                              ▼
                    Run Screenshot Capture
                              │
                              ▼
                    All Screenshots OK? ──NO──► ❌ FAIL
                              │                         │
                              YES                       │
                              ▼                         │
                    Network 200 OK? ──NO──────►❌ FAIL│
                              │                         │
                              YES                       │
                              ▼                         │
                    Console Clean? ──NO────────►❌ FAIL│
                              │                         │
                              YES                       │
                              ▼                         │
                    HTML Generated? ──NO───────►❌ FAIL│
                              │                         │
                              YES                       │
                              ▼                         │
                          ✅ SUCCESS                    │
                                                        │
                                                        ▼
                                              Review Errors & Fix
```

## State Diagram

```
┌──────────────┐
│              │
│     IDLE     │◄──────────────┐
│              │                │
└──────┬───────┘                │
       │                        │
       │ Run Script             │
       ▼                        │
┌──────────────┐                │
│              │                │
│  INITIALIZING│                │
│              │                │
└──────┬───────┘                │
       │                        │
       │ Services OK            │
       ▼                        │
┌──────────────┐                │
│              │                │
│  CAPTURING   │──Error───► [FAILED]──┐
│              │                       │
└──────┬───────┘                       │
       │                               │
       │ All Screenshots               │
       ▼                               │
┌──────────────┐                       │
│              │                       │
│  PROCESSING  │──Error────────────────┤
│              │                       │
└──────┬───────┘                       │
       │                               │
       │ HTML + JSON                   │
       ▼                               │
┌──────────────┐                       │
│              │                       │
│  VALIDATING  │──Error────────────────┤
│              │                       │
└──────┬───────┘                       │
       │                               │
       │ All Checks Pass               │
       ▼                               │
┌──────────────┐                       │
│              │                       │
│   SUCCESS    │                       │
│              │                       │
└──────┬───────┘                       │
       │                               │
       └───────────────────────────────┘
                Cleanup
```

## Component Interaction

```
┌─────────────────┐
│  Shell Script   │
│  (Orchestrator) │
└────────┬────────┘
         │
         ├─► Check Prerequisites
         │   └─► node, npm, curl, playwright
         │
         ├─► Start Services
         │   ├─► API Server (port 3001)
         │   └─► Frontend (port 5173)
         │
         └─► Execute TypeScript
             │
             ┌────────────────┐
             │  TS Script     │
             │  (Automation)  │
             └────────┬───────┘
                      │
                      ├─► Playwright Controller
                      │   │
                      │   ├─► Browser Instance
                      │   │   ├─► Page Navigator
                      │   │   ├─► Element Clicker
                      │   │   ├─► Text Typer
                      │   │   └─► Screenshot Taker
                      │   │
                      │   ├─► Network Monitor
                      │   │   ├─► Request Listener
                      │   │   └─► Response Listener
                      │   │
                      │   └─► Console Monitor
                      │       ├─► Log Listener
                      │       └─► Error Listener
                      │
                      ├─► Data Collector
                      │   ├─► Screenshot Metadata
                      │   ├─► Network Data
                      │   └─► Console Data
                      │
                      ├─► HTML Generator
                      │   ├─► Template Engine
                      │   ├─► Style Injector
                      │   └─► Content Builder
                      │
                      └─► JSON Exporter
                          ├─► Metadata Serializer
                          └─► File Writer
```

---

## Quick Reference

### One-Line Start
```bash
./scripts/run-screenshot-validation.sh
```

### Expected Outputs
```
8 Screenshots + HTML + JSON + Video = SUCCESS ✅
```

### Validation Check
```bash
ls screenshots/avidm-fix/
# Should see: 8 .png files, comparison.html, metadata.json, videos/
```

### View Results
```bash
open screenshots/avidm-fix/comparison.html
```

---

**This workflow ensures complete validation of the AviDM port fix from start to finish.**
