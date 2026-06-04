// Reddit Post Viewer - displays individual posts from JSON files

class RedditPostViewer {
  constructor() {
    this.galleryIndex = 0;
    this.participantId = null;
    this.postId = null;
    this._lastMouseMove = 0;
    this._eventQueue = [];
    this.init();
    this.initMessageListener();
    this.initEventTracking();
    this._flushInterval = setInterval(() => this.flushEvents(), 2000);
    window.addEventListener("beforeunload", () => this.flushEvents(true));
  }

  initMessageListener() {
    window.addEventListener("message", (e) => {
      if (e.data.type === "init" && e.data.participantId) {
        this.participantId = e.data.participantId;
      }
    });
  }

  initEventTracking() {
    document.addEventListener("click", (e) => {
      this.logEvent("click", { x: e.clientX, y: e.clientY });
    });

    document.addEventListener("scroll", () => {
      this.logEvent("scroll", {});
    });

    document.addEventListener("mousemove", (e) => {
      const now = Date.now();
      if (now - this._lastMouseMove < 500) return;
      this._lastMouseMove = now;
      this.logEvent("mousemove", { x: e.clientX, y: e.clientY });
    });
  }

  logEvent(type, data) {
    this._eventQueue.push({
      t: Date.now(),
      session: this.participantId,
      post: this.postId,
      event: type,
      vw: window.innerWidth,
      vh: window.innerHeight,
      scrollY: window.scrollY,
      pageH: document.body.scrollHeight,
      ...data,
    });
  }

