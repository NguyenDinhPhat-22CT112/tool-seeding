import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const E2E_SCHEMA = "toolseeding_e2e";
const envCandidates = [
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../../.env"),
];
const envPath = envCandidates.find((candidate) => existsSync(candidate));

if (envPath) {
  process.loadEnvFile(envPath);
}

const explicitE2eUrl = process.env.E2E_DATABASE_URL;
const sourceUrl = explicitE2eUrl ?? process.env.DATABASE_URL;
if (!sourceUrl) {
  throw new Error("Thiếu E2E_DATABASE_URL hoặc DATABASE_URL");
}
if (process.env.NODE_ENV === "production") {
  throw new Error("Không được chạy E2E database reset khi NODE_ENV=production");
}

const databaseUrl = new URL(sourceUrl);
const isLocal = ["localhost", "127.0.0.1", "::1"].includes(databaseUrl.hostname);
if (!explicitE2eUrl && !isLocal) {
  throw new Error(
    "DATABASE_URL không phải local. Hãy cung cấp E2E_DATABASE_URL dành riêng cho test.",
  );
}

databaseUrl.searchParams.set("schema", E2E_SCHEMA);
process.env.DATABASE_URL = databaseUrl.toString();
process.env.NODE_ENV = "test";

const prisma = new PrismaClient();
const packageManagerCli = process.env.npm_execpath;

async function resetSchema() {
  await prisma.$executeRawUnsafe(
    `DROP SCHEMA IF EXISTS "${E2E_SCHEMA}" CASCADE`,
  );
}

function run(args) {
  const command = packageManagerCli ? process.execPath : "pnpm";
  const commandArgs = packageManagerCli ? [packageManagerCli, ...args] : args;
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

let exitCode = 1;
try {
  await resetSchema();
  const migrationStatus = run(["exec", "prisma", "migrate", "deploy"]);
  if (migrationStatus !== 0) {
    throw new Error("Không thể apply migration cho schema E2E");
  }

  exitCode = run([
    "exec",
    "vitest",
    "run",
    "--config",
    "vitest.e2e.config.ts",
  ]);
} finally {
  await resetSchema();
  await prisma.$disconnect();
}

process.exitCode = exitCode;
