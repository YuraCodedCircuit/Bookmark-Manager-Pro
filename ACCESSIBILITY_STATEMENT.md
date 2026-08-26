# Accessibility Statement

**Updated:** August 24, 2026

Bookmark Manager Pro aims to provide an interface that can be used with a
keyboard, screen reader, text zoom, reduced motion, and higher-contrast display
preferences across Chrome, Firefox, and Microsoft Edge.

## Accessibility goals

The project uses the current Web Content Accessibility Guidelines (WCAG) as its
design and testing reference, with WCAG 2.2 Level AA as the intended target.
This statement is a development commitment, not a claim that every current
surface has completed a formal conformance audit.

Implemented accessibility behavior includes:

- Semantic controls, headings, navigation regions, dialogs, menus, trees, tables,
  and form labels.
- Visible keyboard focus and logical tab order.
- Keyboard operation for application actions and drag-and-drop alternatives.
- Focus containment and restoration for modal windows and side panels.
- Accessible names and status announcements for interactive controls.
- Follow-system, reduced-animation, and no-animation preferences.
- A profile-owned high-contrast option.
- Layouts intended to remain usable with long text and browser zoom.

## Known limitations

- The application is in Alpha and has not completed a third-party accessibility
  audit.
- English (United States) is currently the only complete interface language.
- Browser and assistive-technology combinations may expose different behavior.
- Import, Export, Backup, and Advanced settings are visible but unavailable while
  those features are being developed.
- Accessibility testing is ongoing as new surfaces are introduced.

## Reporting an accessibility problem

Open a non-sensitive accessibility issue through the
[project issue tracker](https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro/issues).
Include the browser and version, operating system, assistive technology if any,
the affected screen, and reproduction steps. Use synthetic examples and remove
bookmark titles, URLs, profile information, or other personal data from reports
and screenshots.

If a report contains a security or privacy vulnerability, use
[GitHub private vulnerability reporting](https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro/security/advisories/new)
instead of a public issue.

## Ongoing work

Accessibility is reviewed during component development, automated testing, and
supported-browser verification. This statement will be updated when material
behavior, known limitations, or conformance evidence changes.
