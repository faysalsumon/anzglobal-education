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

async function seedCTO() {
  const email = "faysalbahar@anzglobal.com.au";
  const password = process.env.SEED_ADMIN_PASSWORD || "Change_Me_123!";
  
  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    
    if (existingUser.length > 0) {
      console.log("CTO user already exists!");
      
      // Ensure user has roleId set to cto role
      const userId = existingUser[0].id;
      if (!existingUser[0].roleId) {
        // Get cto role from roles table dynamically
        const ctoRoleId = await getRoleIdByName('cto');
        
        if (ctoRoleId) {
          await db
            .update(users)
            .set({ roleId: ctoRoleId })
            .where(eq(users.id, userId));
          console.log("✅ CTO role assigned via roles table!");
        } else {
          console.log("⚠️  Could not find cto role in roles table");
        }
      } else {
        console.log("Role already assigned!");
      }
      
      return;
    }
    
    // Get cto role from roles table dynamically
    const ctoRoleId = await getRoleIdByName('cto');
    
    if (!ctoRoleId) {
      console.log("⚠️  Warning: cto role not found in roles table - user will be created without role");
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create CTO user with proper userType and roleId
    const [newUser] = (await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        emailVerified: true,
        firstName: "Faysal",
        lastName: "Bahar",
        userType: "platform_admin",  // Use platform_admin for highest level admin
        roleId: ctoRoleId,
        isActive: true,
      })
      .returning()) as any[];
    
    console.log("✅ CTO created successfully!");
    console.log("Email:", email);
    console.log("User ID:", newUser.id);
    console.log("Role ID:", newUser.roleId);
    
  } catch (error) {
    console.error("Error creating CTO:", error);
  }
  
  process.exit(0);
}

seedCTO();
