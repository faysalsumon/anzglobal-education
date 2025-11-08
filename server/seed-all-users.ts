import { db } from "./db";
import { users, adminTeamMembers, studentProfiles } from "@shared/schema";
import { hashPassword } from "./auth-utils";
import { eq } from "drizzle-orm";

async function seedAllUsers() {
  console.log("🌱 Starting user seeding...\n");
  
  const usersList = [
    {
      email: "faysalbahar@anzglobal.com.au",
      password: "AdminPass123!",
      firstName: "Faysal",
      lastName: "Bahar",
      userType: "admin" as const,
      role: "super_admin",
      adminRole: "super_admin",
      description: "Super Admin"
    },
    {
      email: "jannat@anzglobal.com.au",
      password: "Jannat123!",
      firstName: "Jannat",
      lastName: "Admin",
      userType: "admin" as const,
      role: "admin",
      adminRole: "support_manager",
      description: "Admin"
    },
    {
      email: "evan@anzglobal.com.au",
      password: "Evan123",
      firstName: "Evan",
      lastName: "Consultant",
      userType: "admin" as const,
      role: "consultant",
      adminRole: "support_staff",
      description: "Consultant"
    },
    {
      email: "asad@gmail.com",
      password: "Asad123",
      firstName: "Asad",
      lastName: "Student",
      userType: "student" as const,
      role: "user",
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
      
      // Hash password
      const hashedPassword = await hashPassword(userData.password);
      
      // Create user
      const [newUser] = await db
        .insert(users)
        .values({
          email: userData.email.toLowerCase(),
          password: hashedPassword,
          emailVerified: true,
          firstName: userData.firstName,
          lastName: userData.lastName,
          userType: userData.userType,
          role: userData.role,
          isActive: true,
        })
        .returning();
      
      console.log(`✅ ${userData.description} created successfully!`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   User ID: ${newUser.id}`);
      
      // Create admin team member if admin user type
      if (userData.userType === "admin" && userData.adminRole) {
        await db.insert(adminTeamMembers).values({
          userId: newUser.id,
          role: userData.adminRole,
          isActive: true,
          invitedBy: newUser.id,
        });
        console.log(`   Admin team member role: ${userData.adminRole}`);
      }
      
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
  console.log("─".repeat(60));
  usersList.forEach(user => {
    const dashboardPath = user.userType === "admin" ? "/admin" : 
                         user.userType === "student" ? "/student" : 
                         "/university";
    console.log(`${user.description.padEnd(20)} ${user.email.padEnd(35)} ${dashboardPath}`);
  });
  console.log("─".repeat(60));
  
  process.exit(0);
}

seedAllUsers();
