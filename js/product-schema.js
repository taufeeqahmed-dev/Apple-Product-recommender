const FAMILY_IDS = new Set(["macbook-neo", "macbook-air", "macbook-pro"]);
const CONFIGURATION_TYPES = new Set(["base"]);
const AVAILABILITY_STATUSES = new Set(["available", "unavailable", "unknown"]);
const SOURCE_TYPES = new Set([
  "product",
  "buying",
  "technical-specifications",
  "support",
]);

const OFFICIAL_APPLE_UK_HOSTS = new Set(["www.apple.com", "support.apple.com"]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isIsoDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isOfficialAppleUkUrl(value) {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    const hasUkPath = url.hostname === "support.apple.com" || url.pathname.startsWith("/uk/");
    return url.protocol === "https:" && OFFICIAL_APPLE_UK_HOSTS.has(url.hostname) && hasUkPath;
  } catch {
    return false;
  }
}

function isStringOrNull(value) {
  return value === null || (typeof value === "string" && value.length > 0);
}

function isNumberOrNull(value, { integer = false, minimum = 0 } = {}) {
  if (value === null) return true;
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) return false;
  return !integer || Number.isInteger(value);
}

function requireProperties(value, properties, path, errors) {
  if (!isObject(value)) {
    errors.push(`${path} must be an object.`);
    return false;
  }

  properties.forEach((property) => {
    if (!Object.hasOwn(value, property)) errors.push(`${path}.${property} is required.`);
  });
  return true;
}

function validateSource(source, path, errors) {
  if (!requireProperties(source, ["type", "url", "verifiedOn", "supportsFields"], path, errors)) {
    return;
  }

  if (!SOURCE_TYPES.has(source.type)) errors.push(`${path}.type is not supported.`);
  if (!isOfficialAppleUkUrl(source.url)) errors.push(`${path}.url must be an official Apple UK URL.`);
  if (!isIsoDate(source.verifiedOn)) errors.push(`${path}.verifiedOn must use YYYY-MM-DD.`);
  if (
    !Array.isArray(source.supportsFields) ||
    source.supportsFields.length === 0 ||
    source.supportsFields.some((field) => typeof field !== "string" || field.length === 0)
  ) {
    errors.push(`${path}.supportsFields must be a non-empty array of field paths.`);
  }
}

