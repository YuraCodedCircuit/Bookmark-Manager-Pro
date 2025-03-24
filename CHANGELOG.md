# Changelog for Bookmark Manager Pro

All notable changes to this project will be documented in this file.

## [0.2.8]

Implemented: Enhanced Search Functionality:
- The search functionality for bookmarks and folders has been fully implemented with a redesigned user interface.
- The search UI features:
  - An input field at the top for entering search keywords.
  - A left-side panel with the following filters:
    - **'Browser Bookmarks'**: A toggle to include all browser bookmarks in the search results.
    - **'Selected Created After'**: Date and time input fields to filter items created after a specific date and time.
    - **'Selected Created Before'**: Date and time input fields to filter items created before a specific date and time.
    - **'Search In URLs'**: A toggle to include bookmark URLs in the search.
    - **'Include Bookmarks'**: A toggle to include all extension bookmarks in the search.
    - **'Include Folders'**: A toggle to include all extension folders in the search.
    - **'Choose Compact View' / 'Choose List View'**: A button that toggles the display of search results between a compact tile view and a detailed list view.
  - A 'Close' button at the bottom to exit the search UI.
- The right-side panel displays the search results.
- When the 'Browser Bookmarks' toggle is enabled, extension bookmarks are shown first, followed by browser bookmarks. Each section has a title indicating the number of items found (e.g., '1 bookmark found in Bookmark Manager Pro matching your search.', '10 bookmarks found in your Firefox browser matching your search.').
Added: Utility Functions in 'utilityFunctions.js':
- Implemented 'openUrl(url, ctrlPressed)' function to open a URL in a new tab (if `ctrlPressed` is true or middle mouse click) or the same tab.
- Implemented 'escapeHtml(unsafe)' function to prevent XSS attacks by escaping HTML special characters.
Added: Localization for Search Manager UI:
- All titles and labels for the search manager UI have been added to the 'en-US.lang' file in American English.
Security: Implemented 'escapeHtml' for XSS Prevention:
- The 'escapeHtml' function has been implemented in 'main.js' to sanitize:
  - Bookmark titles displayed in the main view.
  - Navigation bar titles.
  - The username displayed in the user menu.
- The 'escapeHtml' function has been implemented in 'bookmarkManager.js' to sanitize:
  - Folder names in the folders tree.
  - Content displayed in the bookmark preview.
- The 'escapeHtml' function has been implemented in 'settingsManager.js' to sanitize:
  - The user profile name in the 'Offline Profile' menu.
  - Profile names and bookmark titles displayed in the 'My Activity' menu.
Fixed: User Menu Visibility:
- The username in the user menu now correctly hides when the user closes the menu.
Fixed: Bookmark Manager Variable Names:
- Improved code readability in 'bookmarkManager.js' by updating variable names for better understanding.
Fixed: New Folder URL Auto-Addition:
- When creating a new folder in the Bookmark Manager, the extension no longer automatically adds 'HTTP://' or 'HTTPS://' to the folder's URL.
Fixed: Parent Folder Selection:
- In the Bookmark Manager, when editing a folder, that folder will no longer appear as an option to select as its own parent in the 'Select Folder' area.
Improved: Settings 'Info' Buttons Behavior:
- In the 'Info' menu of the Settings Manager, the behavior of the Firefox, X/Twitter, GitHub, and Buy Me A Coffee buttons has been updated:
  - **Left Mouse Click (without CTRL):** Opens the link in the same tab.
  - **Left Mouse Click (with CTRL) or Middle Mouse Click:** Opens the link in a new tab.
  - **Right Mouse Click:** Copies the URL to the system clipboard (this behavior remains unchanged).
Fixed: Font Styles in Extension Popup:
- All user-defined font styles (color, family, size, style, weight) are now correctly applied to the extension's popup window.
Updated: Manifest Homepage URL:
- The 'homepage_url' in the 'manifest.json' file has been updated to 'https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro'.
Updated: README Installation Instructions:
- The installation instructions in 'README.md' have been updated to provide more detailed steps on how to download the extension from the Firefox Add-ons website, including searching by name and using a direct URL.
Updated: Extension Screenshots:
- New extension screenshots have been added, and outdated screenshots have been removed.
Updated: README Screenshots:
- The extension screenshots displayed in the 'README.md' file have been updated

