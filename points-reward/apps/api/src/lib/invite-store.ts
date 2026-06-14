import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { InviteBindingResponse, InviteBindingRow, InviteCodeRow } from "@points-reward/shared";

const inviteCodesCsv = process.env.INVITE_CODES_CSV ?? "invite-codes.csv";
const inviteBindingsCsv = process.env.INVITE_BINDINGS_CSV ?? "invite-bindings.csv";
const defaultMaxBindings = "500";
const inviteHeaders = ["邀请码", "Orderly Ref Code", "Max Bindings", "Remark"];
const inviteBindingHeaders = ["邀请码", "绑定地址", "绑定时间"];

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
let inviteCodesCache:
  | {
      file: FileSnapshot;
      rows: InviteCodeRow[];
    }
  | undefined;
let inviteBindingsCache:
  | {
      file: FileSnapshot | null;
      rows: InviteBindingRow[];
    }
  | undefined;
let inviteWriteQueue = Promise.resolve();

export async function getInviteAdminData() {
  const [rows, bindings] = await Promise.all([readInviteCodeRows(), readInviteBindingRows()]);
  return { rows, bindings };
}

export async function saveInviteAdminData(rows: InviteCodeRow[], bindings: InviteBindingRow[]) {
  return withInviteWriteLock(async () => {
    const normalizedRows = normalizeInviteRows(rows);
    const normalizedBindings = normalizeInviteBindings(bindings);
    validateInviteData(normalizedRows, normalizedBindings);
    await writeInviteRows(normalizedRows);
    await writeInviteBindings(normalizedBindings);
    return {
      rows: normalizedRows,
      bindings: normalizedBindings
    };
  });
}

export async function getInviteBinding(address: string): Promise<InviteBindingResponse> {
  const normalizedAddress = normalizeAddress(address);
  const [rows, bindings] = await Promise.all([readInviteCodeRows(), readInviteBindingRows()]);
  const binding = bindings.find((item) => normalizeAddress(item.boundAddress) === normalizedAddress);

  if (!binding) {
    return {
      bound: false,
      address
    };
  }

  const invite = findInviteRow(rows, binding.inviteCode);

  return {
    bound: true,
    address: binding.boundAddress,
    inviteCode: binding.inviteCode,
    orderlyRefCode: invite?.orderlyRefCode ?? "",
    boundAt: binding.boundAt
  };
}

export async function bindInviteCode(input: unknown): Promise<InviteBindingResponse> {
  return withInviteWriteLock(async () => {
    const payload = bindInviteSchema.parse(input);
    const address = payload.address.trim();
    const normalizedAddress = normalizeAddress(address);
    const inviteCode = normalizeInviteCode(payload.inviteCode);

    const [rows, bindings] = await Promise.all([readInviteCodeRows(), readInviteBindingRows()]);
    const existingBinding = bindings.find(
      (row) => normalizeAddress(row.boundAddress) === normalizedAddress
    );

    if (existingBinding) {
      const invite = findInviteRow(rows, existingBinding.inviteCode);
      return {
        bound: true,
        address: existingBinding.boundAddress,
        inviteCode: existingBinding.inviteCode,
        orderlyRefCode: invite?.orderlyRefCode ?? "",
        boundAt: existingBinding.boundAt
      };
    }

    const row = findInviteRow(rows, inviteCode);

    if (!row) {
      throw new Error("Invite code not found.");
    }

    const currentBindingCount = bindings.filter(
      (binding) => normalizeInviteCode(binding.inviteCode) === inviteCode
    ).length;

    if (currentBindingCount >= getMaxBindings(row)) {
      throw new Error("Invite code has reached its binding limit.");
    }

    const binding = {
      inviteCode: row.inviteCode,
      boundAddress: address,
      boundAt: new Date().toISOString()
    };
    const nextBindings = [...bindings, binding];
    validateInviteData(rows, nextBindings);
    await writeInviteBindings(nextBindings);

    return {
      bound: true,
      address: binding.boundAddress,
      inviteCode: row.inviteCode,
      orderlyRefCode: row.orderlyRefCode,
      boundAt: binding.boundAt
    };
  });
}

async function readInviteCodeRows() {
  const file = await readDataFileSnapshot(inviteCodesCsv);

  if (inviteCodesCache && isSameSnapshot(inviteCodesCache.file, file)) {
    return inviteCodesCache.rows;
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
    maxBindings:
      getCsvValue(row, "Max Bindings", "max_bindings", "maxBindings", "binding_limit") ||
      defaultMaxBindings,
    remark: getCsvValue(row, "Remark", "remark")
  }));

  inviteCodesCache = {
    file,
    rows
  };

  return rows;
}

async function readInviteBindingRows() {
  const file = await readOptionalDataFileSnapshot(inviteBindingsCsv);

  if (
    inviteBindingsCache &&
    ((inviteBindingsCache.file === null && file === null) ||
      (inviteBindingsCache.file !== null && file !== null && isSameSnapshot(inviteBindingsCache.file, file)))
  ) {
    return inviteBindingsCache.rows;
  }

  const rows =
    file === null
      ? await readLegacyInviteBindings()
      : parseCsv(file.content).map((row) => ({
          inviteCode: getCsvValue(row, "邀请码", "invite_code", "inviteCode"),
          boundAddress: getCsvValue(row, "绑定地址", "bound_address", "boundAddress", "address"),
          boundAt: getCsvValue(row, "绑定时间", "bound_at", "boundAt")
        }));

  inviteBindingsCache = {
    file,
    rows
  };

  return rows;
}

