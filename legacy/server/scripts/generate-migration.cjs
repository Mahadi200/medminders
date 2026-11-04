const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const serverDir = path.join(__dirname, '..');
const prismaBin = path.join(serverDir, 'node_modules/prisma/build/index.js');

const ddl = execSync(
  `node "${prismaBin}" migrate diff --from-schema-datamodel prisma/legacy_schema.prisma --to-schema-datamodel prisma/schema.prisma --script`,
  { cwd: serverDir, encoding: 'utf8' }
);

const checkConstraints = `
-- Custom Database-Level Clinical Safety & Integrity Constraints
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT chk_prescribed_qty CHECK ("prescribedQuantity" > 0);
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT chk_dispensed_qty CHECK ("dispensedQuantity" >= 0 AND "dispensedQuantity" <= "prescribedQuantity");
ALTER TABLE "ConsentGrant" ADD CONSTRAINT chk_consent_revocation CHECK ("revokedAt" IS NULL OR "revokedAt" >= "grantedAt");
ALTER TABLE "Prescription" ADD CONSTRAINT chk_token_expiry CHECK ("tokenExpiresAt" IS NULL OR "tokenExpiresAt" >= "createdAt");
ALTER TABLE "DispenseItem" ADD CONSTRAINT chk_dispense_item_qty CHECK ("quantityDispensed" > 0);
`;

const fullSql = ddl.trim() + '\n\n' + checkConstraints.trim() + '\n';
const outPath = path.join(__dirname, '../prisma/migrations/20260926100000_clinical_schema_evolution/migration.sql');
fs.writeFileSync(outPath, fullSql, 'utf8');
console.log('Migration SQL updated successfully. Total length:', fullSql.length);
