/** Decorative acknowledgement, mounted only after the API confirms persistence. */
export function SubmissionArt({kind}: {kind: 'message' | 'meeting'}) {
  return <svg className="submission-art" viewBox="0 0 120 100" fill="none" aria-hidden="true">
    <circle className="submission-orbit" cx="60" cy="50" r="43" />
    {kind === 'message'
      ? <g className="submission-object"><rect x="26" y="28" width="68" height="48" rx="8"/><path d="m28 32 32 25 32-25"/></g>
      : <g className="submission-object"><rect x="29" y="24" width="62" height="56" rx="9"/><path d="M29 40h62M43 18v13M77 18v13M42 53h10M42 64h10"/></g>}
    <g className="submission-check"><circle cx="88" cy="73" r="16"/><path d="m80 73 6 6 11-12"/></g>
  </svg>;
}
