-- ============================================================
-- Migration 02 — Itemized quotes
-- À exécuter dans : Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Stores the list of products attached to a quote request, e.g.:
-- [{ "productId": "...", "name": "Caméra Dôme IP 4K", "reference": "KW-CAM-01",
--    "qty": 2, "price": 45000 }]
-- Empty array when the request came from the configurator without a cart.
alter table devis_requests
  add column if not exists items jsonb not null default '[]';
