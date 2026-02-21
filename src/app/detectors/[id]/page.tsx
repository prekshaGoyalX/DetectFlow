"use client";

import { useEffect, useState, useRef, use } from "react";
import { fetchAPI } from "@/lib/api";
import Link from "next/link";

interface TrainingImage {
  id: string;
  imageUrl: string;
  labels: { label: string; bbox: { x: number; y: number; w: number; h: number } }[];
  createdAt: string;
}

interface Detection {
  id: string;
  inputImageUrl: string;
  results: { label: string; confidence: number; bbox: { x: number; y: number; w: number; h: number } }[] | null;
  status: string;
  processingTimeMs: number | null;
  createdAt: string;
}

interface Detector {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

export default function DetectorDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detector, setDetector] = useState<Detector | null>(null);
  const [images, setImages] = useState<TrainingImage[]>([]);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [tab, setTab] = useState<"train" | "detect">("train");
  const [uploading, setUploading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detectInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDetector();
    loadImages();
    loadDetections();
  }, [id]);

  async function loadDetector() {
    const data = await fetchAPI(`/detectors`);
    const found = data.detectors.find((d: Detector) => d.id === id);
    setDetector(found || null);
  }

  async function loadImages() {
    const data = await fetchAPI(`/detectors/${id}/images`);
    setImages(data.images);
  }

  async function loadDetections() {
    const data = await fetchAPI(`/detectors/${id}/detections`);
    setDetections(data.detections);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("labels", JSON.stringify([]));

    await fetch(`/api/detectors/${id}/images`, {
      method: "POST",
      body: formData,
    });

    setUploading(false);
    loadImages();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDetect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDetecting(true);

    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`/api/detectors/${id}/detect`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    // Poll for results
    const detectionId = data.detection.id;
    const poll = setInterval(async () => {
      const result = await fetchAPI(`/detections/${detectionId}`);
      if (result.detection.status === "complete" || result.detection.status === "failed") {
        clearInterval(poll);
        setDetecting(false);
        loadDetections();
      }
    }, 1000);

    if (detectInputRef.current) detectInputRef.current.value = "";
  }

  const labelColors: Record<string, string> = {
    crack: "#ef4444",
    scratch: "#f59e0b",
    dent: "#3b82f6",
    corrosion: "#8b5cf6",
    good: "#10b981",
  };

  if (!detector) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition">
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{detector.name}</h1>
          {detector.description && <p className="text-gray-500 mt-0.5">{detector.description}</p>}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
          <button
            onClick={() => setTab("train")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === "train" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Training Images ({images.length})
          </button>
          <button
            onClick={() => setTab("detect")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === "detect" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Detections ({detections.length})
          </button>
        </div>

        {/* Training Tab */}
        {tab === "train" && (
          <div>
            <div className="mb-6">
              <label className="block">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition cursor-pointer">
                  <p className="text-gray-500 text-sm">
                    {uploading ? "Uploading..." : "Click to upload training images"}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">JPG, PNG — any size</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </div>
              </label>
            </div>

            {images.length === 0 ? (
              <p className="text-gray-400 text-center py-10">No training images yet</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((img) => (
                  <div key={img.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <img src={img.imageUrl} alt="" className="w-full h-40 object-cover" />
                    <div className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {img.labels.length > 0 ? (
                          img.labels.map((l, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: labelColors[l.label] || "#6b7280" }}
                            >
                              {l.label}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">No labels</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Detection Tab */}
        {tab === "detect" && (
          <div>
            <div className="mb-6">
              <label className="block">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-gray-400 transition cursor-pointer">
                  <p className="text-gray-500 text-sm">
                    {detecting ? "Running detection..." : "Click to upload an image for detection"}
                  </p>
                  <input
                    ref={detectInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleDetect}
                    className="hidden"
                    disabled={detecting}
                  />
                </div>
              </label>
            </div>

            {detections.length === 0 ? (
              <p className="text-gray-400 text-center py-10">No detections yet</p>
            ) : (
              <div className="space-y-4">
                {detections.map((det) => (
                  <div key={det.id} className="bg-white border border-gray-200 rounded-xl p-4">
                    <div className="flex gap-4">
                      {/* Image with bounding boxes */}
                      <div className="relative w-64 h-48 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={det.inputImageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {det.results?.map((r, i) => (
                          <div
                            key={i}
                            className="absolute border-2 rounded"
                            style={{
                              left: `${(r.bbox.x / 400) * 100}%`,
                              top: `${(r.bbox.y / 400) * 100}%`,
                              width: `${(r.bbox.w / 400) * 100}%`,
                              height: `${(r.bbox.h / 400) * 100}%`,
                              borderColor: labelColors[r.label] || "#6b7280",
                            }}
                          >
                            <span
                              className="absolute -top-5 left-0 text-xs px-1 rounded text-white whitespace-nowrap"
                              style={{ backgroundColor: labelColors[r.label] || "#6b7280" }}
                            >
                              {r.label} {Math.round(r.confidence * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Results */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              det.status === "complete"
                                ? "bg-green-100 text-green-700"
                                : det.status === "failed"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {det.status}
                          </span>
                          {det.processingTimeMs && (
                            <span className="text-xs text-gray-400">
                              {det.processingTimeMs}ms
                            </span>
                          )}
                        </div>
                        {det.results && (
                          <div className="space-y-1">
                            {det.results.map((r, i) => (
                              <div key={i} className="flex items-center gap-2 text-sm">
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: labelColors[r.label] || "#6b7280" }}
                                />
                                <span className="text-gray-700">{r.label}</span>
                                <span className="text-gray-400">
                                  {Math.round(r.confidence * 100)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-3">
                          {new Date(det.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}