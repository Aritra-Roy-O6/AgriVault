export default function GradeResult({ result }) {
  if (!result) {
    return null;
  }

  const score = result.score ?? result.overall_quality_score ?? 0;
  const standard = result.standard || result.standard_reference || "BIS IS 4333";
  const defects =
    result.defects ||
    (Array.isArray(result.detectedDefects) && result.detectedDefects.length
      ? result.detectedDefects.join(", ")
      : Array.isArray(result.detected_defects) && result.detected_defects.length
        ? result.detected_defects.join(", ")
        : "None detected");
  const moisture =
    result.moisture ||
    (result.estimated_moisture_pct != null
      ? `${Number(result.estimated_moisture_pct).toFixed(1)}%`
      : "Within limits");
  const bankAcceptable = result.bankAcceptable ?? !String(result.grade || "").toLowerCase().includes("substandard");
  const status = result.status || (bankAcceptable ? "Bank Acceptable" : "Bank Review Required");
  const annotatedImage = result.annotatedImageB64 || result.annotated_image_b64 || null;

  return (
    <div className="grade-result-panel">
      <div className="grade-result-top">
        <div>
          <p className="eyebrow">AI Result</p>
          <h3 style={{ margin: 0 }}>Grade: {result.grade}</h3>
        </div>
        <div className="grade-score-chip">Score: {score}/100</div>
      </div>
      <div className="grade-grid">
        <div className="grade-row">
          <span>Standard</span>
          <strong>{standard}</strong>
        </div>
        <div className="grade-row">
          <span>Defects</span>
          <strong>{defects}</strong>
        </div>
        <div className="grade-row">
          <span>Moisture</span>
          <strong>{moisture}</strong>
        </div>
        <div className="grade-row">
          <span>Status</span>
          <strong>{status} {bankAcceptable ? "OK" : "Review"}</strong>
        </div>
      </div>
      {annotatedImage ? (
        <div style={{ marginTop: "16px" }}>
          <img
            alt="AI analysis"
            src={`data:image/jpeg;base64,${annotatedImage}`}
            style={{ width: "100%", borderRadius: "12px", border: "2px solid rgba(49, 140, 96, 0.3)" }}
          />
        </div>
      ) : null}
    </div>
  );
}
