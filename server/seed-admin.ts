import { db } from "./db";
import { users, roles } from "@shared/schema";
import { hashPassword } from "./auth-utils";
import { eq } from "drizzle-orm";

async function getRoleIdByName(roleName: string): Promise<string | null> {
  const result = await db
    .select()
    .from(roles)
    .where(eq(roles.name, roleName))
    .limit(1);
  
  return result.length > 0 ? result[0].id : null;
}

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
      
      // Ensure user has roleId set to super_admin role
      const userId = existingUser[0].id;
      if (!existingUser[0].roleId) {
        // Get super_admin role from roles table dynamically
        const superAdminRoleId = await getRoleIdByName('super_admin');
        
        if (superAdminRoleId) {
          await db
            .update(users)
            .set({ roleId: superAdminRoleId })
            .where(eq(users.id, userId));
          console.log("✅ Super admin role assigned via roles table!");
        } else {
          console.log("⚠️  Could not find super_admin role in roles table");
        }
      } else {
        console.log("Role already assigned!");
      }
      
      return;
    }
    
    // Get super_admin role from roles table dynamically
    const superAdminRoleId = await getRoleIdByName('super_admin');
    
    if (!superAdminRoleId) {
      console.log("⚠️  Warning: super_admin role not found in roles table - user will be created without role");
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create super admin user with proper userType and roleId
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        emailVerified: true,
        firstName: "Faysal",
        lastName: "Bahar",
        userType: "platform_admin",  // Use platform_admin for highest level admin
        roleId: superAdminRoleId,
        isActive: true,
      })
      .returning();
    
    console.log("✅ Super admin created successfully!");
    console.log("Email:", email);
    console.log("Password:", password);
    console.log("User ID:", newUser.id);
    console.log("Role ID:", newUser.roleId);
    
  } catch (error) {
    console.error("Error creating super admin:", error);
  }
  
  process.exit(0);
}

seedSuperAdmin();
