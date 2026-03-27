'use client';

import { useEffect, useRef } from 'react';
import { getPusherClient } from '@/lib/pusher-client';

export function usePusherChannel(
  channelName: string,
  events: Record<string, (data: unknown) => void>
): void {
  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  });
  useEffect(() => {
    const client = getPusherClient();
    const channel = client.subscribe(channelName);
    for (const [event] of Object.entries(eventsRef.current)) {
      channel.bind(event, (data: unknown) => eventsRef.current[event]?.(data));
    }
    return () => {
      channel.unbind_all();
      client.unsubscribe(channelName);
    };
  }, [channelName]);
}
