import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuestionFindById = vi.hoisted(() => vi.fn());
const mockResponseFindOne = vi.hoisted(() => vi.fn());
const mockResponseCreate = vi.hoisted(() => vi.fn());
const mockResponseCountDocuments = vi.hoisted(() => vi.fn());
const mockSessionFindById = vi.hoisted(() => vi.fn());
const mockParticipantFindOne = vi.hoisted(() => vi.fn());
const mockParticipantCountDocuments = vi.hoisted(() => vi.fn());
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

vi.mock('@/models/Question', () => ({
  default: {
    findById: () => ({ lean: mockQuestionFindById }),
  },
}));

vi.mock('@/models/Response', () => ({
  default: {
    findOne: () => ({ lean: mockResponseFindOne }),
    create: mockResponseCreate,
    countDocuments: mockResponseCountDocuments,
    find: () => ({ lean: vi.fn().mockResolvedValue([]) }),
  },
}));

vi.mock('@/models/Session', () => ({
  default: {
    findById: () => ({ lean: mockSessionFindById }),
  },
}));

vi.mock('@/models/Participant', () => ({
  default: {
    findOne: () => ({ lean: mockParticipantFindOne }),
    countDocuments: mockParticipantCountDocuments,
  },
}));

import { POST } from '@/app/api/responses/route';

const pokerQuestion = {
  _id: 'q-id',
  status: 'open',
  type: 'poker',
  sessionId: 's-id',
};

const pokerSession = { _id: 's-id', code: 'POKE', kind: 'poker' };
const participant = { name: 'Alice' };

const validPokerBody = {
  questionId: 'q-id',
  sessionId: 's-id',
  participantId: 'uuid-1111',
  value: '5',
  participantName: 'Alice',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/responses — poker', () => {
  it('returns 400 for invalid poker value', async () => {
    mockQuestionFindById.mockResolvedValueOnce(pokerQuestion);
    mockSessionFindById.mockResolvedValueOnce(pokerSession);

    const req = new Request('http://localhost/api/responses', {
      method: 'POST',
      body: JSON.stringify({ ...validPokerBody, value: '42' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty value', async () => {
    mockQuestionFindById.mockResolvedValueOnce(pokerQuestion);
    mockSessionFindById.mockResolvedValueOnce(pokerSession);

    // Empty value is rejected before hitting poker logic by the shared validator
    const req = new Request('http://localhost/api/responses', {
      method: 'POST',
      body: JSON.stringify({ ...validPokerBody, value: '' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 403 when participant has not joined', async () => {
    mockQuestionFindById.mockResolvedValueOnce(pokerQuestion);
    mockSessionFindById.mockResolvedValueOnce(pokerSession);
    mockParticipantFindOne.mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/responses', {
      method: 'POST',
      body: JSON.stringify(validPokerBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json() as { error: string };
    expect(data.error).toBe('Must join before voting');
  });

  it('returns 201 for valid vote', async () => {
    mockQuestionFindById.mockResolvedValueOnce(pokerQuestion);
    mockSessionFindById.mockResolvedValueOnce(pokerSession);
    mockParticipantFindOne.mockResolvedValueOnce(participant);
    mockResponseFindOne.mockResolvedValueOnce(null);
    mockResponseCreate.mockResolvedValueOnce({ _id: 'r-id' });
    mockResponseCountDocuments.mockResolvedValueOnce(1);
    mockParticipantCountDocuments.mockResolvedValueOnce(3);

    const req = new Request('http://localhost/api/responses', {
      method: 'POST',
      body: JSON.stringify(validPokerBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it('returns 409 for duplicate vote', async () => {
    mockQuestionFindById.mockResolvedValueOnce(pokerQuestion);
    mockSessionFindById.mockResolvedValueOnce(pokerSession);
    mockParticipantFindOne.mockResolvedValueOnce(participant);
    mockResponseFindOne.mockResolvedValueOnce({ _id: 'existing' });

    const req = new Request('http://localhost/api/responses', {
      method: 'POST',
      body: JSON.stringify(validPokerBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const data = await res.json() as { error: string };
    expect(data.error).toBe('Already voted');
  });

  it('CRITICAL: vote:cast payload contains no value field', async () => {
    mockQuestionFindById.mockResolvedValueOnce(pokerQuestion);
    mockSessionFindById.mockResolvedValueOnce(pokerSession);
    mockParticipantFindOne.mockResolvedValueOnce(participant);
    mockResponseFindOne.mockResolvedValueOnce(null);
    mockResponseCreate.mockResolvedValueOnce({ _id: 'r-id' });
    mockResponseCountDocuments.mockResolvedValueOnce(1);
    mockParticipantCountDocuments.mockResolvedValueOnce(3);

    const req = new Request('http://localhost/api/responses', {
      method: 'POST',
      body: JSON.stringify(validPokerBody),
    });
    await POST(req);

    const calls = mockPusherTrigger.mock.calls as Array<[string, string, Record<string, unknown>]>;
    const voteCastCalls = calls.filter(([, event]) => event === 'vote:cast');

    expect(voteCastCalls.length).toBeGreaterThan(0);
    for (const [, , payload] of voteCastCalls) {
      expect('value' in payload).toBe(false);
      expect(payload.participantId).toBe('uuid-1111');
      expect(payload.hasVoted).toBe(true);
      expect(typeof payload.votedCount).toBe('number');
      expect(typeof payload.totalCount).toBe('number');
    }
  });

  it('emits vote:cast on both session and private-control channels', async () => {
    mockQuestionFindById.mockResolvedValueOnce(pokerQuestion);
    mockSessionFindById.mockResolvedValueOnce(pokerSession);
    mockParticipantFindOne.mockResolvedValueOnce(participant);
    mockResponseFindOne.mockResolvedValueOnce(null);
    mockResponseCreate.mockResolvedValueOnce({ _id: 'r-id' });
    mockResponseCountDocuments.mockResolvedValueOnce(1);
    mockParticipantCountDocuments.mockResolvedValueOnce(3);

    const req = new Request('http://localhost/api/responses', {
      method: 'POST',
      body: JSON.stringify(validPokerBody),
    });
    await POST(req);

    const calls = mockPusherTrigger.mock.calls as Array<[string, string, Record<string, unknown>]>;
    const channels = calls.filter(([, event]) => event === 'vote:cast').map(([ch]) => ch);
    expect(channels).toContain(`session-${pokerSession.code}`);
    expect(channels).toContain(`private-control-${pokerSession.code}`);
  });
});
