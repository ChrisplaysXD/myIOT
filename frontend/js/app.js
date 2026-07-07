// MPA controller
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  
  // Bind Home specific buttons
  if (window.location.pathname === '/') {
    setupHomeButtons();
  }
  
  // Bind Auth specific buttons
  if (window.location.pathname === '/auth') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'signup') {
      setAuthMode(false);
    } else {
      setAuthMode(true);
    }
    if (typeof initAuth === 'function') initAuth();
  }
});

window.onAuthSuccess = function(user) {
  currentUser = user;
  checkUserConfig(user);
};

async function checkSession() {
  const path = window.location.pathname;
  try {
    const data = await apiFetch('/api/auth/me');
    currentUser = data.user;
    
    // On Home, update nav actions if logged in
    if (path === '/') {
      const navActions = document.getElementById('home-nav-actions');
      if (navActions) {
        navActions.innerHTML = `<button class="nav-btn nav-btn-fill" id="hero-go-dash">Go to Dashboard ➔</button>`;
      }
      return;
    }

    // On Auth, redirect away since already logged in
    if (path === '/auth') {
      checkUserConfig(data.user);
      return;
    }
    
    // On protected pages
    if (path === '/admin') {
      if (currentUser.role !== 'admin') window.location.href = '/';
      else {
        initAdminPanel();
        // The admin.html does not have a user-name element in the header-right (wait, let's check. Ah, admin.html doesn't have updateUserInfo elements except maybe nav-admin-btn, but let's call it anyway to be safe)
      }
    } else if (path === '/dashboard') {
      const viewingUserId = sessionStorage.getItem('viewingUserId');
      if (viewingUserId && currentUser.role === 'admin') {
        // Impersonation mode
        const users = await apiFetch('/api/admin/users');
        const target = users.find(u => u._id === viewingUserId);
        if (target) {
          initDashboard({
            channelId: target.thingspeak.channelId,
            readApiKey: target.thingspeak.readApiKey,
            tokenBalance: target.tokenBalance,
            thresholds: target.thresholds
          });
          window.viewingUserId = viewingUserId;
          updateUserInfo(target);
          return;
        }
      }
      
      // Normal dashboard mode
      if (!currentUser.thingspeak?.channelId) {
        window.location.href = '/config';
      } else {
        initDashboard({
          channelId: currentUser.thingspeak.channelId,
          readApiKey: currentUser.thingspeak.readApiKey,
          tokenBalance: currentUser.tokenBalance,
          thresholds: currentUser.thresholds
        });
        updateUserInfo(currentUser);
      }
    } else if (path === '/config') {
      initConfigForm();
    }
  } catch (err) {
    // No session
    if (path !== '/' && path !== '/auth') {
      window.location.href = '/auth';
    }
  }
}

function checkUserConfig(user) {
  if (user.role === 'admin') {
    window.location.href = '/admin';
    return;
  }
  if (user.thingspeak && user.thingspeak.channelId && user.thingspeak.readApiKey) {
    window.location.href = '/dashboard';
  } else {
    window.location.href = '/config';
  }
}

// Stub for older code
function showView(name) {
  if (name === 'home') window.location.href = '/';
  else window.location.href = '/' + name;
}

function setupHomeButtons() {
  document.getElementById('hero-learn-more')?.addEventListener('click', () => {
    document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
  });
}

