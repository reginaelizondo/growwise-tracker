

## Fix Kinedu `user_validation` 401/406 Error

### Problem
The `create_auth_token` call succeeds (200 OK), but the subsequent `user_validation` call fails with `401 invalid_token` or `406 Incorrect user credentials`. The auth token is being extracted correctly from `response.token`, but the way it's sent to `user_validation` is being rejected.

### Solution
Update the edge function to try three different authentication strategies for `user_validation`, with comprehensive logging to identify which works:

### Changes

**File: `supabase/functions/register-kinedu-user/index.ts`**

1. **Add full response logging for `create_auth_token`** -- log the entire response object so we can verify the token structure.

2. **Try 3 auth strategies for `user_validation` sequentially**:
   - **Strategy A**: Raw token in `Authorization` header (current approach, but log more)
   - **Strategy B**: `Bearer {token}` in `Authorization` header
   - **Strategy C**: Token as a field in the request body (`auth_token` field)

3. **Log the full response from each `user_validation` attempt** so we can see exactly what Kinedu returns for each strategy.

4. **Accept the first successful response** (200, 201, 409, or 422 with "already exists").

### Technical Details

```text
Flow:
  create_auth_token (raw static token, empty body)
        |
        v
  Extract token from response.token
        |
        v
  user_validation Strategy A: Authorization: {token}
        |  (if 401/406)
        v
  user_validation Strategy B: Authorization: Bearer {token}
        |  (if 401/406)
        v
  user_validation Strategy C: body includes auth_token field
        |
        v
  Log all results, use first success
```

The body payload remains the same for all strategies (confirmed correct by Marijo):
```json
{
  "name": "...",
  "lastname": "",
  "email": "...",
  "access_code": "",
  "entry_name": "Lovable_Assessment"
}
```

For Strategy C, the body will additionally include `"auth_token": "{token}"`.

Once we identify which strategy works from the logs, we can simplify the code to use only that approach.
