/**
 * Translator — Global App Utilities
 * Toast system, Modal manager, Fetch wrapper, Confirm Delete
 */

// ── Toast System ──
const Toast = {
  container: null,
  
  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  
  show(message, type = 'info', duration = 4000) {
    if (!this.container) this.init();
    const icons = {
      success: '✓', warning: '⚠', error: '✕', info: 'ℹ'
    };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="Toast.dismiss(this.parentElement)">✕</button>
    `;
    this.container.appendChild(toast);
    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration);
    }
    return toast;
  },
  
  dismiss(toast) {
    if (!toast || !toast.parentElement) return;
    toast.classList.add('is-leaving');
    setTimeout(() => toast.remove(), 200);
  },
  
  success(msg, dur) { return this.show(msg, 'success', dur); },
  warning(msg, dur) { return this.show(msg, 'warning', dur); },
  error(msg, dur) { return this.show(msg, 'error', dur); },
  info(msg, dur) { return this.show(msg, 'info', dur); }
};

// ── API Fetch Wrapper ──
async function api(url, options = {}) {
  const defaults = {
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  };
  
  const config = { ...defaults, ...options };
  if (options.headers) {
    config.headers = { ...defaults.headers, ...options.headers };
  }
  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }
  
  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed (${response.status})`);
    }
    return await response.json();
  } catch (err) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      Toast.error('Network error. Please check your connection.');
    }
    throw err;
  }
}

// ── Modal Manager ──
const Modal = {
  open(modalId) {
    const modal = document.getElementById(modalId);
    const backdrop = document.getElementById(modalId + '-backdrop');
    if (modal) modal.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    // Close on ESC
    const handler = (e) => {
      if (e.key === 'Escape') {
        this.close(modalId);
        document.removeEventListener('keydown', handler);
      }
    };
    document.addEventListener('keydown', handler);
  },
  
  close(modalId) {
    const modal = document.getElementById(modalId);
    const backdrop = document.getElementById(modalId + '-backdrop');
    if (modal) modal.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
    document.body.style.overflow = '';
  }
};

// ── Confirm Delete Modal ──
const ConfirmDelete = {
  _callback: null,
  
  show(title, message, onConfirm) {
    document.getElementById('delete-modal-title').textContent = title || 'Delete Item';
    document.getElementById('delete-modal-msg').textContent = message || 'Are you sure? This action cannot be undone.';
    this._callback = onConfirm;
    Modal.open('delete-modal');
  },
  
  exec() {
    Modal.close('delete-modal');
    if (this._callback) { this._callback(); this._callback = null; }
  },
  
  cancel() {
    Modal.close('delete-modal');
    this._callback = null;
  }
};

// ── Dropdown Manager ──
document.addEventListener('click', (e) => {
  document.querySelectorAll('.dropdown-menu.is-open').forEach(menu => {
    if (!menu.parentElement.contains(e.target)) {
      menu.classList.remove('is-open');
    }
  });
});

function toggleDropdown(triggerId) {
  const trigger = document.getElementById(triggerId);
  const menu = trigger?.nextElementSibling;
  if (menu) {
    document.querySelectorAll('.dropdown-menu.is-open').forEach(m => {
      if (m !== menu) m.classList.remove('is-open');
    });
    menu.classList.toggle('is-open');
  }
}

// ── Unsaved Changes Guard ──
let hasUnsavedChanges = false;
function setUnsaved(val) {
  hasUnsavedChanges = val;
}
window.addEventListener('beforeunload', (e) => {
  if (hasUnsavedChanges) {
    e.preventDefault();
    e.returnValue = '';
  }
});

// ── Mobile Sidebar Toggle ──
document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('mobile-menu-btn');
  const closeBtn = document.getElementById('sidebar-close');
  const backdrop = document.getElementById('sidebar-backdrop');

  function openSidebar() {
    if (sidebar) sidebar.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  
  function closeSidebar() {
    if (sidebar) sidebar.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  if (menuBtn) menuBtn.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (backdrop) backdrop.addEventListener('click', closeSidebar);

  // Close sidebar on nav click (mobile)
  if (sidebar) {
    var links = sidebar.querySelectorAll('.nav-item, .app-sidebar__link');
    links.forEach(function(item) {
      item.addEventListener('click', closeSidebar);
    });
  }

  // Entrance animations
  const pageBody = document.querySelector('.page-body');
  if (pageBody) pageBody.classList.add('anim-fade');
});

