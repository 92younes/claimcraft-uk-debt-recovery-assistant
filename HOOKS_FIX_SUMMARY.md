# React Hooks Error Fix Summary

## Problem
Users encountered critical errors when navigating through the wizard:
- "Error: Rendered more hooks than during the previous render"
- "Error: Rendered fewer hooks than expected"

These errors occurred when:
- Clicking "Continue to Strategy" from Verify step
- Clicking "Continue to Draft" from Strategy step

This blocked users from completing the N1 form generation workflow.

## Root Cause

The issue was caused by an infinite re-render loop in `pages/WizardPage.tsx`:

1. User clicks "Continue to Draft" → `step` changes to `Step.DRAFT`
2. useEffect (line 143) triggers to auto-generate the document
3. Document generation completes and calls `setClaimData(prev => ({ ...prev, generated }))`
4. This updates `claimData.generated.documentType`
5. Since `claimData.generated?.documentType` was in the dependency array, the useEffect triggers again
6. This creates an infinite loop of re-renders
7. React detects inconsistent hook calls between renders and throws the hooks error

## Solution

### Changes Made to `/mnt/c/Users/92you/claimcraft-uk---debt-recovery-assistant/pages/WizardPage.tsx`:

1. **Added import for useRef** (line 1):
   ```typescript
   import React, { useState, useEffect, useMemo, useRef } from 'react';
   ```

2. **Added ref to prevent concurrent generation** (line 51):
   ```typescript
   const isGeneratingRef = useRef(false);
   ```

3. **Added guard in useEffect** (lines 157-158):
   ```typescript
   // Prevent concurrent generation calls
   if (isGeneratingRef.current) return;
   ```

4. **Set/clear ref during generation** (lines 161, 198, 205):
   ```typescript
   isGeneratingRef.current = true;
   // ... async generation ...
   isGeneratingRef.current = false; // in finally block and cleanup
   ```

5. **Fixed dependency array** (lines 207-220):
   - **Removed**: `claimData.generated?.documentType` (this was causing the infinite loop)
   - **Added**: `claimData.lbaSentDate`, `userProfile`, `deadlines`, `setClaimData`, `addDeadline`
   - **Added comment**: Explaining why `claimData.generated?.documentType` is intentionally excluded

## Why This Fix Works

1. **Prevents Re-render Loop**: By removing `claimData.generated?.documentType` from dependencies, the effect no longer re-triggers when it updates that value

2. **Maintains Correctness**: The check for existing documents still happens inside the effect (line 149), so we don't lose any functionality

3. **Prevents Race Conditions**: The `isGeneratingRef` guard ensures only one generation can happen at a time

4. **Complete Dependencies**: All other dependencies are properly included to satisfy React's exhaustive-deps rule

## Testing

To verify the fix:
1. Navigate to wizard → Verify step
2. Fill in required fields (claimant name, defendant name, invoice amount)
3. Click "Continue to Strategy"
4. Select a document type (e.g., Form N1)
5. Click "Continue to Draft"
6. ✅ No hooks error should occur
7. ✅ Document should generate successfully

## Files Modified

- `/mnt/c/Users/92you/claimcraft-uk---debt-recovery-assistant/pages/WizardPage.tsx`

## Related Issues

This fix resolves the blocking bug that prevented users from:
- Generating N1 court claim forms
- Completing the wizard workflow
- Proceeding past the Strategy step
