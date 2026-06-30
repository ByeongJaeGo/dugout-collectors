const CURATED_OWNER_ID = '00000000-0000-4000-8000-000000000099';

const CURATED_POSTS = [
  {
    id: 'curated-hoying-2018',
    user_id: CURATED_OWNER_ID,
    image_urls: ['/assets/posts/hoying-2018.jpg'],
    image_url: '/assets/posts/hoying-2018.jpg',
    caption: '2018 시즌 유니폼',
    player_name: '제러드 호잉',
    tags: ['KBO', '한화', '2018', '사인'],
    created_at: '2026-06-30T12:00:00.000Z',
  },
  {
    id: 'curated-yamamoto-mvp',
    user_id: CURATED_OWNER_ID,
    image_urls: ['/assets/posts/yamamoto-back.jpg', '/assets/posts/yamamoto-front.jpg'],
    image_url: '/assets/posts/yamamoto-back.jpg',
    caption: '2025 mvp시즌 유니폼',
    player_name: '야마모토 요시노부',
    tags: ['MLB', '다저스', 'MVP', '2025'],
    created_at: '2025-12-15T09:00:00.000Z',
  },
];

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
