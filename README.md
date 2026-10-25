# Darija Desk — local Moroccan COD support MVP

A locally hosted **internal management dashboard** and API prototype for Moroccan e-commerce customer support, WhatsApp-style conversations, and cash-on-delivery (COD) order management. The Arabic RTL interface includes a right-hand navy navigation rail, order and delivery statistics, estimated profit and expenses, customers, products, activity, and a WhatsApp-style support inbox. This is not a public-facing shop or customer checkout. The interface and responses are simulations: no messages are sent and no external provider is contacted.

## Requirements

- Node.js 20 or newer
- npm

## Run locally

From this directory, run:

```powershell
npm.cmd install
Copy-Item .env.example .env
# Edit .env and set a random SESSION_SECRET (32+ characters).
npm.cmd run dev
```

Open the local dashboard at **http://127.0.0.1:3000**. The server listens on `127.0.0.1` by default. Visit `/health` to check the local API. Keep the terminal running `npm run dev` open while using the dashboard; press `Ctrl+C` in that terminal to stop it.

## Deploy to Render

The repository includes a Render Blueprint in `render.yaml`. Push the project to a GitHub repository, then in Render choose **New → Blueprint** and select that repository. The Blueprint builds the TypeScript app, starts the production server, checks `/health`, and mounts a 1 GB persistent disk at `/var/data` for orders, conversations, and account records. It generates `SESSION_SECRET` and `REGISTRATION_INVITE_CODE`; provide `AWS_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` in Render's protected environment settings. Use an AWS IAM identity with only the required `sns:Publish` permission. Never commit these values.

After deployment, retrieve the invitation code from the Render service environment settings and share it only with trusted administrators; registration also requires a valid SMS code. Use a paid Render instance for persistent disks. This file-backed store is designed for one running instance only: do not scale it horizontally. Sessions and verification codes are kept in memory, so restarting or redeploying logs users out and cancels pending verifications. The local data files are not encrypted; use synthetic data until production privacy and backup requirements have been reviewed.

Configuration is validated at startup and loaded from the local `.env` file by the `dev` and `start` scripts. Supported variables are `NODE_ENV`, `HOST`, `PORT`, `LOG_LEVEL`, `LOCAL_DATA_FILE`, `AWS_REGION`, `REGISTRATION_INVITE_CODE`, and `SESSION_SECRET`; see `.env.example`. Set a random session secret of at least 32 characters and the AWS region where SNS SMS is enabled. AWS credentials use the AWS SDK default credential chain; do not add credentials to source control or share them. For a public deployment, set `REGISTRATION_INVITE_CODE` to a random secret of at least 32 characters and share it only with trusted people; every account has full administrator access. `LOCAL_DATA_FILE` defaults to `data/local-store.json`, which is created locally and ignored by git. Registration collects full name, a valid email, a valid Moroccan phone number, store name, username, and password (at least 12 characters). A one-time six-digit verification code is sent to the phone through AWS SNS and expires after five minutes; a correct code is required before the account is created. Usernames and emails are unique regardless of letter case. Account records are stored in an ignored local file using salted scrypt password hashes, and existing account files are migrated automatically. All accounts have full administrator access; there are no roles or email verification. Set `NODE_ENV=test` to use in-memory order and conversation storage.

The dashboard requires administrator login. Successful registration/login creates an eight-hour, HTTP-only, SameSite=Strict session cookie; production cookies also require HTTPS. Registration and failed logins are limited to five attempts per IP address per 15 minutes, and verification-code requests for a phone number have a 60-second cooldown. In-memory verification codes expire in five minutes and allow at most five attempts. Sessions end when the server restarts.

AWS SNS SMS must be enabled for the selected region and AWS identity, with `sns:Publish` permission. AWS accounts in the SNS SMS sandbox can only send to verified destination numbers until production SMS access is enabled.

> Use synthetic customer data only. The local JSON file contains order and conversation details, including names, phone numbers, and addresses. Do not enter real customer or provider credentials. The file is stored on this computer and is not encrypted.

## Supported local behavior

- Use the internal console to create and manage COD orders from a fictional catalog with MAD prices. New orders require explicit confirmation before they can progress.
- Move orders through the guarded local statuses: awaiting confirmation, confirmed, processing, shipped, delivered, and cancelled.
- Create WhatsApp-style support conversations using normalized Moroccan phone numbers and simulate incoming WhatsApp messages in the admin console. Each incoming message gets an automatic response from the local Claude mock, which can answer basic questions about the prototype's catalog, COD, and simulated delivery; the WhatsApp mock records the simulated outbound reply.
- Transfer a conversation to an agent and record a manual agent reply. Automated replies stop after handoff.
- The statistics, customer list, order-status distribution, shipping counters, and activity summary are calculated from local order and conversation data. Profit and expense cards are explicitly illustrative estimates (50% product cost and 25 MAD delivery per delivered order), not real accounting data.
- Orders and conversations persist across server restarts in the local JSON file.
- Use the REST API directly: public `GET /auth/session`, `GET /auth/setup`, `POST /auth/registration/start`, `POST /auth/registration/verify`, `POST /auth/login`, and `POST /auth/logout`; authenticated `GET /products`, `GET /orders`, `POST /orders`, `POST /orders/:id/confirm`, `PATCH /orders/:id/status`, `GET /conversations`, `POST /conversations`, `POST /conversations/:id/messages`, `POST /conversations/:id/handoff`, and `POST /conversations/:id/replies`. `/health` and the dashboard login page are public too.

## Tests and build

```powershell
npm.cmd test
npm.cmd run build
```

## Not connected or included

Real WhatsApp messaging, Claude API access, external delivery providers, role-based access, email verification or recovery, production database infrastructure, deployment, and integration with any other application remain out of scope and disabled. Phone verification sends real SMS through the configured AWS SNS account; the sample products, assistant responses, and other operational actions are local prototype behavior only.
