let backend;
let currentUser = null;
let currentProfile = null;
let pendingView = null;
let searchQuery = '';
let teamFilter = '';
let playerFilter = '';
let notificationPollTimer = null;

const NOTIFICATION_POLL_MS = 20000;

const AUTH_REQUIRED_VIEWS = ['upload', 'my-posts', 'my-likes'];

function openAuthModal(mode, pendingAfter) {
  if (currentUser) {
    if (pendingAfter) navigateTo(pendingAfter);
    return;
  }
  if (pendingAfter) pendingView = pendingAfter;
  showAuthModal(mode);
}

function navigateTo(view) {
  if (!currentUser && AUTH_REQUIRED_VIEWS.includes(view)) {
    openAuthModal('login', view);
    return;
  }
  if (view === 'feed') loadFeed();
  if (view === 'my-posts') loadMyPosts();
  if (view === 'my-likes') loadMyLikes();
  if (view === 'upload') updateUploadView();
  if (view === 'inquiry') loadInquiryBoard();
  showView(view);
}

function goAfterAuth(defaultView) {
  hideAuthModal();
  const dest = pendingView || defaultView;
  pendingView = null;
  if (dest === 'feed') loadFeed();
  if (dest === 'my-posts') loadMyPosts();
  if (dest === 'my-likes') loadMyLikes();
  if (dest === 'upload') updateUploadView();
  if (dest === 'inquiry') loadInquiryBoard();
  showView(dest);
}

function updateUploadView() {
  const notice = document.getElementById('upload-guest-notice');
  const submitBtn = document.querySelector('#upload-form button[type="submit"]');
  const loggedIn = Boolean(currentUser);

  if (notice) notice.hidden = loggedIn;
  if (submitBtn) submitBtn.textContent = loggedIn ? '올리기' : '로그인하고 올리기';
}

function startNotificationPolling() {
  stopNotificationPolling();
  notificationPollTimer = window.setInterval(() => {
    if (currentUser) refreshNotifications();
  }, NOTIFICATION_POLL_MS);
}

function stopNotificationPolling() {
  if (notificationPollTimer) {
    clearInterval(notificationPollTimer);
    notificationPollTimer = null;
  }
}

async function refreshSession() {
  if (currentUser) {
    hideAuthModal();
    currentProfile = await backend.getCurrentProfile(currentUser.id);
    const badges = getUserBadges(currentUser.id, getBadgeContext());
    setAuthNav(true, currentProfile?.nickname, badges);
    await refreshLikesBannerCount();
    resetNotificationBadgeState();
    await refreshNotifications();
    startNotificationPolling();
  } else {
    stopNotificationPolling();
    setAuthNav(false);
    setNotificationPanelOpen(false);
    resetNotificationBadgeState();
    updateNotificationBadge(0, { animate: false });
  }
  updateUploadView();
  updateInquiryView(Boolean(currentUser));
}

async function loadInquiryBoard() {
  updateInquiryView(Boolean(currentUser));
  const container = document.getElementById('inquiry-list');
  if (!container) return;

  container.innerHTML = '<p class="feed-list__status">불러오는 중…</p>';

  try {
    const posts = await backend.fetchInquiryPosts();
    renderInquiryList(container, posts);
  } catch (err) {
    container.innerHTML = `<p class="empty-state error">${escapeHtml(err.message)}</p>`;
  }
}

async function handleInquirySubmit(e) {
  e.preventDefault();

  if (!currentUser) {
    openAuthModal('login', 'inquiry');
    return;
  }

  const form = e.target;
  const title = form.title.value;
  const body = form.body.value;

  setFormLoading(form, true, '등록 중…');

  try {
    const notifyMeta = {
      name: currentProfile?.nickname || currentUser.email.split('@')[0] || '회원',
      email: currentUser.email,
    };
    await backend.createInquiryPost(currentUser.id, { title, body }, notifyMeta);
    form.reset();
    showToast(CONTACT_SUCCESS_MESSAGE, 'success');
    await loadInquiryBoard();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setFormLoading(form, false);
  }
}

