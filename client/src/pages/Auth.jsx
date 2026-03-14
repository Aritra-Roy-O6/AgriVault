import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { auth, apiBaseUrl } from "../firebase";

const AUTH_COPY = {
  en: {
    roleMeta: {
      business: {
        label: "Businessmen",
        eyebrow: "Business Access",
        title: "Storage for inventory and overflow stock",
        description: "Best for retailers, sellers, traders, and small businesses booking storage.",
      },
      owner: {
        label: "Space Owners",
        eyebrow: "Owner Access",
        title: "List and manage your storage space",
        description: "Best for owners listing rooms, garages, godowns, and warehouse bays.",
      },
      farmer: {
        label: "Farmers",
        eyebrow: "Farmer Access",
        title: "AgriVault for produce storage and grading",
        description: "Best for farmers who need storage, quality receipts, and grading support.",
      },
    },
    form: {
      fullName: "Full Name",
      phone: "Phone",
      pincode: "Pincode",
      email: "Email address",
      password: "Password",
      namePlaceholder: "Your full name",
      phonePlaceholder: "+91 9876543210",
      pincodePlaceholder: "700001",
      emailPlaceholder: "you@example.com",
      passwordRegisterPlaceholder: "Min 8 characters",
      passwordLoginPlaceholder: "Your password",
      loading: "Please wait...",
      registerButton: "Create {{role}} Account",
      loginButton: "Sign In",
      signInAs: "Sign in as {{role}}",
      alreadyHave: "Already have an account?",
      needAccount: "Need an account?",
      signIn: "Sign in",
      createOne: "Create one",
    },
    toast: {
      registerSuccess: "Account created.",
      loginSuccess: "Signed in.",
      registerFailed: "Unable to register profile.",
      profileLoadFailed: "Unable to load your profile.",
    },
  },
  hi: {
    roleMeta: {
      business: {
        label: "व्यवसायी",
        eyebrow: "बिजनेस एक्सेस",
        title: "इन्वेंटरी और ओवरफ्लो स्टॉक के लिए स्टोरेज",
        description: "रिटेलर, सेलर, ट्रेडर और छोटे व्यवसायों के लिए सबसे उपयुक्त।",
      },
      owner: {
        label: "स्पेस ओनर्स",
        eyebrow: "ओनर एक्सेस",
        title: "अपनी स्टोरेज स्पेस लिस्ट और मैनेज करें",
        description: "कमरे, गैरेज, गोदाम और वेयरहाउस बे लिस्ट करने वाले ओनर्स के लिए।",
      },
      farmer: {
        label: "किसान",
        eyebrow: "फार्मर एक्सेस",
        title: "उत्पाद भंडारण और ग्रेडिंग के लिए AgriVault",
        description: "उन किसानों के लिए जिनको स्टोरेज, क्वालिटी रसीद और ग्रेडिंग सपोर्ट चाहिए।",
      },
    },
    form: {
      fullName: "पूरा नाम",
      phone: "फोन",
      pincode: "पिनकोड",
      email: "ईमेल पता",
      password: "पासवर्ड",
      namePlaceholder: "अपना पूरा नाम",
      phonePlaceholder: "+91 9876543210",
      pincodePlaceholder: "700001",
      emailPlaceholder: "you@example.com",
      passwordRegisterPlaceholder: "कम से कम 8 अक्षर",
      passwordLoginPlaceholder: "अपना पासवर्ड",
      loading: "कृपया प्रतीक्षा करें...",
      registerButton: "{{role}} अकाउंट बनाएं",
      loginButton: "साइन इन",
      signInAs: "{{role}} के रूप में साइन इन करें",
      alreadyHave: "क्या आपके पास पहले से अकाउंट है?",
      needAccount: "क्या आपको अकाउंट चाहिए?",
      signIn: "साइन इन",
      createOne: "नया बनाएं",
    },
    toast: {
      registerSuccess: "अकाउंट बन गया।",
      loginSuccess: "साइन इन हो गया।",
      registerFailed: "प्रोफाइल रजिस्टर नहीं हो सकी।",
      profileLoadFailed: "आपकी प्रोफाइल लोड नहीं हो सकी।",
    },
  },
  bn: {
    roleMeta: {
      business: {
        label: "ব্যবসায়ী",
        eyebrow: "বিজনেস অ্যাক্সেস",
        title: "ইনভেন্টরি ও ওভারফ্লো স্টকের জন্য স্টোরেজ",
        description: "রিটেইলার, বিক্রেতা, ট্রেডার এবং ছোট ব্যবসার জন্য সবচেয়ে উপযোগী।",
      },
      owner: {
        label: "স্পেস ওনার",
        eyebrow: "ওনার অ্যাক্সেস",
        title: "নিজের স্টোরেজ স্পেস লিস্ট ও ম্যানেজ করুন",
        description: "ঘর, গ্যারেজ, গোডাউন এবং ওয়্যারহাউস বে লিস্ট করা ওনারদের জন্য।",
      },
      farmer: {
        label: "কৃষক",
        eyebrow: "ফার্মার অ্যাক্সেস",
        title: "ফসল সংরক্ষণ ও গ্রেডিংয়ের জন্য AgriVault",
        description: "যেসব কৃষকের স্টোরেজ, কোয়ালিটি রসিদ এবং গ্রেডিং সাপোর্ট দরকার তাদের জন্য।",
      },
    },
    form: {
      fullName: "পূর্ণ নাম",
      phone: "ফোন",
      pincode: "পিনকোড",
      email: "ইমেল ঠিকানা",
      password: "পাসওয়ার্ড",
      namePlaceholder: "আপনার পূর্ণ নাম",
      phonePlaceholder: "+91 9876543210",
      pincodePlaceholder: "700001",
      emailPlaceholder: "you@example.com",
      passwordRegisterPlaceholder: "কমপক্ষে 8 অক্ষর",
      passwordLoginPlaceholder: "আপনার পাসওয়ার্ড",
      loading: "অনুগ্রহ করে অপেক্ষা করুন...",
      registerButton: "{{role}} অ্যাকাউন্ট তৈরি করুন",
      loginButton: "সাইন ইন",
      signInAs: "{{role}} হিসেবে সাইন ইন করুন",
      alreadyHave: "আগে থেকেই কি আপনার অ্যাকাউন্ট আছে?",
      needAccount: "নতুন অ্যাকাউন্ট লাগবে?",
      signIn: "সাইন ইন",
      createOne: "নতুন অ্যাকাউন্ট তৈরি করুন",
    },
    toast: {
      registerSuccess: "অ্যাকাউন্ট তৈরি হয়েছে।",
      loginSuccess: "সাইন ইন হয়েছে।",
      registerFailed: "প্রোফাইল রেজিস্টার করা যায়নি।",
      profileLoadFailed: "আপনার প্রোফাইল লোড করা যায়নি।",
    },
  },
};

