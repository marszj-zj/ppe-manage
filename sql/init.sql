-- ============================================================
-- 劳动防护用品管理系统 - Supabase 数据库初始化
-- 执行方式：Supabase Dashboard → SQL Editor → 粘贴执行
-- ============================================================

-- 启用 UUID 扩展
create extension if not exists "pgcrypto";

-- ============================================================
-- 1. 产线表
-- ============================================================
create table if not exists public.production_lines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  qr_token text unique not null,
  status text default 'active',
  created_at timestamptz default now()
);

-- ============================================================
-- 2. 班组表
-- ============================================================
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  line_id uuid references public.production_lines(id) on delete cascade,
  name text not null,
  status text default 'active',
  created_at timestamptz default now()
);

-- ============================================================
-- 3. 账号表
-- ============================================================
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password text not null,
  name text not null,
  role text not null check (role in ('admin','line_leader','team_leader')),
  line_id uuid references public.production_lines(id),
  team_id uuid references public.teams(id),
  status text default 'active',
  created_at timestamptz default now()
);

-- ============================================================
-- 4. 用品主表
-- ============================================================
create table if not exists public.supplies (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text not null,
  spec text,
  unit text,
  category text,
  safety_stock numeric default 0,
  status text default 'active',
  created_at timestamptz default now()
);

-- ============================================================
-- 5. 分产线库存表
-- ============================================================
create table if not exists public.supply_stock (
  id uuid primary key default gen_random_uuid(),
  supply_id uuid references public.supplies(id) on delete cascade,
  line_id uuid references public.production_lines(id) on delete cascade,
  quantity numeric default 0,
  unique(supply_id, line_id),
  updated_at timestamptz default now()
);

-- ============================================================
-- 6. 需求单
-- ============================================================
create table if not exists public.demand_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null,
  line_id uuid references public.production_lines(id),
  leader_id uuid references public.users(id),
  apply_month text not null,
  apply_date date,
  status text default 'draft' check (status in ('draft','submitted','admin_signed','done','cancelled')),
  receive_type text check (receive_type in ('full','partial')),
  admin_sign text,
  admin_sign_at timestamptz,
  leader_sign text,
  leader_sign_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- 7. 需求单明细
-- ============================================================
create table if not exists public.demand_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.demand_orders(id) on delete cascade,
  supply_id uuid references public.supplies(id),
  demand_qty numeric default 0,
  actual_qty numeric default 0,
  stock_snapshot numeric default 0,
  unit text,
  note text,
  created_at timestamptz default now()
);

