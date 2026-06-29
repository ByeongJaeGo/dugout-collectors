const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_MB = 5;

async function uploadPost(supabase, userId, file, caption) {
  if (!file) throw new Error('사진을 선택해 주세요.');
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('JPG, PNG, WEBP, GIF 형식만 업로드할 수 있습니다.');
  }
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`파일 크기는 ${MAX_SIZE_MB}MB 이하여야 합니다.`);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (uploadError) throw new Error(`업로드 실패: ${uploadError.message}`);

  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      image_url: urlData.publicUrl,
      caption: caption.trim(),
    })
    .select('*, profiles(nickname)')
    .single();

  if (error) throw new Error(error.message);
  return data;
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
    attachComments(enrichPost(post, likes), comments || [])
  );
}

async function fetchAllPosts(supabase) {
  return fetchPostsWithMeta(
    supabase,
    supabase
      .from('posts')
      .select('*, profiles(nickname)')
      .order('created_at', { ascending: false })
  );
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
