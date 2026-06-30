const views = ['feed', 'upload', 'my-posts', 'my-likes', 'inquiry'];

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

function filterPostsByTeam(posts, teamFilter) {
  const id = normalizeTeamId(teamFilter);
  if (!id) return posts;
  return posts.filter((p) => normalizeTeamId(p.team) === id);
}

function filterPostsByPlayer(posts, playerFilterKey) {
  if (!playerFilterKey) return posts;
  return posts.filter(
    (p) => playerTeamKey(p.team, p.player_name) === playerFilterKey
  );
}

function getPlayerFilterMeta(playerFilterKey, posts) {
  const sample = (posts || []).find(
    (p) => playerTeamKey(p.team, p.player_name) === playerFilterKey
  );
  const teamId = sample?.team || playerFilterKey.split('::')[0] || '';
  return {
    playerName: sample?.player_name || '',
    teamName: getTeamName(teamId),
    teamId,
  };
}

function renderPlayerFilterBar(playerFilterKey, posts) {
  const bar = document.getElementById('player-filter-bar');
  if (!bar) return;

  if (!playerFilterKey) {
    bar.hidden = true;
    bar.innerHTML = '';
    return;
  }

  const meta = getPlayerFilterMeta(playerFilterKey, posts);
  if (!meta.playerName) {
    bar.hidden = true;
    bar.innerHTML = '';
    return;
  }

  bar.hidden = false;
  bar.innerHTML = `
    <div class="player-filter-bar__inner">
      <p class="player-filter-bar__label">
        ⚾ <strong>${escapeHtml(meta.playerName)}</strong>
        <span class="player-filter-bar__team">${escapeHtml(meta.teamName)}</span> 유니폼만 보는 중
      </p>
      <button type="button" class="player-filter-bar__clear" data-clear-player-filter>필터 해제</button>
    </div>
  `;
}

function buildFeedEmptyMessage(query, teamFilter, playerFilterKey, posts) {
  const q = query.trim();
  const playerMeta = playerFilterKey ? getPlayerFilterMeta(playerFilterKey, posts) : null;
  const teamName = teamFilter ? getTeamName(teamFilter) || getTeamShortName(teamFilter) : '';

  if (playerMeta?.playerName) {
    const label = `${playerMeta.playerName} (${playerMeta.teamName})`;
    if (q) return `"${escapeHtml(q)}" · ${escapeHtml(label)} 검색 결과가 없습니다.`;
    return `${escapeHtml(label)} 유니폼이 아직 없습니다.`;
  }

  if (q && teamName) {
    return `"${escapeHtml(q)}" · ${escapeHtml(teamName)} 결과가 없습니다.`;
  }
  if (q) return `"${escapeHtml(q)}" 검색 결과가 없습니다.`;
  if (teamName) return `${escapeHtml(teamName)} 유니폼이 아직 없습니다. 첫 번째로 올려 보세요!`;
  return '아직 올라온 유니폼이 없습니다. 첫 번째로 올려 보세요!';
}

function filterPostsByQuery(posts, query) {
  const q = query.trim().toLowerCase();
  if (!q) return posts;
  return posts.filter((p) => {
    const tagText = (p.tags || []).join(' ').toLowerCase();
    return (
      (p.caption || '').toLowerCase().includes(q) ||
      (p.player_name || '').toLowerCase().includes(q) ||
      getTeamName(p.team).toLowerCase().includes(q) ||
      tagText.includes(q) ||
      (p.profiles?.nickname || '').toLowerCase().includes(q)
    );
  });
}

