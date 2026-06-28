/**
 * Phylogenetic Tree Builder — UPGMA and Neighbor-Joining.
 *
 * Both algorithms take a distance matrix and produce a tree.
 *
 * UPGMA: Unweighted Pair Group Method with Arithmetic Mean
 *   Assumes molecular clock (ultrametric tree). Distance = average between clusters.
 *
 * Neighbor-Joining (NJ):
 *   Saitou-Nei 1987. Doesn't assume equal rates. Uses Q-matrix to find closest pair.
 *
 * Output: Newick-format string + node tree for visualization.
 *
 * All in browser, no external dependencies.
 */

export interface PhyloNode {
  name: string;
  /** Branch length to parent. */
  length: number;
  /** Cumulative distance from root. */
  depth: number;
  children: PhyloNode[];
  /** For leaves: the original label. */
  isLeaf: boolean;
}

export interface PhyloResult {
  root: PhyloNode;
  newick: string;
  method: "upgma" | "neighbor-joining";
  leaves: PhyloNode[];
  /** Max depth — for layout scaling. */
  maxDepth: number;
}

/**
 * UPGMA. Input: distance matrix D and labels.
 * D[i][j] is the distance between taxa i and j. D must be symmetric with 0 diagonal.
 */
export function upgma(labels: string[], inputD: number[][]): PhyloResult {
  // Each cluster is a PhyloNode (root of subtree)
  const clusters: { node: PhyloNode; size: number }[] = labels.map((l) => ({
    node: { name: l, length: 0, depth: 0, children: [], isLeaf: true },
    size: 1,
  }));
  // Working distance matrix
  const D = inputD.map((row) => [...row]);

  while (clusters.length > 1) {
    // Find min distance pair
    let minI = 0, minJ = 1, minD = Infinity;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        if (D[i][j] < minD) {
          minD = D[i][j];
          minI = i;
          minJ = j;
        }
      }
    }

    // Branch length = D/2 - depth of each subtree (UPGMA assumes ultrametric)
    const height = minD / 2;
    const leftNode = clusters[minI].node;
    const rightNode = clusters[minJ].node;
    const newLeftLen = Math.max(0, height - leftNode.depth);
    const newRightLen = Math.max(0, height - rightNode.depth);

    const newNode: PhyloNode = {
      name: `(${leftNode.name},${rightNode.name})`,
      length: 0,
      depth: height,
      children: [
        { ...leftNode, length: newLeftLen },
        { ...rightNode, length: newRightLen },
      ],
      isLeaf: false,
    };

    const newSize = clusters[minI].size + clusters[minJ].size;
    const newCluster = { node: newNode, size: newSize };

    // Build new distance matrix
    const newClusters = clusters.filter((_, idx) => idx !== minI && idx !== minJ);
    newClusters.push(newCluster);

    const newN = newClusters.length;
    const newD: number[][] = Array.from({ length: newN }, () => new Array(newN).fill(0));
    for (let i = 0; i < newN; i++) {
      for (let j = i + 1; j < newN; j++) {
        if (newClusters[i] === newCluster && newClusters[j] === newCluster) {
          newD[i][j] = newD[j][i] = 0;
        } else if (newClusters[i] === newCluster) {
          // Distance from new cluster to existing = weighted average
          // Find original indices
          const otherIdx = clusters.indexOf(newClusters[j]);
          const d1 = D[minI][otherIdx];
          const d2 = D[minJ][otherIdx];
          const w1 = clusters[minI].size;
          const w2 = clusters[minJ].size;
          newD[i][j] = newD[j][i] = (w1 * d1 + w2 * d2) / (w1 + w2);
        } else if (newClusters[j] === newCluster) {
          const otherIdx = clusters.indexOf(newClusters[i]);
          const d1 = D[minI][otherIdx];
          const d2 = D[minJ][otherIdx];
          const w1 = clusters[minI].size;
          const w2 = clusters[minJ].size;
          newD[i][j] = newD[j][i] = (w1 * d1 + w2 * d2) / (w1 + w2);
        } else {
          // Copy from old matrix
          const oi = clusters.indexOf(newClusters[i]);
          const oj = clusters.indexOf(newClusters[j]);
          newD[i][j] = newD[j][i] = D[oi][oj];
        }
      }
    }

    clusters.length = 0;
    clusters.push(...newClusters);
    D.length = 0;
    D.push(...newD.map((r) => [...r]));
  }

  // Compute depths properly via DFS
  const root = clusters[0].node;
  const maxDepth = computeDepths(root, 0);
  const leaves = collectLeaves(root);
  return {
    root,
    newick: toNewick(root) + ";",
    method: "upgma",
    leaves,
    maxDepth,
  };
}

/**
 * Neighbor-Joining (Saitou-Nei 1987).
 */
