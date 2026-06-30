const LIKE_POINTS = 3;
const COMMENT_POINTS = 2;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - daysFromMonday);
  return d;
}

function isSince(isoDate, since) {
  if (!isoDate) return false;
  return new Date(isoDate) >= since;
}

function getEngagementForPost(postId, likes, comments, since) {
  const periodLikes = likes.filter(
    (l) => l.post_id === postId && isSince(l.created_at, since)
  );
  const periodComments = comments.filter(
    (c) => c.post_id === postId && isSince(c.created_at, since)
  );
  const uniqueLikers = new Set(periodLikes.map((l) => l.user_id)).size;
  const uniqueCommenters = new Set(periodComments.map((c) => c.user_id)).size;
  const score = uniqueLikers * LIKE_POINTS + uniqueCommenters * COMMENT_POINTS;
  return { uniqueLikers, uniqueCommenters, score };
}

function rankPosts(posts, users, likes, comments, since, limit) {
  return posts
    .map((post) => {
      const user = users.find((u) => u.id === post.user_id);
      const nickname = post.profiles?.nickname || user?.nickname || '익명';
      const eng = getEngagementForPost(post.id, likes, comments, since);
      return {
        id: post.id,
        user_id: post.user_id,
        image_url: getPostImages(post)[0] || post.image_url,
        caption: post.caption,
        profiles: { nickname },
        ...eng,
      };
    })
    .filter((p) => p.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const totalA = a.uniqueLikers + a.uniqueCommenters;
      const totalB = b.uniqueLikers + b.uniqueCommenters;
      if (totalB !== totalA) return totalB - totalA;
      return 0;
    })
    .slice(0, limit)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

function computeRankings(posts, users, likes, comments) {
  return {
    daily: rankPosts(posts, users, likes, comments, startOfToday(), 1),
    weekly: rankPosts(posts, users, likes, comments, startOfWeek(), 3),
  };
}
