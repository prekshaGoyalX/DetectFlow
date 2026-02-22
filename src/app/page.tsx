"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "@/lib/api";
import Link from "next/link";

interface Detector {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  _count: { images: number; detections: number };
}

export default function Dashboard() {
  const [detectors, setDetectors] = useState<Detector[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Hardcoded user ID for MVP — replace with auth later
  const USER_ID = "2bb028b6-6565-4b8c-bf96-b00a15f28728";

  useEffect(() => {
    loadDetectors();
  }, []);

  async function loadDetectors() {
    setLoading(true);
    const data = await fetchAPI("/detectors");
    setDetectors(data.detectors);
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    await fetchAPI("/detectors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, userId: USER_ID}),
    });
    setName("");
    setDescription("");
    setShowForm(false);
    setCreating(false);
    loadDetectors();
  }

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    training: "bg-yellow-100 text-yellow-700",
    ready: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">DetectFlow</h1>
            <p className="text-gray-500 mt-1">
              No-code visual detection platform
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition"
          >
            + New Detector
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Detector Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Weld Crack Detector"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What should this detector find?"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition"
              >
                {creating ? "Creating..." : "Create Detector"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Detector List */}
        {loading ? (
          <p className="text-gray-400 text-center py-20">Loading...</p>
        ) : detectors.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">No detectors yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Create one to get started
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {detectors.map((d) => (
              <Link
                key={d.id}
                href={`/detectors/${d.id}`}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-sm transition block"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{d.name}</h3>
                    {d.description && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {d.description}
                      </p>
                    )}
                    <div className="flex gap-4 mt-3 text-xs text-gray-400">
                      <span>{d._count.images} training images</span>
                      <span>{d._count.detections} detections run</span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusColors[d.status] || statusColors.draft}`}
                  >
                    {d.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}