import { db } from "./db";
import { users } from "@shared/schema";
import { hashPassword } from "./auth-utils";
import { eq } from "drizzle-orm";

async function seedSuperAdmin() {
  const email = "faysalbahar@anzglobal.com.au";
  const password = "SamSung0";
  
  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (existingUser.length > 0) {
      console.log("Super admin already exists!");
      return;
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create super admin user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        emailVerified: true, // Auto-verify super admin
        firstName: "Faysal",
        lastName: "Bahar",
        userType: "super_admin",
        role: "super_admin",
        isActive: true,
      })
      .returning();
    
    console.log("✅ Super admin created successfully!");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("User ID:", newUser.id);
    
  } catch (error) {
    console.error("Error creating super admin:", error);
  }
  
  process.exit(0);
}

seedSuperAdmin();
