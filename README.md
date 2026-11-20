# AI & Tech Solution Case Bank

A RAG case bank that searches Cisco’s public AI and security architectures through a project-management frame, then drafts RACI, WBS, and risk plans.

Amounts, durations, and KPI targets labeled as planning bands are not list prices or a named customer’s results. `public_composite` cases are planning scenarios built from public material under industry constraints.

## Run locally

```bash
npm install
npm test
npm run dev
```

Open the library, `/ask`, `/onepager`, `/compare`, and `/guide` in the browser. The GitHub Pages build is `npm run build:pages`; the public URL is https://benjamin5607.github.io/project_mcp/. Ask and one-pager flows on that host run in the browser, and one-pager drafts stay in that browser only.

```bash
npm run ask -- "Draft a Hypershield case and RACI matrix for AI application security visibility in financial services"
```

## Architecture

| Layer | In this repo | Role |
| --- | --- | --- |
| Front end | Next.js (`app/`) | Case search, compare, drafts |
| API | `app/api/ask`, `workers/src/index.js` | Top five chunks and artifacts. Callers do not pick URLs |
| Vector store | Supabase pgvector, local `data/index.json` | Relational PM data and embeddings |
| Embeddings | `lib/embed.mjs` (`feature-hash-v1`, 384-d) | Default path stays on-box. Ollama and Hugging Face are optional when rebuilding the index |

## Four stages

### 1. Collect and chunk

Public case sources live under `data/authoring/`. `npm run materialize` refreshes `data/cases/*.json`. `lib/chunk.mjs` splits business case, architecture, scope, requirements, RACI, WBS, risks, and KPIs into chunks. Industry and solution tags ride on the chunk headers.

GitHub Actions (`.github/workflows/collect-cases.yml`) reads Cisco public feeds every Monday at 08:00 Asia/Kuala_Lumpur and writes `data/inbox` drafts only. Drafts stay `status: inbox` and out of search until a PM fills the fields and moves them to `reviewed`. The bot does not invent spend or customer results that are missing from the feed.

### 2. Embeddings

`lib/embed.mjs` maps queries and documents into the same 384-d vectors. Do not put sensitive diagrams in this public bank. The default path does not call an external embedding API.

To switch to Ollama `nomic-embed-text` (768-d) or a Hugging Face embedding model, rebuild documents and queries with the same model, change `case_chunks.embedding` to `vector(768)`, and recreate HNSW. Do not mix dimensions in one column.

### 3. Load Supabase and HNSW

