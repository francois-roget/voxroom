import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuestionFindById = vi.hoisted(() => vi.fn());
const mockQuestionFindByIdAndUpdate = vi.hoisted(() => vi.fn());
const mockSessionFindById = vi.hoisted(() => vi.fn());
const mockUserFindOne = vi.hoisted(() => vi.fn());
const mockResponseDeleteMany = vi.hoisted(() => vi.fn());
const mockParticipantCountDocuments = vi.hoisted(() => vi.fn());
const mockPusherTrigger = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockAuth = vi.hoisted(() => vi.fn());

vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

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

const mockSessionSave = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/models/Question', () => ({
  default: {
    findById: () => ({ lean: mockQuestionFindById }),
    findByIdAndUpdate: mockQuestionFindByIdAndUpdate,
  },
}));

vi.mock('@/models/Response', () => ({
  default: {
    deleteMany: mockResponseDeleteMany,
  },
}));

const mockSessionFindByIdAndUpdate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock('@/models/Session', () => ({
  default: {
    findById: mockSessionFindById,
    findByIdAndUpdate: mockSessionFindByIdAndUpdate,
  },
}));

vi.mock('@/models/User', () => ({
  default: {
    findOne: () => ({ lean: mockUserFindOne }),
  },
}));

vi.mock('@/models/Participant', () => ({
  default: {
    countDocuments: mockParticipantCountDocuments,
  },
}));

import { POST } from '@/app/api/questions/[id]/reset/route';

const owner = { _id: 'owner-id' };
const pokerSession = {
  _id: 's-id',
  ownerId: 'owner-id',
  code: 'POKE',
  kind: 'poker',
  currentQuestionId: null,
  save: mockSessionSave,
};
const revealedQuestion = {
  _id: 'q-id',
  sessionId: 's-id',
  status: 'revealed',
  type: 'poker',
};
const openQuestion = {
  _id: 'q-id',
  sessionId: 's-id',
  status: 'open',
  type: 'poker',
};

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSessionSave.mockResolvedValue(undefined);
});

describe('POST /api/questions/[id]/reset', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = new Request('http://localhost/api/questions/q-id/reset', { method: 'POST' });
    const res = await POST(req, makeParams('q-id'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when non-owner tries to reset', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email: 'other@test.com' }, expires: '' });
    mockQuestionFindById.mockResolvedValueOnce(revealedQuestion);
    mockSessionFindById.mockReturnValueOnce({
      ...pokerSession,
      ownerId: 'owner-id',
      save: mockSessionSave,
    });
    mockUserFindOne.mockResolvedValueOnce({ _id: 'other-user-id' });

    const req = new Request('http://localhost/api/questions/q-id/reset', { method: 'POST' });
    const res = await POST(req, makeParams('q-id'));
    expect(res.status).toBe(403);
  });

  it('returns 400 when question status is open', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email: 'owner@test.com' }, expires: '' });
    mockQuestionFindById.mockResolvedValueOnce(openQuestion);
    mockSessionFindById.mockReturnValueOnce({ ...pokerSession, save: mockSessionSave });
    mockUserFindOne.mockResolvedValueOnce(owner);

    const req = new Request('http://localhost/api/questions/q-id/reset', { method: 'POST' });
    const res = await POST(req, makeParams('q-id'));
    expect(res.status).toBe(400);
  });

  it('returns 200, deletes responses, sets status open, emits story:reset and vote:cast', async () => {
    mockAuth.mockResolvedValueOnce({ user: { email: 'owner@test.com' }, expires: '' });
    mockQuestionFindById.mockResolvedValueOnce(revealedQuestion);
    mockSessionFindById.mockReturnValueOnce({ ...pokerSession, save: mockSessionSave });
    mockUserFindOne.mockResolvedValueOnce(owner);
    mockResponseDeleteMany.mockResolvedValueOnce({ deletedCount: 2 });
    mockQuestionFindByIdAndUpdate.mockReturnValueOnce({
      lean: vi.fn().mockResolvedValueOnce({ ...revealedQuestion, status: 'open' }),
    });
    mockParticipantCountDocuments.mockResolvedValueOnce(4);

    const req = new Request('http://localhost/api/questions/q-id/reset', { method: 'POST' });
    const res = await POST(req, makeParams('q-id'));
    expect(res.status).toBe(200);

    expect(mockResponseDeleteMany).toHaveBeenCalledWith({ questionId: 'q-id' });

    const calls = mockPusherTrigger.mock.calls as Array<[string, string, Record<string, unknown>]>;
    const storyResetCall = calls.find(([, event]) => event === 'story:reset');
    expect(storyResetCall).toBeDefined();
    expect(storyResetCall![2].storyId).toBe('q-id');

    const voteCastCalls = calls.filter(([, event]) => event === 'vote:cast');
    expect(voteCastCalls.length).toBeGreaterThan(0);
    for (const [, , payload] of voteCastCalls) {
      expect(payload.votedCount).toBe(0);
      expect(payload.totalCount).toBe(4);
    }
  });
});
