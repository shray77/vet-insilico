#!/usr/bin/env python3
"""Boltz-2 affinity pilot for VetInSilico (Task 151).

Pipeline (nightly CI, CPU):
  pairs.json -> RCSB FASTA -> boltz YAML (protein chains + ligand SMILES
  + properties.affinity) -> `boltz predict` -> parse affinity_*.json +
  confidence_*.json -> public/data/boltz-affinities.json (static, committed).

Design notes:
  * Fault-tolerant: a failed pair (OOM / timeout / bad structure) is recorded
    with status=error and does NOT kill the run; JSON is always written.
  * Units: affinity_pred_value = log10(IC50 [uM]) per Boltz-2 docs.
    deltaG = (6 - y) * 1.364 kcal/mol (RT*ln(10) per log unit at 298K).
  * Exit code 0 when at least one pair succeeded, else 1 (CI stays green-ish
    but alerting is possible via the run summary).
"""

import glob
import json
import os
import subprocess
import sys
import time
import urllib.request
import zipfile
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
OUT_JSON = os.path.join(REPO, "public", "data", "boltz-affinities.json")
WORK = os.environ.get("BOLTZ_WORK", "/tmp/boltz_pilot")

FASTA_URL = "https://www.rcsb.org/fasta/entry/{}"
# Explicit inference params (defaults today; pinned for reproducibility).
# --use_msa_server ОБЯЗАТЕЛЕН: boltz 2.2.1 без MSA тихо «пропускает» вход
# (RuntimeError: Missing MSA's ... Skipping, rc=0) — корневая причина провала
# первых двух CI-ранов (Task 151b).
PREDICT_ARGS = [
    "--accelerator", "cpu",
    "--use_msa_server",
    "--recycling_steps", "3",
    "--sampling_steps", "200",
    "--diffusion_samples", "1",
    "--num_workers", "2",
    "--output_format", "pdb",
]
MODEL_TAG = os.environ.get("BOLTZ_MODEL_TAG", "boltz-2")
BOLTZ_BIN = os.environ.get("BOLTZ_BIN", "boltz")


def _boltz_cache() -> Path:
    """Cache dir boltz itself uses ($BOLTZ_CACHE or ~/.boltz)."""
    env = os.environ.get("BOLTZ_CACHE")
    return Path(env).expanduser() if env else Path("~/.boltz").expanduser()


def heal_cache() -> list[str]:
    """Self-heal partially downloaded checkpoints (poisoned cache).

    boltz re-downloads a ckpt only if it does NOT exist; a run cancelled
    mid-download leaves a truncated zip that survives forever in the
    actions/cache and fails every later run with
    'PytorchStreamReader failed reading zip archive'. We open each ckpt
    as a zip (central-directory parse, cheap) and delete bad files so
    boltz re-downloads them.
    """
    fixed: list[str] = []
    cache = _boltz_cache()
    for name in ("boltz2_conf.ckpt", "boltz2_aff.ckpt"):
        ckpt = cache / name
        if not ckpt.exists() or ckpt.stat().st_size < 10_000_000:
            if ckpt.exists():
                ckpt.unlink()
                fixed.append(f"{name}: undersized, removed")
            continue
        try:
            with zipfile.ZipFile(ckpt):
                pass
        except zipfile.BadZipFile:
            ckpt.unlink()
            fixed.append(f"{name}: corrupt zip, removed")
    return fixed


def fetch_fasta(pdb_id: str) -> dict[str, str]:
    """Fetch RCSB FASTA; return {auth_chain: sequence}."""
    url = FASTA_URL.format(pdb_id)
    with urllib.request.urlopen(url, timeout=60) as r:
        text = r.read().decode("utf-8")
    chains: dict[str, str] = {}
    for block in text.split(">")[1:]:
        lines = block.splitlines()
        header, seq = lines[0], "".join(lines[1:])
        # header like: 2RLF_1|Chains A, B, C, D|Matrix protein 2|Influenza A virus
        parts = header.split("|")
        chain_part = parts[1] if len(parts) > 1 else ""
        # "Chains A, B" (polymer entity spanning chains) or "Chain A"
        token = chain_part.replace("Chains", "").replace("Chain", "").strip()
        for ch in [c.strip() for c in token.split(",") if c.strip()]:
            chains[ch] = seq
    if not chains:
        raise ValueError(f"no polymer chains in FASTA for {pdb_id}")
    return chains


def build_yaml(pair: dict, sequences: list[str]) -> str:
    """Boltz input YAML: each selected chain as its own protein entry,
    ligand as chain L, affinity property bound to L."""
    lines = ["version: 1", "sequences:"]
    # chain ids for proteins: A, B, C, ... (skip L which is the ligand)
    chain_ids = [c for c in "ABCDEFGHIJK" if c != "L"]
    for i, seq in enumerate(sequences):
        lines += [
            "  - protein:",
            f"      id: {chain_ids[i]}",
            f"      sequence: {seq}",
        ]
    lines += [
        "  - ligand:",
        "      id: L",
        f"      smiles: '{pair['smiles']}'",
        "properties:",
        "  - affinity:",
        "      binder: L",
    ]
    return "\n".join(lines) + "\n"


