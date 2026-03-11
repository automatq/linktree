import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { LinksData } from "@/data/links";

const DATA_PATH = join(process.cwd(), "src/data/links.json");

function readData(): LinksData {
  return JSON.parse(readFileSync(DATA_PATH, "utf-8"));
}

function writeData(data: LinksData) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

export async function GET() {
  return NextResponse.json(readData());
}

export async function POST(req: Request) {
  const body: LinksData = await req.json();
  writeData(body);
  return NextResponse.json({ ok: true });
}
