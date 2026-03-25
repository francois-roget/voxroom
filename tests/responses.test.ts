import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuestionFindById = vi.hoisted(() => vi.fn());
const mockResponseFindOne = vi.hoisted(() => vi.fn());
const mockResponseFind = vi.hoisted(() => vi.fn());
const mockResponseCreate = vi.hoisted(() => vi.fn());
const mockSessionFindById = vi.hoisted(() => vi.fn());

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

vi.mock('@/models/Question', () => ({
  default: {
    findById: () => ({ lean: mockQuestionFindById }),
  },
}));

vi.mock('@/models/Response', () => ({
  default: {
    findOne: () => ({ lean: mockResponseFindOne }),
    find: () => ({ lean: mockResponseFind }),
    create: mockResponseCreate,
  },
}));

vi.mock('@/models/Session', () => ({
  default: {
    findById: () => ({ lean: mockSessionFindById }),
  },
}));

vi.mock('@/lib/pusher', () => ({
  pusher: { trigger: vi.fn().mockResolvedValue({}) },
}));

import { POST } from '@/app/api/responses/route';

const validBody = {
  questionId: 'q-id',
  sessionId: 's-id',
  participantId: 'participant-uuid',
  value: 'React',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/responses', () => {
  it('returns 400 when body is missing required fields', async () => {
    const req = new Request('http://localhost/api/responses', {
      method: 'POST',
      body: JSON.stringify({ questionId: 'q-id' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when question does not exist', async () => {
    mockQuestionFindById.mockResolvedValueOnce(null);
    const req = new Request('http://localhost/api/responses', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it('returns 403 when question is not open', async () => {
    mockQuestionFindById.mockResolvedValueOnce({ status: 'pending' });
    const req = new Request('http://localhost/api/responses', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 409 when participant already answered', async () => {
    mockQuestionFindById.mockResolvedValueOnce({ status: 'open' });
    mockResponseFindOne.mockResolvedValueOnce({ _id: 'existing' });
    const req = new Request('http://localhost/api/responses', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
  });

  it('returns 201 on successful submission', async () => {
    mockQuestionFindById.mockResolvedValueOnce({ status: 'open' });
    mockResponseFindOne.mockResolvedValueOnce(null);
    mockResponseCreate.mockResolvedValueOnce({ _id: 'r-id', ...validBody });
    mockSessionFindById.mockResolvedValueOnce({ code: 'ABCD' });
    mockResponseFind.mockResolvedValueOnce([{ value: 'React' }]);
    const req = new Request('http://localhost/api/responses', {
      method: 'POST',
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.value).toBe('React');
  });
});