  flushEvents(useBeacon = false) {
    if (this._eventQueue.length === 0) return;
    const batch = this._eventQueue.splice(0);
    const body = JSON.stringify(batch);
    if (useBeacon) {
      navigator.sendBeacon("/api/log", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }).catch(() => {});
    }
  }

  async init() {
    // Check if dev mode is enabled to show back button
    await this.checkDevMode();

    const params = new URLSearchParams(window.location.search);
    const postId = params.get("post");
    this.postId = postId;

    if (!postId) {
      return this.showError(
        "No post specified. Return to the list and select a post.",
      );
    }

    // Check for attention check
    if (postId === "attention") {
      return this.showAttentionCheck();
    }

    // Check for content attention check
    if (postId === "content_attention") {
      return this.showContentAttentionCheck(1);
    }

    // Check for second content attention check
    if (postId === "content_attention_2") {
      return this.showContentAttentionCheck(2);
    }

    // Construct filename from post ID
    const filename = `${postId}.json`;
    this.loadPost(filename);
  }

  async checkDevMode() {
    try {
      const response = await fetch("/api/config");
      if (response.ok) {
        const config = await response.json();
        if (config.devMode) {
          const backButton = document.querySelector(".back-button");
          if (backButton) {
            backButton.classList.add("visible");
          }
        }
      }
    } catch (error) {
      // Silently fail - back button stays hidden
      console.log("Could not fetch config");
    }
  }

  async loadPost(filename) {
    this.showLoading();

    try {
      const response = await fetch(`/api/post/${filename}`);

      if (!response.ok) {
        throw new Error("Failed to fetch post data");
      }

      const postData = await response.json();

      // The data structure is: { path, timestamp, data: [postListing, commentsListing] }
      const [postListing, commentsListing] = postData.data;
      const post = postListing.data.children[0].data;
      const comments = commentsListing.data.children;

      this.displayPost(post, comments);
    } catch (error) {
      console.error("Error:", error);
      this.showError(`Failed to load post: ${error.message}`);
    }
  }

  displayPost(post, comments) {
    document.getElementById("app").innerHTML = `
      <div class="post-container">
        <div class="post-content">
          <h1 class="post-title">${this.decode(post.title)}</h1>
          <div class="post-meta">
            <span>Posted by <a href="https://reddit.com/u/${
              post.author
            }" target="_blank">u/${post.author}</a></span>
            <span>in <a href="https://reddit.com/r/${
              post.subreddit
            }" target="_blank">r/${post.subreddit}</a></span>
            <span>${this.formatTime(post.created_utc)}</span>
            <span>${this.formatNum(post.num_comments)} comments</span>
          </div>
          <div class="post-body">${this.renderContent(post)}</div>
        </div>
      </div>
      <div class="comments-container">
        <div class="comments-header">Comments (${this.formatNum(
          post.num_comments,
        )})</div>
        <div>${this.renderComments(comments)}</div>
      </div>
    `;

    this.attachGalleryListeners();
    this.attachSpoilerListeners();
  }

  attachGalleryListeners() {
    const galleryNavButtons = document.querySelectorAll(".gallery-nav");
    galleryNavButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const direction = parseInt(button.getAttribute("data-direction"), 10);
        this.navGallery(direction);
      });
    });

    this.attachCommentListeners();
  }

  attachSpoilerListeners() {
    // Handle spoiler tags - reveal on click
    document.querySelectorAll(".md-spoiler-text").forEach((spoiler) => {
      spoiler.addEventListener("click", (e) => {
        e.target.classList.add("revealed");
      });
    });
  }

  renderContent(post) {
    let html = "";

    if (post.selftext?.trim()) {
      html += `<div class="post-selftext">${this.formatCommentBody(
        post.selftext,
        post.selftext_html,
      )}</div>`;
    }

    html += '<div class="post-media">';

    if (post.is_gallery && post.gallery_data && post.media_metadata) {
      html += this.renderGallery(post);
    } else if (post.is_video && post.media?.reddit_video) {
      const video = post.media.reddit_video;
      const isGif = video.is_gif;

      // Check if this is a local media path (merged video)
      let videoUrl = video.fallback_url;
      if (videoUrl.startsWith("media/")) {
        // Convert local path to API endpoint
        videoUrl = `/api/media/${videoUrl}`;
      }

      if (isGif) {
        html += `<div class="media-frame"><video class="post-video" controls loop muted><source src="${videoUrl}" type="video/mp4"></video></div>`;
      } else {
        html += `<div class="media-frame"><video class="post-video" controls><source src="${videoUrl}" type="video/mp4"></video></div>`;
      }
    } else if (post.post_hint === "image" || this.isImage(post.url)) {
      // Check for locally downloaded image first
      let imgUrl = post.url;
      if (
        post.local_media?.contentType === "image" &&
        post.local_media?.files?.[0]?.path
      ) {
        imgUrl = `/api/media/${post.local_media.files[0].path}`;
      } else if (post.preview?.images?.[0]?.source?.url) {
        imgUrl = this.decode(post.preview.images[0].source.url);
      }
      html += `<div class="media-frame"><img src="${imgUrl}" alt="${this.decode(
        post.title,
      )}" class="post-image" onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML='<div style=\\'padding: 2rem; color: #999; text-align: center;\\'>Image failed to load</div>'" /></div>`;
    } else if (post.url && post.url !== post.permalink && !post.is_self) {
      const thumb = post.thumbnail?.startsWith("http")
        ? `<img src="${post.thumbnail}" class="post-thumbnail" alt="Link preview" />`
        : "";
      html += `<a href="${post.url}" target="_blank" rel="noopener noreferrer" class="post-link">${thumb}<div>${post.url}</div></a>`;
    }

    html += "</div>";
    return html;
  }

  renderGallery(post) {
    const items = post.gallery_data.items;
    const metadata = post.media_metadata;

    let html =
      '<div class="gallery-container"><div class="gallery-images" id="gallery-images">';

    items.forEach((item, i) => {
      // Check for locally downloaded gallery images first
      if (
        post.local_media?.contentType === "gallery" &&
        post.local_media?.files?.[i]?.path
      ) {
        const url = `/api/media/${post.local_media.files[i].path}`;
        html += `<img src="${url}" alt="Image ${
          i + 1
        }" class="gallery-image" onerror="this.style.opacity='0.3'; this.alt='Failed to load'" />`;
      } else {
        const media = metadata[item.media_id];
        if (media?.s) {
          const url = this.decode(media.s.u || media.s.gif);
          html += `<img src="${url}" alt="Image ${
            i + 1
          }" class="gallery-image" onerror="this.style.opacity='0.3'; this.alt='Failed to load'" />`;
        }
      }
    });

    html += "</div>";

    if (items.length > 1) {
      html += `
        <button class="gallery-nav gallery-prev" data-direction="-1">‹</button>
        <button class="gallery-nav gallery-next" data-direction="1">›</button>
        <div class="gallery-indicator"><span id="gallery-current">1</span> / ${items.length}</div>
      `;
    }

    html += "</div>";
    return html;
  }

  renderComments(comments, depth = 0) {
    if (!comments || !Array.isArray(comments)) return "";

    return comments
      .map((comment) => {
        if (comment.kind === "t1" && comment.data) {
          const d = comment.data;
          const nested = depth > 0 ? "nested" : "";
          const hasReplies = d.replies?.data?.children?.length > 0;
          const replyCount = hasReplies
            ? d.replies.data.children.filter((c) => c.kind === "t1").length
            : 0;

          return `
          <div class="comment ${nested}">
            <div class="comment-collapse-line"></div>
            <div class="comment-main">
              <div class="comment-header">
                <span class="comment-author-name">u/${d.author}</span>
                <span class="comment-meta">• ${this.formatTime(
                  d.created_utc,
                )}</span>
                ${
                  replyCount > 0
                    ? `<span class="reply-count">• ${replyCount} ${
                        replyCount === 1 ? "reply" : "replies"
                      }</span>`
                    : ""
                }
                <button class="comment-toggle-btn">Hide thread</button>
              </div>
              <div class="comment-content">
                <div class="comment-body">${this.formatCommentBody(
                  d.body,
                  d.body_html,
                )}</div>
                ${
                  hasReplies
                    ? `<div class="comment-replies">${this.renderComments(
                        d.replies.data.children,
                        depth + 1,
                      )}</div>`
                    : ""
                }
              </div>
            </div>
          </div>
        `;
        }
        return "";
      })
      .join("");
  }

  navGallery(dir) {
    const gallery = document.getElementById("gallery-images");
    const total = gallery.querySelectorAll(".gallery-image").length;

    this.galleryIndex = (this.galleryIndex + dir + total) % total;
    gallery.style.transform = `translateX(-${this.galleryIndex * 100}%)`;

    const indicator = document.getElementById("gallery-current");
    if (indicator) indicator.textContent = this.galleryIndex + 1;
  }

  isImage(url) {
    return (
      /\.(jpg|jpeg|png|gif|webp)$/i.test(url) ||
      url?.includes("i.redd.it") ||
      url?.includes("i.imgur.com")
    );
  }

  formatNum(num) {
    if (num >= 1e6) return (num / 1e6).toFixed(1) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(1) + "k";
    return num.toString();
  }

  formatTime(ts) {
    const diff = Date.now() / 1000 - ts;
    if (diff < 60) return "just now";
    if (diff < 3600)
      return `${Math.floor(diff / 60)} minute${
        Math.floor(diff / 60) !== 1 ? "s" : ""
      } ago`;
    if (diff < 86400)
      return `${Math.floor(diff / 3600)} hour${
        Math.floor(diff / 3600) !== 1 ? "s" : ""
      } ago`;
    if (diff < 2592000)
      return `${Math.floor(diff / 86400)} day${
        Math.floor(diff / 86400) !== 1 ? "s" : ""
      } ago`;
    return new Date(ts * 1000).toLocaleDateString();
  }

  decode(html) {
    if (!html) return "";
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  }

  convertImageLinksToImages(html) {
    // Match links to preview.redd.it, i.redd.it, i.imgur.com images
    const imageUrlPattern =
      /<a href="(https?:\/\/(?:preview\.redd\.it|i\.redd\.it|i\.imgur\.com|imgur\.com)\/[^"]+\.(?:jpg|jpeg|png|gif|webp)[^"]*)"[^>]*>([^<]+)<\/a>/gi;

    return html.replace(imageUrlPattern, (match, url, linkText) => {
      // If the link text is the URL itself, replace with an image
      if (linkText.includes("redd.it") || linkText.includes("imgur.com")) {
        return `<a href="${url}" target="_blank"><img src="${url}" alt="Image" loading="lazy" /></a>`;
      }
      // Otherwise keep the link but add image below
      return `${match}<br><a href="${url}" target="_blank"><img src="${url}" alt="${linkText}" loading="lazy" /></a>`;
    });
  }

  formatCommentBody(body, body_html) {
    if (body_html) {
      // Decode HTML entities and use Reddit's formatted HTML
      let html = this.decode(body_html);

      // Convert preview.redd.it and i.redd.it links to images
      html = this.convertImageLinksToImages(html);

      return html;
    }

    // Fallback to plain text if no HTML available
    if (!body) return "";
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
    text = text.replace(/^(?: {4}|\t)(.*)$/gm, "<CODE_LINE>$1</CODE_LINE>");
    text = text.replace(/(<CODE_LINE>.*<\/CODE_LINE>\n?)+/g, (match) => {
      const code = match
        .replace(/<CODE_LINE>(.*)<\/CODE_LINE>\n?/g, "$1\n")
        .trim();
      return protect(`<pre><code>${code}</code></pre>`);
    });

    // Handle horizontal rules
    text = text.replace(/^\s*(\-{3,}|\*{3,}|_{3,})\s*$/gm, protect("<hr>"));

    // Handle blockquotes
    text = text.replace(/^>\s?(.*)$/gm, "<QUOTE>$1</QUOTE>");
    text = text.replace(/(<QUOTE>.*?<\/QUOTE>\n?)+/g, (match) => {
      const content = match.replace(/<QUOTE>(.*?)<\/QUOTE>\n?/g, "$1\n").trim();
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
      return protect(
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>`,
      );
    });

    // Handle bold (**text** or __text__)
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/__(.+?)__/g, "<strong>$1</strong>");

    // Handle strikethrough (~~text~~)
    text = text.replace(/~~(.+?)~~/g, "<del>$1</del>");

    // Handle italic (*text* or _text_) - more careful to avoid conflicts
    text = text.replace(
      /(^|[^*])\*([^\s*](?:[^*]*[^\s*])?)\*($|[^*])/gm,
      (match, before, content, after) => {
        if (match.includes("<") || match.includes(">")) return match;
        return `${before}<em>${content}</em>${after}`;
      },
    );

    text = text.replace(
      /(^|[^_])_([^\s_](?:[^_]*[^\s_])?)_($|[^_])/gm,
      (match, before, content, after) => {
        if (match.includes("<") || match.includes(">")) return match;
        return `${before}<em>${content}</em>${after}`;
      },
    );

    // Handle unordered lists (- or * at start of line)
    text = text.replace(/^[\*\-]\s+(.*)$/gm, "<LI>$1</LI>");
    text = text.replace(/(<LI>.*<\/LI>\n?)+/g, (match) => {
      const items = match.replace(/<LI>(.*)<\/LI>\n?/g, "<li>$1</li>");
      return protect(`<ul>${items}</ul>`);
    });

    // Handle ordered lists (1. at start of line)
    text = text.replace(/^\d+\.\s+(.*)$/gm, "<OLI>$1</OLI>");
    text = text.replace(/(<OLI>.*<\/OLI>\n?)+/g, (match) => {
      const items = match.replace(/<OLI>(.*)<\/OLI>\n?/g, "<li>$1</li>");
      return protect(`<ol>${items}</ol>`);
    });

    // Handle image URLs
    text = text.replace(
      /(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|gifv|webp)(?:\?[^\s]*)?)/gi,
      (url) => {
        return protect(`<img src="${url}" alt="Image" />`);
      },
    );

    // Handle regular URLs
    text = text.replace(/(https?:\/\/[^\s<]+)/gi, (url) => {
      return protect(
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`,
      );
    });

    // Convert double newlines to paragraphs
    const paragraphs = text.split(/\n\n+/);
    text = paragraphs
      .map((p) => {
        p = p.trim();
        if (
          p.startsWith("<") &&
          (p.includes("<ul>") ||
            p.includes("<ol>") ||
            p.includes("<blockquote>") ||
            p.includes("<pre>") ||
            p.includes("<hr>"))
        ) {
          return p;
        }
        return p ? `<p>${p.replace(/\n/g, "<br>")}</p>` : "";
      })
      .join("");

    return restore(text);
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  showAttentionCheck() {
    document.getElementById("app").innerHTML = `
      <div class="post-container">
        <div class="post-content">
          <h1 class="post-title">Attention Check</h1>
          <div class="post-body">
            <p style="font-size: 1.125rem; line-height: 1.6; color: #1a1a1b; margin: 1.5rem 0;">
              This post is special. We want to make sure you are paying attention to all the posts.
              Please give this post a rating of 20 on the first slider and a rating of 80 on the second slider.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  showContentAttentionCheck(number) {
    document.getElementById("app").innerHTML = `
      <div class="post-container">
        <div class="post-content">
          <h1 class="post-title">Content Attention Check</h1>
          <div class="post-body">
            <p style="font-size: 1.125rem; line-height: 1.6; color: #1a1a1b; margin: 1.5rem 0;">
              This post is special. We want to make sure you are paying attention to all the posts.
              Please give this post a rating of ${
                number == 1 ? "20" : "80"
              } on the slider.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  showLoading() {
    document.getElementById("app").innerHTML =
      '<div class="loading"><div class="spinner"></div><div>Loading post...</div></div>';
  }

  showError(msg) {
    document.getElementById("app").innerHTML =
      `<div class="error"><h2>Error</h2><p>${msg}</p></div>`;
  }

  attachCommentListeners() {
    document.querySelectorAll(".comment-toggle-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const comment = btn.closest(".comment");
        comment.classList.toggle("collapsed");

        // Update button text
        if (comment.classList.contains("collapsed")) {
          btn.textContent = "Show thread";
        } else {
          btn.textContent = "Hide thread";
        }
      });
    });

    // Also allow clicking the collapse line to toggle
    document.querySelectorAll(".comment-collapse-line").forEach((line) => {
      line.addEventListener("click", (e) => {
        e.stopPropagation();
        const comment = line.closest(".comment");
        const btn = comment.querySelector(".comment-toggle-btn");
        comment.classList.toggle("collapsed");

        // Update button text
        if (comment.classList.contains("collapsed")) {
          btn.textContent = "Show thread";
        } else {
          btn.textContent = "Hide thread";
        }
      });
    });

    // Start nested comments (replies) collapsed, but keep top-level comments expanded
    document.querySelectorAll(".comment.nested").forEach((comment) => {
      comment.classList.add("collapsed");
      const btn = comment.querySelector(".comment-toggle-btn");
      if (btn) btn.textContent = "Show thread";
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new RedditPostViewer();
  window.parent.postMessage({ type: "ready" }, "*");
});