function initConfigForm() {
  document.getElementById('tab-thingspeak').onclick = function() {
    this.classList.add('active');
    document.getElementById('tab-thresholds').classList.remove('active');
    document.getElementById('config-form').classList.remove('hidden');
    document.getElementById('threshold-form').classList.add('hidden');
  };
  
  document.getElementById('tab-thresholds').onclick = function() {
    this.classList.add('active');
    document.getElementById('tab-thingspeak').classList.remove('active');
    document.getElementById('threshold-form').classList.remove('hidden');
    document.getElementById('config-form').classList.add('hidden');
  };

  const errorEl = document.getElementById('config-error');

  if (currentUser && currentUser.thingspeak) {
    const chInput = document.getElementById('config-channel');
    const keyInput = document.getElementById('config-apikey');
    if (chInput && currentUser.thingspeak.channelId) chInput.value = currentUser.thingspeak.channelId;
    if (keyInput && currentUser.thingspeak.readApiKey) keyInput.value = currentUser.thingspeak.readApiKey;
  }

  if (currentUser && currentUser.thresholds) {
    document.getElementById('thresh-temp-warn').value = currentUser.thresholds.tempWarning;
    document.getElementById('thresh-temp-alert').value = currentUser.thresholds.tempAlert;
    document.getElementById('thresh-air-warn').value = currentUser.thresholds.airWarning;
    document.getElementById('thresh-air-alert').value = currentUser.thresholds.airAlert;
  }

  const tsForm = document.getElementById('config-form');
  const newTsForm = tsForm.cloneNode(true);
  tsForm.parentNode.replaceChild(newTsForm, tsForm);

  // Bind buttons after cloning
  document.getElementById('config-cancel-btn').onclick = () => {
    if (currentUser && currentUser.thingspeak?.channelId) {
      window.location.href = '/dashboard';
    } else {
      window.location.href = '/';
    }
  };

  const skipBtn = document.getElementById('config-skip-btn');
  if (skipBtn) {
    skipBtn.onclick = async () => {
      try {
        await apiFetch('/api/config', { method: 'PUT', body: { channelId: '0', readApiKey: 'skip' } });
        window.location.href = '/dashboard';
      } catch (err) {
        const errorEl = document.getElementById('config-error');
        if (errorEl) {
          errorEl.textContent = err.message;
          errorEl.classList.add('visible');
        }
      }
    };
  }

  newTsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const channelId = document.getElementById('config-channel').value.trim();
    const readApiKey = document.getElementById('config-apikey').value.trim();
    try {
      await apiFetch('/api/config', { method: 'PUT', body: { channelId, readApiKey } });
      window.location.href = '/dashboard';
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.add('visible');
    }
  });

  const thForm = document.getElementById('threshold-form');
  const newThForm = thForm.cloneNode(true);
  thForm.parentNode.replaceChild(newThForm, thForm);

  // Bind threshold cancel button after cloning
  document.getElementById('thresh-cancel-btn').onclick = () => {
    if (currentUser && currentUser.thingspeak?.channelId) {
      window.location.href = '/dashboard';
    } else {
      window.location.href = '/';
    }
  };

  newThForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const tempWarning = parseFloat(document.getElementById('thresh-temp-warn').value);
    const tempAlert = parseFloat(document.getElementById('thresh-temp-alert').value);
    const airWarning = parseFloat(document.getElementById('thresh-air-warn').value);
    const airAlert = parseFloat(document.getElementById('thresh-air-alert').value);
    try {
      await apiFetch('/api/config/thresholds', { method: 'PUT', body: { tempWarning, tempAlert, airWarning, airAlert } });
      window.location.href = '/dashboard';
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.classList.add('visible');
    }
  });
}

function updateUserInfo(user) {
  const nameEl = document.getElementById('user-name');
  const channelEl = document.getElementById('user-channel');
  const adminBtn = document.getElementById('nav-admin-btn');

  if (nameEl) {
    nameEl.textContent = window.viewingUserId ? `Viewing: ${user.username}` : user.username;
  }
  if (channelEl) {
    channelEl.textContent = 'CH: ' + (user.thingspeak?.channelId || '---');
  }
  
  if (adminBtn) {
    if (currentUser && currentUser.role === 'admin') {
      adminBtn.classList.remove('hidden');
    } else {
      adminBtn.classList.add('hidden');
    }
  }
}

// ============ ADMIN PANEL LOGIC ============
window.adminUsersList = [];

