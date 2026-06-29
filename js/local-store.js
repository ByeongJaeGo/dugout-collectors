const LS_USERS = 'dugout_users';
const LS_POSTS = 'dugout_posts';
const LS_LIKES = 'dugout_likes';
const LS_COMMENTS = 'dugout_comments';
const LS_SESSION = 'dugout_session';
const LS_SEEDED = 'dugout_seeded';
const DEMO_IMAGE = '/assets/demo-uniform.svg';
const SEED_VERSION = '4';
const BOT_ID = '00000000-0000-4000-8000-000000000001';

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

function resetDemoStorage() {
  localStorage.removeItem(LS_POSTS);
  localStorage.removeItem(LS_LIKES);
  localStorage.removeItem(LS_COMMENTS);
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

  write(LS_USERS, [{
    id: BOT_ID,
    email: 'demo@naver.com',
    nickname: 'DugoutBot',
  }]);

  write(LS_POSTS, [{
    id: uid(),
    user_id: BOT_ID,
    image_url: DEMO_IMAGE,
    caption: '1980년대 빈티지 야구 유니폼 · 데모 샘플',
    created_at: new Date().toISOString(),
  }]);

  write(LS_LIKES, []);
  write(LS_COMMENTS, []);
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

  async uploadPost(userId, file, caption) {
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
      caption: caption.trim(),
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
    const likes = read(LS_LIKES, []);
    const comments = read(LS_COMMENTS, []);
    return posts.map((p) => toPost(p, users, likes, comments));
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
    likes.push({ post_id: postId, user_id: userId });
    write(LS_LIKES, likes);
    return true;
  },
};
