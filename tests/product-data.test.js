import test from "node:test";
import assert from "node:assert/strict";

import { productCatalogue, products } from "../js/products.js";
import { validateProductCatalogue } from "../js/product-schema.js";

const EXPECTED_CONFIGURATIONS = Object.freeze([
  ["macbook-neo-13-a18-pro-8gb-256gb", 69900, "a18-pro", 6, 5, 8, 256],
  ["macbook-neo-13-a18-pro-8gb-512gb", 79900, "a18-pro", 6, 5, 8, 512],
  ["macbook-air-13-m5-10cpu-8gpu-16gb-512gb", 129900, "m5", 10, 8, 16, 512],
  ["macbook-air-13-m5-10cpu-10gpu-16gb-512gb", 139900, "m5", 10, 10, 16, 512],
  ["macbook-air-15-m5-10cpu-10gpu-16gb-512gb", 149900, "m5", 10, 10, 16, 512],
  ["macbook-pro-14-m5-10cpu-10gpu-16gb-1tb", 199900, "m5", 10, 10, 16, 1000],
  ["macbook-pro-14-m5-pro-15cpu-16gpu-24gb-1tb", 249900, "m5-pro", 15, 16, 24, 1000],
  ["macbook-pro-14-m5-max-18cpu-32gpu-36gb-2tb", 409900, "m5-max", 18, 32, 36, 2000],
  ["macbook-pro-16-m5-pro-18cpu-20gpu-24gb-1tb", 299900, "m5-pro", 18, 20, 24, 1000],
  ["macbook-pro-16-m5-max-18cpu-32gpu-36gb-2tb", 439900, "m5-max", 18, 32, 36, 2000],
]);

test("the verified Apple UK catalogue passes schema validation", () => {
  assert.deepEqual(validateProductCatalogue(productCatalogue), { valid: true, errors: [] });
  assert.equal(products.length, EXPECTED_CONFIGURATIONS.length);
  assert.equal(productCatalogue.region, "GB");
  assert.equal(productCatalogue.currency, "GBP");
  assert.equal(productCatalogue.verifiedOn, "2026-07-31");
});

test("every exact configuration has the verified price and core facts", () => {
  const actual = products.map((product) => [
    product.id,
    product.price.amountMinor,
    product.facts.chip.id,
    product.facts.chip.cpuCoreCount,
    product.facts.chip.gpuCoreCount,
    product.facts.unifiedMemoryGb,
    product.facts.storageGb,
  ]);
  assert.deepEqual(actual, EXPECTED_CONFIGURATIONS);
});

test("every record has dated official Apple UK sources and remains immutable", () => {
  products.forEach((product) => {
    assert.equal(product.region, "GB");
    assert.equal(product.currency, "GBP");
    assert.equal(product.verifiedOn, "2026-07-31");
    assert.equal(product.price.snapshotDate, "2026-07-31");
    assert.equal(product.availability.status, "available");
    assert.equal(product.price.taxTreatment, null);
    assert.match(product.price.sourceUrl, /^https:\/\/www\.apple\.com\/uk\//);
    assert.ok(product.sources.some((source) => source.type === "buying"));
    assert.ok(product.sources.some((source) => source.type === "technical-specifications"));
    product.sources.forEach((source) => assert.equal(source.verifiedOn, "2026-07-31"));
    assert.ok(Object.isFrozen(product));
  });
  assert.ok(Object.isFrozen(productCatalogue));
  assert.ok(Object.isFrozen(products));
});

test("display-finish IDs are recorded only when Apple labels the exact configuration", () => {
  products.forEach((product) => {
    if (product.familyId === "macbook-pro") {
      assert.equal(product.facts.displayFinishId, "standard");
    } else {
      assert.equal(product.facts.displayFinishId, null);
    }
  });
});
