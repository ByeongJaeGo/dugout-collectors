const MAX_COMMENT_LEN = 200;

async function addComment(supabase, postId, userId, body) {
  const text = body.trim();
  if (!text) throw new Error('댓글을 입력하세요.');
  if (text.length > MAX_COMMENT_LEN) {
    throw new Error(`댓글은 ${MAX_COMMENT_LEN}자 이내입니다.`);
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: userId, body: text })
    .select('*, profiles(nickname)')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function fetchAllComments(supabase) {
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(nickname)')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data;
}

function attachComments(post, allComments) {
  const comments = allComments
    .filter((c) => c.post_id === post.id)
    .map((c) => ({
      id: c.id,
      body: c.body,
      created_at: c.created_at,
      user_id: c.user_id,
      profiles: c.profiles || { nickname: '익명' },
    }));
  return { ...post, comments, comment_count: comments.length };
}
