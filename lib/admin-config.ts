/**
 * Admin configuration stored as a JSON file on the server.
 * Lets the admin enter Stripe keys from the UI instead of editing .env files.
 * Falls back to env vars if the config file doesn't exist.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");
const CONFIG_FILE = join(DATA_DIR, "admin-config.json");

export type AdminConfig = {
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
  stripePriceId?: string;
  appUrl?: string;
};

/** Read the admin config from file. Returns empty object if file doesn't exist. */
export async function readAdminConfig(): Promise<AdminConfig> {
  try {
    const raw = await readFile(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/** Write the admin config to file. Merges with existing values. */
export async function writeAdminConfig(patch: Partial<AdminConfig>): Promise<AdminConfig> {
  await mkdir(DATA_DIR, { recursive: true });
  const existing = await readAdminConfig();
  const merged = { ...existing, ...patch };
  await writeFile(CONFIG_FILE, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}

/**
 * Resolve a config value: admin-config.json takes priority, then env var fallback.
 * This is used by Stripe utilities so keys entered in the admin UI "just work".
 */
export async function resolveConfigValue(
  key: keyof AdminConfig,
  envName: string,
): Promise<string | undefined> {
  const config = await readAdminConfig();
  const fromFile = config[key];
  if (fromFile && typeof fromFile === "string" && fromFile.length > 2) {
    return fromFile;
  }
  const fromEnv = process.env[envName];
  return fromEnv && fromEnv.length > 2 ? fromEnv : undefined;
}

/** Get all resolved Stripe config (file-first, env fallback). */
export async function getResolvedStripeConfig() {
  const [secretKey, webhookSecret, priceId, appUrl] = await Promise.all([
    resolveConfigValue("stripeSecretKey", "STRIPE_SECRET_KEY"),
    resolveConfigValue("stripeWebhookSecret", "STRIPE_WEBHOOK_SECRET"),
    resolveConfigValue("stripePriceId", "STRIPE_PRICE_ID"),
    resolveConfigValue("appUrl", "NEXT_PUBLIC_APP_URL"),
  ]);

  return {
    secretKey,
    webhookSecret,
    priceId,
    appUrl: appUrl || "http://localhost:3000",
    ready: Boolean(secretKey && webhookSecret && priceId),
  };
}