function renderPlayerLineHtml(post) {
  const name = (post.player_name || '').trim();
  if (!name) return '';

  const teamName = getTeamName(post.team);
  const count = post.uniform_count || 1;
  const countHtml =
    count >= 2
      ? `<span class="post-card__uniform-count" title="같은 팀·선수 ${count}벌">${count}벌</span>`
      : '';
  const discoverHtml = post.is_first_discoverer
    ? '<span class="badge badge--first_discoverer post-card__discover">🔍 첫 발견</span>'
    : '';
  const rareHtml = post.is_rare_item
    ? '<span class="badge badge--rare post-card__rare">희귀매물</span>'
    : '';
  const teamHtml = teamName
    ? `<span class="post-card__team">${escapeHtml(teamName)}</span>`
    : '';
  const playerKey = playerTeamKey(post.team, name);
  const nameHtml = playerKey
    ? `<button type="button" class="post-card__player-link" data-player-key="${escapeHtml(playerKey)}" data-team="${escapeHtml(post.team)}" aria-label="${escapeHtml(name)} 유니폼 모아보기">${escapeHtml(name)}</button>`
    : escapeHtml(name);

  return `<p class="post-card__player">⚾ ${nameHtml}${countHtml}${discoverHtml}${rareHtml}${teamHtml ? ` · ${teamHtml}` : ''}</p>`;
}

function renderTodayRegPanel(posts) {
  const panel = document.getElementById('today-reg-panel');
  if (!panel) return;

  const { players, teams } = computeTodayRegRankings(posts);

  if (!players.length && !teams.length) {
    panel.hidden = true;
    panel.innerHTML = '';
    return;
  }

  panel.hidden = false;

  const playerHtml = players.length
    ? `<ol class="today-reg-list">${players
        .map(
          (item, i) =>
            `<li><span class="today-reg-rank">${i + 1}</span> ${escapeHtml(item.playerName)} <span class="today-reg-meta">(${escapeHtml(item.teamName)})</span> <strong>${item.count}벌</strong></li>`
        )
        .join('')}</ol>`
    : '<p class="today-reg-empty">오늘 등록된 선수가 없습니다.</p>';

  const teamHtml = teams.length
    ? `<ol class="today-reg-list">${teams
        .map(
          (item, i) =>
            `<li><span class="today-reg-rank">${i + 1}</span> ${escapeHtml(item.teamName)} <strong>${item.count}벌</strong></li>`
        )
        .join('')}</ol>`
    : '<p class="today-reg-empty">오늘 등록된 팀이 없습니다.</p>';

  panel.innerHTML = `
    <div class="today-reg-panel__inner">
      <div class="today-reg-block">
        <h2 class="today-reg-block__title">📈 오늘의 선수 등록 TOP</h2>
        ${playerHtml}
      </div>
      <div class="today-reg-block">
        <h2 class="today-reg-block__title">🏟️ 오늘의 팀 등록 TOP</h2>
        ${teamHtml}
      </div>
    </div>
  `;
}

function initTeamSelect() {
  const select = document.getElementById('team-input');
  if (!select) return;
  select.innerHTML =
    '<option value="" disabled selected>팀을 선택하세요</option>' + renderTeamSelectOptions();
}

function renderPostImagesHtml(post) {
  const images = getPostImages(post);
  if (!images.length) {
    return '<img class="post-card__image" src="/assets/demo-uniform.svg" alt="유니폼 사진" loading="lazy">';
  }
  if (images.length === 1) {
    return `<img class="post-card__image" src="${escapeHtml(images[0])}" alt="유니폼 사진" loading="lazy">`;
  }

  const slides = images
    .map(
      (url, index) =>
        `<img class="post-carousel__slide post-card__image" src="${escapeHtml(url)}" alt="유니폼 사진 ${index + 1}" loading="lazy">`
    )
    .join('');

  const dots = images
    .map(
      (_, index) =>
        `<button type="button" class="post-carousel__dot${index === 0 ? ' post-carousel__dot--active' : ''}" data-carousel-dot="${index}" aria-label="${index + 1}번째 사진"></button>`
    )
    .join('');

  return `
    <div class="post-carousel" data-carousel>
      <div class="post-carousel__viewport">
        <div class="post-carousel__track">${slides}</div>
      </div>
      <button type="button" class="post-carousel__btn post-carousel__btn--prev" aria-label="이전 사진">‹</button>
      <button type="button" class="post-carousel__btn post-carousel__btn--next" aria-label="다음 사진">›</button>
      <span class="post-carousel__counter">1 / ${images.length}</span>
      <div class="post-carousel__dots">${dots}</div>
    </div>
  `;
}