def parse_outputs(out_dir: str, name: str) -> dict:
    """Glob boltz outputs (names vary across versions) and merge affinity +
    confidence JSONs."""
    aff_files = sorted(glob.glob(os.path.join(out_dir, "**", f"affinity_*{name}*.json"), recursive=True)) or \
        sorted(glob.glob(os.path.join(out_dir, "**", "affinity_*.json"), recursive=True))
    conf_files = sorted(glob.glob(os.path.join(out_dir, "**", f"confidence_*{name}*.json"), recursive=True)) or \
        sorted(glob.glob(os.path.join(out_dir, "**", "confidence_*.json"), recursive=True))
    if not aff_files:
        raise ValueError("no affinity_*.json produced")
    aff = json.load(open(aff_files[-1]))
    conf = json.load(open(conf_files[-1])) if conf_files else {}
    y = float(aff["affinity_pred_value"])
    return {
        "affinity_pred_value": y,  # log10(IC50, uM)
        "affinity_probability_binary": float(aff.get("affinity_probability_binary", 0.0)),
        "ic50_um_est": round(10 ** y, 6),
        "delta_g_kcal_mol": round((6 - y) * 1.364, 2),
        "confidence": {
            "confidence_score": conf.get("confidence_score"),
            "iptm": conf.get("iptm"),
            "ligand_iptm": conf.get("ligand_iptm"),
            "complex_plddt": conf.get("complex_plddt"),
        },
    }


def run_pair(pair: dict) -> dict:
    name = f"{pair['target_id']}__{pair['inn'].lower()}"
    pair_dir = os.path.join(WORK, name)
    os.makedirs(pair_dir, exist_ok=True)

    chains = fetch_fasta(pair["pdb_id"])
    wanted = pair.get("chains") or [next(iter(chains))]
    missing = [c for c in wanted if c not in chains]
    if missing:
        raise ValueError(f"chains {missing} not in FASTA {pair['pdb_id']} (have {list(chains)})")
    seqs = [chains[c] for c in wanted]

    yaml_path = os.path.join(pair_dir, f"{name}.yaml")
    with open(yaml_path, "w") as f:
        f.write(build_yaml(pair, seqs))

    t0 = time.time()
    cmd = [BOLTZ_BIN, "predict", yaml_path, "--out_dir", os.path.join(pair_dir, "out")] + PREDICT_ARGS
    print(f"[{name}] chains={wanted} tokens={sum(len(s) for s in seqs)}", flush=True)
    print(f"[{name}] $ {' '.join(cmd)}", flush=True)
    # 100 мин/пара: 7 пар обязаны влезть в job-timeout 350 мин с запасом
    # на MSA-генерацию (~20 мин) и докачку весов при холодном кэше
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=60 * 100)
    runtime_s = round(time.time() - t0, 1)
    tail = (proc.stderr or "")[-1200:] or (proc.stdout or "")[-1200:]
    if proc.returncode != 0:
        raise RuntimeError(f"boltz rc={proc.returncode}; tail: {tail}")

    try:
        parsed = parse_outputs(os.path.join(pair_dir, "out"), name)
    except Exception as e:  # noqa: BLE001 - attach boltz output for debugging
        # boltz «Skip»-ает плохие входы с rc=0 — без вывода такой провал
        # выглядит как «ничего не произошло» (урок первого CI-рана)
        raise RuntimeError(f"{e}; boltz tail: {tail}") from e
    parsed["runtime_s"] = runtime_s
    return parsed


def main() -> int:
    pairs = json.load(open(os.path.join(HERE, "pairs.json")))["pairs"]
    os.makedirs(WORK, exist_ok=True)
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)

    for msg in heal_cache():
        print(f"[CACHE-HEAL] {msg}", flush=True)

    results = []
    for pair in pairs:
        row = {
            "drug_id": pair["drug_id"],
            "inn": pair["inn"],
            "target_id": pair["target_id"],
            "target_name": pair["target_name"],
            "pdb_id": pair["pdb_id"],
            "chains": pair.get("chains") or ["A"],
            "kind": pair["kind"],
            "reference": pair.get("reference"),
            "hypothesis": pair.get("hypothesis"),
            "status": "ok",
        }
        try:
            row.update(run_pair(pair))
            print(f"[OK] {pair['inn']} x {pair['target_id']}: "
                  f"pIC50(log uM)={row['affinity_pred_value']} "
                  f"IC50~{row['ic50_um_est']} uM dG={row['delta_g_kcal_mol']} "
                  f"prob={row['affinity_probability_binary']}", flush=True)
        except Exception as e:  # noqa: BLE001 - record and continue
            row.update({"status": "error", "error": str(e)[:800]})
            print(f"[ERR] {pair['inn']} x {pair['target_id']}: {e}", flush=True)
        results.append(row)

    doc = {
        "model": MODEL_TAG,
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "params": {
            "recycling_steps": 3,
            "sampling_steps": 200,
            "diffusion_samples": 1,
            "msa": "MMSeqs2 server (--use_msa_server)",
            "accelerator": os.environ.get("BOLTZ_ACCEL_TAG", "cpu (GitHub Actions)"),
        },
        "units": {
            "affinity_pred_value": "log10(IC50 [uM]), Boltz-2 affinity head",
            "delta_g_kcal_mol": "(6 - y) * 1.364 (kcal/mol, RT*ln10 per log unit @298K)",
            "note": "меньше IC50 / меньше (более отрицательный) dG = сильнее связывание",
        },
        "pairs": results,
    }
    with open(OUT_JSON, "w") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
        f.write("\n")

    ok = sum(1 for r in results if r["status"] == "ok")
    print(f"\nDone: {ok}/{len(results)} pairs OK -> {OUT_JSON}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
