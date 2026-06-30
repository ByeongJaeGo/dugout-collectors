const views = ['feed', 'upload', 'my-posts', 'my-likes'];

function showView(name) {
  views.forEach((v) => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.hidden = v !== name;
  });
  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.nav === name);
  });
}

function setAuthNav(isLoggedIn, label, badges) {
  const authNav = document.getElementById('auth-nav');
  const guestNav = document.getElementById('guest-nav');
  const labelEl = document.getElementById('nav-user-label');
  const guestCta = document.getElementById('guest-cta');

  if (authNav) authNav.hidden = !isLoggedIn;
  if (guestNav) guestNav.hidden = isLoggedIn;
  document.querySelector('.header')?.classList.toggle('header--auth', isLoggedIn);
  if (labelEl) {
    if (isLoggedIn && label) {
      const badgeHtml = renderBadgesHtml(badges, 'nav');
      labelEl.innerHTML = `${escapeHtml(label)}님${badgeHtml ? ` ${badgeHtml}` : ''}`;
    } else {
      labelEl.textContent = '';
    }
  }
  if (guestCta) guestCta.hidden = isLoggedIn;
  if (isLoggedIn) hideAuthModal();
}

function updateLikesBannerCount(count) {
  const countEl = document.getElementById('nav-likes-count');
  if (countEl) countEl.textContent = count;
}

let lastUnreadNotificationCount = -1;

function triggerNotificationBellAnimation() {
  const btn = document.getElementById('notification-btn');
  const badge = document.getElementById('notification-count');
  if (!btn) return;

  btn.classList.remove('nav-btn--notify--ring');
  void btn.offsetWidth;
  btn.classList.add('nav-btn--notify--ring');

  if (badge) {
    badge.classList.remove('notification-badge--pop');
    void badge.offsetWidth;
    badge.classList.add('notification-badge--pop');
  }

  window.setTimeout(() => {
    btn.classList.remove('nav-btn--notify--ring');
    badge?.classList.remove('notification-badge--pop');
  }, 900);
}

function updateNotificationBadge(count, options = {}) {
  const badge = document.getElementById('notification-count');
  const btn = document.getElementById('notification-btn');
  if (!badge || !btn) return;

  const label = count > 0 ? `알림 ${count > 99 ? '99+' : count}개` : '알림';
  btn.setAttribute('aria-label', label);

  const shouldAnimate =
    options.animate !== false &&
    lastUnreadNotificationCount >= 0 &&
    count > lastUnreadNotificationCount;

  if (count > 0) {
    badge.hidden = false;
    badge.textContent = count > 99 ? '99+' : String(count);
  } else {
    badge.hidden = true;
    badge.textContent = '0';
  }

  if (shouldAnimate) triggerNotificationBellAnimation();
  lastUnreadNotificationCount = count;
}

function resetNotificationBadgeState() {
  lastUnreadNotificationCount = -1;
}

function renderNotificationList(notifications, onItemClick) {
  const list = document.getElementById('notification-list');
  if (!list) return;

  if (!notifications.length) {
    list.innerHTML = '<li class="notification-empty">새 알림이 없습니다.</li>';
    return;
  }

  list.innerHTML = notifications
    .map((n) => {
      const msg = escapeHtml(formatNotificationMessage(n));
      const caption = escapeHtml((n.post_caption || '').slice(0, 30));
      const time = formatNotificationTime(n.created_at);
      const unread = n.read ? '' : ' notification-item--unread';
      return `
        <li>
          <button type="button" class="notification-item${unread}" data-post-id="${escapeHtml(n.post_id)}">
            <span class="notification-item__msg">${msg}</span>
            <span class="notification-item__post">${caption}${(n.post_caption || '').length > 30 ? '…' : ''}</span>
            <time class="notification-item__time">${time}</time>
          </button>
        </li>
      `;
    })
    .join('');

  list.querySelectorAll('.notification-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (onItemClick) onItemClick(btn.dataset.postId);
    });
  });
}

function setNotificationPanelOpen(open) {
  const panel = document.getElementById('notification-panel');
  const btn = document.getElementById('notification-btn');
  if (panel) panel.hidden = !open;
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function initNotificationPanel({ onToggle, onMarkRead, onItemClick }) {
  document.getElementById('notification-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const panel = document.getElementById('notification-panel');
    const isOpen = panel && !panel.hidden;
    setNotificationPanelOpen(!isOpen);
    if (!isOpen && onToggle) onToggle();
  });

  document.getElementById('notification-mark-read')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (onMarkRead) onMarkRead();
  });

  document.addEventListener('click', (e) => {
    const wrap = document.querySelector('.nav-notify');
    if (wrap && !wrap.contains(e.target)) {
      setNotificationPanelOpen(false);
    }
  });
}

