-- 认证安全升级：增加密码盐、登录失败次数、锁定时间
alter table public.users add column if not exists salt text;
alter table public.users add column if not exists login_fail_count integer default 0;
alter table public.users add column if not exists lock_until timestamptz;

comment on column public.users.salt is '密码盐（hex字符串），PBKDF2加密用';
comment on column public.users.login_fail_count is '连续登录失败次数';
comment on column public.users.lock_until is '账户锁定截止时间，null表示未锁定';
