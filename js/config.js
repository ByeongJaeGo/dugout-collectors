/**
 * Supabase 연결 (선택)
 * 값을 넣으면 클라우드 DB 사용, 비워두면 데모 모드(localStorage)로 동작합니다.
 * Dashboard → Project Settings → API
 */
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const STORAGE_BUCKET = 'post-images';

/**
 * 문의 수신 이메일 — FormSubmit으로 전달됩니다.
 * 본인 이메일 주소로 바꾸세요. 최초 1회 FormSubmit 인증 메일을 확인해야 합니다.
 * https://formsubmit.co
 */
const CONTACT_EMAIL = 'gobyjea@gmail.com';

/**
 * Google AdSense — 승인 후 값을 입력하세요.
 * 1) https://www.google.com/adsense 가입
 * 2) 사이트 추가 시 받은 verification 코드 → ADSENSE_VERIFICATION
 * 3) 승인 후 발급된 ca-pub- ID → ADSENSE_CLIENT_ID
 * 4) ads.txt에 pub- ID 등록
 */
const ADSENSE_CLIENT_ID = 'ca-pub-5264814436773700';
const ADSENSE_VERIFICATION = 'ca-pub-5264814436773700';
const SITE_URL = 'https://workspace-chi-one-16.vercel.app';

/**
 * Microsoft Clarity — 행동 분석 (히트맵·세션 녹화)
 * 1) https://clarity.microsoft.com 가입
 * 2) 새 프로젝트 → 사이트 URL 입력
 * 3) 설정 → Setup → Project ID 복사 → 아래에 붙여넣기
 */
const CLARITY_PROJECT_ID = '';