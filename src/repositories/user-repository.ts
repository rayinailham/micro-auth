import { PoolClient } from 'pg';
import { query, getClient, transaction } from '../config/database-config';

// User interface matching database schema
export interface User {
  id: string;
  username: string | null;
  email: string;
  password_hash: string | null;
  user_type: 'user' | 'admin' | 'superadmin' | 'moderator';
  is_active: boolean;
  token_balance: number;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
  // Firebase integration fields
  firebase_uid: string | null;
  auth_provider: 'local' | 'firebase' | 'hybrid';
  provider_data: any | null;
  last_firebase_sync: Date | null;
  federation_status: 'active' | 'syncing' | 'failed' | 'disabled';
}

// Create user input
export interface CreateUserInput {
  email: string;
  username?: string;
  password_hash?: string;
  user_type?: 'user' | 'admin' | 'superadmin' | 'moderator';
  firebase_uid?: string;
  auth_provider?: 'local' | 'firebase' | 'hybrid';
  provider_data?: any;
  token_balance?: number;
}

// Update user input
export interface UpdateUserInput {
  username?: string;
  password_hash?: string;
  user_type?: 'user' | 'admin' | 'superadmin' | 'moderator';
  is_active?: boolean;
  token_balance?: number;
  last_login?: Date;
  firebase_uid?: string;
  auth_provider?: 'local' | 'firebase' | 'hybrid';
  provider_data?: any;
  last_firebase_sync?: Date;
  federation_status?: 'active' | 'syncing' | 'failed' | 'disabled';
}

/**
 * User Repository
 * Handles all database operations for users
 */
export class UserRepository {
  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT * FROM auth.users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT * FROM auth.users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by Firebase UID
   */
  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT * FROM auth.users WHERE firebase_uid = $1',
      [firebaseUid]
    );
    return result.rows[0] || null;
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT * FROM auth.users WHERE username = $1',
      [username]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new user
   */
  async createUser(input: CreateUserInput): Promise<User> {
    const {
      email,
      username = null,
      password_hash = null,
      user_type = 'user',
      firebase_uid = null,
      auth_provider = 'local',
      provider_data = null,
      token_balance = 0,
    } = input;

    const result = await query<User>(
      `INSERT INTO auth.users (
        email, username, password_hash, user_type, firebase_uid, 
        auth_provider, provider_data, token_balance, is_active,
        created_at, updated_at, federation_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), $10)
      RETURNING *`,
      [
        email,
        username,
        password_hash,
        user_type,
        firebase_uid,
        auth_provider,
        provider_data ? JSON.stringify(provider_data) : null,
        token_balance,
        true,
        'active',
      ]
    );

    return result.rows[0];
  }

  /**
   * Update user by ID
   */
  async updateUser(id: string, input: UpdateUserInput): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query
    if (input.username !== undefined) {
      fields.push(`username = $${paramIndex++}`);
      values.push(input.username);
    }
    if (input.password_hash !== undefined) {
      fields.push(`password_hash = $${paramIndex++}`);
      values.push(input.password_hash);
    }
    if (input.user_type !== undefined) {
      fields.push(`user_type = $${paramIndex++}`);
      values.push(input.user_type);
    }
    if (input.is_active !== undefined) {
      fields.push(`is_active = $${paramIndex++}`);
      values.push(input.is_active);
    }
    if (input.token_balance !== undefined) {
      fields.push(`token_balance = $${paramIndex++}`);
      values.push(input.token_balance);
    }
    if (input.last_login !== undefined) {
      fields.push(`last_login = $${paramIndex++}`);
      values.push(input.last_login);
    }
    if (input.firebase_uid !== undefined) {
      fields.push(`firebase_uid = $${paramIndex++}`);
      values.push(input.firebase_uid);
    }
    if (input.auth_provider !== undefined) {
      fields.push(`auth_provider = $${paramIndex++}`);
      values.push(input.auth_provider);
    }
    if (input.provider_data !== undefined) {
      fields.push(`provider_data = $${paramIndex++}`);
      values.push(input.provider_data ? JSON.stringify(input.provider_data) : null);
    }
    if (input.last_firebase_sync !== undefined) {
      fields.push(`last_firebase_sync = $${paramIndex++}`);
      values.push(input.last_firebase_sync);
    }
    if (input.federation_status !== undefined) {
      fields.push(`federation_status = $${paramIndex++}`);
      values.push(input.federation_status);
    }

    // Always update updated_at
    fields.push(`updated_at = NOW()`);

    if (fields.length === 1) {
      // Only updated_at, no actual changes
      return this.findById(id);
    }

    values.push(id);

    const result = await query<User>(
      `UPDATE auth.users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0] || null;
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await query(
      'UPDATE auth.users SET last_login = NOW(), updated_at = NOW() WHERE id = $1',
      [id]
    );
  }

  /**
   * Update user's token balance
   */
  async updateTokenBalance(id: string, balance: number): Promise<User | null> {
    const result = await query<User>(
      'UPDATE auth.users SET token_balance = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [balance, id]
    );
    return result.rows[0] || null;
  }

  /**
   * Increment user's token balance
   */
  async incrementTokenBalance(id: string, amount: number): Promise<User | null> {
    const result = await query<User>(
      'UPDATE auth.users SET token_balance = token_balance + $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [amount, id]
    );
    return result.rows[0] || null;
  }

  /**
   * Decrement user's token balance
   */
  async decrementTokenBalance(id: string, amount: number): Promise<User | null> {
    const result = await query<User>(
      'UPDATE auth.users SET token_balance = token_balance - $1, updated_at = NOW() WHERE id = $2 AND token_balance >= $1 RETURNING *',
      [amount, id]
    );
    return result.rows[0] || null;
  }

  /**
   * Delete user by ID (soft delete - set is_active to false)
   */
  async softDeleteUser(id: string): Promise<boolean> {
    const result = await query(
      'UPDATE auth.users SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Delete user by ID (hard delete)
   */
  async hardDeleteUser(id: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM auth.users WHERE id = $1',
      [id]
    );
    return result.rowCount > 0;
  }

  /**
   * Find all users with failed federation status
   */
  async findFailedFederations(): Promise<User[]> {
    const result = await query<User>(
      'SELECT * FROM auth.users WHERE federation_status = $1',
      ['failed']
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
export const userRepository = new UserRepository();

