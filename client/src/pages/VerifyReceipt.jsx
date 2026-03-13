import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { apiBaseUrl } from "../firebase";

export default function VerifyReceipt() {
  const { receiptId } = useParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiBaseUrl}/api/receipt/verify/${receiptId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to verify receipt.");
        setResult(data);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [receiptId]);

  if (loading) {
    return (
      <main className="auth-center fade-up">
        <div className="card auth-card">
          <p className="eyebrow">Verify Receipt</p>
          <h2>Checking certificate</h2>
        </div>
      </main>
    );
  }

  if (!result) {
    return (
      <main className="auth-center fade-up">
        <div className="card auth-card">
          <p className="eyebrow">Verify Receipt</p>
          <h2>Receipt not found</h2>
          <Link className="button" to="/">
            Back Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-center fade-up">
      <div className="card" style={{ maxWidth: "620px", width: "100%" }}>
        <p className="eyebrow">Verification</p>
        <h2>{result.verified ? "Receipt Verified" : "Receipt Verification Failed"}</h2>
        <div className="receipt-meta">
          <div className="receipt-row"><span>Receipt ID</span><strong>{result.receipt.receiptId}</strong></div>
          <div className="receipt-row"><span>Farmer</span><strong>{result.receipt.farmerName}</strong></div>
          <div className="receipt-row"><span>Produce</span><strong>{result.receipt.produce}</strong></div>
          <div className="receipt-row"><span>Grade</span><strong>{result.receipt.grade}</strong></div>
          <div className="receipt-row"><span>Issued</span><strong>{new Date(result.receipt.issuedAt).toLocaleDateString("en-IN")}</strong></div>
          <div className="receipt-row"><span>Hash</span><strong className="hash-text">{result.receipt.receiptHash}</strong></div>
        </div>
        <Link className="button" to="/">
          Back Home
        </Link>
      </div>
    </main>
  );
}