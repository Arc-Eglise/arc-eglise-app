import { droits } from "@arc/core"
import { ok, handleError } from "../../_lib/response"
import { getUserWithProfile } from "../../_lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const { user, profile } = await getUserWithProfile()

    const p = {
      id:     profile?.id    ?? user.id,
      role:   profile?.role  ?? "visiteur",
      groups: profile?.groups ?? [],
    }

    const droitsCalcules = {
      peutVoirCRM:               droits.peutVoirCRM(p),
      peutVoirAdminPanel:        droits.peutVoirAdminPanel(p),
      peutVoirAnnuaireDetaille:  droits.peutVoirAnnuaireDetaille(p),
      peutVoirPipelinePastoral:  droits.peutVoirPipelinePastoral(p),
      peutEcrireNotesPastorales: droits.peutEcrireNotesPastorales(p),
      peutGererContenuSite:      droits.peutGererContenuSite(p),
      peutGererComptesTechniques:droits.peutGererComptesTechniques(p),
      peutGererRolesEtFonctions: droits.peutGererRolesEtFonctions(p),
      peutInviterMembres:        droits.peutInviterMembres(p),
    }

    return ok({
      id:             p.id,
      email:          user.email,
      role:           p.role,
      groups:         p.groups,
      pastoral_stage: profile?.pastoral_stage ?? null,
      display_name:   profile?.display_name   ?? null,
      avatar_url:     profile?.avatar_url      ?? null,
      droits:         droitsCalcules,
    })
  } catch (err) {
    return handleError(err)
  }
}
