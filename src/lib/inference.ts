export interface DetectionResult {
  label: string;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
}

export async function runObjectDetection(
  imageBuffer: Buffer
): Promise<DetectionResult[]> {
  const HF_TOKEN = process.env.HF_API_TOKEN;

  if (!HF_TOKEN) {
    console.warn("No HF_API_TOKEN found, using mock inference");
    return mockInference();
  }

  try {
    const response = await fetch(
      "https://router.huggingface.co/hf-inference/models/facebook/detr-resnet-50",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "image/jpeg",
        },
        body: new Uint8Array(imageBuffer),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("HuggingFace API error:", error);

      // Model might be loading — HF returns 503 while warming up
      if (response.status === 503) {
        console.log("Model is loading, retrying in 10s...");
        await new Promise((r) => setTimeout(r, 10000));
        return runObjectDetection(imageBuffer);
      }

      return mockInference();
    }

    const results = await response.json();

    // HuggingFace returns: [{label, score, box: {xmin, ymin, xmax, ymax}}]
    return results.map(
      (r: {
        label: string;
        score: number;
        box: { xmin: number; ymin: number; xmax: number; ymax: number };
      }) => ({
        label: r.label,
        confidence: Math.round(r.score * 100) / 100,
        bbox: {
          x: r.box.xmin,
          y: r.box.ymin,
          w: r.box.xmax - r.box.xmin,
          h: r.box.ymax - r.box.ymin,
        },
      })
    );
  } catch (err) {
    console.error("Inference failed:", err);
    return mockInference();
  }
}

// Fallback when no API token or API is down
function mockInference(): DetectionResult[] {
  const labels = ["crack", "scratch", "dent", "corrosion", "good"];
  const numDetections = Math.floor(Math.random() * 3) + 1;

  return Array.from({ length: numDetections }, () => ({
    label: labels[Math.floor(Math.random() * labels.length)],
    confidence: Math.round((Math.random() * 0.4 + 0.6) * 100) / 100,
    bbox: {
      x: Math.floor(Math.random() * 200),
      y: Math.floor(Math.random() * 200),
      w: Math.floor(Math.random() * 100) + 50,
      h: Math.floor(Math.random() * 100) + 50,
    },
  }));
}