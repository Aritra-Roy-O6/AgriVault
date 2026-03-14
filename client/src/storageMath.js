const CATEGORY_STORAGE_SPECS = {
  clothes: {
    label: "Clothes",
    quantityUnit: "cartons",
    cubicFtPerUnit: 6.2,
    singleLayerHeightFt: 1.8,
    maxStackHeightFt: 7,
    handlingFactor: 1.1,
    floorUtilizationRate: 0.76,
    supportMarginRate: 1.04,
    billingIncrementSqft: 5,
    minimumBillableSqft: 20,
  },
  fabrics: {
    label: "Fabrics",
    quantityUnit: "rolls",
    cubicFtPerUnit: 7.4,
    singleLayerHeightFt: 2.2,
    maxStackHeightFt: 8,
    handlingFactor: 1.12,
    floorUtilizationRate: 0.74,
    supportMarginRate: 1.04,
    billingIncrementSqft: 5,
    minimumBillableSqft: 20,
  },
  grains: {
    label: "Grains",
    quantityUnit: "quintals",
    cubicFtPerUnit: 4.9,
    singleLayerHeightFt: 1.6,
    maxStackHeightFt: 8,
    handlingFactor: 1.14,
    floorUtilizationRate: 0.68,
    supportMarginRate: 1.06,
    billingIncrementSqft: 5,
    minimumBillableSqft: 25,
    farm: true,
    loanRate: 2800,
  },
  wheat: {
    label: "Wheat",
    quantityUnit: "quintals",
    cubicFtPerUnit: 4.8,
    singleLayerHeightFt: 1.6,
    maxStackHeightFt: 8,
    handlingFactor: 1.14,
    floorUtilizationRate: 0.68,
    supportMarginRate: 1.06,
    billingIncrementSqft: 5,
    minimumBillableSqft: 25,
    farm: true,
    loanRate: 2800,
  },
  rice: {
    label: "Rice",
    quantityUnit: "quintals",
    cubicFtPerUnit: 5.1,
    singleLayerHeightFt: 1.6,
    maxStackHeightFt: 8,
    handlingFactor: 1.15,
    floorUtilizationRate: 0.67,
    supportMarginRate: 1.06,
    billingIncrementSqft: 5,
    minimumBillableSqft: 25,
    farm: true,
    loanRate: 3200,
  },
  pulses: {
    label: "Pulses",
    quantityUnit: "quintals",
    cubicFtPerUnit: 4.7,
    singleLayerHeightFt: 1.6,
    maxStackHeightFt: 7,
    handlingFactor: 1.13,
    floorUtilizationRate: 0.68,
    supportMarginRate: 1.06,
    billingIncrementSqft: 5,
    minimumBillableSqft: 25,
    farm: true,
    loanRate: 5500,
  },
  vegetables: {
    label: "Vegetables",
    quantityUnit: "crates",
    cubicFtPerUnit: 2.4,
    singleLayerHeightFt: 1.5,
    maxStackHeightFt: 5,
    handlingFactor: 1.18,
    floorUtilizationRate: 0.62,
    supportMarginRate: 1.08,
    billingIncrementSqft: 5,
    minimumBillableSqft: 25,
    farm: true,
    loanRate: 1800,
  },
  fruits: {
    label: "Fruits",
    quantityUnit: "crates",
    cubicFtPerUnit: 2.6,
    singleLayerHeightFt: 1.6,
    maxStackHeightFt: 5,
    handlingFactor: 1.2,
    floorUtilizationRate: 0.6,
    supportMarginRate: 1.08,
    billingIncrementSqft: 5,
    minimumBillableSqft: 25,
    farm: true,
    loanRate: 4200,
  },
  electronics: {
    label: "Electronics",
    quantityUnit: "boxes",
    cubicFtPerUnit: 3.2,
    singleLayerHeightFt: 1.6,
    maxStackHeightFt: 6,
    handlingFactor: 1.1,
    floorUtilizationRate: 0.75,
    supportMarginRate: 1.05,
    billingIncrementSqft: 5,
    minimumBillableSqft: 20,
  },
  cosmetics: {
    label: "Cosmetics",
    quantityUnit: "cartons",
    cubicFtPerUnit: 2.1,
    singleLayerHeightFt: 1.4,
    maxStackHeightFt: 6,
    handlingFactor: 1.1,
    floorUtilizationRate: 0.75,
    supportMarginRate: 1.05,
    billingIncrementSqft: 5,
    minimumBillableSqft: 20,
  },
  furniture: {
    label: "Furniture",
    quantityUnit: "items",
    cubicFtPerUnit: 18,
    singleLayerHeightFt: 3,
    maxStackHeightFt: 4,
    handlingFactor: 1.08,
    floorUtilizationRate: 0.56,
    supportMarginRate: 1.08,
    billingIncrementSqft: 10,
    minimumBillableSqft: 35,
  },
  decorations: {
    label: "Decorations",
    quantityUnit: "boxes",
    cubicFtPerUnit: 3.9,
    singleLayerHeightFt: 1.8,
    maxStackHeightFt: 6,
    handlingFactor: 1.12,
    floorUtilizationRate: 0.72,
    supportMarginRate: 1.05,
    billingIncrementSqft: 5,
    minimumBillableSqft: 20,
  },
  tiles: {
    label: "Tiles",
    quantityUnit: "pallets",
    cubicFtPerUnit: 13.2,
    singleLayerHeightFt: 2.2,
    maxStackHeightFt: 5,
    handlingFactor: 1.08,
    floorUtilizationRate: 0.7,
    supportMarginRate: 1.05,
    billingIncrementSqft: 10,
    minimumBillableSqft: 25,
  },
  "steel/iron": {
    label: "Steel / Iron",
    quantityUnit: "bundles",
    cubicFtPerUnit: 16.5,
    singleLayerHeightFt: 2.4,
    maxStackHeightFt: 5,
    handlingFactor: 1.08,
    floorUtilizationRate: 0.72,
    supportMarginRate: 1.05,
    billingIncrementSqft: 10,
    minimumBillableSqft: 25,
  },
  produce: {
    label: "Produce",
    quantityUnit: "quintals",
    cubicFtPerUnit: 5.2,
    singleLayerHeightFt: 1.6,
    maxStackHeightFt: 7,
    handlingFactor: 1.16,
    floorUtilizationRate: 0.66,
    supportMarginRate: 1.06,
    billingIncrementSqft: 5,
    minimumBillableSqft: 25,
    farm: true,
    loanRate: 2500,
  },
  other: {
    label: "Other",
    quantityUnit: "units",
    cubicFtPerUnit: 3.8,
    singleLayerHeightFt: 1.8,
    maxStackHeightFt: 6,
    handlingFactor: 1.12,
    floorUtilizationRate: 0.7,
    supportMarginRate: 1.05,
    billingIncrementSqft: 5,
    minimumBillableSqft: 20,
  },
};

