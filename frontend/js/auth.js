// auth form logic
let isLoginMode = true;
let authInitialized = false;

// dipanggil dari app.js buat set mode sebelum initAuth
function setAuthMode(loginMode) {
  isLoginMode = loginMode;
}

function initAuth() {
  const form = document.getElementById('auth-form');
  const toggleBtn = document.getElementById('auth-toggle');
  const errorEl = document.getElementById('auth-error');
  const submitBtn = document.getElementById('auth-submit');
  const formTitle = document.getElementById('auth-title');
  const usernameGroup = document.getElementById('username-group');

  // reset error
  errorEl.textContent = '';
  errorEl.classList.remove('visible');

  // set tampilan sesuai mode
  updateAuthUI();

  // hapus listener lama biar ga numpuk
  if (!authInitialized) {
    toggleBtn.addEventListener('click', () => {
      isLoginMode = !isLoginMode;
      errorEl.textContent = '';
      errorEl.classList.remove('visible');
      updateAuthUI();
    });

    form.addEventListener('submit', handleAuthSubmit);
    authInitialized = true;
  }
}


function updateAuthUI() {
  const formTitle = document.getElementById('auth-title');
  const submitBtn = document.getElementById('auth-submit');
  const toggleBtn = document.getElementById('auth-toggle');
  const usernameGroup = document.getElementById('username-group');

  if (isLoginMode) {
    formTitle.textContent = 'LOGIN';
    submitBtn.textContent = 'LOGIN';
    toggleBtn.textContent = "Don't have an account? Sign Up";
    usernameGroup.style.display = 'none';
  } else {
    formTitle.textContent = 'SIGN UP';
    submitBtn.textContent = 'CREATE ACCOUNT';
    toggleBtn.textContent = 'Already have an account? Login';
    usernameGroup.style.display = 'block';
  }
}


async function handleAuthSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('auth-submit');
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const username = document.getElementById('auth-username')?.value.trim();

  if (!email || !password) {
    showAuthError('Fill in all fields');
    return;
  }
  if (!isLoginMode && (!username || username.length < 3)) {
    showAuthError('Username needs at least 3 characters');
    return;
  }
  if (password.length < 8) {
    showAuthError('Password must be 8+ characters');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'PROCESSING...';

  try {
    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/signup';
    const body = isLoginMode
      ? { email, password }
      : { username, email, password };

    const data = await apiFetch(endpoint, {
      method: 'POST',
      body
    });

    if (window.onAuthSuccess) {
      window.onAuthSuccess(data.user);
    }
  } catch (err) {
    showAuthError(err.message || 'Something went wrong');

    submitBtn.disabled = false;
    submitBtn.textContent = isLoginMode ? 'LOGIN' : 'CREATE ACCOUNT';
  }
}


function showAuthError(msg) {
  const errorEl = document.getElementById('auth-error');
  errorEl.textContent = msg;
  errorEl.classList.add('visible');

  errorEl.classList.remove('shake');
  void errorEl.offsetWidth;
  errorEl.classList.add('shake');
}
