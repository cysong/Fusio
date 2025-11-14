import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class SocketClient {
  private socket: Socket | null = null;
  private isConnecting: boolean = false;

  connect() {
    // If already connected, return existing socket
    if (this.socket?.connected) {
      return this.socket;
    }

    // If currently connecting, return existing socket instance
    if (this.isConnecting && this.socket) {
      return this.socket;
    }

    this.isConnecting = true;

    this.socket = io(`${SOCKET_URL}/market`, {
      transports: ['websocket'],
      upgrade: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      timeout: 10000,
      forceNew: false,
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
      console.log('[Socket] Connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnecting = false;
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      this.isConnecting = false;
      console.error('[Socket] Connection error:', error);
    });

    return this.socket;
  }

  disconnect() {
    if (!this.socket) return;

    // Only disconnect if actually connected
    // Do NOT disconnect while still connecting to avoid the warning
    if (this.socket.connected) {
      console.log('[Socket] Disconnecting');
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
    } else if (!this.isConnecting) {
      // Only clear socket if not connecting
      this.socket = null;
      this.isConnecting = false;
    }
    // If isConnecting is true, keep the socket instance for reuse
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketClient = new SocketClient();
