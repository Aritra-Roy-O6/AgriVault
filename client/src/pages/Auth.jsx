import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, apiBaseUrl } from "../firebase";

const roleMeta = {
  business: {
    label: "Businessmen",
    title: "Storage for inventory and overflow stock",
    description: "Best for retailers, sellers, traders, and small businesses booking storage.",
    themeClass: "auth-theme-business",
  },
  owner: {
    label: "Space Owners",
    title: "List and manage your storage space",
    description: "Best for owners listing rooms, garages, godowns, and warehouse bays.",
    themeClass: "auth-theme-owner",
  },
  farmer: {
    label: "Farmers",
    title: "AgriVault for produce storage and grading",
    description: "Best for farmers who need storage, quality receipts, and grading support.",
    themeClass: "auth-theme-farmer",
  },
};

const allowedRoles = Object.keys(roleMeta);

const createInitialForm = (role = "business") => ({
  name: "",
  email: "",
  password: "",
  phone: "",
  pincode: "",
  role,
});

function normalizeRole(candidate) {
  return allowedRoles.includes(candidate) ? candidate : "business";
}

function roleRedirect(nextRole) {
  if (nextRole === "owner") return "/dashboard/owner";
  if (nextRole === "business") return "/dashboard/business";
  return "/dashboard/farmer";
}

export default function Auth({ loading: sessionLoading, role, user }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedRole = normalizeRole(searchParams.get("role"));
  const [isRegister, setIsRegister] = useState(true);
  const [form, setForm] = useState(() => createInitialForm(selectedRole));
  const [loading, setLoading] = useState(false);
  const selectedMeta = useMemo(() => roleMeta[form.role], [form.role]);

  useEffect(() => {
    setForm((current) => ({ ...current, role: selectedRole }));
  }, [selectedRole]);

  useEffect(() => {
    if (!sessionLoading && user && role) {
      navigate(roleRedirect(role), { replace: true });
    }
  }, [navigate, role, sessionLoading, user]);

  const updateForm = (event) =>
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const registerProfile = async (nextUser, overrides = {}) => {
    const token = await nextUser.getIdToken();
    const payload = {
      name: overrides.name ?? form.name,
      role: overrides.role ?? form.role,
      phone: overrides.phone ?? form.phone,
      pincode: overrides.pincode ?? form.pincode,
    };

    const res = await fetch(`${apiBaseUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Unable to register profile.");
    localStorage.setItem("userRole", data.user.role);
    return data.user;
  };

  const getProfile = async (nextUser) => {
    const token = await nextUser.getIdToken();
    const res = await fetch(`${apiBaseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.message || "Unable to load your profile.");
      error.status = res.status;
      throw error;
    }
    localStorage.setItem("userRole", data.user.role);
    return data.user;
  };

  const bootstrapMissingProfile = async (nextUser) => {
    const fallbackName = nextUser.displayName || nextUser.email?.split("@")[0] || "User";
    return registerProfile(nextUser, {
      name: fallbackName,
      role: selectedRole,
      phone: "",
      pincode: "",
    });
  };

  const syncDisplayName = async (nextUser, name) => {
    const normalizedName = String(name || "").trim();
    if (!normalizedName || nextUser.displayName === normalizedName) {
      return;
    }

    await updateProfile(nextUser, { displayName: normalizedName });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const credential = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await syncDisplayName(credential.user, form.name);
        const userProfile = await registerProfile(credential.user);
        toast.success("Account created.");
        navigate(roleRedirect(userProfile.role), { replace: true });
      } else {
        const credential = await signInWithEmailAndPassword(auth, form.email, form.password);
        let userProfile;

        try {
          userProfile = await getProfile(credential.user);
        } catch (error) {
          if (error.status !== 404) {
            throw error;
          }
          userProfile = await bootstrapMissingProfile(credential.user);
        }

        await syncDisplayName(credential.user, userProfile.name);
        toast.success("Signed in.");
        navigate(roleRedirect(userProfile.role), { replace: true });
      }
      setForm(createInitialForm(selectedRole));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-center fade-up auth-page-grid">
      <section className="auth-role-column">
        {allowedRoles.map((candidate) => {
          const meta = roleMeta[candidate];
          const active = form.role === candidate;

          return (
            <button
              className={`auth-role-card ${meta.themeClass}${active ? " active" : ""}`}
              key={candidate}
              onClick={() => setForm((current) => ({ ...current, role: candidate }))}
              type="button"
            >
              <p className="eyebrow">{meta.eyebrow}</p>
              <h3>{meta.label}</h3>
              <p>{meta.description}</p>
            </button>
          );
        })}
      </section>

      <section className={`card auth-card auth-card-wide ${selectedMeta.themeClass}`}>
        <p className="eyebrow">{selectedMeta.eyebrow}</p>
        <h2 style={{ marginBottom: "0.25rem" }}>{isRegister ? selectedMeta.title : `Sign in as ${selectedMeta.label}`}</h2>
        <p style={{ fontSize: "0.88rem", marginBottom: "1.5rem" }}>{selectedMeta.description}</p>

        <form className="form-grid" onSubmit={handleSubmit}>
          {isRegister ? (
            <>
              <label>
                Full Name
                <input name="name" onChange={updateForm} placeholder="Your full name" required value={form.name} />
              </label>
              <div className="form-row">
                <label>
                  Phone
                  <input name="phone" onChange={updateForm} placeholder="+91 9876543210" required value={form.phone} />
                </label>
                <label>
                  Pincode
                  <input name="pincode" onChange={updateForm} placeholder="700001" required value={form.pincode} />
                </label>
              </div>
            </>
          ) : null}
          <label>
            Email address
            <input name="email" onChange={updateForm} placeholder="you@example.com" required type="email" value={form.email} />
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

          <button className="button button-full" disabled={loading} type="submit" style={{ marginTop: "4px" }}>
            {loading ? "Please wait..." : isRegister ? `Create ${selectedMeta.label} Account` : `Sign In`}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.875rem" }}>
          {isRegister ? "Already have an account? " : "Need an account? "}
          <button
            className="text-button"
            onClick={() => setIsRegister((value) => !value)}
            type="button"
            style={{ fontSize: "0.875rem", fontWeight: 700 }}
          >
            {isRegister ? "Sign in" : "Create one"}
          </button>
        </div>
      </section>
    </main>
  );
}
