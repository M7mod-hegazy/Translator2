# Translator Application Architecture

## Overview

This is a Node.js/Express web application for translation services with MongoDB database, featuring:
- Machine Translation (Google Translate API)
- Translation Memory (TM)
- Glossary Management
- User Authentication & Authorization
- Admin Dashboard

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (Mongoose ODM) |
| Authentication | Passport.js (Local Strategy) |
| View Engine | EJS |
| Sessions | express-session |
| External APIs | Google Translate, Groq Whisper (Speech-to-text) |

---

## Server Entry Points

### 1. `server.js` (Local Development)
- Main entry point for local development
- Connects to MongoDB via `config/database.js`
- Sets up Express middleware, sessions, Passport
- Mounts all route handlers
- Listens on port 3000

### 2. `api/index.js` (Vercel Serverless)
- Serverless entry point for Vercel deployment
- Same middleware setup as `server.js`
- Uses cached MongoDB connection for serverless

---

## Database Connection

**File:** `config/database.js`

```javascript
// Cached connection for serverless environments
let cachedDb = null;

const connectDB = async () => {
  if (cachedDb && cachedDb.readyState === 1) {
    return cachedDb; // Reuse connection
  }
  const conn = await mongoose.connect(process.env.MONGODB_URI);
  cachedDb = conn.connection;
  return cachedDb;
};
```

---

## Database Models

### User (`models/User.js`)
| Field | Type | Description |
|-------|------|-------------|
| username | String | Unique username |
| email | String | Unique email |
| password | String | Hashed password (bcrypt) |
| role | String | 'user' or 'admin' |
| firstName | String | Optional |
| lastName | String | Optional |
| preferredSourceLang | String | Default: 'en' |
| preferredTargetLang | String | Default: 'ar' |
| editorPreferences | Map | User preferences |
| createdAt | Date | Auto-generated |
| updatedAt | Date | Auto-updated |

**Methods:**
- `comparePassword(candidatePassword)` - Compare hashed passwords

---

### GlossaryCategory (`models/GlossaryCategory.js`)
| Field | Type | Description |
|-------|------|-------------|
| name | String | Category name (required, max 100) |
| description | String | Optional |
| order | Number | Display order |
| createdBy | ObjectId | Reference to User |

**Virtuals:**
- `termCount` - Count of terms in category

---

### GlossaryTerm (`models/GlossaryTerm.js`)
| Field | Type | Description |
|-------|------|-------------|
| category | ObjectId | Reference to GlossaryCategory (required) |
| termEn | String | English term (camelCase in DB) |
| termAr | String | Arabic term |
| termEs | String | Spanish term |
| createdBy | ObjectId | Reference to User |

**IMPORTANT:** Model uses **camelCase** (`termEn`, `termAr`, `termEs`) but frontend sends **snake_case** (`term_en`, `term_ar`, `term_es`). Routes must map between them.

**Methods:**
- `getTerm(langCode)` - Get term by language code
- `getTranslation(fromLang, toLang)` - Get translation between languages

---

### TranslationMemory (`models/TranslationMemory.js`)
| Field | Type | Description |
|-------|------|-------------|
| sourceLanguage | ObjectId | Reference to Language |
| targetLanguage | ObjectId | Reference to Language |
| sourceText | String | Original text |
| targetText | String | Translated text |
| domain | String | Domain context (default: 'general') |
| usageCount | Number | How many times used |
| qualityScore | Number | Quality rating (0-1) |
| createdBy | ObjectId | Reference to User |
| projectOrigin | ObjectId | Reference to Project |

**Indexes:**
- `{ sourceLanguage: 1, targetLanguage: 1 }`
- `{ domain: 1 }`

---

### TranslationSession (`models/TranslationSession.js`)
| Field | Type | Description |
|-------|------|-------------|
| title | String | Session title |
| sourceText | String | Original text (required) |
| sourceLanguage | ObjectId | Reference to Language |
| translations | Map | Language code → translation |
| category | ObjectId | Reference to Category |
| createdBy | ObjectId | Reference to User |

**Virtuals:**
- `preview` - First 120 chars of source text
- `wordCount` - Word count of source text

---

### Language (`models/Language.js`)
| Field | Type | Description |
|-------|------|-------------|
| code | String | ISO language code (e.g., 'en', 'ar') |
| name | String | Display name |

---

