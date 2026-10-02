-- 用品表增加采购单位和换算比例字段
-- unit 字段保留作为「领用单位」
-- 新增 purchase_unit（采购单位）和 convert_ratio（换算比例：1采购单位=X领用单位）

alter table public.supplies add column if not exists purchase_unit text;
alter table public.supplies add column if not exists convert_ratio integer default 1;

-- 现有数据默认：采购单位=领用单位，换算比例=1
update public.supplies set purchase_unit = unit where purchase_unit is null;
update public.supplies set convert_ratio = 1 where convert_ratio is null or convert_ratio = 0;

comment on column public.supplies.purchase_unit is '采购单位，如盒、箱';
comment on column public.supplies.convert_ratio is '换算比例，1采购单位=X领用单位，默认1';
