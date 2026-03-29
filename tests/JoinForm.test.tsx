import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import JoinForm from '@/components/participant/JoinForm';
import { IntlWrapper } from './helpers/intl-wrapper';

const mockPush = vi.fn();
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('JoinForm', () => {
  beforeEach(() => {
    mockPush.mockClear();
    global.fetch = vi.fn();
  });

  it('renders input, button and title in default mode', () => {
    render(<JoinForm />, { wrapper: IntlWrapper });
    expect(screen.getByPlaceholderText('AB12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join' })).toBeInTheDocument();
    expect(screen.getByText('VoxRoom')).toBeInTheDocument();
  });

  it('renders only form in compact mode without wrapper card title', () => {
    render(<JoinForm compact />, { wrapper: IntlWrapper });
    expect(screen.getByPlaceholderText('AB12')).toBeInTheDocument();
    expect(screen.queryByText('VoxRoom')).not.toBeInTheDocument();
  });

  it('shows no error on initial render', () => {
    render(<JoinForm />, { wrapper: IntlWrapper });
    expect(screen.queryByText('The code is 4 characters.')).not.toBeInTheDocument();
  });

  it('uppercases typed characters in the input', async () => {
    const user = userEvent.setup();
    render(<JoinForm />, { wrapper: IntlWrapper });
    await user.type(screen.getByPlaceholderText('AB12'), 'ab12');
    expect(screen.getByPlaceholderText('AB12')).toHaveValue('AB12');
  });

  it('shows error and does not call fetch when submitting less than 4 chars', async () => {
    const user = userEvent.setup();
    render(<JoinForm />, { wrapper: IntlWrapper });
    await user.type(screen.getByPlaceholderText('AB12'), 'AB');
    await user.click(screen.getByRole('button', { name: 'Join' }));
    expect(screen.getByText('The code is 4 characters.')).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('calls fetch with the uppercased code on valid submit', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }));
    render(<JoinForm />, { wrapper: IntlWrapper });
    await user.type(screen.getByPlaceholderText('AB12'), 'ab12');
    await user.click(screen.getByRole('button', { name: 'Join' }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/sessions/AB12'));
  });

  it('calls router.push with /session/AB12 on 200 response', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }));
    render(<JoinForm />, { wrapper: IntlWrapper });
    await user.type(screen.getByPlaceholderText('AB12'), 'AB12');
    await user.click(screen.getByRole('button', { name: 'Join' }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/session/AB12'));
  });

  it('shows loading state while fetch is pending', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockReturnValueOnce(new Promise(() => {}));
    render(<JoinForm />, { wrapper: IntlWrapper });
    await user.type(screen.getByPlaceholderText('AB12'), 'AB12');
    await user.click(screen.getByRole('button', { name: 'Join' }));
    expect(screen.getByRole('button', { name: 'Checking...' })).toBeDisabled();
  });

  it('shows error message on 404 response', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response('{}', { status: 404 }));
    render(<JoinForm />, { wrapper: IntlWrapper });
    await user.type(screen.getByPlaceholderText('AB12'), 'AB12');
    await user.click(screen.getByRole('button', { name: 'Join' }));
    await waitFor(() =>
      expect(screen.getByText('Session not found. Check the code.')).toBeInTheDocument()
    );
  });

  it('shows network error message when fetch throws', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('network'));
    render(<JoinForm />, { wrapper: IntlWrapper });
    await user.type(screen.getByPlaceholderText('AB12'), 'AB12');
    await user.click(screen.getByRole('button', { name: 'Join' }));
    await waitFor(() =>
      expect(screen.getByText('Unable to join the session.')).toBeInTheDocument()
    );
  });

  it('re-enables button after fetch resolves', async () => {
    const user = userEvent.setup();
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response('{}', { status: 404 }));
    render(<JoinForm />, { wrapper: IntlWrapper });
    await user.type(screen.getByPlaceholderText('AB12'), 'AB12');
    await user.click(screen.getByRole('button', { name: 'Join' }));
    await waitFor(() => expect(screen.getByRole('button')).not.toBeDisabled());
  });
});
