export default function GradeResult({ result }) {
  if (!result) return null;

  const grade = result.grade || "?";
  const confidence = result.confidence
    ? Math.round(result.confidence * 100)
    : null;
  const recommendation = result.recommendation || result.message || "";

  const gradeClass =
    grade === "A" ? "grade-A" : grade === "B" ? "grade-B" : "grade-C";

  return (
    <div className="card grade-result">
      <div className={`grade-badge-circle ${gradeClass}`}>{grade}</div>
      <div>
        <p className="section-title" style={{ marginBottom: "4px" }}>
          Grade {grade} Produce
        </p>
        {confidence !== null && (
          <p className="grade-confidence-label" style={{ marginBottom: "12px" }}>
            Confidence {confidence}%
          </p>
        )}
        {confidence !== null && (
          <div className="progress-bar" style={{ width: "140px", margin: "0 auto 12px" }}>
            <div
              className="progress-bar-fill"
              style={{ width: `${confidence}%` }}
            />
          </div>
        )}
        {recommendation && (
          <p style={{ fontSize: "0.88rem", color: "var(--clr-ink-muted)", maxWidth: "280px" }}>
            {recommendation}
          </p>
        )}
      </div>
    </div>
  );
}
