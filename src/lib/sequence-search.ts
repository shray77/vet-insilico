/**
 * NCBI / UniProt / PDB sequence search integration.
 *
 * Free APIs (no key required, CORS-friendly):
 *   - NCBI eutils: search GenBank by accession or text query
 *   - UniProt: fetch protein by ID or search by text
 *   - RCSB PDB: search structures by text
 *
 * Usage:
 *   import { searchNCBI, fetchUniProt, searchPDB } from "@/lib/sequence-search";
 *   const results = await searchNCBI("ASFV p72");
 *   const protein = await fetchUniProt("P42448");
 */

export interface SequenceResult {
  /** Database source. */
  source: "NCBI" | "UniProt" | "PDB";
  /** Accession/ID. */
  id: string;
  /** Description / title. */
  title: string;
  /** Organism. */
  organism: string;
  /** Protein or nucleotide sequence (fetched on demand). */
  sequence?: string;
  /** Sequence length. */
  length?: number;
  /** URL to the record. */
  url: string;
}

/**
 * Search NCBI protein database via eutils API.
 * Free, no API key needed (rate limit: 3 req/sec without key).
 *
 * @param query - search text (e.g., "African swine fever virus p72")
 * @param maxResults - max results to return (default 10)
 */
export async function searchNCBI(query: string, maxResults = 10): Promise<SequenceResult[]> {
  const baseUrl = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
  const db = "protein";
  const term = encodeURIComponent(query);

  // Step 1: esearch — get IDs
  const searchUrl = `${baseUrl}/esearch.fcgi?db=${db}&term=${term}&retmax=${maxResults}&retmode=json&sort=relevance`;
  const searchResp = await fetch(searchUrl);
  if (!searchResp.ok) throw new Error(`NCBI search failed: HTTP ${searchResp.status}`);
  const searchData = await searchResp.json();
  const ids: string[] = searchData?.esearchresult?.idlist ?? [];
  if (ids.length === 0) return [];

  // Step 2: esummary — get titles + organisms
  const summaryUrl = `${baseUrl}/esummary.fcgi?db=${db}&id=${ids.join(",")}&retmode=json`;
  const summaryResp = await fetch(summaryUrl);
  if (!summaryResp.ok) throw new Error(`NCBI summary failed: HTTP ${summaryResp.status}`);
  const summaryData = await summaryResp.json();
  const result = summaryData?.result ?? {};

  return ids.map((id) => {
    const entry = result[id];
    if (!entry) return null;
    return {
      source: "NCBI" as const,
      id: entry.accessionversion || id,
      title: entry.title || "Unknown",
      organism: entry.organism || entry.taxname || "Unknown",
      length: entry.slen ? parseInt(entry.slen, 10) : undefined,
      url: `https://www.ncbi.nlm.nih.gov/protein/${entry.accessionversion || id}`,
    };
  }).filter(Boolean) as SequenceResult[];
}

/**
 * Fetch a protein sequence from NCBI by accession.
 * Returns the FASTA sequence (protein).
 *
 * @param accession - NCBI protein accession (e.g., "NP_046088.1")
 */
export async function fetchNCBISequence(accession: string): Promise<string> {
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=protein&id=${accession}&rettype=fasta&retmode=text`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`NCBI fetch failed: HTTP ${resp.status}`);
  const text = await resp.text();
  // Parse FASTA — remove header lines, join sequence
  const lines = text.split("\n");
  const seqLines = lines.filter((l) => !l.startsWith(">") && l.trim());
  return seqLines.join("").toUpperCase();
}

/**
 * Fetch a protein from UniProt by ID.
 * Returns sequence + metadata.
 *
 * @param uniprotId - UniProt accession (e.g., "P42448")
 */
export async function fetchUniProt(uniprotId: string): Promise<SequenceResult & { sequence: string }> {
  const url = `https://rest.uniprot.org/uniprotkb/${uniprotId}.json`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`UniProt fetch failed: HTTP ${resp.status}`);
  const data = await resp.json();

  const sequence = data?.sequence?.value?.toUpperCase() ?? "";
  const title = data?.proteinDescription?.recommendedName?.fullName?.value
    || data?.proteinDescription?.submissionNames?.[0]?.fullName?.value
    || "Unknown protein";
  const organism = data?.organism?.scientificName || "Unknown";

  return {
    source: "UniProt",
    id: uniprotId,
    title,
    organism,
    sequence,
    length: sequence.length,
    url: `https://www.uniprot.org/uniprotkb/${uniprotId}`,
  };
}

/**
 * Search UniProt for proteins by text query.
 *
 * @param query - search text (e.g., "hemagglutinin influenza")
 * @param maxResults - max results (default 10)
 */
export async function searchUniProt(query: string, maxResults = 10): Promise<SequenceResult[]> {
  const url = `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(query)}&format=json&size=${maxResults}&fields=accession,id,protein_name,organism_name,length`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`UniProt search failed: HTTP ${resp.status}`);
  const data = await resp.json();
  const results = data?.results ?? [];

  return results.map((r: Record<string, unknown>) => {
    const acc = (r.primaryAccession as string) || "Unknown";
    const descObj = r.proteinDescription as Record<string, Record<string, Record<string, string>>> | undefined;
    const desc = descObj?.recommendedName?.fullName?.value || "Unknown";
    const orgObj = r.organism as Record<string, string> | undefined;
    const org = orgObj?.scientificName || "Unknown";
    const seqObj = r.sequence as { length?: number } | undefined;
    const len = seqObj?.length;

    return {
      source: "UniProt" as const,
      id: acc,
      title: desc,
      organism: org,
      length: len,
      url: `https://www.uniprot.org/uniprotkb/${acc}`,
    };
  });
}

/**
 * Search RCSB PDB for structures by text query.
 *
 * @param query - search text (e.g., "hemagglutinin")
 * @param maxResults - max results (default 10)
 */
export async function searchPDB(query: string, maxResults = 10): Promise<SequenceResult[]> {
  const url = "https://search.rcsb.org/rcsbsearch/v2/query";
  const body = {
    query: {
      type: "terminal",
      service: "full_text",
      parameters: { value: query },
    },
    return_type: "entry",
    request_options: {
      paginate: { start: 0, rows: maxResults },
    },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`PDB search failed: HTTP ${resp.status}`);
  const data = await resp.json();
  const hits = data?.result_set ?? [];

  return hits.map((h: Record<string, unknown>) => {
    const id = (h.identifier as string) || "Unknown";
    return {
      source: "PDB" as const,
      id,
      title: (h.description as string) || `PDB ${id}`,
      organism: "—",
      url: `https://www.rcsb.org/structure/${id}`,
    };
  });
}

/**
 * Search all databases at once (NCBI + UniProt + PDB).
 * Returns merged + deduplicated results.
 *
 * @param query - search text
 * @param maxPerSource - max results per source (default 5)
 */
export async function searchAllDatabases(query: string, maxPerSource = 5): Promise<SequenceResult[]> {
  const promises = [
    searchNCBI(query, maxPerSource).catch(() => []),
    searchUniProt(query, maxPerSource).catch(() => []),
    searchPDB(query, maxPerSource).catch(() => []),
  ];

  const [ncbi, uniprot, pdb] = await Promise.all(promises);
  return [...ncbi, ...uniprot, ...pdb];
}
