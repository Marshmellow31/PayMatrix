---
name: JWT Auth
description: Authentication and Authorization skills
---

# JWT Authentication Skill

## Requirements based on README
- **JWT**: Stateless token-based authentication.
- **OAuth Integration**: Google & GitHub social logins.
- **Bcrypt**: Password hashing.

## Configuration & Usage Rules
- Authentication logic belongs to `backend/controllers/authController.js`.
- JWT sign and verify helpers should be placed in `backend/utils/generateToken.js`.
- Middleware `backend/middleware/auth.js` should check headers, parse `Bearer` token and populate `req.user`.
- API boundaries: `/api/v1/auth/register`, `/login`, `/me`, `/profile` etc.
