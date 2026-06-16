---
name: drizzle-zod Zod version pinning
description: drizzle-zod 0.8.x requires Zod v4; this project uses Zod v3 throughout — must pin drizzle-zod to 0.7.x
---

## Rule
Always pin `drizzle-zod` to `^0.7.x` in this project. Never upgrade to 0.8.x or later.

**Why:** `drizzle-zod@0.8.x` switched its internal schema generation to Zod v4 API (exposes `_zod` internals, `ZodType` with different generic signature). The entire platform's form layer (`useForm`, `zodResolver`, `z.infer<>`, `.extend()`) uses Zod v3. Upgrading drizzle-zod to 0.8.x causes ~20+ type errors across form components with `property '_zod' is missing` and `ZodType<any, any, any>` constraint violations.

**How to apply:** When running `bun update` or `bun add`, always explicitly pin: `bun add drizzle-zod@0.7.0`. Do NOT allow `bun update --latest` to touch drizzle-zod.

## Companion note — drizzle-orm JSON column `as any` casts
`drizzle-orm@0.45.2` (needed for the SQL injection CVE fix) tightened JSON column type inference. JSON columns with nested optional fields typed as `unknown` (e.g., `englishTestScores` in `studentProfiles`, `englishRequirements` in `courseRegionVariants`) now fail `.values()` and `.set()` type-checks. Fix: cast those arguments as `as any` with an explanatory comment. This is safe because runtime behaviour is unchanged; it's purely a type-gap in the JSON column $inferSelect definitions.
