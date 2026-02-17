#!/usr/bin/env node
// Sync data from reddit-downloader to reddit-viewer with sequential post IDs
// Remaps Reddit's base-36 IDs (e.g. 1q6ud26) to sequential IDs (post1, post2, ...)

const fs = require('fs');
const path = require('path');

const SOURCE_DIR = path.resolve(__dirname, '../reddit-downloader/data');
const DEST_DIR = path.resolve(__dirname, 'data');

// Validate directories
if (!fs.existsSync(SOURCE_DIR)) {
  console.error(`Error: Source directory not found: ${SOURCE_DIR}`);
  process.exit(1);
}
if (!fs.existsSync(DEST_DIR)) {
  console.error(`Error: Destination directory not found: ${DEST_DIR}`);
  process.exit(1);
}

// Read source index
const sourceIndex = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, 'index.json'), 'utf-8'));
const entries = Object.entries(sourceIndex);
console.log(`Found ${entries.length} posts in source index\n`);

// Clean destination: remove existing JSON files and media dirs
for (const f of fs.readdirSync(DEST_DIR)) {
  const full = path.join(DEST_DIR, f);
  if (f.endsWith('.json')) fs.unlinkSync(full);
}
const mediaDir = path.join(DEST_DIR, 'media');
if (fs.existsSync(mediaDir)) {
  fs.rmSync(mediaDir, { recursive: true });
}
fs.mkdirSync(mediaDir, { recursive: true });

// Build new index with sequential IDs (preserving order from source index = by timestamp)
const newIndex = {};

entries.forEach(([redditId, meta], i) => {
  const seqId = `post${i + 1}`;

  // Copy and remap the post JSON
  const srcJson = path.join(SOURCE_DIR, `${redditId}.json`);
  if (fs.existsSync(srcJson)) {
    let content = fs.readFileSync(srcJson, 'utf-8');
    content = content.replaceAll(`media/${redditId}/`, `media/${seqId}/`);
    fs.writeFileSync(path.join(DEST_DIR, `${seqId}.json`), content);
  }

  // Copy media directory if it exists
  const srcMedia = path.join(SOURCE_DIR, 'media', redditId);
  if (fs.existsSync(srcMedia)) {
    copyDirSync(srcMedia, path.join(mediaDir, seqId));
  }

  // Build new index entry
  newIndex[seqId] = {
    ...meta,
    postId: seqId,
    filename: `${seqId}.json`,
  };

  console.log(`  ${redditId} -> ${seqId}${meta.hasLocalMedia ? ' (with media)' : ''}`);
});

// Write new index
fs.writeFileSync(path.join(DEST_DIR, 'index.json'), JSON.stringify(newIndex, null, 2));

console.log(`\nSync complete! ${entries.length} posts written with sequential IDs.`);

// --- helpers ---

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}
