import { storage } from "./storage";

interface MetaTags {
  title: string;
  description: string;
  ogImage?: string;
  ogUrl?: string;
}

const STATIC_METAS: Record<string, Omit<MetaTags, "ogImage" | "ogUrl">> = {
  "/courses": {
    title: "Find Courses in Australia, UK & Canada | ANZ Global Education",
    description: "Browse 1000+ courses from top universities in Australia, UK, Canada and New Zealand. Filter by subject, level, and location. Compare programs and apply directly.",
  },
  "/institutions": {
    title: "Partner Universities & Institutions | ANZ Global Education",
    description: "Explore our network of leading universities and institutions in Australia, UK, Canada and New Zealand. View courses, campuses, and scholarship opportunities.",
  },
  "/blog": {
    title: "Study Abroad Blog — Visa Tips, University Guides & Scholarships | ANZ Global Education",
    description: "Expert advice on studying abroad, student visa applications, university comparisons, scholarship opportunities, and student life in Australia and beyond.",
  },
  "/study-in-australia": {
    title: "Study in Australia — Universities, Courses & Student Visa Guide | ANZ Global Education",
    description: "Your complete guide to studying in Australia. Explore top universities, find the right course, understand student visa requirements, and discover scholarships.",
  },
  "/study-abroad": {
    title: "Study Abroad — Courses in Australia, UK & Canada | ANZ Global Education",
    description: "Discover study abroad opportunities in Australia, UK, Canada and more. Expert counseling, visa guidance, and scholarship support for international students.",
  },
  "/compare-courses": {
    title: "Compare Courses Side-by-Side | ANZ Global Education",
    description: "Compare university courses in Australia and worldwide — fees, duration, entry requirements, and more. Make an informed decision before you apply.",
  },
  "/partner-with-us": {
    title: "Partner With ANZ Global Education — For Universities & Agents",
    description: "Join our growing network of universities and education agents. Reach thousands of qualified international students through the ANZ Global Education platform.",
  },
  "/contact": {
    title: "Contact ANZ Global Education — Expert Study Abroad Advice",
    description: "Get in touch with our team of study abroad experts. We help students find the right course, navigate visa applications, and connect with partner universities.",
  },
  "/our-story": {
    title: "Our Story | ANZ Global Education — Study Abroad Platform",
    description: "Learn about ANZ Global Education's mission to connect international students with world-class universities in Australia, UK, Canada and beyond.",
  },
  "/student-reviews": {
    title: "Student Reviews & Testimonials | ANZ Global Education",
    description: "Read real student success stories and reviews. See how ANZ Global Education helped students achieve their dream of studying abroad.",
  },
  "/privacy": {
    title: "Privacy Policy | ANZ Global Education",
    description: "ANZ Global Education's privacy policy — how we collect, use, and protect your personal information when you use our study abroad platform.",
  },
  "/terms": {
    title: "Terms of Use | ANZ Global Education",
    description: "Terms and conditions for using the ANZ Global Education platform. Please read these terms carefully before using our services.",
  },
};

function trim(text: string, max = 160): string {
  if (!text) return "";
  const plain = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > max ? plain.substring(0, max - 3) + "..." : plain;
}

/** Derive the canonical origin from the incoming Host header */
function getCanonicalOrigin(hostname: string): { origin: string; isBD: boolean } {
  const h = hostname.toLowerCase().split(":")[0]; // strip port
  const isBD = h.includes("anzglobal.com.bd") || h.endsWith(".bd");
  const origin = isBD ? "https://anzglobal.com.bd" : "https://anzglobal.com.au";
  return { origin, isBD };
}

