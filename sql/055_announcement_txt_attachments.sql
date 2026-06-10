-- Migration 055: Allow TXT attachments on announcements
-- Run after 054_raise_announcement_daily_limit.sql

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'text/plain'
]
WHERE id = 'announcement-attachments';

CREATE OR REPLACE FUNCTION announcement_validate_attachments(p_attachments jsonb)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_count int;
  v_item jsonb;
  v_mime text;
  v_size int;
  v_allowed text[] := ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain'
  ];
BEGIN
  IF p_attachments IS NULL OR p_attachments = '[]'::jsonb THEN
    RETURN;
  END IF;

  IF jsonb_typeof(p_attachments) <> 'array' THEN
    RAISE EXCEPTION 'Attachments must be a JSON array.';
  END IF;

  v_count := jsonb_array_length(p_attachments);
  IF v_count > 5 THEN
    RAISE EXCEPTION 'A maximum of 5 attachments is allowed.';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_attachments)
  LOOP
    IF NULLIF(btrim(v_item->>'url'), '') IS NULL THEN
      RAISE EXCEPTION 'Each attachment must include a url.';
    END IF;
    IF NULLIF(btrim(v_item->>'file_name'), '') IS NULL THEN
      RAISE EXCEPTION 'Each attachment must include a file_name.';
    END IF;

    v_mime := v_item->>'mime_type';
    IF v_mime IS NULL OR NOT (v_mime = ANY(v_allowed)) THEN
      RAISE EXCEPTION 'Unsupported attachment type: %', COALESCE(v_mime, 'unknown');
    END IF;

    v_size := COALESCE((v_item->>'size_bytes')::int, 0);
    IF v_size < 1 OR v_size > 10485760 THEN
      RAISE EXCEPTION 'Attachment size must be between 1 byte and 10 MB.';
    END IF;
  END LOOP;
END;
$$;
