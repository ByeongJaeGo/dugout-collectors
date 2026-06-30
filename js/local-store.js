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
const BOT5_ID = '00000000-0000-4000-8000-000000000005';
const BOT6_ID = '00000000-0000-4000-8000-000000000006';
const BOT7_ID = '00000000-0000-4000-8000-000000000007';
const BOT8_ID = '00000000-0000-4000-8000-000000000008';

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

  write(LS_USERS, [
    { id: BOT4_ID, email: 'collector3@daum.net', nickname: 'KBO매니아' },
  ]);

  write(LS_POSTS, []);

  write(LS_LIKES, []);

  write(LS_COMMENTS, []);

  write(LS_NOTIFICATIONS, []);

  localStorage.setItem(LS_SEEDED, '1');
  localStorage.setItem('dugout_seed_version', SEED_VERSION);
}

const FEATURED_POSTS_KEY = 'dugout_featured_yamamoto';
const CATALOG_POSTS_KEY = 'dugout_catalog_v5';
const CATALOG_ENGAGEMENT_KEY = 'dugout_catalog_engagement_v2';
const POST_TEAMS_KEY = 'dugout_post_teams_v1';
const PURGED_AUTHORS_KEY = 'dugout_purged_authors_v2';
const PURGED_NICKNAMES = ['DugoutBot', '고푸리아', '유니폼수집가', '빈티지러버'];

function purgePostsByNicknames() {
  if (localStorage.getItem(PURGED_AUTHORS_KEY)) return;

  const users = read(LS_USERS, []);
  const purgeUserIds = new Set(
    users.filter((u) => PURGED_NICKNAMES.includes(u.nickname)).map((u) => u.id)
  );
  if (!purgeUserIds.size) {
    localStorage.setItem(PURGED_AUTHORS_KEY, 'done');
    return;
  }

  const posts = read(LS_POSTS, []);
  const removedPostIds = new Set(
    posts.filter((p) => purgeUserIds.has(p.user_id)).map((p) => p.id)
  );

  write(
    LS_POSTS,
    posts.filter((p) => !purgeUserIds.has(p.user_id))
  );
  write(
    LS_LIKES,
    read(LS_LIKES, []).filter(
      (l) => !removedPostIds.has(l.post_id) && !purgeUserIds.has(l.user_id)
    )
  );
  write(
    LS_COMMENTS,
    read(LS_COMMENTS, []).filter(
      (c) => !removedPostIds.has(c.post_id) && !purgeUserIds.has(c.user_id)
    )
  );
  write(
    LS_NOTIFICATIONS,
    read(LS_NOTIFICATIONS, []).filter(
      (n) =>
        !removedPostIds.has(n.post_id) &&
        !purgeUserIds.has(n.actor_id) &&
        !purgeUserIds.has(n.user_id)
    )
  );
  write(
    LS_USERS,
    users.filter((u) => !purgeUserIds.has(u.id))
  );

  localStorage.setItem(PURGED_AUTHORS_KEY, 'done');
}

function ensurePostTeams() {
  if (localStorage.getItem(POST_TEAMS_KEY)) return;

  const posts = read(LS_POSTS, []);
  let changed = false;
  const next = posts.map((post) => {
    if (normalizeTeamId(post.team)) return post;
    const team = inferTeamForPost(post);
    if (!team) return post;
    changed = true;
    return { ...post, team };
  });

  if (changed) write(LS_POSTS, next);
  localStorage.setItem(POST_TEAMS_KEY, 'done');
}

function ensureCatalogUsers() {
  const users = read(LS_USERS, []);
  const catalogUsers = [
    { id: BOT5_ID, email: 'gobyeongkwon@naver.com', nickname: '고병권' },
    { id: BOT6_ID, email: 'chiro@naver.com', nickname: '치로로' },
    { id: BOT7_ID, email: 'daechung@naver.com', nickname: '대충머충' },
    { id: BOT8_ID, email: 'cheonanhanwha1@naver.com', nickname: '천안 한화팬1' },
  ];

  let changed = false;
  const next = [...users];

  for (const user of catalogUsers) {
    const existing = next.find((u) => u.id === user.id);
    if (!existing) {
      next.push(user);
      changed = true;
    } else if (existing.nickname !== user.nickname || existing.email !== user.email) {
      Object.assign(existing, user);
      changed = true;
    }
  }

  if (changed) write(LS_USERS, next);
  return next;
}

function assignCatalogAuthors(posts) {
  return posts.map((post) => {
    if (post.player_name === '야마모토 요시노부') {
      return { ...post, user_id: BOT5_ID };
    }
    if (post.player_name === '다르비슈 유') {
      return { ...post, user_id: BOT6_ID };
    }
    if (post.player_name === '채은성') {
      return { ...post, user_id: BOT7_ID };
    }
    if (post.player_name === '제러드 호잉') {
      return { ...post, user_id: BOT8_ID };
    }
    return post;
  });
}

