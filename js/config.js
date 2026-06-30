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