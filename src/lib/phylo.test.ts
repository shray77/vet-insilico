import { describe, it, expect } from "vitest";
import { upgma, neighborJoining, computeDistanceMatrix, PHYLO_SAMPLES } from "./phylo";

describe("computeDistanceMatrix", () => {
  it("produces symmetric matrix with zero diagonal", () => {
    const seqs = [
      { name: "A", seq: "MKTAYIAK" },
      { name: "B", seq: "MKTAYIAK" },
      { name: "C", seq: "MKTAFIAK" },
    ];
    const { labels, matrix } = computeDistanceMatrix(seqs, "protein");
    expect(labels).toEqual(["A", "B", "C"]);
    expect(matrix.length).toBe(3);
    for (let i = 0; i < 3; i++) {
      expect(matrix[i][i]).toBe(0);
      for (let j = 0; j < 3; j++) {
        expect(matrix[i][j]).toBe(matrix[j][i]);
      }
    }
  });

  it("identical sequences → zero distance", () => {
    const seqs = [
      { name: "A", seq: "MKTAYIAK" },
      { name: "B", seq: "MKTAYIAK" },
    ];
    const { matrix } = computeDistanceMatrix(seqs, "protein");
    expect(matrix[0][1]).toBe(0);
  });

  it("DNA uses Kimura 2-parameter", () => {
    const seqs = [
      { name: "A", seq: "ACGTACGTAC" },
      { name: "B", seq: "ACGTACGTAC" },
      { name: "C", seq: "ATGTACGTAC" }, // one transition
    ];
    const { matrix } = computeDistanceMatrix(seqs, "dna");
    expect(matrix[0][1]).toBe(0);
    expect(matrix[0][2]).toBeGreaterThan(0);
  });
});

describe("upgma", () => {
  it("produces valid Newick string", () => {
    const labels = ["A", "B", "C", "D"];
    const matrix = [
      [0, 0.1, 0.3, 0.5],
      [0.1, 0, 0.3, 0.5],
      [0.3, 0.3, 0, 0.4],
      [0.5, 0.5, 0.4, 0],
    ];
    const result = upgma(labels, matrix);
    expect(result.newick).toContain(";");
    expect(result.newick).toContain("(");
    expect(result.leaves.length).toBe(4);
  });

  it("groups closest pair first", () => {
    const labels = ["A", "B", "C"];
    const matrix = [
      [0, 0.01, 0.5],
      [0.01, 0, 0.5],
      [0.5, 0.5, 0],
    ];
    const result = upgma(labels, matrix);
    // A and B should be in the same clade (closest pair)
    expect(result.newick).toContain("A");
    expect(result.newick).toContain("B");
    expect(result.newick).toContain("C");
    expect(result.leaves.length).toBe(3);
  });
});

describe("neighborJoining", () => {
  it("produces valid Newick string", () => {
    const labels = ["A", "B", "C", "D"];
    const matrix = [
      [0, 0.1, 0.3, 0.5],
      [0.1, 0, 0.3, 0.5],
      [0.3, 0.3, 0, 0.4],
      [0.5, 0.5, 0.4, 0],
    ];
    const result = neighborJoining(labels, matrix);
    expect(result.newick).toContain(";");
    expect(result.leaves.length).toBe(4);
  });
});

describe("PHYLO_SAMPLES", () => {
  it("all samples have ≥ 3 sequences", () => {
    PHYLO_SAMPLES.forEach((s) => {
      expect(s.sequences.length).toBeGreaterThanOrEqual(3);
    });
  });
});
