-- 库存调整申请表（线长提交，管理员审核后生效）
create table if not exists public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  line_id uuid not null references public.production_lines(id),
  supply_id uuid not null references public.supplies(id),
  change_qty integer not null,
  reason text,
  status text not null default 'pending', -- pending待确认 / approved已确认 / rejected已驳回
  applicant_id uuid references public.users(id),
  applicant_name text,
  approver_id uuid references public.users(id),
  approver_name text,
  reject_reason text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

-- 启用RLS
alter table public.stock_adjustments enable row level security;

create policy "stock_adjustments_select" on public.stock_adjustments
  for select using (true);
create policy "stock_adjustments_insert" on public.stock_adjustments
  for insert with check (true);
create policy "stock_adjustments_update" on public.stock_adjustments
  for update using (true);

comment on table public.stock_adjustments is '库存盘点调整申请，线长提交，管理员审核后生效';
