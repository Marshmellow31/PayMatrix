---
name: MongoDB Mongoose
description: Database and ORM skills
---

# MongoDB & Mongoose Skill

## Requirements based on README
- **MongoDB (6+)**: NoSQL database for flexible document storage.
- **Mongoose (8+)**: Object Data Modeling (ODM) library.

## Configuration & Usage Rules
- Data schemas and models belong in `backend/models/`.
- Ensure connection logic in `backend/config/db.js` handles Atlas URI properly.
- Group, Expense, User, Settlement, and Notification models define relationships using `ObjectId` refs.
