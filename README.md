# Translator - Node.js Version

Professional Translation Memory and CAT Tool built with Node.js, Express, and MongoDB.

## Features

- **Translation Interface**: Professional translation editor with segment management
- **Translation Memory (TM)**: Store and reuse translations for consistency
- **Glossary Management**: Terminology management across multiple languages
- **Project Management**: Organize translation projects with documents
- **Quality Assurance**: QA checks for translation quality
- **Multi-language Support**: English, Arabic, Spanish (extensible)

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Passport.js with JWT
- **Template Engine**: EJS
- **File Handling**: Multer, Mammoth

## Installation

1. Install dependencies:
```bash
cd node
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Start MongoDB (ensure MongoDB is running locally or update MONGODB_URI)

4. Seed initial data (languages):
```bash
npm run seed
```

5. Start the server:
```bash
npm start
# or for development:
npm run dev
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/translator |
| JWT_SECRET | Secret for JWT tokens | (change in production) |
| SESSION_SECRET | Secret for sessions | (change in production) |
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |

## Project Structure

```
node/
├── config/
│   ├── database.js      # MongoDB connection
│   └── passport.js      # Authentication config
├── middleware/
│   └── auth.js          # Auth middleware
├── models/
│   ├── User.js
│   ├── Language.js
│   ├── Project.js
│   ├── Document.js
│   ├── Segment.js
│   ├── TranslationMemory.js
│   ├── GlossaryTerm.js
│   ├── Category.js
│   └── ...
├── routes/
│   ├── index.js
│   ├── auth.js
│   ├── translate.js
│   ├── projects.js
│   ├── glossary.js
│   └── api.js
├── utils/
│   ├── fileUpload.js
│   └── translateEngine.js
├── views/
│   ├── layouts/
│   ├── partials/
│   ├── accounts/
│   ├── translator/
│   ├── projects/
│   ├── glossary/
│   └── errors/
├── public/
│   ├── js/
│   └── css/ (symlink or copy from ../static/css)
├── server.js
├── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /auth/login` - Login
- `POST /auth/register` - Register new user
- `GET /auth/logout` - Logout
- `POST /auth/api/login` - API login (JWT)

### Translation
- `GET /translate` - Translation interface
- `POST /translate/session` - Create session
- `PUT /translate/session/:id` - Update session
- `DELETE /translate/session/:id` - Delete session

### Projects
- `GET /projects` - List projects
- `GET /projects/new` - New project form
- `POST /projects` - Create project
- `GET /projects/:id` - Project detail
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Glossary
- `GET /glossary` - Glossary index
- `POST /glossary/category` - Create category
- `POST /glossary/term` - Create term
- `PUT /glossary/term/:id` - Update term
- `DELETE /glossary/term/:id` - Delete term

### API (JWT Auth)
- `GET /api/user/profile` - User profile
- `PUT /api/user/preferences` - Update preferences
- `GET /api/languages` - List languages
- `GET /api/projects` - List projects
- `GET /api/segments/:documentId` - Get segments
- `PUT /api/segments/:id` - Update segment
- `POST /api/translate` - Translate text
- `POST /api/translate/batch` - Batch translate

## Development

```bash
# Run with hot reload
npm run dev

# Run tests (when added)
npm test
```

## Migration from Django

This is a migration of the Django Translator application to Node.js. Key changes:

1. **Models**: Django ORM → Mongoose schemas
2. **Views**: Django views → Express routes
3. **Templates**: Django templates → EJS templates
4. **Auth**: Django auth → Passport.js with JWT
5. **Database**: SQLite → MongoDB

## License

MIT
