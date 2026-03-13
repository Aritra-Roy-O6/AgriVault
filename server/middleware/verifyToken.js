import { auth } from "../firebase-admin.js";

export default async function verifyToken(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Missing Authorization header." });
    }

    const token = header.replace("Bearer ", "");
    const decoded = await auth.verifyIdToken(token);

    req.user = {
      uid: decoded.uid,
      email: decoded.email || "",
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token.", detail: error.message });
  }
}