## [0.2.7]

- Improved: Bookmark Manager UI Style Customization:
  - The bookmark manager UI, which includes 'Border,' 'Color,' 'Image,' 'Text,' and 'Font' tabs for customization, now better reflects user-defined styles.
  - In the 'Border' tab, the 'Left,' 'Top,' 'Right,' and 'Bottom' buttons, used to navigate and style individual bookmark borders, now apply the user's configured secondary button style. Previously, these buttons did not adopt user-defined styles.
  - The random color generation buttons found in the 'Color,' 'Image,' 'Text,' and 'Font' tabs now utilize the user's configured primary button style.
  - In the 'Font' tab, the buttons for selecting Font Weight, Font Style, and Font Alignment, along with the random color button, now primarily use the user's primary button style, while other elements in this tab utilize the secondary button style.
- Enhanced: Input Field and Folder Tree Styling in Bookmark Manager:
  - The title input field, URL input field, and the folder selection area in the bookmark manager now feature a highlighted background color that dynamically adapts to the user's selected overall UI background color. This provides better visual integration with the user's chosen theme.
- Feature: Added Random Color Buttons in Text and Font Tabs:
  - New buttons have been added to the 'Text' and 'Font' tabs within the bookmark manager to allow users to easily generate random colors for styling.
- Improved: Font Family Dropdown Visibility:
  - In the 'Font' tab, the dropdown menu used to select a font family for new bookmarks now has a background color that dynamically adjusts based on the user's selected UI background color. This resolves a previous issue where a black background could make the menu invisible if the user had selected a dark UI theme.
- Created: Marquee Effect for Long Usernames:
  - To ensure that long usernames are fully visible, a marquee effect has been implemented in specific areas of the extension.
  - In the 'User Profile Menu', if a username exceeds 15 characters, it will now display with a scrolling marquee effect.
  - In the 'Settings Manager' within the 'Offline Profile' section, a marquee effect will be applied to usernames longer than 29 characters.
- Marquee Effect Behavior:
  - The marquee effect works by horizontally translating the username text.The text starts fully visible from the left, scrolls to the left until the end is visible, and then reverses direction, repeating this animation infinitely.
- Improved: Custom Context Menu Order:
  - The browser extension features a custom context menu that replaces the default browser context menu within the extension's tab. This menu has two variations: a 'default' menu appearing on right-click in empty spaces and a 'bookmark' menu for right-clicking on folders or bookmarks.
  - In the 'default' context menu, the order of options has been updated from 'New Bookmark,' 'New Folder,' 'Folder Settings,' 'Search' to 'New Bookmark,' 'New Folder,' 'Search,' 'Folder Settings'.
  - This change aligns with common user interface patterns where settings or configuration options are typically placed at the end of a menu. Each item in the context menu is also visually enhanced with an icon preceding the text. The functionalities of each item remain the same: 'New Bookmark' opens the bookmark creation UI, 'New Folder' opens the folder creation UI, 'Search' opens the search functionality, and 'Folder Settings' opens the customization options for the current folder's appearance and navigation
- Improved: Behavior of Information Buttons in Settings:,
  - In the 'Info' section of the extension's settings UI, the behavior of the four buttons (for Firefox, X/Twitter, GitHub, and Buy Me A Coffee) has been updated to provide more interaction options.
  - **Left Mouse Click:** Clicking normally on any of these buttons will now open the corresponding URL in the **current tab**.
  - **Middle Mouse Click (Mouse Wheel Click):** Clicking with the mouse wheel on any of these buttons will now open the corresponding URL in a **new tab**.
  - **Right Mouse Click:** Right-clicking on any of these buttons will now **copy the corresponding URL to your system clipboard**

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
