// Deprecated in favor of Firebase onSnapshot
const useSocket = (groupId) => {
  return { 
    socket: null, 
    emit: () => {}, 
    on: () => {}, 
    off: () => {} 
  };
};

export default useSocket;
