import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { InviteBindingResponse, InviteCodeRow } from "@points-reward/shared";

const inviteCodesCsv = process.env.INVITE_CODES_CSV ?? "invite-codes.csv";
const inviteHeaders = ["邀请码", "Orderly Ref Code", "绑定地址", "绑定时间"];

const bindInviteSchema = z.object({
  address: z.string().min(1),
  inviteCode: z.string().min(6).max(6)
});

type FileSnapshot = {
  content: string;
  mtimeMs: number;
  size: number;
};

let dataDirPromise: Promise<string> | undefined;
let inviteRowsCache:
  | {
      file: FileSnapshot;
      rows: InviteCodeRow[];
    }
  | undefined;
let inviteWriteQueue = Promise.resolve();

export async function getInviteCodeRows() {
  return readInviteCodeRows();
}

export async function saveInviteCodeRows(rows: InviteCodeRow[]) {
  return withInviteWriteLock(async () => {
    const normalizedRows = normalizeInviteRows(rows);
    validateInviteRows(normalizedRows);
    await writeInviteRows(normalizedRows);
    return normalizedRows;
  });
}

export async function getInviteBinding(address: string): Promise<InviteBindingResponse> {
  const normalizedAddress = normalizeAddress(address);
  const rows = await readInviteCodeRows();
  const row = rows.find((item) => normalizeAddress(item.boundAddress) === normalizedAddress);

  if (!row) {
    return {
      bound: false,
      address
    };
  }

  return {
    bound: true,
    address: row.boundAddress,
    inviteCode: row.inviteCode,
    orderlyRefCode: row.orderlyRefCode,
    boundAt: row.boundAt
  };
}

export async function bindInviteCode(input: unknown): Promise<InviteBindingResponse> {
  return withInviteWriteLock(async () => {
    const payload = bindInviteSchema.parse(input);
    const address = payload.address.trim();
    const normalizedAddress = normalizeAddress(address);
    const inviteCode = normalizeInviteCode(payload.inviteCode);

    const rows = await readInviteCodeRows();
    const existingAddressRow = rows.find(
      (row) => normalizeAddress(row.boundAddress) === normalizedAddress
    );

    if (existingAddressRow) {
      return {
        bound: true,
        address: existingAddressRow.boundAddress,
        inviteCode: existingAddressRow.inviteCode,
        orderlyRefCode: existingAddressRow.orderlyRefCode,
        boundAt: existingAddressRow.boundAt
      };
    }

    const row = rows.find((item) => normalizeInviteCode(item.inviteCode) === inviteCode);

    if (!row) {
      throw new Error("Invite code not found.");
    }

    if (row.boundAddress.trim()) {
      throw new Error("Invite code has already been used.");
    }

    row.boundAddress = address;
    row.boundAt = new Date().toISOString();
    validateInviteRows(rows);
    await writeInviteRows(rows);

    return {
      bound: true,
      address: row.boundAddress,
      inviteCode: row.inviteCode,
      orderlyRefCode: row.orderlyRefCode,
      boundAt: row.boundAt
    };
  });
}

async function readInviteCodeRows() {
  const file = await readDataFileSnapshot(inviteCodesCsv);

  if (inviteRowsCache && isSameSnapshot(inviteRowsCache.file, file)) {
    return inviteRowsCache.rows;
  }

  const rows = parseCsv(file.content).map((row) => ({
    inviteCode: getCsvValue(row, "邀请码", "invite_code", "inviteCode"),
    orderlyRefCode: getCsvValue(
      row,
      "Orderly Ref Code",
      "orderly_ref_code",
      "orderlyRefCode",
      "ref",
      "ref_code",
      "refCode"
    ),
    boundAddress: getCsvValue(row, "绑定地址", "bound_address", "boundAddress"),
    boundAt: getCsvValue(row, "绑定时间", "bound_at", "boundAt")
  }));

  inviteRowsCache = {
    file,
    rows
  };

  return rows;
}

function toCsvRow(row: InviteCodeRow) {
  return {
    邀请码: row.inviteCode,
    "Orderly Ref Code": row.orderlyRefCode,
    绑定地址: row.boundAddress,
    绑定时间: row.boundAt
  };
}

