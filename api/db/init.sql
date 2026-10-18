CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS labour_observations (
 id BIGSERIAL PRIMARY KEY, state TEXT NOT NULL, district TEXT NOT NULL,
 sector TEXT NOT NULL, trade TEXT NOT NULL, month DATE NOT NULL,
 postings INTEGER NOT NULL CHECK (postings >= 0),
 completions INTEGER NOT NULL CHECK (completions >= 0),
 entry_rate REAL NOT NULL CHECK (entry_rate BETWEEN 0 AND 1),
 source TEXT NOT NULL DEFAULT 'synthetic_demo', embedding vector(384),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(state,district,sector,trade,month)
);
CREATE INDEX IF NOT EXISTS labour_geo_idx ON labour_observations(state,district,sector);
CREATE INDEX IF NOT EXISTS labour_embedding_idx ON labour_observations USING hnsw(embedding vector_cosine_ops);
