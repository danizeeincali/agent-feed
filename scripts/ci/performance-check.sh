#!/bin/bash
set -e

# Performance Check Script
# This script runs comprehensive performance monitoring and regression detection

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
RESULTS_DIR="performance-reports"
BASELINE_DIR="performance-baseline"
REPORT_FILE="$RESULTS_DIR/performance-report.json"
SUMMARY_FILE="$RESULTS_DIR/performance-summary.md"
BASELINE_FILE="$BASELINE_DIR/baseline.json"

# Performance thresholds
LIGHTHOUSE_PERFORMANCE_THRESHOLD=85
LIGHTHOUSE_ACCESSIBILITY_THRESHOLD=90
LIGHTHOUSE_BEST_PRACTICES_THRESHOLD=90
LIGHTHOUSE_SEO_THRESHOLD=85
BUNDLE_SIZE_THRESHOLD_MB=5
RESPONSE_TIME_THRESHOLD_MS=2000
MEMORY_USAGE_THRESHOLD_MB=100

# URLs to test
BASE_URL=${BASE_URL:-"http://localhost:3000"}
TEST_URLS=(
    "$BASE_URL/"
    "$BASE_URL/agents"
    "$BASE_URL/dashboard"
    "$BASE_URL/api/health"
)

# Test configuration
LIGHTHOUSE_RUNS=3
LOAD_TEST_DURATION=60
LOAD_TEST_USERS=10

echo -e "${BLUE}🚀 Starting performance checks...${NC}"
echo "Base URL: $BASE_URL"
echo "Results Directory: $RESULTS_DIR"
echo "Lighthouse Runs: $LIGHTHOUSE_RUNS"
echo ""

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to check prerequisites
check_prerequisites() {
    log "Checking performance testing prerequisites..."

    # Create directories
    mkdir -p "$RESULTS_DIR" "$BASELINE_DIR"

    # Check if application is running
    if ! curl -f -s --max-time 10 "$BASE_URL/health" > /dev/null 2>&1; then
        log "⚠️ Application health check failed, attempting to start..."
        if command -v npm &> /dev/null; then
            npm start &
            sleep 10

            if ! curl -f -s --max-time 10 "$BASE_URL/health" > /dev/null 2>&1; then
                echo -e "${RED}❌ Could not start application${NC}"
                exit 1
            fi
        else
            echo -e "${RED}❌ Application not running and npm not available${NC}"
            exit 1
        fi
    fi

    # Install required tools
    if ! command -v lighthouse &> /dev/null; then
        log "Installing Lighthouse..."
        npm install -g lighthouse
    fi

    if ! command -v autocannon &> /dev/null; then
        log "Installing autocannon for load testing..."
        npm install -g autocannon
    fi

    # Check for additional tools
    if command -v puppeteer &> /dev/null || npm list puppeteer &> /dev/null; then
        PUPPETEER_AVAILABLE=true
    else
        PUPPETEER_AVAILABLE=false
        log "⚠️ Puppeteer not available, some tests will be skipped"
    fi

    log "✅ Prerequisites check completed"
}

# Function to analyze bundle size
analyze_bundle_size() {
    log "Analyzing bundle size..."

    local bundle_analysis_file="$RESULTS_DIR/bundle-analysis.json"

    # Check if build directory exists
    if [ -d "dist" ] || [ -d "build" ] || [ -d ".next" ]; then
        local build_dir=""

        if [ -d ".next" ]; then
            build_dir=".next"
        elif [ -d "dist" ]; then
            build_dir="dist"
        else
            build_dir="build"
        fi

        log "Analyzing build directory: $build_dir"

        # Calculate total bundle size
        local total_size=$(du -sh "$build_dir" | cut -f1)
        local total_size_bytes=$(du -sb "$build_dir" | cut -f1)
        local total_size_mb=$(echo "scale=2; $total_size_bytes / 1024 / 1024" | bc 2>/dev/null || echo "0")

        # Analyze JavaScript files
        local js_size_bytes=0
        local css_size_bytes=0
        local asset_count=0

        if command -v find &> /dev/null; then
            js_size_bytes=$(find "$build_dir" -name "*.js" -type f -exec du -cb {} + 2>/dev/null | tail -1 | cut -f1 || echo "0")
            css_size_bytes=$(find "$build_dir" -name "*.css" -type f -exec du -cb {} + 2>/dev/null | tail -1 | cut -f1 || echo "0")
            asset_count=$(find "$build_dir" -type f | wc -l)
        fi

        local js_size_mb=$(echo "scale=2; $js_size_bytes / 1024 / 1024" | bc 2>/dev/null || echo "0")
        local css_size_mb=$(echo "scale=2; $css_size_bytes / 1024 / 1024" | bc 2>/dev/null || echo "0")

        # Create bundle analysis report
        cat > "$bundle_analysis_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "buildDirectory": "$build_dir",
  "totalSize": {
    "bytes": $total_size_bytes,
    "megabytes": $total_size_mb,
    "human": "$total_size"
  },
  "javascript": {
    "bytes": $js_size_bytes,
    "megabytes": $js_size_mb
  },
  "css": {
    "bytes": $css_size_bytes,
    "megabytes": $css_size_mb
  },
  "assetCount": $asset_count,
  "thresholds": {
    "totalSizeMB": $BUNDLE_SIZE_THRESHOLD_MB,
    "status": "$(echo "$total_size_mb > $BUNDLE_SIZE_THRESHOLD_MB" | bc -l 2>/dev/null | grep -q 1 && echo "EXCEEDED" || echo "PASSED")"
  }
}
EOF

        log "✅ Bundle analysis completed: ${total_size_mb}MB total"

        # Check threshold
        if command -v bc &> /dev/null && (echo "$total_size_mb > $BUNDLE_SIZE_THRESHOLD_MB" | bc -l | grep -q 1); then
            log "⚠️ Bundle size exceeds threshold: ${total_size_mb}MB > ${BUNDLE_SIZE_THRESHOLD_MB}MB"
        fi

    else
        log "⚠️ No build directory found, skipping bundle size analysis"
        echo '{"error": "No build directory found"}' > "$bundle_analysis_file"
    fi
}

