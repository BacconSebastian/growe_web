/**
 * community.ts — API de la sección community del panel web.
 * Consume los endpoints /api/community/* del backend.
 */

import { httpFetch } from "./http";
import type { FriendProfileData } from "./types";

/**
 * Obtiene el perfil completo de un amigo/alumno.
 * GET /community/friends/:friendId/profile
 */
export async function getFriendProfile(friendId: number): Promise<FriendProfileData> {
  return httpFetch<FriendProfileData>(`/community/friends/${friendId}/profile`);
}
