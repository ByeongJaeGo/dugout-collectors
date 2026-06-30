#!/usr/bin/env node
/**
 * 네이버 서치어드바이저 소유 확인 meta 태그 적용 + 배포 전 점검
 * 사용: npm run naver:verify -- YOUR_VERIFICATION_CODE
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SITE_URL = 'https://workspace-chi-one-16.vercel.app';
const code = process.argv[2]?.trim();

function readSiteUrl() {
  const configPath = path.join(ROOT, 'js', 'config.js');
  const src = fs.readFileSync(configPath, 'utf8');
  const m = src.match(/const SITE_URL = '([^']+)'/);
  return m ? m[1] : SITE_URL;
}

async function checkUrl(url, label) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const ok = res.ok;
    console.log(`${ok ? '✓' : '✗'} ${label}: ${url} (${res.status})`);
    return ok;
  } catch (e) {
    console.log(`✗ ${label}: ${url} (${e.message})`);
    return false;
  }
}

function applyVerification(verificationCode) {
  const indexPath = path.join(ROOT, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  const meta = `<meta name="naver-site-verification" content="${verificationCode}" />`;
  const block = `<!-- NAVER_VERIFICATION_START -->\n  ${meta}\n  <!-- NAVER_VERIFICATION_END -->`;

  if (!html.includes('NAVER_VERIFICATION_START')) {
    console.error('index.html에 NAVER_VERIFICATION 마커가 없습니다.');
    process.exit(1);
  }

  html = html.replace(
    /<!-- NAVER_VERIFICATION_START -->[\s\S]*?<!-- NAVER_VERIFICATION_END -->/,
    block
  );
  fs.writeFileSync(indexPath, html, 'utf8');

  const configPath = path.join(ROOT, 'js', 'config.js');
  let config = fs.readFileSync(configPath, 'utf8');
  config = config.replace(
    /const NAVER_SITE_VERIFICATION = '[^']*';/,
    `const NAVER_SITE_VERIFICATION = '${verificationCode}';`
  );
  fs.writeFileSync(configPath, config, 'utf8');

  console.log('\n✓ 네이버 소유 확인 meta 태그를 index.html에 적용했습니다.');
  console.log('  다음: git push → Vercel 배포 → 서치어드바이저에서 [소유 확인] 클릭');
}

async function main() {
  const siteUrl = readSiteUrl();
  console.log(`\n=== Dugout Collectors · 네이버 SEO 점검 ===\n사이트: ${siteUrl}\n`);

  await checkUrl(`${siteUrl}/robots.txt`, 'robots.txt');
  await checkUrl(`${siteUrl}/sitemap.xml`, 'sitemap.xml');
  await checkUrl(siteUrl, '홈');

  if (!code) {
    console.log(`
--- 네이버 서치어드바이저 등록 (본인 로그인 필요) ---

1. https://searchadvisor.naver.com/ 접속 → 네이버 로그인
2. [웹마스터 도구] → [사이트 등록] → URL 입력:
   ${siteUrl}
3. [HTML meta 태그] 방식 선택 → content 코드 복사
4. 터미널에서 실행:
   npm run naver:verify -- 붙여넣은코드
5. 변경사항 배포(Vercel) 후 서치어드바이저 [소유 확인]
6. [요청] → [사이트맵 제출]:
   ${siteUrl}/sitemap.xml
7. [요청] → [URL 수집] → 홈 URL:
   ${siteUrl}/

색인 후 기대 검색어: Dugout Collectors, 덕아웃 컬렉터스, 야구 유니폼 도감, KBO MLB 희귀 유니폼 커뮤니티
`);
    return;
  }

  applyVerification(code);
}

main();
