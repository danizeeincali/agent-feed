#!/bin/bash
# Claude resume with increased memory allocation

# Set Node.js memory to 4GB (adjust as needed)
export NODE_OPTIONS="--max-old-space-size=4096"

# Run claude with resume flag
claude --resume "$@"