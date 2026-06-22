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
};

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
        text: current
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
      text: current
    });
  }

  return chunks;
}

export function rankChunksByKeyword(query: string, chunks: RagChunk[]) {
  const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
  return chunks
    .map((chunk) => ({
      chunk,
      score: terms.reduce((score, term) => score + (chunk.text.toLowerCase().includes(term) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.chunk);
}
