# WHO AWaRe catalogue mapping

The current authoritative source checked on 4 November 2026 is the WHO 2025 AWaRe classification publication (WHO reference B09489):
https://www.who.int/publications/i/item/B09489

The import is intentionally explicit. It updates only local generic names that appear in a curator-prepared CSV. Every unmatched or invalid row is written to an unmapped JSON report, and local records that are not reviewed remain `UNKNOWN`.

CSV format:

```csv
generic_name,aware_group
amoxicillin,ACCESS
linezolid,RESERVE
```

Run from `server` after additive migrations:

```powershell
C:\xampp\php\php.exe artisan migrate --force
C:\xampp\php\php.exe artisan catalogue:import-aware .\storage\app\aware-2025.csv --version=2025 --source-url=https://www.who.int/publications/i/item/B09489 --review-date=2026-11-04
```

The command never infers a classification from a brand, therapeutic class, or fuzzy match. AWaRe is descriptive stewardship metadata for monitoring and does not diagnose resistance or change a clinician's treatment plan.
