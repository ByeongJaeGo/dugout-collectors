const CURATED_OWNER_ID = '00000000-0000-4000-8000-000000000099';

/** 관리자가 assets/posts/에 실제 사진을 넣은 뒤 여기에 등록합니다. */
const CURATED_POSTS = [];

function enrichCuratedPost(post) {
  const normalized = normalizePostRecord(post);
  return {
    ...normalized,
    profiles: { nickname: 'Dugout' },
    like_count: 0,
    liked_by: [],
    comments: [],
    comment_count: 0,
    is_curated: true,
  };
}

function getCuratedPosts() {
  return CURATED_POSTS.map(enrichCuratedPost);
}

function mergeCuratedPosts(posts) {
  const seen = new Set(posts.map((p) => p.id));
  const merged = [...posts];
  for (const curated of getCuratedPosts()) {
    if (!seen.has(curated.id)) merged.push(curated);
  }
  return merged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}
