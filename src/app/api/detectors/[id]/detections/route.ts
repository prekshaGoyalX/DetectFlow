import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: detectorId } = await params;

  const detections = await prisma.detection.findMany({
    where: { detectorId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ detections });
}