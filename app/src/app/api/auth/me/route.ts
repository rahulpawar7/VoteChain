import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { authenticateRequest, AuthError } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const payload = authenticateRequest(request);

    await connectDB();

    const user = await User.findById(payload.userId).select('-password');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          walletAddress: user.walletAddress,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error('Auth me error:', error);

    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
