// Only one new service/device scene may animate at once. Existing artwork stays independent.
interface Candidate { score: number; select(active: boolean): void; }
const candidates = new Set<Candidate>();
function choose() {
  let winner: Candidate | undefined;
  for (const candidate of candidates) if (candidate.score > 0 && (!winner || candidate.score > winner.score)) winner = candidate;
  for (const candidate of candidates) candidate.select(candidate === winner);
}
export function registerMotion(select: Candidate['select']) {
  const candidate: Candidate = {score:0,select};candidates.add(candidate);
  return { update(score: number) {candidate.score=score;choose();}, destroy(){candidates.delete(candidate);choose();} };
}
