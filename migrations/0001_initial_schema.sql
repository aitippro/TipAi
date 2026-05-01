-- Initial schema for TipAi native core
-- Users, settings, prompts, templates, projects, steps

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unionId TEXT NOT NULL UNIQUE,
    username TEXT UNIQUE,
    password TEXT,
    name TEXT,
    email TEXT,
    avatar TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    createdAt INTEGER,
    updatedAt INTEGER,
    lastSignInAt INTEGER
);

CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL UNIQUE,
    kimiApiKey TEXT,
    openaiApiKey TEXT,
    claudeApiKey TEXT,
    deepseekApiKey TEXT,
    defaultModel TEXT NOT NULL DEFAULT 'kimi',
    defaultFramework TEXT NOT NULL DEFAULT 'auto',
    defaultLanguage TEXT NOT NULL DEFAULT 'zh',
    createdAt INTEGER,
    updatedAt INTEGER
);

CREATE TABLE IF NOT EXISTS prompt_library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    title TEXT NOT NULL,
    originalIntent TEXT,
    generatedPrompt TEXT NOT NULL,
    framework TEXT,
    domain TEXT DEFAULT 'general',
    model TEXT DEFAULT 'kimi',
    rating INTEGER,
    tags TEXT,
    useCount INTEGER DEFAULT 0,
    isFavorite INTEGER DEFAULT 0,
    createdAt INTEGER,
    updatedAt INTEGER
);

CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    framework TEXT,
    domain TEXT DEFAULT 'general',
    content TEXT NOT NULL,
    tags TEXT,
    useCount INTEGER DEFAULT 0,
    rating INTEGER,
    ratingCount INTEGER DEFAULT 0,
    isPublic INTEGER DEFAULT 1,
    isFeatured INTEGER DEFAULT 0,
    createdAt INTEGER
);

CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    domain TEXT NOT NULL DEFAULT 'general',
    status TEXT NOT NULL DEFAULT 'draft',
    intent TEXT,
    clarificationStatus TEXT DEFAULT 'pending',
    turnCount INTEGER DEFAULT 0,
    createdAt INTEGER,
    updatedAt INTEGER
);

CREATE TABLE IF NOT EXISTS steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projectId INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    prompt TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'implement',
    orderNum INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    output TEXT,
    parentStepId INTEGER,
    model TEXT DEFAULT 'kimi',
    temperature REAL DEFAULT 0.7,
    decode_strategy TEXT,
    createdAt INTEGER,
    updatedAt INTEGER
);

CREATE INDEX IF NOT EXISTS idx_prompt_user ON prompt_library(userId);
CREATE INDEX IF NOT EXISTS idx_template_user ON templates(userId);
CREATE INDEX IF NOT EXISTS idx_project_user ON projects(userId);
CREATE INDEX IF NOT EXISTS idx_step_project ON steps(projectId);