function bindPostImages(card) {
  card.querySelectorAll('.post-card__image:not(.post-carousel__slide)').forEach((img) => {
    img.addEventListener('error', () => {
      if (!img.dataset.fallback) {
        img.dataset.fallback = '1';
        img.src = '/assets/demo-uniform.svg';
      }
    });
  });
}

function bindPostCarousel(card) {
  const carousel = card.querySelector('[data-carousel]');
  if (!carousel) {
    bindPostImages(card);
    return;
  }

  const track = carousel.querySelector('.post-carousel__track');
  const slides = [...carousel.querySelectorAll('.post-carousel__slide')];
  const prevBtn = carousel.querySelector('.post-carousel__btn--prev');
  const nextBtn = carousel.querySelector('.post-carousel__btn--next');
  const counter = carousel.querySelector('.post-carousel__counter');
  const dots = [...carousel.querySelectorAll('[data-carousel-dot]')];
  let index = 0;

  slides.forEach((img) => {
    img.addEventListener('error', () => {
      if (!img.dataset.fallback) {
        img.dataset.fallback = '1';
        img.src = '/assets/demo-uniform.svg';
      }
    });
  });

  function goTo(nextIndex) {
    index = (nextIndex + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle('post-carousel__dot--active', dotIndex === index);
    });
  }

  prevBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    goTo(index - 1);
  });

  nextBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    goTo(index + 1);
  });

  dots.forEach((dot) => {
    dot.addEventListener('click', (e) => {
      e.stopPropagation();
      goTo(Number(dot.dataset.carouselDot));
    });
  });

  let touchStartX = 0;
  carousel.addEventListener(
    'touchstart',
    (e) => {
      touchStartX = e.changedTouches[0].clientX;
    },
    { passive: true }
  );

  carousel.addEventListener(
    'touchend',
    (e) => {
      const diff = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(diff) < 40) return;
      goTo(index + (diff < 0 ? 1 : -1));
    },
    { passive: true }
  );

  goTo(0);
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
    hideAuthModal();
  });
}

function renderInquiryList(container, posts) {
  if (!container) return;

  if (!posts?.length) {
    container.innerHTML =
      '<p class="empty-state">아직 등록된 문의가 없습니다. 첫 문의를 남겨 보세요!</p>';
    return;
  }

  container.innerHTML = posts
    .map((post) => {
      const nickname = escapeHtml(post.profiles?.nickname || '익명');
      const title = escapeHtml(post.title || '');
      const body = escapeHtml(post.body || '').replace(/\n/g, '<br>');
      const date = new Date(post.created_at).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      return `
        <article class="inquiry-card">
          <header class="inquiry-card__header">
            <h2 class="inquiry-card__title">${title}</h2>
            <time class="inquiry-card__date">${date}</time>
          </header>
          <p class="inquiry-card__author">${nickname}</p>
          <div class="inquiry-card__body">${body}</div>
        </article>
      `;
    })
    .join('');
}

