alter table public.ai_receptionist_settings
  add column if not exists custom_conversation_enabled boolean not null default false,
  add column if not exists conversation_instructions text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_receptionist_conversation_instructions_length'
      and conrelid = 'public.ai_receptionist_settings'::regclass
  ) then
    alter table public.ai_receptionist_settings
      add constraint ai_receptionist_conversation_instructions_length
      check (char_length(conversation_instructions) <= 8000);
  end if;
end
$$;