async function initAdminPanel() {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
  sessionStorage.removeItem('viewingUserId');

  try {
    const users = await apiFetch('/api/admin/users');
    window.adminUsersList = users;
    tbody.innerHTML = '';
    
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No users found.</td></tr>';
      return;
    }

    users.forEach(u => {
      const isSelf = currentUser && u._id === currentUser._id;
      const roleBadge = u.role === 'admin' ? '<span class="admin-badge">Admin</span>' : '<span class="user-badge">User</span>';
      const hasConfig = u.thingspeak && u.thingspeak.channelId && u.thingspeak.readApiKey;
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${u.username}</td>
        <td>${u.email}</td>
        <td>${roleBadge}</td>
        <td>⚡ ${u.tokenBalance}</td>
        <td>
          <button class="btn-toggle-role" data-action="toggleRole" data-id="${u._id}">
            Make ${u.role === 'admin' ? 'User' : 'Admin'}
          </button>
          <button class="btn-delete" data-action="deleteUser" data-id="${u._id}">Delete</button>
          <button class="btn-view" data-action="viewUser" data-id="${u._id}" ${!hasConfig ? 'disabled title="Not configured"' : ''}>👁️ View</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:red;">Error: ${err.message}</td></tr>`;
  }
}

window.viewUserDashboard = function(userId) {
  sessionStorage.setItem('viewingUserId', userId);
  window.location.href = '/dashboard';
};

window.toggleRole = async function(id) {
  const confirmed = await window.customConfirm('Apakah Anda yakin ingin mengubah hak akses (role) pengguna ini?');
  if (!confirmed) return;

  try {
    await apiFetch(`/api/admin/users/${id}/role`, { method: 'PUT' });
    initAdminPanel();
  } catch (err) {
    showAdminError('Error changing role: ' + err.message);
  }
};

window.deleteUser = async function(id) {
  const confirmed = await window.customConfirm('Apakah Anda yakin ingin menghapus pengguna ini secara permanen? Data tidak dapat dikembalikan.');
  if (!confirmed) return;

  try {
    await apiFetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    initAdminPanel();
  } catch (err) {
    showAdminError('Error deleting user: ' + err.message);
  }
};

function showAdminError(msg) {
  const tbody = document.getElementById('admin-users-tbody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `<td colspan="5" style="color:red; font-weight:bold; text-align:center; padding:10px; background:#ffebeb;">${msg}</td>`;
  tbody.insertBefore(tr, tbody.firstChild);
  setTimeout(() => tr.remove(), 4000);
}

window.customConfirm = function(msg) {
  return new Promise((resolve) => {
    const modal = document.getElementById('custom-confirm-modal');
    if (!modal) return resolve(true);
    
    document.getElementById('custom-confirm-message').textContent = msg;
    modal.style.display = 'flex';
    
    const cancelBtn = document.getElementById('custom-confirm-cancel');
    const okBtn = document.getElementById('custom-confirm-ok');
    
    const cleanup = () => {
      modal.style.display = 'none';
      cancelBtn.removeEventListener('click', onCancel);
      okBtn.removeEventListener('click', onOk);
    };
    
    const onCancel = () => { cleanup(); resolve(false); };
    const onOk = () => { cleanup(); resolve(true); };
    
    cancelBtn.addEventListener('click', onCancel);
    okBtn.addEventListener('click', onOk);
  });
};

document.addEventListener('click', async (e) => {
  const targetId = e.target.id;

  if (targetId === 'logout-btn') {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {}
    if (typeof stopDashboard === 'function') stopDashboard();
    sessionStorage.removeItem('viewingUserId');
    currentUser = null;
    window.location.href = '/';
    return;
  }

  // Navigation routing manually to avoid CSP/inline issues
  if (targetId === 'nav-login-btn') window.location.href = '/auth';
  if (targetId === 'nav-signup-btn') window.location.href = '/auth?mode=signup';
  if (targetId === 'hero-get-started') window.location.href = '/auth';
  if (targetId === 'hero-go-dash') {
    if (typeof checkUserConfig === 'function') checkUserConfig(currentUser);
  }
  if (targetId === 'nav-dash-btn') window.location.href = '/dashboard';
  if (targetId === 'nav-admin-btn') window.location.href = '/admin';
  if (targetId === 'settings-btn') window.location.href = '/config';

  const brandBtn = e.target.closest('#nav-brand-btn');
  if (brandBtn) {
    window.location.href = '/';
    return;
  }

  // Handle data-action buttons (Admin Panel)
  const actionBtn = e.target.closest('button[data-action]');
  if (actionBtn) {
    const action = actionBtn.dataset.action;
    const id = actionBtn.dataset.id;
    if (action === 'toggleRole') {
      if (typeof window.toggleRole === 'function') window.toggleRole(id);
    } else if (action === 'deleteUser') {
      if (typeof window.deleteUser === 'function') window.deleteUser(id);
    } else if (action === 'viewUser') {
      if (typeof window.viewUserDashboard === 'function') window.viewUserDashboard(id);
    }
  }
});
