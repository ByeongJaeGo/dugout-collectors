const LS_USERS = 'dugout_users';
const LS_POSTS = 'dugout_posts';
const LS_LIKES = 'dugout_likes';
const LS_COMMENTS = 'dugout_comments';
const LS_NOTIFICATIONS = 'dugout_notifications';
const LS_SESSION = 'dugout_session';
const LS_SEEDED = 'dugout_seeded';
const DEMO_IMAGE = '/assets/demo-uniform.svg';
const SEED_VERSION = '7';
const BOT_ID = '00000000-0000-4000-8000-000000000001';
const BOT2_ID = '00000000-0000-4000-8000-000000000002';
const BOT3_ID = '00000000-0000-4000-8000-000000000003';
const BOT4_ID = '00000000-0000-4000-8000-000000000004';

function uid() {
  return crypto.randomUUID();
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function isBrokenImage(url) {
  if (!url) return true;
  if (url.startsWith('data:')) return false;
  if (url === DEMO_IMAGE || url === 'assets/demo-uniform.svg') return false;
  return url.startsWith('http') || url.includes('unsplash');
}

function normalizeLikes(likes) {
  let changed = false;
  const normalized = likes.map((l) => {
    if (!l.created_at) {
      changed = true;
      return { ...l, created_at: new Date().toISOString() };
    }
    return l;
  });
  if (changed) write(LS_LIKES, normalized);
  return normalized;
}

function resetDemoStorage() {
  localStorage.removeItem(LS_POSTS);
  localStorage.removeItem(LS_LIKES);
  localStorage.removeItem(LS_COMMENTS);
  localStorage.removeItem(LS_NOTIFICATIONS);
  localStorage.removeItem(LS_SEEDED);
}
function repairStorage() {
  const version = localStorage.getItem('dugout_seed_version');
  const posts = read(LS_POSTS, []);

  if (version !== SEED_VERSION) {
    const onlyDemo =
      posts.length === 0 ||
      posts.every(
        (p) => p.user_id === BOT_ID || p.caption?.includes('데모')
      );

    if (onlyDemo) resetDemoStorage();
    else {
      const fixed = posts.map((p) =>
        isBrokenImage(p.image_url) && p.caption?.includes('데모')
          ? { ...p, image_url: DEMO_IMAGE }
          : p
      );
      write(LS_POSTS, fixed);
    }
    localStorage.setItem('dugout_seed_version', SEED_VERSION);
    return;
  }

  let changed = false;
  const fixed = posts.map((post) => {
    if (isBrokenImage(post.image_url) && post.caption?.includes('데모')) {
      changed = true;
      return { ...post, image_url: DEMO_IMAGE };
    }
    return post;
  });
  if (changed) write(LS_POSTS, fixed);
}

function seedDemoData() {
  repairStorage();

  if (localStorage.getItem(LS_SEEDED)) return;

  const now = new Date();
  const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

  const post1 = uid();
  const post2 = uid();
  const post3 = uid();

  write(LS_USERS, [
    { id: BOT_ID, email: 'demo@naver.com', nickname: 'DugoutBot' },
    { id: BOT2_ID, email: 'collector1@naver.com', nickname: '유니폼수집가' },
    { id: BOT3_ID, email: 'collector2@gmail.com', nickname: '빈티지러버' },
    { id: BOT4_ID, email: 'collector3@daum.net', nickname: 'KBO매니아' },
  ]);

  write(LS_POSTS, [
    {
      id: post1,
      user_id: BOT_ID,
      image_url: DEMO_IMAGE,
      caption: '1980년대 빈티지 야구 유니폼 · 데모 샘플',
      player_name: '박찬호',
      tags: ['KBO', '빈티지', '90년대'],
      created_at: hoursAgo(48),
    },
    {
      id: post2,
      user_id: BOT2_ID,
      image_url: DEMO_IMAGE,
      caption: '1995 KBO 올스타 레플리카 · 한정판',
      player_name: '이종범',
      tags: ['KBO', '올스타', '레플리카'],
      created_at: hoursAgo(24),
    },
    {
      id: post3,
      user_id: BOT3_ID,
      image_url: DEMO_IMAGE,
      caption: 'MLB 클래식 로드 유니폼 · 희귀 컬러',
      player_name: '오타니',
      tags: ['MLB', '레플리카', '에인절스'],
      created_at: hoursAgo(6),
    },
  ]);

  write(LS_LIKES, [
    { post_id: post1, user_id: BOT2_ID, created_at: hoursAgo(2) },
    { post_id: post1, user_id: BOT3_ID, created_at: hoursAgo(1) },
    { post_id: post1, user_id: BOT4_ID, created_at: hoursAgo(0.5) },
    { post_id: post2, user_id: BOT_ID, created_at: hoursAgo(3) },
    { post_id: post2, user_id: BOT3_ID, created_at: hoursAgo(1) },
    { post_id: post3, user_id: BOT_ID, created_at: hoursAgo(2) },
    { post_id: post3, user_id: BOT2_ID, created_at: hoursAgo(1) },
    { post_id: post3, user_id: BOT4_ID, created_at: hoursAgo(0.3) },
  ]);

  write(LS_COMMENTS, [
    { id: uid(), post_id: post1, user_id: BOT2_ID, body: '레전드 유니폼이네요!', created_at: hoursAgo(2) },
    { id: uid(), post_id: post3, user_id: BOT4_ID, body: '색감 미쳤다', created_at: hoursAgo(1) },
    { id: uid(), post_id: post3, user_id: BOT_ID, body: '어디서 구하셨어요?', created_at: hoursAgo(0.5) },
  ]);

  write(LS_NOTIFICATIONS, [
    {
      id: uid(),
      user_id: BOT_ID,
      type: 'like',
      actor_id: BOT2_ID,
      actor_nickname: '유니폼수집가',
      post_id: post1,
      post_caption: '1980년대 빈티지 야구 유니폼 · 데모 샘플',
      comment_body: null,
      read: false,
      created_at: hoursAgo(0.4),
    },
    {
      id: uid(),
      user_id: BOT_ID,
      type: 'comment',
      actor_id: BOT4_ID,
      actor_nickname: 'KBO매니아',
      post_id: post1,
      post_caption: '1980년대 빈티지 야구 유니폼 · 데모 샘플',
      comment_body: '진짜 레전드네요!',
      read: false,
      created_at: hoursAgo(0.2),
    },
  ]);

  localStorage.setItem(LS_SEEDED, '1');
  localStorage.setItem('dugout_seed_version', SEED_VERSION);
}

function toPost(post, users, likes, comments) {
  const user = users.find((u) => u.id === post.user_id);
  const postLikes = likes.filter((l) => l.post_id === post.id);
  const base = {
    ...post,
    profiles: { nickname: user?.nickname || '익명' },
    like_count: postLikes.length,
    liked_by: postLikes.map((l) => l.user_id),
  };
  const enrichedComments = (comments || []).map((c) => {
    const author = users.find((u) => u.id === c.user_id);
    return {
      ...c,
      profiles: c.profiles || { nickname: author?.nickname || '익명' },
    };
  });
  return attachComments(base, enrichedComments);
}
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsDataURL(file);
  });
}