function validateProduct(product, index, errors) {
  const path = `products[${index}]`;
  const required = [
    "id",
    "familyId",
    "modelId",
    "configurationType",
    "displayName",
    "configurationName",
    "region",
    "currency",
    "verifiedOn",
    "availability",
    "price",
    "facts",
    "sources",
  ];

  if (!requireProperties(product, required, path, errors)) return;

  if (typeof product.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product.id)) {
    errors.push(`${path}.id must be a stable kebab-case ID.`);
  }
  if (!FAMILY_IDS.has(product.familyId)) errors.push(`${path}.familyId is not supported.`);
  if (typeof product.modelId !== "string" || product.modelId.length === 0) {
    errors.push(`${path}.modelId must be a non-empty string.`);
  }
  if (!CONFIGURATION_TYPES.has(product.configurationType)) {
    errors.push(`${path}.configurationType is not supported.`);
  }
  if (typeof product.displayName !== "string" || product.displayName.length === 0) {
    errors.push(`${path}.displayName must be a non-empty string.`);
  }
  if (typeof product.configurationName !== "string" || product.configurationName.length === 0) {
    errors.push(`${path}.configurationName must be a non-empty string.`);
  }
  if (product.region !== "GB") errors.push(`${path}.region must be GB.`);
  if (product.currency !== "GBP") errors.push(`${path}.currency must be GBP.`);
  if (!isIsoDate(product.verifiedOn)) errors.push(`${path}.verifiedOn must use YYYY-MM-DD.`);

  if (
    requireProperties(
      product.availability,
      ["status", "verifiedOn", "sourceUrl"],
      `${path}.availability`,
      errors,
    )
  ) {
    if (!AVAILABILITY_STATUSES.has(product.availability.status)) {
      errors.push(`${path}.availability.status is not supported.`);
    }
    if (!isIsoDate(product.availability.verifiedOn)) {
      errors.push(`${path}.availability.verifiedOn must use YYYY-MM-DD.`);
    }
    if (!isOfficialAppleUkUrl(product.availability.sourceUrl)) {
      errors.push(`${path}.availability.sourceUrl must be an official Apple UK URL.`);
    }
  }

  if (
    requireProperties(
      product.price,
      ["amountMinor", "snapshotDate", "sourceUrl", "taxTreatment"],
      `${path}.price`,
      errors,
    )
  ) {
    if (!isNumberOrNull(product.price.amountMinor, { integer: true, minimum: 0 })) {
      errors.push(`${path}.price.amountMinor must be a non-negative integer or null.`);
    }
    if (!isIsoDate(product.price.snapshotDate)) {
      errors.push(`${path}.price.snapshotDate must use YYYY-MM-DD.`);
    }
    if (!isOfficialAppleUkUrl(product.price.sourceUrl)) {
      errors.push(`${path}.price.sourceUrl must be an official Apple UK URL.`);
    }
    if (!isStringOrNull(product.price.taxTreatment)) {
      errors.push(`${path}.price.taxTreatment must be a non-empty string or null.`);
    }
  }

  const factsPath = `${path}.facts`;
  if (
    requireProperties(
      product.facts,
      [
        "marketedScreenSizeInches",
        "displayDiagonalInches",
        "weightKg",
        "chip",
        "unifiedMemoryGb",
        "storageGb",
        "keyboardFeatureId",
        "displayFinishId",
        "externalDisplaySupport",
      ],
      factsPath,
      errors,
    )
  ) {
    ["marketedScreenSizeInches", "displayDiagonalInches", "weightKg"].forEach((field) => {
      if (!isNumberOrNull(product.facts[field], { minimum: 0 })) {
        errors.push(`${factsPath}.${field} must be a non-negative number or null.`);
      }
    });
    ["unifiedMemoryGb", "storageGb"].forEach((field) => {
      if (!isNumberOrNull(product.facts[field], { integer: true, minimum: 0 })) {
        errors.push(`${factsPath}.${field} must be a non-negative integer or null.`);
      }
    });
    ["keyboardFeatureId", "displayFinishId"].forEach((field) => {
      if (!isStringOrNull(product.facts[field])) {
        errors.push(`${factsPath}.${field} must be a non-empty string or null.`);
      }
    });

    const chipPath = `${factsPath}.chip`;
    if (
      requireProperties(
        product.facts.chip,
        ["id", "displayName", "cpuCoreCount", "gpuCoreCount", "neuralEngineCoreCount"],
        chipPath,
        errors,
      )
    ) {
      if (!isStringOrNull(product.facts.chip.id)) errors.push(`${chipPath}.id is invalid.`);
      if (!isStringOrNull(product.facts.chip.displayName)) {
        errors.push(`${chipPath}.displayName is invalid.`);
      }
      ["cpuCoreCount", "gpuCoreCount", "neuralEngineCoreCount"].forEach((field) => {
        if (!isNumberOrNull(product.facts.chip[field], { integer: true, minimum: 1 })) {
          errors.push(`${chipPath}.${field} must be a positive integer or null.`);
        }
      });
    }

    const displaysPath = `${factsPath}.externalDisplaySupport`;
    if (
      requireProperties(
        product.facts.externalDisplaySupport,
        ["maxCountWithBuiltInDisplayActive", "summary", "sourceUrl"],
        displaysPath,
        errors,
      )
    ) {
      if (
        !isNumberOrNull(product.facts.externalDisplaySupport.maxCountWithBuiltInDisplayActive, {
          integer: true,
          minimum: 0,
        })
      ) {
        errors.push(`${displaysPath}.maxCountWithBuiltInDisplayActive is invalid.`);
      }
      if (!isStringOrNull(product.facts.externalDisplaySupport.summary)) {
        errors.push(`${displaysPath}.summary must be a non-empty string or null.`);
      }
      if (!isOfficialAppleUkUrl(product.facts.externalDisplaySupport.sourceUrl)) {
        errors.push(`${displaysPath}.sourceUrl must be an official Apple UK URL.`);
      }
    }
  }

  if (!Array.isArray(product.sources) || product.sources.length === 0) {
    errors.push(`${path}.sources must be a non-empty array.`);
  } else {
    product.sources.forEach((source, sourceIndex) =>
      validateSource(source, `${path}.sources[${sourceIndex}]`, errors),
    );
    if (!product.sources.some((source) => source?.type === "buying")) {
      errors.push(`${path}.sources must include a buying source.`);
    }
    if (!product.sources.some((source) => source?.type === "technical-specifications")) {
      errors.push(`${path}.sources must include a technical-specifications source.`);
    }
  }
}

export function validateProductCatalogue(catalogue) {
  const errors = [];

  if (
    !requireProperties(
      catalogue,
      ["schemaVersion", "region", "currency", "verifiedOn", "products"],
      "catalogue",
      errors,
    )
  ) {
    return { valid: false, errors };
  }

  if (catalogue.schemaVersion !== "1.0.0") errors.push("catalogue.schemaVersion must be 1.0.0.");
  if (catalogue.region !== "GB") errors.push("catalogue.region must be GB.");
  if (catalogue.currency !== "GBP") errors.push("catalogue.currency must be GBP.");
  if (!isIsoDate(catalogue.verifiedOn)) {
    errors.push("catalogue.verifiedOn must use YYYY-MM-DD.");
  }
  if (!Array.isArray(catalogue.products)) {
    errors.push("catalogue.products must be an array.");
  } else {
    catalogue.products.forEach((product, index) => validateProduct(product, index, errors));
    const ids = catalogue.products.map((product) => product?.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) errors.push("catalogue.products contains duplicate IDs.");
  }

  return { valid: errors.length === 0, errors };
}

export function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

export function createProductCatalogue(catalogue) {
  const validation = validateProductCatalogue(catalogue);
  if (!validation.valid) {
    throw new TypeError(`Invalid product catalogue:\n${validation.errors.join("\n")}`);
  }
  return deepFreeze(catalogue);
}
