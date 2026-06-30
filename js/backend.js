function isSupabaseConfigured() {
  return (
    typeof SUPABASE_URL === 'string' &&
    typeof SUPABASE_ANON_KEY === 'string' &&
    SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
    SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
    SUPABASE_URL.includes('supabase.co')
  );
}

let activeBackend = null;
let supabaseClient = null;
let authUnsubscribe = null;

function createSupabaseBackend() {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  return {
    mode: 'supabase',
    client: supabaseClient,

    init() {
      return supabaseClient.auth.getSession().then(({ data: { session } }) => session?.user ?? null);
    },

    onAuthChange(callback) {
      const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ?? null);
      });
      authUnsubscribe = () => subscription.unsubscribe();
    },

    signUp: (userId, provider, nickname) => signUp(supabaseClient, userId, provider, nickname),
    signIn: (userId, provider) => signIn(supabaseClient, userId, provider),
    signOut: () => signOut(supabaseClient),
    getCurrentProfile: (userId) => {
      if (!userId) return Promise.resolve(null);
      return getCurrentProfile(supabaseClient);
    },
    uploadPost: (userId, files, postFields) => uploadPost(supabaseClient, userId, files, postFields),
    fetchAllPosts: () => fetchAllPosts(supabaseClient),
    fetchMyPosts: (userId) => fetchMyPosts(supabaseClient, userId),
    fetchLikedPosts: (userId) => fetchLikedPosts(supabaseClient, userId),
    fetchRankings: () => fetchRankings(supabaseClient),
    addComment: (postId, userId, body) => addComment(supabaseClient, postId, userId, body),
    toggleLike: (postId, userId, alreadyLiked) =>
      toggleLike(supabaseClient, postId, userId, alreadyLiked),
    createNotification: (payload) => createNotification(supabaseClient, payload),
    fetchNotifications: (userId) => fetchNotifications(supabaseClient, userId),
    markNotificationsRead: (userId) => markNotificationsRead(supabaseClient, userId),
  };
}

function getBackend() {
  if (!activeBackend) {
    activeBackend = isSupabaseConfigured() ? createSupabaseBackend() : localBackend;
  }
  return activeBackend;
}

function getBackendMode() {
  return getBackend().mode;
}

function setModeBanner() {
  const configBanner = document.getElementById('config-banner');
  const demoBanner = document.getElementById('demo-banner');
  const isSupabase = isSupabaseConfigured();

  if (configBanner) configBanner.hidden = true;
  if (demoBanner) demoBanner.hidden = isSupabase;
}
