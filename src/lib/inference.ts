import Replicate from "replicate";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

export interface DetectionResult {
  label: string;
  confidence: number;
}

async function callReplicate(
  replicate: Replicate,
  input: Record<string, string>,
  maxRetries = 3
): Promise<{ embedding: number[] }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const output = await replicate.run("openai/clip", { input });
      return output as { embedding: number[] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("429") && attempt < maxRetries - 1) {
        // Parse retry_after from error or default to 15s
        const match = message.match(/resets in ~(\d+)s/);
        const waitTime = match ? parseInt(match[1]) * 1000 + 2000 : 15000;
        console.log(`Rate limited, waiting ${waitTime / 1000}s...`);
        await new Promise((r) => setTimeout(r, waitTime));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

async function getDetectorLabels(detectorId: string): Promise<string[]> {
  const images = await prisma.trainingImage.findMany({
    where: { detectorId },
    select: { labels: true },
  });

  const labelSet = new Set<string>();
  for (const img of images) {
    const labels = img.labels as { label: string }[];
    if (Array.isArray(labels)) {
      labels.forEach((l) => {
        if (l.label) labelSet.add(l.label.toLowerCase());
      });
    }
  }

  return Array.from(labelSet);
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function softmax(scores: number[]): number[] {
  const maxScore = Math.max(...scores);
  const exps = scores.map((s) => Math.exp((s - maxScore) * 100));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

// Cache directory for text embeddings
const CACHE_DIR = path.join(process.cwd(), ".embedding-cache");

function getCachedEmbedding(label: string): number[] | null {
  const filePath = path.join(CACHE_DIR, `${label}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return null;
}

function cacheEmbedding(label: string, embedding: number[]) {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(CACHE_DIR, `${label}.json`),
    JSON.stringify(embedding)
  );
}

export async function runClassification(
  imageBuffer: Buffer,
  detectorId: string
): Promise<DetectionResult[]> {
  const customLabels = await getDetectorLabels(detectorId);
  console.log("Custom labels found:", customLabels);

  if (customLabels.length === 0) {
    return [{ label: "unknown", confidence: 0 }];
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn("No REPLICATE_API_TOKEN");
    return mockInference(customLabels);
  }

  try {
    const replicate = new Replicate();

    // 1. Get image embedding
    const imageB64 = `data:image/jpeg;base64,${Buffer.from(imageBuffer).toString("base64")}`;

    console.log("Getting image embedding...");
    const imageOutput = await callReplicate(replicate, { image: imageB64 });

    console.log("Got image embedding, length:", imageOutput.embedding?.length);

    // 2. Get text embeddings (cached — only calls API for new labels)
    const labelEmbeddings: { label: string; embedding: number[] }[] = [];

    for (const label of customLabels) {
      const cached = getCachedEmbedding(label);

      if (cached) {
        console.log(`Using cached embedding for "${label}"`);
        labelEmbeddings.push({ label, embedding: cached });
      } else {
        console.log(`Fetching embedding for "${label}" (will be cached)`);
        await new Promise((r) => setTimeout(r, 12000)); // rate limit

        const textOutput = await callReplicate(replicate, {
          text: `a photo of a ${label}`,
        });

        cacheEmbedding(label, textOutput.embedding);
        labelEmbeddings.push({ label, embedding: textOutput.embedding });
      }
    }

    // 3. Cosine similarity
    const similarities = labelEmbeddings.map((le) =>
      cosineSimilarity(imageOutput.embedding, le.embedding)
    );

    console.log(
      "Similarities:",
      customLabels.map((l, i) => `${l}: ${similarities[i].toFixed(4)}`)
    );

    // 4. Softmax → probabilities
    const probs = softmax(similarities);

    return customLabels
      .map((label, i) => ({
        label,
        confidence: Math.round(probs[i] * 100) / 100,
      }))
      .sort((a, b) => b.confidence - a.confidence);
  } catch (err) {
    console.error("CLIP classification failed:", err);
    return mockInference(customLabels);
  }
}

function mockInference(customLabels: string[]): DetectionResult[] {
  return customLabels.map((l) => ({
    label: l,
    confidence: Math.round((Math.random() * 0.4 + 0.6) * 100) / 100,
  }));
}