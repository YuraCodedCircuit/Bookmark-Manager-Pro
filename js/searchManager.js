/**
 * Copyright (C) 2025 YuraCodedCircuit
 *
 * This file is part of Bookmark Manager Pro.
 *
 * Bookmark Manager Pro is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Bookmark Manager Pro is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Bookmark Manager Pro. If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * Bookmark Manager Pro
 * This project uses third-party libraries:
 * - jQuery (MIT License)
 * - Toastify (MIT License)
 * - JavaScript Color Gradient (MIT License)
 * - Coloris (MIT License)
 * - LocalForage (MIT License)
 * - CryptoJS (MIT License)
 * - GSAP (Standard License)
 * - tsParticles (MIT License)
 * - Emoji Mart (MIT License)
 * - jQuery Knob (MIT License)
 * - Howler (MIT License)
 * - Marked (MIT License)
 * - DOMPurify (Apache License Version 2.0)
 *
 * All third-party libraries are included under their respective licenses.
 * For more information, please refer to the documentation of each library.
 */

import { userProfileExport, currentLanguage, createCurrentBookmarkFolder, currentLanguageTextObj, firefoxLogoSVG } from './main.js';
import { showMessageToastify, formatDateTime, findBookmarkByKey, translateUserName, checkIfColorBrightness, generateColorPalette, createTooltip, escapeHtml } from './utilityFunctions.js';

/**
 * Manages the display and functionality of the search window.
 * @param {string} status - The status of the search window, either 'open' or 'close'.
 */
