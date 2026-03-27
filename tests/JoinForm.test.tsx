import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import JoinForm from '@/components/participant/JoinForm';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('JoinForm', () => {
  beforeEach(() => {
    mockPush.mockClear();
    global.fetch = vi.fn();
  });

  it('renders input, button and title in default mode', () => {
    render(<JoinForm />);
    expect(screen.getByPlaceholderText('AB12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejoindre' })).toBeInTheDocument();
    expect(screen.getByText('VoxRoom')).toBeInTheDocument();
  });

  it('renders only form in compact mode without wrapper card title', () => {
    render(<JoinForm compact />);
    expect(screen.getByPlaceholderText('AB12')).toBeInTheDocument();
    expect(screen.queryByText('VoxRoom')).not.toBeInTheDocument();
  });

  it('shows no error on initial render', () => {
    render(<JoinForm />);
    expect(screen.queryByText(/code fait/i)).not.toBeInTheDocument();
  });

  it('uppercases typed characters in the input', async () => {
    const user = userEvent.setup();
    render(<JoinForm />);
    await user.type(screen.getByPlaceholderText('AB12'), 'ab12');
    expect(screen.getByPlaceholderText('AB12')).toHaveValue('AB12');
  });

  it('shows error and does not call fetch when submitting less than 4 chars', async () => {
    const user = userEvent.setup();
    render(<JoinForm />);
    await user.type(screen.getByPlaceholderText('AB12'), 'AB');
    await user.click(screen.getByRole('button', { name: 'Rejoindre' }));
    expect(screen.getByText('Le code fait 4 caractères.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls fetch with the uppercased code on valid submit', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }));
    render(<JoinForm />);
    await user.type(screen.getByPlaceholderText('AB12'), 'ab12');
    await user.click(screen.getByRole('button', { name: 'Rejoindre' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/sessions/AB12'));
  });

  it('calls router.push with /session/AB12 on 200 response', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }));
    render(<JoinForm />);
    await user.type(screen.getByPlaceholderText('AB12'), 'AB12');
    await user.click(screen.getByRole('button', { name: 'Rejoindre' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/session/AB12'));
  });

  it('shows loading state while fetch is pending', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockReturnValueOnce(new Promise(() => {}));
    render(<JoinForm />);
    await user.type(screen.getByPlaceholderText('AB12'), 'AB12');
    await user.click(screen.getByRole('button', { name: 'Rejoindre' }));
    expect(screen.getByRole('button', { name: 'Vérification…' })).toBeDisabled();
  });

  it('shows error message on 404 response', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response('{}', { status: 404 }));
    render(<JoinForm />);
    await user.type(screen.getByPlaceholderText('AB12'), 'AB12');
    await user.click(screen.getByRole('button', { name: 'Rejoindre' }));
    await waitFor(() =>
      expect(screen.getByText('Session introuvable. Vérifie le code.')).toBeInTheDocument()
    );
  });

  it('shows network error message when fetch throws', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('network'));
    render(<JoinForm />);
    await user.type(screen.getByPlaceholderText('AB12'), 'AB12');
    await user.click(screen.getByRole('button', { name: 'Rejoindre' }));
    await waitFor(() =>
      expect(screen.getByText('Impossible de rejoindre la session.')).toBeInTheDocument()
    );
  });

  it('re-enables button after fetch resolves', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response('{}', { status: 404 }));
    render(<JoinForm />);
    await user.type(screen.getByPlaceholderText('AB12'), 'AB12');
    await user.click(screen.getByRole('button', { name: 'Rejoindre' }));
    await waitFor(() => expect(screen.getByRole('button')).not.toBeDisabled());
  });
});
