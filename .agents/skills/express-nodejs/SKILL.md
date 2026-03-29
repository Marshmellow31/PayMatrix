---
name: Express Node.js App
description: Backend Core framework skills
---

# Express Node.js API Skill

## Requirements based on README
- **Node.js (18+)**: Runtime environment.
- **Express (4+)**: Web framework for API routes and controllers.

## Configuration & Usage Rules
- All backend code resides in the `backend` directory.
- `package.json` entry point is `server.js`.
- Start dev server using `npm run dev` on port 5000.
- Organize APIs in `/api/v1` namespace.
- Always use `errorHandler` middleware for global exception handling.
- Use `rateLimiter` for rate limiting API calls.