// ── Initialize on DOM ready ──
document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

// ── Export for use in other scripts ──
window.Toast = Toast;
window.api = api;
window.Modal = Modal;
window.ConfirmDelete = ConfirmDelete;
window.setUnsaved = setUnsaved;

window.toggleMobileMenu = function() {
  const sidebar = document.getElementById('sidebar');
  const adminNav = document.getElementById('admin-nav');
  if (sidebar) sidebar.classList.toggle('mobile-open');
  if (adminNav) adminNav.classList.toggle('mobile-open');
};

// ── Auth Functions ──
window.logout = async function() {
  try {
    await api('/auth/logout', { method: 'POST' });
    window.location.reload();
  } catch (e) {
    Toast.error('Failed to logout');
  }
};

// ── Login Modal ──
const LoginModal = {
  show(onLogin) {
    // Remove existing modal if present
    const existing = document.getElementById('login-prompt-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'login-prompt-modal';
    modal.innerHTML = `
      <div class="login-prompt-backdrop" onclick="LoginModal.close()"></div>
      <div class="login-prompt-content">
        <button class="login-prompt-close" onclick="LoginModal.close()">✕</button>
        <div class="login-prompt-icon">
          <i data-lucide="lock" style="width:32px;height:32px;"></i>
        </div>
        <h3 class="login-prompt-title">Login Required</h3>
        <p class="login-prompt-text">You need to be logged in to save your translation history.</p>
        <div class="login-prompt-actions">
          <a href="/auth/login" class="login-prompt-btn login-prompt-primary">
            <i data-lucide="log-in" style="width:16px;height:16px;"></i> Login
          </a>
          <a href="/auth/register" class="login-prompt-btn login-prompt-secondary">
            <i data-lucide="user-plus" style="width:16px;height:16px;"></i> Create Account
          </a>
        </div>
        <button class="login-prompt-skip" onclick="LoginModal.close()">Continue without saving</button>
      </div>
    `;
    
    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .login-prompt-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.7);
        z-index: 9998;
        animation: fadeIn 0.2s ease;
      }
      .login-prompt-content {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #141820;
        border: 1px solid rgba(212,175,55,0.2);
        border-radius: 16px;
        padding: 32px;
        z-index: 9999;
        text-align: center;
        max-width: 360px;
        width: 90%;
        animation: slideUp 0.3s ease;
      }
      .login-prompt-close {
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        color: #6b7280;
        cursor: pointer;
        font-size: 18px;
        padding: 4px;
      }
      .login-prompt-close:hover { color: #fff; }
      .login-prompt-icon {
        width: 64px;
        height: 64px;
        margin: 0 auto 16px;
        background: rgba(212,175,55,0.1);
        border: 1px solid rgba(212,175,55,0.2);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #d4af37;
      }
      .login-prompt-title {
        font-size: 20px;
        font-weight: 600;
        color: #fff;
        margin: 0 0 8px;
      }
      .login-prompt-text {
        font-size: 14px;
        color: #9ca3af;
        margin: 0 0 24px;
        line-height: 1.5;
      }
      .login-prompt-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 16px;
      }
      .login-prompt-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        text-decoration: none;
        transition: all 0.2s;
      }
      .login-prompt-primary {
        background: linear-gradient(135deg, #d4af37, #b8960c);
        color: #000;
      }
      .login-prompt-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(212,175,55,0.3);
        background: linear-gradient(135deg, #e5c158, #d4af37);
      }
      .login-prompt-secondary {
        background: rgba(255,255,255,0.03);
        color: #fff;
        border: 1px solid rgba(212,175,55,0.2);
      }
      .login-prompt-secondary:hover { background: rgba(255,255,255,0.06); }
      .login-prompt-skip {
        background: none;
        border: none;
        color: #6b7280;
        font-size: 12px;
        cursor: pointer;
        padding: 8px;
      }
      .login-prompt-skip:hover { color: #9ca3af; }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideUp { from { opacity: 0; transform: translate(-50%, -40%); } to { opacity: 1; transform: translate(-50%, -50%); } }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(modal);
    lucide.createIcons();
    
    this._callback = onLogin;
  },
  
  close() {
    const modal = document.getElementById('login-prompt-modal');
    if (modal) {
      modal.classList.add('is-leaving');
      setTimeout(() => modal.remove(), 200);
    }
  }
};

window.LoginModal = LoginModal;
