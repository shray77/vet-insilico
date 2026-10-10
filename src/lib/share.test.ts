import { describe, it, expect } from "vitest";
import {
  toB64Url,
  fromB64Url,
  normalizePkpd,
  normalizePrimer,
  normalizeCrispr,
  normalizeAlignment,
  normalizePhylo,
  normalizeScenario,
  encodeAutonomousPayload,
  decodeAutonomousPayload,
  autonomousPayloadSize,
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
    expect(r.data && r.data.app === "pkpd" && r.data.profileIdx).toBe(1);
    expect(r.id).toBeUndefined();
  });

  it("пустой/мусорный хеш → {}", () => {
    expect(parseShareHash("")).toEqual({});
    expect(parseShareHash("#s=!!")).toEqual({});
    expect(parseShareHash("#random=stuff")).toEqual({});
  });
});

describe("scenario v2: primer / crispr / alignment", () => {
  it("normalizePrimer: клампы параметров + санитизация последовательности", () => {
    const sc = normalizePrimer({ seq: "acg tnry-k*m", targetTm: 999, minProduct: 10, maxProduct: 99999, minLen: 1, maxLen: 99 });
    expect(sc).toMatchObject({
      app: "primer",
      seq: "ACGTNRY-KM", // uppercase, пробел/звёздочка выброшены
      targetTm: 70,
      minProduct: 50,
      maxProduct: 2000,
      minLen: 17,
      maxLen: 35,
    });
  });

  it("normalizeCrispr: кламп minScore + санитизация", () => {
    const sc = normalizeCrispr({ seq: "ggggccaaaattttggggcc", minScore: 500 });
    expect(sc).toMatchObject({ app: "crispr", seq: "GGGGCCAAAATTTTGGGGCC", minScore: 100 });
    expect(normalizeCrispr({}).minScore).toBe(20);
  });

  it("normalizeAlignment: дискриминанты type/algo + кламп gap", () => {
    const sc = normalizeAlignment({ a: "acgt", b: "CGT-", type: "rna", algo: "blast", gap: 0 });
    expect(sc).toMatchObject({ app: "alignment", a: "ACGT", b: "CGT-", type: "dna", algo: "needleman-wunsch", gap: -2 });
    expect(normalizeAlignment({ gap: -100 }).gap).toBe(-20);
  });

  it("normalizeScenario: диспетчер по app, чужие app → null", () => {
    expect(normalizeScenario({ app: "crispr", seq: "ACGT" })?.app).toBe("crispr");
    expect(normalizeScenario({ app: "alignment", a: "A", b: "T" })?.app).toBe("alignment");
    expect(normalizeScenario({ app: "hacker" })).toBeNull();
    expect(normalizeScenario(null)).toBeNull();
  });

  it("roundtrip primer через автономный payload", () => {
    const sc = normalizePrimer({ seq: "ATGGCCTATTGG", targetTm: 60, minProduct: 120, maxProduct: 500, minLen: 19, maxLen: 24 });
    expect(decodeAutonomousPayload(encodeAutonomousPayload(sc))).toEqual(sc);
  });

  it("roundtrip alignment + размер payload честный", () => {
    const sc = normalizeAlignment({ a: "MKTAYIAKQRQISFVKSH", b: "MKTAYIAKQRQISFVKSH", type: "protein", algo: "smith-waterman", gap: -6 });
    const enc = encodeAutonomousPayload(sc);
    expect(decodeAutonomousPayload(enc)).toEqual(sc);
    expect(autonomousPayloadSize(sc)).toBe(enc.length);
  });

  it("parseShareHash понимает #j нового формата (alignment)", () => {
    const sc = normalizeAlignment({ a: "ACGTACGT", b: "ACGTACGT", type: "dna", algo: "needleman-wunsch", gap: -8 });
    const enc = encodeAutonomousPayload(sc);
    const parsed = parseShareHash(`#j=${enc}`);
    expect(parsed.data?.app).toBe("alignment");
  });
});

describe("scenario: phylogeny", () => {
  it("normalizePhylo: сохраняет имена и TAB, чистит мусор, дискриминанты type/method", () => {
    const raw = "Cow_H1\tMKTAYIAK\nDog H2* mktayitk\nКороваЛ5\tMKT??AYIAK";
    const sc = normalizePhylo({ seqs: raw, type: "rna", method: "birch" });
    expect(sc).toMatchObject({
      app: "phylogeny",
      type: "dna", // rna → дефолт dna
      method: "neighbor-joining", // неизвестный метод → дефолт
    });
    // Имена сохранены (регистр не трогаем, кириллица ок), * и ? вырезаны
    const lines = sc.seqs.split("\n");
    expect(lines[0]).toBe("Cow_H1\tMKTAYIAK");
    expect(lines[1]).toContain("Dog H2 mktayitk");
    expect(lines[2]).toContain("КороваЛ5");
    expect(sc.seqs).not.toContain("?");
  });

  it("normalizePhylo: пустой вход → пустая строка, метод upgma проходит", () => {
    expect(normalizePhylo({}).seqs).toBe("");
    expect(normalizePhylo({ seqs: "A\tMK", method: "upgma" }).method).toBe("upgma");
    expect(normalizePhylo({ seqs: 42 }).seqs).toBe("");
  });

  it("normalizeScenario: диспетчер знает phylogeny", () => {
    expect(normalizeScenario({ app: "phylogeny", seqs: "A\tMK" })?.app).toBe("phylogeny");
  });

  it("roundtrip phylogeny через автономный payload (кириллица в именах)", () => {
    const sc = normalizePhylo({
      seqs: "ШтаммА\tMKTAYIAKQR\nШтаммБ\tMKTAYIAKQS\nШтаммВ\tMKTAYITKQR",
      type: "protein",
      method: "neighbor-joining",
    });
    expect(decodeAutonomousPayload(encodeAutonomousPayload(sc))).toEqual(sc);
  });

  it("parseShareHash понимает #j формата phylogeny", () => {
    const sc = normalizePhylo({ seqs: "A\tMKT\nB\tMKS\nC\tMKV", type: "protein", method: "upgma" });
    const parsed = parseShareHash(`#j=${encodeAutonomousPayload(sc)}`);
    expect(parsed.data?.app).toBe("phylogeny");
    if (parsed.data?.app === "phylogeny") {
      expect(parsed.data.method).toBe("upgma");
    }
  });
});
