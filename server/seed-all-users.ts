import { db } from "./db";
import { users, roles, studentProfiles } from "@shared/schema";
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

async function seedAllUsers() {
  console.log("🌱 Starting user seeding...\n");
  
  // User Types: admin, platform_admin, student, institution_admin
  // Roles are assigned via roleId from the roles table
  const usersList = [
    {
      email: "faysalbahar@anzglobal.com.au",
      password: "AdminPass123!",
      firstName: "Faysal",
      lastName: "Bahar",
      userType: "platform_admin" as const,  // Highest level admin
      roleName: "cto",
      description: "CTO (Platform Admin)"
    },
    {
      email: "jannat@anzglobal.com.au",
      password: "Jannat123!",
      firstName: "Jannat",
      lastName: "Admin",
      userType: "admin" as const,
      roleName: "senior_consultant",
      description: "Senior Consultant"
    },
    {
      email: "evan@anzglobal.com.au",
      password: "Evan123",
      firstName: "Evan",
      lastName: "Consultant",
      userType: "admin" as const,
      roleName: "junior_consultant",
      description: "Junior Consultant"
    },
    {
      email: "asad@gmail.com",
      password: "Asad123",
      firstName: "Asad",
      lastName: "Student",
      userType: "student" as const,
      roleName: "student",
      description: "Student"
    }
  ];
  
  for (const userData of usersList) {
    try {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email.toLowerCase()))
        .limit(1);
      
      if (existingUser.length > 0) {
        console.log(`⏭️  ${userData.description} (${userData.email}) already exists - skipping`);
        continue;
      }
      
      // Get roleId dynamically from roles table by name
      const roleId = await getRoleIdByName(userData.roleName);
      
      if (!roleId) {
        console.log(`⚠️  Role '${userData.roleName}' not found in database - user will be created without role`);
      }
      
      // Hash password
      const hashedPassword = await hashPassword(userData.password);
      
      // Create user with proper userType and roleId
      const [newUser] = await db
        .insert(users)
        .values({
          email: userData.email.toLowerCase(),
          password: hashedPassword,
          emailVerified: true,
          firstName: userData.firstName,
          lastName: userData.lastName,
          userType: userData.userType,
          roleId: roleId,
          isActive: true,
        })
        .returning();
      
      console.log(`✅ ${userData.description} created successfully!`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   User ID: ${newUser.id}`);
      console.log(`   User Type: ${userData.userType}`);
      console.log(`   Role: ${userData.roleName} (${roleId || 'none'})`);
      
      // Create student profile if student user type
      if (userData.userType === "student") {
        await db.insert(studentProfiles).values({
          userId: newUser.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
        });
        console.log(`   Student profile created`);
      }
      
      console.log("");
      
    } catch (error) {
      console.error(`❌ Error creating ${userData.description}:`, error);
    }
  }
  
  console.log("\n=== User Seeding Complete ===");
  console.log("\n📋 User Login Credentials:");
  console.log("─".repeat(70));
  console.log("User Type".padEnd(18) + "Role".padEnd(20) + "Email".padEnd(32));
  console.log("─".repeat(70));
  usersList.forEach(user => {
    console.log(`${user.userType.padEnd(18)} ${user.roleName.padEnd(20)} ${user.email}`);
  });
  console.log("─".repeat(70));
  
  process.exit(0);
}

seedAllUsers();
