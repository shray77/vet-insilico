import { describe, it, expect } from "vitest";
import { BLOSUM62, blosum62Score } from "./blosum62";

/**
 * Якоря — NCBI BLOSUM62 (Henikoff & Henikoff 1992; аудитом SW-12 сверено
 * посимвольно 210/210 клеток после фикса A↔Y). Источник значений — отчёт SW-12.
 */
describe("BLOSUM62 — сверка с NCBI (аудит SW-12)", () => {
  it("A↔Y = −2 (клетка «поплыла» в части интернет-копий; в коде было −1)", () => {
    expect(BLOSUM62.A.Y).toBe(-2);
    expect(BLOSUM62.Y.A).toBe(-2);
  });

  it("контрольные клетки NCBI", () => {
    expect(BLOSUM62.A.A).toBe(4);
    expect(BLOSUM62.R.R).toBe(5);
    expect(BLOSUM62.C.C).toBe(9);
    expect(BLOSUM62.W.W).toBe(11);
    expect(BLOSUM62.A.R).toBe(-1);
    expect(BLOSUM62.W.R).toBe(-3);
    expect(BLOSUM62.H.Y).toBe(2);
    expect(BLOSUM62.Y.W).toBe(2);
  });

  it("матрица симметрична по всем 210 клеткам", () => {
    const aas = "ARNDCQEGHILKMFPSTWYV".split("");
    for (const a of aas) {
      for (const b of aas) {
        expect(BLOSUM62[a][b]).toBe(BLOSUM62[b][a]);
      }
    }
  });

  it("неизвестные символы: X↔X = −1, *↔* = +1 (NCBI), прочие — дефолт −4", () => {
    expect(blosum62Score("X", "X")).toBe(-1);
    expect(blosum62Score("*", "*")).toBe(1);
    // Полных строк B/Z/X/* в матрице нет — консервативный дефолт −4
    expect(blosum62Score("X", "A")).toBe(-4);
    expect(blosum62Score("B", "D")).toBe(-4);
    expect(blosum62Score("A", "-")).toBe(-4);
  });
});