export function neighborJoining(labels: string[], inputD: number[][]): PhyloResult {
  const clusters: { node: PhyloNode; size: number; label: string }[] = labels.map((l) => ({
    node: { name: l, length: 0, depth: 0, children: [], isLeaf: true },
    size: 1,
    label: l,
  }));
  const D = inputD.map((row) => [...row]);
  const clusterNames = [...labels];

  while (clusters.length > 2) {
    const n = clusters.length;
    // Compute row sums
    const r: number[] = clusters.map((_, i) => {
      let sum = 0;
      for (let j = 0; j < n; j++) if (i !== j) sum += D[i][j];
      return sum / (n - 2);
    });
    // Q-matrix
    let minI = 0, minJ = 1, minQ = Infinity;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const q = D[i][j] - r[i] - r[j];
        if (q < minQ) {
          minQ = q;
          minI = i;
          minJ = j;
        }
      }
    }

    // Branch lengths
    const delta = (r[minI] - r[minJ]) / (n - 2);
    const limbI = 0.5 * D[minI][minJ] + 0.5 * delta;
    const limbJ = D[minI][minJ] - limbI;

    const leftNode = clusters[minI].node;
    const rightNode = clusters[minJ].node;
    const newNode: PhyloNode = {
      name: `(${leftNode.name},${rightNode.name})`,
      length: 0,
      depth: 0,
      children: [
        { ...leftNode, length: Math.max(0, limbI) },
        { ...rightNode, length: Math.max(0, limbJ) },
      ],
      isLeaf: false,
    };

    const newCluster = {
      node: newNode,
      size: clusters[minI].size + clusters[minJ].size,
      label: `(${clusters[minI].label},${clusters[minJ].label})`,
    };

    // Build new distance matrix
    const newClusters = clusters.filter((_, idx) => idx !== minI && idx !== minJ);
    newClusters.push(newCluster);

    const newN = newClusters.length;
    const newD: number[][] = Array.from({ length: newN }, () => new Array(newN).fill(0));
    for (let i = 0; i < newN; i++) {
      for (let j = i + 1; j < newN; j++) {
        if (newClusters[i] === newCluster && newClusters[j] === newCluster) {
          newD[i][j] = newD[j][i] = 0;
        } else if (newClusters[i] === newCluster) {
          const otherIdx = clusters.indexOf(newClusters[j]);
          const d = (D[minI][otherIdx] + D[minJ][otherIdx] - D[minI][minJ]) / 2;
          newD[i][j] = newD[j][i] = d;
        } else if (newClusters[j] === newCluster) {
          const otherIdx = clusters.indexOf(newClusters[i]);
          const d = (D[minI][otherIdx] + D[minJ][otherIdx] - D[minI][minJ]) / 2;
          newD[i][j] = newD[j][i] = d;
        } else {
          const oi = clusters.indexOf(newClusters[i]);
          const oj = clusters.indexOf(newClusters[j]);
          newD[i][j] = newD[j][i] = D[oi][oj];
        }
      }
    }

    clusters.length = 0;
    clusters.push(...newClusters);
    D.length = 0;
    D.push(...newD.map((r) => [...r]));
  }

  // Last 2 clusters — join with branch length = D[0][1]
  const lastD = D[0][1];
  const finalRoot: PhyloNode = {
    name: `(${clusters[0].node.name},${clusters[1].node.name})`,
    length: 0,
    depth: 0,
    children: [
      { ...clusters[0].node, length: Math.max(0, lastD / 2) },
      { ...clusters[1].node, length: Math.max(0, lastD / 2) },
    ],
    isLeaf: false,
  };

  const maxDepth = computeDepths(finalRoot, 0);
  const leaves = collectLeaves(finalRoot);
  return {
    root: finalRoot,
    newick: toNewick(finalRoot) + ";",
    method: "neighbor-joining",
    leaves,
    maxDepth,
  };
}

function computeDepths(node: PhyloNode, parentDepth: number): number {
  node.depth = parentDepth + node.length;
  if (node.isLeaf) return node.depth;
  let max = node.depth;
  for (const c of node.children) {
    const d = computeDepths(c, node.depth);
    if (d > max) max = d;
  }
  return max;
}

function collectLeaves(node: PhyloNode): PhyloNode[] {
  if (node.isLeaf) return [node];
  return node.children.flatMap(collectLeaves);
}

function toNewick(node: PhyloNode): string {
  if (node.isLeaf) {
    return `${node.name}:${node.length.toFixed(3)}`;
  }
  const childrenStr = node.children.map(toNewick).join(",");
  return `(${childrenStr}):${node.length.toFixed(3)}`;
}

