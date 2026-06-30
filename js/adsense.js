function isAdsenseConfigured() {
  return (
    typeof ADSENSE_CLIENT_ID === 'string' &&
    ADSENSE_CLIENT_ID.startsWith('ca-pub-') &&
    !ADSENSE_CLIENT_ID.includes('YOUR_')
  );
}

function hasCookieConsent() {
  return localStorage.getItem('dugout_cookie_consent') === 'accepted';
}

function loadAdsenseScript() {
  if (!isAdsenseConfigured() || !hasCookieConsent()) return;
  if (document.querySelector('script[data-adsense-client]')) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
  script.crossOrigin = 'anonymous';
  script.dataset.adsenseClient = 'true';
  document.head.appendChild(script);
}

function injectAdsenseVerification() {
  if (typeof ADSENSE_VERIFICATION !== 'string' || !ADSENSE_VERIFICATION.trim()) return;
  if (document.querySelector('meta[name="google-adsense-account"]')) return;

  const meta = document.createElement('meta');
  meta.name = 'google-adsense-account';
  meta.content = ADSENSE_VERIFICATION.trim();
  document.head.appendChild(meta);
}

function initCookieConsent() {
  injectAdsenseVerification();

  const banner = document.getElementById('cookie-consent');
  if (!banner) {
    loadAdsenseScript();
    return;
  }

  if (hasCookieConsent()) {
    banner.hidden = true;
    loadAdsenseScript();
    return;
  }

  banner.hidden = false;
  document.getElementById('cookie-accept')?.addEventListener('click', () => {
    localStorage.setItem('dugout_cookie_consent', 'accepted');
    banner.hidden = true;
    loadAdsenseScript();
  });
}

function initProductionUi() {
  const host = window.location.hostname;
  if (host !== 'localhost' && !host.startsWith('127.')) {
    document.getElementById('demo-banner')?.setAttribute('hidden', '');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initProductionUi();
  initCookieConsent();
});
