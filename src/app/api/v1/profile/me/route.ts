import { droits } from "@arc/core"
import { ok } from "../../_lib/response"
import { withApiV1 } from "../../_lib/handler"

export const dynamic = "force-dynamic"

export const GET = withApiV1({ category: "read", requireAuth: true }, async (_req, ctx) => {
  const p = {
    id:     ctx.profile?.id     ?? ctx.userId!,
    role:   ctx.profile?.role   ?? "visiteur",
    groups: ctx.profile?.groups ?? [],
  }

  const droitsCalcules = {
    peutVoirCRM:                droits.peutVoirCRM(p),
    peutVoirAdminPanel:         droits.peutVoirAdminPanel(p),
    peutVoirAnnuaireDetaille:   droits.peutVoirAnnuaireDetaille(p),
    peutVoirPipelinePastoral:   droits.peutVoirPipelinePastoral(p),
    peutEcrireNotesPastorales:  droits.peutEcrireNotesPastorales(p),
    peutGererContenuSite:       droits.peutGererContenuSite(p),
    peutGererComptesTechniques: droits.peutGererComptesTechniques(p),
    peutGererRolesEtFonctions:  droits.peutGererRolesEtFonctions(p),
    peutInviterMembres:         droits.peutInviterMembres(p),
  }

  return ok({
    id:             p.id,
    email:          ctx.email,
    role:           p.role,
    groups:         p.groups,
    pastoral_stage: ctx.profile?.pastoral_stage ?? null,
    display_name:   ctx.profile?.display_name   ?? null,
    avatar_url:     ctx.profile?.avatar_url      ?? null,
    droits:         droitsCalcules,
  })
})
