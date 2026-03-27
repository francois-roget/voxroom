import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import LandingQR from '@/components/landing/LandingQR';

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => (
    <svg data-testid="qr-code" data-value={value} role="img" />
  ),
}));

describe('LandingQR', () => {
  it('renders a QR code element after mount', async () => {
    render(<LandingQR />);
    await waitFor(() =>
      expect(screen.getByTestId('qr-code')).toBeInTheDocument()
    );
  });

  it('QR value is window.location.origin + /join', async () => {
    render(<LandingQR />);
    await waitFor(() => {
      const qr = screen.getByTestId('qr-code');
      expect(qr.getAttribute('data-value')).toBe(`${window.location.origin}/join`);
    });
  });
});
