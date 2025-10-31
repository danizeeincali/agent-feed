#!/bin/bash

# WebSocket Activity Monitor
# Monitors backend logs for WebSocket subscriptions and events in real-time

echo "🔍 WebSocket Activity Monitor"
echo "=============================="
echo ""
echo "Monitoring: /tmp/backend-final.log"
echo "Press Ctrl+C to stop"
echo ""
echo "Watching for:"
echo "  - WebSocket connections"
echo "  - subscribe:post events"
echo "  - Broadcasted comments"
echo "  - Conversation chains"
echo ""
echo "==============================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Monitor the log file
tail -f /tmp/backend-final.log | grep --line-buffered -E "WebSocket|subscribed to post|Broadcasted comment|conversation chain|Built conversation" | while read line; do
  if echo "$line" | grep -q "WebSocket client connected"; then
    echo -e "${GREEN}[CONNECT]${NC} $line"
  elif echo "$line" | grep -q "subscribed to post"; then
    echo -e "${BLUE}[SUBSCRIBE]${NC} $line"
  elif echo "$line" | grep -q "Broadcasted comment"; then
    echo -e "${YELLOW}[BROADCAST]${NC} $line"
  elif echo "$line" | grep -q "conversation chain\|Built conversation"; then
    echo -e "${RED}[CHAIN]${NC} $line"
  else
    echo "$line"
  fi
done
