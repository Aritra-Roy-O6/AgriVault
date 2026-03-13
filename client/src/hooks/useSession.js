import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { apiBaseUrl, auth } from "../firebase";

export default function useSession() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(localStorage.getItem("userRole"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null);
        setRole(null);
        localStorage.removeItem("userRole");
        setLoading(false);
        return;
      }

      setUser(nextUser);

      try {
        const token = await nextUser.getIdToken();
        const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Unable to load user profile.");
        }

        setRole(data.user.role);
        localStorage.setItem("userRole", data.user.role);
      } catch (_error) {
        const fallbackRole = localStorage.getItem("userRole");
        setRole(fallbackRole || null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, role, loading };
}