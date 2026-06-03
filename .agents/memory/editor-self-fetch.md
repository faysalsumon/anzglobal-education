---
name: Editor self-fetch pattern
description: How to prevent edit forms from showing stale data on reopen due to parent list cache lag
---

## Rule
Any edit/detail form (InstitutionEditor, CourseEditor, etc.) must own a `useQuery`
for its own record by ID, with `staleTime: 0`. Do NOT rely solely on the parent
component's list-query state passed down as a prop.

**Why:** The parent sets `editingFoo` once when the user clicks Edit, from a
list cache that may be stale (invalidation is async — the refetch races the user
clicking Edit). Fields that were null/blank in the old cache appear blank in the
form even though the server has the real values.

## How to apply

### Two-effect hydration pattern
```tsx
// Effect 1 — initial mount: unconditional reset from prop (no keepDirtyValues)
// Gives the user a populated form immediately, before the query returns.
useEffect(() => {
  if (institution) form.reset(buildValues(institution));
}, [institution?.id]);

// Effect 2 — server data arrives or save refetches: keepDirtyValues: true
// Never overwrites what the user has started typing.
useEffect(() => {
  if (freshInstitution) form.reset(buildValues(freshInstitution), { keepDirtyValues: true });
}, [freshInstitution?.id, freshInstitution?.updatedAt]);
```

### Three invalidations on save
```ts
queryClient.invalidateQueries({ queryKey: ["/api/super-admin/institutions"] });       // full-admin list
queryClient.invalidateQueries({ queryKey: ["/api/admin/my-institutions"] });           // scoped list
queryClient.invalidateQueries({ queryKey: ["/api/super-admin/institutions", id] });   // detail → triggers Effect 2
```

### Null coercion for controlled inputs
Use `?? ""` (not `as any`) for number columns that may be DB null:
```ts
numberOfCampuses: institution?.numberOfCampuses ?? ("" as any),
```

## Applied to
`client/src/components/institution-editor.tsx` — confirmed fixed June 2026.