function scrollToPost(postId) {
  const el = document.querySelector(`.post-card[data-post-id="${postId}"]`);
  if (el) {
    showView('feed');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('post-card--highlight');
    setTimeout(() => el.classList.remove('post-card--highlight'), 1500);
  }
}

function filterPostsByQuery(posts, query) {
  const q = query.trim().toLowerCase();
  if (!q) return posts;
  return posts.filter((p) => {
    const tagText = (p.tags || []).join(' ').toLowerCase();
    return (
      (p.caption || '').toLowerCase().includes(q) ||
      (p.player_name || '').toLowerCase().includes(q) ||
      tagText.includes(q) ||
      (p.profiles?.nickname || '').toLowerCase().includes(q)
    );
  });
}

function renderPostTagsHtml(tags) {
  if (!tags?.length) return '';
  return `<div class="post-card__tags">${tags
    .map((tag) => `<span class="post-tag">#${escapeHtml(tag)}</span>`)
    .join('')}</div>`;
}

function setAuthModalTab(mode) {
  const isLogin = mode === 'login';
  const loginTab = document.getElementById('auth-tab-login');
  const signupTab = document.getElementById('auth-tab-signup');
  const loginPanel = document.getElementById('auth-panel-login');
  const signupPanel = document.getElementById('auth-panel-signup');

  if (loginTab) {
    loginTab.classList.toggle('auth-modal__tab--active', isLogin);
    loginTab.setAttribute('aria-selected', isLogin ? 'true' : 'false');
  }
  if (signupTab) {
    signupTab.classList.toggle('auth-modal__tab--active', !isLogin);
    signupTab.setAttribute('aria-selected', !isLogin ? 'true' : 'false');
  }
  if (loginPanel) loginPanel.hidden = !isLogin;
  if (signupPanel) signupPanel.hidden = isLogin;
}

function showAuthModal(mode) {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  setAuthModalTab(mode === 'signup' ? 'signup' : 'login');
  modal.hidden = false;
  document.body.classList.add('auth-modal-open');
  requestAnimationFrame(() => modal.classList.add('auth-modal--visible'));
  const focusEl = mode === 'signup'
    ? document.getElementById('signup-userid')
    : document.getElementById('login-userid');
  setTimeout(() => focusEl?.focus(), 300);
}

function hideAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.remove('auth-modal--visible');
  document.body.classList.remove('auth-modal-open');
  setTimeout(() => {
    modal.hidden = true;
  }, 280);
}

function initAuthModal() {
  document.getElementById('auth-tab-login')?.addEventListener('click', () => setAuthModalTab('login'));
  document.getElementById('auth-tab-signup')?.addEventListener('click', () => setAuthModalTab('signup'));
  document.getElementById('auth-modal-close')?.addEventListener('click', hideAuthModal);
  document.getElementById('auth-modal-backdrop')?.addEventListener('click', hideAuthModal);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const contactModal = document.getElementById('contact-modal');
    if (contactModal && !contactModal.hidden) {
      hideContactModal();
      return;
    }
    hideAuthModal();
  });
}

function showContactModal(prefill = {}) {
  hideAuthModal();
  const modal = document.getElementById('contact-modal');
  if (!modal) return;

  const nameInput = document.getElementById('contact-name');
  const emailInput = document.getElementById('contact-email');
  if (nameInput && prefill.name) nameInput.value = prefill.name;
  if (emailInput && prefill.email) emailInput.value = prefill.email;

  modal.hidden = false;
  document.body.classList.add('auth-modal-open');
  requestAnimationFrame(() => modal.classList.add('auth-modal--visible'));
  (nameInput?.value ? emailInput : nameInput)?.focus();
}

function hideContactModal() {
  const modal = document.getElementById('contact-modal');
  if (!modal) return;
  modal.classList.remove('auth-modal--visible');
  document.body.classList.remove('auth-modal-open');
  setTimeout(() => {
    modal.hidden = true;
  }, 280);
}

function initContactModal() {
  document.getElementById('contact-modal-close')?.addEventListener('click', hideContactModal);
  document.getElementById('contact-modal-backdrop')?.addEventListener('click', hideContactModal);
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
  }, type === 'success' && message.length > 40 ? 5000 : 3500);
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

function renderPostCard(post, currentUserId, onLike, onComment, onRequireLogin, badgeCtx) {
  const ctx = badgeCtx || getBadgeContext();
  const card = document.createElement('article');
  card.className = `post-card ${getPostBadgeClasses(post.id, ctx)}`.trim();
  card.dataset.postId = post.id;

  const nickname = post.profiles?.nickname || '익명';
  const authorBadges = renderBadgesHtml(getUserBadges(post.user_id, ctx), 'author');
  const liked = currentUserId && post.liked_by?.includes(currentUserId);
  const date = new Date(post.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const commentCount = post.comment_count ?? post.comments?.length ?? 0;
  const playerName = (post.player_name || '').trim();
  const playerHtml = playerName
    ? `<p class="post-card__player">⚾ ${escapeHtml(playerName)}</p>`
    : '';
  const tagsHtml = renderPostTagsHtml(post.tags);

  card.innerHTML = `
    <div class="post-card__header">
      <span class="post-card__author">${escapeHtml(nickname)}${authorBadges}</span>
      <time class="post-card__date">${date}</time>
    </div>
    <img class="post-card__image" src="${escapeHtml(post.image_url)}" alt="유니폼 사진" loading="lazy">
    ${playerHtml}
    <p class="post-card__caption">${escapeHtml(post.caption || '')}</p>
    ${tagsHtml}
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

