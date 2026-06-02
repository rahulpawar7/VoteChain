import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { generateToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    await connectDB();

    const body = await request.json();
    const { username, email, password, role, walletAddress } = body;

    // ── Validate required fields ──────────────────────────────────────
    if (!username || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'All fields are required: username, email, password, role' },
        { status: 400 }
      );
    }

    // ── Validate email format ─────────────────────────────────────────
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // ── Validate password length ──────────────────────────────────────
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // ── Validate role ─────────────────────────────────────────────────
    if (!['admin', 'voter'].includes(role)) {
      return NextResponse.json(
        { success: false, error: "Role must be either 'admin' or 'voter'" },
        { status: 400 }
      );
    }

    // ── Check for existing user ───────────────────────────────────────
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }],
    });

    if (existingUser) {
      const field = existingUser.email === email.toLowerCase() ? 'email' : 'username';
      return NextResponse.json(
        { success: false, error: `A user with this ${field} already exists` },
        { status: 409 }
      );
    }

    // ── Generate a wallet for every user ──────────────────────────────
    const wallet = ethers.Wallet.createRandom();
    const generatedWalletAddress = wallet.address;
    const generatedWalletPrivateKey = wallet.privateKey;

    // ── Create the user ───────────────────────────────────────────────
    const user = await User.create({
      username,
      email,
      password,
      role,
      walletAddress: walletAddress || generatedWalletAddress,
      walletPrivateKey: generatedWalletPrivateKey,
    });

    // ── Generate JWT ──────────────────────────────────────────────────
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          walletAddress: user.walletAddress,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Registration error:', error);

    // Handle Mongoose duplicate key error
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: number }).code === 11000
    ) {
      return NextResponse.json(
        { success: false, error: 'A user with this email or username already exists' },
        { status: 409 }
      );
    }

    // Handle Mongoose validation error
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
