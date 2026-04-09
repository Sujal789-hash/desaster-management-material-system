// Core API Client providing auth tokens dynamically
const apiClient = {
  baseUrl: '/api',

  async request(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    // Default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/index.html';
        throw new Error('Session expired');
      }

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API Error');
      }

      return data;
    } catch (error) {
      console.error('API Request Failed:', error);
      throw error;
    }
  },

  get(endpoint) { return this.request(endpoint, { method: 'GET' }); },
  post(endpoint, data) { return this.request(endpoint, { method: 'POST', body: JSON.stringify(data) }); },
  put(endpoint, data) { return this.request(endpoint, { method: 'PUT', body: JSON.stringify(data) }); },
  delete(endpoint) { return this.request(endpoint, { method: 'DELETE' }); },
  
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/index.html';
  }
};

// Check Auth state immediately on protected pages
if (!localStorage.getItem('token') && !window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
  window.location.href = '/index.html';
}

// Global Toast System
const Toast = {
  show(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Add icon based on type
    const iconStr = type === 'success' ? '✓' : type === 'error' ? '✕' : '⚠';
    
    toast.innerHTML = `<span class="toast-icon">${iconStr}</span><span class="toast-msg">${message}</span>`;
    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
};

// Apply saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

// Handle UI role rendering globally
document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        // Hide elements that need admin privileges if user is not admin
        if (user.role !== 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }
    }
});
