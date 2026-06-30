const LS_CONTACTS = 'dugout_contact_inquiries';

function isContactEmailConfigured() {
  if (typeof CONTACT_EMAIL !== 'string') return false;
  const email = CONTACT_EMAIL.trim();
  if (!email || email.includes('YOUR_CONTACT_EMAIL')) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function saveLocalInquiry(payload) {
  const list = JSON.parse(localStorage.getItem(LS_CONTACTS) || '[]');
  list.unshift({
    id: crypto.randomUUID(),
    ...payload,
    created_at: new Date().toISOString(),
  });
  localStorage.setItem(LS_CONTACTS, JSON.stringify(list.slice(0, 100)));
}

async function submitContactInquiry({ name, email, subject, message }) {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const trimmedSubject = subject.trim();
  const trimmedMessage = message.trim();

  if (trimmedName.length < 2) throw new Error('이름은 2자 이상 입력해 주세요.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    throw new Error('올바른 이메일 주소를 입력해 주세요.');
  }
  if (trimmedSubject.length < 2) throw new Error('제목은 2자 이상 입력해 주세요.');
  if (trimmedMessage.length < 10) throw new Error('문의 내용은 10자 이상 입력해 주세요.');

  const payload = {
    name: trimmedName,
    email: trimmedEmail,
    subject: trimmedSubject,
    message: trimmedMessage,
  };

  if (!isContactEmailConfigured()) {
    saveLocalInquiry(payload);
    throw new Error(
      'js/config.js의 CONTACT_EMAIL에 수신 이메일을 설정해 주세요. (데모: 문의 내용은 브라우저에만 저장됨)'
    );
  }

  const body = {
    name: trimmedName,
    email: trimmedEmail,
    _replyto: trimmedEmail,
    _subject: `[Dugout Collectors] ${trimmedSubject}`,
    message: trimmedMessage,
    subject: trimmedSubject,
    _template: 'table',
    _captcha: 'false',
  };

  const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(CONTACT_EMAIL.trim())}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  let data = {};
  try {
    data = await res.json();
  } catch {
    /* ignore */
  }

  if (!res.ok || data.success === 'false' || data.success === false) {
    saveLocalInquiry(payload);
    const detail = data.message || `HTTP ${res.status}`;
    throw new Error(`문의 전송에 실패했습니다. (${detail})`);
  }

  saveLocalInquiry({ ...payload, sent: true });
  return true;
}

const CONTACT_SUCCESS_MESSAGE =
  '문의가 접수되었습니다. 답변까지 1~2일 소요될 수 있습니다.';
