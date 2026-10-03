-- 用品表增加单次领用上限字段
alter table public.supplies add column if not exists max_claim integer default 0;
comment on column public.supplies.max_claim is '单次领用上限（0表示不限制）';
