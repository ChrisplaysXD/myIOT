// wrapper buat fetch ke backend API
// auto-attach credentials + content type
async function apiFetch(url, opts = {}) {
  const defaults = {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' }
  };

  const merged = {
    ...defaults,
    ...opts,
    headers: { ...defaults.headers, ...(opts.headers || {}) }
  };

  // stringify body kalo object
  if (merged.body && typeof merged.body === 'object') {
    merged.body = JSON.stringify(merged.body);
  }

  try {
    const res = await fetch(url, merged);
    const data = await res.json();

    if (!res.ok) {
      throw { status: res.status, message: data.error || 'Request failed', data };
    }

    return data;
  } catch (err) {
    if (err.status) throw err;
    throw { status: 0, message: 'Network error - server might be down' };
  }
}


// escape html buat safety, meskipun kita pake textContent everywhere
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return str.replace(/[&<>"']/g, c => map[c]);
}


// format temperature display
function formatTemp(val) {
  const num = parseFloat(val);
  if (isNaN(num)) return '--°C';
  return num.toFixed(1) + '°C';
}


// relative time
function timeAgo(dateStr) {
  if (!dateStr) return 'never';

  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 5) return 'just now';
  if (diff < 60) return diff + 's ago';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}


// debounce helper
function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
