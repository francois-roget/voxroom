'use server';

import { signIn, signOut } from '@/auth';
import { routing } from '@/i18n/routing';

function localizedPath(path: string, locale: string): string {
  if (locale && locale !== routing.defaultLocale) {
    return `/${locale}${path}`;
  }
  return path;
}

export async function signInAction(formData: FormData) {
  const locale = formData.get('locale') as string;
  await signIn('google', { redirectTo: localizedPath('/dashboard', locale) });
}

export async function signOutAction(formData: FormData) {
  const locale = formData.get('locale') as string;
  await signOut({ redirectTo: localizedPath('/', locale) });
}
