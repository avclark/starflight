-- Seed default show_setting_definitions for podcast production
insert into show_setting_definitions (label, field_type, display_order) values
  ('Is this a Podcast Royale client?', 'yes_no', 1),
  ('Is this show recorded with Riverside?', 'yes_no', 2),
  ('Is this show hosted with Megaphone?', 'yes_no', 3),
  ('Do we edit audio for this show?', 'yes_no', 4),
  ('Do we edit video for this show?', 'yes_no', 5),
  ('Do we create social assets for this show?', 'yes_no', 6),
  ('Does the client need to approve all final assets?', 'yes_no', 7),
  ('Do we publish this show for the client?', 'yes_no', 8),
  ('Is compliance needed?', 'yes_no', 9),
  ('Are we running ad spots?', 'yes_no', 10),
  ('Client email', 'text', 11),
  ('Client first name', 'text', 12),
  ('List of social assets to create', 'checklist', 13);
