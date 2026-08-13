/*
  # Add Hero Section Settings

  1. New Settings
    - Adds default values for editable hero section content
    - Keys: hero_badge_text, hero_title_prefix, hero_title_highlight, hero_title_suffix, hero_subtext, hero_tagline, hero_description, hero_accent_color
*/

INSERT INTO site_settings (id, value, type, description)
VALUES 
  ('hero_badge_text', 'Premium Peptide Solutions', 'string', 'Text displayed in the badge pill'),
  ('hero_title_prefix', 'Premium', 'string', 'First part of the main headline'),
  ('hero_title_highlight', 'Peptides', 'string', 'Highlighted part of the main headline (colored)'),
  ('hero_title_suffix', '& Essentials', 'string', 'Last part of the main headline'),
  ('hero_subtext', 'From the Lab to You — Simplifying Science, One Dose at a Time.', 'string', 'Text displayed next to or below the title'),
  ('hero_tagline', 'Quality-tested products. Reliable performance. Trusted by our community.', 'string', 'Secondary tagline above main description'),
  ('hero_description', 'SlimDose Peptides is your all-in-one destination for high-quality peptides, peptide pens, and the essential accessories you need for a smooth and confident wellness routine.', 'string', 'Main standard description text'),
  ('hero_accent_color', 'gold-500', 'string', 'Accent color class for key elements')
ON CONFLICT (id) DO UPDATE 
SET value = EXCLUDED.value, description = EXCLUDED.description;
