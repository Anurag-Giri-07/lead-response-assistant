import {
  getLeads,
  updateLeadClassification,
  updateLeadStatus,
} from "./sheets.js";

import { classifyLead, draftReply } from "./gemini.js";
import { createGmailDraft } from "./gmail.js";

const result = await getLeads();
const rows = result.values || [];
console.log(`Found ${Math.max(rows.length - 1, 0)} lead(s) in the sheet.`);

if (rows.length <= 1) {
  console.log("No leads found.");
  process.exit(0);
}

let processedCount = 0;

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const rowNumber = i + 1;

  const lead = {
    name: row[1] || "",
    email: row[2] || "",
    company: row[3] || "",
    message: row[4] || "",
    status: row[5] || "",
    intent: row[6] || "",
    urgency: row[7] || "",
  };

  if (lead.status) {
    console.log(
      `Skipping row ${rowNumber} (${lead.company}) — already processed: ${lead.status}`
    );
    continue;
  }

  console.log(`\nProcessing lead from ${lead.company}...`);

  const classification = await classifyLead(lead);

  console.log("Classification:", classification);

  await updateLeadClassification(
    rowNumber,
    classification.intent,
    classification.urgency
  );

  console.log("Sheet classification updated.");

  if (classification.intent === "spam") {
    await updateLeadStatus(rowNumber, "Spam");
    console.log("Spam lead skipped.");
    processedCount++;
    continue;
  }

  const reply = await draftReply(lead, classification);

  console.log("\nGenerated reply:\n");
  console.log(reply);

  const draft = await createGmailDraft(
    lead.email,
    "Re: Your inquiry",
    reply
  );

  console.log(`Gmail draft created: ${draft.id}`);

  await updateLeadStatus(rowNumber, "Draft Created");

  console.log(`Lead row ${rowNumber} completed.`);

  processedCount++;
}

if (processedCount === 0) {
  console.log("\nNo new leads to process.");
} else {
  console.log(`\nDone. Processed ${processedCount} new lead(s).`);
}