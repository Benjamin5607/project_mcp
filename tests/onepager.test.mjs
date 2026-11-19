import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { POST } from "../app/api/onepager/route.js";
import { GET as exportGet } from "../app/api/onepager/[id]/export/route.js";
import { renderExport } from "../lib/onepager/export-html.mjs";
import { applyReview } from "../lib/onepager/review.mjs";
import { createOnePager } from "../lib/onepager/run.mjs";
import { requestDraft } from "../lib/onepager/remote-draft.mjs";
import { allocateId, onepagerDir, readOnePager, saveOnePager } from "../lib/onepager/store.mjs";

const SLOW = "AI is too slow when it retrieves information from the database";
const INTRANET = "Must run only on an intranet with no cloud connection, and keep the GPU footprint to a minimum.";
const SLOW_KO = "AI가 데이터베이스에서 정보를 찾아오는데 너무 느림";
const INTRANET_KO = "클라우드와 연결되지 않은 인트라넷에서만 작동 요망 그리고 그래픽카드 최소화";

function tempDir() {
  return mkdtempSync(path.join(tmpdir(), "onepager-"));
}

test("intranet and minimal GPU stay local and pick a light retrieval plan", async () => {
  const dir = tempDir();
  let calls = 0;
  const doc = await createOnePager(
    { customerLabel: "내부 지식검색", pain: SLOW, requirements: INTRANET },
    {
      dir,
      apiKey: "super-secret-nvidia-key",
      fetchImpl: async () => {
        calls += 1;
        throw new Error("egress");
      },
    },
  );
  assert.equal(calls, 0);
  assert.equal(doc.profile.airgap, true);
  assert.equal(doc.profile.minGpu, true);
  assert.equal(doc.profile.dominantTheme, "retrieval");
  assert.equal(doc.solution.kind, "case_led");
  assert.equal(doc.language, "en");
  assert.equal(doc.solution.name, doc.references[0].title);
  assert.equal(doc.solution.name.includes("Intranet retrieval pilot"), false);
  assert.ok(doc.stakeholders.length >= 4);
  assert.ok(doc.raci.length >= 4);
  assert.equal(doc.stakeholders.some((item) => /[가-힣]/.test(item.roleName)), false);
  assert.equal(doc.raci.some((item) => /[가-힣]/.test(item.activity)), false);
  assert.equal(doc.specialist.connection, "local-persona");
  assert.equal(doc.specialist.called, false);
  assert.equal(doc.specialist.authoringModelId, "nvidia/nemotron-3.5-bolt-e4b");
  assert.equal(doc.references.some((item) => item.caseCode === "CSCO-AIF-NVD-001"), false);
  assert.equal(doc.references.length, 3);
  assert.ok(doc.goals.length >= 3);
  assert.ok(doc.successMeasures.length >= 3);
  assert.ok(doc.expectedOutcomes.length >= 3);
  assert.ok(doc.rollout.length >= 4);
  assert.ok(doc.postmortem.questions.length >= 4);
  assert.match(doc.governance.note, /Accountable/);
  assert.match(doc.header.classification, /pilot|charter|pattern|visibility|fabric|factory|defense|Webex|SOC/i);
  assert.equal(JSON.stringify(doc).includes("85%"), false);
  assert.match(doc.resources.find((item) => item.name === "GPUs").amount, /0 cards/);
  for (const row of doc.raci) {
    assert.equal(typeof row.accountable, "string");
    assert.equal(row.accountable.includes(","), false);
    assert.equal(row.accountable.length > 0, true);
  }
  assert.equal(JSON.stringify(doc).includes("super-secret-nvidia-key"), false);
  assert.equal(JSON.stringify(doc).includes("신한은행"), false);
  assert.equal(doc.status, "draft");

  await assert.rejects(() => Promise.resolve().then(() => renderExport(doc, "report")), /approv/);
  const commented = applyReview(doc.id, { action: "request_changes", author: "PM", text: "GPU 0장을 자원 표 첫머리로 올려 주세요." }, { dir });
  assert.equal(commented.status, "changes_requested");
  assert.equal(commented.reviews.at(-1).text.includes("GPU 0장"), true);
  const edited = applyReview(
    doc.id,
    {
      action: "edit",
      author: "PM",
      document: {
        headline: commented.headline,
        executiveSummary: commented.executiveSummary,
        solutionSummary: commented.solution.summary,
        components: commented.solution.components,
        scopeIn: commented.scopeIn,
        scopeOut: commented.scopeOut,
        assumptions: commented.assumptions,
        stakeholders: commented.stakeholders,
        raci: commented.raci,
        resources: commented.resources,
        risks: commented.risks,
        decisions: commented.decisions,
      },
    },
    { dir },
  );
  assert.equal(edited.status, "in_review");
  const approved = applyReview(doc.id, { action: "approve", reviewer: "박PM" }, { dir });
  assert.equal(approved.status, "approved");
  const report = renderExport(approved, "report");
  const slides = renderExport(approved, "slides");
  assert.match(report, /박PM/);
  assert.match(report, new RegExp(doc.solution.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(report, /Planning band/);
  assert.match(report, new RegExp(doc.stakeholders[0].roleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(report, /Accountable is exactly one role/);
  assert.match(report, /Project goals/);
  assert.match(report, /Success measurement/);
  assert.match(report, /Expected outcomes/);
  assert.match(report, /Postmortem/);
  assert.match(report, /RACI and vendor governance/);
  assert.match(report, /Deliverable/);
  assert.match(slides, /Postmortem/);
  assert.match(slides, /Phased rollout and fallback/);
  assert.match(slides, /Accountable/);
  assert.match(slides, /<th>Quantity<\/th>/);
  assert.match(slides, new RegExp(doc.stakeholders[0].roleName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.ok((slides.match(/class="slide"/g) || []).length >= 8);
  assert.equal(report.includes("<script>alert"), false);
  rmSync(dir, { recursive: true, force: true });
});

test("escaped pain cannot become markup in the approved HTML", async () => {
  const dir = tempDir();
  const doc = await createOnePager(
    {
      pain: "Retrieval is slow <script>alert(1)</script>",
      requirements: "Intranet only, and minimize the GPU footprint.",
    },
    { dir, apiKey: "", fetchImpl: async () => { throw new Error("no"); } },
  );
  const approved = applyReview(doc.id, { action: "approve", reviewer: "김PM" }, { dir });
  const report = renderExport(approved, "report");
  assert.match(report, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.equal(report.includes("<script>alert(1)</script>"), false);
  rmSync(dir, { recursive: true, force: true });
});

test("an allowed cloud brief calls NVIDIA and keeps the key out of the draft", async () => {
  const dir = tempDir();
  const key = "super-secret-nvidia-key";
  const calls = [];
  const doc = await createOnePager(
    {
      pain: "금융권 고객의 AI 애플리케이션 보안 가시성을 확보해야 합니다",
      requirements: "퍼블릭 클라우드 API를 써도 됩니다. GPU 제약은 없습니다.",
    },
    {
      dir,
      apiKey: key,
      fetchImpl: async (url, init) => {
        calls.push({ url, authorization: init.headers.authorization, body: init.body });
        if (String(url).endsWith("/models")) {
          return { ok: true, json: async () => ({ data: [{ id: "nvidia/llama-3.3-nemotron-super-49b-v1.5" }, { id: "nvidia/nemotron-3.5-bolt-e4b" }] }) };
        }
        const body = JSON.parse(init.body);
        return {
          ok: true,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    headline: "금융 가시성 파일럿",
                    executiveSummary: "승인된 AI 경로와 온프레미스 통제를 먼저 검증합니다.",
                    recommendationRationale: "참조 사례의 계획 밴드를 견적으로 쓰지 않습니다.",
                    constraintNotes: ["클라우드 호출은 허용된 입력에만 사용합니다."],
                  }),
                },
              },
            ],
          }),
        };
      },
    },
  );
  assert.equal(calls.length, 3);
  assert.equal(calls[0].authorization, `Bearer ${key}`);
  const chat = JSON.parse(calls[1].body);
  assert.equal(chat.model, "nvidia/llama-3.3-nemotron-super-49b-v1.5");
  assert.equal(chat.temperature, 0);
  assert.match(chat.messages[0].content, /^\/no_think/);
  assert.match(chat.messages[1].content, /stakeholders/);
  assert.match(chat.messages[1].content, /CSCO-HYP-FIN-001/);
  assert.equal(doc.specialist.called, true);
  assert.equal(doc.specialist.narrativeSource, "nvidia");
  assert.equal(doc.headline, "금융 가시성 파일럿");
  assert.equal(doc.references[0].caseCode, "CSCO-HYP-FIN-001");
  assert.equal(doc.language, "en");
  assert.equal(doc.stakeholders[0].roleName, "CISO (sponsor)");
  assert.match(doc.rollout.map((item) => item.phase).join(" "), /Shadow/);
  assert.match(doc.governance.note, /does not promise an MTTR/);
  assert.equal(JSON.stringify(doc).includes("85%"), false);
  assert.equal(doc.raci.some((item) => item.activity === "Pilot charter"), false);
  assert.match(doc.raci[0].activity, /금융권 고객의 AI 애플리케이션 보안 가시성/);
  assert.equal(JSON.stringify(doc).includes(key), false);
  rmSync(dir, { recursive: true, force: true });
});