export const searchManager = (status) => {
    const uiElementsContainerEl = document.getElementById('uiElementsContainer');
    const viewAsListIconSVG = `
        <!--Icon by contributors from https://lucide.dev/icons/layout-list, licensed under https://lucide.dev/license-->
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${userProfileExport.mainUserSettings.windows.button.primary.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><path d="M14 4h7"/><path d="M14 9h7"/><path d="M14 15h7"/><path d="M14 20h7"/></svg>
    `;
    const viewAsCompactIconSVG = `
        <!--Icon by contributors from https://lucide.dev/icons/layout-grid, licensed under https://lucide.dev/license-->
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${userProfileExport.mainUserSettings.windows.button.primary.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
    `;
    const infoBookmarkIconSVG = `
        <!--Icon by contributors from https://lucide.dev/icons/info, licensed under https://lucide.dev/license-->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${userProfileExport.mainUserSettings.windows.button.secondary.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
    `;
    const folderIconSVG = `
        <!--Icon by contributors from https://lucide.dev/icons/folder, licensed under https://lucide.dev/license-->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>
    `;
    const bookmarkIconSVG = `
        <!--Icon by contributors from https://lucide.dev/icons/bookmark, licensed under https://lucide.dev/license-->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bookmark"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
    `;
    const userColor = userProfileExport.mainUserSettings.windows.window.backgroundColor;
    const colorPalette = generateColorPalette(userColor);
    const backgroundColorBrightness = checkIfColorBrightness(userProfileExport.mainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff';
    const forbiddenIds = ['root________', 'menu________', 'toolbar_____', 'unfiled_____', 'mobile______'];
    let browserBookmarkArray = [];
    let filteredBrowserBookmarks = [];
    let filteredExtensionBookmarks = [];
    const searchObject = {
        searchText: '',
        includedBrowserBookmarks: false,
        includedSearchInUrls: true,
        createdAfterDate: '0000-00-00',
        createdAfterTime: '00:00:00',
        createdBeforeDate: '0000-00-00',
        createdBeforeTime: '00:00:00',
        includeBookmarks: true,
        includeFolders: true,
        view: 'list'
    };

    // Check if the status is valid
    if (!['open', 'close'].includes(status)) {
        showMessageToastify('error', ``, `Invalid status for search window. Allowed values are 'open' and 'close'.`, 4000, false, 'bottom', 'right', true);
        return;
    }

    // Close the search window
    if (status === 'close') {
        uiElementsContainerEl.style.display = 'none';
        uiElementsContainerEl.innerHTML = DOMPurify.sanitize('');
        return;
    }

    /**
     * Retrieves the bookmark tree.
     * @returns {Array} The browser bookmark tree.
     */
    (async () => {
        try {
            // Await the retrieval of the bookmark tree
            browserBookmarkArray = await browser.bookmarks.getTree();
        } catch (error) {
            console.error('Error retrieving bookmark tree:', error);
        }
    })();

    // Create the HTML for the search window
    const otherBodyHTML = `
        <div id="searchWindow">
            <div id="searchWindowHeader">
                <input type="text" id="searchWindowHeaderSearchInput" placeholder="${currentLanguageTextObj._searchManagerUI.typeToSearch}">
            </div>
            <div id="searchWindowBody">
                <div id="searchWindowBodyLeft">
                    <div id="searchWindowBodyLeftSearchFilters" style="background-color: ${colorPalette[0]}">
                        <div id="searchWindowBodyLeftSearchFiltersTitle">Filters</div>
                        <div id="searchWindowBodyLeftSearchFiltersContent">
                            <div id="searchWindowBodyLeftSearchFiltersContentIncludeBrowserBookmarks" class="searchWindowBodyLeftSearchFilters">
                                <label class="toggle" id="searchWindowBodyLeftSearchFiltersContentIncludeBrowserBookmarksToggleLabel" for="searchWindowBodyLeftSearchFiltersContentIncludeBrowserBookmarksToggle">
                                    <div id="searchWindowBodyLeftSearchFiltersContentIncludeBrowserBookmarksToggleTitle">Browser Bookmarks</div>
                                    <input type="checkbox" class="toggleInput" id="searchWindowBodyLeftSearchFiltersContentIncludeBrowserBookmarksToggle" checked />
                                    <span class="toggleTrack">
                                        <span class="toggleIndicator">
                                            <span class="checkMark">
                                                <svg viewBox="0 0 24 24" id="ghq-svg-check" role="presentation" aria-hidden="true">
                                                    <path d="M9.86 18a1 1 0 01-.73-.32l-4.86-5.17a1.001 1.001 0 011.46-1.37l4.12 4.39 8.41-9.2a1 1 0 111.48 1.34l-9.14 10a1 1 0 01-.73.33h-.01z"></path>
                                                </svg>
                                            </span>
                                        </span>
                                    </span>
                                </label>
                            </div>
                            <div id="searchWindowBodyLeftSearchFiltersContentDateStarted" class="searchWindowBodyLeftSearchFilters">
                                <div id="searchWindowBodyLeftSearchFiltersContentDateStartedTitle">Select Created After</div>
                                <div id="searchWindowBodyLeftSearchFiltersContentDateStartedContent">
                                    <input type="date" id="searchWindowBodyLeftSearchFiltersContentDateStartedContentInputDate">
                                    <input type="time" id="searchWindowBodyLeftSearchFiltersContentDateStartedContentInputTime">
                                </div>
                            </div>
                            <div id="searchWindowBodyLeftSearchFiltersContentDateEnded" class="searchWindowBodyLeftSearchFilters">
                                <div id="searchWindowBodyLeftSearchFiltersContentDateEndedTitle">Select Created Before</div>
                                <div id="searchWindowBodyLeftSearchFiltersContentDateEndedContent">
                                    <input type="date" id="searchWindowBodyLeftSearchFiltersContentDateEndedContentInputDate">
                                    <input type="time" id="searchWindowBodyLeftSearchFiltersContentDateEndedContentInputTime">
                                </div>
                            </div>
                            <div id="searchWindowBodyLeftSearchFiltersContentIncludeSearchInUrls" class="searchWindowBodyLeftSearchFilters">
                                <label class="toggle" id="searchWindowBodyLeftSearchFiltersContentIncludeSearchInUrlsToggleLabel" for="searchWindowBodyLeftSearchFiltersContentIncludeSearchInUrlsToggle">
                                    <div id="searchWindowBodyLeftSearchFiltersContentIncludeSearchInUrlsToggleTitle">Search In URLs</div>
                                    <input type="checkbox" class="toggleInput" id="searchWindowBodyLeftSearchFiltersContentIncludeSearchInUrlsToggle" checked />
                                    <span class="toggleTrack">
                                        <span class="toggleIndicator">
                                            <span class="checkMark">
                                                <svg viewBox="0 0 24 24" id="ghq-svg-check" role="presentation" aria-hidden="true">
                                                    <path d="M9.86 18a1 1 0 01-.73-.32l-4.86-5.17a1.001 1.001 0 011.46-1.37l4.12 4.39 8.41-9.2a1 1 0 111.48 1.34l-9.14 10a1 1 0 01-.73.33h-.01z"></path>
                                                </svg>
                                            </span>
                                        </span>
                                    </span>
                                </label>
                            </div>
                            <div id="searchWindowBodyLeftSearchFiltersContentIncludeBookmarks" class="searchWindowBodyLeftSearchFilters">
                                <label class="toggle" id="searchWindowBodyLeftSearchFiltersContentIncludeBookmarksToggleLabel" for="searchWindowBodyLeftSearchFiltersContentIncludeBookmarksToggle">
                                    <div id="searchWindowBodyLeftSearchFiltersContentIncludeBookmarksToggleTitle">Include Bookmarks</div>
                                    <input type="checkbox" class="toggleInput" id="searchWindowBodyLeftSearchFiltersContentIncludeBookmarksToggle" checked />
                                    <span class="toggleTrack">
                                        <span class="toggleIndicator">
                                            <span class="checkMark">
                                                <svg viewBox="0 0 24 24" id="ghq-svg-check" role="presentation" aria-hidden="true">
                                                    <path d="M9.86 18a1 1 0 01-.73-.32l-4.86-5.17a1.001 1.001 0 011.46-1.37l4.12 4.39 8.41-9.2a1 1 0 111.48 1.34l-9.14 10a1 1 0 01-.73.33h-.01z"></path>
                                                </svg>
                                            </span>
                                        </span>
                                    </span>
                                </label>
                            </div>
                            <div id="searchWindowBodyLeftSearchFiltersContentIncludeFolders" class="searchWindowBodyLeftSearchFilters">
                                <label class="toggle" id="searchWindowBodyLeftSearchFiltersContentIncludeFoldersToggleLabel" for="searchWindowBodyLeftSearchFiltersContentIncludeFoldersToggle">
                                    <div id="searchWindowBodyLeftSearchFiltersContentIncludeFoldersToggleTitle">Include Folders</div>
                                    <input type="checkbox" class="toggleInput" id="searchWindowBodyLeftSearchFiltersContentIncludeFoldersToggle" checked />
                                    <span class="toggleTrack">
                                        <span class="toggleIndicator">
                                            <span class="checkMark">
                                                <svg viewBox="0 0 24 24" id="ghq-svg-check" role="presentation" aria-hidden="true">
                                                    <path d="M9.86 18a1 1 0 01-.73-.32l-4.86-5.17a1.001 1.001 0 011.46-1.37l4.12 4.39 8.41-9.2a1 1 0 111.48 1.34l-9.14 10a1 1 0 01-.73.33h-.01z"></path>
                                                </svg>
                                            </span>
                                        </span>
                                    </span>
                                </label>
                            </div>
                            <div id="searchWindowBodyLeftSearchFiltersContentResultView" class="searchWindowBodyLeftSearchFilters">
                                <div id="searchWindowBodyLeftSearchFiltersContentResultViewTitle">Choose Compact View</div>
                                <button id="searchWindowBodyLeftSearchFiltersContentResultViewToggleButton"></button>
                            </div>
                        </div>
                        <div id="searchWindowBodyLeftSearchFiltersFooter">
                            <button id="searchWindowBodyLeftSearchFiltersFooterCloseButton">Close</button>
                        </div>
                    </div>
                </div>
                <div id="searchWindowBodyRight">
                    <div id="searchWindowBodyRightResults"></div>
                </div>
            </div>
        </div>
    `;

    // Display the UI elements
    uiElementsContainerEl.style.display = 'flex';
    uiElementsContainerEl.innerHTML = DOMPurify.sanitize(otherBodyHTML);

    /**
     * Updates the text content of the search manager UI elements based on the current language settings.
     * @function updateSearchManagerTitlesUI
     */
    const updateSearchManagerTitlesUI = () => {
        /**
        * Helper function to update the text content of a given element.
        * @param {HTMLElement} element - The DOM element whose text content needs to be updated.
        * @param {string} text - The new text content to be set for the element.
        */
        const updateTextContent = (element, text) => {
            if (element && text !== undefined) {
                element.innerText = text;
            } else {
                console.error('Invalid arguments passed to updateTextContent()', { element: element, text: text });
            }
        };

        // Mapping of element IDs to their corresponding text values
        const titlesToUpdate = {
            searchWindowBodyLeftSearchFiltersTitle: {
                id: 'searchWindowBodyLeftSearchFiltersTitle',
                text: currentLanguageTextObj._searchManagerUI._allFilters.filters,
                classNames: []
            },
            searchWindowBodyLeftSearchFiltersContentIncludeBrowserBookmarksToggleTitle: {
                id: 'searchWindowBodyLeftSearchFiltersContentIncludeBrowserBookmarksToggleTitle',
                text: currentLanguageTextObj._searchManagerUI._allFilters.browserBookmarks,
                classNames: []
            },
            searchWindowBodyLeftSearchFiltersContentDateStartedTitle: {
                id: 'searchWindowBodyLeftSearchFiltersContentDateStartedTitle',
                text: currentLanguageTextObj._searchManagerUI._allFilters.selectCreatedAfter,
                classNames: []
            },
            searchWindowBodyLeftSearchFiltersContentDateEndedTitle: {
                id: 'searchWindowBodyLeftSearchFiltersContentDateEndedTitle',
                text: currentLanguageTextObj._searchManagerUI._allFilters.selectCreatedBefore,
                classNames: []
            },
            searchWindowBodyLeftSearchFiltersContentIncludeSearchInUrlsToggleTitle: {
                id: 'searchWindowBodyLeftSearchFiltersContentIncludeSearchInUrlsToggleTitle',
                text: currentLanguageTextObj._searchManagerUI._allFilters.searchInURLs,
                classNames: []
            },
            searchWindowBodyLeftSearchFiltersContentIncludeBookmarksToggleTitle: {
                id: 'searchWindowBodyLeftSearchFiltersContentIncludeBookmarksToggleTitle',
                text: currentLanguageTextObj._searchManagerUI._allFilters.includeBookmarks,
                classNames: []
            },
            searchWindowBodyLeftSearchFiltersContentIncludeFoldersToggleTitle: {
                id: 'searchWindowBodyLeftSearchFiltersContentIncludeFoldersToggleTitle',
                text: currentLanguageTextObj._searchManagerUI._allFilters.includeFolders,
                classNames: []
            },
            searchWindowBodyLeftSearchFiltersFooterCloseButton: {
                id: 'searchWindowBodyLeftSearchFiltersFooterCloseButton',
                text: currentLanguageTextObj._searchManagerUI.close,
                classNames: []
            },
        };

        // Update the text content and class of each UI element
        Object.entries(titlesToUpdate).forEach(([elementType, { id, text, classNames }]) => {
            let element;
            if (id.length > 0) {
                element = document.getElementById(id); // Try to get by ID
            } else if (classNames.length === 1) {
                element = document.getElementsByClassName(classNames[0]); // Try to get by class name
            } else if (classNames.length > 1) {
                classNames.forEach(className => {
                    element.push(document.getElementsByClassName(className));
                });
            }
            if (Array.isArray(element)) {
                element.forEach(element => {
                    updateTextContent(element, text);
                });
            } else {
                updateTextContent(element, text);
            }
        });
    }
    updateSearchManagerTitlesUI();

    /**
     * Sets the styles of the search window UI based on the user's settings.
     * @private
     */
    const setStylesToSearchWindowUi = () => {
        const searchWindowEl = document.getElementById('searchWindow');
        const searchWindowHeaderSearchInputEl = document.getElementById('searchWindowHeaderSearchInput');
        const searchWindowBodyLeftSearchFiltersElArray = document.querySelectorAll('.searchWindowBodyLeftSearchFilters');
        const searchWindowBodyLeftSearchFiltersContentResultViewToggleButtonEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentResultViewToggleButton');
        const searchWindowBodyLeftSearchFiltersFooterCloseButtonEl = document.getElementById('searchWindowBodyLeftSearchFiltersFooterCloseButton');

        searchWindowHeaderSearchInputEl.setAttribute('style', `--placeholderColor: ${userProfileExport.mainUserSettings.windows.window.font.color}70; box-shadow: 0 4px 10px ${userProfileExport.mainUserSettings.windows.window.font.color}20;`);
        searchWindowEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.window.backgroundColor;
        searchWindowEl.style.borderLeft = `${userProfileExport.mainUserSettings.windows.window.border.left.width}px ${userProfileExport.mainUserSettings.windows.window.border.left.style} ${userProfileExport.mainUserSettings.windows.window.border.left.color}`;
        searchWindowEl.style.borderTop = `${userProfileExport.mainUserSettings.windows.window.border.top.width}px ${userProfileExport.mainUserSettings.windows.window.border.top.style} ${userProfileExport.mainUserSettings.windows.window.border.top.color}`;
        searchWindowEl.style.borderRight = `${userProfileExport.mainUserSettings.windows.window.border.right.width}px ${userProfileExport.mainUserSettings.windows.window.border.right.style} ${userProfileExport.mainUserSettings.windows.window.border.right.color}`;
        searchWindowEl.style.borderBottom = `${userProfileExport.mainUserSettings.windows.window.border.bottom.width}px ${userProfileExport.mainUserSettings.windows.window.border.bottom.style} ${userProfileExport.mainUserSettings.windows.window.border.bottom.color}`;
        searchWindowEl.style.borderRadius = `${userProfileExport.mainUserSettings.windows.window.border.left.radius}px ${userProfileExport.mainUserSettings.windows.window.border.top.radius}px ${userProfileExport.mainUserSettings.windows.window.border.right.radius}px ${userProfileExport.mainUserSettings.windows.window.border.bottom.radius}px`;
        searchWindowEl.style.color = userProfileExport.mainUserSettings.windows.window.font.color;
        searchWindowEl.style.fontFamily = userProfileExport.mainUserSettings.windows.window.font.fontFamily;
        searchWindowEl.style.fontSize = `${userProfileExport.mainUserSettings.windows.window.font.fontSize}px`;
        searchWindowEl.style.fontStyle = userProfileExport.mainUserSettings.windows.window.font.fontStyle;
        searchWindowEl.style.fontWeight = userProfileExport.mainUserSettings.windows.window.font.fontWeight;
        searchWindowBodyLeftSearchFiltersContentResultViewToggleButtonEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
        searchWindowBodyLeftSearchFiltersFooterCloseButtonEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
        Object.assign(searchWindowBodyLeftSearchFiltersFooterCloseButtonEl.style, userProfileExport.mainUserSettings.windows.button.secondary.font);

        searchWindowBodyLeftSearchFiltersElArray.forEach((el, index) => {
            if (index % 2) {
                el.style.backgroundColor = colorPalette[1];
            } else {
                el.style.backgroundColor = colorPalette[2];
            }
        });
    }
    setStylesToSearchWindowUi();

    /**
     * Sets the default values for the search manager.
     * @function setDefaultValuesToSearchManager
     */
    const setDefaultValuesToSearchManager = () => {
        const searchWindowHeaderSearchInputEl = document.getElementById('searchWindowHeaderSearchInput');
        const searchWindowBodyLeftSearchFiltersContentIncludeBrowserBookmarksToggleEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentIncludeBrowserBookmarksToggle');
        const searchWindowBodyLeftSearchFiltersContentIncludeSearchInUrlsToggleEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentIncludeSearchInUrlsToggle');
        const searchWindowBodyLeftSearchFiltersContentDateStartedContentInputDateEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentDateStartedContentInputDate');
        const searchWindowBodyLeftSearchFiltersContentDateStartedContentInputTimeEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentDateStartedContentInputTime');
        const searchWindowBodyLeftSearchFiltersContentDateEndedContentInputDateEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentDateEndedContentInputDate');
        const searchWindowBodyLeftSearchFiltersContentDateEndedContentInputTimeEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentDateEndedContentInputTime');
        const searchWindowBodyLeftSearchFiltersContentIncludeBookmarksToggleEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentIncludeBookmarksToggle');
        const searchWindowBodyLeftSearchFiltersContentIncludeFoldersToggleEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentIncludeFoldersToggle');
        const searchWindowBodyLeftSearchFiltersContentResultViewTitleEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentResultViewTitle');
        const searchWindowBodyLeftSearchFiltersContentResultViewToggleButtonEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentResultViewToggleButton');
        const currentDate = new Date();
        const year = currentDate.getFullYear(); // Get the full year (yyyy)
        const day = String(currentDate.getDate()).padStart(2, '0'); // Get the day (dd), padded to 2 digits
        const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Get the month (mm), padded to 2 digits (months are 0-indexed)
        const hours = String(currentDate.getHours()).padStart(2, '0');
        const minutes = String(currentDate.getMinutes() + 1).padStart(2, '0');

        searchWindowHeaderSearchInputEl.value = searchObject.searchText;
        searchWindowBodyLeftSearchFiltersContentIncludeBrowserBookmarksToggleEl.checked = searchObject.includedBrowserBookmarks;
        searchWindowBodyLeftSearchFiltersContentIncludeSearchInUrlsToggleEl.checked = searchObject.includedSearchInUrls;
        searchWindowBodyLeftSearchFiltersContentDateStartedContentInputDateEl.value = '';
        searchWindowBodyLeftSearchFiltersContentDateStartedContentInputTimeEl.style.display = 'none';
        searchWindowBodyLeftSearchFiltersContentDateStartedContentInputTimeEl.value = '';
        searchWindowBodyLeftSearchFiltersContentDateEndedContentInputDateEl.value = `${year}-${month}-${day}`;
        searchWindowBodyLeftSearchFiltersContentDateEndedContentInputTimeEl.value = `${hours}:${minutes}`;
        searchObject.createdBeforeDate = `${year}-${month}-${day}`;
        searchObject.createdBeforeTime = `${hours}:${minutes}`;
        searchWindowBodyLeftSearchFiltersContentIncludeBookmarksToggleEl.checked = searchObject.includeBookmarks;
        searchWindowBodyLeftSearchFiltersContentIncludeFoldersToggleEl.checked = searchObject.includeBookmarks;
        searchObject.view = 'list';
        if (searchObject.view === 'list') {
            searchWindowBodyLeftSearchFiltersContentResultViewTitleEl.innerText = currentLanguageTextObj._searchManagerUI._allFilters.chooseCompactView;
            searchWindowBodyLeftSearchFiltersContentResultViewToggleButtonEl.innerHTML = DOMPurify.sanitize(viewAsCompactIconSVG);
        } else if (searchObject.view === 'compact') {
            searchWindowBodyLeftSearchFiltersContentResultViewTitleEl.innerText = currentLanguageTextObj._searchManagerUI._allFilters.chooseListView;
            searchWindowBodyLeftSearchFiltersContentResultViewToggleButtonEl.innerHTML = DOMPurify.sanitize(viewAsListIconSVG);
        }
    }
    setDefaultValuesToSearchManager();

    /**
     * Copy a given text to the clipboard.
     * @param {string} text The text to be copied.
     */
    const copyTextToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            showMessageToastify('info', ``, `URL copied to clipboard successfully!`, 4000, false, 'bottom', 'right', true);
        }, () => {
            showMessageToastify('error', ``, `Failed to copy URL. Please try again.`, 4000, false, 'bottom', 'right', true);
        });
    }

    const showSearchResultToUi = () => {
        const searchWindowBodyRightResultsEl = document.getElementById('searchWindowBodyRightResults');
        let messageHtml = ''
        let searchWindowBodyRightResultsHtmlBrowser = '';
        let searchWindowBodyRightResultsHtmlExtension = '';
        let browserBookmarksTooltipArray = [];
        let extensionBookmarksTooltipArray = [];
        let browserBookmarksDetailInfo = [];

        // Validate the search view
        if (!['list', 'compact'].includes(searchObject.view)) {
            showMessageToastify('error', ``, `The search view only allowed 'list' or 'compact'`, 4000, false, 'bottom', 'right', true);
            return;
        }

        // Display a message when there are no bookmarks and a search term is not entered
        if (filteredBrowserBookmarks.length === 0 && filteredExtensionBookmarks.length === 0 && searchObject.searchText.trim().length === 0) {
            messageHtml = `
                <div id="messageBox">
                    <div id="messageSearching" style="border-color: ${userProfileExport.mainUserSettings.windows.window.font.color}; box-shadow: 0 2px 10px ${userProfileExport.mainUserSettings.windows.window.font.color}80; background-color: ${colorPalette[2]};">
                        <div id="messageSearchingTitle">${currentLanguageTextObj._searchManagerUI._messages._beginSearching._title}</div>
                        <div id="messageSearchingText">${currentLanguageTextObj._searchManagerUI._messages._beginSearching._message}</div>
                    </div>
                </div>
            `;
            searchWindowBodyRightResultsEl.innerHTML = DOMPurify.sanitize(messageHtml);
        }

        // Display a message when there are no bookmarks and a search term is entered
        if (filteredBrowserBookmarks.length === 0 && filteredExtensionBookmarks.length === 0 && searchObject.searchText.trim().length > 0) {
            messageHtml = `
                <div id="messageBox">
                    <div id="messageSearching" style="border-color: ${userProfileExport.mainUserSettings.windows.window.font.color}; box-shadow: 0 2px 10px ${userProfileExport.mainUserSettings.windows.window.font.color}80; background-color: ${colorPalette[3]};">
                        <div id="messageSearchingTitle">${currentLanguageTextObj._searchManagerUI._messages._noResultsFound._title}</div>
                        <div id="messageSearchingText">${currentLanguageTextObj._searchManagerUI._messages._noResultsFound._message}</div>
                    </div>
                </div>
            `;
            searchWindowBodyRightResultsEl.innerHTML = DOMPurify.sanitize(messageHtml);
        }

        // Add each extension bookmark to the List view results
        // This is done by iterating through the filteredExtensionBookmarks and the filteredBrowserBookmarks array
        // and creating a new HTML element for each bookmark
        // The element is then appended to the searchWindowBodyRightResultsEl
        // The element contains the bookmark's title, type, URL and a tooltip
        // The tooltip is used to display the bookmark's title and URL if it is longer than a certain number of characters
        // The element also contains a "more details" button that displays the bookmark's details in a tooltip when clicked
        if (searchObject.view === 'list' && (filteredBrowserBookmarks.length > 0 || filteredExtensionBookmarks.length > 0)) {
            filteredExtensionBookmarks.forEach((item, index) => {
                const backgroundStyle = item.style.bookmark.image.backgroundBase64.length === 0 ? `background-color: ${item.style.bookmark.color.backgroundColor}` : `background-image: url(${item.style.bookmark.image.backgroundBase64})`;
                searchWindowBodyRightResultsHtmlExtension += `
                    <div class="bookmarkElementList" data-id="${item.id}" data-type="extension" style="background-color: ${index % 2 ? colorPalette[1] : colorPalette[2]}">
                        <div class="bookmarkElementListIcon" style="${backgroundStyle}" data-id="${item.id}" data-type="extension"></div>
                        <div class="bookmarkElementListDetails" data-id="${item.id}" data-type="extension" style="color: ${item.style.bookmark.font.color};background-color: ${item.style.bookmark.text.backgroundColor};">
                            <div class="bookmarkElementListTitle bookmarkTooltipTitle" data-id="${item.id}" data-type="extension">${escapeHtml(item.title)}</div>
                            <div class="bookmarkElementListDetailsInfo" data-id="${item.id}" data-type="extension">
                                <div class="bookmarkElementListDetailsType" data-id="${item.id}" data-type="extension">
                                    <div class="bookmarkElementListDetailsTypeIcon" data-id="${item.id}" data-type="extension">${item.type === 'bookmark' ? bookmarkIconSVG : folderIconSVG}</div>
                                    <div class="bookmarkElementListDetailsTypeTitle" data-id="${item.id}" data-type="extension">${item.type === 'bookmark' ? currentLanguageTextObj._searchManagerUI._bookmarkTypes.bookmark : currentLanguageTextObj._searchManagerUI._bookmarkTypes.folder}</div>
                                </div>
                                <div class="bookmarkElementListDetailsUrl" data-id="${item.id}" data-type="extension" style="display: ${item.type === 'bookmark' ? 'flex' : 'none'}">
                                <div class="bookmarkElementListDetailsUrlTitle" data-id="${item.id}" data-type="extension">URL:</div>
                                <div class="bookmarkElementListDetailsUrlLink bookmarkTooltipUrl" data-id="${item.id}" data-type="extension">${item.url}</div>
                                </div>
                            </div>
                        </div>
                        <div class="bookmarkMoreDetails" data-id="${item.id}" data-type="extension" style="background-color: ${userProfileExport.mainUserSettings.windows.button.primary.backgroundColor}">${infoBookmarkIconSVG}</div>
                    </div>
                `;
                // Add the long title and URL to the tooltip array so that they can be shown in a tooltip.
                // The title is added if it's longer than 60 characters, and the URL is added if it's longer than 50 characters.
                // The tooltip is created in the createTooltipForLongBookmarksTitlesAndUrls() function.
                if (item.title.trim().length > 60) {
                    extensionBookmarksTooltipArray.push({ id: item.id, title: item.title, type: 'title' });
                }
                if (item.url.trim().length > 50) {
                    extensionBookmarksTooltipArray.push({ id: item.id, title: item.url, type: 'url' });
                }
            });

            // Add each extension bookmark to the list view results
            // Loops through the filtered browser bookmarks and builds the HTML for each one.
            // Also adds the long titles and URLs to the tooltip array.
            // Gets the parent folder information for each browser bookmark.
            if (searchObject.includedBrowserBookmarks) {
                filteredBrowserBookmarks.forEach(async (item, index) => {
                    searchWindowBodyRightResultsHtmlBrowser += `
                        <div class="bookmarkElementList" data-id="${item.id}" data-type="browser" style="background-color: ${index % 2 ? colorPalette[1] : colorPalette[2]}">
                            <div class="bookmarkElementListIcon" style="" data-id="${item.id}" data-type="browser">${firefoxLogoSVG}</div>
                            <div class="bookmarkElementListDetails" data-id="${item.id}" data-type="browser" style="">
                                <div class="bookmarkElementListTitle bookmarkTooltipTitle" data-id="${item.id}" data-type="browser">${escapeHtml(item.title)}</div>
                                <div class="bookmarkElementListDetailsInfo" data-id="${item.id}" data-type="browser">
                                    <div class="bookmarkElementListDetailsType" data-id="${item.id}" data-type="browser">
                                        <div class="bookmarkElementListDetailsTypeIcon" data-id="${item.id}" data-type="browser">${item.type === 'bookmark' ? bookmarkIconSVG : folderIconSVG}</div>
                                        <div class="bookmarkElementListDetailsTypeTitle" data-id="${item.id}" data-type="browser">${item.type === 'bookmark' ? currentLanguageTextObj._searchManagerUI._bookmarkTypes.bookmark : currentLanguageTextObj._searchManagerUI._bookmarkTypes.folder}</div>
                                    </div>
                                    <div class="bookmarkElementListDetailsUrl" data-id="${item.id}" data-type="browser" style="display: ${item.type === 'bookmark' ? 'flex' : 'none'}">
                                    <div class="bookmarkElementListDetailsUrlTitle" data-id="${item.id}" data-type="browser">URL:</div>
                                    <div class="bookmarkElementListDetailsUrlLink bookmarkTooltipUrl" data-id="${item.id}" data-type="browser">${item.url}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="bookmarkMoreDetails" data-id="${item.id}" data-type="browser" style="background-color: ${userProfileExport.mainUserSettings.windows.button.primary.backgroundColor}">${infoBookmarkIconSVG}</div>
                        </div>
                    `;

                    // If the title is too long, add it to the tooltip array
                    if (item.title.trim().length > 60) {
                        browserBookmarksTooltipArray.push({ id: item.id, title: item.title, type: 'title' });
                    }
                    // If the URL is too long, add it to the tooltip array
                    if (item.url !== undefined && item.url.trim().length > 20) {
                        browserBookmarksTooltipArray.push({ id: item.id, title: item.url, type: 'url' });
                    }
                    // Get the parent folder information for the browser bookmark
                    browser.bookmarks.get(item.parentId).then(bookmark => {
                        browserBookmarksDetailInfo.push({ item: item, parent: bookmark[0] });
                    });
                });
            }

            // Builds the HTML for the search results in the list view.
            searchWindowBodyRightResultsEl.innerHTML = DOMPurify.sanitize(`
                <div id="searchWindowBodyRightResultsHtmlList">
                    <div id="searchWindowBodyRightResultsExtensionList">
                        <div id="searchWindowBodyRightResultsExtensionListTitle" style="display: ${searchObject.includedBrowserBookmarks ? searchObject.searchText.trim().length > 0 ? 'flex' : 'none' : 'none'}">${filteredExtensionBookmarks.length} &nbsp;<div id="searchWindowBodyRightResultsExtensionListTitle">${filteredExtensionBookmarks.length === 1 ? currentLanguageTextObj._searchManagerUI._searchTitleResultSeparation._extension._singularForm : currentLanguageTextObj._searchManagerUI._searchTitleResultSeparation._extension._pluralForm}</div></div>
                        <div id="searchWindowBodyRightResultsExtensionListBookmarks">${searchWindowBodyRightResultsHtmlExtension}</div>
                    </div>
                    <div id="searchWindowBodyRightResultsBrowserList" style="display: ${searchObject.includedBrowserBookmarks ? searchObject.searchText.trim().length > 0 ? 'flex' : 'none' : 'none'}">
                        <div id="searchWindowBodyRightResultsBrowserListTitle">${filteredBrowserBookmarks.length} &nbsp;<div id="searchWindowBodyRightResultsBrowserListTitleText">${filteredBrowserBookmarks.length === 1 ? currentLanguageTextObj._searchManagerUI._searchTitleResultSeparation._browser._singularForm : currentLanguageTextObj._searchManagerUI._searchTitleResultSeparation._browser._pluralForm}</div></div>
                        <div id="searchWindowBodyRightResultsBrowserListBookmarks">${searchWindowBodyRightResultsHtmlBrowser}</div>
                    </div>
                </div>
            `);

            /**
             * Adds event listeners to each bookmark element in the list view.
             *
             * @function addEventListenersToBookmarkElementList
             * @returns {void}
             */
            const addEventListenersToBookmarkElementList = () => {
                const bookmarkElementListArray = document.querySelectorAll('.bookmarkElementList');

                /**
                 * Handles mouse down events on bookmark elements.
                 *
                 * @param {MouseEvent} event - The mouse event object.
                 * @returns {void}
                 */
                const handleMouseDown = (event) => {
                    const id = event.target.dataset.id;
                    if (event.target.dataset.type === 'extension') {
                        const findBookmarkById = findBookmarkByKey(userProfileExport.currentUserBookmarks, id);
                        if (!findBookmarkById) {
                            showMessageToastify('error', ``, `Unable to open the selected item.`, 4000, false, 'bottom', 'right', true);
                            return;
                        }
                        if (findBookmarkById.type === 'folder' && event.button === 0) {
                            userProfileExport.currentFolderId = id;
                            searchManager('close');
                            createCurrentBookmarkFolder();
                        } else if (findBookmarkById.type === 'bookmark') {
                            if (event.button === 0 && !event.ctrlKey) {
                                window.open(findBookmarkById.url, '_self');
                            } else if (event.button === 1 || (event.button === 0 && event.ctrlKey)) {
                                browser.tabs.create({ url: findBookmarkById.url });
                            } else if (event.button === 2) {
                                copyTextToClipboard(findBookmarkById.url);
                            }
                        }
                    } else if (event.target.dataset.type === 'browser') {
                        browser.bookmarks.get(id).then(bookmark => {
                            if (bookmark[0].type === 'folder') {
                                showMessageToastify('info', ``, `Unable to open this browser folder directly from here. Please open it manually in your browser's bookmark manager.`, 5000, false, 'bottom', 'right', true);
                            } if (bookmark[0].type === 'bookmark') {
                                if (event.button === 0 && !event.ctrlKey) {
                                    window.open(bookmark[0].url, '_self');
                                } else if (event.button === 1 || (event.button === 0 && event.ctrlKey)) {
                                    browser.tabs.create({ url: bookmark[0].url });
                                } else if (event.button === 2) {
                                    copyTextToClipboard(bookmark[0].url);
                                }
                            }
                        }).catch(error => {
                            showMessageToastify('error', ``, `Unable to open the selected URL. Please open it manually in your browser's bookmark manager.`, 4000, false, 'bottom', 'right', true);
                        });
                    }
                }

                bookmarkElementListArray.forEach(el => {
                    el.addEventListener('mousedown', handleMouseDown);
                });
            }
            addEventListenersToBookmarkElementList();

            // Add each extension bookmark to the compact view results
            // This is done by iterating through the filteredExtensionBookmarks and the filteredBrowserBookmarks array
            // and creating a new HTML element for each bookmark
            // The element is then appended to the searchWindowBodyRightResultsEl
            // The element contains the bookmark's title, type, and a tooltip
            // The tooltip is used to display the bookmark's title if it is longer than 20 characters
            // The element also contains a "more details" button that displays the bookmark's details in a tooltip when clicked
        } else if (searchObject.view === 'compact' && (filteredBrowserBookmarks.length > 0 || filteredExtensionBookmarks.length > 0)) {
            filteredExtensionBookmarks.forEach((item, index) => {
                const backgroundStyle = item.style.bookmark.image.backgroundBase64.length === 0 ? `background-color: ${item.style.bookmark.color.backgroundColor}` : `background-image: url(${item.style.bookmark.image.backgroundBase64})`;
                searchWindowBodyRightResultsHtmlExtension += `
                    <div class="bookmarkElementCompact" data-id="${item.id}" data-type="extension" style="background-color: ${index % 2 ? colorPalette[1] : colorPalette[2]}">
                        <div class="bookmarkElementCompactIcon" style="${backgroundStyle}" data-id="${item.id}" data-type="extension"></div>
                        <div class="bookmarkElementCompactDetails" data-id="${item.id}" data-type="extension" style="color: ${item.style.bookmark.font.color};background-color: ${item.style.bookmark.text.backgroundColor};">
                            <div class="bookmarkElementCompactTitle bookmarkTooltipTitle" data-id="${item.id}" data-type="extension">${escapeHtml(item.title)}</div>
                            <div class="bookmarkElementCompactDetailsInfo" data-id="${item.id}" data-type="extension">
                                <div class="bookmarkElementCompactDetailsTypeIcon" data-id="${item.id}" data-type="extension">${item.type === 'bookmark' ? bookmarkIconSVG : folderIconSVG}</div>
                                <div class="bookmarkElementCompactDetailsTypeTitle" data-id="${item.id}" data-type="extension">${item.type === 'bookmark' ? currentLanguageTextObj._searchManagerUI._bookmarkTypes.bookmark : currentLanguageTextObj._searchManagerUI._bookmarkTypes.folder}</div>
                            </div>
                        </div>
                        <div class="bookmarkMoreDetails" data-id="${item.id}" data-type="extension" style="background-color: ${userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor}">${infoBookmarkIconSVG}</div>
                    </div>
                `;
                // Add a tooltip to the compact view bookmark element if the title is longer than 20 characters
                // This is done to prevent the title from overflowing the element
                if (item.title.trim().length >= 20) {
                    extensionBookmarksTooltipArray.push({ id: item.id, title: item.title, type: 'title' });
                }
            });

            // If the user has chosen to include browser bookmarks in the search results
            if (searchObject.includedBrowserBookmarks) {
                // Iterate through each of the filtered browser bookmarks
                filteredBrowserBookmarks.forEach(async (item, index) => {
                    searchWindowBodyRightResultsHtmlBrowser += `
                        <div class="bookmarkElementCompact" data-id="${item.id}" data-type="browser" style="background-color: ${index % 2 ? colorPalette[1] : colorPalette[2]}">
                            <div class="bookmarkElementCompactIcon" data-id="${item.id}" data-type="browser">${firefoxLogoSVG}</div>
                            <div class="bookmarkElementCompactDetails" data-id="${item.id}" data-type="browser">
                                <div class="bookmarkElementCompactTitle bookmarkTooltipTitle" data-id="${item.id}" data-type="browser">${escapeHtml(item.title)}</div>
                                <div class="bookmarkElementCompactDetailsInfo" data-id="${item.id}" data-type="browser">
                                    <div class="bookmarkElementCompactDetailsTypeIcon" data-id="${item.id}" data-type="browser">${item.type === 'bookmark' ? bookmarkIconSVG : folderIconSVG}</div>
                                    <div class="bookmarkElementCompactDetailsTypeTitle" data-id="${item.id}" data-type="browser">${item.type === 'bookmark' ? currentLanguageTextObj._searchManagerUI._bookmarkTypes.bookmark : currentLanguageTextObj._searchManagerUI._bookmarkTypes.folder}</div>
                                </div>
                            </div>
                            <div class="bookmarkMoreDetails" data-id="${item.id}" data-type="browser" style="background-color: ${userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor}">${infoBookmarkIconSVG}</div>
                        </div>
                    `;
                    // Check if the title is longer than 20 characters
                    // If true, add it to the browserBookmarksTooltipArray
                    // so that the tooltip can be created later
                    if (item.title.trim().length >= 20) {
                        browserBookmarksTooltipArray.push({ id: item.id, title: item.title, type: 'title' });
                    }

                    // Get the parent of the bookmark
                    // by using the parentId property
                    // Then, add the parent and the item to the browserBookmarksDetailInfo
                    // so that the parent details can be accessed later
                    browser.bookmarks.get(item.parentId).then(bookmark => {
                        browserBookmarksDetailInfo.push({ item: item, parent: bookmark[0] });
                    });
                });
            }

            // Create the HTML for the results
            searchWindowBodyRightResultsEl.innerHTML = DOMPurify.sanitize(`
                <div id="searchWindowBodyRightResultsHtmlCompact">
                    <div id="searchWindowBodyRightResultsExtensionCompact">
                        <div id="searchWindowBodyRightResultsExtensionCompactTitle" style="display: ${searchObject.includedBrowserBookmarks ? searchObject.searchText.trim().length > 0 ? 'flex' : 'none' : 'none'}">${filteredExtensionBookmarks.length} &nbsp;<div id="searchWindowBodyRightResultsExtensionCompactTitle">${filteredExtensionBookmarks.length === 1 ? currentLanguageTextObj._searchManagerUI._searchTitleResultSeparation._extension._singularForm : currentLanguageTextObj._searchManagerUI._searchTitleResultSeparation._extension._pluralForm}</div></div>
                        <div id="searchWindowBodyRightResultsExtensionCompactBookmarks">${searchWindowBodyRightResultsHtmlExtension}</div>
                    </div>
                    <div id="searchWindowBodyRightResultsBrowserCompact" style="display: ${searchObject.includedBrowserBookmarks ? searchObject.searchText.trim().length > 0 ? 'flex' : 'none' : 'none'}">
                        <div id="searchWindowBodyRightResultsBrowserCompactTitle">${filteredBrowserBookmarks.length} &nbsp;<div id="searchWindowBodyRightResultsBrowserCompactTitle">${filteredBrowserBookmarks.length === 1 ? currentLanguageTextObj._searchManagerUI._searchTitleResultSeparation._browser._singularForm : currentLanguageTextObj._searchManagerUI._searchTitleResultSeparation._browser._pluralForm}</div></div>
                        <div id="searchWindowBodyRightResultsBrowserCompactBookmarks">${searchWindowBodyRightResultsHtmlBrowser}</div>
                    </div>
                </div>
            `);

            /**
             * Adds event listeners to all bookmark elements in the compact view.
             *
             * @function addEventListenersToBookmarkElementCompact
             * @returns {void}
             */
            const addEventListenersToBookmarkElementCompact = () => {
                const bookmarkElementCompactArray = document.querySelectorAll('.bookmarkElementCompact');

                /**
                 * Handles mouse down events on bookmark elements.
                 *
                 * @param {MouseEvent} event - The mouse event object.
                 * @returns {void}
                 */
                const handleMouseDown = (event) => {
                    const id = event.target.dataset.id;
                    if (event.target.dataset.type === 'extension') {
                        const findBookmarkById = findBookmarkByKey(userProfileExport.currentUserBookmarks, id);
                        if (!findBookmarkById) {
                            showMessageToastify('error', ``, `Unable to open the selected item.`, 4000, false, 'bottom', 'right', true);
                            return;
                        }
                        if (findBookmarkById.type === 'folder' && event.button === 0) {
                            userProfileExport.currentFolderId = id;
                            searchManager('close');
                            createCurrentBookmarkFolder();
                        } else if (findBookmarkById.type === 'bookmark') {
                            if (event.button === 0 && !event.ctrlKey) {
                                window.open(findBookmarkById.url, '_self');
                            } else if (event.button === 1 || (event.button === 0 && event.ctrlKey)) {
                                browser.tabs.create({ url: findBookmarkById.url });
                            } else if (event.button === 2) {
                                copyTextToClipboard(findBookmarkById.url);
                            }
                        }
                    } else if (event.target.dataset.type === 'browser') {
                        browser.bookmarks.get(id).then(bookmark => {
                            if (bookmark[0].type === 'folder') {
                                showMessageToastify('info', ``, `Unable to open this browser folder directly from here. Please open it manually in your browser's bookmark manager.`, 5000, false, 'bottom', 'right', true);
                            } if (bookmark[0].type === 'bookmark') {
                                if (event.button === 0 && !event.ctrlKey) {
                                    window.open(bookmark[0].url, '_self');
                                } else if (event.button === 1 || (event.button === 0 && event.ctrlKey)) {
                                    browser.tabs.create({ url: bookmark[0].url });
                                } else if (event.button === 2) {
                                    copyTextToClipboard(bookmark[0].url);
                                }
                            }
                        }).catch(error => {
                            showMessageToastify('error', ``, `Unable to open the selected URL. Please open it manually in your browser's bookmark manager.`, 4000, false, 'bottom', 'right', true);
                        });
                    }
                }

                bookmarkElementCompactArray.forEach(el => {
                    el.addEventListener('mousedown', handleMouseDown);
                });
            }
            addEventListenersToBookmarkElementCompact();
        }

        /**
         * Function to create a tooltip for long bookmark names and URLs.
         *
         * @returns {void}
         */
        const createTooltipForLongBookmarksTitlesAndUrls = () => {
            const style = {
                backgroundColor: userProfileExport.mainUserSettings.windows.window.backgroundColor,
                color: userProfileExport.mainUserSettings.windows.window.font.color,
                padding: '5px',
                borderRadius: '5px',
                border: `1px solid ${backgroundColorBrightness}`,
                fontSize: `${userProfileExport.mainUserSettings.windows.window.font.fontSize}px`,
                fontWeight: userProfileExport.mainUserSettings.windows.window.font.fontWeight,
                fontFamily: userProfileExport.mainUserSettings.windows.window.font.fontFamily,
                overflowWrap: 'break-word',
                maxWidth: '600px'
            }
            const underlineStyle = {
                textDecorationColor: userProfileExport.mainUserSettings.windows.window.font.color,
                textDecorationLine: 'underline',
                textDecorationStyle: 'dotted',
            }
            extensionBookmarksTooltipArray.forEach(item => {
                const findBookmarkById = findBookmarkByKey(userProfileExport.currentUserBookmarks, item.id);
                underlineStyle.textDecorationColor = findBookmarkById.style.bookmark.font.color;
                if (item.type === 'title') {
                    const bookmarkTitle = document.querySelector(`.bookmarkTooltipTitle[data-id="${item.id}"]`);
                    Object.assign(bookmarkTitle.style, underlineStyle);
                    createTooltip(bookmarkTitle, 'top', item.title, style);
                } else if (item.type === 'url') {
                    const bookmarkUrl = document.querySelector(`.bookmarkTooltipUrl[data-id="${item.id}"]`);
                    Object.assign(bookmarkUrl.style, underlineStyle);
                    createTooltip(bookmarkUrl, 'top', item.title, style);
                }
            });
            browserBookmarksTooltipArray.forEach(item => {
                if (item.type === 'title') {
                    const bookmarkTitle = document.querySelector(`.bookmarkTooltipTitle[data-id="${item.id}"]`);
                    Object.assign(bookmarkTitle.style, underlineStyle);
                    createTooltip(bookmarkTitle, 'top', item.title, style);
                } else if (item.type === 'url') {
                    const bookmarkUrl = document.querySelector(`.bookmarkTooltipUrl[data-id="${item.id}"]`);
                    Object.assign(bookmarkUrl.style, underlineStyle);
                    createTooltip(bookmarkUrl, 'top', item.title, style);
                }
            });
        }
        createTooltipForLongBookmarksTitlesAndUrls();

        /**
         * Creates a details element for a bookmark.
         * @function createDetailsUI
         * @param {string} id - The id of the bookmark.
         * @param {string} type - The type of the bookmark, either 'extension' or 'browser'.
         * @returns {Object} An object with methods to manage the details element.
         * @property {function} updatePosition - Updates the position of the details element based on the user's mouse position.
         * @property {function} remove - Removes the element from the DOM.
         */
        const createDetailsUI = (id, type) => {
            let findBookmarkById, findBookmarkParentById;
            if (type === 'extension') {
                findBookmarkById = findBookmarkByKey(userProfileExport.currentUserBookmarks, id);
                findBookmarkParentById = findBookmarkByKey(userProfileExport.currentUserBookmarks, findBookmarkById.parentId);
            } else if (type === 'browser') {
                const currentBookmarkObject = browserBookmarksDetailInfo.find(obj => obj.item.id === id);
                findBookmarkById = currentBookmarkObject.item;
                findBookmarkParentById = currentBookmarkObject.parent;
            }
            const differentTimeEdit = findBookmarkById.dateAdded !== findBookmarkById.lastEdited && findBookmarkById.lastEdited !== undefined;
            // Create the details element
            const detailsElement = document.createElement('div');
            detailsElement.className = 'moreDetails';
            detailsElement.style.backgroundColor = userProfileExport.mainUserSettings.windows.window.backgroundColor;
            detailsElement.style.borderColor = backgroundColorBrightness;
            detailsElement.style.color = userProfileExport.mainUserSettings.windows.window.font.color;
            detailsElement.style.fontSize = `${userProfileExport.mainUserSettings.windows.window.font.fontSize}px`;
            detailsElement.style.fontWeight = userProfileExport.mainUserSettings.windows.window.font.fontWeight;
            detailsElement.style.fontFamily = userProfileExport.mainUserSettings.windows.window.font.fontFamily;
            detailsElement.style.fontStyle = userProfileExport.mainUserSettings.windows.window.font.fontStyle;
            detailsElement.innerHTML = DOMPurify.sanitize(`
                <div class="moreDetailsItems">
                    <div class="moreDetailsItemsTitle">${currentLanguageTextObj._searchManagerUI._bookmarkAdditionalInformation.created}</div>
                    <div class="moreDetailsItemsInfo moreDetailsItemsDate">${formatDateTime(findBookmarkById.dateAdded, currentLanguage, 'dateAndTime')}</div>
                </div>
                <div class="moreDetailsItems" style="display: ${differentTimeEdit ? 'flex' : 'none'}">
                    <div class="moreDetailsItemsTitle">${currentLanguageTextObj._searchManagerUI._bookmarkAdditionalInformation.edited}</div>
                    <div class="moreDetailsItemsInfo moreDetailsItemsDate">${formatDateTime(findBookmarkById.lastEdited, currentLanguage, 'dateAndTime')}</div>
                </div>
                <div class="moreDetailsItems" style="display: ${findBookmarkById.type === 'bookmark' ? 'flex' : 'none'}">
                    <div class="moreDetailsItemsTitle">${currentLanguageTextObj._searchManagerUI._bookmarkAdditionalInformation.url}</div>
                    <div class="moreDetailsItemsInfo">
                        <div class="moreDetailsItemsInfoUrl">${findBookmarkById.url}</div>
                    </div>
                </div>
                <div class="moreDetailsItems">
                    <div class="moreDetailsItemsTitle">${currentLanguageTextObj._searchManagerUI._bookmarkAdditionalInformation.parentFolder}</div>
                    <div class="moreDetailsItemsInfo">
                        <div class="moreDetailsItemsInfoFolder">${findBookmarkParentById.title}</div>
                    </div>
                </div>
            `);
            document.body.appendChild(detailsElement); // Append to body for positioning

            /**
             * Set styles to details items.
             * @function setStylesToDetailsItems
             */
            const setStylesToDetailsItems = () => {
                const moreDetailItemsElArray = document.querySelectorAll('.moreDetailsItems');

                moreDetailItemsElArray.forEach((el, index) => {
                    if (index % 2) {
                        el.style.backgroundColor = colorPalette[1];
                    } else {
                        el.style.backgroundColor = colorPalette[0];
                    }
                });
            }
            setStylesToDetailsItems();

            /**
             * Creates a marquee effect for long text in the details section.
             * Applies the effect to URL and folder elements based on bookmark type.
             */
            const createMarqueeEffect = () => {
                const moreDetailsItemsInfoEl = document.querySelector('.moreDetailsItemsInfo');
                const moreDetailsItemsInfoFolderEl = document.querySelector('.moreDetailsItemsInfoFolder');
                if (findBookmarkById.type === 'bookmark') {
                    const moreDetailsItemsInfoUrlEl = document.querySelector('.moreDetailsItemsInfoUrl');
                    translateUserName(moreDetailsItemsInfoEl, moreDetailsItemsInfoUrlEl);
                }
                translateUserName(moreDetailsItemsInfoEl, moreDetailsItemsInfoFolderEl);
            }
            createMarqueeEffect();

            /**
             * Updates the position of the details element based on the user's mouse position.
             * @function updatePosition
             * @param {MouseEvent} event - The mouse event that triggered the update.
             */
            const updatePosition = (event) => {
                let left = event.clientX - detailsElement.offsetWidth - 10;
                let top = event.clientY - (detailsElement.offsetHeight / 2);

                detailsElement.style.position = 'absolute'; // Set position to absolute
                detailsElement.style.left = `${left}px`; // Set X position
                detailsElement.style.top = `${top}px`; // Set Y position
            };

            // Return an object with methods to manage the details element
            return {
                updatePosition,
                remove: () => {
                    detailsElement.remove(); // Remove the element from the DOM
                }
            };
        };

        /**
         * Handles the hover event for the bookmark elements.
         * @param {MouseEvent} event - The mouse event that triggered the hover.
         */
        const handleBookmarkHover = async (event) => {
            const id = event.currentTarget.dataset.id; // Get the id from data attribute
            const type = event.currentTarget.dataset.type; // Get the type from data attribute
            const detailsUI = createDetailsUI(id, type); // Create the details UI

            // Update position on mouse move
            const moveHandler = (moveEvent) => {
                detailsUI.updatePosition(moveEvent); // Update position based on mouse movement
            };

            // Add event listeners for mouse move and leave
            document.addEventListener('mousemove', moveHandler);
            event.currentTarget.addEventListener('mouseleave', () => {
                detailsUI.remove(); // Remove the details UI on mouse leave
                document.removeEventListener('mousemove', moveHandler); // Clean up the event listener
            });
        };

        /**
         * Initializes the hover functionality for bookmark elements.
         * Attaches a mouse enter event to each bookmark element, which triggers the creation of a details UI.
         */
        const initBookmarkHover = () => {
            const bookmarkElements = document.querySelectorAll('.bookmarkMoreDetails');
            bookmarkElements.forEach(element => {
                element.addEventListener('mouseenter', handleBookmarkHover); // Add mouse enter event
            });
        };
        // Initialize the hover functionality
        initBookmarkHover();
    }
    showSearchResultToUi();

    /**
     * Triggers a search based on the current search object values.
     * Filters the bookmarks in the extension and browser storage based on the search criteria.
     * Updates the search result UI with the filtered bookmarks.
     */
    const startSearchBasedOnValues = () => {
        filteredExtensionBookmarks = [];
        filteredBrowserBookmarks = [];
        if (searchObject.searchText.trim().length === 0) {
            showSearchResultToUi();
            return;
        };

        /**
         * Searches for matching bookmarks based on the provided search criteria.
         * @param {Object} obj - The bookmark object to search through.
         * @param {Object} criteria - The search criteria to apply.
         * @param {boolean} criteria.includedSearchInUrls - Whether to search through URLs.
         * @param {string} criteria.createdAfterDate - The date to search after.
         * @param {string} criteria.createdAfterTime - The time to search after.
         * @param {string} criteria.createdBeforeDate - The date to search before.
         * @param {string} criteria.createdBeforeTime - The time to search before.
         * @param {boolean} criteria.includeBookmarks - Whether to include bookmarks in the search.
         * @param {boolean} criteria.includeFolders - Whether to include folders in the search.
         * @param {string} criteria.searchText - The search text to match.
         * @param {Array} forbiddenIds - An array of IDs to exclude from the search.
         * @returns {Array<Object>} An array of matching bookmark objects.
         */
        const searchInObject = (obj, criteria) => {
            const {
                includedSearchInUrls,
                createdAfterDate,
                createdAfterTime,
                createdBeforeDate,
                createdBeforeTime,
                includeBookmarks,
                includeFolders,
                searchText
            } = criteria;

            // Initialize an array to hold matching objects
            const results = [];

            // Normalize search text for case-insensitive comparison
            const normalizedSearchText = searchText ? searchText.toLowerCase() : '';

            // Check if the object is a bookmark or a folder
            const isBookmark = obj.type === 'bookmark';
            const isFolder = obj.type === 'folder';

            // Check created date criteria
            const createdAfter = new Date(`${createdAfterDate}T${createdAfterTime}`).getTime() || 0;
            const createdBefore = new Date(`${createdBeforeDate}T${createdBeforeTime}`).getTime() || Infinity;
            const dateAdded = obj.dateAdded || 0; // Default to 0 if dateAdded is not defined
            const matchesCreatedDate = dateAdded >= createdAfter && dateAdded <= createdBefore;

            // Check if the title matches the search text (all words must be present in any order)
            const matchesTitle = normalizedSearchText ?
                normalizedSearchText.split(' ').every(word => obj.title.toLowerCase().includes(word)) : false;

            // Check if the ID is forbidden
            const isIdForbidden = !forbiddenIds.includes(obj.id);

            // Include the object if it matches the title and the appropriate type
            if (matchesCreatedDate &&
                ((includeBookmarks && isBookmark && (matchesTitle || (includedSearchInUrls && obj.url.toLowerCase().includes(normalizedSearchText)))) ||
                    (includeFolders && isFolder && matchesTitle)) &&
                isIdForbidden) {
                results.push(obj);
            }

            // If the object is a folder and has children, recursively search through them
            if (isFolder && Array.isArray(obj.children) && obj.children.length > 0) {
                obj.children.forEach(child => {
                    results.push(...searchInObject(child, criteria)); // Spread the results from children
                });
            }

            return results; // Return all matching objects
        };

        const collectMatchingBookmarks = (bookmarks, criteria) => {
            const allMatches = [];
            bookmarks.forEach(bookmark => {
                allMatches.push(...searchInObject(bookmark, criteria)); // Collect matches from each bookmark
            });
            return allMatches; // Return all collected matches
        };

        // Get all matching bookmarks based on search criteria
        filteredExtensionBookmarks = collectMatchingBookmarks(userProfileExport.currentUserBookmarks, searchObject);
        // If the user has chosen to include browser bookmarks in the search, use the same logic to filter them as well
        if (searchObject.includedBrowserBookmarks) {
            // Get all matching bookmarks from the browser's bookmarks array
            filteredBrowserBookmarks = collectMatchingBookmarks(browserBookmarkArray[0].children, searchObject);
        }
        showSearchResultToUi();
    }

    /**
     * Add event listeners to all search manager UI elements.
     * @function addEventListenersToSearchManager
     */
    const addEventListenersToSearchManager = () => {
        const searchWindowHeaderSearchInputEl = document.getElementById('searchWindowHeaderSearchInput');
        const searchWindowBodyLeftSearchFiltersContentIncludeBrowserBookmarksToggleEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentIncludeBrowserBookmarksToggle');
        const searchWindowBodyLeftSearchFiltersContentDateStartedContentInputDateEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentDateStartedContentInputDate');
        const searchWindowBodyLeftSearchFiltersContentDateStartedContentInputTimeEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentDateStartedContentInputTime');
        const searchWindowBodyLeftSearchFiltersContentDateEndedContentInputDateEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentDateEndedContentInputDate');
        const searchWindowBodyLeftSearchFiltersContentDateEndedContentInputTimeEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentDateEndedContentInputTime');
        const searchWindowBodyLeftSearchFiltersContentIncludeSearchInUrlsToggleEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentIncludeSearchInUrlsToggle');
        const searchWindowBodyLeftSearchFiltersContentIncludeBookmarksToggleEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentIncludeBookmarksToggle');
        const searchWindowBodyLeftSearchFiltersContentIncludeFoldersToggleEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentIncludeFoldersToggle');
        const searchWindowBodyLeftSearchFiltersContentResultViewTitleEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentResultViewTitle');
        const searchWindowBodyLeftSearchFiltersContentResultViewToggleButtonEl = document.getElementById('searchWindowBodyLeftSearchFiltersContentResultViewToggleButton');
        const searchWindowBodyLeftSearchFiltersFooterCloseButtonEl = document.getElementById('searchWindowBodyLeftSearchFiltersFooterCloseButton');

        const updateSearchTextInput = () => {
            searchObject.searchText = searchWindowHeaderSearchInputEl.value.trim();
            startSearchBasedOnValues();
        }

        const updateValueToggleIncludeBrowserBookmarks = () => {
            searchObject.includedBrowserBookmarks = searchWindowBodyLeftSearchFiltersContentIncludeBrowserBookmarksToggleEl.checked;
            startSearchBasedOnValues();
        }

        const updateDateCreatedAfterDate = () => {
            const value = searchWindowBodyLeftSearchFiltersContentDateStartedContentInputDateEl.value;
            if (value.length === 0) {
                searchWindowBodyLeftSearchFiltersContentDateStartedContentInputTimeEl.style.display = 'none';
                return;
            }
            searchWindowBodyLeftSearchFiltersContentDateStartedContentInputTimeEl.style.display = 'flex';
            searchObject.createdAfterDate = value.length > 0 ? value : '0000-00-00';;
            startSearchBasedOnValues();
        }

        const updateDateCreatedAfterTime = () => {
            const value = searchWindowBodyLeftSearchFiltersContentDateStartedContentInputTimeEl.value;
            const validateTime = value.length > 0 ? `${value}:00` : '00:00:00';
            searchObject.createdAfterTime = validateTime;
            startSearchBasedOnValues();
        }

        const updateDateCreatedBeforeDate = () => {
            const value = searchWindowBodyLeftSearchFiltersContentDateEndedContentInputDateEl.value;
            if (value.length === 0) {
                searchWindowBodyLeftSearchFiltersContentDateEndedContentInputTimeEl.style.display = 'none';
                return;
            }
            searchWindowBodyLeftSearchFiltersContentDateEndedContentInputTimeEl.style.display = 'flex';
            searchObject.createdBeforeDate = value.length > 0 ? value : '0000-00-00';
            startSearchBasedOnValues();
        }

        const updateDateCreatedBeforeTime = () => {
            const value = searchWindowBodyLeftSearchFiltersContentDateEndedContentInputTimeEl.value;
            const validateTime = value.length > 0 ? `${value}:00` : '00:00:00';
            searchObject.createdBeforeTime = validateTime;
            startSearchBasedOnValues();
        }

        const updateValueToggleIncludeSearchInUrls = () => {
            searchObject.includedSearchInUrls = searchWindowBodyLeftSearchFiltersContentIncludeSearchInUrlsToggleEl.checked;
            startSearchBasedOnValues();
        }

        const updateValueToggleBookmarks = () => {
            if (!searchWindowBodyLeftSearchFiltersContentIncludeBookmarksToggleEl.checked) {
                searchWindowBodyLeftSearchFiltersContentIncludeSearchInUrlsToggleEl.checked = false;
                searchWindowBodyLeftSearchFiltersContentIncludeSearchInUrlsToggleEl.disabled = true;
            } else {
                searchWindowBodyLeftSearchFiltersContentIncludeSearchInUrlsToggleEl.disabled = false;
            }
            searchObject.includeBookmarks = searchWindowBodyLeftSearchFiltersContentIncludeBookmarksToggleEl.checked;
            startSearchBasedOnValues();
        }

        const updateValueToggleFolders = () => {
            searchObject.includeFolders = searchWindowBodyLeftSearchFiltersContentIncludeFoldersToggleEl.checked;
            startSearchBasedOnValues();
        }

        const updateValueToggleView = () => {
            if (searchObject.view === 'compact') {
                searchWindowBodyLeftSearchFiltersContentResultViewTitleEl.innerText = currentLanguageTextObj._searchManagerUI._allFilters.chooseCompactView;
                searchWindowBodyLeftSearchFiltersContentResultViewToggleButtonEl.innerHTML = DOMPurify.sanitize(viewAsCompactIconSVG);
                searchObject.view = 'list';
            } else {
                searchWindowBodyLeftSearchFiltersContentResultViewTitleEl.innerText = currentLanguageTextObj._searchManagerUI._allFilters.chooseListView;
                searchWindowBodyLeftSearchFiltersContentResultViewToggleButtonEl.innerHTML = DOMPurify.sanitize(viewAsListIconSVG);
                searchObject.view = 'compact';
            }
            showSearchResultToUi();
        }

        const updateValueToggleViewMouseEnter = (el) => {
            el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.hoverBackgroundColor;
        }

        const updateValueToggleViewMouseLeave = (el) => {
            el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
        }

        const closeSearchWindow = () => {
            searchManager('close');
        }

        const closeSearchWindowButtonMouseEnter = (el) => {
            el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.hoverBackgroundColor;
        }

        const closeSearchWindowButtonMouseLeave = (el) => {
            el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
        }

        searchWindowHeaderSearchInputEl.addEventListener('input', updateSearchTextInput);
        searchWindowBodyLeftSearchFiltersContentIncludeBrowserBookmarksToggleEl.addEventListener('change', updateValueToggleIncludeBrowserBookmarks);
        searchWindowBodyLeftSearchFiltersContentDateStartedContentInputDateEl.addEventListener('input', updateDateCreatedAfterDate);
        searchWindowBodyLeftSearchFiltersContentDateStartedContentInputTimeEl.addEventListener('input', updateDateCreatedAfterTime);
        searchWindowBodyLeftSearchFiltersContentDateEndedContentInputDateEl.addEventListener('input', updateDateCreatedBeforeDate);
        searchWindowBodyLeftSearchFiltersContentDateEndedContentInputTimeEl.addEventListener('input', updateDateCreatedBeforeTime);
        searchWindowBodyLeftSearchFiltersContentIncludeSearchInUrlsToggleEl.addEventListener('change', updateValueToggleIncludeSearchInUrls);
        searchWindowBodyLeftSearchFiltersContentIncludeBookmarksToggleEl.addEventListener('change', updateValueToggleBookmarks);
        searchWindowBodyLeftSearchFiltersContentIncludeFoldersToggleEl.addEventListener('change', updateValueToggleFolders);
        searchWindowBodyLeftSearchFiltersContentResultViewToggleButtonEl.addEventListener('click', updateValueToggleView);
        searchWindowBodyLeftSearchFiltersContentResultViewToggleButtonEl.addEventListener('mouseenter', updateValueToggleViewMouseEnter);
        searchWindowBodyLeftSearchFiltersContentResultViewToggleButtonEl.addEventListener('mouseleave', updateValueToggleViewMouseLeave);
        searchWindowBodyLeftSearchFiltersFooterCloseButtonEl.addEventListener('click', closeSearchWindow);
        searchWindowBodyLeftSearchFiltersFooterCloseButtonEl.addEventListener('mouseenter', closeSearchWindowButtonMouseEnter);
        searchWindowBodyLeftSearchFiltersFooterCloseButtonEl.addEventListener('mouseleave', closeSearchWindowButtonMouseLeave);
    }
    addEventListenersToSearchManager();
}

