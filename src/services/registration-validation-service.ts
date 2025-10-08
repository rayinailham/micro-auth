import { getFirebaseAuth } from '../config/firebase-config';
import { UserRepository } from '../repositories/user-repository';

/**
 * Registration Validation Result
 */
export interface RegistrationValidationResult {
  allowed: boolean;
  conflictType?: 'local_user' | 'firebase_user' | 'hybrid_user' | 'orphaned_account' | 'inconsistent_state';
  errorCode?: string;
  errorMessage?: string;
  actionableMessage?: string;
  pgUser?: any;
  firebaseUser?: any;
}

/**
 * Registration Validation Service
 * Implements pre-check validation to prevent duplicate registrations
 * and provide clear error messages for conflict scenarios
 */
export class RegistrationValidationService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Main validation method - checks for conflicts before registration
   */
  async validateRegistration(email: string): Promise<RegistrationValidationResult> {
    try {
      console.log(`🔍 Validating registration for: ${email}`);

      // STEP 1: Check PostgreSQL for existing user
      const pgUser = await this.checkPostgreSQLUser(email);
      
      // STEP 2: Check Firebase for existing user
      const firebaseUser = await this.checkFirebaseUser(email);

      // STEP 3: Determine conflict type using conflict detection matrix
      const result = this.determineConflictType(pgUser, firebaseUser);

      console.log(`✅ Validation result for ${email}:`, {
        allowed: result.allowed,
        conflictType: result.conflictType,
        errorCode: result.errorCode
      });

      return result;
    } catch (error) {
      console.error('Error validating registration:', error);
      throw error;
    }
  }

  /**
   * Check if user exists in PostgreSQL
   */
  private async checkPostgreSQLUser(email: string): Promise<any | null> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (user) {
        console.log(`📊 PostgreSQL: User found - firebase_uid: ${user.firebase_uid || 'NULL'}, auth_provider: ${user.auth_provider}`);
      } else {
        console.log(`📊 PostgreSQL: User not found`);
      }
      return user;
    } catch (error) {
      console.error('Error checking PostgreSQL user:', error);
      throw error;
    }
  }

  /**
   * Check if user exists in Firebase
   */
  private async checkFirebaseUser(email: string): Promise<any | null> {
    try {
      const firebaseAuth = getFirebaseAuth();
      const user = await firebaseAuth.getUserByEmail(email);
      console.log(`🔥 Firebase: User found - UID: ${user.uid}`);
      return user;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log(`🔥 Firebase: User not found`);
        return null;
      }
      console.error('Error checking Firebase user:', error);
      throw error;
    }
  }

  /**
   * Conflict Detection Matrix
   * Determines the type of conflict and appropriate action
   * 
   * Matrix:
   * | PostgreSQL          | Firebase            | Action                                    |
   * |---------------------|---------------------|-------------------------------------------|
   * | Not Found           | Not Found           | ✅ Allow registration                     |
   * | Found (no fb_uid)   | Not Found           | ⚠️ Local user - suggest forgot password   |
   * | Found (has fb_uid)  | Found (same UID)    | ❌ Hybrid user - suggest login            |
   * | Found (has fb_uid)  | Found (diff UID)    | 🔧 Orphaned account - needs reconciliation|
   * | Found (has fb_uid)  | Not Found           | 🔧 Inconsistent state - needs fix         |
   * | Not Found           | Found               | 🔧 Orphaned Firebase - needs linking      |
   */
  private determineConflictType(
    pgUser: any | null,
    firebaseUser: any | null
  ): RegistrationValidationResult {
    
    // Case 1: No conflicts - allow registration
    if (!pgUser && !firebaseUser) {
      return {
        allowed: true,
      };
    }

    // Case 2: Local user exists (no firebase_uid), Firebase doesn't exist
    // User should use forgot password to migrate
    if (pgUser && !pgUser.firebase_uid && !firebaseUser) {
      return {
        allowed: false,
        conflictType: 'local_user',
        errorCode: 'EMAIL_EXISTS_LOCAL',
        errorMessage: 'Email already registered with local authentication',
        actionableMessage: 'This email is already registered. Please use "Forgot Password" to set up your account, or login if you remember your password.',
      };
    }

    // Case 3: Hybrid/Firebase user exists with matching UIDs
    // User should just login
    if (pgUser && pgUser.firebase_uid && firebaseUser && pgUser.firebase_uid === firebaseUser.uid) {
      return {
        allowed: false,
        conflictType: 'hybrid_user',
        errorCode: 'EMAIL_EXISTS_FIREBASE',
        errorMessage: 'Email already registered',
        actionableMessage: 'This email is already registered. Please login instead. If you forgot your password, use "Forgot Password".',
      };
    }

    // Case 4: Orphaned account - PostgreSQL has firebase_uid but different from Firebase UID
    // This is a data inconsistency that needs reconciliation
    if (pgUser && pgUser.firebase_uid && firebaseUser && pgUser.firebase_uid !== firebaseUser.uid) {
      console.error(`🚨 ORPHANED ACCOUNT DETECTED: ${pgUser.email}`);
      console.error(`   PostgreSQL firebase_uid: ${pgUser.firebase_uid}`);
      console.error(`   Firebase UID: ${firebaseUser.uid}`);
      
      return {
        allowed: false,
        conflictType: 'orphaned_account',
        errorCode: 'ACCOUNT_INCONSISTENCY',
        errorMessage: 'Account data inconsistency detected',
        actionableMessage: 'There is an issue with your account. Please contact support with error code: ERR_ORPHAN_ACCOUNT',
        pgUser,
        firebaseUser,
      };
    }

    // Case 5: Inconsistent state - PostgreSQL has firebase_uid but Firebase user doesn't exist
    // Firebase account was deleted but PostgreSQL still references it
    if (pgUser && pgUser.firebase_uid && !firebaseUser) {
      console.error(`🚨 INCONSISTENT STATE DETECTED: ${pgUser.email}`);
      console.error(`   PostgreSQL has firebase_uid: ${pgUser.firebase_uid}`);
      console.error(`   But Firebase user not found`);
      
      return {
        allowed: false,
        conflictType: 'inconsistent_state',
        errorCode: 'ACCOUNT_INCONSISTENCY',
        errorMessage: 'Account data inconsistency detected',
        actionableMessage: 'There is an issue with your account. Please contact support with error code: ERR_INCONSISTENT_STATE',
        pgUser,
      };
    }

    // Case 6: Orphaned Firebase account - Firebase exists but PostgreSQL doesn't
    // This can happen if PostgreSQL creation failed during registration
    // We can allow this and let the normal flow handle it (getOrCreateUser will link it)
    if (!pgUser && firebaseUser) {
      console.warn(`⚠️ ORPHANED FIREBASE ACCOUNT: ${firebaseUser.email}`);
      console.warn(`   Firebase UID: ${firebaseUser.uid}`);
      console.warn(`   PostgreSQL user not found - will be created during registration`);
      
      // Actually, Firebase will reject this with EMAIL_ALREADY_EXISTS
      // So we should return an error suggesting login
      return {
        allowed: false,
        conflictType: 'firebase_user',
        errorCode: 'EMAIL_EXISTS_FIREBASE',
        errorMessage: 'Email already registered in Firebase',
        actionableMessage: 'This email is already registered. Please login instead. If you forgot your password, use "Forgot Password".',
        firebaseUser,
      };
    }

    // Fallback - should not reach here
    console.error(`🚨 UNEXPECTED STATE: pgUser=${!!pgUser}, firebaseUser=${!!firebaseUser}`);
    return {
      allowed: false,
      conflictType: 'inconsistent_state',
      errorCode: 'UNEXPECTED_STATE',
      errorMessage: 'Unexpected account state',
      actionableMessage: 'An unexpected error occurred. Please contact support.',
    };
  }

  /**
   * Detect orphaned accounts in the system
   * This can be run periodically to find and fix inconsistencies
   */
  async detectOrphanedAccounts(): Promise<{
    orphanedFirebase: any[];
    orphanedPostgreSQL: any[];
    inconsistentStates: any[];
  }> {
    try {
      console.log('🔍 Scanning for orphaned accounts...');

      const orphanedFirebase: any[] = [];
      const orphanedPostgreSQL: any[] = [];
      const inconsistentStates: any[] = [];

      // Get all users with firebase_uid from PostgreSQL
      const pgUsers = await this.userRepository.findAll();

      for (const pgUser of pgUsers) {
        if (pgUser.firebase_uid) {
          // Check if Firebase user exists
          try {
            const firebaseAuth = getFirebaseAuth();
            const firebaseUser = await firebaseAuth.getUser(pgUser.firebase_uid);
            
            // Check if UIDs match
            if (firebaseUser.uid !== pgUser.firebase_uid) {
              inconsistentStates.push({
                email: pgUser.email,
                pgFirebaseUid: pgUser.firebase_uid,
                actualFirebaseUid: firebaseUser.uid,
              });
            }
          } catch (error: any) {
            if (error.code === 'auth/user-not-found') {
              // PostgreSQL references a Firebase user that doesn't exist
              orphanedPostgreSQL.push({
                email: pgUser.email,
                pgFirebaseUid: pgUser.firebase_uid,
              });
            }
          }
        }
      }

      console.log(`✅ Orphaned account scan complete:`);
      console.log(`   - Orphaned Firebase: ${orphanedFirebase.length}`);
      console.log(`   - Orphaned PostgreSQL: ${orphanedPostgreSQL.length}`);
      console.log(`   - Inconsistent States: ${inconsistentStates.length}`);

      return {
        orphanedFirebase,
        orphanedPostgreSQL,
        inconsistentStates,
      };
    } catch (error) {
      console.error('Error detecting orphaned accounts:', error);
      throw error;
    }
  }

  /**
   * Reconcile orphaned PostgreSQL account
   * Recreates Firebase user for PostgreSQL user that has firebase_uid but Firebase user doesn't exist
   */
  async reconcileOrphanedPostgreSQLAccount(email: string): Promise<boolean> {
    try {
      console.log(`🔧 Reconciling orphaned PostgreSQL account: ${email}`);

      const pgUser = await this.userRepository.findByEmail(email);
      if (!pgUser) {
        throw new Error('User not found in PostgreSQL');
      }

      if (!pgUser.firebase_uid) {
        throw new Error('User does not have firebase_uid');
      }

      // Check if Firebase user exists
      const firebaseAuth = getFirebaseAuth();
      let firebaseUser;
      try {
        firebaseUser = await firebaseAuth.getUser(pgUser.firebase_uid);
        console.log(`✅ Firebase user already exists: ${firebaseUser.uid}`);
        return true;
      } catch (error: any) {
        if (error.code !== 'auth/user-not-found') {
          throw error;
        }
      }

      // Firebase user doesn't exist - clear firebase_uid and let user re-register or use forgot password
      console.log(`📝 Clearing firebase_uid from PostgreSQL user...`);
      await this.userRepository.updateUser(pgUser.id, {
        firebase_uid: null,
        auth_provider: 'local',
        federation_status: 'disabled',
      });

      console.log(`✅ Orphaned PostgreSQL account reconciled: ${email}`);
      console.log(`   User can now use forgot password to migrate to Firebase`);

      return true;
    } catch (error) {
      console.error('Error reconciling orphaned PostgreSQL account:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const registrationValidationService = new RegistrationValidationService();

