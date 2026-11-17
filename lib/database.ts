import { neon } from "@neondatabase/serverless";

export function getDatabase() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    throw new Error("Set POSTGRES_URL in .env.local to find related articles.");
  }
  return neon(url);
}