function normalizeInviteRows(rows: InviteCodeRow[]) {
  return rows.map((row) => ({
    inviteCode: normalizeInviteCode(row.inviteCode),
    orderlyRefCode: (row.orderlyRefCode ?? "").trim(),
    boundAddress: row.boundAddress.trim(),
    boundAt: row.boundAt.trim()
  }));
}

function validateInviteRows(rows: InviteCodeRow[]) {
  const inviteCodes = new Set<string>();
  const boundAddresses = new Set<string>();

  for (const row of rows) {
    const inviteCode = normalizeInviteCode(row.inviteCode);

    if (!inviteCode) {
      throw new Error("Invite code cannot be empty.");
    }

    if (inviteCodes.has(inviteCode)) {
      throw new Error(`Duplicate invite code: ${row.inviteCode}`);
    }

    inviteCodes.add(inviteCode);

    const boundAddress = normalizeAddress(row.boundAddress);

    if (!boundAddress) {
      continue;
    }

    if (boundAddresses.has(boundAddress)) {
      throw new Error(`Address has already bound an invite code: ${row.boundAddress}`);
    }

    boundAddresses.add(boundAddress);
  }
}

async function writeInviteRows(rows: InviteCodeRow[]) {
  await writeDataFile(inviteCodesCsv, stringifyCsv(inviteHeaders, rows.map(toCsvRow)));
}

async function withInviteWriteLock<T>(action: () => Promise<T>) {
  const run = inviteWriteQueue.then(action, action);
  inviteWriteQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function parseCsv(csv: string): Record<string, string>[] {
  const rows = parseCsvRows(csv).filter((row) => row.some((cell) => cell.trim() !== ""));

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => normalizeHeader(header));

  return rows.slice(1).map((row) => {
    const record: Record<string, string> = {};

    headers.forEach((header, index) => {
      record[header] = row[index]?.trim() ?? "";
    });

    return record;
  });
}

function stringifyCsv(headers: string[], rows: Record<string, string>[]) {
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header] ?? "")).join(","))
  ];

  return `${lines.join("\n")}\n`;
}

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentCell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  rows.push(currentRow);

  return rows;
}

function getCsvValue(row: Record<string, string>, ...headers: string[]) {
  for (const header of headers) {
    const value = row[normalizeHeader(header)];

    if (value !== undefined) {
      return value;
    }
  }

  return "";
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase();
}

function normalizeInviteCode(inviteCode: string) {
  return inviteCode.trim().toUpperCase();
}

function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

async function readDataFileSnapshot(relativePath: string): Promise<FileSnapshot> {
  const absolutePath = path.join(await getDataDir(), relativePath);
  const stats = await stat(absolutePath);

  if (
    inviteRowsCache &&
    inviteRowsCache.file.mtimeMs === stats.mtimeMs &&
    inviteRowsCache.file.size === stats.size
  ) {
    return inviteRowsCache.file;
  }

  return {
    content: await readFile(absolutePath, "utf8"),
    mtimeMs: stats.mtimeMs,
    size: stats.size
  };
}

async function writeDataFile(relativePath: string, content: string) {
  await writeFile(path.join(await getDataDir(), relativePath), content, "utf8");
  inviteRowsCache = undefined;
}

function isSameSnapshot(left: FileSnapshot, right: FileSnapshot) {
  return left.mtimeMs === right.mtimeMs && left.size === right.size;
}

async function getDataDir() {
  dataDirPromise ??= resolveDataDir();
  return dataDirPromise;
}

async function resolveDataDir() {
  if (process.env.POINTS_DATA_DIR) {
    return process.env.POINTS_DATA_DIR;
  }

  return findDataDir(process.cwd());
}

async function findDataDir(startDir: string): Promise<string> {
  let currentDir = startDir;

  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = path.join(currentDir, "data");

    try {
      await readFile(path.join(candidate, "campaigns.json"), "utf8");
      return candidate;
    } catch {
      const parent = path.dirname(currentDir);

      if (parent === currentDir) {
        break;
      }

      currentDir = parent;
    }
  }

  throw new Error("Cannot find data/campaigns.json. Set POINTS_DATA_DIR to override.");
}
