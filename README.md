# Reddit Post Viewer

A web-based viewer for displaying Reddit posts from JSON files.

## Overview

This is a standalone viewer application that displays Reddit posts stored as JSON files. It provides a clean, Reddit-like interface for browsing posts, viewing images/videos/galleries, and reading comment threads.

## Requirements

- Node.js 14 or higher
- JSON post files in the expected format

## Quick Start

1. Create a `data` directory and add JSON files:

```bash
mkdir data
# Add your JSON files to the data directory
```

2. Start the server:

```bash
node server.js
```

3. Open http://localhost:8000 in your browser

## Configuration

Environment variables:

- `PORT` - Server port (default: 8000)
- `DATA_DIR` - Path to data directory (default: ./data)
- `DEV_MODE` - Show post list at root URL (default: false)

Example:

```bash
PORT=3000 DATA_DIR=/path/to/data node server.js
```

## Data Format

The viewer expects JSON files in this format:

```json
{
  "path": "r/subreddit/comments/1o9o0pu/title",
  "timestamp": "2025-10-18T15:33:08.432Z",
  "data": [
    {
      "kind": "Listing",
      "data": {
        "children": [
          {
            "kind": "t3",
            "data": {
              "title": "Post title",
              "author": "username",
              "subreddit": "subreddit",
              ...
            }
          }
        ]
      }
    },
    {
      "kind": "Listing",
      "data": {
        "children": [...]
      }
    }
  ]
}
```

Posts should be named using Reddit post IDs (e.g., `1o9o0pu.json`).

An `index.json` file should contain metadata:

```json
{
  "1o9o0pu": {
    "path": "r/subreddit/comments/1o9o0pu/title",
    "title": "Post title",
    "subreddit": "subreddit",
    "author": "username",
    "timestamp": "2025-10-18T15:33:08.432Z",
    "filename": "1o9o0pu.json",
    "postId": "1o9o0pu"
  }
}
```

## Usage

### Viewing Posts

Navigate to http://localhost:8000/index.html to see the list of posts.

Click any post to view it at http://localhost:8000/viewer.html?post={postId}

### Embedding in Qualtrics

Use the viewer in Qualtrics surveys:

```html
<iframe src="https://your-domain.com/viewer.html?post=1o9o0pu"></iframe>
```

With Qualtrics embedded data:

```html
<iframe src="https://your-domain.com/viewer.html?post=${e://Field/post_id}"></iframe>
```

## Features

- Clean Reddit-like interface
- Displays images, videos, and galleries
- Nested comment threads with proper formatting
- Supports Markdown in comments
- Works offline (except for media loading)
- No external dependencies

## API Endpoints

The server provides these endpoints:

- `GET /api/posts` - List all posts from index.json
- `GET /api/post/{filename}` - Get specific post data

## File Structure

```
reddit-viewer/
├── server.js          # HTTP server
├── index.html         # Post list page
├── viewer.html        # Post viewer page
├── viewer.js          # Client-side rendering
├── data/              # JSON data files
│   ├── index.json
│   └── {postId}.json
└── README.md
```

## Troubleshooting

**No posts displayed**
- Check that data directory exists and contains index.json
- Verify JSON files are in the correct format
- Restart the server

**Post not loading**
- Verify the JSON file exists in data directory
- Check browser console for errors
- Ensure filename matches the post ID in the URL

**Images not loading**
- Images are loaded from Reddit's CDN and require internet
- Check that the URLs in the JSON are valid

## License

MIT