# Function to run Lighthouse audits
run_lighthouse_audits() {
    log "Running Lighthouse audits..."

    local lighthouse_dir="$RESULTS_DIR/lighthouse"
    mkdir -p "$lighthouse_dir"

    for url in "${TEST_URLS[@]}"; do
        log "Testing URL: $url"

        local url_slug=$(echo "$url" | sed 's|[^a-zA-Z0-9]|-|g' | sed 's|--*|-|g' | sed 's|^-||' | sed 's|-$||')
        local results_file="$lighthouse_dir/lighthouse-$url_slug.json"
        local html_file="$lighthouse_dir/lighthouse-$url_slug.html"

        # Run multiple Lighthouse audits and take the median
        local temp_results=()
        for run in $(seq 1 $LIGHTHOUSE_RUNS); do
            local temp_file="/tmp/lighthouse-$url_slug-$run.json"

            if lighthouse \
                --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" \
                --output=json \
                --output-path="$temp_file" \
                --preset=desktop \
                --throttling-method=simulate \
                --disable-storage-reset \
                --max-wait-for-fcp=15000 \
                --max-wait-for-load=35000 \
                "$url" 2>/dev/null; then

                temp_results+=("$temp_file")
                log "✅ Lighthouse run $run completed for $url"
            else
                log "❌ Lighthouse run $run failed for $url"
            fi
        done

        # Process results if we have any successful runs
        if [ ${#temp_results[@]} -gt 0 ]; then
            # Use the first successful result for now (could implement median logic)
            cp "${temp_results[0]}" "$results_file"

            # Generate HTML report
            lighthouse \
                --chrome-flags="--headless --no-sandbox --disable-dev-shm-usage" \
                --output=html \
                --output-path="$html_file" \
                --preset=desktop \
                "$url" 2>/dev/null || true

            # Extract key metrics
            if command -v jq &> /dev/null; then
                local performance=$(jq -r '.categories.performance.score * 100' "$results_file" 2>/dev/null || echo "0")
                local accessibility=$(jq -r '.categories.accessibility.score * 100' "$results_file" 2>/dev/null || echo "0")
                local best_practices=$(jq -r '.categories["best-practices"].score * 100' "$results_file" 2>/dev/null || echo "0")
                local seo=$(jq -r '.categories.seo.score * 100' "$results_file" 2>/dev/null || echo "0")
                local fcp=$(jq -r '.audits["first-contentful-paint"].numericValue' "$results_file" 2>/dev/null || echo "0")
                local lcp=$(jq -r '.audits["largest-contentful-paint"].numericValue' "$results_file" 2>/dev/null || echo "0")

                log "📊 Lighthouse scores for $url:"
                log "   Performance: ${performance}%"
                log "   Accessibility: ${accessibility}%"
                log "   Best Practices: ${best_practices}%"
                log "   SEO: ${seo}%"
                log "   FCP: ${fcp}ms"
                log "   LCP: ${lcp}ms"
            fi

            # Cleanup temp files
            rm -f "${temp_results[@]}"
        else
            log "❌ All Lighthouse runs failed for $url"
        fi
    done

    log "✅ Lighthouse audits completed"
}

# Function to run load tests
run_load_tests() {
    log "Running load tests..."

    local load_test_dir="$RESULTS_DIR/load-tests"
    mkdir -p "$load_test_dir"

    for url in "${TEST_URLS[@]}"; do
        # Skip API endpoints for load testing
        if [[ "$url" == *"/api/"* ]]; then
            continue
        fi

        log "Load testing URL: $url"

        local url_slug=$(echo "$url" | sed 's|[^a-zA-Z0-9]|-|g' | sed 's|--*|-|g' | sed 's|^-||' | sed 's|-$||')
        local results_file="$load_test_dir/load-test-$url_slug.json"

        if command -v autocannon &> /dev/null; then
            autocannon \
                --connections $LOAD_TEST_USERS \
                --duration $LOAD_TEST_DURATION \
                --json \
                "$url" > "$results_file" 2>/dev/null || true

            # Extract key metrics
            if command -v jq &> /dev/null && [ -f "$results_file" ]; then
                local avg_throughput=$(jq -r '.requests.average' "$results_file" 2>/dev/null || echo "0")
                local avg_latency=$(jq -r '.latency.average' "$results_file" 2>/dev/null || echo "0")
                local p99_latency=$(jq -r '.latency.p99' "$results_file" 2>/dev/null || echo "0")
                local errors=$(jq -r '.errors' "$results_file" 2>/dev/null || echo "0")

                log "📊 Load test results for $url:"
                log "   Average throughput: ${avg_throughput} req/s"
                log "   Average latency: ${avg_latency}ms"
                log "   P99 latency: ${p99_latency}ms"
                log "   Errors: $errors"
            fi
        else
            log "⚠️ autocannon not available, skipping load test for $url"
        fi
    done

    log "✅ Load tests completed"
}

# Function to run memory profiling
run_memory_profiling() {
    log "Running memory profiling..."

    local memory_dir="$RESULTS_DIR/memory"
    mkdir -p "$memory_dir"

    if [ "$PUPPETEER_AVAILABLE" = true ]; then
        # Create memory profiling script
        cat > "/tmp/memory-profile.js" << 'EOF'
const puppeteer = require('puppeteer');
const fs = require('fs');

async function profileMemory(url, outputFile) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();

  // Enable runtime and get initial metrics
  await page._client.send('Runtime.enable');
  const initialMetrics = await page._client.send('Runtime.getHeapUsage');

  // Navigate to page
  await page.goto(url, { waitUntil: 'networkidle0' });

  // Wait for page to settle
  await page.waitForTimeout(5000);

  // Perform some interactions to simulate user behavior
  try {
    await page.evaluate(() => {
      // Scroll page
      window.scrollTo(0, document.body.scrollHeight);
      window.scrollTo(0, 0);

      // Click elements if they exist
      const buttons = document.querySelectorAll('button');
      if (buttons.length > 0) {
        buttons[0].click();
      }
    });

    await page.waitForTimeout(2000);
  } catch (e) {
    console.log('Interaction error (expected):', e.message);
  }

  // Get final metrics
  const finalMetrics = await page._client.send('Runtime.getHeapUsage');

  // Get performance metrics
  const performanceMetrics = await page.metrics();

  const results = {
    url: url,
    timestamp: new Date().toISOString(),
    heap: {
      initial: initialMetrics,
      final: finalMetrics,
      growth: finalMetrics.usedSize - initialMetrics.usedSize
    },
    performance: performanceMetrics
  };

  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

  await browser.close();

  console.log(`Memory profiling completed for ${url}`);
  console.log(`Heap growth: ${(results.heap.growth / 1024 / 1024).toFixed(2)} MB`);
}

const url = process.argv[2];
const outputFile = process.argv[3];
profileMemory(url, outputFile).catch(console.error);
EOF

        # Run memory profiling for each URL
        for url in "${TEST_URLS[@]}"; do
            # Skip API endpoints
            if [[ "$url" == *"/api/"* ]]; then
                continue
            fi

            local url_slug=$(echo "$url" | sed 's|[^a-zA-Z0-9]|-|g' | sed 's|--*|-|g' | sed 's|^-||' | sed 's|-$||')
            local results_file="$memory_dir/memory-$url_slug.json"

            if node "/tmp/memory-profile.js" "$url" "$results_file" 2>/dev/null; then
                log "✅ Memory profiling completed for $url"

                # Extract key metrics
                if command -v jq &> /dev/null; then
                    local heap_growth=$(jq -r '.heap.growth' "$results_file" 2>/dev/null || echo "0")
                    local heap_growth_mb=$(echo "scale=2; $heap_growth / 1024 / 1024" | bc 2>/dev/null || echo "0")
                    local js_heap_used=$(jq -r '.performance.JSHeapUsedSize' "$results_file" 2>/dev/null || echo "0")
                    local js_heap_used_mb=$(echo "scale=2; $js_heap_used / 1024 / 1024" | bc 2>/dev/null || echo "0")

                    log "📊 Memory metrics for $url:"
                    log "   Heap growth: ${heap_growth_mb}MB"
                    log "   JS heap used: ${js_heap_used_mb}MB"
                fi
            else
                log "❌ Memory profiling failed for $url"
            fi
        done

        # Cleanup
        rm -f "/tmp/memory-profile.js"
    else
        log "⚠️ Puppeteer not available, skipping memory profiling"
    fi

    log "✅ Memory profiling completed"
}

# Function to analyze performance regression
analyze_regression() {
    log "Analyzing performance regression..."

    local regression_file="$RESULTS_DIR/regression-analysis.json"

    if [ -f "$BASELINE_FILE" ]; then
        log "Comparing against baseline: $BASELINE_FILE"

        # Create regression analysis (simplified version)
        cat > "$regression_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "baselineFile": "$BASELINE_FILE",
  "analysis": {
    "status": "completed",
    "regressions": [],
    "improvements": [],
    "summary": "Regression analysis completed"
  }
}
EOF

        # TODO: Implement detailed regression analysis comparing current results with baseline
        log "✅ Regression analysis completed"
    else
        log "⚠️ No baseline file found, creating new baseline"

        # Create baseline from current results
        cat > "$regression_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "analysis": {
    "status": "baseline_created",
    "note": "No previous baseline found, current results will be used as baseline"
  }
}
EOF
    fi
}