async function refreshLikesBannerCount() {
  if (!currentUser) return;
  try {
    const liked = await backend.fetchLikedPosts(currentUser.id);
    updateLikesBannerCount(liked.length);
  } catch {
    updateLikesBannerCount(0);
  }
}

async function init() {
  bindEvents();
  initAuthModal();
  initTeamSelect();
  initTeamCategoryBar();
  initNotificationPanel({
    onToggle: () => refreshNotifications(),
    onMarkRead: () => handleMarkNotificationsRead(),
    onItemClick: (postId) => handleNotificationClick(postId),
  });
  applyProviderDefaults();
  showView('feed');

  backend = getBackend();
  setModeBanner();

  currentUser = await backend.init();
  await refreshSession();
  await loadFeed();

  backend.onAuthChange(async (user) => {
    currentUser = user;
    await refreshSession();

    if (!currentUser && AUTH_REQUIRED_VIEWS.includes(getCurrentView())) {
      showView('feed');
    }
    if (currentUser) hideAuthModal();
    await reloadCurrentView();
  });
}

function bindEvents() {
  document.getElementById('signup-form').addEventListener('submit', handleSignup);
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('upload-form').addEventListener('submit', handleUpload);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  document.getElementById('search-form').addEventListener('submit', (e) => {
    e.preventDefault();
    searchQuery = document.getElementById('search-input').value;
    loadFeed();
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    clearTimeout(bindEvents._searchTimer);
    bindEvents._searchTimer = setTimeout(() => loadFeed(), 250);
  });

  document.getElementById('team-category-bar')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.team-chip[data-team]');
    if (!btn) return;
    teamFilter = btn.dataset.team || '';
    playerFilter = '';
    renderTeamCategoryBar(teamFilter);
    loadFeed();
  });

  document.getElementById('feed-list')?.addEventListener('click', (e) => {
    const link = e.target.closest('.post-card__player-link');
    if (!link) return;
    e.preventDefault();
    applyPlayerFilter(link.dataset.playerKey, link.dataset.team);
  });

  document.getElementById('player-filter-bar')?.addEventListener('click', (e) => {
    if (e.target.closest('[data-clear-player-filter]')) {
      clearPlayerFilter();
    }
  });

  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(btn.dataset.nav);
    });
  });

  document.getElementById('upload-go-signup')?.addEventListener('click', () => {
    openAuthModal('login', 'upload');
  });

  document.getElementById('guest-login-btn')?.addEventListener('click', () => {
    openAuthModal('login');
  });

  document.getElementById('inquiry-form')?.addEventListener('submit', handleInquirySubmit);
  document.getElementById('inquiry-go-login')?.addEventListener('click', () => {
    openAuthModal('login', 'inquiry');
  });

  const fileInput = document.getElementById('photo-input');
  fileInput.addEventListener('change', () => {
    previewImages(
      fileInput.files,
      document.getElementById('photo-preview-list'),
      document.getElementById('photo-placeholder')
    );
  });
}

