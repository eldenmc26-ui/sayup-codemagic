import { Auth, Database, RTDBPaths } from './firebase';

/**
 * Sets the current user's presence to online and handles setting it offline on disconnect.
 * @param uid The user's UID.
 */
export function setUserOnline(uid: string) {
  const userPresenceRef = Database.ref(RTDBPaths.presence(uid));

  // Set user online
  userPresenceRef.set(true);

  // Set user offline when they disconnect
  userPresenceRef.onDisconnect().set(false);
}

/**
 * Subscribes to a user's online/offline presence.
 * @param uid The user's UID.
 * @param callback A function that receives the online status (true for online, false for offline).
 * @returns An unsubscribe function.
 */
export function subscribeToUserPresence(uid: string, callback: (isOnline: boolean) => void) {
  const userPresenceRef = Database.ref(RTDBPaths.presence(uid));

  const listener = userPresenceRef.on(
    'value',
    (snapshot: any) => {
      const isOnline = snapshot.val() === true;
      callback(isOnline);
    },
    (error: any) => {
      console.error('Error subscribing to user presence:', error);
      callback(false); // Assume offline on error
    },
  );

  return () => userPresenceRef.off('value', listener);
}
