# Security Policy

## Supported versions

Security fixes are provided for the latest version of Bookmark Manager Pro
available through the supported browser stores. Development snapshots and older
releases may receive fixes at the developer's discretion.

## Reporting a vulnerability

Report suspected vulnerabilities through
[GitHub private vulnerability reporting](https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro/security/advisories/new).
This is the official channel for security reports.

Do not include vulnerability details, bookmark data, URLs, profile information,
screenshots containing personal information, or exploit instructions in a public
GitHub issue. Public issues may be used for ordinary bugs that do not expose a
security weakness or sensitive information.

A useful private report includes the affected version and browser, the observed
impact, minimal reproduction steps, and any relevant non-sensitive diagnostics.
Reports should use synthetic test data. Receipt and resolution times are not
guaranteed, but reports will be reviewed as availability permits.

## System and scope

Bookmark Manager Pro is a local-first browser extension for Chrome, Firefox, and
Microsoft Edge. This policy covers the extension source, packaged extension
builds, browser API adapters, local IndexedDB and extension storage, imported and
exported data formats, URL navigation, search integration, and communication
between extension surfaces.

Security-sensitive assets include bookmark and profile data, settings, local
images, undo and activity records, encryption material for future protected
exports, and the integrity of user-requested mutations.

## Threat model and trust boundaries

Imported files, runtime messages, URLs, browser bookmark data, stored records,
and user-provided text are untrusted. External websites and search providers are
outside the extension's trust boundary. Browser APIs and browser-managed storage
are trusted only according to their documented contracts and available
capabilities.

## Security requirements

- Unsafe URL protocols must be rejected before navigation.
- Imported or stored content must never execute as HTML or script.
- Runtime messages must use the versioned protocol and runtime validation.
- Profile-owned data and operations must remain isolated by profile identifier.
- Storage mutations that span multiple records must preserve transactional
  integrity and fail without leaving partial state.
- Sensitive bookmark content, search text, personal data, and cryptographic
  material must not appear in logs or notifications.
- Browser permissions and remote communication must remain limited to documented
  product behavior.
- Background work must tolerate worker suspension and safe retry.

## Reportable findings

Report issues that can realistically cause unauthorized data access or mutation,
cross-profile disclosure, unsafe navigation or script execution, permission
abuse, privacy-policy violations, persistent data corruption, security-control
bypass, or exposure of sensitive information through logs, exports, or extension
communication.

## Out of scope

General feature requests, visual defects without security impact, unsupported
browser versions, and vulnerabilities that require an already-compromised
operating system or browser profile are not security findings for this project.
They may still be reported as ordinary issues when appropriate.

## Disclosure

Please allow time for investigation and a coordinated fix before publishing
details. Acknowledgment or public credit may be provided with the reporter's
permission, but cannot be guaranteed.
