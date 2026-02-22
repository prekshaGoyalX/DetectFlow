import { prisma } from "@/lib/db";
import { saveFile, parseFormData } from "@/lib/upload";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: detectorId } = await params;

  // Clone the request so we can read formData twice
  const clonedReq = req.clone();
  
  // Get labels from native formData
  const nativeForm = await clonedReq.formData();
  const labelsRaw = nativeForm.get("labels") as string | null;
  console.log("Labels from native formData:", labelsRaw);

  // Get file from multer
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

  const imageUrl = await saveFile(file, "training");
  const labels = labelsRaw ? JSON.parse(labelsRaw) : [];
  console.log("Parsed labels:", labels);

  const image = await prisma.trainingImage.create({
    data: { detectorId, imageUrl, labels },
  });

  return NextResponse.json({ image }, { status: 201 });
}

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