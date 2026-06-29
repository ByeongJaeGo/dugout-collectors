const views = ['login', 'signup', 'feed', 'upload', 'my-posts', 'my-likes'];

function showView(name) {
  views.forEach((v) => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.hidden = v !== name;
  });
  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.nav === name);
  });
}

function setAuthNav(isLoggedIn, label) {
  const authNav = document.getElementById('auth-nav');
  const guestNav = document.getElementById('guest-nav');
  const labelEl = document.getElementById('nav-user-label');
  const guestCta = document.getElementById('guest-cta');

  if (authNav) authNav.hidden = !isLoggedIn;
  if (guestNav) guestNav.hidden = isLoggedIn;
  if (labelEl) labelEl.textContent = isLoggedIn && label ? `${label}님` : '';
  if (guestCta) guestCta.hidden = isLoggedIn;
}

function updateLikesBannerCount(count) {
  const countEl = document.getElementById('nav-likes-count');
  if (countEl) countEl.textContent = count;
}

function filterPostsByQuery(posts, query) {
  const q = query.trim().toLowerCase();
  if (!q) return posts;
  return posts.filter(
    (p) =>
      (p.caption || '').toLowerCase().includes(q) ||
      (p.profiles?.nickname || '').toLowerCase().includes(q)
  );
}

let signupModalCallback = null;

function showSignupModal(onConfirm) {
  const modal = document.getElementById('signup-modal');
  if (!modal) {
    if (onConfirm) onConfirm();
    return;
  }
  signupModalCallback = onConfirm;
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('signup-modal--visible'));
}

function hideSignupModal() {
  const modal = document.getElementById('signup-modal');
  if (!modal) return;
  modal.classList.remove('signup-modal--visible');
  setTimeout(() => {
    modal.hidden = true;
    signupModalCallback = null;
  }, 280);
}

function initSignupModal() {
  document.getElementById('signup-modal-go')?.addEventListener('click', () => {
    const cb = signupModalCallback;
    hideSignupModal();
    if (cb) cb();
    else showView('signup');
  });

  document.getElementById('signup-modal-close')?.addEventListener('click', hideSignupModal);
  document.getElementById('signup-modal-backdrop')?.addEventListener('click', hideSignupModal);
}

function getCurrentView() {
  return views.find((v) => {
    const el = document.getElementById(`view-${v}`);
    return el && !el.hidden;
  }) || 'feed';
}

function showToast(message, type) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast toast--${type || 'info'} toast--visible`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('toast--visible');
  }, 3500);
}

function setFormLoading(form, loading, loadingText) {
  const btn = form.querySelector('button[type="submit"]');
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.textContent;
    btn.textContent = loadingText || '처리 중…';
    btn.disabled = true;
  } else {
    btn.textContent = btn.dataset.originalText || btn.textContent;
    btn.disabled = false;
  }
}

function renderCommentsHtml(comments) {
  if (!comments?.length) {
    return '<p class="comment-empty">아직 댓글이 없습니다.</p>';
  }
  return comments
    .map((c) => {
      const name = escapeHtml(c.profiles?.nickname || '익명');
      const body = escapeHtml(c.body || '');
      const time = new Date(c.created_at).toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      return `
        <div class="comment-item">
          <span class="comment-item__author">${name}</span>
          <span class="comment-item__body">${body}</span>
          <time class="comment-item__time">${time}</time>
        </div>
      `;
    })
    .join('');
}

function renderPostCard(post, currentUserId, onLike, onComment, onRequireLogin) {
  const card = document.createElement('article');
  card.className = 'post-card';
  card.dataset.postId = post.id;

  const nickname = post.profiles?.nickname || '익명';
  const liked = currentUserId && post.liked_by?.includes(currentUserId);
  const date = new Date(post.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const commentCount = post.comment_count ?? post.comments?.length ?? 0;

  card.innerHTML = `
    <div class="post-card__header">
      <span class="post-card__author">${escapeHtml(nickname)}</span>
      <time class="post-card__date">${date}</time>
    </div>
    <img class="post-card__image" src="${escapeHtml(post.image_url)}" alt="유니폼 사진" loading="lazy">
    <p class="post-card__caption">${escapeHtml(post.caption || '')}</p>
    <div class="post-card__actions">
      <button type="button" class="like-btn ${liked ? 'like-btn--active' : ''}" data-like="${post.id}">
        <span aria-hidden="true">${liked ? '♥' : '♡'}</span>
        <span class="like-count">${post.like_count ?? 0}</span>
      </button>
      <span class="comment-count">💬 ${commentCount}</span>
    </div>
    <div class="post-card__comments">
      <div class="comment-list">${renderCommentsHtml(post.comments)}</div>
      <form class="comment-form" data-post="${post.id}">
        <input type="text" name="body" maxlength="200" placeholder="${currentUserId ? '댓글을 입력하세요…' : '가입 후 댓글 작성'}" ${currentUserId ? '' : 'readonly'}>
        <button type="submit" class="comment-form__btn">등록</button>
      </form>
    </div>
  `;

  const likeBtn = card.querySelector('[data-like]');
  const img = card.querySelector('.post-card__image');
  img.addEventListener('error', () => {
    if (!img.dataset.fallback) {
      img.dataset.fallback = '1';
      img.src = '/assets/demo-uniform.svg';
    }
  });

  likeBtn.dataset.liked = liked ? 'true' : 'false';
  likeBtn.addEventListener('click', () => {
    if (!currentUserId) {
      onRequireLogin();
      return;
    }
    const isLiked = likeBtn.dataset.liked === 'true';
    onLike(post.id, isLiked, likeBtn);
  });

  const commentForm = card.querySelector('.comment-form');
  commentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentUserId) {
      onRequireLogin();
      return;
    }
    const input = commentForm.querySelector('input[name="body"]');
    onComment(post.id, input.value, commentForm);
  });

  const commentInput = commentForm.querySelector('input');
  if (!currentUserId) {
    commentInput.addEventListener('focus', () => onRequireLogin());
  }

  return card;
}

function renderFeed(container, posts, currentUserId, onLike, emptyMessage, onRequireLogin, onComment) {
  container.innerHTML = '';
  if (!posts.length) {
    container.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
    return;
  }
  posts.forEach((post) => {
    container.appendChild(
      renderPostCard(post, currentUserId, onLike, onComment, onRequireLogin)
    );
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function previewImage(file, imgEl, placeholderEl) {
  if (!file) {
    imgEl.hidden = true;
    placeholderEl.hidden = false;
    return;
  }
  imgEl.src = URL.createObjectURL(file);
  imgEl.hidden = false;
  placeholderEl.hidden = true;
}