function renderRankCard(item, variant, badgeCtx) {
  const ctx = badgeCtx || getBadgeContext();
  const caption = escapeHtml((item.caption || '').slice(0, 40));
  const name = escapeHtml(item.profiles?.nickname || '익명');
  let authorBadgeList = getUserBadges(item.user_id, ctx);
  if (variant === 'today') {
    authorBadgeList = authorBadgeList.filter((b) => b.id !== 'daily_pick');
  }
  if (variant === 'week' && item.rank === 1) {
    authorBadgeList = authorBadgeList.filter((b) => b.id !== 'weekly_king');
  }
  const authorBadges = renderBadgesHtml(authorBadgeList, 'author');
  const rankBadge = renderRankBadgeHtml(item, variant);
  const medal = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `${item.rank}위`;
  const stats = `♥ ${item.uniqueLikers}명 · 💬 ${item.uniqueCommenters}명 · ${item.score}점`;
  const rankClass = getRankCardClasses(item, variant);

  return `
    <button type="button" class="rank-card rank-card--${variant} ${rankClass}" data-scroll-post="${escapeHtml(item.id)}">
      <span class="rank-card__medal">${medal}</span>
      <img class="rank-card__thumb" src="${escapeHtml(item.image_url)}" alt="" loading="lazy">
      <div class="rank-card__body">
        <span class="rank-card__author">${name}${authorBadges}${rankBadge}</span>
        <span class="rank-card__caption">${caption}${(item.caption || '').length > 40 ? '…' : ''}</span>
        <span class="rank-card__stats">${stats}</span>
      </div>
    </button>
  `;
}

function renderRankings({ daily, weekly }, badgeCtx) {
  const ctx = badgeCtx || getBadgeContext();
  const panel = document.getElementById('ranking-panel');
  if (!panel) return;

  const dailyHtml = daily?.length
    ? renderRankCard(daily[0], 'today', ctx)
    : '<p class="ranking-empty">오늘 반응이 있는 유니폼이 아직 없어요.</p>';

  const weeklyHtml = weekly?.length
    ? `<ol class="ranking-week-list">${weekly.map((item) => `<li>${renderRankCard(item, 'week', ctx)}</li>`).join('')}</ol>`
    : '<p class="ranking-empty">이번 주 반응이 있는 유니폼이 아직 없어요.</p>';

  panel.innerHTML = `
    <div class="ranking-panel__grid">
      <section class="ranking-block ranking-block--today">
        <div class="ranking-block__head">
          <h2 class="ranking-block__title">🏆 오늘의 인기유니폼</h2>
          <p class="ranking-block__notice"><span class="ranking-block__notice-label">공지</span> 조건에 맞는 칭호는 영구적으로 보존됩니다</p>
        </div>
        <div class="ranking-block__content">${dailyHtml}</div>
      </section>
      <section class="ranking-block ranking-block--week">
        <div class="ranking-block__head">
          <h2 class="ranking-block__title">📅 이 주의 유니폼 TOP 3</h2>
          <p class="ranking-block__notice"><span class="ranking-block__notice-label">공지</span> 조건에 맞는 칭호는 영구적으로 보존됩니다</p>
        </div>
        <div class="ranking-block__content">${weeklyHtml}</div>
      </section>
    </div>
    <p class="ranking-hint">서로 다른 사람의 ♥ 3점 · 💬 2점 · 월요일~일요일 집계</p>
  `;

  panel.querySelectorAll('[data-scroll-post]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const postId = btn.dataset.scrollPost;
      const el = document.querySelector(`.post-card[data-post-id="${postId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('post-card--highlight');
        setTimeout(() => el.classList.remove('post-card--highlight'), 1500);
      }
    });
    const img = btn.querySelector('.rank-card__thumb');
    img?.addEventListener('error', () => {
      if (!img.dataset.fallback) {
        img.dataset.fallback = '1';
        img.src = '/assets/demo-uniform.svg';
      }
    });
  });
}

function renderFeed(container, posts, currentUserId, onLike, emptyMessage, onRequireLogin, onComment, badgeCtx) {
  container.innerHTML = '';
  if (!posts.length) {
    container.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
    return;
  }
  posts.forEach((post) => {
    container.appendChild(
      renderPostCard(post, currentUserId, onLike, onComment, onRequireLogin, badgeCtx)
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
