import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/detectors — list all detectors
export async function GET() {
  const detectors = await prisma.detector.findMany({
    include: {
      _count: { select: { images: true, detections: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ detectors });
}

// POST /api/detectors — create a new detector
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, userId} = body;

  if (!name || !userId) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "name and userId are required" } },
      { status: 400 }
    );
  }

  const detector = await prisma.detector.create({
    data: { name, description, userId},
  });

  return NextResponse.json({ detector }, { status: 201 });
}