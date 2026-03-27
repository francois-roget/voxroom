const PARTICIPANT_KEY = 'voxroom_participant_id';

export function getOrCreateParticipantId(): string {
  let id = localStorage.getItem(PARTICIPANT_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PARTICIPANT_KEY, id);
  }
  return id;
}

export function hasAnswered(questionId: string): boolean {
  return localStorage.getItem(`voxroom_answered_${questionId}`) === '1';
}

export function markAnswered(questionId: string): void {
  localStorage.setItem(`voxroom_answered_${questionId}`, '1');
}
