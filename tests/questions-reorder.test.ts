import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = vi.hoisted(() => vi.fn());
const mockUserFindOne = vi.hoisted(() => vi.fn());
const mockSessionFindById = vi.hoisted(() => vi.fn());
const mockQuestionFind = vi.hoisted(() => vi.fn());
const mockQuestionBulkWrite = vi.hoisted(() => vi.fn());

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

vi.mock('@/models/User', () => ({
  default: {
    findOne: () => ({ lean: mockUserFindOne }),
  },
}));

vi.mock('@/models/Session', () => ({
  default: {
    findById: () => ({ lean: mockSessionFindById }),
  },
}));

vi.mock('@/models/Question', () => ({
  default: {
    find: () => ({
      lean: mockQuestionFind,
      sort: () => ({ lean: mockQuestionFind }),
    }),
    bulkWrite: mockQuestionBulkWrite,
  },
}));

import { POST } from '@/app/api/questions/reorder/route';

const mockUser = { _id: 'user-id-123', email: 'trainer@example.com' };
const mockSession = { _id: 'session-id', ownerId: 'user-id-123' };
const mockQuestions = [
  { _id: 'q1', sessionId: 'session-id', order: 0 },
  { _id: 'q2', sessionId: 'session-id', order: 1 },
  { _id: 'q3', sessionId: 'session-id', order: 2 },
];

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/questions/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockAuthenticated() {
  mockAuth.mockResolvedValueOnce({
    user: { email: 'trainer@example.com', name: 'Trainer', image: '' },
    expires: '',
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/questions/reorder', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ sessionId: 'session-id', orderedIds: ['q1'] }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when sessionId is missing', async () => {
    mockAuthenticated();
    mockUserFindOne.mockResolvedValueOnce(mockUser);

    const res = await POST(makeRequest({ orderedIds: ['q1'] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when orderedIds is not an array', async () => {
    mockAuthenticated();
    mockUserFindOne.mockResolvedValueOnce(mockUser);

    const res = await POST(makeRequest({ sessionId: 'session-id', orderedIds: 'invalid' }));
    expect(res.status).toBe(400);
  });

  it('returns 403 when user does not own the session', async () => {
    mockAuthenticated();
    mockUserFindOne.mockResolvedValueOnce(mockUser);
    mockSessionFindById.mockResolvedValueOnce({ _id: 'session-id', ownerId: 'other-user' });

    const res = await POST(makeRequest({ sessionId: 'session-id', orderedIds: ['q1', 'q2', 'q3'] }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when orderedIds length does not match question count', async () => {
    mockAuthenticated();
    mockUserFindOne.mockResolvedValueOnce(mockUser);
    mockSessionFindById.mockResolvedValueOnce(mockSession);
    mockQuestionFind.mockResolvedValueOnce(mockQuestions);

    const res = await POST(makeRequest({ sessionId: 'session-id', orderedIds: ['q1', 'q2'] }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when orderedIds contains unknown IDs', async () => {
    mockAuthenticated();
    mockUserFindOne.mockResolvedValueOnce(mockUser);
    mockSessionFindById.mockResolvedValueOnce(mockSession);
    mockQuestionFind.mockResolvedValueOnce(mockQuestions);

    const res = await POST(makeRequest({ sessionId: 'session-id', orderedIds: ['q1', 'q2', 'unknown'] }));
    expect(res.status).toBe(400);
  });

  it('returns 200 and updates order via bulkWrite', async () => {
    mockAuthenticated();
    mockUserFindOne.mockResolvedValueOnce(mockUser);
    mockSessionFindById.mockResolvedValueOnce(mockSession);
    // First call: find existing questions for validation
    mockQuestionFind.mockResolvedValueOnce(mockQuestions);
    mockQuestionBulkWrite.mockResolvedValueOnce({});
    // Second call: find sorted questions for response
    const reorderedQuestions = [
      { _id: 'q3', sessionId: 'session-id', order: 0 },
      { _id: 'q1', sessionId: 'session-id', order: 1 },
      { _id: 'q2', sessionId: 'session-id', order: 2 },
    ];
    mockQuestionFind.mockResolvedValueOnce(reorderedQuestions);

    const res = await POST(makeRequest({ sessionId: 'session-id', orderedIds: ['q3', 'q1', 'q2'] }));
    expect(res.status).toBe(200);

    expect(mockQuestionBulkWrite).toHaveBeenCalledWith([
      { updateOne: { filter: { _id: 'q3' }, update: { $set: { order: 0 } } } },
      { updateOne: { filter: { _id: 'q1' }, update: { $set: { order: 1 } } } },
      { updateOne: { filter: { _id: 'q2' }, update: { $set: { order: 2 } } } },
    ]);

    const data = await res.json();
    expect(data).toHaveLength(3);
    expect(data[0]._id).toBe('q3');
  });
});
