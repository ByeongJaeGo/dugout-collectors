function isClarityConfigured() {
  return (
    typeof CLARITY_PROJECT_ID === 'string' &&
    CLARITY_PROJECT_ID.trim().length > 0 &&
    !CLARITY_PROJECT_ID.includes('YOUR_')
  );
}

function hasAnalyticsConsent() {
  return localStorage.getItem('dugout_cookie_consent') === 'accepted';
}

function loadClarity() {
  if (!isClarityConfigured() || !hasAnalyticsConsent()) return;
  if (window.clarity || document.querySelector('script[data-clarity]')) return;

  (function (c, l, a, r, i, t, y) {
    c[a] =
      c[a] ||
      function () {
        (c[a].q = c[a].q || []).push(arguments);
      };
    t = l.createElement(r);
    t.async = 1;
    t.src = 'https://www.clarity.ms/tag/' + i;
    t.dataset.clarity = 'true';
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', CLARITY_PROJECT_ID.trim());
}

document.addEventListener('DOMContentLoaded', loadClarity);
