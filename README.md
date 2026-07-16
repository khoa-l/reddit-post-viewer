# Reddit Survey Client

A web-based viewer for displaying Reddit posts from JSON files with support for images, videos, galleries, and nested comments.

## Quick Start

1. **Add posts to data directory**
   - The `data/` directory contains post JSON files
   - Use [reddit-downloader](https://github.com/your-org/reddit-downloader) to download posts
   - Copy downloaded files to `data/` or symlink for local development

2. **Start the server**
```bash
node server.js
```

3. **View posts**
   - Post list: http://localhost:8000/index.html
   - Individual post: http://localhost:8000/viewer.html?post={postId}
   - Attention check: http://localhost:8000/viewer.html?post=attention

## Configuration

Environment variables:
- `PORT` - Server port (default: 8000)
- `DATA_DIR` - Path to data directory (default: ./data)
- `DEV_MODE` - Show post list at root URL (default: false)

Example:
```bash
PORT=3000 DEV_MODE=true node server.js
```

## Data Format

Posts are stored in the `data/` directory:
- `data/index.json` - Metadata index of all posts
- `data/{postId}.json` - Individual post files
- `data/media/{postId}/` - Downloaded media files (videos, images)

### Adding Posts

Download posts with [reddit-downloader](https://github.com/your-org/reddit-downloader), then:

```bash
# Sync data from reddit-downloader
./sync-data.sh

# Or symlink for local development
rm -rf data && ln -s ../reddit-downloader/data data
```

## Embedding in Qualtrics

Use the viewer in Qualtrics surveys with embedded data:

```html
<iframe src="https://your-domain.com/viewer.html?post=${e://Field/post_id}"
        width="100%" height="800" frameborder="0"></iframe>
```

For attention checks:
```html
<iframe src="https://your-domain.com/viewer.html?post=attention"
        width="100%" height="600" frameborder="0"></iframe>
```

## Features

- Reddit-like interface with proper formatting
- Image, video, and gallery support
- Nested collapsible comments with Markdown rendering
- Local media playback (for downloaded videos/images)
- Attention check functionality
- Works with symlinked data directories

## API Endpoints

- `GET /api/config` - Get server configuration
- `GET /api/posts` - List all posts from index.json
- `GET /api/post/{filename}` - Get specific post data
- `GET /api/media/{path}` - Serve local media files

## File Structure

```
reddit-viewer/
├── server.js          # HTTP server
├── index.html         # Post list page
├── index.js           # Post list renderer
├── viewer.html        # Post viewer page
├── viewer.js          # Post viewer renderer
├── data/              # Post data directory
│   ├── README.md
│   ├── index.json
│   ├── {postId}.json
│   └── media/
└── README.md
```

## Troubleshooting

**No posts displayed**
- Ensure data symlink exists: `ls -la data`
- Check index.json exists: `ls data/index.json`
- Verify posts are downloaded in reddit-downloader

**Videos not playing**
- Ensure media files exist in `data/media/{postId}/`
- Check that media was downloaded with reddit-downloader
- Verify file paths in JSON match actual file locations
