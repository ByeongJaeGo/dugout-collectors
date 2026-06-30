const KBO_TEAMS = [
  { id: 'kia', name: 'KIA 타이거즈', short: 'KIA' },
  { id: 'samsung', name: '삼성 라이온즈', short: '삼성' },
  { id: 'lg', name: 'LG 트윈스', short: 'LG' },
  { id: 'doosan', name: '두산 베어스', short: '두산' },
  { id: 'kt', name: 'KT 위즈', short: 'KT' },
  { id: 'ssg', name: 'SSG 랜더스', short: 'SSG' },
  { id: 'lotte', name: '롯데 자이언츠', short: '롯데' },
  { id: 'hanwha', name: '한화 이글스', short: '한화' },
  { id: 'nc', name: 'NC 다이노스', short: 'NC' },
  { id: 'kiwoom', name: '키움 히어로즈', short: '키움' },
];

const LEAGUE_TEAMS = [
  { id: 'mlb', name: 'MLB', short: 'MLB' },
  { id: 'npb', name: 'NPB', short: 'NPB' },
];

const OTHER_TEAMS = LEAGUE_TEAMS;

const ALL_TEAMS = [...KBO_TEAMS, ...OTHER_TEAMS];

function normalizePlayerKey(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase();
}

function playerTeamKey(teamId, playerName) {
  const team = normalizeTeamId(teamId);
  const player = normalizePlayerKey(playerName);
  if (!team || !player) return '';
  return `${team}::${player}`;
}

function normalizeTeamId(teamId) {
  const id = String(teamId || '').trim().toLowerCase();
  if (!id) return '';
  return ALL_TEAMS.some((t) => t.id === id) ? id : '';
}

function getTeamById(teamId) {
  return ALL_TEAMS.find((t) => t.id === normalizeTeamId(teamId)) || null;
}

function getTeamName(teamId) {
  return getTeamById(teamId)?.name || '';
}

function renderTeamSelectOptions(selectedId) {
  const selected = normalizeTeamId(selectedId);
  const kboOptions = KBO_TEAMS.map(
    (team) =>
      `<option value="${team.id}"${selected === team.id ? ' selected' : ''}>${team.name}</option>`
  ).join('');
  const otherOptions = OTHER_TEAMS.map(
    (team) =>
      `<option value="${team.id}"${selected === team.id ? ' selected' : ''}>${team.name}</option>`
  ).join('');
  return `<optgroup label="KBO">${kboOptions}</optgroup><optgroup label="MLB · NPB">${otherOptions}</optgroup>`;
}

function getTeamShortName(teamId) {
  const team = getTeamById(teamId);
  return team?.short || team?.name || '';
}

function renderTeamCategoryBar(activeId) {
  const bar = document.getElementById('team-category-bar');
  if (!bar) return;

  const selected = normalizeTeamId(activeId);
  const chip = (id, label, extraClass = '') => {
    const isActive = id ? selected === id : !selected;
    return `<button type="button" class="team-chip${extraClass}${isActive ? ' is-active' : ''}" data-team="${id}">${escapeHtml(label)}</button>`;
  };

  const kboChips = KBO_TEAMS.map((t) => chip(t.id, t.short)).join('');
  const leagueChips = LEAGUE_TEAMS.map((t) =>
    chip(t.id, t.short, ' team-chip--league')
  ).join('');

  bar.innerHTML = `
    <div class="team-category-bar__scroll" role="tablist" aria-label="팀 카테고리">
      ${chip('', '전체')}
      ${kboChips}
      <span class="team-category-bar__sep" aria-hidden="true"></span>
      ${leagueChips}
    </div>
  `;
}

function inferTeamForPost(post) {
  const existing = normalizeTeamId(post?.team);
  if (existing) return existing;

  const player = normalizePlayerKey(post?.player_name);
  const legacyByPlayer = {
    박찬호: 'lg',
    이종범: 'lg',
    오타니: 'mlb',
    야마모토요시노부: 'mlb',
    다르비슈유: 'mlb',
    채은성: 'hanwha',
    제러드호잉: 'hanwha',
  };

  for (const [name, teamId] of Object.entries(legacyByPlayer)) {
    if (normalizePlayerKey(name) === player) return teamId;
  }

  const tagText = (post?.tags || []).join(' ').toLowerCase();
  if (/npb|일본리그|일본야구/i.test(tagText)) return 'npb';
  if (/mlb|에인절스|dodgers|padres|yankees/i.test(tagText)) return 'mlb';

  for (const team of KBO_TEAMS) {
    const short = team.name.replace(/\s/g, '').toLowerCase();
    if (tagText.includes(team.id) || tagText.includes(short)) return team.id;
  }

  return '';
}
