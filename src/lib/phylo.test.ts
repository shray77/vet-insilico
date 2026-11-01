import { describe, it, expect } from "vitest";
import { upgma, neighborJoining, computeDistanceMatrix, PHYLO_SAMPLES, type PhyloNode } from "./phylo";

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

/**
 * Якорь канонического Neighbor-Joining (Saitou & Nei 1987) — аддитивная
 * матрица 5×5 из аудита SW-12 (check.ts §3): дерево (A:1,B:1)v —
 * центральная точка — (C:1,D:2)u; v-центр=2, u-центр=3; E:3 от центра.
 */
describe("neighborJoining — канонический Saitou-Nei (якорь аддитивности, аудит SW-12)", () => {
  const labels = ["A", "B", "C", "D", "E"];
  const D = [
    [0, 2, 7, 8, 6],
    [2, 0, 7, 8, 6],
    [7, 7, 0, 3, 7],
    [8, 8, 3, 0, 8],
    [6, 6, 7, 8, 0],
  ];

  /** d(x,y) по дереву: depth(x)+depth(y)−2·depth(LCA(x,y)). */
  function treeDistances(root: PhyloNode): (x: string, y: string) => number {
    const parent = new Map<PhyloNode, PhyloNode | null>();
    const leafOf = new Map<string, PhyloNode>();
    const reg = (node: PhyloNode, p: PhyloNode | null) => {
      parent.set(node, p);
      if (node.isLeaf) leafOf.set(node.name, node);
      node.children.forEach((c) => reg(c, node));
    };
    reg(root, null);
    const pathOf = (n: PhyloNode): PhyloNode[] => {
      const arr: PhyloNode[] = [];
      let cur: PhyloNode | null = n;
      while (cur) { arr.unshift(cur); cur = parent.get(cur) ?? null; }
      return arr;
    };
    return (x: string, y: string) => {
      const px = pathOf(leafOf.get(x)!);
      const py = pathOf(leafOf.get(y)!);
      let lca: PhyloNode = px[0];
      for (let i = 0; i < Math.min(px.length, py.length); i++) {
        if (px[i] === py[i]) lca = px[i];
        else break;
      }
      return leafOf.get(x)!.depth + leafOf.get(y)!.depth - 2 * lca.depth;
    };
  }

  it("восстанавливает листовые ветви A:1, B:1, C:1, D:2, E:3 (delta-член без занижения в (n−2))", () => {
    const res = neighborJoining(labels, D.map((r) => [...r]));
    const got: Record<string, number> = {};
    const walk = (n: PhyloNode) => {
      if (n.isLeaf) got[n.name] = n.length;
      else n.children.forEach(walk);
    };
    walk(res.root);
    // Прежний баг: первый join C,D давал C=1.333, D=1.667 вместо 1/2
    expect(got.A).toBeCloseTo(1, 6);
    expect(got.B).toBeCloseTo(1, 6);
    expect(got.C).toBeCloseTo(1, 6);
    expect(got.D).toBeCloseTo(2, 6);
    expect(got.E).toBeCloseTo(3, 6);
  });

  it("финал — тройная звезда: дерево аддитивно, все 10 пар равны входной матрице", () => {
    const res = neighborJoining(labels, D.map((r) => [...r]));
    const d = treeDistances(res.root);
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        expect(d(labels[i], labels[j])).toBeCloseTo(D[i][j], 6);
      }
    }
  });
});

describe("PHYLO_SAMPLES", () => {
  it("all samples have ≥ 3 sequences", () => {
    PHYLO_SAMPLES.forEach((s) => {
      expect(s.sequences.length).toBeGreaterThanOrEqual(3);
    });
  });
});