async function handleSignup(e) {
  e.preventDefault();
  const form = e.target;
  setFormLoading(form, true, '가입 중…');

  try {
    currentUser = await backend.signUp(
      form.userid.value,
      form.provider.value,
      form.nickname.value
    );
    saveLastProvider(form.provider.value);
    await refreshSession();
    showToast('회원가입 완료!', 'success');
    form.reset();
    goAfterAuth('feed');
    await loadFeed();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setFormLoading(form, false);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  setFormLoading(form, true, '로그인 중…');

  try {
    currentUser = await backend.signIn(form.userid.value, form.provider.value);
    saveLastProvider(form.provider.value);
    await refreshSession();
    showToast('로그인되었습니다.', 'success');
    form.reset();
    goAfterAuth('feed');
    await loadFeed();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setFormLoading(form, false);
  }
}

async function handleLogout() {
  try {
    await backend.signOut();
    currentUser = null;
    currentProfile = null;
    await refreshSession();
    showToast('로그아웃되었습니다.', 'info');
    showView('feed');
    await loadFeed();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleUpload(e) {
  e.preventDefault();

  if (!currentUser) {
    openAuthModal('login', 'upload');
    return;
  }

  const form = e.target;
  const files = [...form.photo.files];
  const caption = form.caption.value;
  const playerName = form.player_name.value;
  const team = form.team.value;
  const tagsRaw = form.tags.value;

  if (!files.length) {
    showToast('사진을 선택해 주세요.', 'error');
    return;
  }

  setFormLoading(form, true, '업로드 중…');

  try {
    const beforePosts = await backend.fetchAllPosts();
    const isFirstDiscoverer =
      playerName.trim() && willBeFirstDiscoverer(beforePosts, team, playerName);

    const result = await backend.uploadPost(currentUser.id, files, {
      caption,
      playerName,
      team,
      tags: parseTagsInput(tagsRaw),
    });

    if (result?.isFirstDiscoverer || isFirstDiscoverer) {
      showToast('🔍 첫 발견자 칭호를 획득했습니다!', 'success');
    } else {
      showToast('업로드 완료!', 'success');
    }
    form.reset();
    initTeamSelect();
    previewImages(
      null,
      document.getElementById('photo-preview-list'),
      document.getElementById('photo-placeholder')
    );
    await loadFeed();
    showView('feed');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    setFormLoading(form, false);
  }
}

function renderPostList(container, posts, emptyMessage) {
  renderFeed(
    container,
    posts,
    currentUser?.id,
    handleLike,
    emptyMessage,
    () => openAuthModal('login'),
    handleComment,
    getBadgeContext()
  );
}

async function syncBadgeContext() {
  const [rawPosts, rankings] = await Promise.all([
    backend.fetchAllPosts(),
    backend.fetchRankings().catch(() => ({ daily: [], weekly: [] })),
  ]);
  const allPosts = enrichPostsWithTeamStats(rawPosts);
  const ctx = buildBadgeContext(allPosts, rankings);
  setBadgeContext(ctx);
  if (currentUser) {
    currentProfile = currentProfile || (await backend.getCurrentProfile(currentUser.id));
    setAuthNav(true, currentProfile?.nickname, getUserBadges(currentUser.id, ctx));
  }
  return { allPosts, rankings };
}

function showListLoading(container) {
  if (!container.querySelector('.post-card')) {
    container.innerHTML = '<p class="feed-list__status">불러오는 중…</p>';
  }
}

async function reloadCurrentView() {
  const view = getCurrentView();
  if (view === 'feed') await loadFeed();
  else if (view === 'my-posts') await loadMyPosts();
  else if (view === 'my-likes') await loadMyLikes();
  else if (view === 'inquiry') await loadInquiryBoard();
}

async function notifyPostOwner(postId, type, commentBody) {
  if (!currentUser) return;

  const posts = await backend.fetchAllPosts();
  const post = posts.find((p) => p.id === postId);
  if (!post || post.user_id === currentUser.id) return;

  await backend.createNotification({
    userId: post.user_id,
    type,
    actorId: currentUser.id,
    actorNickname: currentProfile?.nickname || '익명',
    postId,
    postCaption: post.caption,
    commentBody,
  });
}

async function refreshNotifications() {
  if (!currentUser) return;

  try {
    const notifications = await backend.fetchNotifications(currentUser.id);
    const unread = notifications.filter((n) => !n.read).length;
    updateNotificationBadge(unread);
    renderNotificationList(notifications, handleNotificationClick);
  } catch {
    updateNotificationBadge(0);
  }
}

async function handleMarkNotificationsRead() {
  if (!currentUser) return;
  try {
    await backend.markNotificationsRead(currentUser.id);
    await refreshNotifications();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleNotificationClick(postId) {
  setNotificationPanelOpen(false);
  if (getCurrentView() !== 'feed') {
    await loadFeed();
    showView('feed');
  }
  requestAnimationFrame(() => scrollToPost(postId));
}

async function handleComment(postId, body, form, parentId = null) {
  if (!currentUser) {
    openAuthModal('login');
    return;
  }

  const btn = form.querySelector('.comment-form__btn, .comment-reply-form__btn');
  btn.disabled = true;
  try {
    await backend.addComment(postId, currentUser.id, body, parentId || null);
    if (!parentId) {
      await notifyPostOwner(postId, 'comment', body.trim());
    }
    form.reset();
    if (parentId) {
      form.hidden = true;
    }
    await reloadCurrentView();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function loadRankings() {
  try {
    const rankings = await backend.fetchRankings();
    renderRankings(rankings, getBadgeContext());
  } catch {
    renderRankings({ daily: [], weekly: [] }, getBadgeContext());
  }
}

function initTeamCategoryBar() {
  renderTeamCategoryBar(teamFilter);
}

function applyPlayerFilter(playerKey, teamId) {
  if (!playerKey) return;
  playerFilter = playerKey;
  if (teamId) {
    teamFilter = teamId;
    renderTeamCategoryBar(teamFilter);
  }
  showView('feed');
  loadFeed();
  document.getElementById('player-filter-bar')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearPlayerFilter() {
  playerFilter = '';
  loadFeed();
}

async function loadFeed() {
  const container = document.getElementById('feed-list');
  showListLoading(container);

  try {
    const { allPosts, rankings } = await syncBadgeContext();
    renderRankings(rankings, getBadgeContext());
    renderTodayRegPanel(allPosts);

    let posts = filterPostsByTeam(allPosts, teamFilter);
    posts = filterPostsByPlayer(posts, playerFilter);
    posts = filterPostsByQuery(posts, searchQuery);
    renderPlayerFilterBar(playerFilter, allPosts);
    const emptyMessage = buildFeedEmptyMessage(
      searchQuery,
      teamFilter,
      playerFilter,
      allPosts
    );

    if (currentUser) {
      const likedCount = allPosts.filter((p) => p.liked_by?.includes(currentUser.id)).length;
      updateLikesBannerCount(likedCount);
    }

    renderPostList(container, posts, emptyMessage);
    if (currentUser) await refreshNotifications();
  } catch (err) {
    container.innerHTML = `<p class="empty-state error">${err.message}</p>`;
  }
}

async function loadMyPosts() {
  const container = document.getElementById('my-posts-list');
  showListLoading(container);

  try {
    await syncBadgeContext();
    const posts = await backend.fetchMyPosts(currentUser.id);
    renderPostList(container, posts, '아직 올린 글이 없습니다. 올리기에서 사진을 올려 보세요.');
  } catch (err) {
    container.innerHTML = `<p class="empty-state error">${err.message}</p>`;
  }
}

async function loadMyLikes() {
  const container = document.getElementById('my-likes-list');
  showListLoading(container);

  try {
    await syncBadgeContext();
    const posts = await backend.fetchLikedPosts(currentUser.id);
    updateLikesBannerCount(posts.length);
    renderPostList(container, posts, '아직 좋아요한 유니폼이 없습니다. 마음에 드는 글에 ♥를 눌러 보세요.');
  } catch (err) {
    container.innerHTML = `<p class="empty-state error">${err.message}</p>`;
  }
}

async function handleLike(postId, wasLiked, btn) {
  if (!currentUser) {
    openAuthModal('login');
    return;
  }

  btn.disabled = true;
  try {
    const nowLiked = await backend.toggleLike(postId, currentUser.id, wasLiked);
    const countEl = btn.querySelector('.like-count');
    const current = parseInt(countEl.textContent, 10) || 0;
    countEl.textContent = wasLiked ? current - 1 : current + 1;
    btn.classList.toggle('like-btn--active', nowLiked);
    btn.dataset.liked = nowLiked ? 'true' : 'false';
    btn.querySelector('span[aria-hidden]').textContent = nowLiked ? '♥' : '♡';
    if (nowLiked) await notifyPostOwner(postId, 'like');
    await refreshLikesBannerCount();
    if (getCurrentView() === 'my-likes') await loadMyLikes();
    if (getCurrentView() === 'feed') await loadFeed();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

init();
