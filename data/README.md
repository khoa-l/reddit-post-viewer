# Reddit Post Data

This repository contains downloaded Reddit posts in JSON format for use with the Reddit Post Viewer.

## Structure

- `index.json` - Metadata index of all posts
- `{postId}.json` - Individual post files named by Reddit post ID

## Usage

This data repository is designed to be used with the Reddit Post Viewer:
https://github.com/khoa-l/reddit-post-viewer

### Local Development

Clone this repository to your viewer's data directory:

```bash
cd reddit-viewer
git clone https://github.com/khoa-l/reddit-post-data.git data
```

### Deployment

When deploying the viewer, you can:

1. Clone this data repository during deployment
2. Set the DATA_DIR environment variable to point to this directory
3. The viewer server will read JSON files from this location

Example deployment setup:

```bash
git clone https://github.com/khoa-l/reddit-post-viewer.git
cd reddit-post-viewer
git clone https://github.com/khoa-l/reddit-post-data.git data
node server.js
```

## Data Format

Each post file contains the full Reddit API response:

```json
{
  "path": "r/subreddit/comments/1o9o0pu/title",
  "timestamp": "2025-10-18T15:33:08.432Z",
  "data": [...]
}
```

The index.json file contains metadata for quick lookups:

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

## Updating Data

To add new posts, download them using the reddit-downloader tool and commit the changes to this repository.