function mergePlayerPosts(posts, playerName, imageUrls, patch) {
  const matching = posts.filter((p) => p.player_name === playerName);
  if (matching.length >= 2) {
    const sorted = [...matching].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    const merged = {
      ...sorted[0],
      ...patch,
      image_url: imageUrls[0],
      image_urls: imageUrls,
    };
    return [merged, ...posts.filter((p) => p.player_name !== playerName)];
  }
  if (matching.length === 1) {
    return posts.map((p) =>
      p.player_name === playerName
        ? { ...p, ...patch, image_url: imageUrls[0], image_urls: imageUrls }
        : p
    );
  }
  if (!matching.length) {
    return [
      {
        id: uid(),
        user_id: BOT5_ID,
        image_url: imageUrls[0],
        image_urls: imageUrls,
        created_at: new Date().toISOString(),
        ...patch,
      },
      ...posts,
    ];
  }
  return posts;
}

function ensureCatalogPosts() {
  const users = ensureCatalogUsers();
  if (!users.length) return;

  let posts = read(LS_POSTS, []);
  const alreadyDone = localStorage.getItem(CATALOG_POSTS_KEY) === 'done';

  if (!alreadyDone) {
    posts = mergePlayerPosts(posts, '야마모토 요시노부', [
      '/assets/yamamoto-front.jpg',
      '/assets/yamamoto-back.jpg',
    ], {
      user_id: BOT5_ID,
      team: 'mlb',
      caption: '2025 월드시리즈 MVP',
      player_name: '야마모토 요시노부',
      tags: ['MLB', 'LA다저스', '월드시리즈', 'MVP'],
    });

    if (!posts.some((p) => p.player_name === '다르비슈 유')) {
      posts.unshift({
        id: uid(),
        user_id: BOT6_ID,
        image_url: '/assets/darvish-front.jpg',
        image_urls: ['/assets/darvish-front.jpg', '/assets/darvish-back.jpg'],
        caption: '샌디에고 파드리스 유니폼',
        player_name: '다르비슈 유',
        team: 'mlb',
        tags: ['MLB', '샌디에고', '파드리스'],
        created_at: new Date().toISOString(),
      });
    } else {
      posts = mergePlayerPosts(posts, '다르비슈 유', [
        '/assets/darvish-front.jpg',
        '/assets/darvish-back.jpg',
      ], {
        user_id: BOT6_ID,
        team: 'mlb',
        caption: '샌디에고 파드리스 유니폼',
        player_name: '다르비슈 유',
        tags: ['MLB', '샌디에고', '파드리스'],
      });
    }
  }

  posts = mergePlayerPosts(posts, '채은성', [
    '/assets/chae-front.jpg',
    '/assets/chae-back.jpg',
  ], {
    user_id: BOT7_ID,
    team: 'hanwha',
    caption: '권광민과 김태연의 사인이 적혀있다',
    player_name: '채은성',
    tags: ['KBO', '한화이글스'],
  });

  posts = mergePlayerPosts(posts, '제러드 호잉', ['/assets/hoying-back.jpg'], {
    user_id: BOT8_ID,
    team: 'hanwha',
    caption: '2018 시즌 유니폼',
    player_name: '제러드 호잉',
    tags: ['KBO', '한화이글스', '2018'],
  });

  posts = assignCatalogAuthors(posts);
  write(LS_POSTS, posts);
  localStorage.setItem(CATALOG_POSTS_KEY, 'done');
  localStorage.removeItem(FEATURED_POSTS_KEY);
}

function replacePostLikes(likes, postId, likerIds, hoursAgo) {
  const next = likes.filter((l) => l.post_id !== postId);
  likerIds.forEach((userId, i) => {
    next.push({
      post_id: postId,
      user_id: userId,
      created_at: hoursAgo(2 - i * 0.4),
    });
  });
  return next;
}

function ensureCatalogEngagement() {
  if (localStorage.getItem(CATALOG_ENGAGEMENT_KEY)) return;

  const posts = read(LS_POSTS, []);
  if (!posts.length) return;

  let likes = read(LS_LIKES, []);
  let comments = read(LS_COMMENTS, []);
  const now = new Date();
  const hoursAgo = (h) => new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();

  const likesByPlayer = {
    '제러드 호잉': [BOT5_ID, BOT6_ID],
    '야마모토 요시노부': [BOT5_ID, BOT6_ID, BOT4_ID],
  };

  const likerPool = [BOT4_ID, BOT5_ID, BOT6_ID, BOT7_ID, BOT8_ID];
  let poolIdx = 0;

  function pickLikers(post, count) {
    const picked = [];
    const used = new Set([post.user_id]);
    let guard = 0;
    while (picked.length < count && guard < likerPool.length * 2) {
      const candidate = likerPool[poolIdx % likerPool.length];
      poolIdx += 1;
      guard += 1;
      if (!used.has(candidate)) {
        picked.push(candidate);
        used.add(candidate);
      }
    }
    return picked;
  }

  posts.forEach((post) => {
    const configured = likesByPlayer[post.player_name];
    const likerIds = configured
      ? configured.filter((id) => id !== post.user_id)
      : pickLikers(post, 1);
    likes = replacePostLikes(likes, post.id, likerIds, hoursAgo);
  });

  const yamamoto = posts.find((p) => p.player_name === '야마모토 요시노부');
  if (
    yamamoto &&
    !comments.some((c) => c.post_id === yamamoto.id && c.body === '이거 어케사요?')
  ) {
    comments.push({
      id: uid(),
      post_id: yamamoto.id,
      user_id: BOT7_ID,
      body: '이거 어케사요?',
      created_at: hoursAgo(0.5),
    });
  }

  write(LS_LIKES, likes);
  write(LS_COMMENTS, comments);
  localStorage.setItem(CATALOG_ENGAGEMENT_KEY, 'done');
}

