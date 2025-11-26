#!/bin/bash
# Sync data from reddit-downloader to reddit-viewer
# Mirrors the exact state of JSON files and media directories

# Color codes for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Source and destination directories
SOURCE_DIR="../reddit-downloader/data"
DEST_DIR="./data"

echo -e "${YELLOW}Syncing data from reddit-downloader to reddit-viewer...${NC}\n"

# Validate source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: Source directory $SOURCE_DIR not found"
    exit 1
fi

# Validate destination directory exists
if [ ! -d "$DEST_DIR" ]; then
    echo "Error: Destination directory $DEST_DIR not found"
    exit 1
fi

# Remove all existing JSON files in destination (to mirror empty state if needed)
echo "Removing existing JSON files..."
find "$DEST_DIR" -maxdepth 1 -name "*.json" -type f -delete

# Remove all existing media directories in destination
if [ -d "$DEST_DIR/media" ]; then
    echo "Removing existing media directories..."
    find "$DEST_DIR/media" -mindepth 1 -maxdepth 1 -type d -exec rm -rf {} +
fi

# Count files in source
JSON_COUNT=$(find "$SOURCE_DIR" -maxdepth 1 -name "*.json" -type f 2>/dev/null | wc -l | tr -d ' ')
MEDIA_DIRS=$(find "$SOURCE_DIR/media" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "Source contains:"
echo "  - $JSON_COUNT JSON files"
echo "  - $MEDIA_DIRS media directories"
echo ""

# Copy JSON files from source root
if [ "$JSON_COUNT" -gt 0 ]; then
    echo "Copying JSON files..."
    find "$SOURCE_DIR" -maxdepth 1 -name "*.json" -type f -exec cp {} "$DEST_DIR/" \;
else
    echo "No JSON files to copy (empty state)"
fi

# Copy media directories if they exist
if [ -d "$SOURCE_DIR/media" ] && [ "$(ls -A "$SOURCE_DIR/media" 2>/dev/null)" ]; then
    echo "Copying media directories..."
    mkdir -p "$DEST_DIR/media"
    cp -r "$SOURCE_DIR/media/"* "$DEST_DIR/media/" 2>/dev/null || true
else
    echo "No media directories to copy (empty state)"
fi

echo -e "\n${GREEN}Sync complete!${NC}"

# Display summary of destination state
COPIED_JSON=$(find "$DEST_DIR" -maxdepth 1 -name "*.json" -type f 2>/dev/null | wc -l | tr -d ' ')
COPIED_MEDIA=$(find "$DEST_DIR/media" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')

echo ""
echo "Destination now contains:"
echo "  - $COPIED_JSON JSON files"
echo "  - $COPIED_MEDIA media directories"
