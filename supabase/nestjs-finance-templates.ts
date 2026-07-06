// ============================================================
// ARC Église — NestJS : Guards + Module Finance
// À intégrer dans le projet NestJS (Railway)
// ============================================================

// ── 1. roles.decorator.ts ────────────────────────────────────
// import { SetMetadata } from '@nestjs/common';
// export const ROLES_KEY = 'roles';
// export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// ── 2. roles.guard.ts ────────────────────────────────────────
/*
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createClient } from '@supabase/supabase-js';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,  // service role — jamais exposé côté client
  );

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles: string[] = this.reflector.getAllAndOverride(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? [];

    if (!requiredRoles.length) return true;

    const req = context.switchToHttp().getRequest();
    const memberId: string = req.user?.sub;   // JWT claim 'sub' = member UUID
    if (!memberId) throw new ForbiddenException('Non authentifié');

    // Règle Admin : is_admin(memberId) contourne tout
    const { data: isAdmin } = await this.supabase.rpc('is_admin', { p_member_id: memberId });
    if (isAdmin) return true;

    // Vérifier les rôles requis
    for (const role of requiredRoles) {
      const [roleName, minLevel = 'membre'] = role.split(':');
      const { data: ok } = await this.supabase.rpc('has_role', {
        p_member_id: memberId,
        p_role_name: roleName,
        p_min_level: minLevel,
      });
      if (ok) return true;
    }

    throw new ForbiddenException('Accès refusé — rôle insuffisant');
  }
}
*/

// ── 3. finance.controller.ts ─────────────────────────────────
/*
import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard }   from '../auth/roles.guard';
import { Roles }        from '../auth/roles.decorator';
import { FinanceService } from './finance.service';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinanceController {
  constructor(private finance: FinanceService) {}

  // Résumé (Finance + Admin + Pasteur:responsable)
  @Get('summary')
  @Roles('Finance', 'Admin', 'Pasteur:responsable')
  getSummary(@Request() req) {
    return this.finance.getSummary(req.user.sub);
  }

  // Dons individuels — Finance + Admin uniquement
  @Get('donations')
  @Roles('Finance', 'Admin')
  getDonations() {
    return this.finance.getDonations();
  }

  // Moyens de paiement
  @Get('payment-methods')
  @Roles('Finance', 'Admin', 'Pasteur:manager', 'Support:manager')
  getPaymentMethods() {
    return this.finance.getPaymentMethods();
  }

  @Post('payment-methods')
  @Roles('Finance', 'Admin')
  createPaymentMethod(@Body() dto: any) {
    return this.finance.createPaymentMethod(dto);
  }

  // Export comptable
  @Post('export')
  @Roles('Finance', 'Admin')
  exportAccounting(@Body() dto: { from: string; to: string; format: string }) {
    return this.finance.exportAccounting(dto);
  }

  // Prix événements
  @Post('events/:id/price')
  @Roles('Finance', 'Admin')
  updateEventPrice(@Body() dto: { price_chf: number }, @Request() req) {
    return this.finance.updateEventPrice(req.params.id, dto.price_chf);
  }
}
*/

// ── 4. finance.service.ts ────────────────────────────────────
/*
import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class FinanceService {
  private db: SupabaseClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  async getSummary(memberId: string) {
    // Vérifie si Pasteur responsable → renvoie uniquement le total, pas les individus
    const { data: isPasteurResp } = await this.db.rpc('has_role', {
      p_member_id: memberId, p_role_name: 'Pasteur', p_min_level: 'responsable',
    });
    const { data: rows } = await this.db.from('donations').select('amount_chf');
    const total = (rows ?? []).reduce((s: number, r: any) => s + (r.amount_chf ?? 0), 0);
    return { total_chf: total, count: (rows ?? []).length, individual_access: !isPasteurResp };
  }

  async getDonations() {
    const { data } = await this.db
      .from('donations')
      .select('id, amount_chf, is_anonymous, donor_id, created_at, payment_method')
      .order('created_at', { ascending: false })
      .limit(200);
    return data ?? [];
  }

  async getPaymentMethods() {
    const { data } = await this.db
      .from('payment_methods')
      .select('id, name, type, is_active, qr_code_url')
      .order('name');
    return data ?? [];
  }

  async createPaymentMethod(dto: any) {
    const { data, error } = await this.db.from('payment_methods').insert(dto).select().single();
    if (error) throw error;
    return data;
  }

  async exportAccounting(dto: { from: string; to: string; format: string }) {
    const { data } = await this.db
      .from('donations')
      .select('amount_chf, is_anonymous, created_at, payment_method')
      .gte('created_at', dto.from)
      .lte('created_at', dto.to);
    // TODO: générer CSV/PDF avec la lib adéquate (papaparse / pdfmake)
    return { exported: (data ?? []).length, format: dto.format };
  }

  async updateEventPrice(eventId: string, priceChf: number) {
    const { data, error } = await this.db
      .from('events').update({ price_chf: priceChf }).eq('id', eventId).select().single();
    if (error) throw error;
    return data;
  }
}
*/

// ── 5. finance.module.ts ─────────────────────────────────────
/*
import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { FinanceService }    from './finance.service';

@Module({
  controllers: [FinanceController],
  providers:   [FinanceService],
})
export class FinanceModule {}
*/

// ── 6. Enregistrer dans app.module.ts ────────────────────────
// imports: [AuthModule, FinanceModule, ...]