const localBackend = {
  mode: 'local',

  init() {
    seedDemoData();
    const session = read(LS_SESSION, null);
    if (!session?.userId) return null;
    const users = read(LS_USERS, []);
    const user = users.find((u) => u.id === session.userId);
    if (!user) {
      localStorage.removeItem(LS_SESSION);
      return null;
    }
    return { id: user.id, email: user.email };
  },

  onAuthChange() {
    return () => {};
  },

  async signUp(userId, provider, nickname) {
    const email = parseUserIdToEmail(userId, provider);
    const trimmedNickname = nickname.trim();

    if (trimmedNickname.length < 2) throw new Error('닉네임은 2자 이상이어야 합니다.');

    const users = read(LS_USERS, []);
    if (users.some((u) => u.email === email)) {
      throw new Error('이미 사용 중인 아이디입니다.');
    }

    const user = { id: uid(), email, nickname: trimmedNickname };
    users.push(user);
    write(LS_USERS, users);
    write(LS_SESSION, { userId: user.id });
    return { id: user.id, email: user.email };
  },

  async signIn(userId, provider) {
    const email = parseUserIdToEmail(userId, provider);
    const users = read(LS_USERS, []);
    const user = users.find((u) => u.email === email);

    if (!user) throw new Error('가입되지 않은 아이디입니다. 먼저 회원가입해 주세요.');

    write(LS_SESSION, { userId: user.id });
    return { id: user.id, email: user.email };
  },

  async signOut() {
    localStorage.removeItem(LS_SESSION);
  },

  async getCurrentProfile(userId) {
    if (!userId) return null;
    const users = read(LS_USERS, []);
    const user = users.find((u) => u.id === userId);
    if (!user) return null;
    return { id: user.id, nickname: user.nickname };
  },

  async uploadPost(userId, file, postFields) {
    const { caption, player_name, tags } = normalizePostFields(postFields);

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!file) throw new Error('사진을 선택해 주세요.');
    if (!ALLOWED.includes(file.type)) throw new Error('JPG, PNG, WEBP, GIF만 업로드할 수 있습니다.');
    if (file.size > 5 * 1024 * 1024) throw new Error('파일 크기는 5MB 이하여야 합니다.');

    const imageUrl = await fileToDataUrl(file);
    const posts = read(LS_POSTS, []);
    const post = {
      id: uid(),
      user_id: userId,
      image_url: imageUrl,
      caption,
      player_name,
      tags,
      created_at: new Date().toISOString(),
    };
    posts.unshift(post);
    write(LS_POSTS, posts);

    const users = read(LS_USERS, []);
    const likes = read(LS_LIKES, []);
    const comments = read(LS_COMMENTS, []);
    return toPost(post, users, likes, comments);
  },

  async fetchAllPosts() {
    const posts = read(LS_POSTS, []).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    const users = read(LS_USERS, []);
    const likes = normalizeLikes(read(LS_LIKES, []));
    const comments = read(LS_COMMENTS, []);
    return posts.map((p) => toPost(p, users, likes, comments));
  },

  async fetchRankings() {
    const posts = read(LS_POSTS, []);
    const users = read(LS_USERS, []);
    const likes = normalizeLikes(read(LS_LIKES, []));
    const comments = read(LS_COMMENTS, []);
    return computeRankings(posts, users, likes, comments);
  },

  async fetchMyPosts(userId) {
    const posts = read(LS_POSTS, [])
      .filter((p) => p.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const users = read(LS_USERS, []);
    const likes = read(LS_LIKES, []);
    const comments = read(LS_COMMENTS, []);
    return posts.map((p) => toPost(p, users, likes, comments));
  },

  async fetchLikedPosts(userId) {
    const likedIds = read(LS_LIKES, [])
      .filter((l) => l.user_id === userId)
      .map((l) => l.post_id);
    if (!likedIds.length) return [];

    const posts = read(LS_POSTS, [])
      .filter((p) => likedIds.includes(p.id))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const users = read(LS_USERS, []);
    const likes = read(LS_LIKES, []);
    const comments = read(LS_COMMENTS, []);
    return posts.map((p) => toPost(p, users, likes, comments));
  },

  async addComment(postId, userId, body) {
    const text = body.trim();
    if (!text) throw new Error('댓글을 입력하세요.');
    if (text.length > MAX_COMMENT_LEN) {
      throw new Error(`댓글은 ${MAX_COMMENT_LEN}자 이내입니다.`);
    }

    const users = read(LS_USERS, []);
    const user = users.find((u) => u.id === userId);
    const comment = {
      id: uid(),
      post_id: postId,
      user_id: userId,
      body: text,
      created_at: new Date().toISOString(),
    };
    const comments = read(LS_COMMENTS, []);
    comments.push(comment);
    write(LS_COMMENTS, comments);
    return {
      ...comment,
      profiles: { nickname: user?.nickname || '익명' },
    };
  },

  async toggleLike(postId, userId, alreadyLiked) {
    const likes = read(LS_LIKES, []);
    if (alreadyLiked) {
      write(LS_LIKES, likes.filter((l) => !(l.post_id === postId && l.user_id === userId)));
      return false;
    }
    if (likes.some((l) => l.post_id === postId && l.user_id === userId)) return true;
    likes.push({ post_id: postId, user_id: userId, created_at: new Date().toISOString() });
    write(LS_LIKES, likes);
    return true;
  },

  async createNotification(payload) {
    if (payload.userId === payload.actorId) return null;

    const list = read(LS_NOTIFICATIONS, []);
    const item = {
      id: uid(),
      user_id: payload.userId,
      type: payload.type,
      actor_id: payload.actorId,
      actor_nickname: payload.actorNickname,
      post_id: payload.postId,
      post_caption: (payload.postCaption || '').slice(0, 80),
      comment_body: payload.commentBody ? payload.commentBody.slice(0, 100) : null,
      read: false,
      created_at: new Date().toISOString(),
    };
    list.unshift(item);
    write(LS_NOTIFICATIONS, list.slice(0, 50));
    return item;
  },

  async fetchNotifications(userId) {
    return read(LS_NOTIFICATIONS, [])
      .filter((n) => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 50);
  },

  async markNotificationsRead(userId) {
    const list = read(LS_NOTIFICATIONS, []);
    let changed = false;
    const updated = list.map((n) => {
      if (n.user_id === userId && !n.read) {
        changed = true;
        return { ...n, read: true };
      }
      return n;
    });
    if (changed) write(LS_NOTIFICATIONS, updated);
  },
};
