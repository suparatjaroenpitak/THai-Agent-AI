import { runOllamaEmbed } from "@/ai/model-client";

// ── Types ───────────────────────────────────────────────────────────────────

export type RagDocument = {
  id: string;
  workspaceId: string;
  path: string;
  title: string;
  content: string;
  contentHash: string;
  metadata?: Record<string, unknown>;
};

export type RagChunk = {
  documentId: string;
  workspaceId: string;
  path: string;
  chunkIndex: number;
  text: string;
  embedding?: number[];
};

export type ScoredChunk = RagChunk & { score: number };

// ── Chunking ────────────────────────────────────────────────────────────────

export function chunkDocument(document: RagDocument, maxChars = 1400): RagChunk[] {
  const paragraphs = document.content.split(/\n{2,}/g);
  const chunks: RagChunk[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars && current) {
      chunks.push({
        documentId: document.id,
        workspaceId: document.workspaceId,
        path: document.path,
        chunkIndex: chunks.length,
        text: current,
      });
      current = paragraph;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) {
    chunks.push({
      documentId: document.id,
      workspaceId: document.workspaceId,
      path: document.path,
      chunkIndex: chunks.length,
      text: current,
    });
  }

  return chunks;
}

// ── Embedding via Ollama ────────────────────────────────────────────────────

/** Embed a batch of chunks using Ollama's embedding API */
export async function embedChunks(chunks: RagChunk[], model?: string): Promise<RagChunk[]> {
  if (chunks.length === 0) return [];

  const batchSize = 16;
  const result: RagChunk[] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map((c) => c.text);

    try {
      const embeddings = await runOllamaEmbed({ input: texts, model });

      for (let j = 0; j < batch.length; j++) {
        result.push({
          ...batch[j],
          embedding: embeddings[j] ?? [],
        });
      }
    } catch (error) {
      console.error(`[RAG] Embedding batch ${i}-${i + batch.length} failed:`, error instanceof Error ? error.message : error);
      // Still add chunks without embeddings so they can be keyword-searched
      for (const chunk of batch) {
        result.push({ ...chunk });
      }
    }
  }

  return result;
}

/** Embed a single text string */
export async function embedText(text: string, model?: string): Promise<number[]> {
  const embeddings = await runOllamaEmbed({ input: text, model });
  return embeddings[0] ?? [];
}

// ── Search ──────────────────────────────────────────────────────────────────

/** Cosine similarity between two vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/** Semantic search: embed query and compare against chunk embeddings */
export async function semanticSearch(
  query: string,
  chunks: RagChunk[],
  topK = 5,
  model?: string
): Promise<ScoredChunk[]> {
  const queryEmbedding = await embedText(query, model);

  if (queryEmbedding.length === 0) {
    // Fallback to keyword search if embedding fails
    return rankChunksByKeyword(query, chunks)
      .slice(0, topK)
      .map((chunk, index) => ({ ...chunk, score: 1 - index * 0.1 }));
  }

  const scored: ScoredChunk[] = chunks
    .filter((chunk) => chunk.embedding && chunk.embedding.length > 0)
    .map((chunk) => ({
      ...chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding!),
    }))
    .sort((a, b) => b.score - a.score);

  // If no embeddings available, fallback to keyword search
  if (scored.length === 0) {
    return rankChunksByKeyword(query, chunks)
      .slice(0, topK)
      .map((chunk, index) => ({ ...chunk, score: 1 - index * 0.1 }));
  }

  return scored.slice(0, topK);
}

/** Keyword-based ranking as fallback */
export function rankChunksByKeyword(query: string, chunks: RagChunk[]): RagChunk[] {
  const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
  return chunks
    .map((chunk) => ({
      chunk,
      score: terms.reduce((score, term) => score + (chunk.text.toLowerCase().includes(term) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.chunk);
}
