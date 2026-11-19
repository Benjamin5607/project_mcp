export const metadata = { title: "Build guide · Case bank" };

const STEPS = [
  {
    title: "1. Collect and chunk",
    body: "Public newsroom, blog, Cisco Live, and product pages are written as cases in data/authoring. lib/chunk.mjs splits each case into business context, architecture, scope, requirements, RACI, WBS, risk, and KPIs. Industry, solution, and source grade stay on the chunk header. The weekly collector only writes drafts under data/inbox.",
  },
  {
    title: "2. Embed",
    body: "The default model is feature-hash-v1 in lib/embed.mjs, 384 dimensions. The query and the document use the same function, so nothing leaves the network. Switching to Ollama nomic-embed-text means altering the column to vector(768) and rebuilding the index. Do not mix the two models in one index.",
  },
  {
    title: "3. Load into Supabase and HNSW",
    body: "supabase/migrations/001_pm_case_bank.sql creates pgvector, a cosine HNSW index, and match_case_chunks. npm run seed writes cases and vectors to supabase/seed.sql. Anonymous reads are limited to public, published rows. The app searches the same way with data/index.json or an in-memory index. The database default language is locked to English.",
  },
  {
    title: "4. PM pipeline",
    body: "The ask screen posts to /api/ask, keeps the best chunk per case, and takes the top five. It drafts RACI, WBS, risk, and email from the top case. workers/src/index.js is a gateway with the same contract. High-impact security actions and amounts always ship with a human-review line.",
  },
];

export default function GuidePage() {
  return (
    <article>
      <p className="kicker">Build guide</p>
      <h1>A case bank in four steps</h1>
      <p className="lede">
        The front end is this Next.js app, the API is the Node routes and the Workers handler,
        vectors sit in Supabase pgvector, and the default embedding is local.
        Ollama and Hugging Face are replacements that require a rebuilt index.
        English is the locked default for the stored cases, the database setting, and this interface.
      </p>
      {STEPS.map((step) => (
        <section className="section" key={step.title}>
          <h2>{step.title}</h2>
          <p>{step.body}</p>
        </section>
      ))}
      <section className="section">
        <h2>PM tables</h2>
        <p>
          Under solution_cases: stakeholders, requirements, RACI, WBS, milestones, risks, issues, KPIs, cost,
          quality gates, communications, procurement, decisions, lessons, benefits, chunks, sources, and collection runs.
          Knowledge areas are the ten PMI areas plus security and AI governance.
          app_settings.default_language is constrained to en.
        </p>
      </section>
      <section className="section">
        <h2>Run</h2>
        <p>npm test checks the bank. npm run dev opens the library. npm run ask -- "question" drafts in the terminal. npm run onepager drafts a one-pager from a pain point.</p>
      </section>
      <section className="section">
        <h2>One-pager</h2>
        <p>
          /onepager takes a pain point and special requirements, selects reference cases, and fills a technical solution, stakeholders, RACI, resources, and risks.
          The language control defaults to English. Korean is an explicit option on that form only.
          The model is chosen from NVIDIA API catalog profiles. The secret name is NVIDIA_API_KEY.
          An intranet-only requirement does not send the pain text to the API. Only the selected model's persona is connected to the local case bank.
          Report HTML and slide HTML stay locked until a PM approves.
          The One-pager specialist GitHub Actions workflow uploads the same draft and uses the secret only when use_nvidia is on.
        </p>
      </section>
    </article>
  );
}
