const COLLECTOR_MIN_POSTS = 10;

const BADGE_ORDER = ['weekly_king', 'daily_pick', 'first_discoverer', 'collector'];

function sortBadges(badges) {
  return [...(badges || [])].sort(
    (a, b) => BADGE_ORDER.indexOf(a.id) - BADGE_ORDER.indexOf(b.id)
  );
}

function buildBadgeContext(posts, rankings) {
  const postCountByUser = {};
  (posts || []).forEach((p) => {
    postCountByUser[p.user_id] = (postCountByUser[p.user_id] || 0) + 1;
  });

  const userBadges = {};
  const addBadge = (userId, badge) => {
    if (!userId) return;
    if (!userBadges[userId]) userBadges[userId] = [];
    if (!userBadges[userId].some((b) => b.id === badge.id)) {
      userBadges[userId].push(badge);
    }
  };

  Object.entries(postCountByUser).forEach(([userId, count]) => {
    if (count >= COLLECTOR_MIN_POSTS) {
      addBadge(userId, { id: 'collector', emoji: '📦', label: '컬렉터' });
    }
  });

  const daily = rankings?.daily?.[0];
  const weeklyTop = rankings?.weekly?.[0];

  if (daily?.user_id) {
    addBadge(daily.user_id, { id: 'daily_pick', emoji: '🔥', label: '오늘의 픽' });
  }
  if (weeklyTop?.user_id) {
    addBadge(weeklyTop.user_id, { id: 'weekly_king', emoji: '👑', label: '이 주의 유니폼왕' });
  }

  const discovererIds = getFirstDiscovererUserIds(posts);
  discovererIds.forEach((userId) => {
    addBadge(userId, { id: 'first_discoverer', emoji: '🔍', label: '첫 발견자' });
  });

  return {
    userBadges,
    dailyPostId: daily?.id ?? null,
    weeklyPostId: weeklyTop?.id ?? null,
    weeklyPostIds: new Set((rankings?.weekly || []).map((w) => w.id)),
  };
}

function getUserBadges(userId, ctx) {
  if (!userId || !ctx?.userBadges) return [];
  return sortBadges(ctx.userBadges[userId] || []);
}

function getPostBadgeClasses(postId, ctx) {
  if (!ctx || !postId) return '';
  if (postId === ctx.weeklyPostId) return 'post-card--weekly-king';
  if (postId === ctx.dailyPostId) return 'post-card--daily-pick';
  if (ctx.weeklyPostIds?.has(postId)) return 'post-card--weekly-top';
  return '';
}

function getRankCardClasses(item, variant) {
  if (!item) return '';
  if (variant === 'week' && item.rank === 1) return 'rank-card--weekly-king';
  if (variant === 'today') return 'rank-card--daily-pick';
  return '';
}

function renderBadgesHtml(badges, variant) {
  const sorted = sortBadges(badges);
  if (!sorted.length) return '';

  if (variant === 'nav') {
    return sorted
      .map(
        (b) =>
          `<span class="badge badge--${b.id} badge--nav" title="${b.label}">${b.emoji}</span>`
      )
      .join('');
  }

  return `<span class="badge-group">${sorted
    .map(
      (b) =>
        `<span class="badge badge--${b.id}" title="${b.label}">${b.emoji} ${b.label}</span>`
    )
    .join('')}</span>`;
}

function renderRankBadgeHtml(item, variant) {
  if (variant === 'today') {
    return '<span class="badge badge--daily_pick badge--rank">🔥 오늘의 픽</span>';
  }
  if (variant === 'week' && item.rank === 1) {
    return '<span class="badge badge--weekly_king badge--rank">👑 이 주의 유니폼왕</span>';
  }
  return '';
}

let activeBadgeContext = null;

function setBadgeContext(ctx) {
  activeBadgeContext = ctx;
}

function getBadgeContext() {
  return activeBadgeContext;
}
