#!/bin/bash
# DevContainer Initialize Script
# Runs on host before container creation

set -e

# Create necessary directories
mkdir -p .claude memory logs

# Set permissions
chmod 755 .claude memory logs

echo "DevContainer initialization complete"