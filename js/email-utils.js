const EMAIL_PROVIDERS = [
  { value: 'gmail.com', label: 'Gmail' },
  { value: 'naver.com', label: '네이버' },
  { value: 'daum.net', label: '다음' },
  { value: 'kakao.com', label: '카카오' },
];

const DEFAULT_PROVIDER = 'naver.com';

function normalizeProvider(provider) {
  const found = EMAIL_PROVIDERS.find((p) => p.value === provider);
  return found ? found.value : DEFAULT_PROVIDER;
}

function parseUserIdToEmail(input, provider) {
  const raw = input.trim();
  if (!raw) throw new Error('이메일 앞부분을 입력하세요.');

  let local = raw.includes('@') ? raw.split('@')[0].trim() : raw;
  local = local.toLowerCase();

  const ascii = local.replace(/[^a-z0-9._-]/g, '');
  const safe = ascii.length >= 2 ? ascii : encodeLocalPart(local);

  if (safe.length < 2) throw new Error('이메일은 2자 이상이어야 합니다.');

  const domain = normalizeProvider(provider);
  return `${safe}@${domain}`;
}

function encodeLocalPart(str) {
  const bytes = new TextEncoder().encode(str.trim().toLowerCase());
  const b64 = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `u_${b64.slice(0, 28)}`;
}

/** Supabase용 — 사용자에게는 노출하지 않음 */
function autoPassword(email) {
  const local = email.split('@')[0];
  return `dg_${local}_auto!9`;
}

function saveLastProvider(provider) {
  localStorage.setItem('dugout_last_provider', normalizeProvider(provider));
}

function getLastProvider() {
  return localStorage.getItem('dugout_last_provider') || DEFAULT_PROVIDER;
}

function applyProviderDefaults() {
  const provider = getLastProvider();
  document.querySelectorAll('select[name="provider"]').forEach((el) => {
    el.value = provider;
  });
}

function providerSelectHtml(id) {
  const options = EMAIL_PROVIDERS.map(
    (p) => `<option value="${p.value}">${p.label}</option>`
  ).join('');
  return `<select id="${id}" name="provider" class="input-provider" aria-label="메일 종류">${options}</select>`;
}