### Project (`models/Project.js`)
| Field | Type | Description |
|-------|------|-------------|
| name | String | Project name |
| description | String | Project description |
| sourceLanguage | ObjectId | Reference to Language |
| targetLanguages | [ObjectId] | Array of target Languages |
| status | String | Project status |
| createdBy | ObjectId | Reference to User |

---

### Document (`models/Document.js`)
| Field | Type | Description |
|-------|------|-------------|
| project | ObjectId | Reference to Project |
| name | String | Document name |
| content | String | Document content |

---

### Segment (`models/Segment.js`)
| Field | Type | Description |
|-------|------|-------------|
| document | ObjectId | Reference to Document |
| sourceText | String | Source segment |
| targetText | String | Translated segment |
| status | String | Translation status |

---

## Routes Architecture

### Route Files

| Route | Path | Description |
|-------|------|-------------|
| `routes/index.js` | `/` | Home page, public pages |
| `routes/auth.js` | `/auth` | Login, logout, register |
| `routes/translate.js` | `/translate` | Translation page (render) |
| `routes/projects.js` | `/projects` | History, session management |
| `routes/glossary.js` | `/glossary` | Public glossary view |
| `routes/admin.js` | `/admin` | Admin dashboard, CRUD operations |
| `routes/api.js` | `/api` | JSON API endpoints |
| `routes/translateApi.js` | `/api/translate` | Translation API |

---

## API Endpoints

### Authentication (`/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/login` | Login page |
| POST | `/auth/login` | Process login |
| GET | `/auth/logout` | Logout user |
| GET | `/auth/register` | Registration page |
| POST | `/auth/register` | Create new user |

---

### Admin API (`/admin`)

#### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/categories` | Create category |
| PUT | `/admin/categories/:id` | Update category |
| DELETE | `/admin/categories/:id` | Delete category + all terms |

#### Terms
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/terms` | Create term |
| PUT | `/admin/terms/:id` | Update term |
| DELETE | `/admin/terms/:id` | Delete term |

**Request Body for Terms:**
```json
{
  "category": "category_id",
  "term_en": "English text",
  "term_ar": "Arabic text",
  "term_es": "Spanish text"
}
```

**Note:** Routes map snake_case to camelCase:
```javascript
// In routes/admin.js
const { category, term_en, term_ar, term_es } = req.body;
await GlossaryTerm.findByIdAndUpdate(id, {
  category,
  termEn: term_en,  // snake_case → camelCase
  termAr: term_ar,
  termEs: term_es
});
```

#### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/users` | Users list page |
| PUT | `/admin/users/:id/role` | Update user role |

---

### Translation API (`/api`)

#### Speech-to-Text
```
POST /api/speech-to-text
Body: { audio: "base64", lang: "en" }
Response: { success: true, text: "transcribed text" }
```

#### Translate
```
POST /api/translate
Body: {
  text: "source text",
  source_lang: "en",
  target_langs: ["ar", "es"],
  category_id: "optional",
  use_glossary: true,
  disabled_terms: []
}
Response: { success: true, translations: { ar: "...", es: "..." } }
```

---

### Glossary API (`/glossary`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/glossary` | Public glossary page |
| GET | `/glossary/search?q=term` | Search terms across all categories |
| GET | `/glossary/term/:id` | Get single term |
| GET | `/glossary/term?category_id=...` | Get terms by category |

---

### Projects/History (`/projects`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/projects` | History page with pagination |
| GET | `/projects/search?q=...` | Search sessions (AJAX) |
| GET | `/projects/:id` | View session |
| POST | `/projects` | Create new session |
| PUT | `/projects/:id` | Update session |
| DELETE | `/projects/:id` | Delete session |

---

## Authentication Flow

### Middleware (`middleware/auth.js`)

```javascript
// Check if user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/auth/login');
}

// Check if user is admin
function ensureAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  res.redirect('/auth/login');
}
```

### Passport Strategy (`config/passport.js`)

```javascript
passport.use(new LocalStrategy(async (username, password, done) => {
  const user = await User.findOne({ username });
  if (!user) return done(null, false);
  
  const isMatch = await user.comparePassword(password);
  if (!isMatch) return done(null, false);
  
  return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});
```

---

## Translation Engine (`utils/translateEngine.js`)

### Strategy: TRANSLATE NORMALLY + CACHED POST-EDIT

1. **Translate full text** via Google Translate API
2. **Apply glossary terms** - Find glossary matches in source, replace in target
3. **LRU cache** for single-word translations (max 2000 entries)

