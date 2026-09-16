import "dotenv/config";
import { getAuth } from "./googleAuth.js";

export async function createGmailDraft(to, subject, body) {
    const auth = await getAuth();
    const { token } = await auth.getAccessToken();

    const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "Content-Type: text/plain; charset=utf-8",
        "",
        body,
    ].join("\r\n");

    const encodedMessage = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

    const response = await fetch(
        "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: {
                    raw: encodedMessage,
                },
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `Gmail API error ${response.status}: ${JSON.stringify(data)}`
        );
    }

    return data;
}