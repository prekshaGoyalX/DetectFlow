"use client";

import { useEffect, useState, useRef, use } from "react";
import { fetchAPI } from "@/lib/api";
import Link from "next/link";

interface TrainingImage {
  id: string;
  imageUrl: string;
  labels: { label: string }[];
  createdAt: string;
}

interface Detection {
  id: string;
  inputImageUrl: string;
  results: { label: string; confidence: number }[] | null;
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
  const [labelName, setLabelName] = useState("");
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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!labelName.trim()) {
      alert("Enter a label name first (e.g. 'cat', 'crack', 'defect')");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      const formData = new FormData();
      formData.append("image", file);
      formData.append(
        "labels",
        JSON.stringify([{ label: labelName.trim().toLowerCase() }])
      );

      await fetch(`/api/detectors/${id}/images`, {
        method: "POST",
        body: formData,
      });

      console.log(`Uploaded ${i + 1}/${files.length}: ${file.name}`);
    }

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
    cat: "#3b82f6",
    dog: "#f59e0b",
    crack: "#ef4444",
    scratch: "#f59e0b",
    dent: "#3b82f6",
    corrosion: "#8b5cf6",
    good: "#10b981",
    defect: "#ef4444",
    helmet: "#6366f1",
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
            <div className="mb-6 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label Name
                </label>
                <input
                  type="text"
                  value={labelName}
                  onChange={(e) => setLabelName(e.target.value)}
                  placeholder="e.g. cat, crack, defect, helmet"
                  className="w-full max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"                />
                <p className="text-xs text-gray-400 mt-1">
                  All images uploaded will be labeled with this name
                </p>
              </div>
                <label className="block">
                <div className="flex gap-3">
                  <label
                    className={`flex-1 border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                      labelName.trim()
                        ? "border-gray-300 hover:border-gray-400"
                        : "border-gray-200 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <p className="text-gray-500 text-sm font-medium">
                      {uploading ? `Uploading...` : "📁 Select Files"}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      {labelName.trim()
                        ? `Upload one or more images as "${labelName}"`
                        : "Enter a label name first"}
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleUpload}
                      className="hidden"
                      disabled={uploading || !labelName.trim()}
                    />
                  </label>

                  <label
                    className={`flex-1 border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer ${
                      labelName.trim()
                        ? "border-gray-300 hover:border-gray-400"
                        : "border-gray-200 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <p className="text-gray-500 text-sm font-medium">
                      {uploading ? `Uploading...` : "📂 Select Folder"}
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      {labelName.trim()
                        ? `Upload entire folder as "${labelName}"`
                        : "Enter a label name first"}
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
                      onChange={handleUpload}
                      className="hidden"
                      disabled={uploading || !labelName.trim()}
                    />
                  </label>
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
                    {detecting ? "Running classification..." : "Click to upload an image for classification"}
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
                      <div className="w-48 h-36 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={det.inputImageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
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
                          <div className="space-y-2">
                            {(det.results as { label: string; confidence: number }[]).map(
                              (r, i) => (
                                <div key={i} className="space-y-1">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-gray-700">{r.label}</span>
                                    <span className="text-gray-500">
                                      {Math.round(r.confidence * 100)}%
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div
                                      className="h-2 rounded-full transition-all"
                                      style={{
                                        width: `${r.confidence * 100}%`,
                                        backgroundColor:
                                          r.confidence > 0.7
                                            ? "#10b981"
                                            : r.confidence > 0.4
                                              ? "#f59e0b"
                                              : "#ef4444",
                                      }}
                                    />
                                  </div>
                                </div>
                              )
                            )}
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