---
name: Socket.IO
description: Real-time Communication API Skills
---

# Socket.IO Skill

## Requirements based on README
- **Socket.IO (4+)**: Real-time server and client communication.

## Configuration & Usage Rules
- Real-time updates required for: expense balance recalculations, settlements, and live notifications.
- Server logic resides in `backend/socket/index.js`.
- React hook `frontend/src/hooks/useSocket.js` maintains the connection on the frontend.
- Utilize room-based namespaces or group channels for optimal traffic handling.
