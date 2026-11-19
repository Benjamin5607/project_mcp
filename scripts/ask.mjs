import { answerQuestion } from "../lib/pipeline.mjs";
import { loadCases, loadIndex } from "../lib/store.mjs";

const query = process.argv.slice(2).join(" ").trim();
if (!query) {
  console.error("사용법: npm run ask -- \"질문\"");
  process.exit(1);
}
const result = answerQuestion(loadCases(), loadIndex(), query, { limit: 5 });
console.log(result.artifact.markdown);
console.log("\n---");
console.log(result.matches.map((match) => `${match.caseCode} ${match.score} ${match.heading}`).join("\n"));