test("a factory request with GPUs allowed keeps the AI factory case", async () => {
  const dir = tempDir();
  try {
    const doc = await createOnePager(
      {
        pain: "엔터프라이즈 AI 팩토리를 첫 포드로 구축하고 싶습니다",
        requirements: "온프레미스 데이터센터를 쓸 수 있고 GPU 포드를 허용합니다.",
      },
      { dir, apiKey: "present-but-disabled", allowNetwork: false },
    );
    assert.equal(doc.profile.dominantTheme, "training");
    assert.equal(doc.profile.minGpu, false);
    assert.equal(doc.solution.kind, "case_led");
    assert.equal(doc.solution.primaryCaseCode, "CSCO-AIF-NVD-001");
    assert.equal(doc.language, "en");
    assert.equal(doc.stakeholders[0].roleName, "Infrastructure sponsor");
    assert.equal(doc.specialist.connection, "local-persona");
    assert.equal(doc.specialist.called, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the workflow reads the NVIDIA_API_KEY secret and export stays locked before approval", async () => {
  const workflow = readFileSync(new URL("../.github/workflows/onepager-specialist.yml", import.meta.url), "utf8");
  assert.match(workflow, /secrets\.NVIDIA_API_KEY/);
  assert.match(workflow, /ONEPAGER_ALLOW_NVIDIA/);
  const dir = tempDir();
  const previous = process.env.ONEPAGER_DIR;
  process.env.ONEPAGER_DIR = dir;
  try {
    const response = await POST(new Request("http://local/api/onepager", {
      method: "POST",
      body: JSON.stringify({ pain: SLOW, requirements: INTRANET }),
    }));
    assert.equal(response.status, 201);
    const doc = await response.json();
    const denied = await exportGet(new Request(`http://local/api/onepager/${doc.id}/export?kind=report`), { params: Promise.resolve({ id: doc.id }) });
    assert.equal(denied.status, 409);
    applyReview(doc.id, { action: "approve", reviewer: "최PM" }, { dir });
    const allowed = await exportGet(new Request(`http://local/api/onepager/${doc.id}/export?kind=slides`), { params: Promise.resolve({ id: doc.id }) });
    assert.equal(allowed.status, 200);
    assert.match(allowed.headers.get("content-type"), /text\/html/);
    const html = await allowed.text();
    assert.match(html, /class="slide"/);
  } finally {
    if (previous === undefined) delete process.env.ONEPAGER_DIR;
    else process.env.ONEPAGER_DIR = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("editing an approved one-pager locks the download again", async () => {
  const dir = tempDir();
  const doc = await createOnePager({ pain: SLOW, requirements: INTRANET }, { dir, apiKey: "" });
  const approved = applyReview(doc.id, { action: "approve", reviewer: "오PM" }, { dir });
  const reopened = applyReview(
    doc.id,
    {
      action: "edit",
      document: {
        headline: "수정된 제목",
        executiveSummary: approved.executiveSummary,
        solutionSummary: approved.solution.summary,
        components: approved.solution.components,
        scopeIn: approved.scopeIn,
        scopeOut: approved.scopeOut,
        assumptions: approved.assumptions,
        stakeholders: approved.stakeholders,
        raci: approved.raci,
        resources: approved.resources,
        risks: approved.risks,
        decisions: approved.decisions,
      },
    },
    { dir },
  );
  assert.equal(reopened.status, "in_review");
  assert.equal(reopened.approval, null);
  assert.equal(reopened.headline, "수정된 제목");
  assert.throws(() => renderExport(reopened, "slides"), /approv/);
  rmSync(dir, { recursive: true, force: true });
});

test("Korean stays available when language is set to ko", async () => {
  const dir = tempDir();
  const doc = await createOnePager(
    { customerLabel: "내부 지식검색", pain: SLOW_KO, requirements: INTRANET_KO, language: "ko" },
    { dir, apiKey: "" },
  );
  assert.equal(doc.language, "ko");
  assert.equal(doc.profile.airgap, true);
  assert.equal(doc.profile.minGpu, true);
  assert.equal(doc.solution.kind, "case_led");
  assert.equal(doc.solution.name.includes("인트라넷 경량 RAG"), false);
  assert.ok(doc.goals.length >= 3);
  assert.ok(doc.postmortem.purpose);
  assert.ok(doc.rollout.length >= 4);
  assert.match(doc.resources.find((item) => item.name === "그래픽카드").amount, /0|최소|제외/);
  rmSync(dir, { recursive: true, force: true });
});

test("Vercel keeps a one-pager on the writable temp directory", () => {
  const previousVercel = process.env.VERCEL;
  const previousDir = process.env.ONEPAGER_DIR;
  delete process.env.ONEPAGER_DIR;
  process.env.VERCEL = "1";
  const id = allocateId(new Date("2026-11-19T00:00:00Z"));
  const file = path.join("/tmp", "case-bank-onepagers", `${id}.json`);
  try {
    assert.equal(onepagerDir(), path.join("/tmp", "case-bank-onepagers"));
    saveOnePager({
      id,
      customerLabel: "Northwind",
      headline: "Temp draft",
      status: "draft",
      updatedAt: "2026-11-19T00:00:00.000Z",
    });
    assert.equal(existsSync(file), true);
    assert.equal(readOnePager(id).headline, "Temp draft");
  } finally {
    rmSync(file, { force: true });
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
    if (previousDir === undefined) delete process.env.ONEPAGER_DIR;
    else process.env.ONEPAGER_DIR = previousDir;
  }
});

test("the one-pager page asks the server to use NVIDIA_API_KEY", async () => {
  const calls = [];
  const doc = await requestDraft(
    {
      customerLabel: "Northwind",
      pain: "The retrieval pilot is too slow for analysts.",
      requirements: "A public cloud connection is allowed.",
      language: "en",
    },
    async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return {
        status: 201,
        ok: true,
        json: async () => ({
          id: "op-server",
          specialist: { connection: "nvidia-api", called: true, narrativeSource: "nvidia" },
        }),
      };
    },
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/onepager");
  assert.equal(calls[0].body.requirements, "A public cloud connection is allowed.");
  assert.equal(doc.specialist.connection, "nvidia-api");
  assert.equal(doc.specialist.called, true);
});

test("a host without the one-pager API drafts locally", async () => {
  const doc = await requestDraft(
    {
      pain: "The retrieval pilot is too slow for analysts.",
      requirements: "A public cloud connection is allowed.",
      language: "en",
    },
    async () => ({ status: 404, ok: false, json: async () => ({}) }),
  );
  assert.equal(doc.language, "en");
  assert.equal(doc.specialist.connection, "local-persona");
  assert.equal(doc.specialist.called, false);
  assert.equal(doc.solution.kind, "case_led");
});

test("the server reads NVIDIA_API_KEY at request time", async () => {
  const dir = tempDir();
  const previous = process.env.NVIDIA_API_KEY;
  process.env.NVIDIA_API_KEY = "env-key-value";
  const calls = [];
  try {
    const doc = await createOnePager(
      {
        pain: "The retrieval pilot is too slow for analysts.",
        requirements: "A public cloud connection is allowed.",
      },
      {
        dir,
        fetchImpl: async (url, init) => {
          calls.push(init.headers.authorization);
          if (String(url).endsWith("/models")) {
            return { ok: true, json: async () => ({ data: [{ id: "nvidia/llama-3.3-nemotron-super-49b-v1.5" }] }) };
          }
          return { ok: false, status: 401, json: async () => ({ detail: "env-key-value" }) };
        },
      },
    );
    assert.equal(calls[0], "Bearer env-key-value");
    assert.equal(doc.specialist.called, true);
    assert.match(doc.specialist.error, /\(401\)/);
    assert.equal(JSON.stringify(doc).includes("env-key-value"), false);
    assert.match(doc.executiveSummary, /Pain:/);
  } finally {
    if (previous === undefined) delete process.env.NVIDIA_API_KEY;
    else process.env.NVIDIA_API_KEY = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a reasoning trace around the JSON still replaces the summary", async () => {
  const dir = tempDir();
  try {
    const doc = await createOnePager(
      {
        pain: "The retrieval pilot is too slow for analysts.",
        requirements: "A public cloud connection is allowed.",
        language: "en",
      },
      {
        dir,
        apiKey: "present",
        fetchImpl: async (url) => {
          if (String(url).endsWith("/models")) {
            return { ok: true, json: async () => ({ data: [{ id: "nvidia/llama-3.3-nemotron-super-49b-v1.5" }] }) };
          }
          return {
            ok: true,
            json: async () => ({
              choices: [{
                message: {
                  content: "<think>{\"headline\":\"discard this\"}</think>\n```json\n{\"headline\":\"Retrieval baseline first\",\"executiveSummary\":\"Measure the frozen query set before adding a generator.\",\"recommendationRationale\":\"The reference case is a pattern.\",\"constraintNotes\":[\"Cloud calls stay on the allowed brief.\"]}\n```",
                },
              }],
            }),
          };
        },
      },
    );
    assert.equal(doc.headline, "Retrieval baseline first");
    assert.match(doc.executiveSummary, /frozen query set/);
    assert.equal(doc.specialist.narrativeSource, "nvidia");
    assert.equal(doc.solution.kind, "case_led");
    assert.equal(JSON.stringify(doc).includes("discard this"), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the model rewrites stakeholders and RACI for the pain instead of pasting the case", async () => {
  const dir = tempDir();
  try {
    const doc = await createOnePager(
      {
        pain: "Noise cancellation in Webex meetings is still poor.",
        requirements: "A public cloud connection is allowed.",
      },
      {
        dir,
        apiKey: "present",
        fetchImpl: async (url) => {
          if (String(url).endsWith("/models")) {
            return { ok: true, json: async () => ({ data: [{ id: "nvidia/nemotron-3.5-bolt-e4b" }] }) };
          }
          return {
            ok: true,
            json: async () => ({
              choices: [{
                message: {
                  content: JSON.stringify({
                    headline: "Quieter Webex meetings",
                    executiveSummary: "The sponsor wants the meeting noise problem measured on one Webex workflow before any broader rollout.",
                    solutionName: "Webex noise pilot",
                    solutionSummary: "Use the Webex specialized-model pattern only to test noise cancellation on a named meeting workflow.",
                    recommendationRationale: "The reference case is a governance pattern, not a purchased result.",
                    constraintNotes: ["Cloud use is limited to this brief."],
                    components: [
                      { name: "Named meeting workflow", detail: "One recurring meeting, with the noise complaint written down." },
                      { name: "Person on the change", detail: "A meeting owner accepts or rejects the setting. No automatic rollout." },
                    ],
                    stakeholders: [
                      { roleName: "Meeting owner", organization: "Customer", interest: "The named meeting is quieter without a surprise setting change.", influence: "high", engagement: "Accepts the pilot workflow.", cadence: "Weekly" },
                      { roleName: "Collaboration lead", organization: "Customer", interest: "Webex settings stay supportable.", influence: "high", engagement: "Owns the change window.", cadence: "Weekly" },
                      { roleName: "Security reviewer", organization: "Customer", interest: "No new data leaves the tenant.", influence: "medium", engagement: "Checks the cloud boundary.", cadence: "At the gate" },
                    ],
                    raci: [
                      { activity: "Name the noisy Webex meeting and the expected change", phase: "Plan", accountable: "Meeting owner", responsible: ["Meeting owner"], consulted: ["Collaboration lead"], informed: ["Security reviewer"] },
                      { activity: "Check the Webex setting stays inside the tenant", phase: "Plan", accountable: "Security reviewer", responsible: ["Security reviewer"], consulted: ["Collaboration lead"], informed: ["Meeting owner"] },
                      { activity: "Accept or reject the noise change", phase: "Close", accountable: "Collaboration lead", responsible: ["Collaboration lead"], consulted: ["Meeting owner"], informed: ["Security reviewer"] },
                    ],
                    resources: [
                      { kind: "role", name: "Meeting owner", amount: "2 weeks", notes: "Names the workflow." },
                      { kind: "role", name: "Collaboration lead", amount: "2 weeks", notes: "Owns the setting change." },
                    ],
                    risks: [
                      { title: "The setting rolls out past the named meeting", mitigation: "The change is limited to one workflow until the owner accepts it.", owner: "Collaboration lead" },
                      { title: "The case study is treated as this customer's result", mitigation: "The charter cites the case as a pattern only.", owner: "Meeting owner" },
                    ],
                    decisions: [
                      { title: "Scope of the noise change", choice: "One named meeting only.", rationale: "A wider rollout is a later charter.", owner: "Meeting owner" },
                      { title: "Cloud boundary", choice: "Use the allowed cloud connection only for this brief.", owner: "Security reviewer" },
                    ],
                    goals: [
                      { statement: "Decide whether the named meeting is quieter.", owner: "Meeting owner" },
                      { statement: "Keep every other Webex workflow unchanged.", owner: "Collaboration lead" },
                    ],
                  }),
                },
              }],
            }),
          };
        },
      },
    );
    assert.equal(doc.headline, "Quieter Webex meetings");
    assert.equal(doc.solution.name, "Webex noise pilot");
    assert.match(doc.executiveSummary, /meeting noise/);
    assert.equal(doc.stakeholders[0].roleName, "Meeting owner");
    assert.match(doc.raci[0].activity, /noisy Webex meeting/);
    assert.equal(doc.resources[0].name, "Meeting owner");
    assert.equal(doc.goals[0].statement.includes("named meeting"), true);
    assert.match(doc.specialist.reason, /wrote: headline, summary, rationale, solution/);
    assert.match(doc.specialist.reason, /RACI/);
    assert.equal(JSON.stringify(doc).includes("present"), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a copied model summary is sent back once and then replaced", async () => {
  const dir = tempDir();
  let drafts = 0;
  try {
    const doc = await createOnePager(
      {
        pain: "The retrieval pilot is too slow for analysts.",
        requirements: "A public cloud connection is allowed.",
      },
      {
        dir,
        apiKey: "present",
        fetchImpl: async (url, init) => {
          if (String(url).endsWith("/models")) {
            return { ok: true, json: async () => ({ data: [{ id: "nvidia/nemotron-3.5-bolt-e4b" }] }) };
          }
          const user = JSON.parse(JSON.parse(init.body).messages[1].content);
          drafts += 1;
          const executiveSummary = drafts === 1
            ? user.draftSummary
            : "The sponsor gets a measured baseline on the frozen query set before anyone discusses a generator.";
          return {
            ok: true,
            json: async () => ({
              choices: [{
                message: {
                  content: JSON.stringify({
                    headline: drafts === 1 ? "Copied" : "Baseline before a generator",
                    executiveSummary,
                    recommendationRationale: "The reference case stays a pattern.",
                    constraintNotes: ["Cloud calls are allowed on this brief."],
                    stakeholders: [
                      { roleName: "Data owner", interest: "The slow analyst queries have an expected document." },
                      { roleName: "Customer PM", interest: "The baseline is accepted in writing." },
                      { roleName: "Security reviewer", interest: "The cloud call stays inside this brief." },
                    ],
                    raci: [
                      { activity: "Freeze the slow analyst queries", accountable: "Data owner" },
                      { activity: "Accept the retrieval baseline", accountable: "Customer PM" },
                      { activity: "Confirm the cloud call stays in scope", accountable: "Security reviewer" },
                    ],
                  }),
                },
              }],
            }),
          };
        },
      },
    );
    assert.equal(drafts, 2);
    assert.equal(doc.headline, "Baseline before a generator");
    assert.match(doc.executiveSummary, /measured baseline/);
    assert.match(doc.specialist.reason, /Large profiles missing from the live catalog/);
    assert.equal(doc.specialist.narrativeSource, "nvidia");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a missing RACI is written in a second call about this pain", async () => {
  const dir = tempDir();
  let chats = 0;
  try {
    const doc = await createOnePager(
      {
        pain: "Inspectors miss hairline cracks on the paint line because the camera alert arrives after the car has moved on.",
        requirements: "A public cloud connection is allowed. Keep a person on any line stop.",
      },
      {
        dir,
        apiKey: "present",
        fetchImpl: async (url, init) => {
          if (String(url).endsWith("/models")) {
            return { ok: true, json: async () => ({ data: [{ id: "nvidia/nemotron-3.5-bolt-e4b" }] }) };
          }
          const user = JSON.parse(JSON.parse(init.body).messages[1].content);
          chats += 1;
          if (user.bannedActivities) {
            assert.equal("excerpt" in user, false);
            return {
              ok: true,
              json: async () => ({
                choices: [{
                  message: {
                    content: JSON.stringify({
                      raci: [
                        { activity: "Hold the car when the camera flags a hairline crack", phase: "Execute", accountable: user.seats[0], responsible: [user.seats[0]], consulted: [user.seats[1]], informed: [user.seats[2]] },
                        { activity: "Measure how late the paint-line camera alert is", phase: "Plan", accountable: user.seats[1], responsible: [user.seats[1]], consulted: [user.seats[0]], informed: [user.seats[2]] },
                        { activity: "Keep a person on any paint-line stop", phase: "Execute", accountable: user.seats[2], responsible: [user.seats[2]], consulted: [user.seats[0]], informed: [user.seats[1]] },
                        { activity: "Accept the crack-alert pilot or stop it", phase: "Close", accountable: user.seats[0], responsible: [user.seats[0]], consulted: [user.seats[1]], informed: [user.seats[2]] },
                      ],
                      resources: [
                        { kind: "role", name: "Paint-line inspector", amount: "Planning band", notes: "Stays on the line stop." },
                        { kind: "tool", name: "Camera alert log", amount: "Planning band", notes: "Shows whether the alert arrives after the car has moved." },
                      ],
                    }),
                  },
                }],
              }),
            };
          }
          return {
            ok: true,
            json: async () => ({
              choices: [{
                message: {
                  content: JSON.stringify({
                    headline: "Real-time crack alerts on the paint line",
                    executiveSummary: "Inspectors need the camera alert before the car leaves the paint station, with a person still on any line stop.",
                    recommendationRationale: "The retrieved cases are patterns for governance, not a paint-line result.",
                    stakeholders: [
                      { roleName: "Paint inspector", interest: "The hairline crack is caught before the car moves on." },
                      { roleName: "Line supervisor", interest: "A person stays on any line stop." },
                      { roleName: "Customer PM", interest: "The pilot stays on one paint station." },
                    ],
                  }),
                },
              }],
            }),
          };
        },
      },
    );
    assert.equal(chats, 2);
    assert.match(doc.raci.map((row) => row.activity).join(" "), /hairline crack/);
    assert.equal(doc.raci.some((row) => row.activity === "Pilot charter"), false);
    assert.match(doc.wbs[0].name, /hairline crack/);
    assert.equal(doc.resources[0].name, "Paint-line inspector");
    assert.match(doc.specialist.reason, /RACI/);
    assert.equal(JSON.stringify(doc).includes("present"), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a copied case RACI is replaced from the pain", async () => {
  const dir = tempDir();
  try {
    const doc = await createOnePager(
      {
        pain: "Inspectors miss hairline cracks on the paint line because the camera alert arrives after the car has moved on.",
        requirements: "A public cloud connection is allowed. Keep a person on any line stop.",
      },
      {
        dir,
        apiKey: "present",
        fetchImpl: async (url, init) => {
          if (String(url).endsWith("/models")) {
            return { ok: true, json: async () => ({ data: [{ id: "nvidia/nemotron-3.5-bolt-e4b" }] }) };
          }
          const user = JSON.parse(JSON.parse(init.body).messages[1].content);
          if (user.bannedActivities) {
            return {
              ok: true,
              json: async () => ({
                choices: [{
                  message: {
                    content: JSON.stringify({
                      raci: user.bannedActivities.slice(0, 4).map((activity) => ({
                        activity,
                        phase: "Plan",
                        accountable: user.seats[0],
                      })),
                    }),
                  },
                }],
              }),
            };
          }
          return {
            ok: true,
            json: async () => ({
              choices: [{
                message: {
                  content: JSON.stringify({
                    headline: "Real-time crack alerts on the paint line",
                    executiveSummary: "Inspectors need the camera alert before the car leaves the paint station, with a person still on any line stop.",
                    recommendationRationale: "The retrieved cases are patterns for governance, not a paint-line result.",
                    stakeholders: [
                      { roleName: "Paint inspector", interest: "The hairline crack is caught before the car moves on." },
                      { roleName: "Line supervisor", interest: "A person stays on any line stop." },
                      { roleName: "Customer PM", interest: "The pilot stays on one paint station." },
                    ],
                  }),
                },
              }],
            }),
          };
        },
      },
    );
    assert.equal(doc.raci.some((row) => row.activity === "Pilot charter"), false);
    assert.match(doc.raci[0].activity, /hairline cracks on the paint line/);
    assert.equal(doc.raci[0].accountable, "Paint inspector");
    assert.match(doc.specialist.reason, /not about this pain/);
    assert.match(doc.wbs[0].name, /hairline cracks/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
