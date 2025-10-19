import { schoolRepository, School } from '../repositories/school-repository';

/**
 * School Service
 * Handles business logic for school operations
 */
export class SchoolService {
  /**
   * Get or create school by name (case-insensitive)
   * If school doesn't exist, creates a new one
   * Handles race conditions with database constraints
   */
  async getOrCreateSchool(name: string): Promise<School> {
    try {
      console.log(`🏫 Getting or creating school: ${name}`);

      // Sanitize name: trim and uppercase
      const sanitizedName = name.trim().toUpperCase();

      if (!sanitizedName) {
        throw new Error('School name cannot be empty after sanitization');
      }

      // Use repository's getOrCreate method which handles race conditions
      const school = await schoolRepository.getOrCreate(sanitizedName);

      console.log(`✅ School ready: ${school.name} (ID: ${school.id})`);
      return school;
    } catch (error: any) {
      console.error('Error in getOrCreateSchool:', error);
      
      // Handle specific error types
      if (error.message?.includes('already exists')) {
        // Try to fetch the existing school one more time
        const sanitizedName = name.trim().toUpperCase();
        const existing = await schoolRepository.findByName(sanitizedName);
        if (existing) {
          console.log(`✅ Retrieved existing school after conflict: ${existing.name}`);
          return existing;
        }
      }

      throw error;
    }
  }

  /**
   * Find school by name (case-insensitive)
   */
  async findByName(name: string): Promise<School | null> {
    try {
      const sanitizedName = name.trim().toUpperCase();
      return await schoolRepository.findByName(sanitizedName);
    } catch (error) {
      console.error('Error finding school by name:', error);
      throw error;
    }
  }

  /**
   * Find school by ID
   */
  async findById(id: number): Promise<School | null> {
    try {
      return await schoolRepository.findById(id);
    } catch (error) {
      console.error('Error finding school by ID:', error);
      throw error;
    }
  }

  /**
   * Get all schools
   */
  async getAllSchools(limit: number = 1000): Promise<School[]> {
    try {
      return await schoolRepository.findAll(limit);
    } catch (error) {
      console.error('Error getting all schools:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const schoolService = new SchoolService();