function replaceMeta(html: string, tags: MetaTags): string {
  const { title, description, ogImage, ogUrl } = tags;

  if (title) {
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
    html = html.replace(
      /(<meta\s+name="title"\s+content=")[^"]*(")/,
      `$1${title}$2`,
    );
    html = html.replace(
      /(<meta\s+property="og:title"\s+content=")[^"]*(")/,
      `$1${title}$2`,
    );
    html = html.replace(
      /(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,
      `$1${title}$2`,
    );
  }

  if (description) {
    html = html.replace(
      /(<meta\s+name="description"\s+content=")[^"]*(")/,
      `$1${description}$2`,
    );
    html = html.replace(
      /(<meta\s+property="og:description"\s+content=")[^"]*(")/,
      `$1${description}$2`,
    );
    html = html.replace(
      /(<meta\s+name="twitter:description"\s+content=")[^"]*(")/,
      `$1${description}$2`,
    );
  }

  if (ogImage) {
    html = html.replace(
      /(<meta\s+property="og:image"\s+content=")[^"]*(")/,
      `$1${ogImage}$2`,
    );
    html = html.replace(
      /(<meta\s+name="twitter:image"\s+content=")[^"]*(")/,
      `$1${ogImage}$2`,
    );
  }

  if (ogUrl) {
    html = html.replace(
      /(<meta\s+property="og:url"\s+content=")[^"]*(")/,
      `$1${ogUrl}$2`,
    );
  }

  return html;
}

export async function injectPageMeta(
  url: string,
  html: string,
  hostname: string = "anzglobal.com.au",
): Promise<string> {
  try {
    const pathname = url.split("?")[0].split("#")[0];
    const { origin, isBD } = getCanonicalOrigin(hostname);

    // Domain-specific OG image — always inject this regardless of page
    const ogImage = isBD
      ? `${origin}/og-image-bd.png`
      : `${origin}/og-image.png`;
    const ogUrl = `${origin}${pathname}`;

    // Inject domain-level OG tags into every page
    html = replaceMeta(html, { title: "", description: "", ogImage, ogUrl });

    const courseMatch = pathname.match(/^\/courses\/([^/]+)$/);
    if (courseMatch) {
      const idOrSlug = courseMatch[1];
      const course = await storage.getCourseByIdOrSlug(idOrSlug);
      if (course) {
        const uniName = (course as any).university?.name || "University";
        const country = course.country || "Australia";
        const level = course.level || "Degree";
        const subject = course.subject || "your field";
        const duration = course.duration ? ` Duration: ${course.duration}.` : "";
        return replaceMeta(html, {
          title: trim(`${course.title} - ${uniName} | Study in ${country} | ANZ Global Education`, 70),
          description: trim(
            course.description ||
              `Study ${course.title} at ${uniName}. ${level} program in ${subject}.${duration} Apply now with ANZ Global Education.`,
            160,
          ),
        });
      }
      return html;
    }

    const institutionMatch = pathname.match(/^\/institutions\/([^/]+)$/);
    if (institutionMatch) {
      const idOrSlug = institutionMatch[1];
      const institution = await storage.getUniversityByIdOrSlug(idOrSlug);
      if (institution) {
        const country = institution.country || "International";
        return replaceMeta(html, {
          title: trim(`${institution.name} | ${country} | ANZ Global Education`, 70),
          description: trim(
            institution.smallDescription ||
              institution.description ||
              `Explore courses and programs at ${institution.name} in ${country}. Apply directly through ANZ Global Education.`,
            160,
          ),
        });
      }
      return html;
    }

    const blogMatch = pathname.match(/^\/blog\/([^/]+)$/);
    if (blogMatch) {
      const slug = blogMatch[1];
      const blog = await storage.getBlogBySlug(slug);
      if (blog) {
        const metaTitle = blog.metaTitle || blog.title;
        const metaDesc = blog.metaDescription || blog.excerpt || trim(blog.content, 155);
        return replaceMeta(html, {
          title: trim(`${metaTitle} | ANZ Global Education`, 70),
          description: trim(metaDesc, 160),
        });
      }
      return html;
    }

    const staticMeta = STATIC_METAS[pathname];
    if (staticMeta) {
      return replaceMeta(html, staticMeta);
    }

    return html;
  } catch (err) {
    console.error("[meta-injector] Error injecting meta:", err);
    return html;
  }
}
