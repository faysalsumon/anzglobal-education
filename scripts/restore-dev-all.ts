import { execSync } from "child_process";

console.log("=".repeat(60));
console.log("  DEV DB FULL RESTORE (Neon → Dev)");
console.log("=".repeat(60));
console.log();

const scripts = [
  { name: "Institutions & Courses", file: "scripts/restore-dev-institutions.ts" },
  { name: "User Profile Pictures", file: "scripts/restore-dev-user-photos.ts" },
];

for (const script of scripts) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  Running: ${script.name}`);
  console.log(`${"─".repeat(60)}\n`);

  try {
    execSync(`bun ${script.file}`, {
      stdio: "inherit",
      env: process.env,
    });
  } catch (err: any) {
    console.error(`\nFAILED: ${script.name}`);
    console.error(err.message);
    process.exit(1);
  }
}

console.log(`\n${"=".repeat(60)}`);
console.log("  ALL RESTORE STEPS COMPLETED SUCCESSFULLY");
console.log(`${"=".repeat(60)}`);
