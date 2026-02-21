import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import { Readable } from "stream";
import type { NextRequest } from "next/server";

const UPLOAD_DIR = path.join(process.cwd(), "public/uploads");

const uploader = multer({ storage: multer.memoryStorage() });

interface ParsedFile {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
}

export async function parseFormData(
  req: NextRequest,
  fieldName: string
): Promise<{ file: ParsedFile | null; body: Record<string, string> }> {
  // Read the Web API ReadableStream into a Node.js Buffer
  const chunks: Buffer[] = [];
  if (req.body) {
    const reader = req.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(Buffer.from(value));
    }
  }
  const bodyBuffer = Buffer.concat(chunks);

  // Build a fake Node.js IncomingMessage so multer can parse it
  const readable = new Readable({
    read() {
      this.push(bodyBuffer);
      this.push(null);
    },
  });
  const fakeReq = Object.assign(readable, {
    headers: Object.fromEntries(req.headers),
    method: req.method || "POST",
  });

  return new Promise((resolve, reject) => {
    uploader.single(fieldName)(fakeReq as any, {} as any, (err: unknown) => {
      if (err) return reject(err);
      const r = fakeReq as any;
      resolve({ file: r.file ?? null, body: r.body ?? {} });
    });
  });
}

export async function saveFile(
  file: ParsedFile,
  subfolder: "training" | "detections"
): Promise<string> {
  const ext = path.extname(file.originalname) || ".jpg";
  const filename = `${uuidv4()}${ext}`;
  const dir = path.join(UPLOAD_DIR, subfolder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), file.buffer);
  return `/uploads/${subfolder}/${filename}`;
}
