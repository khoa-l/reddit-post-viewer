// Reddit Post Viewer - displays individual posts from JSON files

class RedditPostViewer {
  constructor() {
    this.galleryIndex = 0;
    this.init();
  }

  async init() {
    // Check if dev mode is enabled to show back button
    await this.checkDevMode();

    const params = new URLSearchParams(window.location.search);
    const postId = params.get('post');

    if (!postId) {
      return this.showError('No post specified. Return to the list and select a post.');
    }

    // Construct filename from post ID
    const filename = `${postId}.json`;
    this.loadPost(filename);
  }

  async checkDevMode() {
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const config = await response.json();
        if (config.devMode) {
          const backButton = document.querySelector('.back-button');
          if (backButton) {
            backButton.classList.add('visible');
          }
        }
      }
    } catch (error) {
      // Silently fail - back button stays hidden
      console.log('Could not fetch config');
    }
  }

  async loadPost(filename) {
    this.showLoading();

    try {
      const response = await fetch(`/api/post/${filename}`);

      if (!response.ok) {
        throw new Error('Failed to fetch post data');
      }

      const postData = await response.json();

      // The data structure is: { path, timestamp, data: [postListing, commentsListing] }
      const [postListing, commentsListing] = postData.data;
      const post = postListing.data.children[0].data;
      const comments = commentsListing.data.children;

      this.displayPost(post, comments);
    } catch (error) {
      console.error('Error:', error);
      this.showError(`Failed to load post: ${error.message}`);
    }
  }

  displayPost(post, comments) {
    document.getElementById('app').innerHTML = `
      <div class="post-container">
        <div class="post-content">
          <h1 class="post-title">${this.decode(post.title)}</h1>
          <div class="post-meta">
            <span>Posted by <a href="https://reddit.com/u/${post.author}" target="_blank">u/${post.author}</a></span>
            <span>in <a href="https://reddit.com/r/${post.subreddit}" target="_blank">r/${post.subreddit}</a></span>
            <span>${this.formatTime(post.created_utc)}</span>
            <span>${this.formatNum(post.num_comments)} comments</span>
          </div>
          <div class="post-body">${this.renderContent(post)}</div>
        </div>
      </div>
      <div class="comments-container">
        <div class="comments-header">Comments (${this.formatNum(post.num_comments)})</div>
        <div>${this.renderComments(comments)}</div>
      </div>
    `;

    this.attachGalleryListeners();
  }

  attachGalleryListeners() {
    const galleryNavButtons = document.querySelectorAll('.gallery-nav');
    galleryNavButtons.forEach(button => {
      button.addEventListener('click', () => {
        const direction = parseInt(button.getAttribute('data-direction'), 10);
        this.navGallery(direction);
      });
    });
  }

  renderContent(post) {
    let html = '';

    if (post.selftext?.trim()) {
      html += `<div class="post-selftext">${this.formatCommentBody(post.selftext, post.selftext_html)}</div>`;
    }

    html += '<div class="post-media">';

    if (post.is_gallery && post.gallery_data && post.media_metadata) {
      html += this.renderGallery(post);
    } else if (post.is_video && post.media?.reddit_video) {
      const video = post.media.reddit_video;
      const isGif = video.is_gif;

      if (isGif) {
        html += `<div class="media-frame"><video class="post-video" controls muted loop><source src="${video.fallback_url}" type="video/mp4"></video></div>`;
      } else {
        html += `<div class="media-frame"><video class="post-video" controls muted><source src="${video.fallback_url}" type="video/mp4"></video></div>`;
      }
    } else if (post.post_hint === 'image' || this.isImage(post.url)) {
      const imgUrl = post.preview?.images?.[0]?.source?.url
        ? this.decode(post.preview.images[0].source.url)
        : post.url;
      html += `<div class="media-frame"><img src="${imgUrl}" alt="${this.decode(post.title)}" class="post-image" /></div>`;
    } else if (post.url && post.url !== post.permalink && !post.is_self) {
      const thumb = post.thumbnail?.startsWith('http')
        ? `<img src="${post.thumbnail}" class="post-thumbnail" alt="Link preview" />`
        : '';
      html += `<a href="${post.url}" target="_blank" rel="noopener noreferrer" class="post-link">${thumb}<div>${post.url}</div></a>`;
    }

    html += '</div>';
    return html;
  }

  renderGallery(post) {
    const items = post.gallery_data.items;
    const metadata = post.media_metadata;

    let html = '<div class="gallery-container"><div class="gallery-images" id="gallery-images">';

    items.forEach((item, i) => {
      const media = metadata[item.media_id];
      if (media?.s) {
        const url = this.decode(media.s.u || media.s.gif);
        html += `<img src="${url}" alt="Image ${i + 1}" class="gallery-image" />`;
      }
    });

    html += '</div>';

    if (items.length > 1) {
      html += `
        <button class="gallery-nav gallery-prev" data-direction="-1">‹</button>
        <button class="gallery-nav gallery-next" data-direction="1">›</button>
        <div class="gallery-indicator"><span id="gallery-current">1</span> / ${items.length}</div>
      `;
    }

    html += '</div>';
    return html;
  }

  renderComments(comments, depth = 0) {
    if (!comments || !Array.isArray(comments)) return '';

    return comments.map((comment) => {
      if (comment.kind === 't1' && comment.data) {
        const d = comment.data;
        const nested = depth > 0 ? 'nested' : '';
        let html = `
          <div class="comment ${nested}">
            <div class="comment-author">
              <span class="comment-author-name">u/${d.author}</span>
              <span>• ${this.formatTime(d.created_utc)}</span>
            </div>
            <div class="comment-body">${this.formatCommentBody(d.body, d.body_html)}</div>
        `;

        if (d.replies?.data?.children) {
          html += this.renderComments(d.replies.data.children, depth + 1);
        }

        html += '</div>';
        return html;
      }
      // Remove "show more comments" button - skip rendering 'more' comments
      return '';
    }).join('');
  }

  navGallery(dir) {
    const gallery = document.getElementById('gallery-images');
    const total = gallery.querySelectorAll('.gallery-image').length;

    this.galleryIndex = (this.galleryIndex + dir + total) % total;
    gallery.style.transform = `translateX(-${this.galleryIndex * 100}%)`;

    const indicator = document.getElementById('gallery-current');
    if (indicator) indicator.textContent = this.galleryIndex + 1;
  }

  isImage(url) {
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url) ||
           url?.includes('i.redd.it') ||
           url?.includes('i.imgur.com');
  }

  formatNum(num) {
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'k';
    return num.toString();
  }

  formatTime(ts) {
    const diff = Date.now() / 1000 - ts;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} minute${Math.floor(diff / 60) !== 1 ? 's' : ''} ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) !== 1 ? 's' : ''} ago`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) !== 1 ? 's' : ''} ago`;
    return new Date(ts * 1000).toLocaleDateString();
  }

  decode(html) {
    if (!html) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = html;
    return txt.value;
  }

  formatCommentBody(body, body_html) {
    if (body_html) {
      // Decode HTML entities and clean up Reddit's HTML
      let html = this.decode(body_html);
      // Fix paragraph spacing in Reddit HTML
      html = html.replace(/<\/p>\s*<p>/g, '</p><p>');
      return html;
    }

    if (!body) return '';
    let text = this.escapeHtml(body);

    const placeholders = [];
    const protect = (content) => {
      const id = `<<<PROTECTED_${placeholders.length}>>>`;
      placeholders.push(content);
      return id;
    };
    const restore = (text) => {
      placeholders.forEach((content, i) => {
        text = text.replaceAll(`<<<PROTECTED_${i}>>>`, content);
      });
      return text;
    };

    // Handle code blocks (4 spaces or tab indented)
    text = text.replace(/^(?: {4}|\t)(.*)$/gm, '<CODE_LINE>$1</CODE_LINE>');
    text = text.replace(/(<CODE_LINE>.*<\/CODE_LINE>\n?)+/g, (match) => {
      const code = match.replace(/<CODE_LINE>(.*)<\/CODE_LINE>\n?/g, '$1\n').trim();
      return protect(`<pre><code>${code}</code></pre>`);
    });

    // Handle horizontal rules
    text = text.replace(/^\s*(\-{3,}|\*{3,}|_{3,})\s*$/gm, protect('<hr>'));

    // Handle blockquotes
    text = text.replace(/^>\s?(.*)$/gm, '<QUOTE>$1</QUOTE>');
    text = text.replace(/(<QUOTE>.*?<\/QUOTE>\n?)+/g, (match) => {
      const content = match.replace(/<QUOTE>(.*?)<\/QUOTE>\n?/g, '$1\n').trim();
      return protect(`<blockquote>${content}</blockquote>`);
    });

    // Handle inline code (backticks)
    text = text.replace(/`([^`]+?)`/g, (match, code) => {
      return protect(`<code>${code}</code>`);
    });

    // Handle links and images [text](url)
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      if (this.isImage(url)) {
        return protect(`<img src="${url}" alt="${linkText}" />`);
      }
      return protect(`<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`);
    });

    // Handle bold (**text** or __text__)
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__(.+?)__/g, '<strong>$1</strong>');

    // Handle strikethrough (~~text~~)
    text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Handle italic (*text* or _text_) - more careful to avoid conflicts
    text = text.replace(/(^|[^*])\*([^\s*](?:[^*]*[^\s*])?)\*($|[^*])/gm, (match, before, content, after) => {
      if (match.includes('<') || match.includes('>')) return match;
      return `${before}<em>${content}</em>${after}`;
    });

    text = text.replace(/(^|[^_])_([^\s_](?:[^_]*[^\s_])?)_($|[^_])/gm, (match, before, content, after) => {
      if (match.includes('<') || match.includes('>')) return match;
      return `${before}<em>${content}</em>${after}`;
    });

    // Handle unordered lists (- or * at start of line)
    text = text.replace(/^[\*\-]\s+(.*)$/gm, '<LI>$1</LI>');
    text = text.replace(/(<LI>.*<\/LI>\n?)+/g, (match) => {
      const items = match.replace(/<LI>(.*)<\/LI>\n?/g, '<li>$1</li>');
      return protect(`<ul>${items}</ul>`);
    });

    // Handle ordered lists (1. at start of line)
    text = text.replace(/^\d+\.\s+(.*)$/gm, '<OLI>$1</OLI>');
    text = text.replace(/(<OLI>.*<\/OLI>\n?)+/g, (match) => {
      const items = match.replace(/<OLI>(.*)<\/OLI>\n?/g, '<li>$1</li>');
      return protect(`<ol>${items}</ol>`);
    });

    // Handle image URLs
    text = text.replace(/(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|gifv|webp)(?:\?[^\s]*)?)/gi, (url) => {
      return protect(`<img src="${url}" alt="Image" />`);
    });

    // Handle regular URLs
    text = text.replace(/(https?:\/\/[^\s<]+)/gi, (url) => {
      return protect(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    });

    // Convert double newlines to paragraphs
    const paragraphs = text.split(/\n\n+/);
    text = paragraphs.map(p => {
      p = p.trim();
      if (p.startsWith('<') && (p.includes('<ul>') || p.includes('<ol>') || p.includes('<blockquote>') || p.includes('<pre>') || p.includes('<hr>'))) {
        return p;
      }
      return p ? `<p>${p.replace(/\n/g, '<br>')}</p>` : '';
    }).join('');

    return restore(text);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showLoading() {
    document.getElementById('app').innerHTML = '<div class="loading"><div class="spinner"></div><div>Loading post...</div></div>';
  }

  showError(msg) {
    document.getElementById('app').innerHTML = `<div class="error"><h2>Error</h2><p>${msg}</p></div>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new RedditPostViewer();
});
