import { pipeline, env } from '@xenova/transformers';

// Skip local checks since we are running in browser via CDN/wasm
env.allowLocalModels = false;
env.useBrowserCache = true;

class PipelineSingleton {
    static task: any = 'feature-extraction';
    static model = 'Xenova/all-MiniLM-L6-v2';
    static instance: any = null;

    static async getInstance(progress_callback?: Function) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

// Compute cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}

// Pre-computed embeddings cache
let tweaksEmbeddingsCache: { id: string, embedding: number[] }[] = [];

self.addEventListener('message', async (event) => {
    const { type, payload } = event.data;

    try {
        const extractor = await PipelineSingleton.getInstance((x: any) => {
            self.postMessage({ status: 'progress', progress: x });
        });

        if (type === 'INIT') {
            const { tweaksData } = payload;
            const texts = tweaksData.map((t: any) =>
                `${t.name}. ${t.description}. Category: ${t.category}. ${t.educationalContext.howItWorks} Pros: ${t.educationalContext.pros.join(', ')}`
            );

            self.postMessage({ status: 'init_start' });

            // Generate embeddings for all tweaks
            const out = await extractor(texts, { pooling: 'mean', normalize: true });

            // out.data is a flattened array. The shape is [batch_size, sequence_length, hidden_dimension]
            // actually since pooling='mean', it will be [batch_size, hidden_dimension] for the output.
            // Let's ensure we slice correctly.
            const dims = out.dims; // [batch_size, hidden_size]
            const batchSize = dims[0];
            const hiddenSize = dims[1];

            tweaksEmbeddingsCache = [];
            for (let i = 0; i < batchSize; i++) {
                const start = i * hiddenSize;
                const end = start + hiddenSize;
                const embedding = Array.from(out.data.slice(start, end));
                tweaksEmbeddingsCache.push({
                    id: tweaksData[i].id,
                    embedding: embedding as number[]
                });
            }

            self.postMessage({ status: 'init_ready' });
        } else if (type === 'SEARCH') {
            const { query } = payload;

            if (tweaksEmbeddingsCache.length === 0) {
                self.postMessage({ status: 'search_results', results: [] });
                return;
            }

            // Generate query embedding
            const out = await extractor(query, { pooling: 'mean', normalize: true });
            const queryEmbedding = Array.from(out.data) as number[];

            // Calculate similarities
            const similarities = tweaksEmbeddingsCache.map(cached => ({
                id: cached.id,
                score: cosineSimilarity(queryEmbedding, cached.embedding)
            }));

            // Sort by descending score
            similarities.sort((a, b) => b.score - a.score);

            self.postMessage({ status: 'search_results', results: similarities });
        }
    } catch (err: any) {
        self.postMessage({ status: 'error', message: err.message });
    }
});
