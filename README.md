# AI Lead Response Assistant

An AI-powered lead follow-up workflow that classifies inbound business leads, drafts personalized email responses, and creates Gmail drafts for human review.

Built as part of the Crework AI Engineer Intern assignment.

## What it does

The workflow turns a new lead form submission into a review-ready email draft:

Google Form → Google Sheets → Node.js → Gemini → Gmail Draft

For each new lead, the workflow:

1. Reads the lead from Google Sheets.
2. Uses Gemini to classify the lead by intent and urgency.
3. Updates the classification in the sheet.
4. Filters out spam.
5. Generates a personalized response using a business playbook.
6. Creates a Gmail draft addressed to the lead.
7. Marks the lead as processed in the sheet.

The final email is intentionally left as a Gmail draft so a human can review and send it.

## Why this workflow

For small and mid-sized service businesses, inbound leads can go cold when nobody responds quickly enough.

The workflow removes repetitive first-response work while keeping a human in control of the final message.

Instead of building a new CRM or frontend application, this implementation connects existing business tools with an AI model.

## AI capability

The workflow is built around the Gemini Flash model family and its tunable reasoning configuration.

The implementation uses a lower reasoning level for lead classification and response drafting because these tasks are relatively lightweight and latency-sensitive.

The Gemini integration also includes model fallback handling. If a selected model temporarily fails because of availability or rate limiting, the workflow tries another compatible Flash model and saves the successful model for subsequent runs.

## Lead classification

Each lead is classified into one of these intents:

- `pricing_inquiry`
- `partnership`
- `support`
- `general_inquiry`
- `spam`

Each lead also receives an urgency level:

- `high`
- `medium`
- `low`

The classification is written back to Google Sheets before the response is generated.

## Business playbook

The response generator uses `data/playbook.json` as the business knowledge layer.

The playbook contains:

- Business description
- Target customers
- Available services
- Pricing ranges
- Case studies
- Tone
- Call-to-action
- Response rules

The model is instructed to use only information contained in the playbook and not invent services, pricing, clients, results, guarantees, or timelines.

This keeps generated responses grounded in the configured business information.

## Example workflow

A lead submits:

Name: Rahul  
Company: ABC Plumbing  
Message: We are a 40-person plumbing company and our booking process is messy. What would something like this cost?

The workflow:

1. Detects the lead as a pricing inquiry.
2. Assigns high urgency.
3. Updates the Google Sheet.
4. Uses the business playbook to determine the relevant pricing information.
5. Generates a concise personalized reply.
6. Creates a Gmail draft.
7. Marks the lead as `Draft Created`.

A spam submission is classified as `spam`, marked accordingly, and does not generate an email draft.

## Human-in-the-loop

The workflow does not automatically send emails.

Gemini generates the response and Gmail stores it as a draft.

A human reviews the draft and decides whether to send, edit, or discard it.

This keeps the workflow useful for real business operations while avoiding fully autonomous outbound communication.

## Tech stack

- Node.js
- Google Sheets API
- Gmail API
- Google OAuth
- Gemini API
- `@google/genai`
- `googleapis`
- `dotenv`

No frontend, database, hosted backend, Make.com, Zapier, n8n, or visual workflow builder is required.

## Project structure

- `src/index.js` — main workflow orchestration
- `src/gemini.js` — Gemini classification, response generation, and model fallback
- `src/gmail.js` — Gmail draft creation
- `src/googleAuth.js` — Google OAuth and token persistence
- `src/sheets.js` — Google Sheets read/write operations
- `src/listModels.js` — Gemini model availability testing
- `data/playbook.json` — business-specific response knowledge
- `.env.example` — required environment variable template

## Requirements

You need:

- Node.js installed
- A Google Cloud project
- Google Sheets API enabled
- Gmail API enabled
- Google OAuth desktop credentials
- A Gemini API key
- A Google Sheet connected to a Google Form

## Setup

Clone the repository and install dependencies.

Run `npm install`.

Create a `.env` file based on `.env.example`.

The environment variables are:

`SPREADSHEET_ID` — ID of the Google Sheet containing the leads.

`SHEET_NAME` — name of the sheet tab containing the lead data. The default is `Form Responses 1`.

`SHEETS_API_KEY` — Google Sheets API key.

`GEMINI_API_KEY` — Gemini API key.

Place the Google OAuth desktop credentials in the project root as `credentials.json`.

Do not commit `.env`, `credentials.json`, `model-state.json` or `token.json`.

## Google Sheet format

The workflow expects the following columns:

`Timestamp | Name | Work Email | Company | Message | Status | Intent | Urgency`

New form submissions should populate the first five columns.

The workflow writes processing information into the remaining columns.

## Running the workflow

Run:

`node src/index.js`

On the first run, Google OAuth opens a browser authentication flow.

After successful authentication, the refresh token is stored locally in `token.json` so subsequent runs can reuse the authorization.

The workflow then reads unprocessed leads and creates Gmail drafts for valid leads.

## Processing behavior

Already processed rows are skipped.

Spam leads are marked as `Spam` and do not generate drafts.

Valid leads are classified and passed to the response generator.

After a Gmail draft is successfully created, the lead is marked as `Draft Created`.

This makes the workflow safe to run repeatedly without regenerating responses for already processed leads.

## Security

Secrets and local authentication files are excluded from Git:

- `.env`
- `credentials.json`
- `token.json`
- `node_modules/`
- `model-state.json`

Only `.env.example` is committed as a configuration template.

API keys and OAuth credentials should never be committed to the repository or shared publicly.

## Limitations

This is a focused workflow prototype rather than a production CRM.

It currently:

- Processes leads when the script is run.
- Uses Google Sheets as the lead source.
- Creates Gmail drafts rather than sending messages automatically.
- Uses a static business playbook.
- Does not include a frontend or dashboard.
- Depends on the availability and rate limits of the connected APIs.

These constraints keep the implementation small and focused on demonstrating the workflow.

## Result

The prototype demonstrates how a recently released AI capability can be turned into a practical business workflow without building a full application.

A business can submit a lead through an existing form, have AI classify and personalize the response, and receive a review-ready Gmail draft with the original lead information preserved in the spreadsheet.