const allowedRoles = ["business", "owner", "farmer"];

const themeClassByRole = {
  business: "auth-theme-business",
  owner: "auth-theme-owner",
  farmer: "auth-theme-farmer",
};

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
  const { i18n } = useTranslation();
  const copy = useMemo(() => AUTH_COPY[i18n.language] || AUTH_COPY.en, [i18n.language]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedRole = normalizeRole(searchParams.get("role"));
  const [isRegister, setIsRegister] = useState(true);
  const [form, setForm] = useState(() => createInitialForm(selectedRole));
  const [loading, setLoading] = useState(false);
  const selectedMeta = useMemo(() => copy.roleMeta[form.role], [copy, form.role]);

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
    if (!res.ok) throw new Error(data.message || copy.toast.registerFailed);
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
      const error = new Error(data.message || copy.toast.profileLoadFailed);
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
        toast.success(copy.toast.registerSuccess);
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
        toast.success(copy.toast.loginSuccess);
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
          const meta = copy.roleMeta[candidate];
          const active = form.role === candidate;

          return (
            <button
              className={`auth-role-card ${themeClassByRole[candidate]}${active ? " active" : ""}`}
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

      <section className={`card auth-card auth-card-wide ${themeClassByRole[form.role]}`}>
        <p className="eyebrow">{selectedMeta.eyebrow}</p>
        <h2 style={{ marginBottom: "0.25rem" }}>
          {isRegister ? selectedMeta.title : copy.form.signInAs.replace("{{role}}", selectedMeta.label)}
        </h2>
        <p style={{ fontSize: "0.88rem", marginBottom: "1.5rem" }}>{selectedMeta.description}</p>

        <form className="form-grid" onSubmit={handleSubmit}>
          {isRegister ? (
            <>
              <label>
                {copy.form.fullName}
                <input name="name" onChange={updateForm} placeholder={copy.form.namePlaceholder} required value={form.name} />
              </label>
              <div className="form-row">
                <label>
                  {copy.form.phone}
                  <input name="phone" onChange={updateForm} placeholder={copy.form.phonePlaceholder} required value={form.phone} />
                </label>
                <label>
                  {copy.form.pincode}
                  <input name="pincode" onChange={updateForm} placeholder={copy.form.pincodePlaceholder} required value={form.pincode} />
                </label>
              </div>
            </>
          ) : null}
          <label>
            {copy.form.email}
            <input name="email" onChange={updateForm} placeholder={copy.form.emailPlaceholder} required type="email" value={form.email} />
          </label>
          <label>
            {copy.form.password}
            <input
              name="password"
              onChange={updateForm}
              placeholder={isRegister ? copy.form.passwordRegisterPlaceholder : copy.form.passwordLoginPlaceholder}
              required
              type="password"
              value={form.password}
            />
          </label>

          <button className="button button-full" disabled={loading} type="submit" style={{ marginTop: "4px" }}>
            {loading
              ? copy.form.loading
              : isRegister
                ? copy.form.registerButton.replace("{{role}}", selectedMeta.label)
                : copy.form.loginButton}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.875rem" }}>
          {isRegister ? `${copy.form.alreadyHave} ` : `${copy.form.needAccount} `}
          <button
            className="text-button"
            onClick={() => setIsRegister((value) => !value)}
            type="button"
            style={{ fontSize: "0.875rem", fontWeight: 700 }}
          >
            {isRegister ? copy.form.signIn : copy.form.createOne}
          </button>
        </div>
      </section>
    </main>
  );
}