/**
 * Compute pairwise distance matrix from a set of sequences using Kimura 2-parameter (DNA)
 * or p-distance (protein). Returns lower-triangle-included symmetric matrix.
 */
export function computeDistanceMatrix(
  sequences: { name: string; seq: string }[],
  seqType: "protein" | "dna" = "protein",
): { labels: string[]; matrix: number[][] } {
  const n = sequences.length;
  const labels = sequences.map((s) => s.name);
  const matrix: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const seqA = sequences[i].seq.toUpperCase();
      const seqB = sequences[j].seq.toUpperCase();
      const len = Math.min(seqA.length, seqB.length);
      let matches = 0;
      let transitions = 0; // for K2P (DNA only)
      let transversions = 0;
      let valid = 0;
      for (let k = 0; k < len; k++) {
        const a = seqA[k];
        const b = seqB[k];
        if (a === "-" || b === "-" || a === "X" || b === "X") continue;
        valid++;
        if (a === b) matches++;
        else if (seqType === "dna") {
          // Transition: A↔G, C↔T
          const isTransition = (a === "A" && b === "G") || (a === "G" && b === "A") ||
                              (a === "C" && b === "T") || (a === "T" && b === "C");
          if (isTransition) transitions++;
          else transversions++;
        }
      }
      let dist: number;
      if (valid === 0) {
        dist = 1.0;
      } else if (seqType === "dna") {
        // Kimura 2-parameter
        const p = transitions / valid;
        const q = transversions / valid;
        const arg = 1 - 2 * p - q;
        const arg2 = 1 - 2 * q;
        if (arg > 0 && arg2 > 0) {
          dist = -0.5 * Math.log(arg) - 0.25 * Math.log(arg2);
        } else {
          dist = 1 - matches / valid; // fallback to p-distance
        }
      } else {
        // p-distance for protein
        dist = 1 - matches / valid;
      }
      matrix[i][j] = matrix[j][i] = Number(dist.toFixed(4));
    }
  }
  return { labels, matrix };
}

export const PHYLO_SAMPLES: { name: string; pathogen: string; sequences: { name: string; seq: string }[]; type: "protein" | "dna" }[] = [
  {
    name: "ASFV p72 (4 штамма)",
    pathogen: "Африканская чума свиней",
    type: "protein",
    sequences: [
      { name: "Georgia-2007", seq: "MKNHKQYDHLHKHQLHNHLQNHIYHMHQQHQLHNNQLHNHIYQLHHQLHNHIY" },
      { name: "Kenya-1950", seq: "MKNHKQYDHLHKHQLHNHLQNHIYHMHQQHQLHNNQLHNHIYQLHHQLHNHIY" },
      { name: "Belarus-2013", seq: "MKNHKQYDHLHKHQLHNHLQNHIFHMHQQHQLHNNQLHNHIYQLHHQLHNHIY" },
      { name: "Russia-2023", seq: "MKNHKQYDHLHKHQLHNHLQNHIFHMHQQHQLHNNQLHNHIYQLHHQLHNHIY" },
    ],
  },
  {
    name: "Brucella Omp25",
    pathogen: "Бруцеллёз",
    type: "protein",
    sequences: [
      { name: "B.abortus", seq: "MKKLLFAAIGALTAGCGNFAQLPDVDKQVSDADVTKLRGFGDDSVKAGGDRTVADKDAGLVTK" },
      { name: "B.melitensis", seq: "MKKLLFAAIGALTAGCGNFAQLPDVDKQVSDADVTKLRGFGDDSVKAGGDRTVADKDAGLVSK" },
      { name: "B.suis", seq: "MKKLLFAAIGALTAGCGNFAQLPDVDKQVSDADVTKLRGFGDDSVKAGGDRTVADKDAGLVTK" },
      { name: "B.ovis", seq: "MKKLLFAAIGALTAGCGNFAQLPDVDKQVSDADVTKLRGFGDDSVKAGGDRTVADKDAGLVAK" },
    ],
  },
  {
    name: "Rabies N gene",
    pathogen: "Бешенство",
    type: "dna",
    sequences: [
      { name: "Arctic-like", seq: "ATGGTGTCACCAATCGTGCCCGTCAAGAGGGTTGAGACAAAGATCGTCAAAGAG" },
      { name: "Cosmopolitan", seq: "ATGGTGTCACCAATCGTGCCCGTCAAGAGGGTTGAGACAAAGATCGTCAAATAG" },
      { name: "Asian", seq: "ATGGTGTCACCAATCGTGCCCGTCAAGAGGGTTGAGACAAAGATCGTCAAATAG" },
      { name: "Africa-1", seq: "ATGGTGTCACCAATCGTGCCCGTCAAGAGGGTTGAGACAAAGATCGTCAAAGAG" },
    ],
  },
];