function mapStoredPosts(posts, users, likes, comments) {
  return enrichPostsWithTeamStats(posts).map((p) => toPost(p, users, likes, comments));
}

function ensureFeaturedPosts() {
  ensureCatalogPosts();
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
      parent_id: c.parent_id || null,
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
    purgePostsByNicknames();
    ensureCatalogPosts();
    ensureCatalogEngagement();
    ensurePostTeams();
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

  async uploadPost(userId, files, postFields) {
    const { caption, player_name, team, tags } = normalizePostFields(postFields);
    const fileList = (Array.isArray(files) ? files : [files]).filter(Boolean);

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!fileList.length) throw new Error('사진을 선택해 주세요.');

    const imageUrls = [];
    for (const file of fileList) {
      if (!ALLOWED.includes(file.type)) throw new Error('JPG, PNG, WEBP, GIF만 업로드할 수 있습니다.');
      if (file.size > 5 * 1024 * 1024) throw new Error('파일 크기는 5MB 이하여야 합니다.');
      imageUrls.push(await fileToDataUrl(file));
    }

    const { image_url, image_urls } = buildPostImageFields(imageUrls);
    const posts = read(LS_POSTS, []);
    const isFirstDiscoverer = willBeFirstDiscoverer(posts, team, player_name);
    const post = {
      id: uid(),
      user_id: userId,
      image_url,
      image_urls,
      caption,
      player_name,
      team,
      tags,
      created_at: new Date().toISOString(),
    };
    posts.unshift(post);
    write(LS_POSTS, posts);

    const users = read(LS_USERS, []);
    const likes = read(LS_LIKES, []);
    const comments = read(LS_COMMENTS, []);
    const enriched = mapStoredPosts([post], users, likes, comments)[0];
    return { ...enriched, isFirstDiscoverer };
  },

  async fetchAllPosts() {
    const posts = read(LS_POSTS, []).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    const users = read(LS_USERS, []);
    const likes = normalizeLikes(read(LS_LIKES, []));
    const comments = read(LS_COMMENTS, []);
    return mapStoredPosts(posts, users, likes, comments);
  },

  async fetchRankings() {
    const posts = read(LS_POSTS, []);
    const users = read(LS_USERS, []);
    const likes = normalizeLikes(read(LS_LIKES, []));
    const comments = read(LS_COMMENTS, []);
    return computeRankings(posts, users, likes, comments);
  },

  async fetchMyPosts(userId) {
    const allPosts = enrichPostsWithTeamStats(read(LS_POSTS, []));
    const posts = allPosts
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

    const allPosts = enrichPostsWithTeamStats(read(LS_POSTS, []));
    const posts = allPosts
      .filter((p) => likedIds.includes(p.id))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const users = read(LS_USERS, []);
    const likes = read(LS_LIKES, []);
    const comments = read(LS_COMMENTS, []);
    return posts.map((p) => toPost(p, users, likes, comments));
  },

  async addComment(postId, userId, body, parentId = null) {
    const text = body.trim();
    if (!text) throw new Error('댓글을 입력하세요.');
    if (text.length > MAX_COMMENT_LEN) {
      throw new Error(`댓글은 ${MAX_COMMENT_LEN}자 이내입니다.`);
    }

    const posts = read(LS_POSTS, []);
    const post = posts.find((p) => p.id === postId);
    if (!post) throw new Error('게시물을 찾을 수 없습니다.');

    const comments = read(LS_COMMENTS, []);

    if (parentId) {
      if (post.user_id !== userId) {
        throw new Error('게시자만 대댓글을 달 수 있습니다.');
      }
      const parent = comments.find((c) => c.id === parentId && c.post_id === postId);
      if (!parent || parent.parent_id) {
        throw new Error('답글을 달 댓글을 찾을 수 없습니다.');
      }
    }

    const users = read(LS_USERS, []);
    const user = users.find((u) => u.id === userId);
    const comment = {
      id: uid(),
      post_id: postId,
      user_id: userId,
      parent_id: parentId || null,
      body: text,
      created_at: new Date().toISOString(),
    };
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

  fetchInquiryPosts: () => Promise.resolve(fetchInquiryPosts()),
  createInquiryPost: (userId, fields, notifyMeta) =>
    Promise.resolve(createInquiryPost(userId, fields, notifyMeta)),
};
