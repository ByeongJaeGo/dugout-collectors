const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 5;
const MAX_PHOTOS = 10;
const MAX_TAGS = 10;
const MAX_TAG_LEN = 24;

function getPostImages(post) {
  if (Array.isArray(post?.image_urls) && post.image_urls.length > 0) {
    return post.image_urls.filter(Boolean);
  }
  if (post?.image_url) return [post.image_url];
  return [];
}

function normalizePostRecord(post) {
  const image_urls = getPostImages(post);
  return {
    ...post,
    image_urls,
    image_url: image_urls[0] || post?.image_url || '',
  };
}

function toFileList(files) {
  if (!files) return [];
  return Array.from(files);
}

function validateImageFiles(files) {
  const list = toFileList(files);
  if (!list.length) throw new Error('사진을 1장 이상 선택해 주세요.');
  if (list.length > MAX_PHOTOS) {
    throw new Error(`사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있습니다.`);
  }
  for (const file of list) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('JPG, PNG, WEBP, GIF 형식만 업로드할 수 있습니다.');
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new Error(`각 파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다.`);
    }
  }
  return list;
}

async function uploadImageFiles(supabase, userId, files) {
  const list = validateImageFiles(files);
  const urls = [];

  for (let i = 0; i < list.length; i++) {
    const file = list[i];
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${userId}/${Date.now()}-${i}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw new Error(`업로드 실패: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    urls.push(urlData.publicUrl);
  }

  return urls;
}

function parseTagsInput(raw) {
  if (!raw || !String(raw).trim()) return [];

  const parts = String(raw)
    .split(/[,，]+/)
    .flatMap((chunk) => chunk.match(/#?\S+/g) || [])
    .map((t) => t.replace(/^#+/, '').trim())
    .filter((t) => t.length >= 1 && t.length <= MAX_TAG_LEN);

  const seen = new Set();
  const result = [];
  for (const tag of parts) {
    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(tag);
    }
  }
  return result.slice(0, MAX_TAGS);
}

function normalizePostFields({ caption, playerName = '', tags = [] }) {
  const trimmedCaption = String(caption || '').trim();
  const trimmedPlayer = String(playerName || '').trim().slice(0, 40);
  const normalizedTags = Array.isArray(tags) ? tags : parseTagsInput(tags);

  if (!trimmedCaption) throw new Error('설명을 입력해 주세요.');
  if (trimmedPlayer.length > 0 && trimmedPlayer.length < 2) {
    throw new Error('선수 이름은 2자 이상 입력해 주세요.');
  }

  return {
    caption: trimmedCaption,
    player_name: trimmedPlayer,
    tags: normalizedTags,
  };
}

async function uploadPost(supabase, userId, files, postFields) {
  const { caption, player_name, tags } = normalizePostFields(postFields);
  const image_urls = await uploadImageFiles(supabase, userId, files);

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      image_url: image_urls[0],
      image_urls,
      caption,
      player_name,
      tags,
    })
    .select('*, profiles(nickname)')
    .single();

  if (error) throw new Error(error.message);
  return normalizePostRecord(data);
}

async function fetchPostsWithMeta(supabase, postsQuery) {
  const { data: posts, error } = await postsQuery;
  if (error) throw new Error(error.message);
  if (!posts.length) return [];

  const postIds = posts.map((p) => p.id);

  const [{ data: likes, error: likesError }, { data: comments, error: commentsError }] =
    await Promise.all([
      supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
      supabase
        .from('comments')
        .select('*, profiles(nickname)')
        .in('post_id', postIds)
        .order('created_at', { ascending: true }),
    ]);

  if (likesError) throw new Error(likesError.message);
  if (commentsError) throw new Error(commentsError.message);

  return posts.map((post) =>
    attachComments(enrichPost(normalizePostRecord(post), likes), comments || [])
  );
}

async function fetchAllPosts(supabase) {
  const posts = await fetchPostsWithMeta(
    supabase,
    supabase
      .from('posts')
      .select('*, profiles(nickname)')
      .order('created_at', { ascending: false })
  );
  return mergeCuratedPosts(posts);
}

async function fetchMyPosts(supabase, userId) {
  return fetchPostsWithMeta(
    supabase,
    supabase
      .from('posts')
      .select('*, profiles(nickname)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
  );
}

async function fetchLikedPosts(supabase, userId) {
  const { data: likedRows, error } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  if (!likedRows.length) return [];

  const postIds = likedRows.map((l) => l.post_id);

  return fetchPostsWithMeta(
    supabase,
    supabase
      .from('posts')
      .select('*, profiles(nickname)')
      .in('id', postIds)
      .order('created_at', { ascending: false })
  );
}

function enrichPost(post, allLikes) {
  const postLikes = allLikes.filter((l) => l.post_id === post.id);
  return {
    ...post,
    like_count: postLikes.length,
    liked_by: postLikes.map((l) => l.user_id),
  };
}

async function fetchRankings(supabase) {
  const [{ data: posts, error: postsError }, { data: likes, error: likesError }, { data: comments, error: commentsError }] =
    await Promise.all([
      supabase.from('posts').select('*, profiles(nickname)'),
      supabase.from('likes').select('post_id, user_id, created_at'),
      supabase.from('comments').select('post_id, user_id, created_at'),
    ]);

  if (postsError) throw new Error(postsError.message);
  if (likesError) throw new Error(likesError.message);
  if (commentsError) throw new Error(commentsError.message);

  const mergedPosts = mergeCuratedPosts(posts || []);
  const users = [...new Map(
    mergedPosts.map((p) => [p.user_id, { id: p.user_id, nickname: p.profiles?.nickname || '익명' }])
  ).values()];

  return computeRankings(mergedPosts, users, likes || [], comments || []);
}

async function toggleLike(supabase, postId, userId, alreadyLiked) {
  if (alreadyLiked) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
    if (error) throw new Error(error.message);
    return false;
  }

  const { error } = await supabase.from('likes').insert({
    post_id: postId,
    user_id: userId,
  });

  if (error) {
    if (error.code === '23505') return true;
    throw new Error(error.message);
  }
  return true;
}
