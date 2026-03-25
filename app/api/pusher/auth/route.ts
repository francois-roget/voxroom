import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { pusher } from '@/lib/pusher';
import { connectDB } from '@/lib/db';
import Session from '@/models/Session';
import User from '@/models/User';

export async function POST(request: Request) {
  const authSession = await auth();
  if (!authSession?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.text();
  const params = new URLSearchParams(body);
  const socketId = params.get('socket_id');
  const channel = params.get('channel_name');

  if (!socketId || !channel) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  const match = channel.match(/^private-control-(.+)$/);
  if (!match) {
    return NextResponse.json({ error: 'Invalid channel' }, { status: 403 });
  }

  const code = match[1];

  try {
    await connectDB();
    const dbUser = await User.findOne({ email: authSession.user.email }).lean() as { _id: unknown } | null;
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const voxSession = await Session.findOne({ code: code.toUpperCase() }).lean() as { ownerId: unknown } | null;
    if (!voxSession) return NextResponse.json({ error: 'Session not found' }, { status: 403 });

    if (String(voxSession.ownerId) !== String(dbUser._id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const authResponse = pusher.authorizeChannel(socketId, channel);
    return NextResponse.json(authResponse);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
