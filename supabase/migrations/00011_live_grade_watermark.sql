alter table public.live_sessions
  add column if not exists grade text;

update public.platform_settings
set value = coalesce(value, '{}'::jsonb) || '{"enabled": true, "position": "moving"}'::jsonb,
    updated_at = now()
where key = 'video_watermark';

insert into public.platform_settings (key, value)
values ('video_watermark', '{"enabled": true, "position": "moving"}'::jsonb)
on conflict (key) do nothing;