```bash
npm run seed
psql "$DATABASE_URL" -f supabase/migrations/001_pm_case_bank.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

Pass `DATABASE_URL` only through the environment. The migration creates a cosine `hnsw` index and `match_case_chunks(query_embedding, match_count, filter_industry, filter_solution)`. Anonymous reads allow only rows that are `published` and `confidentiality = public`.

The local app runs the same cosine search in memory without Supabase. You do not need `SUPABASE_URL` in the app.

### 4. PM pipeline

`/ask` takes a query, keeps the top five chunks, and drafts from the structured fields of the highest-scoring case.

- RACI, WBS, risk plan, proposal email, executive brief
- The ask string selects the artifact when it mentions RACI, WBS, risk, or email
- Source grade and planning-band notices appear at the end of the draft

## Project one-pager

The library, ask, compare, build guide, API errors, case bodies, and the database fields `app_settings.default_language` and `solution_cases.language` are English. Korean on the one-pager appears only when that screen’s language is set to Korean.

`/onepager` takes a customer pain point and special requirements, picks reference cases from the bank, and drafts solution, stakeholders, RACI, resources, and risks. English is the default; Korean is only a language toggle on that screen. Report HTML and slide HTML download only after a PM edits and approves. Slides keep the stakeholder, RACI, and resource tables.

Model selection ranks the NVIDIA integrate API catalog against built-in profiles. The one-pager page posts to `/api/onepager`; the server reads the runtime secret `NVIDIA_API_KEY` and calls a model to rewrite the narrative. Do not put that value in chat or in the repo. Intranet, air-gap, or no-cloud requirements skip that call. In GitHub Actions, the `One-pager specialist` workflow reads repository secret `NVIDIA_API_KEY`. When `use_nvidia` is off, `ONEPAGER_ALLOW_NVIDIA=false` and the secret is not used. On Vercel the same name must be linked to the project runtime; a team shared variable that is not linked to the project looks absent to the server. Link the variable, then redeploy.

If special requirements say intranet, air-gap, or no cloud connection, the pain text is not sent to the API. Only a local persona for the selected compact model is attached to the draft. When GPU footprint must stay minimal, compact profiles rank above large ones and the retrieval path records zero GPUs.

Review documents live under `data/onepagers` only and are not part of the public case seed. That directory is gitignored. On read-only hosts such as Vercel, the same files go to `/tmp/case-bank-onepagers`.

```bash
npm run onepager -- --pain "AI is too slow when it retrieves information from the database" --requirements "Must run only on an intranet with no cloud connection, and keep the GPU footprint to a minimum."
```

## Data model

PMI process groups (initiate, plan, execute, monitor, close) plus the ten knowledge areas, with security and AI governance added.

| Table | Contents |
| --- | --- |
| `solution_cases` | Case master: industry, placement, lead time, delivery window, spend band, in/out of scope, success criteria, source grade |
| `stakeholders` | Role, organization, influence, interest, engagement, cadence |
| `requirements` | Requirement, knowledge area, priority, acceptance, source |
| `raci_items` | R/A/C/I per activity. Accountable is exactly one role |
| `wbs_items` | Code, predecessors, duration band, deliverable, acceptance |
| `milestones` | Week bands after kickoff and criteria |
| `risks` | Probability, impact, generated `score`, response, mitigation, trigger, contingency |
| `issues` | Open issues and next actions |
| `kpis` | Baseline, target, and whether the method is a planning goal or a public design goal |
| `cost_lines` | CapEx / OpEx bands |
| `quality_gates` | Phase gates |
| `communications` | Audience, message, channel, cadence |
| `procurement_items` | Item, contracting approach, lead time |
| `decisions` | Decision and rationale |
| `lessons`, `benefits` | Lessons and benefits |
| `case_chunks` | RAG body and `vector(384)` |
| `source_documents` | Public URLs |
| `collection_runs` | Collector bot history |

Seed cases:

| Code | Contents |
| --- | --- |
| `CSCO-AID-ENT-001` | 2025-01-15 AI Defense announcement |
| `CSCO-HYP-FIN-001` | Financial-services Hypershield + AI Defense planning scenario |
| `CSCO-AIF-NVD-001` | Secure AI Factory with NVIDIA |
| `CSCO-WX-AIM-001` | Webex specialized models and security-product LLM governance |
| `CSCO-SIO-DC-001` | Silicon One AI fabric. Multi-week window is post-arrival pilot only |
| `CSCO-XDR-SOC-001` | XDR AI security operations. [CiscoKorea demo](https://www.youtube.com/watch?v=pYz-1Qr1AsY) |
| `IND-SIE-COP-001` | Siemens Industrial Copilot. The week-scale reduction in the 2023-10-31 announcement is the company’s claim |
| `IND-DEERE-SPRAY-001` | John Deere See & Spray. The 59% and 8 million gallons in the 2024-09-18 announcement are Deere’s season figures |
| `IND-MOD-MRNA-001` | Moderna and AWS. The 42-day and 25-day sentences come from different sources and are not merged |
| `IND-DBS-AI-001` | DBS. The 800 models on 2024-09-16 and the later 1,500 figure are kept with their dates |

## Demo video

CiscoKorea, `[Digital Resilience] AI-assisted security operations with Cisco XDR`.

https://www.youtube.com/watch?v=pYz-1Qr1AsY

Workshop tasks on the XDR case are checked against this video and the public white papers and blogs. Click paths from the video are not copied into a work instruction.
