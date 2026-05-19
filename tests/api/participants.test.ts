import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POKER_COLORS } from '@/lib/poker';

const mockSessionFindOne = vi.hoisted(() => vi.fn());
const mockParticipantFindOne = vi.hoisted(() => vi.fn());
const mockParticipantCountDocuments = vi.hoisted(() => vi.fn());
const mockParticipantCreate = vi.hoisted(() => vi.fn());
const mockParticipantFind = vi.hoisted(() => vi.fn());
const mockResponseFind = vi.hoisted(() => vi.fn());
const mockPusherTrigger = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status ?? 200,
    }),
  },
}));

vi.mock('@/lib/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/pusher', () => ({
  pusher: { trigger: mockPusherTrigger },
}));

vi.mock('@/models/Session', () => ({
  default: {
    findOne: () => ({ lean: mockSessionFindOne }),
  },
}));

vi.mock('@/models/Participant', () => ({
  default: {
    findOne: () => ({ lean: mockParticipantFindOne }),
    countDocuments: mockParticipantCountDocuments,
    create: mockParticipantCreate,
    find: () => ({ lean: mockParticipantFind }),
  },
}));

vi.mock('@/models/Response', () => ({
  default: {
    find: () => ({ lean: mockResponseFind }),
  },
}));

vi.mock('@/models/Question', () => ({
  default: {
    findOne: () => ({ lean: vi.fn().mockResolvedValue(null) }),
  },
}));

import { POST } from '@/app/api/participants/route';

const pokerSession = {
  _id: 'session-id',
  code: 'POKE',
  kind: 'poker',
  currentQuestionId: null,
};

const validBody = {
  sessionCode: 'POKE',
  participantId: 'uuid-1111',
  name: 'Alice',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockParticipantFind.mockResolvedValue([]);
  mockResponseFind.mockResolvedValue([]);
});

describe('POST /api/participants', () => {
  it('returns 400 when name is missing', async () => {
    const req = new Request('http://localhost/api/participants', {
      method: 'POST',
      body: JSON.stringify({ sessionCode: 'POKE', participantId: 'uuid-1' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is blank', async () => {
    const req = new Request('http://localhost/api/participants', {
      method: 'POST',
      body: JSON.stringify({ sessionCode: 'POKE', participantId: 'uuid-1', name: '   ' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-poker session', async () => {
    mockSessionFindOne.mockResolvedValueOnce({ _id: 'sid', code: 'POLL', kind: 'poll' });
    const req = new Request('http://localhost/api/participants', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('returns 404 when session not found', async () => {
    mockSessionFindOne.mockResolvedValueOnce(null);
    const req = new Request('http://localhost/api/participants', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('first join returns 201 with first color', async () => {
    mockSessionFindOne.mockResolvedValueOnce(pokerSession);
    mockParticipantFindOne.mockResolvedValueOnce(null);
    mockParticipantCountDocuments.mockResolvedValueOnce(0);
    mockParticipantCreate.mockResolvedValueOnce({
      participantId: 'uuid-1111',
      name: 'Alice',
      color: POKER_COLORS[0],
    });
    mockParticipantFind.mockResolvedValueOnce([
      { participantId: 'uuid-1111', name: 'Alice', color: POKER_COLORS[0] },
    ]);

    const req = new Request('http://localhost/api/participants', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json() as { color: string };
    expect(data.color).toBe(POKER_COLORS[0]);
  });

  it('second join gets second color', async () => {
    mockSessionFindOne.mockResolvedValueOnce(pokerSession);
    mockParticipantFindOne.mockResolvedValueOnce(null);
    mockParticipantCountDocuments.mockResolvedValueOnce(1);
    mockParticipantCreate.mockResolvedValueOnce({
      participantId: 'uuid-2222',
      name: 'Bob',
      color: POKER_COLORS[1],
    });
    mockParticipantFind.mockResolvedValueOnce([
      { participantId: 'uuid-2222', name: 'Bob', color: POKER_COLORS[1] },
    ]);

    const req = new Request('http://localhost/api/participants', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, participantId: 'uuid-2222', name: 'Bob' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json() as { color: string };
    expect(data.color).toBe(POKER_COLORS[1]);
  });

  it('re-join same UUID returns 200 with original data (idempotent)', async () => {
    mockSessionFindOne.mockResolvedValueOnce(pokerSession);
    mockParticipantFindOne.mockResolvedValueOnce({
      participantId: 'uuid-1111',
      name: 'Alice',
      color: POKER_COLORS[0],
    });

    const req = new Request('http://localhost/api/participants', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json() as { name: string; color: string };
    expect(data.name).toBe('Alice');
    expect(data.color).toBe(POKER_COLORS[0]);
  });

  it('triggers participant:joined on session channel without value field', async () => {
    mockSessionFindOne.mockResolvedValueOnce(pokerSession);
    mockParticipantFindOne.mockResolvedValueOnce(null);
    mockParticipantCountDocuments.mockResolvedValueOnce(0);
    mockParticipantCreate.mockResolvedValueOnce({
      participantId: 'uuid-1111',
      name: 'Alice',
      color: POKER_COLORS[0],
    });
    mockParticipantFind.mockResolvedValueOnce([
      { participantId: 'uuid-1111', name: 'Alice', color: POKER_COLORS[0] },
    ]);

    const req = new Request('http://localhost/api/participants', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    await POST(req);

    const calls = mockPusherTrigger.mock.calls as Array<[string, string, Record<string, unknown>]>;
    const sessionChannelCall = calls.find(([channel]) => channel === `session-${pokerSession.code}`);
    expect(sessionChannelCall).toBeDefined();
    expect(sessionChannelCall![1]).toBe('participant:joined');
    // No value field in participant:joined payload
    expect('value' in sessionChannelCall![2]).toBe(false);
  });
});
