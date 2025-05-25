export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== 'MANAGER') {
      console.log('GET /api/users: Unauthorized, session:', session);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const users = await User.find({ companyId: session.user.companyId })
      .select('name email role')
      .lean();

    const usersPlain = users.map((user) => ({
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    }));

    return NextResponse.json(usersPlain, { status: 200 });
  } catch (error) {
    console.error('GET /api/users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== 'MANAGER') {
      console.log('POST /api/users: Unauthorized, session:', session);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, password, name, role, companyId } = await request.json();
    if (companyId !== session.user.companyId) {
      return NextResponse.json({ error: 'Forbidden: Invalid company' }, { status: 403 });
    }
    if (!['MANAGER', 'EMPLOYEE'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    await connectDB();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    console.log("API: Password hashed:", { password, hashedPassword });
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role,
      companyId,
      isActive: true,
    });

    return NextResponse.json(
      { message: 'User created', userId: user._id.toString() },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/users error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== 'MANAGER') {
      console.log('PUT /api/users: Unauthorized, session:', session);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, email, role, companyId } = await request.json();
    if (companyId !== session.user.companyId) {
      return NextResponse.json({ error: 'Forbidden: Invalid company' }, { status: 403 });
    }
    if (!['MANAGER', 'EMPLOYEE'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (user.companyId.toString() !== companyId) {
      return NextResponse.json({ error: 'Forbidden: User belongs to another company' }, { status: 403 });
    }

    const existingUser = await User.findOne({ email, _id: { $ne: id } });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    user.name = name;
    user.email = email;
    user.role = role;
    await user.save();

    return NextResponse.json({ message: 'User updated' }, { status: 200 });
  } catch (error) {
    console.error('PUT /api/users error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session || !session.user || session.user.role !== 'MANAGER') {
      console.log('DELETE /api/users: Unauthorized, session:', session);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, companyId } = await request.json();
    if (companyId !== session.user.companyId) {
      return NextResponse.json({ error: 'Forbidden: Invalid company' }, { status: 403 });
    }

    await connectDB();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (user.companyId.toString() !== companyId) {
      return NextResponse.json({ error: 'Forbidden: User belongs to another company' }, { status: 403 });
    }

    await User.deleteOne({ _id: id });
    return NextResponse.json({ message: 'User deleted' }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/users error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}