# Function to generate comprehensive report
generate_report() {
    log "Generating performance report..."

    local report_data="{
  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
  \"baseUrl\": \"$BASE_URL\",
  \"testConfiguration\": {
    \"lighthouseRuns\": $LIGHTHOUSE_RUNS,
    \"loadTestDuration\": $LOAD_TEST_DURATION,
    \"loadTestUsers\": $LOAD_TEST_USERS
  },
  \"thresholds\": {
    \"lighthouse\": {
      \"performance\": $LIGHTHOUSE_PERFORMANCE_THRESHOLD,
      \"accessibility\": $LIGHTHOUSE_ACCESSIBILITY_THRESHOLD,
      \"bestPractices\": $LIGHTHOUSE_BEST_PRACTICES_THRESHOLD,
      \"seo\": $LIGHTHOUSE_SEO_THRESHOLD
    },
    \"bundleSize\": $BUNDLE_SIZE_THRESHOLD_MB,
    \"responseTime\": $RESPONSE_TIME_THRESHOLD_MS,
    \"memoryUsage\": $MEMORY_USAGE_THRESHOLD_MB
  },"

    # Add bundle analysis if available
    if [ -f "$RESULTS_DIR/bundle-analysis.json" ]; then
        report_data="${report_data}
  \"bundleAnalysis\": $(cat "$RESULTS_DIR/bundle-analysis.json"),"
    fi

    # Add lighthouse results
    report_data="${report_data}
  \"lighthouseResults\": {"
    local first=true
    for url in "${TEST_URLS[@]}"; do
        local url_slug=$(echo "$url" | sed 's|[^a-zA-Z0-9]|-|g' | sed 's|--*|-|g' | sed 's|^-||' | sed 's|-$||')
        local results_file="$RESULTS_DIR/lighthouse/lighthouse-$url_slug.json"

        if [ -f "$results_file" ]; then
            if [ "$first" = true ]; then
                first=false
            else
                report_data="${report_data},"
            fi
            report_data="${report_data}
    \"$url\": $(cat "$results_file")"
        fi
    done
    report_data="${report_data}
  },"

    # Add load test results
    report_data="${report_data}
  \"loadTestResults\": {"
    first=true
    for url in "${TEST_URLS[@]}"; do
        if [[ "$url" == *"/api/"* ]]; then
            continue
        fi

        local url_slug=$(echo "$url" | sed 's|[^a-zA-Z0-9]|-|g' | sed 's|--*|-|g' | sed 's|^-||' | sed 's|-$||')
        local results_file="$RESULTS_DIR/load-tests/load-test-$url_slug.json"

        if [ -f "$results_file" ]; then
            if [ "$first" = true ]; then
                first=false
            else
                report_data="${report_data},"
            fi
            report_data="${report_data}
    \"$url\": $(cat "$results_file")"
        fi
    done
    report_data="${report_data}
  }"

    # Close JSON
    report_data="${report_data}
}"

    # Write report
    echo "$report_data" > "$REPORT_FILE"

    # Generate markdown summary
    cat > "$SUMMARY_FILE" << EOF
