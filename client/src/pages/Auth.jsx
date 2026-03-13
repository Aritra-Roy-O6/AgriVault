import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, apiBaseUrl } from "../firebase";

const createInitialForm = (role = "farmer") => ({
  name: "",
  email: "",
  password: "",
  phone: "",
  pincode: "",
  role,
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedRole =
    searchParams.get("role") === "owner" ? "owner" : "farmer";
  const [isRegister, setIsRegister] = useState(true);
  const [form, setForm] = useState(() => createInitialForm(selectedRole));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm((current) => ({ ...current, role: selectedRole }));
  }, [selectedRole]);

  const updateForm = (e) =>
    setForm((c) => ({ ...c, [e.target.name]: e.target.value }));

  const selectRole = (role) =>
    setForm((c) => ({ ...c, role }));

  const getRoleRedirect = (role) =>
    role === "owner" ? "/owner" : "/farmer";

  const registerProfile = async (user) => {
    const token = await user.getIdToken();
    const res = await fetch(`${apiBaseUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: form.name,
        role: form.role,
        phone: form.phone,
        pincode: form.pincode,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Unable to register profile.");
    return data.user;
  };

  const getProfile = async (user) => {
    const token = await user.getIdToken();
    const res = await fetch(`${apiBaseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Unable to load your profile.");
    return data.user;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          form.email,
          form.password
        );
        const userProfile = await registerProfile(credential.user);
        toast.success("Account created!");
        navigate(getRoleRedirect(userProfile.role));
      } else {
        const credential = await signInWithEmailAndPassword(
          auth,
          form.email,
          form.password
        );
        const userProfile = await getProfile(credential.user);
        toast.success("Welcome back!");
        navigate(getRoleRedirect(userProfile.role));
      }
      setForm(createInitialForm(selectedRole));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-center fade-up">
      <div className="card auth-card">
        {/* Header */}
        <p className="eyebrow">
          {isRegister ? "Create your account" : "Welcome back"}
        </p>
        <h2 style={{ marginBottom: "0.25rem" }}>
          {isRegister ? "Join AgriVault" : "Sign in"}
        </h2>
        <p style={{ color: "var(--clr-ink-muted)", fontSize: "0.88rem", marginBottom: "1.5rem" }}>
          {isRegister
            ? "Start connecting with verified warehouses today."
            : "Access your farmer or owner dashboard."}
        </p>

        {/* Role selector (register only) */}
        {isRegister && (
          <div style={{ marginBottom: "1.25rem" }}>
            <div className="field" style={{ marginBottom: "8px" }}>
              <span>I am a</span>
            </div>
            <div className="role-selector">
              <button
                type="button"
                className={`role-btn${form.role === "farmer" ? " selected" : ""}`}
                onClick={() => selectRole("farmer")}
              >
                <span className="role-btn-icon">🌾</span>
                Farmer
              </button>
              <button
                type="button"
                className={`role-btn${form.role === "owner" ? " selected" : ""}`}
                onClick={() => selectRole("owner")}
              >
                <span className="role-btn-icon">🏭</span>
                Warehouse Owner
              </button>
            </div>
          </div>
        )}

        <form className="form-grid" onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <label>
                Full Name
                <input
                  name="name"
                  onChange={updateForm}
                  placeholder="Your full name"
                  required
                  value={form.name}
                />
              </label>
              <div className="form-row">
                <label>
                  Phone
                  <input
                    name="phone"
                    onChange={updateForm}
                    placeholder="+91 9876543210"
                    required
                    value={form.phone}
                  />
                </label>
                <label>
                  Pincode
                  <input
                    name="pincode"
                    onChange={updateForm}
                    placeholder="700001"
                    required
                    value={form.pincode}
                  />
                </label>
              </div>
            </>
          )}
          <label>
            Email address
            <input
              name="email"
              onChange={updateForm}
              placeholder="you@example.com"
              required
              type="email"
              value={form.email}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              onChange={updateForm}
              placeholder={isRegister ? "Min 8 characters" : "Your password"}
              required
              type="password"
              value={form.password}
            />
          </label>

          <button
            className="button button-full"
            disabled={loading}
            type="submit"
            style={{ marginTop: "4px" }}
          >
            {loading ? (
              <>
                <span className="spinner" /> Please wait…
              </>
            ) : isRegister ? (
              "Create Account →"
            ) : (
              "Sign In →"
            )}
          </button>
        </form>

        {/* Toggle */}
        <div style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.875rem", color: "var(--clr-ink-muted)" }}>
          {isRegister ? "Already have an account? " : "Don't have an account? "}
          <button
            className="text-button"
            onClick={() => setIsRegister((v) => !v)}
            type="button"
            style={{ fontSize: "0.875rem", fontWeight: 700 }}
          >
            {isRegister ? "Sign in" : "Create one"}
          </button>
        </div>
      </div>
    </main>
  );
}