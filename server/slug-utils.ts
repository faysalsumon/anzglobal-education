import { db } from "./db";
import { universities, courses } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export function generateSlug(text: string): string {
  const slug = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.substring(0, 245) || 'untitled';
}

export function generateCourseSlug(courseTitle: string, institutionName?: string): string {
  const titleSlug = generateSlug(courseTitle);
  if (institutionName) {
    const instSlug = generateSlug(institutionName);
    return `${titleSlug}-${instSlug}`.substring(0, 245);
  }
  return titleSlug;
}

export async function generateUniqueUniversitySlug(name: string, excludeId?: string): Promise<string> {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db
      .select({ id: universities.id })
      .from(universities)
      .where(eq(universities.slug, slug))
      .limit(1);

    if (existing.length === 0 || (excludeId && existing[0].id === excludeId)) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

export async function generateUniqueCourseSlug(title: string, institutionName?: string, excludeId?: string): Promise<string> {
  const baseSlug = generateCourseSlug(title, institutionName);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await db
      .select({ id: courses.id })
      .from(courses)
      .where(eq(courses.slug, slug))
      .limit(1);

    if (existing.length === 0 || (excludeId && existing[0].id === excludeId)) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}
