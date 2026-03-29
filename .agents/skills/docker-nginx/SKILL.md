---
name: Docker Nginx DevOps
description: Deployment and DevOps skills
---

# Docker Nginx DevOps Skill

## Requirements based on README
- **Docker**: Containerization.
- **Nginx**: Reverse proxy.
- **GitHub Actions**: CI/CD Pipeline.

## Configuration & Usage Rules
- Environment expects a `docker-compose.yml` for running local stack seamlessly (`backend` + `frontend`).
- Nginx provides reverse proxy targeting `5000` (API) and `5173` (Frontend) or serving static build.
- CI/CD checks (ESLint, Prettier, Tests) should run via GitHub actions upon push.