### Main Functions

```javascript
// Translate to multiple targets in parallel
async function translateMultiTarget(text, sourceLang, targetLangs, options)

// Direct translation
async function translateDirect(text, sourceLang, targetLang)

// Single word translation (cached)
async function mtWord(word, sourceLang, targetLang)

// Get TM suggestions
async function getTMSuggestions(text, sourceLang, targetLang, limit)
```

### Glossary Enforcement

```javascript
// Find glossary terms in source text
// Translate each term individually
// Replace in target text with glossary translation
```

---

## Frontend JavaScript API Helper (`public/js/app.js`)

```javascript
// API wrapper with authentication
async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  return res.json();
}
```

---

## Environment Variables (`.env`)

```
MONGODB_URI=mongodb://localhost:27017/translator
SESSION_SECRET=your-session-secret
GOOGLE_TRANSLATE_API_KEY=your-api-key
GROQ_API_KEY=your-groq-key (for speech-to-text)
NODE_ENV=development
```

---

## Request Flow Example: Edit Term

1. **Frontend:** User clicks search result
   ```javascript
   onclick="openEditModalFromSearch('term_id')"
   ```

2. **Frontend:** Modal opens, form populated
   ```javascript
   document.getElementById('term-id').value = 'term_id';
   document.getElementById('term-en').value = 'English';
   // ...
   ```

3. **Frontend:** Form submitted
   ```javascript
   fetch('/admin/terms/term_id', {
     method: 'PUT',
     body: JSON.stringify({
       category: 'cat_id',
       term_en: 'English',
       term_ar: 'عربي',
       term_es: 'Español'
     })
   });
   ```

4. **Backend:** Route handler (`routes/admin.js`)
   ```javascript
   router.put('/terms/:id', ensureAdmin, async (req, res) => {
     const { category, term_en, term_ar, term_es } = req.body;
     await GlossaryTerm.findByIdAndUpdate(req.params.id, {
       category,
       termEn: term_en,  // Map to camelCase
       termAr: term_ar,
       termEs: term_es
     });
   });
   ```

5. **Database:** Mongoose updates document
   ```javascript
   // GlossaryTerm collection
   {
     _id: ObjectId('...'),
     category: ObjectId('...'),
     termEn: 'English',
     termAr: 'عربي',
     termEs: 'Español'
   }
   ```

---

## Common Issues & Solutions

### Issue: "Cast to ObjectId failed"
**Cause:** Invalid MongoDB ObjectId passed to query
**Solution:** Validate ID before database operation

### Issue: Field name mismatch
**Cause:** Frontend sends `term_en`, model expects `termEn`
**Solution:** Map field names in route handlers

### Issue: "Cannot read properties of null"
**Cause:** DOM element not found when JavaScript runs
**Solution:** Add null checks or ensure elements exist

---

## File Structure

```
node/
├── server.js              # Main entry point
├── api/
│   └── index.js           # Vercel serverless entry
├── config/
│   ├── database.js        # MongoDB connection
│   └── passport.js       # Auth configuration
├── middleware/
│   └── auth.js            # Auth middleware
├── models/
│   ├── User.js
│   ├── GlossaryCategory.js
│   ├── GlossaryTerm.js
│   ├── TranslationMemory.js
│   ├── TranslationSession.js
│   ├── Language.js
│   ├── Project.js
│   ├── Document.js
│   └── Segment.js
├── routes/
│   ├── index.js
│   ├── auth.js
│   ├── admin.js
│   ├── api.js
│   ├── glossary.js
│   ├── projects.js
│   ├── translate.js
│   └── translateApi.js
├── utils/
│   └── translateEngine.js
├── views/
│   ├── admin/
│   ├── glossary/
│   ├── projects/
│   ├── translator/
│   └── partials/
├── public/
│   ├── js/
│   │   └── app.js
│   └── css/
│       └── layout.css
└── .env
```

---

## Summary

This application follows a standard MVC architecture:
- **Models:** Mongoose schemas define data structure
- **Views:** EJS templates render HTML
- **Controllers:** Express routes handle business logic
- **API:** RESTful JSON endpoints for AJAX operations

Key patterns:
1. **Field name mapping** between frontend (snake_case) and backend (camelCase)
2. **Cached database connections** for serverless compatibility
3. **Session-based authentication** with Passport.js
4. **Role-based access control** (user vs admin)
5. **LRU caching** for translation performance
