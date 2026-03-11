import { NextResponse } from "next/server";
import { writeFileSync, readFileSync } from "fs";
import { join, extname } from "path";
import type { LinksData } from "@/data/links";

const DATA_PATH = join(process.cwd(), "src/data/links.json");

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const ext = extname(file.name).toLowerCase() || ".jpg";
  const filename = `avatar${ext}`;
  const destPath = join(process.cwd(), "public/uploads", filename);

  const buffer = Buffer.from(await file.arrayBuffer());
  writeFileSync(destPath, buffer);

  // Update avatarUrl in links.json
  const url = `/uploads/${filename}?v=${Date.now()}`;
  const data: LinksData = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  data.profile.avatarUrl = url;
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

  return NextResponse.json({ url });
}