-- ============================================================
-- 8. 临时采购单
-- ============================================================
create table if not exists public.temp_purchases (
  id uuid primary key default gen_random_uuid(),
  temp_no text unique not null,
  line_id uuid references public.production_lines(id),
  applicant_id uuid references public.users(id),
  apply_month text,
  reason text,
  status text default 'applied' check (status in ('applied','stocked','cancelled')),
  stocker_id uuid references public.users(id),
  stocked_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================================
-- 9. 临时采购明细
-- ============================================================
create table if not exists public.temp_purchase_items (
  id uuid primary key default gen_random_uuid(),
  temp_id uuid references public.temp_purchases(id) on delete cascade,
  supply_id uuid references public.supplies(id),
  qty numeric default 0,
  unit text,
  created_at timestamptz default now()
);

-- ============================================================
-- 10. 领用单
-- ============================================================
create table if not exists public.requisitions (
  id uuid primary key default gen_random_uuid(),
  req_no text unique not null,
  line_id uuid references public.production_lines(id),
  employee_name text not null,
  worker_type text check (worker_type in ('formal','labor')),
  team_leader_id uuid references public.users(id),
  sign_image text,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  approver_id uuid references public.users(id),
  approved_at timestamptz,
  reject_reason text,
  created_at timestamptz default now()
);

-- ============================================================
-- 11. 领用明细
-- ============================================================
create table if not exists public.requisition_items (
  id uuid primary key default gen_random_uuid(),
  req_id uuid references public.requisitions(id) on delete cascade,
  supply_id uuid references public.supplies(id),
  name text,
  spec text,
  unit text,
  qty numeric default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- 12. 库存流水
-- ============================================================
create table if not exists public.stock_records (
  id uuid primary key default gen_random_uuid(),
  line_id uuid references public.production_lines(id),
  supply_id uuid references public.supplies(id),
  change_type text check (change_type in ('in','temp_in','out','adjust')),
  change_qty numeric default 0,
  balance numeric default 0,
  ref_type text,
  ref_id uuid,
  operator_id uuid,
  operator_name text,
  created_at timestamptz default now()
);

-- ============================================================
-- 13. 月度报表
-- ============================================================
create table if not exists public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  line_id uuid references public.production_lines(id),
  team_id uuid references public.teams(id),
  month text not null,
  status text default 'draft' check (status in ('draft','team_signed','done')),
  tl_sign text,
  tl_name text,
  tl_at timestamptz,
  ll_sign text,
  ll_name text,
  ll_at timestamptz,
  file_url_pdf text,
  file_url_excel text,
  created_at timestamptz default now(),
  unique(line_id, team_id, month)
);

-- ============================================================
-- 14. 操作日志
-- ============================================================
create table if not exists public.operation_logs (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid,
  operator_name text,
  role text,
  action text,
  ref_type text,
  ref_id uuid,
  detail text,
  created_at timestamptz default now()
);

-- ============================================================
-- RLS 行级安全（内部工具，允许所有操作）
-- ============================================================
alter table public.production_lines enable row level security;
alter table public.teams enable row level security;
alter table public.users enable row level security;
alter table public.supplies enable row level security;
alter table public.supply_stock enable row level security;
alter table public.demand_orders enable row level security;
alter table public.demand_order_items enable row level security;
alter table public.temp_purchases enable row level security;
alter table public.temp_purchase_items enable row level security;
alter table public.requisitions enable row level security;
alter table public.requisition_items enable row level security;
alter table public.stock_records enable row level security;
alter table public.monthly_reports enable row level security;
alter table public.operation_logs enable row level security;

-- 内部工具策略：允许所有读写（二维码仅工厂内张贴，不对外公开）
create policy "allow_all_lines" on public.production_lines for all using (true) with check (true);
create policy "allow_all_teams" on public.teams for all using (true) with check (true);
create policy "allow_all_users" on public.users for all using (true) with check (true);
create policy "allow_all_supplies" on public.supplies for all using (true) with check (true);
create policy "allow_all_stock" on public.supply_stock for all using (true) with check (true);
create policy "allow_all_demand" on public.demand_orders for all using (true) with check (true);
create policy "allow_all_demand_items" on public.demand_order_items for all using (true) with check (true);
create policy "allow_all_temp" on public.temp_purchases for all using (true) with check (true);
create policy "allow_all_temp_items" on public.temp_purchase_items for all using (true) with check (true);
create policy "allow_all_req" on public.requisitions for all using (true) with check (true);
create policy "allow_all_req_items" on public.requisition_items for all using (true) with check (true);
create policy "allow_all_records" on public.stock_records for all using (true) with check (true);
create policy "allow_all_reports" on public.monthly_reports for all using (true) with check (true);
create policy "allow_all_logs" on public.operation_logs for all using (true) with check (true);

-- ============================================================
-- 初始数据
-- ============================================================

-- 默认管理员（用户名 admin，密码 admin123，首次登录请修改）
insert into public.users (username, password, name, role)
values ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '系统管理员', 'admin')
on conflict (username) do nothing;

-- 示例产线（可在后台修改/新增）
insert into public.production_lines (name, code, qr_token) values
('A产线', 'A', 'line-a-token'),
('B产线', 'B', 'line-b-token'),
('C产线', 'C', 'line-c-token'),
('D产线', 'D', 'line-d-token')
on conflict (qr_token) do nothing;

-- 示例班组
insert into public.teams (line_id, name)
select l.id, t.name from public.production_lines l
cross join (values ('1班组'),('2班组')) as t(name)
where not exists (select 1 from public.teams where line_id = l.id);

-- 示例用品分类
insert into public.supplies (code, name, spec, unit, category, safety_stock) values
('PPE-001','安全帽','ABS','顶','头部防护',10),
('PPE-002','防护手套','均码','副','手部防护',20),
('PPE-003','防尘口罩','KN95','只','呼吸防护',50),
('PPE-004','防护眼镜','防冲击','副','眼面防护',10),
('PPE-005','安全鞋','防砸防刺穿','双','足部防护',10),
('PPE-006','工作服','纯棉','套','躯体防护',10),
('PPE-007','耳塞','降噪','副','听觉防护',20),
('PPE-008','安全带','五点式','条','坠落防护',5)
on conflict do nothing;

-- ============================================================
-- 完成
-- ============================================================
-- 数据库初始化完成！
-- 下一步：在 js/config.js 中填入你的 Supabase URL 和 anon key
-- ============================================================
