import { prisma } from "@/lib/db";
import { parseFormData, saveFile } from "@/lib/upload";
import { NextRequest, NextResponse } from "next/server";

// POST /api/detectors/:id/images — upload training image with labels
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: detectorId } = await params;

  const { file, body } = await parseFormData(req, "image");
  const labelsRaw = body.labels ?? null;

  if (!file) {
    return NextResponse.json(
      { error: { code: "MISSING_FILE", message: "image file is required" } },
      { status: 400 }
    );
  }

  // Verify detector exists
  const detector = await prisma.detector.findUnique({
    where: { id: detectorId },
  });

  if (!detector) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Detector not found" } },
      { status: 404 }
    );
  }

  // Save file to disk
  const imageUrl = await saveFile(file, "training");

  // Parse labels (default to empty array if not provided)
  const labels = labelsRaw ? JSON.parse(labelsRaw) : [];

  const image = await prisma.trainingImage.create({
    data: {
      detectorId,
      imageUrl,
      labels,
    },
  });

  return NextResponse.json({ image }, { status: 201 });
}

// GET /api/detectors/:id/images — list training images
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: detectorId } = await params;

  const images = await prisma.trainingImage.findMany({
    where: { detectorId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ images });
}