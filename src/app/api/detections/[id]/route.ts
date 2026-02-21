import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/detections/:id — get detection result (poll this)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const detection = await prisma.detection.findUnique({
    where: { id },
  });

  if (!detection) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Detection not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ detection });
}