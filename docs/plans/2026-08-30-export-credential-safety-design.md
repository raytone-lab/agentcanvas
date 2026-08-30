# Export Credential Safety Design

## Incident

A user pasted a real provider key into the field intended for an environment-variable name. The
project schema accepted any string in `auth.envVar`, and the exporter serialized that project value
verbatim into `src/exported-project.ts`. The session-key state itself was not exported, but the
misclassified value crossed the export boundary and exposed the credential.

## Security boundary

Credentials may exist only in browser `sessionKeys` state and Pi's in-memory credential store. A
project may persist only a symbolic environment-variable name. An export must be safe even when it
receives an old, malformed, or already-contaminated project object.

## Defense in depth

1. Environment-variable names must use a conservative uppercase credential-name format such as
   `OPENAI_API_KEY`, `CUSTOM_TOKEN`, or `SERVICE_SECRET`.
2. Pasting any other value into the environment-variable field is redirected to the password-style
   session-key field rather than stored in the project.
3. Invalid environment-variable values are normalized to the provider's catalog default (or a
   derived `<PROVIDER>_API_KEY` name) when provider state is updated.
4. `createScaffoldExportSnapshot` sanitizes every provider again before serializing any file. This
   is the authoritative boundary and protects exports made from legacy state.
5. Regression tests inject a sentinel secret into `auth.envVar` and assert that it is absent from
   the snapshot object and every generated file.

## Response

Previously exported archives cannot be made safe retroactively. Their exposed keys must be revoked
or rotated, and the archives must not be distributed. Temporary extracted copies created during
inspection should be deleted. A fresh archive must be generated after the fix.