export const supportedStorageCategories = Object.keys(CATEGORY_STORAGE_SPECS).filter(
  (category) => category !== "other"
);

function normalizeCategory(category) {
  return String(category || "other").trim().toLowerCase();
}

function roundUpToIncrement(value, increment) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  const safeIncrement = Math.max(1, Number(increment || 1));
  return Math.ceil(value / safeIncrement) * safeIncrement;
}

export function getStorageSpec(category) {
  const normalized = normalizeCategory(category);
  return CATEGORY_STORAGE_SPECS[normalized] || CATEGORY_STORAGE_SPECS.other;
}

export function computeRequiredSqft({ category, quantity, stackable, warehouseHeightFt }) {
  const spec = getStorageSpec(category);
  const numericQuantity = Number(quantity || 0);
  const clearHeightFt = Number(warehouseHeightFt || 10);

  if (!Number.isFinite(numericQuantity) || numericQuantity <= 0) {
    return {
      requiredSqft: 0,
      billableSqft: 0,
      rawSqft: 0,
      storageFootprintSqft: 0,
      aisleReserveSqft: 0,
      grossVolumeCuFt: 0,
      handledVolumeCuFt: 0,
      stackHeightFt: 0,
      usableHeightFt: 0,
      stackLayers: 0,
      cubicFtPerUnit: spec.cubicFtPerUnit,
      handlingFactor: spec.handlingFactor,
      floorUtilizationRate: spec.floorUtilizationRate,
      billingIncrementSqft: spec.billingIncrementSqft,
      minimumBillableSqft: spec.minimumBillableSqft,
    };
  }

  const sprinklerAndHandlingClearanceFt = 1;
  const usableHeightFt = Math.max(
    Math.min(clearHeightFt - sprinklerAndHandlingClearanceFt, clearHeightFt * 0.9),
    spec.singleLayerHeightFt,
    1
  );
  const safeStackHeightFt = stackable
    ? Math.min(spec.maxStackHeightFt, usableHeightFt)
    : spec.singleLayerHeightFt;
  const stackLayers = Math.max(1, Math.floor((safeStackHeightFt + 0.01) / spec.singleLayerHeightFt));
  const effectiveStackHeightFt = Math.max(
    spec.singleLayerHeightFt,
    Math.min(usableHeightFt, stackLayers * spec.singleLayerHeightFt)
  );
  const grossVolumeCuFt = numericQuantity * spec.cubicFtPerUnit;
  const handledVolumeCuFt = grossVolumeCuFt * spec.handlingFactor;
  const storageFootprintSqft = handledVolumeCuFt / Math.max(effectiveStackHeightFt, 1);
  const rawSqft = storageFootprintSqft / Math.max(spec.floorUtilizationRate, 0.45);
  const bufferedSqft = rawSqft * spec.supportMarginRate;
  const billableSqft = Math.max(
    spec.minimumBillableSqft,
    roundUpToIncrement(bufferedSqft, spec.billingIncrementSqft)
  );
  const aisleReserveSqft = Math.max(0, billableSqft - storageFootprintSqft);

  return {
    requiredSqft: billableSqft,
    billableSqft,
    rawSqft: Number(rawSqft.toFixed(2)),
    storageFootprintSqft: Number(storageFootprintSqft.toFixed(2)),
    aisleReserveSqft: Number(aisleReserveSqft.toFixed(2)),
    grossVolumeCuFt: Number(grossVolumeCuFt.toFixed(2)),
    handledVolumeCuFt: Number(handledVolumeCuFt.toFixed(2)),
    stackHeightFt: Number(effectiveStackHeightFt.toFixed(2)),
    usableHeightFt: Number(usableHeightFt.toFixed(2)),
    stackLayers,
    cubicFtPerUnit: spec.cubicFtPerUnit,
    handlingFactor: spec.handlingFactor,
    floorUtilizationRate: spec.floorUtilizationRate,
    billingIncrementSqft: spec.billingIncrementSqft,
    minimumBillableSqft: spec.minimumBillableSqft,
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
