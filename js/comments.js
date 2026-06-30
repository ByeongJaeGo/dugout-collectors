const MAX_COMMENT_LEN = 200;

async function addComment(supabase, postId, userId, body, parentId = null) {
  const text = body.trim();
  if (!text) throw new Error('댓글을 입력하세요.');
  if (text.length > MAX_COMMENT_LEN) {
    throw new Error(`댓글은 ${MAX_COMMENT_LEN}자 이내입니다.`);
  }

  if (parentId) {
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (postError) throw new Error(postError.message);
    if (post.user_id !== userId) {
      throw new Error('게시자만 대댓글을 달 수 있습니다.');
    }

    const { data: parent, error: parentError } = await supabase
      .from('comments')
      .select('id, post_id, parent_id')
      .eq('id', parentId)
      .single();

    if (parentError || parent.post_id !== postId || parent.parent_id) {
      throw new Error('답글을 달 댓글을 찾을 수 없습니다.');
    }
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: userId,
      body: text,
      parent_id: parentId || null,
    })
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

function normalizeCommentRecord(comment, usersById) {
  const profile =
    comment.profiles ||
    (usersById && comment.user_id
      ? { nickname: usersById.get(comment.user_id)?.nickname || '익명' }
      : { nickname: '익명' });

  return {
    id: comment.id,
    post_id: comment.post_id,
    parent_id: comment.parent_id || null,
    body: comment.body,
    created_at: comment.created_at,
    user_id: comment.user_id,
    profiles: profile,
  };
}

function attachComments(post, allComments, usersById) {
  const comments = allComments
    .filter((c) => c.post_id === post.id)
    .map((c) => normalizeCommentRecord(c, usersById));

  return { ...post, comments, comment_count: comments.length };
}
