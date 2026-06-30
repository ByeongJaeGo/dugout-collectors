function formatNotificationMessage(n) {
  const name = n.actor_nickname || '익명';
  if (n.type === 'like') return `${name}님이 ♥ 눌렀어요`;
  if (n.type === 'comment') {
    const preview = n.comment_body ? `: "${n.comment_body}"` : '';
    return `${name}님이 댓글을 남겼어요${preview}`;
  }
  return `${name}님의 활동`;
}

function formatNotificationTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}시간 전`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

async function createNotification(supabase, payload) {
  if (payload.userId === payload.actorId) return null;

  const row = {
    user_id: payload.userId,
    type: payload.type,
    actor_id: payload.actorId,
    actor_nickname: payload.actorNickname,
    post_id: payload.postId,
    post_caption: (payload.postCaption || '').slice(0, 80),
    comment_body: payload.commentBody ? payload.commentBody.slice(0, 100) : null,
    read: false,
  };

  const { data, error } = await supabase
    .from('notifications')
    .insert(row)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function fetchNotifications(supabase, userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data || [];
}

async function markNotificationsRead(supabase, userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) throw new Error(error.message);
}
