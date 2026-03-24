import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUserFindOne = vi.hoisted(() => vi.fn());
const mockSessionFind = vi.hoisted(() => vi.fn());
const mockSessionFindOne = vi.hoisted(() => vi.fn());
const mockSessionCreate = vi.hoisted(() => vi.fn());
const mockAuth = vi.hoisted(() => vi.fn());

// Mock next-auth
vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

// Mock next/server
vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      json: async () => data,
      status: init?.status ?? 200,
    }),
  },
}));

// Mock db connection
vi.mock('@/lib/db', () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/models/User', () => ({
  default: {
    findOne: () => ({ lean: mockUserFindOne }),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('@/models/Session', () => ({
  default: {
    find: () => ({ sort: () => ({ lean: mockSessionFind }) }),
    findOne: () => ({ lean: mockSessionFindOne }),
    create: mockSessionCreate,
  },
}));

import { GET, POST } from '@/app/api/sessions/route';

const mockUser = { _id: 'user-id-123', email: 'trainer@example.com', name: 'Trainer', image: '' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/sessions', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const req = new Request('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when name is missing', async () => {
    mockAuth.mockResolvedValueOnce({
      user: { email: 'trainer@example.com', name: 'Trainer', image: '' },
      expires: '',
    });
    mockUserFindOne.mockResolvedValueOnce(mockUser);

    const req = new Request('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is blank', async () => {
    mockAuth.mockResolvedValueOnce({
      user: { email: 'trainer@example.com', name: 'Trainer', image: '' },
      expires: '',
    });
    mockUserFindOne.mockResolvedValueOnce(mockUser);

    const req = new Request('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ name: '   ' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 201 and a session with 4-char code when creation succeeds', async () => {
    mockAuth.mockResolvedValueOnce({
      user: { email: 'trainer@example.com', name: 'Trainer', image: '' },
      expires: '',
    });
    mockUserFindOne.mockResolvedValueOnce(mockUser);
    mockSessionFindOne.mockResolvedValueOnce(null);
    mockSessionCreate.mockResolvedValueOnce({
      _id: 'session-id',
      code: 'AB12',
      name: 'Formation React',
      ownerId: 'user-id-123',
      status: 'waiting',
      createdAt: new Date(),
      closedAt: null,
      currentQuestionId: null,
    });

    const req = new Request('http://localhost/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ name: 'Formation React' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);

    const data = await res.json();
    expect(data.name).toBe('Formation React');
    expect(data.code).toMatch(/^[A-Z0-9]{4}$/);
  });
});

describe('GET /api/sessions', () => {
  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns sessions list for authenticated user', async () => {
    mockAuth.mockResolvedValueOnce({
      user: { email: 'trainer@example.com', name: 'Trainer', image: '' },
      expires: '',
    });
    mockUserFindOne.mockResolvedValueOnce(mockUser);
    mockSessionFind.mockResolvedValueOnce([
      { _id: 's1', code: 'AB12', name: 'Session 1', ownerId: 'user-id-123' },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].code).toBe('AB12');
  });
});
