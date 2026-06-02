import jwt, { JwtPayload } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'admin' | 'voter';
}

/**
 * Generate a JWT token for the given payload.
 * Token expires in 24 hours.
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Verify a JWT token and return the decoded payload.
 * Throws if the token is invalid or expired.
 */
export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & TokenPayload;
  return {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
  };
}

/**
 * Extract the Bearer token from an Authorization header.
 * Returns null if the header is missing or malformed.
 */
export function getTokenFromHeaders(headers: Headers): string | null {
  const authHeader = headers.get('Authorization');
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Full authentication middleware.
 * Extracts the JWT from the request, verifies it, and returns the decoded user payload.
 * Throws an error with a message if authentication fails.
 */
export function authenticateRequest(request: Request): TokenPayload {
  const token = getTokenFromHeaders(request.headers);
  if (!token) {
    throw new AuthError('Authentication required. No token provided.', 401);
  }

  try {
    return verifyToken(token);
  } catch {
    throw new AuthError('Invalid or expired token.', 401);
  }
}

/**
 * Role-based access control middleware.
 * Authenticates the request and checks that the user has the required role.
 * Throws 403 if role doesn't match.
 */
export function requireRole(request: Request, role: string): TokenPayload {
  const user = authenticateRequest(request);

  if (user.role !== role) {
    throw new AuthError(
      `Access denied. Required role: ${role}, your role: ${user.role}`,
      403
    );
  }

  return user;
}

/**
 * Custom authentication error with HTTP status code.
 */
export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}
