const PARTICIPANT_KEY = 'voxroom_participant_id';

export function getOrCreateParticipantId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(PARTICIPANT_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PARTICIPANT_KEY, id);
  }
  return id;
}

export function hasAnswered(questionId: string): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(`voxroom_answered_${questionId}`) === '1';
}

export function markAnswered(questionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`voxroom_answered_${questionId}`, '1');
}

export function getParticipantName(sessionCode: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`voxroom_name_${sessionCode}`);
}

export function setParticipantName(sessionCode: string, name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`voxroom_name_${sessionCode}`, name);
}

export function clearAnswered(questionId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`voxroom_answered_${questionId}`);
}
