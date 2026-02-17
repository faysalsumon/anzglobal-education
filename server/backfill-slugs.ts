import { db } from "./db";
import { universities, courses } from "@shared/schema";
import { eq, isNull } from "drizzle-orm";
import { generateSlug, generateCourseSlug } from "./slug-utils";

async function backfillSlugs() {
  console.log("Starting slug backfill...");

  const allUnis = await db.select().from(universities).where(isNull(universities.slug));
  console.log(`Found ${allUnis.length} universities without slugs`);

  const usedUniSlugs = new Set<string>();
  for (const uni of allUnis) {
    let slug = generateSlug(uni.name);
    let counter = 1;
    while (usedUniSlugs.has(slug)) {
      slug = `${generateSlug(uni.name)}-${counter}`;
      counter++;
    }
    usedUniSlugs.add(slug);
    await db.update(universities).set({ slug }).where(eq(universities.id, uni.id));
    console.log(`  ${uni.name} -> ${slug}`);
  }

  const uniMap = new Map<string, string>();
  const allUnisForMap = await db.select().from(universities);
  for (const u of allUnisForMap) {
    uniMap.set(u.id, u.name);
  }

  const allCrs = await db.select().from(courses).where(isNull(courses.slug));
  console.log(`Found ${allCrs.length} courses without slugs`);

  const usedCourseSlugs = new Set<string>();
  for (const course of allCrs) {
    const instName = uniMap.get(course.universityId);
    let slug = generateCourseSlug(course.title, instName);
    let counter = 1;
    while (usedCourseSlugs.has(slug)) {
      slug = `${generateCourseSlug(course.title, instName)}-${counter}`;
      counter++;
    }
    usedCourseSlugs.add(slug);
    await db.update(courses).set({ slug }).where(eq(courses.id, course.id));
    console.log(`  ${course.title} -> ${slug}`);
  }

  console.log("Slug backfill complete!");
  process.exit(0);
}

backfillSlugs().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
