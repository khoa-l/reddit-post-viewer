#!/bin/bash
# Sync data from reddit-downloader to reddit-viewer

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directories
SOURCE_DIR="../reddit-downloader/data"
DEST_DIR="./data"

echo -e "${YELLOW}Syncing data from reddit-downloader to reddit-viewer...${NC}\n"

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: Source directory $SOURCE_DIR not found"
    exit 1
fi

# Check if destination directory exists
if [ ! -d "$DEST_DIR" ]; then
    echo "Error: Destination directory $DEST_DIR not found"
    exit 1
fi

# Count files to sync
JSON_COUNT=$(find "$SOURCE_DIR" -maxdepth 1 -name "*.json" -type f | wc -l | tr -d ' ')
MEDIA_DIRS=$(find "$SOURCE_DIR/media" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')

echo "Found:"
echo "  - $JSON_COUNT JSON files"
echo "  - $MEDIA_DIRS media directories"
echo ""

# Copy JSON files (excluding those in subdirectories)
echo "Copying JSON files..."
find "$SOURCE_DIR" -maxdepth 1 -name "*.json" -type f -exec cp {} "$DEST_DIR/" \;

# Copy media directories if they exist
if [ -d "$SOURCE_DIR/media" ] && [ "$(ls -A "$SOURCE_DIR/media" 2>/dev/null)" ]; then
    echo "Copying media directories..."
    mkdir -p "$DEST_DIR/media"
    cp -r "$SOURCE_DIR/media/"* "$DEST_DIR/media/" 2>/dev/null || true
fi

echo -e "\n${GREEN}✓ Sync complete!${NC}"

# Show summary
COPIED_JSON=$(find "$DEST_DIR" -maxdepth 1 -name "*.json" -type f | wc -l | tr -d ' ')
COPIED_MEDIA=$(find "$DEST_DIR/media" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "Current data directory contains:"
echo "  - $COPIED_JSON JSON files"
echo "  - $COPIED_MEDIA media directories"
