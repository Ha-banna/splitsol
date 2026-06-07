-- Include settlement_transfers in group_balances so settle up clears debts in the UI

CREATE OR REPLACE VIEW group_balances AS
SELECT
  g.id AS group_id,
  g.name AS group_name,
  u.id AS user_id,
  u.display_name,
  u.wallet_address,
  COALESCE(
    (SELECT SUM(es.amount_owed)
     FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE e.group_id = g.id
       AND e.paid_by = u.id
       AND es.user_id != u.id
       AND e.deleted_at IS NULL), 0)
  -
  COALESCE(
    (SELECT SUM(es.amount_owed)
     FROM expense_splits es
     JOIN expenses e ON e.id = es.expense_id
     WHERE e.group_id = g.id
       AND es.user_id = u.id
       AND e.paid_by != u.id
       AND e.deleted_at IS NULL), 0)
  +
  COALESCE(
    (SELECT SUM(st.amount_usdc)
     FROM settlement_transfers st
     JOIN settlements s ON s.id = st.settlement_id
     WHERE s.group_id = g.id
       AND st.from_user = u.id), 0)
  -
  COALESCE(
    (SELECT SUM(st.amount_usdc)
     FROM settlement_transfers st
     JOIN settlements s ON s.id = st.settlement_id
     WHERE s.group_id = g.id
       AND st.to_user = u.id), 0)
  AS net_balance_usdc
FROM groups g
JOIN group_members gm ON gm.group_id = g.id
JOIN users u ON u.id = gm.user_id
WHERE g.is_archived = FALSE;
