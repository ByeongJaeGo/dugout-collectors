function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isToday(iso) {
  if (!iso) return false;
  return new Date(iso) >= startOfToday();
}

function buildTeamRegistry(posts) {
  const playerCounts = {};
  const firstDiscovererByKey = {};
  const firstDiscovererPostId = {};
  const todayPlayerCounts = {};
  const todayTeamCounts = {};

  const sorted = [...(posts || [])].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );

  sorted.forEach((post) => {
    const key = playerTeamKey(post.team, post.player_name);
    if (!key) return;

    playerCounts[key] = (playerCounts[key] || 0) + 1;

    if (!firstDiscovererByKey[key]) {
      firstDiscovererByKey[key] = post.user_id;
      firstDiscovererPostId[key] = post.id;
    }

    if (isToday(post.created_at)) {
      todayPlayerCounts[key] = (todayPlayerCounts[key] || 0) + 1;
      todayTeamCounts[post.team] = (todayTeamCounts[post.team] || 0) + 1;
    }
  });

  return {
    playerCounts,
    firstDiscovererByKey,
    firstDiscovererPostId,
    todayPlayerCounts,
    todayTeamCounts,
  };
}

function enrichPostsWithTeamStats(posts) {
  const registry = buildTeamRegistry(posts);
  const playerCounts = Object.values(registry.playerCounts);
  const minUniformCount = playerCounts.length ? Math.min(...playerCounts) : null;

  return (posts || []).map((post) => {
    const key = playerTeamKey(post.team, post.player_name);
    if (!key) {
      return {
        ...post,
        uniform_count: 1,
        is_first_discoverer: false,
        is_rare_item: false,
      };
    }

    const uniformCount = registry.playerCounts[key] || 1;

    return {
      ...post,
      uniform_count: uniformCount,
      is_first_discoverer: registry.firstDiscovererPostId[key] === post.id,
      is_rare_item: minUniformCount !== null && uniformCount === minUniformCount,
    };
  });
}

function willBeFirstDiscoverer(posts, teamId, playerName) {
  const key = playerTeamKey(teamId, playerName);
  if (!key) return false;
  return !(posts || []).some((p) => playerTeamKey(p.team, p.player_name) === key);
}

function computeTodayRegRankings(posts) {
  const registry = buildTeamRegistry(posts);
  const postById = new Map((posts || []).map((p) => [p.id, p]));

  const players = Object.entries(registry.todayPlayerCounts)
    .map(([key, count]) => {
      const [teamId, playerKey] = key.split('::');
      const sample = (posts || []).find(
        (p) => playerTeamKey(p.team, p.player_name) === key
      );
      return {
        key,
        count,
        teamId,
        playerName: sample?.player_name || playerKey,
        teamName: getTeamName(teamId),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const teams = Object.entries(registry.todayTeamCounts)
    .map(([teamId, count]) => ({
      teamId,
      teamName: getTeamName(teamId),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { players, teams, registry };
}

function getFirstDiscovererUserIds(posts) {
  const registry = buildTeamRegistry(posts);
  return new Set(Object.values(registry.firstDiscovererByKey));
}
