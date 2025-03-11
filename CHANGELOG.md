# Changelog for Bookmark Manager Pro

All notable changes to this project will be documented in this file.

## [0.2.6]

- Integrated extension icon into the browser omnibox for quick access to extension features.
  - Introduced functionality to extension popup window directly from the omnibox icon and immediately edit and save bookmark.
    * This feature streamlines the process of saving a new bookmark to the extension.
  - Added option to save a new bookmark either to the most recently created folder or a folder selected by the user.
    * This enhances bookmarking workflows by allowing users to quickly save visual information in desired locations.
- Implemented keyboard shortcut `Ctrl + Alt + O` to quickly open the extension popup window from anywhere in the browser.
    * This provides users with faster access to the extension's main interface without needing to click the browser icon.

## [0.2.5]

- Introduced new features to enhance user experience:
  - Copy/Duplicate/Move Bookmarks and Folders: Users can now easily copy, duplicate, or move bookmarks and folders within the extension.
    * This addition provides improved organization and management of bookmarks, allowing for efficient restructuring of user content.
  - Undo Functionality: Implemented undo capability for recent actions, including bookmark and folder deletions, using the `Ctrl + Z` shortcut.
    * This feature safeguards against accidental data loss and enhances user confidence by allowing quick reversal of unintended actions.

## [0.2.0]

- Implemented multi-profile support, enabling users to manage separate sets of bookmarks and settings.
  - Users can now create multiple profiles, each with customizable names and profile images (logos, avatars).
    * This feature allows for personalized environments for different contexts, such as work, personal use, or specific projects.
  - New profiles can be created by copying existing bookmarks, folder styles, bookmark styles, and settings from either the active profile or default 'factory settings'.
    * Streamlines profile creation and setup, allowing users to quickly customize new profiles based on existing configurations.
- Enhanced Export/Import functionality with encryption.
  - Added option to encrypt exported profile files with a user-defined password, which is required to decrypt the file during import.
    * This significantly improves the security of exported user data, protecting sensitive information during backup and transfer.

## [0.1.7]

- Introduced the activity log feature to track user interactions within the extension.
  - Real-time Logging: User activities, such as opening/closing the extension and creating/deleting bookmarks, are automatically recorded.
    * This provides a detailed history of user actions for personal tracking and potential debugging.
  - Detailed Entries: Each log entry includes a timestamp, action type, and description.
    * Offers comprehensive information for each recorded event, facilitating easy tracking and auditing.
  - User Interface: Added a dedicated 'Activity Log' section in the user profile, with filtering and sorting options.
    * Provides users with an accessible interface to review and manage their activity history efficiently.
  - Export Capability: Users can export activity logs in CSV format.
    * Enables users to perform external analysis, backup activity records, or share logs for support purposes.

## [0.1.6]

- Enabled online radio playback directly within the extension popup window.
  - Users can now listen to online radio streams without leaving the extension.
    * Enhances the extension's utility by providing integrated entertainment and background listening options.
- Added capability to save the currently active browser tab as a bookmark directly from the extension popup window.
  - This feature streamlines bookmark creation for quickly saving active pages.
- Implemented keyboard shortcut `Ctrl + P` to quickly open the settings panel.
    * Provides users with faster access to extension settings for configuration changes.
- Implemented keyboard shortcut `Ctrl + Shift + B` to quickly create a new bookmark.
    * Streamlines the bookmark creation process, improving user efficiency.
- Implemented keyboard shortcut `Ctrl + Shift + N` to quickly create a new folder.
    * Simplifies folder creation, allowing for quicker organization of bookmarks.
- Implemented keyboard shortcut `Ctrl + F` to quickly open the search dialog.
    * Offers immediate access to the search functionality for efficient content discovery within the extension.

## [0.1.5]

- Added customization options for navigation bars within folders.
  - Users can now add and edit icons for navigation bar elements in folders.
    * Enhances visual customization and personalization of folder navigation.
- Implemented functionality to reorder bookmarks and folders via drag-and-drop or similar interface.
  - Users can now change the order of bookmarks and folders within the extension.
    * Improves organizational flexibility, allowing users to arrange content based on preference or priority.
- Introduced profile customization with image and name.
  - Users can now personalize their profile by adding and editing a profile image and name.
    * Provides a more personalized user experience and visual identification within the extension.
- Added initial support for multiple languages.
  - The extension now supports different languages, improving accessibility for a broader user base.
    * Facilitates usage for non-English speakers and expands the extension's global reach.
- Implemented an extension popup window.
  - Provides a dedicated interface accessible from the browser toolbar icon for quick access to extension features.
    * Offers a convenient and centralized access point for core extension functionalities.
- Introduced a background script to manage extension processes.
  - Implemented a background script to handle tasks such as settings management, synchronization, and other background operations.
    * Improves extension performance and ensures efficient handling of background tasks without impacting user experience.
- Enhanced the settings manager with new features:
  - Manage export/import: Added capability to export and import extension profiles, bookmarks, styles, and settings.
    * Allows users to backup and restore their extension data or transfer settings between installations.
  - Manage synchronization: Introduced synchronization between the browser and the extension to maintain data consistency.
    * Ensures data integrity and accessibility across different browser sessions or devices.
- Implemented a changelog to track extension updates.
  - This changelog was added to provide users with a history of changes and improvements made to the extension.
    * Enhances transparency and keeps users informed about ongoing development and updates.

## [0.1.0]

- Initial release of the browser extension.
- This initial release includes the following key features:
  - Bookmark and Folder Management:
    - Ability to add and edit new bookmarks.
    - Ability to add and edit new folders.
  - Tile Customization:
    - Ability to add and edit color or image as bookmark/folder tile backgrounds.
  - Style Customization:
    - Ability to add and edit styles for selected folders.
    - Ability to add and edit styles for navigation bars within folders.
  - Custom Context Menu:
    - Implemented a custom context menu on the main extension page for quick actions.
  - Default Style Management:
    - Ability to edit and save/load default styles for bookmarks and folders.
  - Settings Manager:
    - Added a comprehensive settings manager to configure and save extension parameters.
    - The settings manager includes the following features:
      - Offline Profile Management.
      - Default Folder Style Configuration.
      - Default Navigation Bar Style Configuration.
      - Window Style Customization.
      - Activity Tracking (Note: Initial framework, feature fully implemented in v0.1.7).
      - Extension Information Display.
