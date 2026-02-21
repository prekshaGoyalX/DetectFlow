import { prisma } from "@/lib/db";
import { saveFile, parseFormData } from "@/lib/upload";
import { runObjectDetection } from "@/lib/inference";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: detectorId } = await params;
  const { file } = await parseFormData(req, "image");

  if (!file) {
    return NextResponse.json(
      { error: { code: "MISSING_FILE", message: "image file is required" } },
      { status: 400 }
    );
  }

  const detector = await prisma.detector.findUnique({
    where: { id: detectorId },
  });

  if (!detector) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Detector not found" } },
      { status: 404 }
    );
  }

  const inputImageUrl = await saveFile(file, "detections");

  const detection = await prisma.detection.create({
    data: {
      detectorId,
      inputImageUrl,
      status: "processing",
    },
  });

  // Run inference in background
  const startTime = Date.now();

  // Don't await — let it run async
  runObjectDetection(file.buffer)
    .then(async (results) => {
      await prisma.detection.update({
        where: { id: detection.id },
        data: {
          results: JSON.parse(JSON.stringify(results)),
          status: "complete",
          processingTimeMs: Date.now() - startTime,
          processedAt: new Date(),
        },
      });
    })
    .catch(async (err) => {
      console.error("Detection failed:", err);
      await prisma.detection.update({
        where: { id: detection.id },
        data: { status: "failed" },
      });
    });

  return NextResponse.json(
    { detection: { id: detection.id, status: "processing" } },
    { status: 202 }
  );
}