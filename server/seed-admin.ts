import { db } from "./db";
import { users, adminTeamMembers } from "@shared/schema";
import { hashPassword } from "./auth-utils";
import { eq } from "drizzle-orm";

async function seedSuperAdmin() {
  const email = "faysalbahar@anzglobal.com.au";
  const password = "AdminPass123!";
  
  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (existingUser.length > 0) {
      console.log("Super admin user already exists!");
      
      // Ensure admin team member record exists
      const userId = existingUser[0].id;
      const existingMember = await db
        .select()
        .from(adminTeamMembers)
        .where(eq(adminTeamMembers.userId, userId))
        .limit(1);
      
      if (existingMember.length === 0) {
        await db.insert(adminTeamMembers).values({
          userId,
          role: "super_admin",
          isActive: true,
          invitedBy: userId,
        });
        console.log("✅ Admin team member record created for existing super admin!");
      } else {
        console.log("Admin team member record already exists!");
      }
      
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
        userType: "admin",  // Use "admin" not "super_admin"
        role: "super_admin",
        isActive: true,
      })
      .returning();
    
    // Create admin team member record
    await db.insert(adminTeamMembers).values({
      userId: newUser.id,
      role: "super_admin",
      isActive: true,
      invitedBy: newUser.id,
    });
    
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
