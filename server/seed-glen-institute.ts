import { db } from "./db";
import { users, universities } from "@shared/schema";
import { hashPassword } from "./auth-utils";
import { eq } from "drizzle-orm";

async function seedGlenInstitute() {
  const email = "bikash@gmail.com";
  const password = process.env.SEED_INSTITUTION_PASSWORD || "Change_Me_123!";
  
  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    let userId: string;
    
    if (existingUser.length > 0) {
      console.log("User already exists!");
      userId = existingUser[0].id;
    } else {
      // Hash password
      const hashedPassword = await hashPassword(password);
      
      // Create university admin user
      const [newUser] = (await db
        .insert(users)
        .values({
          email,
          password: hashedPassword,
          emailVerified: true,
          firstName: "Bikash",
          lastName: "Thapa",
          userType: "university",
          role: "super_admin",
          isActive: true,
        } as any)
        .returning()) as any[];
      
      userId = newUser.id;
      console.log("✅ University admin user created successfully!");
      console.log("Email:", email);
      console.log("User ID:", userId);
    }
    
    // Check if Glen Institute already exists
    const existingUniversity = await db
      .select()
      .from(universities)
      .where(eq(universities.userId, userId))
      .limit(1);
    
    if (existingUniversity.length > 0) {
      console.log("Glen Institute already exists!");
      console.log("University ID:", existingUniversity[0].id);
    } else {
      // Create Glen Institute university profile
      const [newUniversity] = await db
        .insert(universities)
        .values({
          userId,
          name: "Glen Institute",
          location: "Melbourne",
          country: "Australia",
          numberOfCampuses: 1,
          providerType: "Private Institutions",
          scholarshipPercentage: 20,
          website: "https://glen.edu.au",
          contactEmail: "info@glen.edu.au",
          topDisciplines: ["Management", "Hospitality", "IT", "Automotive"],
          
          // Short description (AI-powered style, ~100 words)
          smallDescription: "Glen Institute, located in Melbourne, is a leading provider of vocational education, offering specialized programs in Leadership and Management and Hospitality Management. The institute focuses on practical, hands-on training to equip students with the skills needed for career success. With expert faculty and modern facilities, Glen Institute prepares students to excel in leadership roles or the fast-paced hospitality industry.",
          
          // Full description
          fullDescription: `Glen Institute, based in Melbourne, is renowned for its high-quality vocational programs in Leadership and Management and Hospitality Management. Committed to providing students with practical, career-focused education, Glen Institute helps learners develop the essential skills and knowledge they need to thrive in these competitive industries. The institute's innovative teaching approach and industry-aligned curriculum are designed to meet the evolving demands of today's job market.

The Leadership and Management program at Glen Institute is designed for students looking to sharpen their leadership abilities and strategic thinking. The program covers key areas such as organizational behavior, strategic planning, communication, and team management. Through case studies, group projects, and real-world scenarios, students gain valuable insights into leadership challenges and develop practical solutions. Graduates are well-equipped to take on leadership roles in a variety of industries.

In the Hospitality Management program, Glen Institute offers comprehensive training in areas such as hotel and restaurant management, event planning, food and beverage operations, and customer service. Students are prepared to manage hospitality venues effectively, ensuring seamless operations and high-quality guest experiences. With a strong focus on practical learning, students have opportunities to apply their skills in real-world settings, gaining hands-on experience that enhances their employability.

Glen Institute takes pride in its supportive and engaging learning environment. With a team of experienced faculty members who are experts in their respective fields, students receive personalized guidance and mentorship throughout their studies. The institute's state-of-the-art facilities provide students with the tools and resources they need to succeed, while its strong industry partnerships open doors to internships, networking, and employment opportunities.

Situated in Melbourne, a city known for its thriving hospitality and business sectors, Glen Institute offers students access to a wealth of professional experiences and opportunities. Whether you're aspiring to lead teams in a business setting or manage operations in the hospitality industry, Glen Institute provides the education and support you need to achieve your career goals.`,
          
          // Top courses from the website
          topCourses: [
            "Certificate III in Commercial Cookery",
            "Certificate IV in Kitchen Management",
            "Advanced Diploma of Information Technology",
            "Advanced Diploma of Civil Construction Design"
          ],
          
          isActive: true,
        } as any)
        .returning();
      
      console.log("✅ Glen Institute created successfully!");
      console.log("University ID:", newUniversity.id);
      console.log("Name:", newUniversity.name);
    }
    
    console.log("\n=== Glen Institute Setup Complete ===");
    console.log("Login at: /admin/login");
    console.log("Email:", email);
    
  } catch (error) {
    console.error("Error creating Glen Institute:", error);
  }
  
  process.exit(0);
}

seedGlenInstitute();
