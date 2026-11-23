# Whop checkout questions

Every Whop variant (plan) asks at checkout for:
- the colour / size / style of each item (only when the product has a choice; bundles ask once per item: "Item 1: ...", "Item 2: ..."),
- the shipping address (Full Name, Phone, Street, Apartment, City, State, ZIP, Country).

The sync worker (`../worker-sync-deployed.js`) reads these answers to create the Shopify order.

`new_fields.json` is what was set on 2026-11-23 for all 139 variants. To set them again
(Whop clears custom fields when a variant is updated without them):

    python3 fields.py <dir with plan_map.json, shop_products.json, whop_variants.json>
    # then PATCH https://api.whop.com/api/v1/variants/<plan_id> {"custom_fields": [...]} for each plan
