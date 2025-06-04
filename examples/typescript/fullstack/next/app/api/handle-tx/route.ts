import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readFile, writeFile, mkdir } from "fs/promises";

const DATA_DIR = path.join(process.cwd(), "data");
const TX_HASH_DB_FILE = path.join(DATA_DIR, "txHash.json");

async function initializeTxHashDb() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(TX_HASH_DB_FILE, "[]", { encoding: "utf-8" });
    return [];
  } catch (error) {
    console.error("Failed to initialize txHash database:", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  const { txHash } = await req.json();

  if (!txHash) {
    return NextResponse.json({ error: "Missing txHash" }, { status: 400 });
  }

  let txHashDb: string[];
  try {
    const txHashDbRaw = await readFile(TX_HASH_DB_FILE, "utf-8");
    txHashDb = JSON.parse(txHashDbRaw);

    if (!Array.isArray(txHashDb)) {
      txHashDb = await initializeTxHashDb();
    }
  } catch {
    txHashDb = await initializeTxHashDb();
  }

  if (txHashDb.includes(txHash)) {
    return NextResponse.json(
      { error: "Transaction already used" },
      { status: 400 }
    );
  }

  txHashDb.push(txHash);
  await writeFile(TX_HASH_DB_FILE, JSON.stringify(txHashDb), {
    encoding: "utf-8",
  });

  return NextResponse.json({ success: true });
}
