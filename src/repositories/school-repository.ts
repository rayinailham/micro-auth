import { PoolClient } from 'pg';
import { query, getClient, transaction } from '../config/database-config';

// School interface matching database schema
export interface School {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  created_at: Date;
}

// Create school input
export interface CreateSchoolInput {
  name: string;
  address?: string;
  city?: string;
  province?: string;
}

/**
 * School Repository
 * Handles all database operations for schools
 */
export class SchoolRepository {
  /**
   * Find school by name (case-insensitive)
   */
  async findByName(name: string): Promise<School | null> {
    const result = await query<School>(
      'SELECT * FROM public.schools WHERE UPPER(name) = UPPER($1)',
      [name]
    );
    return result.rows[0] || null;
  }

  /**
   * Find school by ID
   */
  async findById(id: number): Promise<School | null> {
    const result = await query<School>(
      'SELECT * FROM public.schools WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new school
   */
  async create(input: CreateSchoolInput): Promise<School> {
    const {
      name,
      address = null,
      city = null,
      province = null,
    } = input;

    const result = await query<School>(
      `INSERT INTO public.schools (name, address, city, province, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [name, address, city, province]
    );

    return result.rows[0];
  }

  /**
   * Get or create school by name (case-insensitive)
   * Uses INSERT ... ON CONFLICT to handle race conditions
   */
  async getOrCreate(name: string): Promise<School> {
    try {
      // Use transaction to ensure atomicity
      return await transaction(async (client: PoolClient) => {
        // Try to insert, if conflict (duplicate name), do nothing
        const insertResult = await client.query<School>(
          `INSERT INTO public.schools (name, created_at)
           VALUES (UPPER($1), NOW())
           ON CONFLICT ((UPPER(name))) DO NOTHING
           RETURNING *`,
          [name]
        );

        // If insert succeeded, return the new school
        if (insertResult.rows.length > 0) {
          console.log(`✅ Created new school: ${name}`);
          return insertResult.rows[0];
        }

        // If insert was skipped due to conflict, fetch the existing school
        const selectResult = await client.query<School>(
          'SELECT * FROM public.schools WHERE UPPER(name) = UPPER($1)',
          [name]
        );

        if (selectResult.rows.length === 0) {
          throw new Error(`School not found after conflict: ${name}`);
        }

        console.log(`✅ Found existing school: ${name}`);
        return selectResult.rows[0];
      });
    } catch (error: any) {
      // Handle constraint violation errors
      if (error.code === '23505') {
        // Unique constraint violation - try to fetch existing school
        console.log(`⚠️  Unique constraint violation for school: ${name}, fetching existing...`);
        const existing = await this.findByName(name);
        if (existing) {
          return existing;
        }
        throw new Error(`School name already exists: ${name}`);
      }
      
      console.error('Error in getOrCreate school:', error);
      throw error;
    }
  }

  /**
   * Update school by ID
   */
  async update(id: number, input: Partial<CreateSchoolInput>): Promise<School | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(input.name);
    }
    if (input.address !== undefined) {
      fields.push(`address = $${paramIndex++}`);
      values.push(input.address);
    }
    if (input.city !== undefined) {
      fields.push(`city = $${paramIndex++}`);
      values.push(input.city);
    }
    if (input.province !== undefined) {
      fields.push(`province = $${paramIndex++}`);
      values.push(input.province);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const result = await query<School>(
      `UPDATE public.schools SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Delete school by ID
   */
  async delete(id: number): Promise<boolean> {
    const result = await query(
      'DELETE FROM public.schools WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Find all schools (with optional limit for safety)
   */
  async findAll(limit: number = 1000): Promise<School[]> {
    const result = await query<School>(
      'SELECT * FROM public.schools ORDER BY name ASC LIMIT $1',
      [limit]
    );
    return result.rows;
  }

  /**
   * Execute operation within a transaction
   */
  async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    return transaction(callback);
  }
}

// Export singleton instance
export const schoolRepository = new SchoolRepository();

