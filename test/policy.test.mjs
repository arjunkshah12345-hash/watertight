import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { seal, precheck, scanOutput, egressFilter, DEFAULT_POLICY } from "../lib/policy.mjs";
import { newKey, seal as enc, open as dec } from "../lib/vault.mjs";

const room = JSON.parse(readFileSync(new URL("../rooms/halyard/room.json", import.meta.url)));
const files = room.files.map((name) => ({ name, text: readFileSync(new URL(`../rooms/halyard/${name}`, import.meta.url), "utf8") }));
const S = seal(files, DEFAULT_POLICY);
const modelText = S.modelDocs.map((d) => d.text).join("\n");

test("no sealed literal reaches the model context", () => {
  assert.deepEqual(scanOutput(modelText, S.sealed), []);
  assert.ok(!modelText.includes("Pelican Maritime"));
  assert.ok(!modelText.includes("Coastline Partners"));
  assert.match(modelText, /C-01/);
});

test("derived metrics expose the deck gaps", () => {
  assert.equal(S.metrics.activeEnterprise, 21);
  assert.equal(S.metrics.arrOct, 3067000);
  assert.equal(Math.round(S.metrics.nrr * 1000), 916);
});

test("precheck refuses sealed intents and allows aggregates", () => {
  assert.equal(precheck("Who are the top 5 customers?", DEFAULT_POLICY, S.sealed)?.policy, "customer_identities");
  assert.equal(precheck("What does the CTO make?", DEFAULT_POLICY, S.sealed)?.policy, "individual_comp");
  assert.equal(precheck("Who owns the most equity?", DEFAULT_POLICY, S.sealed)?.policy, "cap_table_holders");
  assert.equal(precheck("Tell me about Pelican Maritime", DEFAULT_POLICY, S.sealed)?.policy, "customer_identities");
  assert.equal(precheck("What's net revenue retention?", DEFAULT_POLICY, S.sealed), null);
  assert.equal(precheck("What is total payroll by department?", DEFAULT_POLICY, S.sealed), null);
});

test("output scanner catches a leaked name", () => {
  assert.equal(scanOutput("The biggest is Pelican Maritime.", S.sealed).length, 1);
});

test("egress filter strips private values from search queries", () => {
  const { clean, removed } = egressFilter("Pelican Maritime pays 106000 for maritime software", S.sealed, S.privateNumbers);
  assert.ok(!clean.includes("Pelican") && !clean.includes("106000"));
  assert.equal(removed.length, 2);
});

test("lifting a seal reveals that category", () => {
  const open = seal(files, { ...DEFAULT_POLICY, customer_identities: false });
  assert.ok(open.modelDocs.map((d) => d.text).join("\n").includes("Pelican Maritime"));
});

test("vault round-trips and rejects a wrong key", () => {
  const k = newKey();
  const blob = enc(k, Buffer.from("secret"), "d/x");
  assert.equal(dec(k, blob, "d/x").toString(), "secret");
  assert.throws(() => dec(newKey(), blob, "d/x"));
});