async function readLegacyInviteBindings() {
  const file = await readDataFileSnapshot(inviteCodesCsv);

  return parseCsv(file.content)
    .map((row) => ({
      inviteCode: getCsvValue(row, "邀请码", "invite_code", "inviteCode"),
      boundAddress: getCsvValue(row, "绑定地址", "bound_address", "boundAddress", "address"),
      boundAt: getCsvValue(row, "绑定时间", "bound_at", "boundAt")
    }))
    .filter((row) => row.boundAddress.trim());
}

function toInviteCsvRow(row: InviteCodeRow) {
  return {
    邀请码: row.inviteCode,
    "Orderly Ref Code": row.orderlyRefCode,
    "Max Bindings": row.maxBindings,
    Remark: row.remark
  };
}

function toInviteBindingCsvRow(row: InviteBindingRow) {
  return {
    邀请码: row.inviteCode,
    绑定地址: row.boundAddress,
    绑定时间: row.boundAt
  };
}

function normalizeInviteRows(rows: InviteCodeRow[]) {
  return rows.map((row) => ({
    inviteCode: normalizeInviteCode(row.inviteCode),
    orderlyRefCode: (row.orderlyRefCode ?? "").trim(),
    maxBindings: normalizeMaxBindings(row.maxBindings),
    remark: (row.remark ?? "").trim()
  }));
}

function normalizeInviteBindings(rows: InviteBindingRow[]) {
  return rows.map((row) => ({
    inviteCode: normalizeInviteCode(row.inviteCode),
    boundAddress: row.boundAddress.trim(),
    boundAt: row.boundAt.trim()
  }));
}

function validateInviteData(rows: InviteCodeRow[], bindings: InviteBindingRow[]) {
  const inviteCodes = new Set<string>();
  const boundAddresses = new Set<string>();
  const bindingCountsByInviteCode = new Map<string, number>();

  for (const row of rows) {
    const inviteCode = normalizeInviteCode(row.inviteCode);

    if (!inviteCode) {
      throw new Error("Invite code cannot be empty.");
    }

    if (inviteCodes.has(inviteCode)) {
      throw new Error(`Duplicate invite code: ${row.inviteCode}`);
    }

    inviteCodes.add(inviteCode);
  }

  for (const binding of bindings) {
    const inviteCode = normalizeInviteCode(binding.inviteCode);
    const boundAddress = normalizeAddress(binding.boundAddress);

    if (!inviteCode || !boundAddress) {
      continue;
    }

    if (!inviteCodes.has(inviteCode)) {
      throw new Error(`Binding references unknown invite code: ${binding.inviteCode}`);
    }

    if (boundAddresses.has(boundAddress)) {
      throw new Error(`Address has already bound an invite code: ${binding.boundAddress}`);
    }

    boundAddresses.add(boundAddress);
    bindingCountsByInviteCode.set(inviteCode, (bindingCountsByInviteCode.get(inviteCode) ?? 0) + 1);
  }

  for (const row of rows) {
    const inviteCode = normalizeInviteCode(row.inviteCode);
    const bindingCount = bindingCountsByInviteCode.get(inviteCode) ?? 0;

    if (bindingCount > getMaxBindings(row)) {
      throw new Error(
        `Invite code ${row.inviteCode} has ${bindingCount} bindings, above max ${row.maxBindings}`
      );
    }
  }
}

async function writeInviteRows(rows: InviteCodeRow[]) {
  await writeDataFile(inviteCodesCsv, stringifyCsv(inviteHeaders, rows.map(toInviteCsvRow)));
}

async function writeInviteBindings(rows: InviteBindingRow[]) {
  await writeDataFile(
    inviteBindingsCsv,
    stringifyCsv(inviteBindingHeaders, rows.map(toInviteBindingCsvRow))
  );
}

async function withInviteWriteLock<T>(action: () => Promise<T>) {
  const run = inviteWriteQueue.then(action, action);
  inviteWriteQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function findInviteRow(rows: InviteCodeRow[], inviteCode: string) {
  const normalizedInviteCode = normalizeInviteCode(inviteCode);
  return rows.find((row) => normalizeInviteCode(row.inviteCode) === normalizedInviteCode);
}

function getMaxBindings(row: InviteCodeRow) {
  const maxBindings = Number(row.maxBindings);
  return Number.isFinite(maxBindings) && maxBindings > 0
    ? Math.floor(maxBindings)
    : Number(defaultMaxBindings);
}

function normalizeMaxBindings(maxBindings: string) {
  const value = maxBindings.trim() || defaultMaxBindings;
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue < 1) {
    throw new Error(`Max Bindings must be a positive integer: ${maxBindings}`);
  }

  return String(numericValue);
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

  return {
    content: await readFile(absolutePath, "utf8"),
    mtimeMs: stats.mtimeMs,
    size: stats.size
  };
}

async function readOptionalDataFileSnapshot(relativePath: string): Promise<FileSnapshot | null> {
  try {
    return await readDataFileSnapshot(relativePath);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return null;
    }

    throw error;
  }
}

async function writeDataFile(relativePath: string, content: string) {
  await writeFile(path.join(await getDataDir(), relativePath), content, "utf8");
  inviteCodesCache = undefined;
  inviteBindingsCache = undefined;
}

function isSameSnapshot(left: FileSnapshot, right: FileSnapshot) {
  return left.mtimeMs === right.mtimeMs && left.size === right.size;
}

function isFileNotFoundError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
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
