import { createId } from '@paralleldrive/cuid2';
import { eq, and, gt } from 'drizzle-orm';
import { db } from './db';
import { Users, Sessions } from '../../../drizzle/schema';
import { LoginCredentials, RegisterCredentials, AuthResponse, User, Session } from '~/types/auth';
import bcrypt from 'bcryptjs';
import { createToken } from './jwt';

const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export const authService = {
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const existingUser = await db
      .select()
      .from(Users)
      .where(eq(Users.email, credentials.email))
      .get();

    if (existingUser) {
      throw new Error('Email already registered');
    }

    const passwordHash = await bcrypt.hash(credentials.password, 10);
    const userId = createId();

    await db.insert(Users).values({
      id: userId,
      username: credentials.username,
      email: credentials.email,
      passwordHash,
      createdAt: Date.now(),
      isActive: true,
    });

    const session = await this.createSession(userId);
    const user = await this.getUserById(userId);

    return { user, session };
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const user = await db
      .select()
      .from(Users)
      .where(eq(Users.email, credentials.email))
      .get();

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await db
      .update(Users)
      .set({ lastLogin: Date.now() })
      .where(eq(Users.id, user.id));

    const session = await this.createSession(user.id);
    return { user, session };
  },

  async createSession(userId: string): Promise<Session> {
    const token = await createToken({ userId });
    const sessionId = createId();
    const now = Date.now();

    await db.insert(Sessions).values({
      id: sessionId,
      userId,
      token,
      expiresAt: now + SESSION_EXPIRY,
      createdAt: now,
      lastActivity: now,
    });

    return {
      id: sessionId,
      userId,
      token,
      expiresAt: now + SESSION_EXPIRY,
      createdAt: now,
      lastActivity: now,
    };
  },

  async validateSession(token: string): Promise<Session | null> {
    const now = Date.now();
    const session = await db
      .select()
      .from(Sessions)
      .where(
        and(
          eq(Sessions.token, token),
          gt(Sessions.expiresAt, now)
        )
      )
      .get();

    if (!session) {
      return null;
    }

    // Update last activity
    await db
      .update(Sessions)
      .set({ lastActivity: now })
      .where(eq(Sessions.id, session.id));

    return session;
  },

  async getUserById(id: string): Promise<User> {
    const user = await db
      .select()
      .from(Users)
      .where(eq(Users.id, id))
      .get();

    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      isActive: user.isActive === 1,
    };
  },

  async logout(token: string): Promise<void> {
    await db
      .delete(Sessions)
      .where(eq(Sessions.token, token));
  },

  async cleanupExpiredSessions(): Promise<void> {
    const now = Date.now();
    await db
      .delete(Sessions)
      .where(gt(Sessions.expiresAt, now));
  },
}; 