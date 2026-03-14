import { supportedStorageCategories } from "./storageMath";

export const storageRequirements = {
  clothes: { env: ["dry", "pest-free"], secure: false, covered: true },
  fabrics: { env: ["dry", "pest-free"], secure: false, covered: true },
  grains: { env: ["dry", "pest-free"], secure: false, covered: true },
  wheat: { env: ["dry", "pest-free"], secure: false, covered: true },
  rice: { env: ["dry", "pest-free"], secure: false, covered: true },
  pulses: { env: ["dry", "pest-free"], secure: false, covered: true },
  vegetables: { env: ["cold", "ventilated"], secure: false, covered: true },
  fruits: { env: ["cold", "ventilated"], secure: false, covered: true },
  electronics: { env: ["dry", "secure"], secure: true, covered: true },
  cosmetics: { env: ["dry", "humidity-controlled"], secure: true, covered: true },
  furniture: { env: ["covered", "ventilated"], secure: false, covered: true },
  decorations: { env: ["dry", "covered"], secure: false, covered: true },
  tiles: { env: ["covered", "dry"], secure: false, covered: true },
  "steel/iron": { env: ["covered", "ventilated"], secure: false, covered: true },
  produce: { env: ["dry", "cold", "pest-free"], secure: false, covered: true },
};

export const defaultCategories = supportedStorageCategories;

export const environmentTagOptions = [
  { value: "dry", label: "Dry" },
  { value: "cold", label: "Cold" },
  { value: "pest-free", label: "Pest free" },
  { value: "covered", label: "Covered" },
  { value: "secure", label: "Secure" },
  { value: "ventilated", label: "Ventilated" },
  { value: "humidity-controlled", label: "Humidity controlled" },
];

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeEnvironmentTag(value) {
  const normalized = normalize(value);
  if (normalized === "cool") {
    return "cold";
  }
  return normalized;
}

export function parseCsv(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function scoreWarehouseMatch(warehouse, requestedCategory, requestedLocation = "") {
  const category = normalize(requestedCategory);
  const location = normalize(requestedLocation);
  const requirements = storageRequirements[category] || null;
  const supportedCategories = (warehouse.supportedCategories || warehouse.produces || []).map(normalize);
  const environmentTags = (warehouse.environmentTags || []).map(normalizeEnvironmentTag);
  const searchableLocation = [warehouse.address, warehouse.pincode, warehouse.name].map(normalize).join(" ");

  let score = 40;
  const reasons = [];

  if (!category || supportedCategories.includes(category)) {
    score += 25;
    reasons.push("Category fit");
  }

  if (requirements?.env?.some((tag) => environmentTags.includes(normalizeEnvironmentTag(tag)))) {
    score += 20;
    reasons.push("Environment fit");
  }

  if (!location || searchableLocation.includes(location)) {
    score += 10;
    reasons.push("Location fit");
  }

  if (Number(warehouse.availableSqft || 0) > 0) {
    score += 5;
    reasons.push("Available now");
  }

  const rating = Number(warehouse.rating || 0);
  if (rating >= 4.5) {
    score += 10;
    reasons.push("Strong rating");
  } else if (rating >= 4) {
    score += 5;
    reasons.push("Good rating");
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons,
  };
}
