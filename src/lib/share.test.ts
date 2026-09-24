import { describe, it, expect } from "vitest";
import {
  toB64Url,
  fromB64Url,
  normalizePkpd,
  encodeAutonomousPayload,
  decodeAutonomousPayload,
  parseShareHash,
} from "./share";

describe("base64url", () => {
  it("roundtrip ASCII", () => {
    const s = "hello world 123";
    expect(fromB64Url(toB64Url(s))).toBe(s);
  });

  it("roundtrip UTF-8 (кириллица + эмодзи)", () => {
    const s = "Бешенство 🦠 Тест";
    expect(fromB64Url(toB64Url(s))).toBe(s);
  });

  it("URL-safe алфавит (без + / =)", () => {
    const enc = toB64Url("Бешенство?");
    expect(enc).not.toMatch(/[+/=]/);
  });
});

describe("normalizePkpd", () => {
  it("валидирует и клампит в диапазоны слайдеров", () => {
    const sc = normalizePkpd({ profileIdx: 999, dose: -5, interval: 200, nDoses: 0, mic: 99, pdTarget: 1 });
    expect(sc).toMatchObject({
      profileIdx: 63, // кламп сверху: 0..63 (обратная совместимость с ростом списка)
      dose: 1,
      interval: 48,
      nDoses: 1,
      mic: 8,
      pdTarget: 10,
    });
  });

  it("мусор на входе → дефолты", () => {
    const sc = normalizePkpd("not an object");
    expect(sc).toMatchObject({ app: "pkpd", dose: 5, interval: 24, nDoses: 5, mic: 1, pdTarget: 100 });
  });
});

describe("autonomous payload", () => {
  it("encode→decode roundtrip сохраняет сценарий", () => {
    const sc = normalizePkpd({ profileIdx: 2, dose: 7.5, interval: 12, nDoses: 3, mic: 0.5, pdTarget: 90 });
    const decoded = decodeAutonomousPayload(encodeAutonomousPayload(sc));
    expect(decoded).toEqual(sc);
  });

  it("отклоняет чужие app и битый base64", () => {
    expect(decodeAutonomousPayload(toB64Url(JSON.stringify({ app: "hacker" })))).toBeNull();
    expect(decodeAutonomousPayload("!!not-base64!!")).toBeNull();
  });
});

describe("parseShareHash", () => {
  it("парсит облачный #s=<ID> (upcase)", () => {
    expect(parseShareHash("#s=abc12xyz")).toEqual({ id: "ABC12XYZ" });
  });

  it("парсит автономный #j=<b64>", () => {
    const sc = normalizePkpd({ profileIdx: 1, dose: 3 });
    const r = parseShareHash(`#j=${encodeAutonomousPayload(sc)}`);
    expect(r.data?.profileIdx).toBe(1);
    expect(r.id).toBeUndefined();
  });

  it("пустой/мусорный хеш → {}", () => {
    expect(parseShareHash("")).toEqual({});
    expect(parseShareHash("#s=!!")).toEqual({});
    expect(parseShareHash("#random=stuff")).toEqual({});
  });
});
