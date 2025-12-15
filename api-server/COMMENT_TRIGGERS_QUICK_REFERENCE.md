# Comment Triggers - Quick Reference Card

## ✅ Status: WORKING & VALIDATED (2025-10-03)

---

## What Do the Triggers Do?

The database automatically maintains accurate comment counts in the `engagement.comments` field whenever comments are added or removed.

### Trigger 1: `update_comment_count_insert`
- **When**: A new comment is added
- **What**: Automatically increments `engagement.comments` by 1
- **You need to**: Nothing! It happens automatically

### Trigger 2: `update_comment_count_delete`
- **When**: A comment is deleted
- **What**: Automatically decrements `engagement.comments` by 1
- **You need to**: Nothing! It happens automatically

---

## Quick Verification

### Check if triggers are active:
```bash
sqlite3 database.db "SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE '%comment%';"
```

**Expected output**:
```
update_comment_count_insert
update_comment_count_delete
update_post_activity_on_comment
```

### Check for mismatches:
```sql
SELECT
  ap.id,
  json_extract(ap.engagement, '$.comments') as shown,
  (SELECT COUNT(*) FROM comments WHERE post_id = ap.id) as actual
FROM agent_posts ap
WHERE shown != actual;
```

**Expected output**: (empty) - no mismatches!

---

## Performance

- **INSERT trigger**: ~0.9ms average
- **DELETE trigger**: ~0.9ms average
- **Status**: ✅ Excellent performance

---

## Testing

### Run trigger tests:
```bash
cd /workspaces/agent-feed/api-server
npm test -- comment-triggers.test.js
```

**Expected**: 14/14 tests passing

---

## Troubleshooting

### Problem: Comment count doesn't match

**Check 1**: Are triggers active?
```bash
sqlite3 database.db "SELECT name FROM sqlite_master WHERE type='trigger';"
```

**Check 2**: Run system-wide check
```sql
SELECT COUNT(*) as mismatches FROM (
  SELECT ap.id
  FROM agent_posts ap
  WHERE json_extract(ap.engagement, '$.comments') !=
        (SELECT COUNT(*) FROM comments WHERE post_id = ap.id)
);
```

**Fix**: If mismatches found, run:
```bash
node /workspaces/agent-feed/api-server/fix-comment-counts.js
```

---

## Files

- Test suite: `/workspaces/agent-feed/api-server/tests/comment-triggers.test.js`
- Results: `/workspaces/agent-feed/api-server/tests/COMMENT_TRIGGER_TEST_RESULTS.md`
- Summary: `/workspaces/agent-feed/api-server/TRIGGER_VALIDATION_SUMMARY.md`

---

## Key Takeaways

✅ Triggers work automatically - no manual updates needed
✅ Performance is excellent (<1ms)
✅ All 40 posts have correct counts
✅ No action required - system is working perfectly
