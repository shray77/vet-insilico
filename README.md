# VetInSilico — In Silico Drug Repurposing for Veterinary Pathogens

Browser-based drug screening against veterinary pathogens. Zero-cost, zero-backend.

## Features
- Drug repurposing screening (200+ Russian veterinary drugs)
- 6 priority pathogens (ASFV, FMDV, Brucella, HPAI, Newcastle, Rabies)
- Simplified molecular docking (shape + electrostatics)
- 3D protein-ligand visualization
- Lipinski Rule of Five filtering
- CSV export of screening results

## Stack
- Next.js 16 (static export) + Bun + Tailwind + shadcn/ui
- 3Dmol.js for molecular visualization
- All computations in-browser (no server)

## Zero Cost
- Hosting: GitHub Pages
- Data: public domain (RCSB PDB, DrugBank open, Russian veterinary registry)
- Compute: client-side JavaScript
