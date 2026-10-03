import { useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { setClanRole } from "../../lib/guildState";
import { PanelBoundary } from "./Pieces";

/* ═══════════════════════════════════════════════════════════════
   Mounted once at the app root. Publishes "are you in a guild, and
   do you own it" into the client store so badge logic anywhere in
   the app can be guild-aware without each page opening its own
   live subscription — and without a cold backend breaking a page.
   ═══════════════════════════════════════════════════════════════ */

function Bridge() {
  const profile = useQuery(api.profiles.me);
  const clan = useQuery(api.clans.mine);

  useEffect(() => {
    if (profile === undefined || clan === undefined) return;
    // myRole is owner/officer/member on the ClanView; "none" when clanless.
    setClanRole(!clan ? "none" : clan.myRole);
  }, [profile, clan]);

  return null;
}

export default function ProfileBridge() {
  return (
    <PanelBoundary fallback={null}>
      <Bridge />
    </PanelBoundary>
  );
}
