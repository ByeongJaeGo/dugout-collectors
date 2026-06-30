-- ============================================================
-- Dugout Collectors MVP — Supabase 설정
-- Dashboard → SQL Editor 에서 전체 실행
-- Authentication → Email → Confirm email 끄기 (MVP 테스트용)
-- ============================================================

-- profiles: 피드에 표시할 닉네임 (회원가입 시 함께 생성)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  created_at timestamptz not null default now()
);

-- posts (user_id → profiles.id = auth.users.id)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  image_url text not null,
  image_urls text[] not null default '{}',
  team text not null default '',
  caption text not null default '',
  player_name text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);

-- likes (user_id + post_id 복합 unique)
create table if not exists public.likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists likes_post_id_idx on public.likes (post_id);

-- 기존 DB에 likes.created_at 없으면 실행:
-- alter table public.likes add column if not exists created_at timestamptz not null default now();

-- 기존 DB에 posts.player_name / posts.tags 없으면 실행:
-- alter table public.posts add column if not exists player_name text not null default '';
-- alter table public.posts add column if not exists tags text[] not null default '{}';
-- alter table public.posts add column if not exists image_urls text[] not null default '{}';
-- alter table public.posts add column if not exists team text not null default '';

-- comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_post_id_idx on public.comments (post_id);
create index if not exists comments_parent_id_idx on public.comments (parent_id);

-- alter table public.comments add column if not exists parent_id uuid references public.comments (id) on delete cascade;

-- RLS
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;
alter table public.comments enable row level security;

create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "posts_select_all" on public.posts
  for select using (true);

create policy "posts_insert_own" on public.posts
  for insert with check (auth.uid() = user_id);

create policy "posts_delete_own" on public.posts
  for delete using (auth.uid() = user_id);

create policy "likes_select_all" on public.likes
  for select using (true);

create policy "likes_insert_own" on public.likes
  for insert with check (auth.uid() = user_id);

create policy "likes_delete_own" on public.likes
  for delete using (auth.uid() = user_id);

create policy "comments_select_all" on public.comments
  for select using (true);

create policy "comments_insert_own" on public.comments
  for insert with check (auth.uid() = user_id);

-- notifications (좋아요·댓글 알림)
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('like', 'comment')),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  actor_nickname text not null,
  post_id uuid not null references public.posts (id) on delete cascade,
  post_caption text not null default '',
  comment_body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = user_id);

create policy "notifications_insert_actor" on public.notifications
  for insert with check (auth.uid() = actor_id);

create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = user_id);

-- Storage: post-images (public read)
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do update set public = true;

create policy "storage_public_read" on storage.objects
  for select using (bucket_id = 'post-images');

create policy "storage_auth_upload" on storage.objects
  for insert with check (
    bucket_id = 'post-images'
    and auth.role() = 'authenticated'
  );

create policy "storage_auth_delete_own" on storage.objects
  for delete using (
    bucket_id = 'post-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
