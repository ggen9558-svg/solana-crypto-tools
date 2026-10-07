import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decrypt, encrypt, fromBaseUnits, Keystore, keypairFromMnemonic, keypairFromSecret, exportSecretBase58, exportSecretJson, generateMnemonic, toBaseUnits, parsePublicKey, resolveRpcUrl, WalletError } from "../src/index.js";

test("mnemonic derivation is deterministic and matches known vector", () => {
  const m = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
  const a = keypairFromMnemonic(m);
  assert.equal(a.publicKey.toBase58(), "HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk");
  assert.notEqual(a.publicKey.toBase58(), keypairFromMnemonic(m, 1).publicKey.toBase58());
  assert.throws(() => keypairFromMnemonic("not a valid phrase"), WalletError);
  assert.equal(generateMnemonic().split(" ").length, 12);
});

test("secret import/export round trips", () => {
  const kp = keypairFromMnemonic(generateMnemonic());
  assert.equal(keypairFromSecret(exportSecretBase58(kp)).publicKey.toBase58(), kp.publicKey.toBase58());
  assert.equal(keypairFromSecret(exportSecretJson(kp)).publicKey.toBase58(), kp.publicKey.toBase58());
  assert.throws(() => keypairFromSecret("garbage"), WalletError);
});

test("encryption round trip and wrong password", () => {
  const blob = encrypt(Buffer.from("secret"), "password123");
  assert.equal(Buffer.from(decrypt(blob, "password123")).toString(), "secret");
  assert.throws(() => decrypt(blob, "wrong-password"), /Decryption failed/);
});

test("keystore stores multiple accounts encrypted", () => {
  const store = new Keystore(join(mkdtempSync(join(tmpdir(), "ks-")), "ks.json"));
  const m = generateMnemonic();
  const kp = keypairFromMnemonic(m);
  store.add("main", kp, "password123", m);
  store.add("alt", keypairFromMnemonic(m, 1), "password123");
  assert.equal(store.list().length, 2);
  assert.throws(() => store.add("main", kp, "password123"), /already exists/);
  assert.throws(() => store.add("x", kp, "short"), /at least 8/);
  assert.equal(store.unlock("main", "password123").publicKey.toBase58(), kp.publicKey.toBase58());
  assert.equal(store.revealMnemonic("main", "password123"), m);
  assert.throws(() => store.unlock("main", "badpassword"), WalletError);
  store.remove("alt", "password123");
  assert.equal(store.list().length, 1);
});

test("validation helpers", () => {
  assert.equal(toBaseUnits("1.5", 9), 1_500_000_000n);
  assert.equal(fromBaseUnits(1_500_000_000n, 9), "1.5");
  assert.throws(() => toBaseUnits("0", 9), WalletError);
  assert.throws(() => toBaseUnits("-1", 9), WalletError);
  assert.throws(() => toBaseUnits("1.1234", 2), WalletError);
  assert.throws(() => parsePublicKey("nope"), WalletError);
  assert.equal(resolveRpcUrl("localnet"), "http://127.0.0.1:8899");
  assert.throws(() => resolveRpcUrl("bogus"), WalletError);
});
