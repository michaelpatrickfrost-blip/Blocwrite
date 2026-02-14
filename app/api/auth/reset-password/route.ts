import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/reset-password
 * Validates the reset token and updates the user's password.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      email?: string;
      password?: string;
    };

    const { token, password } = body;
    const email = body.email?.toLowerCase().trim();

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: "Token, email, and new password are required." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    // Look up the token
    const record = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token,
      },
    });

    if (!record) {
      return NextResponse.json(
        { error: "Invalid or expired reset link. Please request a new one." },
        { status: 400 },
      );
    }

    // Check expiry
    if (new Date() > record.expires) {
      // Clean up expired token
      await prisma.verificationToken.deleteMany({
        where: { identifier: email, token },
      });
      return NextResponse.json(
        { error: "This reset link has expired. Please request a new one." },
        { status: 400 },
      );
    }

    // Update user's password
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Delete all reset tokens for this email (single use)
    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    console.log(`[Password Reset] Password updated for ${email}`);

    return NextResponse.json({
      ok: true,
      message: "Password has been reset. You can now sign in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
