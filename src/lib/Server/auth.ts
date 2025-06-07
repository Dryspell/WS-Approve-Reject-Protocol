import { createId } from '@paralleldrive/cuid2';
import { LoginCredentials, RegisterCredentials, AuthResponse, User, Session } from '~/types/auth';
import bcrypt from 'bcryptjs';
import { createToken } from './jwt';
import { createSpacetimeDBClient } from '../spacetimedb';

const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

const spacetime = createSpacetimeDBClient({
  host: import.meta.env.VITE_SPACETIME_HOST || "localhost:3000",
  database: import.meta.env.VITE_SPACETIME_DATABASE || "game",
});

export const authService = {
  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const existingUser = await spacetime.query(
      "SELECT * FROM user WHERE email = ?",
      [credentials.email]
    );

    if (existingUser.length > 0) {
      throw new Error('Email already registered');
    }

    const passwordHash = await bcrypt.hash(credentials.password, 10);
    const userId = await spacetime.call("register", [
      credentials.username,
      credentials.email,
      passwordHash
    ]);

    const token = await createToken({ userId });
    const sessionId = await spacetime.call("create_session", [userId, token]);

    const user = await this.getUserById(userId);
    const session = {
      id: sessionId,
      userId,
      token,
      expiresAt: Date.now() + SESSION_EXPIRY,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    return { user, session };
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const users = await spacetime.query(
      "SELECT * FROM user WHERE email = ?",
      [credentials.email]
    );

    const user = users[0];
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    await spacetime.call("update_last_login", [user.id]);

    const token = await createToken({ userId: user.id });
    const sessionId = await spacetime.call("create_session", [user.id, token]);

    const session = {
      id: sessionId,
      userId: user.id,
      token,
      expiresAt: Date.now() + SESSION_EXPIRY,
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    return { user, session };
  },

  async createSession(userId: string): Promise<Session> {
    // TODO: Implement database operations
    throw new Error('Not implemented');
  },

  async validateSession(token: string): Promise<Session | null> {
    const sessions = await spacetime.query(
      "SELECT * FROM session WHERE token = ? AND expires_at > ?",
      [token, Date.now()]
    );

    const session = sessions[0];
    if (!session) {
      return null;
    }

    await spacetime.call("update_session_activity", [session.id]);

    return {
      id: session.id,
      userId: session.user_id,
      token: session.token,
      expiresAt: session.expires_at,
      createdAt: session.created_at,
      lastActivity: session.last_activity,
    };
  },

  async getUserById(id: string): Promise<User> {
    const users = await spacetime.query(
      "SELECT * FROM user WHERE id = ?",
      [id]
    );

    const user = users[0];
    if (!user) {
      throw new Error('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      isActive: user.is_active,
    };
  },

  async logout(token: string): Promise<void> {
    const sessions = await spacetime.query(
      "SELECT * FROM session WHERE token = ?",
      [token]
    );

    const session = sessions[0];
    if (session) {
      await spacetime.call("delete_session", [session.id]);
    }
  },

  async cleanupExpiredSessions(): Promise<void> {
    await spacetime.call("cleanup_expired_sessions", []);
  },
}; 