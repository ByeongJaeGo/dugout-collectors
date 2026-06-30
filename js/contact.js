const LS_CONTACTS = 'dugout_contact_inquiries';
const LS_INQUIRIES = 'dugout_inquiry_board';
const LS_USERS_KEY = 'dugout_users';

function isContactEmailConfigured() {
  if (typeof CONTACT_EMAIL !== 'string') return false;
  const email = CONTACT_EMAIL.trim();
  if (!email || email.includes('YOUR_CONTACT_EMAIL')) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function readInquiries() {
  try {
    return JSON.parse(localStorage.getItem(LS_INQUIRIES) || '[]');
  } catch {
    return [];
  }
}

function writeInquiries(list) {
  localStorage.setItem(LS_INQUIRIES, JSON.stringify(list));
}

function getInquiryUsers() {
  try {
    return JSON.parse(localStorage.getItem(LS_USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

function normalizeInquiryFields({ title, body }) {
  const trimmedTitle = String(title || '').trim();
  const trimmedBody = String(body || '').trim();

  if (trimmedTitle.length < 2) throw new Error('제목은 2자 이상 입력해 주세요.');
  if (trimmedBody.length < 10) throw new Error('내용은 10자 이상 입력해 주세요.');

  return {
    title: trimmedTitle.slice(0, 80),
    body: trimmedBody.slice(0, 2000),
  };
}

function enrichInquiryPost(post, users) {
  const user = users.find((u) => u.id === post.user_id);
  return {
    ...post,
    profiles: { nickname: user?.nickname || '익명' },
  };
}

function fetchInquiryPosts() {
  const users = getInquiryUsers();
  return readInquiries()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((post) => enrichInquiryPost(post, users));
}

function createInquiryPost(userId, fields, notifyMeta = null) {
  if (!userId) throw new Error('로그인 후 문의를 작성할 수 있습니다.');

  const { title, body } = normalizeInquiryFields(fields);
  const post = {
    id: crypto.randomUUID(),
    user_id: userId,
    title,
    body,
    created_at: new Date().toISOString(),
  };

  const list = readInquiries();
  list.unshift(post);
  writeInquiries(list.slice(0, 200));

  if (notifyMeta?.name && notifyMeta?.email) {
    submitContactInquiry({
      name: notifyMeta.name,
      email: notifyMeta.email,
      subject: title,
      message: body,
    }).catch(() => {});
  }

  return enrichInquiryPost(post, getInquiryUsers());
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
    return true;
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
  '문의가 등록되었습니다. 답변까지 1~2일 소요될 수 있습니다.';
