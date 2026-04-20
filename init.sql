CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS embeddings (
  id SERIAL PRIMARY KEY,
  content TEXT,
  embedding vector(768) -- Ajustado para Gemini/Ollama
);

CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops);