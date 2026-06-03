import { io } from 'socket.io-client';

// En desarrollo usamos el proxy de Vite (cadena vacía = mismo host/puerto)
// En producción usar VITE_SERVER_URL
const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

let socket = null;

export function getSocket(token) {
  if (!socket || !socket.connected) {
    socket = io(SERVER_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export { socket };
