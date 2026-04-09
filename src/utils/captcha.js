const crypto = require('crypto');

const store = new Map();
const TTL_MS = 5 * 60 * 1000;

function sweep() {
  const now = Date.now();
  for (const [id, v] of store.entries()) {
    if (v.expires < now) store.delete(id);
  }
}

function generate() {
  sweep();
  const a = Math.floor(Math.random() * 12) + 1;
  const b = Math.floor(Math.random() * 12) + 1;
  const answer = a + b;
  const captchaId = crypto.randomBytes(16).toString('hex');
  store.set(captchaId, { answer, expires: Date.now() + TTL_MS });
  return {
    captchaId,
    question: `${a} + ${b}`,
  };
}

function verify(captchaId, captchaAnswer) {
  if (!captchaId || captchaAnswer === undefined || captchaAnswer === null) {
    return { ok: false, message: 'Captcha is required' };
  }
  sweep();
  const entry = store.get(String(captchaId));
  if (!entry) {
    return { ok: false, message: 'Invalid or expired captcha. Please refresh.' };
  }
  if (Date.now() > entry.expires) {
    store.delete(captchaId);
    return { ok: false, message: 'Captcha expired. Please refresh.' };
  }
  const n = parseInt(String(captchaAnswer).trim(), 10);
  if (Number.isNaN(n) || n !== entry.answer) {
    return { ok: false, message: 'Incorrect captcha answer' };
  }
  store.delete(captchaId);
  return { ok: true };
}

module.exports = { generate, verify };
