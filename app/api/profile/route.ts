import { ok, readJson } from '@/lib/api';
import { isHex } from '@/lib/palette';
import { getProfile, updateProfile } from '@/lib/repo';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  return ok({ profile: getProfile() });
}

export async function PATCH(request: Request) {
  const body = await readJson<Record<string, any>>(request);
  const patch: Record<string, any> = {};
  if (typeof body.bandName === 'string') patch.bandName = body.bandName;
  if (typeof body.handle === 'string') patch.handle = body.handle.replace(/^@/, '');
  if (typeof body.bio === 'string') patch.bio = body.bio;
  if (typeof body.website === 'string') patch.website = body.website;
  if (body.followers !== undefined) patch.followers = Number(body.followers) || 0;
  if (body.following !== undefined) patch.following = Number(body.following) || 0;
  if (body.avatarMediaId !== undefined) patch.avatarMediaId = body.avatarMediaId ? Number(body.avatarMediaId) : null;
  if (Array.isArray(body.highlightNames)) patch.highlightNames = body.highlightNames.map(String);
  if (typeof body.accentHex === 'string' && isHex(body.accentHex)) patch.accentHex = body.accentHex.toLowerCase();
  if (body.accent2Hex !== undefined) {
    patch.accent2Hex = typeof body.accent2Hex === 'string' && isHex(body.accent2Hex)
      ? body.accent2Hex.toLowerCase()
      : null;
  }
  if (body.docMediaId !== undefined) patch.docMediaId = body.docMediaId ? Number(body.docMediaId) : null;
  if (body.docMarkStrength !== undefined) {
    const strength = Math.max(0, Math.min(60, Math.round(Number(body.docMarkStrength) || 0)));
    patch.docMarkStrength = strength;
  }

  return ok({ profile: updateProfile(patch) });
}
