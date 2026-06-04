# Reddit Post Data

This directory stores Reddit post JSON files served by the viewer.

## Structure

- `index.json` - Metadata index of all posts
- `{postId}.json` - Individual post files
- `media/{postId}/` - Downloaded media files

## Adding Posts

Use the [reddit-downloader](https://github.com/your-org/reddit-downloader) tool to download posts:

```bash
# Download to reddit-downloader/data
cd path/to/reddit-downloader
node downloader.js "https://reddit.com/r/subreddit/comments/abc123/title"

# Copy to reddit-viewer/data
cp data/*.json path/to/reddit-viewer/data/
cp -r data/media/* path/to/reddit-viewer/data/media/
```

Or symlink the directories for local development:

```bash
cd reddit-viewer
rm -rf data
ln -s ../reddit-downloader/data data
```
