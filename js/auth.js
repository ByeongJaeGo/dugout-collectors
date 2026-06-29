async function ensureProfile(supabase, user, nickname) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, nickname')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) return existing;

  const fallbackNickname =
    nickname ||
    user.user_metadata?.nickname ||
    user.email?.split('@')[0] ||
    '회원';

  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: user.id, nickname: fallbackNickname })
    .select('id, nickname')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { id: user.id, nickname: fallbackNickname };
    }
    throw new Error(`프로필 생성 실패: ${error.message}`);
  }
  return data;
}

async function signUp(supabase, userId, provider, nickname) {
  const email = parseUserIdToEmail(userId, provider);
  const password = autoPassword(email);
  const trimmedNickname = nickname.trim();

  if (trimmedNickname.length < 2) {
    throw new Error('닉네임은 2자 이상이어야 합니다.');
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nickname: trimmedNickname } },
  });

  if (authError) {
    if (authError.message.includes('already registered')) {
      throw new Error('이미 사용 중인 아이디입니다.');
    }
    throw new Error(authError.message);
  }

  if (!authData.user) {
    throw new Error('회원가입에 실패했습니다.');
  }

  await ensureProfile(supabase, authData.user, trimmedNickname);

  if (!authData.session) {
    throw new Error(
      '가입은 완료됐지만 이메일 확인이 필요합니다. Supabase에서 Confirm email을 끄세요.'
    );
  }

  return authData.user;
}

async function signIn(supabase, userId, provider) {
  const email = parseUserIdToEmail(userId, provider);
  const password = autoPassword(email);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('가입되지 않은 아이디입니다. 먼저 회원가입해 주세요.');
    }
    throw new Error(error.message);
  }

  await ensureProfile(supabase, data.user);
  return data.user;
}

async function signOut(supabase) {
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
}

async function getCurrentProfile(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nickname')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) {
    return ensureProfile(supabase, user);
  }
  return data;
}