function updateInquiryView(isLoggedIn) {
  const notice = document.getElementById('inquiry-guest-notice');
  const form = document.getElementById('inquiry-form');
  const submitBtn = form?.querySelector('button[type="submit"]');

  if (notice) notice.hidden = isLoggedIn;
  if (form) form.hidden = !isLoggedIn;
  if (submitBtn) submitBtn.textContent = isLoggedIn ? '문의 등록' : '로그인하고 문의하기';
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

function renderCommentAuthorHtml(comment, postOwnerId) {
  const name = escapeHtml(comment.profiles?.nickname || '익명');
  const roleHtml =
    comment.user_id === postOwnerId
      ? '<span class="comment-item__role">게시자</span>'
      : '';
  return `${roleHtml}<span class="comment-item__author">${name}</span>`;
}

function renderCommentTimeHtml(createdAt) {
  return new Date(createdAt).toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderSingleCommentHtml(comment, postOwnerId, currentUserId, postId, isReply = false) {
  const body = escapeHtml(comment.body || '');
  const time = renderCommentTimeHtml(comment.created_at);
  const replyClass = isReply ? ' comment-item--reply' : '';
  const canReply =
    !isReply && currentUserId && currentUserId === postOwnerId;

  const replyControls = canReply
    ? `
      <button type="button" class="comment-reply-btn" data-reply-to="${escapeHtml(comment.id)}">답글</button>
      <form class="comment-reply-form" data-post="${escapeHtml(postId)}" data-parent="${escapeHtml(comment.id)}" hidden>
        <input type="text" name="body" maxlength="200" placeholder="대댓글을 입력하세요…">
        <button type="submit" class="comment-reply-form__btn">등록</button>
      </form>
    `
    : '';

  return `
    <div class="comment-item${replyClass}" data-comment-id="${escapeHtml(comment.id)}">
      <div class="comment-item__head">
        ${renderCommentAuthorHtml(comment, postOwnerId)}
        <time class="comment-item__time">${time}</time>
      </div>
      <p class="comment-item__body">${body}</p>
      ${replyControls}
    </div>
  `;
}

function renderCommentsHtml(comments, postOwnerId, currentUserId, postId) {
  if (!comments?.length) {
    return '<p class="comment-empty">아직 댓글이 없습니다.</p>';
  }

  const topLevel = comments.filter((c) => !c.parent_id);
  const repliesByParent = comments.reduce((acc, comment) => {
    if (!comment.parent_id) return acc;
    if (!acc[comment.parent_id]) acc[comment.parent_id] = [];
    acc[comment.parent_id].push(comment);
    return acc;
  }, {});

  return topLevel
    .map((comment) => {
      const replies = (repliesByParent[comment.id] || [])
        .map((reply) =>
          renderSingleCommentHtml(reply, postOwnerId, currentUserId, postId, true)
        )
        .join('');

      return `
        <div class="comment-thread">
          ${renderSingleCommentHtml(comment, postOwnerId, currentUserId, postId, false)}
          ${replies ? `<div class="comment-replies">${replies}</div>` : ''}
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
  const playerHtml = renderPlayerLineHtml(post);
  const tagsHtml = renderPostTagsHtml(post);

  card.innerHTML = `
    <div class="post-card__header">
      <span class="post-card__author">
        <span class="post-card__author-role">게시자</span>
        ${escapeHtml(nickname)}${authorBadges}
      </span>
      <time class="post-card__date">${date}</time>
    </div>
    ${renderPostImagesHtml(post)}
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
      <div class="comment-list">${renderCommentsHtml(post.comments, post.user_id, currentUserId, post.id)}</div>
      <form class="comment-form" data-post="${post.id}">
        <input type="text" name="body" maxlength="200" placeholder="댓글을 입력하세요…" ${currentUserId ? '' : 'readonly'}>
        <button type="submit" class="comment-form__btn">등록</button>
      </form>
    </div>
  `;

  const likeBtn = card.querySelector('[data-like]');
  bindPostCarousel(card);

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
    onComment(post.id, input.value, commentForm, null);
  });

  card.querySelectorAll('.comment-reply-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const thread = btn.closest('.comment-thread, .comment-item');
      thread?.querySelectorAll('.comment-reply-form').forEach((form) => {
        form.hidden = true;
      });
      const form = btn.nextElementSibling;
      if (form?.classList.contains('comment-reply-form')) {
        form.hidden = false;
        form.querySelector('input')?.focus();
      }
    });
  });

  card.querySelectorAll('.comment-reply-form').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!currentUserId) {
        onRequireLogin();
        return;
      }
      const input = form.querySelector('input[name="body"]');
      const parentId = form.dataset.parent;
      onComment(post.id, input.value, form, parentId);
    });
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

function previewImages(files, listEl, placeholderEl) {
  if (!listEl || !placeholderEl) return;
  listEl.innerHTML = '';

  if (!files?.length) {
    listEl.hidden = true;
    placeholderEl.hidden = false;
    return;
  }

  [...files].forEach((file) => {
    const img = document.createElement('img');
    img.className = 'photo-preview';
    img.alt = '미리보기';
    img.src = URL.createObjectURL(file);
    listEl.appendChild(img);
  });

  listEl.hidden = false;
  placeholderEl.hidden = true;
}
