const CATEGORY_STORAGE_SPECS = {
  clothes: {
    label: "Clothes",
    quantityUnit: "cartons",
    cubicFtPerUnit: 6.5,
    singleLayerHeightFt: 1.8,
    maxStackHeightFt: 7,
    handlingFactor: 1.22,
  },
  fabrics: {
    label: "Fabrics",
    quantityUnit: "rolls",
    cubicFtPerUnit: 8,
    singleLayerHeightFt: 2.2,
    maxStackHeightFt: 8,
    handlingFactor: 1.18,
  },
  grains: {
    label: "Grains",
    quantityUnit: "quintals",
    cubicFtPerUnit: 5.4,
    singleLayerHeightFt: 1.6,
    maxStackHeightFt: 8,
    handlingFactor: 1.28,
    farm: true,
    loanRate: 2800,
  },
  wheat: {
    label: "Wheat",
    quantityUnit: "quintals",
    cubicFtPerUnit: 5.4,
    singleLayerHeightFt: 1.6,
    maxStackHeightFt: 8,
    handlingFactor: 1.28,
    farm: true,
    loanRate: 2800,
  },
  rice: {
    label: "Rice",
    quantityUnit: "quintals",
    cubicFtPerUnit: 5.8,
    singleLayerHeightFt: 1.6,
    maxStackHeightFt: 8,
    handlingFactor: 1.3,
    farm: true,
    loanRate: 3200,
  },
  pulses: {
    label: "Pulses",
    quantityUnit: "quintals",
    cubicFtPerUnit: 5.1,
    singleLayerHeightFt: 1.6,
    maxStackHeightFt: 7,
    handlingFactor: 1.28,
    farm: true,
    loanRate: 5500,
  },
  vegetables: {
    label: "Vegetables",
    quantityUnit: "crates",
    cubicFtPerUnit: 2.6,
    singleLayerHeightFt: 1.5,
    maxStackHeightFt: 5,
    handlingFactor: 1.35,
    farm: true,
    loanRate: 1800,
  },
  fruits: {
    label: "Fruits",
    quantityUnit: "crates",
    cubicFtPerUnit: 2.8,
    singleLayerHeightFt: 1.6,
    maxStackHeightFt: 5,
    handlingFactor: 1.38,
    farm: true,
    loanRate: 4200,
  },
  electronics: {
    label: "Electronics",
    quantityUnit: "boxes",
    cubicFtPerUnit: 3.4,
    singleLayerHeightFt: 1.6,
    maxStackHeightFt: 6,
    handlingFactor: 1.2,
  },
  cosmetics: {
    label: "Cosmetics",
    quantityUnit: "cartons",
    cubicFtPerUnit: 2.2,
    singleLayerHeightFt: 1.4,
    maxStackHeightFt: 6,
    handlingFactor: 1.18,
  },
  furniture: {
    label: "Furniture",
    quantityUnit: "items",
    cubicFtPerUnit: 20,
    singleLayerHeightFt: 3,
    maxStackHeightFt: 4,
    handlingFactor: 1.15,
  },
  decorations: {
    label: "Decorations",
    quantityUnit: "boxes",
    cubicFtPerUnit: 4.2,
    singleLayerHeightFt: 1.8,
    maxStackHeightFt: 6,
    handlingFactor: 1.2,
  },
  tiles: {
    label: "Tiles",
    quantityUnit: "pallets",
    cubicFtPerUnit: 14,
    singleLayerHeightFt: 2.2,
    maxStackHeightFt: 5,
    handlingFactor: 1.15,
  },
  "steel/iron": {
    label: "Steel / Iron",
    quantityUnit: "bundles",
    cubicFtPerUnit: 18,
    singleLayerHeightFt: 2.4,
    maxStackHeightFt: 5,
    handlingFactor: 1.12,
  },
  produce: {
    label: "Produce",
    quantityUnit: "quintals",
    cubicFtPerUnit: 5.8,
    singleLayerHeightFt: 1.6,
    maxStackHeightFt: 7,
    handlingFactor: 1.32,
    farm: true,
    loanRate: 2500,
  },
  other: {
    label: "Other",
    quantityUnit: "units",
    cubicFtPerUnit: 4,
    singleLayerHeightFt: 1.8,
    maxStackHeightFt: 6,
    handlingFactor: 1.25,
  },
};

export const supportedStorageCategories = Object.keys(CATEGORY_STORAGE_SPECS).filter(
  (category) => category !== "other"
);

function normalizeCategory(category) {
  return String(category || "other").trim().toLowerCase();
}

export function getStorageSpec(category) {
  const normalized = normalizeCategory(category);
  return CATEGORY_STORAGE_SPECS[normalized] || CATEGORY_STORAGE_SPECS.other;
}

export function computeRequiredSqft({ category, quantity, stackable, warehouseHeightFt }) {
  const spec = getStorageSpec(category);
  const numericQuantity = Number(quantity || 0);
  const clearHeightFt = Number(warehouseHeightFt || 10);
  const usableHeightFt = Math.max(clearHeightFt * 0.85, spec.singleLayerHeightFt, 1);
  const targetStackHeightFt = stackable
    ? Math.min(spec.maxStackHeightFt, usableHeightFt)
    : spec.singleLayerHeightFt;
  const grossVolume = numericQuantity * spec.cubicFtPerUnit * spec.handlingFactor;
  const rawSqft = grossVolume / Math.max(targetStackHeightFt, 1);
  const requiredSqft = Math.max(1, Math.ceil(rawSqft));

  return {
    requiredSqft,
    stackHeightFt: Number(targetStackHeightFt.toFixed(2)),
    usableHeightFt: Number(usableHeightFt.toFixed(2)),
    cubicFtPerUnit: spec.cubicFtPerUnit,
    handlingFactor: spec.handlingFactor,
  };
}

export function isFarmCategory(category) {
  return Boolean(getStorageSpec(category).farm);
}

export function getLoanRate(category) {
  return Number(getStorageSpec(category).loanRate || 0);
}

export function getQuantityUnit(category) {
  return getStorageSpec(category).quantityUnit;
}

export function getCategoryLabel(category) {
  return getStorageSpec(category).label;
}
