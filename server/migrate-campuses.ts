import { db } from "./db";
import { universities } from "../shared/schema";
const campuses = (null as any); // campuses table not yet in schema
import { eq, isNotNull } from "drizzle-orm";

/**
 * Migration script to extract campus data from JSONB campusAddresses field
 * and populate the normalized campuses table.
 * 
 * This script:
 * 1. Reads all universities with campusAddresses
 * 2. Extracts each campus address
 * 3. Creates normalized campus records
 * 4. Preserves address structure (street, city, state, postcode)
 * 
 * Note: Geocoding (latitude/longitude) is not done in this migration.
 * Coordinates will be added later via Google Maps Geocoding API when needed.
 */

interface CampusAddress {
  address: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

async function migrateCampuses() {
  console.log("🏫 Starting campus data migration...");
  
  try {
    // Fetch all universities with campusAddresses
    const universitiesWithCampuses = await db
      .select()
      .from(universities)
      .where(isNotNull(universities.campusAddresses));
    
    console.log(`Found ${universitiesWithCampuses.length} universities with campus data`);
    
    let totalCampusesCreated = 0;
    
    for (const university of universitiesWithCampuses) {
      const campusAddresses = university.campusAddresses as unknown as CampusAddress[] | null;
      
      if (!campusAddresses || !Array.isArray(campusAddresses) || campusAddresses.length === 0) {
        continue;
      }
      
      console.log(`\nProcessing ${university.name} (${campusAddresses.length} campuses)`);
      
      // Check if campuses already exist for this institution (avoid duplicate migrations)
      const existingCampuses = await db
        .select()
        .from(campuses)
        .where(eq(campuses.institutionId, university.id));
      
      if (existingCampuses.length > 0) {
        console.log(`  ℹ️ Campuses already exist for ${university.name} (${existingCampuses.length} found), skipping`);
        continue;
      }
      
      for (let i = 0; i < campusAddresses.length; i++) {
        const campusAddr = campusAddresses[i];
        
        // Skip if no address data
        if (!campusAddr.address && !campusAddr.city) {
          console.log(`  ⚠️ Skipping empty campus address at index ${i}`);
          continue;
        }
        
        // Generate campus name from address or index
        const campusName = campusAddr.city 
          ? `${campusAddr.city} Campus`
          : `Campus ${i + 1}`;
        
        try {
          await db.insert(campuses).values({
            institutionId: university.id,
            name: campusName,
            street: campusAddr.address || null,
            city: campusAddr.city || "Unknown",
            state: campusAddr.state || null,
            postcode: campusAddr.postcode || null,
            country: campusAddr.country || "Australia",
            displayOrder: i,
            isActive: true,
            // Latitude and longitude will be null for now
            // They can be geocoded later via Google Maps API
          });
          
          console.log(`  ✅ Created: ${campusName}`);
          totalCampusesCreated++;
        } catch (error) {
          console.error(`  ❌ Error creating campus: ${error}`);
        }
      }
    }
    
    console.log(`\n✨ Migration complete! Created ${totalCampusesCreated} campus records`);
    console.log("\n📍 Note: Geocoding (lat/lng) will be done automatically when:");
    console.log("   - Admins edit institution campuses via the admin panel");
    console.log("   - Google Maps component loads campus locations");
    
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

export { migrateCampuses };

// Run migration if this file is executed directly
migrateCampuses()
  .then(() => {
    console.log("\n🎉 Campus migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Campus migration failed:", error);
    process.exit(1);
  });
