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
