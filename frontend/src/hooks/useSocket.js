import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const useSocket = (groupId) => {
  const socketRef = useRef(null);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (!user) return;

    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to socket server');
      if (groupId) {
        socket.emit('join:group', groupId);
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });

    // Cleanup on unmount or when groupId/user changes
    return () => {
      if (groupId) {
        socket.emit('leave:group', groupId);
      }
      socket.disconnect();
    };
  }, [user, groupId]);

  const emit = (event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event) => {
    if (socketRef.current) {
      socketRef.current.off(event);
    }
  };

  return { socket: socketRef.current, emit, on, off };
};

export default useSocket;
