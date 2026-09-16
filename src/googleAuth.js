import "dotenv/config";
import path from "node:path";
import fs from "node:fs/promises";
import { authenticate } from "@google-cloud/local-auth";
import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/gmail.compose",
];

const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
const TOKEN_PATH = path.join(process.cwd(), "token.json");

let authClient = null;

export async function getAuth() {
  if (authClient) {
    return authClient;
  }

  // Try to reuse the saved refresh token.
  try {
    const token = JSON.parse(
      await fs.readFile(TOKEN_PATH, "utf8")
    );

    authClient = google.auth.fromJSON(token);

    return authClient;
  } catch {
    console.log("Google authentication required...");
  }

  // First-time authentication.
  authClient = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  const credentials = JSON.parse(
    await fs.readFile(CREDENTIALS_PATH, "utf8")
  );

  const installed = credentials.installed;

  const token = {
    type: "authorized_user",
    client_id: installed.client_id,
    client_secret: installed.client_secret,
    refresh_token: authClient.credentials.refresh_token,
  };

  await fs.writeFile(
    TOKEN_PATH,
    JSON.stringify(token, null, 2)
  );

  console.log("Google authentication saved.");

  return authClient;
}