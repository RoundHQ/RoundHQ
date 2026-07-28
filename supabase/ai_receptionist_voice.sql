alter table public.ai_receptionist_settings
  add column if not exists voice_accent text not null default 'scottish';
