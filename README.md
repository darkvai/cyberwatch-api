# 🛡️ CyberWatch

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-880000?style=for-the-badge&logo=mongoose&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge&logo=zod&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Logstash](https://img.shields.io/badge/Logstash-005571?style=for-the-badge&logo=logstash&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)

**A real-time Security Operations Center (SOC) API built with Node.js, Express, and MongoDB.**

CyberWatch ingests security logs from Windows endpoints, firewalls, and custom agents, normalizes them into a unified format, and runs them through a MITRE ATT&CK–aligned correlation engine that automatically creates and deduplicates incident tickets — giving analysts a single pane of glass for detection and response.

---

## Key Features

- **Multi-Format Log Ingestion** — Accepts Windows Event Logs (via Winlogbeat / Logstash), CEF (Common Event Format), and a native JSON schema. All formats are normalized into one canonical structure before storage.
- **Automatic Asset Discovery** — New hosts are registered as assets on first log receipt (upsert by hostname), eliminating manual CMDB entry.
- **MITRE ATT&CK Correlation Engine** — A sliding-window engine evaluates every incoming log against configurable detection rules:

  | Rule ID | Technique | Trigger |
  |---------|-----------|---------|
  | `RULE_T1110_BRUTE_FORCE` | T1110 — Brute Force | ≥ 5 `Auth_Failure` events in 2 min |
  | `RULE_T1059_001_POWERSHELL` | T1059.001 — PowerShell | Single obfuscated PS execution |
  | `RULE_T1046_PORT_SCAN` | T1046 — Network Scan | ≥ 10 `Firewall_Deny` events in 1 min |
  | `RULE_T1070_001_LOG_CLEAR` | T1070.001 — Log Tampering | Single `Audit_Log_Cleared` event |
  | `RULE_T1490_SHADOW_DELETE` | T1490 — Ransomware Prep | Shadow copy / recovery deletion |

- **Smart Incident Ticketing** — Incidents auto-deduplicate (partial unique index on active tickets per asset + rule), track `alert_count`, and enforce a **status FSM** (Open → In Progress → Escalated → Resolved).
- **SLA Deadlines** — Each new ticket receives an auto-calculated `due_at` based on severity (Critical: 1 h, High: 4 h, Medium: 24 h, Low: 48 h).
- **Optimistic Concurrency** — Mongoose `optimisticConcurrency` with `__v` version checks prevents analysts from silently overwriting each other's updates (409 Conflict on stale writes).
- **Role-Based Access Control (RBAC)** — Three SOC tiers (L1, L2, L3) enforced via JWT + cookies. L3 admins manage API keys and can delete tickets; L2+ can escalate and update status.
- **API Key Authentication** — Machine-to-machine log ingestion is secured with SHA-256–hashed bearer keys (the raw key is shown only once at creation).
- **Rate Limiting** — Login endpoint is throttled to 5 attempts per 15 minutes per IP.

---

## Architecture

```
┌─────────────┐    ┌──────────┐    ┌────────────────────────────────────────────┐
│  Winlogbeat │───▶│ Logstash │───▶│            CyberWatch API                 │
└─────────────┘    └──────────┘    │                                            │
                                   │  Normalize ──▶ Validate ──▶ Store Log      │
┌─────────────┐                    │       │                        │            │
│  CEF Source  │──────────────────▶│       └───── Correlation ──▶ Incident ──▶  │──▶ MongoDB
└─────────────┘                    │              Engine          Service       │
                                   │                                            │
┌─────────────┐                    │  Auth ◀── JWT Cookie ◀── Analyst Login     │
│ Python Agent │──────────────────▶│                                            │
└─────────────┘                    └────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js |
| Framework | Express 5 |
| Database | MongoDB (Mongoose 9) |
| Auth | JWT (`jsonwebtoken`) + bcrypt + HTTP-only cookies |
| Validation | Zod |
| Log Pipeline | Logstash (Beats input → HTTP output) |
| Real-Time | Socket.IO |
| Testing | Jest + mongodb-memory-server |
| Containerization | Docker Compose |

---

## Project Structure

```
cyberwatch/
├── app.js                      # Express app setup (middleware, routes)
├── server.js                   # Entry point (connects DB, starts listener)
├── docker-compose.yaml         # MongoDB + API + Logstash services
├── logstash/
│   └── logstash.conf           # Beats → CyberWatch HTTP pipeline
├── src/
│   ├── config/
│   │   ├── NoSQLconnection.js  # Mongoose connection helper
│   │   └── correlationRules.js # MITRE ATT&CK detection rule definitions
│   ├── controllers/            # Route handlers (thin – delegate to services)
│   ├── middleware/
│   │   ├── authMiddleware.js   # JWT cookie verification + RBAC enforcement
│   │   ├── apiAuth.js          # Bearer API key verification (SHA-256)
│   │   └── logValidations.js   # Zod schema validation for incoming logs
│   ├── models/
│   │   ├── analyst.js          # Analyst (user) with L1/L2/L3 role enum
│   │   ├── ApiKey.js           # Hashed API keys with scopes & partial index
│   │   ├── asset.js            # Discovered network assets
│   │   ├── incident.js         # Tickets with SLA hook & partial unique index
│   │   └── logEvent.js         # Normalized log entries
│   ├── routes/                 # Express routers per domain
│   └── services/
│       ├── logsIngestionService.js  # Normalize → save → trigger correlation
│       ├── correlationEngine.js     # Sliding-window + regex rule evaluator
│       ├── incidentService.js       # Create / dedup / FSM status transitions
│       ├── assetService.js          # Upsert-based asset discovery
│       ├── authService.js           # Register / login with bcrypt + JWT
│       └── apiKeyService.js         # Key generation (SHA-256 hash storage)
└── tests/
    └── unit/
        ├── ingestion.test.js        # Log normalization & severity mapping
        ├── correlation.test.js      # Sliding-window & fake-timer tests
        └── incidentService.test.js  # Dedup, FSM, SLA, optimistic locking
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **MongoDB** ≥ 6 (or use the Docker Compose stack)
- **npm** (comes with Node.js)

### 1. Clone & Install

```bash
git clone https://github.com/darkvai/CyberWatch.git
cd CyberWatch
npm install
```

### 2. Configure Environment

Create a `.env` file at the project root:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/cyberwatch
JWT_SECRET=your_strong_secret_here
ORIGIN=http://localhost:5173,http://localhost:3000
NODE_ENV=development
```

### 3. Start the Server

**Local (requires a running MongoDB instance):**

```bash
npm start
```

**Docker (spins up MongoDB + API + Logstash):**

```bash
docker compose up -d
```

The API will be available at `http://localhost:3000`.

### 4. Create Your First Analyst

```bash
curl -X POST http://localhost:3000/v1/cyberwatch/register \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "username": "alice", "password": "SecurePass123!", "role": "L3"}'
```

### 5. Log In & Get a Cookie

```bash
curl -X POST http://localhost:3000/v1/cyberwatch/login \
  -H "Content-Type: application/json" \
  -d '{"username": "alice", "password": "SecurePass123!"}' \
  -c cookies.txt
```

### 6. Generate an API Key (L3 Only)

```bash
curl -X POST http://localhost:3000/v1/cyberwatch/admin/api-keys \
  -H "Content-Type: application/json" \
  -d '{"consumer_name": "Winlogbeat - DC01"}' \
  -b cookies.txt
```

> [!IMPORTANT]
> Save the returned key immediately — it is never shown again.

### 7. Send a Test Log

```bash
curl -X POST http://localhost:3000/v1/cyberwatch/logs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer cw_live_YOUR_KEY_HERE" \
  -d '{
    "host": {"hostname": "DC-01", "ip": ["10.0.0.5"]},
    "event": {"code": "4625", "severity": "high"},
    "message": "An account failed to log on"
  }'
```

---

## API Endpoints

All routes are prefixed with `/v1/cyberwatch`.

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/register` | None | Provision a new analyst account |
| `POST` | `/login` | None (rate-limited) | Authenticate and receive JWT cookie |
| `GET`  | `/logout` | Cookie | Clear JWT cookie |
| `GET`  | `/me` | Cookie | Return current analyst identity |

### Logs

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/logs` | API Key | Ingest a log (Winlogbeat, CEF, or JSON) |
| `GET`  | `/logs` | Cookie (L1+) | Retrieve latest 100 logs |

### Incidents

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`    | `/incidents` | Cookie | List all incidents |
| `POST`   | `/incidents` | Cookie | Create a manual incident |
| `GET`    | `/incidents/:id` | Cookie | Get a single incident |
| `PATCH`  | `/incidents/:id` | Cookie (L2+) | Update incident status |
| `PUT`    | `/incidents/:id/escalate` | Cookie (L2+) | Escalate with reason |
| `DELETE` | `/incidents/:id` | Cookie (L3) | Permanently delete |

### Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/admin/api-keys` | Cookie (L3) | Generate a new API key |
| `GET`  | `/admin/api-keys` | Cookie (L3) | List active keys (metadata only) |

### Assets

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/assets` | Cookie (L1+) | List all discovered assets |

---

## Testing

The test suite is split into three layers:

```bash
# Run all tests
npm test

# Run a specific suite
npx jest tests/unit/ingestion.test.js --verbose
npx jest tests/unit/correlation.test.js --verbose
npx jest tests/unit/incidentService.test.js --verbose
```

| Suite | What It Covers | External Deps |
|-------|---------------|---------------|
| `ingestion.test.js` | `normalizePayload`, `mapSeverity` — pure function tests | None |
| `correlation.test.js` | Sliding-window thresholds, regex matching, timer expiry (`jest.useFakeTimers`) | `incidentService` mocked |
| `incidentService.test.js` | Dedup, optimistic locking (409), status FSM, SLA hook, partial index reset | `mongodb-memory-server` |

> [!NOTE]
> The first run of `incidentService.test.js` downloads a ~780 MB MongoDB binary. Subsequent runs use the cached binary and complete in seconds.

---

## Logstash / Winlogbeat Integration

The included `logstash/logstash.conf` accepts Winlogbeat events on port **5044** and forwards them as JSON POST requests to the CyberWatch API:

```
Winlogbeat (endpoint) ──▶ Logstash:5044 ──▶ POST /v1/cyberwatch/logs
```

Update the `Authorization` header in `logstash.conf` with the API key generated in step 6:

```ruby
headers => {
  "Authorization" => "Bearer cw_live_YOUR_API_KEY_HERE"
}
```

---

## Screenshots

<img width="1366" height="639" alt="SOC Dashboard" src="https://github.com/user-attachments/assets/9e9cfc2a-6fe1-4c4c-bae2-dd4476c66394" />

<img width="1366" height="1291" alt="Incident Detail" src="https://github.com/user-attachments/assets/160ed0e9-82db-46e9-9609-d1a945639630" />

<img width="1366" height="682" alt="Live Log Terminal" src="https://github.com/user-attachments/assets/5c062b85-c478-4533-a750-78f5e7db2be2" />

<img width="1352" height="638" alt="Asset View" src="https://github.com/user-attachments/assets/ef1f85f4-0278-4235-8748-9afeaa4f3a5d" />

<img width="1366" height="639" alt="Login Screen" src="https://github.com/user-attachments/assets/60b88386-4193-4170-a093-a188ef053cba" />

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

Please ensure all existing tests pass (`npm test`) and add tests for new functionality.

---

## License

This project is licensed under the ISC License.

---

## Maintainer

Built by [**darkvai**](https://github.com/darkvai) — reach out via [GitHub Issues](https://github.com/darkvai/CyberWatch/issues) for bugs, questions, or feature requests.