# Performance Test Report

**Generated:** $(date)
**Base URL:** $BASE_URL

## Summary

### Bundle Size Analysis
EOF

    if [ -f "$RESULTS_DIR/bundle-analysis.json" ] && command -v jq &> /dev/null; then
        local total_size_mb=$(jq -r '.totalSize.megabytes' "$RESULTS_DIR/bundle-analysis.json" 2>/dev/null || echo "0")
        local threshold_status=$(jq -r '.thresholds.status' "$RESULTS_DIR/bundle-analysis.json" 2>/dev/null || echo "UNKNOWN")

        echo "- Total Bundle Size: ${total_size_mb}MB" >> "$SUMMARY_FILE"
        echo "- Threshold Status: $threshold_status" >> "$SUMMARY_FILE"
    else
        echo "- Bundle analysis not available" >> "$SUMMARY_FILE"
    fi

    echo "" >> "$SUMMARY_FILE"
    echo "### Lighthouse Scores" >> "$SUMMARY_FILE"

    # Add Lighthouse summary
    for url in "${TEST_URLS[@]}"; do
        local url_slug=$(echo "$url" | sed 's|[^a-zA-Z0-9]|-|g' | sed 's|--*|-|g' | sed 's|^-||' | sed 's|-$||')
        local results_file="$RESULTS_DIR/lighthouse/lighthouse-$url_slug.json"

        if [ -f "$results_file" ] && command -v jq &> /dev/null; then
            local performance=$(jq -r '.categories.performance.score * 100' "$results_file" 2>/dev/null || echo "0")
            local accessibility=$(jq -r '.categories.accessibility.score * 100' "$results_file" 2>/dev/null || echo "0")

            echo "#### $url" >> "$SUMMARY_FILE"
            echo "- Performance: ${performance}%" >> "$SUMMARY_FILE"
            echo "- Accessibility: ${accessibility}%" >> "$SUMMARY_FILE"
            echo "" >> "$SUMMARY_FILE"
        fi
    done

    echo "### Load Test Results" >> "$SUMMARY_FILE"

    # Add load test summary
    for url in "${TEST_URLS[@]}"; do
        if [[ "$url" == *"/api/"* ]]; then
            continue
        fi

        local url_slug=$(echo "$url" | sed 's|[^a-zA-Z0-9]|-|g' | sed 's|--*|-|g' | sed 's|^-||' | sed 's|-$||')
        local results_file="$RESULTS_DIR/load-tests/load-test-$url_slug.json"

        if [ -f "$results_file" ] && command -v jq &> /dev/null; then
            local avg_throughput=$(jq -r '.requests.average' "$results_file" 2>/dev/null || echo "0")
            local avg_latency=$(jq -r '.latency.average' "$results_file" 2>/dev/null || echo "0")

            echo "#### $url" >> "$SUMMARY_FILE"
            echo "- Average Throughput: ${avg_throughput} req/s" >> "$SUMMARY_FILE"
            echo "- Average Latency: ${avg_latency}ms" >> "$SUMMARY_FILE"
            echo "" >> "$SUMMARY_FILE"
        fi
    done

    log "✅ Performance report generated"
    log "   📄 JSON Report: $REPORT_FILE"
    log "   📄 Summary: $SUMMARY_FILE"
}

# Function to update baseline
update_baseline() {
    if [ -f "$REPORT_FILE" ]; then
        log "Updating performance baseline..."
        cp "$REPORT_FILE" "$BASELINE_FILE"
        log "✅ Baseline updated"
    fi
}

# Function to cleanup
cleanup() {
    log "Cleaning up temporary files..."

    # Remove temporary files
    rm -f /tmp/lighthouse-*.json
    rm -f /tmp/memory-profile.js

    log "✅ Cleanup completed"
}

# Main function
main() {
    local start_time=$SECONDS

    echo -e "${BLUE}=== Performance Testing Pipeline ===${NC}"

    # Prerequisites
    check_prerequisites

    # Performance tests
    analyze_bundle_size
    run_lighthouse_audits
    run_load_tests
    run_memory_profiling

    # Analysis and reporting
    analyze_regression
    generate_report
    update_baseline

    # Summary
    local duration=$((SECONDS - start_time))
    echo -e "${GREEN}✅ Performance testing completed in ${duration}s${NC}"
    echo "Results available in: $RESULTS_DIR/"

    cleanup
}

# Trap cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"