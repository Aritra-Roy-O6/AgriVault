export default function GradeResult({ result }) {
  if (!result) {
    return null;
  }

  return (
    <div className="grade-result-panel">
      <div className="grade-result-top">
        <div>
          <p className="eyebrow">AI Result</p>
          <h3 style={{ margin: 0 }}>Grade: {result.grade}</h3>
        </div>
        <div className="grade-score-chip">Score: {result.score}/100</div>
      </div>
      <div className="grade-grid">
        <div className="grade-row">
          <span>Standard</span>
          <strong>{result.standard}</strong>
        </div>
        <div className="grade-row">
          <span>Defects</span>
          <strong>{result.defects}</strong>
        </div>
        <div className="grade-row">
          <span>Moisture</span>
          <strong>{result.moisture}</strong>
        </div>
        <div className="grade-row">
          <span>Status</span>
          <strong>{result.status} {result.bankAcceptable ? "OK" : "Review"}</strong>
        </div>
      </div>
    </div>
  );
}