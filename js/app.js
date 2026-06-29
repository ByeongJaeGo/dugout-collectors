let backend;
let currentUser = null;
let currentProfile = null;
let pendingView = null;
let searchQuery = '';

const AUTH_REQUIRED_VIEWS = ['upload', 'my-posts', 'my-likes'];

function requireSignup(pendingAfterSignup) {
  if (pendingAfterSignup) pendingView = pendingAfterSignup;
  showSignupModal(() => showView('signup'));
}

function navigateTo(view) {
  if (!currentUser && AUTH_REQUIRED_VIEWS.includes(view)) {
    requireSignup(view);
    return;
  }
  if (view === 'feed') loadFeed();
  if (view === 'my-posts') loadMyPosts();
  if (view === 'my-likes') loadMyLikes();
  if (view === 'upload') updateUploadView();
  showView(view);
}

function goAfterAuth(defaultView) {
  const dest = pendingView || defaultView;
  pendingView = null;
  if (dest === 'feed') loadFeed();
  if (dest === 'my-posts') loadMyPosts();
  if (dest === 'my-likes') loadMyLikes();
  if (dest === 'upload') updateUploadView();
  showView(dest);
}

function updateUploadView() {
  const notice = document.getElementById('upload-guest-notice');
  const submitBtn = document.querySelector('#upload-form button[type="submit"]');
  const loggedIn = Boolean(currentUser);

  if (notice) notice.hidden = loggedIn;
  if (submitBtn) submitBtn.textContent = loggedIn ? '올리기' : '가입하고 올리기';
}

async function refreshSession() {
  if (currentUser) {
    currentProfile = await backend.getCurrentProfile(currentUser.id);
    setAuthNav(true, currentProfile?.nickname);
    await refreshLikesBannerCount();
  } else {
    setAuthNav(false);
  }
  updateUploadView();
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
  initSignupModal();
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
    await loadFeed();
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

  document.querySelectorAll('[data-nav]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(btn.dataset.nav);
    });
  });

  document.getElementById('go-signup').addEventListener('click', (e) => {
    e.preventDefault();
    showView('signup');
  });

  document.getElementById('go-login').addEventListener('click', (e) => {
    e.preventDefault();
    showView('login');
  });

  document.getElementById('upload-go-signup')?.addEventListener('click', () => {
    requireSignup('upload');
  });

  document.getElementById('guest-signup-btn')?.addEventListener('click', () => {
    showSignupModal(() => showView('signup'));
  });

  const fileInput = document.getElementById('photo-input');
  fileInput.addEventListener('change', () => {
    previewImage(
      fileInput.files[0],
      document.getElementById('photo-preview'),
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
    requireSignup('upload');
    return;
  }

  const form = e.target;
  const file = form.photo.files[0];
  const caption = form.caption.value;

  if (!file) {
    showToast('사진을 선택해 주세요.', 'error');
    return;
  }
  if (!caption.trim()) {
    showToast('설명을 입력해 주세요.', 'error');
    return;
  }

  setFormLoading(form, true, '업로드 중…');

  try {
    await backend.uploadPost(currentUser.id, file, caption);
    showToast('업로드 완료!', 'success');
    form.reset();
    previewImage(null, document.getElementById('photo-preview'), document.getElementById('photo-placeholder'));
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
    () => requireSignup(),
    handleComment
  );
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
}

async function handleComment(postId, body, form) {
  if (!currentUser) {
    requireSignup();
    return;
  }

  const btn = form.querySelector('.comment-form__btn');
  btn.disabled = true;
  try {
    await backend.addComment(postId, currentUser.id, body);
    form.reset();
    await reloadCurrentView();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

async function loadFeed() {
  const container = document.getElementById('feed-list');
  showListLoading(container);

  try {
    const allPosts = await backend.fetchAllPosts();
    const posts = filterPostsByQuery(allPosts, searchQuery);
    const emptyMessage = searchQuery.trim()
      ? `"${escapeHtml(searchQuery.trim())}" 검색 결과가 없습니다.`
      : '아직 올라온 유니폼이 없습니다. 첫 번째로 올려 보세요!';

    if (currentUser) {
      const likedCount = allPosts.filter((p) => p.liked_by?.includes(currentUser.id)).length;
      updateLikesBannerCount(likedCount);
    }

    renderPostList(container, posts, emptyMessage);
  } catch (err) {
    container.innerHTML = `<p class="empty-state error">${err.message}</p>`;
  }
}

async function loadMyPosts() {
  const container = document.getElementById('my-posts-list');
  showListLoading(container);

  try {
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
    const posts = await backend.fetchLikedPosts(currentUser.id);
    updateLikesBannerCount(posts.length);
    renderPostList(container, posts, '아직 좋아요한 유니폼이 없습니다. 마음에 드는 글에 ♥를 눌러 보세요.');
  } catch (err) {
    container.innerHTML = `<p class="empty-state error">${err.message}</p>`;
  }
}

async function handleLike(postId, wasLiked, btn) {
  if (!currentUser) {
    requireSignup();
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
    await refreshLikesBannerCount();
    if (getCurrentView() === 'my-likes') await loadMyLikes();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

init();
