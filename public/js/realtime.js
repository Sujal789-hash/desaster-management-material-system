(function () {
  if (typeof io === 'undefined') return;

  const Realtime = {
    socket: null,

    connect() {
      const token = localStorage.getItem('token');
      if (!token) return null;
      if (this.socket?.connected) return this.socket;
      this.socket = io({
        auth: { token },
        transports: ['websocket', 'polling'],
      });
      this.socket.on('connect_error', () => {
        console.warn('Realtime connection failed (check login)');
      });
      this.socket.on('realtime:ready', () => {
        document.dispatchEvent(new CustomEvent('realtime:ready'));
      });
      return this.socket;
    },

    disconnect() {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
    },

    on(event, handler) {
      const s = this.connect();
      if (!s) return;
      s.on(event, handler);
    },

    off(event, handler) {
      if (this.socket) this.socket.off(event, handler);
    },
  };

  window.Realtime = Realtime;

  const path = window.location.pathname || '';
  const isAuthPage =
    path.endsWith('index.html') ||
    path === '/' ||
    path.endsWith('/');

  if (!isAuthPage && localStorage.getItem('token')) {
    Realtime.connect();
  }
})();
