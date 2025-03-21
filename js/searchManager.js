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
 *
 * All third-party libraries are included under their respective licenses.
 * For more information, please refer to the documentation of each library.
 */

import { userProfileExport, currentLanguage } from './main.js';
import { showMessageToastify, formatDateTime } from './utilityFunctions.js';

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
    let filteredBookmarks = [];
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

    if (status === 'close') {
        uiElementsContainerEl.style.display = 'none';
        uiElementsContainerEl.innerHTML = '';
        return;
    }

    const otherBodyHTML = `
        <div id="searchWindow">
            <div id="searchWindowHeader">
                <input type="text" id="searchWindowHeaderSearchInput" placeholder="Type to search...">
            </div>
            <div id="searchWindowBody">
                <div id="searchWindowBodyLeft">
                    <div id="searchWindowBodyLeftSearchFilters">
                        <div id="searchWindowBodyLeftSearchFiltersTitle">Filters</div>
                        <div id="searchWindowBodyLeftSearchFiltersContent">
                            <div id="searchWindowBodyLeftSearchFiltersContentIncludeBrowserBookmarks">
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
                            <div id="searchWindowBodyLeftSearchFiltersContentDateStarted">
                                <div id="searchWindowBodyLeftSearchFiltersContentDateStartedTitle">Select Created After</div>
                                <div id="searchWindowBodyLeftSearchFiltersContentDateStartedContent">
                                    <input type="date" id="searchWindowBodyLeftSearchFiltersContentDateStartedContentInputDate">
                                    <input type="time" id="searchWindowBodyLeftSearchFiltersContentDateStartedContentInputTime">
                                </div>
                            </div>
                            <div id="searchWindowBodyLeftSearchFiltersContentDateEnded">
                                <div id="searchWindowBodyLeftSearchFiltersContentDateEndedTitle">Select Created Before</div>
                                <div id="searchWindowBodyLeftSearchFiltersContentDateEndedContent">
                                    <input type="date" id="searchWindowBodyLeftSearchFiltersContentDateEndedContentInputDate">
                                    <input type="time" id="searchWindowBodyLeftSearchFiltersContentDateEndedContentInputTime">
                                </div>
                            </div>
                            <div id="searchWindowBodyLeftSearchFiltersContentIncludeSearchInUrls">
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
                            <div id="searchWindowBodyLeftSearchFiltersContentIncludeBookmarks">
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
                            <div id="searchWindowBodyLeftSearchFiltersContentIncludeFolders">
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
                            <div id="searchWindowBodyLeftSearchFiltersContentResultView">
                                <div id="searchWindowBodyLeftSearchFiltersContentResultViewTitle">Choose Compact View</div>
                                <button id="searchWindowBodyLeftSearchFiltersContentResultViewToggleButton"></button>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="searchWindowBodyRight">
                    <div id="searchWindowBodyRightResults"></div>
                </div>
            </div>
        </div>
    `;

    uiElementsContainerEl.style.display = 'flex';
    uiElementsContainerEl.innerHTML = otherBodyHTML;

    /**
     * Sets the styles of the search window UI based on the user's settings.
     * @private
     */
    const setStylesToSearchWindowUi = () => {
        const searchWindowEl = document.getElementById('searchWindow');

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
    }
    setStylesToSearchWindowUi();

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
        const minutes = String(currentDate.getMinutes()).padStart(2, '0');

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
        searchWindowBodyLeftSearchFiltersContentResultViewTitleEl.innerText = 'Choose Compact View';
        searchWindowBodyLeftSearchFiltersContentResultViewToggleButtonEl.innerHTML = viewAsCompactIconSVG;
        searchObject.view = 'compact';
    }
    setDefaultValuesToSearchManager();

    const showSearchResultToUi = () => {
        const searchWindowBodyRightResultsEl = document.getElementById('searchWindowBodyRightResults');
        let searchWindowBodyRightResultsHtml = ``;

        if (!['list', 'compact'].includes(searchObject.view)) {
            showMessageToastify('error', ``, `The search view only allowed 'list' or 'compact'`, 4000, false, 'bottom', 'right', true);
            return;
        }

        if (filteredBookmarks.length === 0) {
            searchWindowBodyRightResultsHtml = `To start search...`;
        }

        if (searchObject.view === 'list') {
            filteredBookmarks.forEach(element=>{
                const backgroundStyle = element.style.bookmark.image.backgroundBase64.length === 0 ? `background-color: ${element.style.bookmark.color.backgroundColor}` : `background-image: url(${element.style.bookmark.image.backgroundBase64})`;

                searchWindowBodyRightResultsHtml += `
                    <div class="bookmarkElementList" data-id="${element.id}">
                        <div class="bookmarkElementListIcon" style="${backgroundStyle}" data-id="${element.id}"></div>
                        <div class="bookmarkElementListDetails" data-id="${element.id}">
                            <div class="bookmarkElementListTitle" data-id="${element.id}">${element.title}</div>
                            <div class="bookmarkElementListDetailsInfo" data-id="${element.id}">
                                <div class="bookmarkElementListDetailsType" data-id="${element.id}">${element.type === 'bookmark' ? 'Bookmark' : 'Folder'}</div>
                                <div class="bookmarkElementListDetailsAdded" data-id="${element.id}">${formatDateTime(element.dateAdded, currentLanguage, 'dateAndTime')}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            searchWindowBodyRightResultsEl.innerHTML = `<div id="searchWindowBodyRightResultsHtmlList">${searchWindowBodyRightResultsHtml}</div>`;

            const addEventListenersToBookmarkElementList = () => {
                const bookmarkElementListArray = document.querySelectorAll('.bookmarkElementList');

                const openElement = (el) => {
                    console.log(el.target.dataset.id);
                }

                bookmarkElementListArray.forEach(el=>{
                    el.addEventListener('click', openElement);
                });
            }
            addEventListenersToBookmarkElementList();

        } else if (searchObject.view === 'compact') {
            filteredBookmarks.forEach(element=>{
                const backgroundStyle = element.style.bookmark.image.backgroundBase64.length === 0 ? `background-color: ${element.style.bookmark.color.backgroundColor}` : `background-image: url(${element.style.bookmark.image.backgroundBase64})`;

                searchWindowBodyRightResultsHtml += `
                    <div class="bookmarkElementCompact" data-id="${element.id}">
                        <div class="bookmarkElementCompactIcon" style="${backgroundStyle}" data-id="${element.id}"></div>
                        <div class="bookmarkElementCompactDetails" data-id="${element.id}">
                            <div class="bookmarkElementCompactTitle" data-id="${element.id}">${element.title}</div>
                            <div class="bookmarkElementCompactDetailsInfo" data-id="${element.id}">
                                <div class="bookmarkElementCompactDetailsType" data-id="${element.id}">${element.type === 'bookmark' ? 'Bookmark' : 'Folder'}</div>
                                <div class="bookmarkElementCompactDetailsAdded" data-id="${element.id}">${formatDateTime(element.dateAdded, currentLanguage, 'dateAndTime')}</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            searchWindowBodyRightResultsEl.innerHTML = `<div id="searchWindowBodyRightResultsHtmlCompact">${searchWindowBodyRightResultsHtml}</div>`;

            const addEventListenersToBookmarkElementCompact = () => {
                const bookmarkElementCompactArray = document.querySelectorAll('.bookmarkElementCompact');

                const openElement = (el) => {
                    console.log(el.target.dataset.id);
                }

                bookmarkElementCompactArray.forEach(el => {
                    el.addEventListener('click', openElement);
                });
            }
            addEventListenersToBookmarkElementCompact();

        }

    }
    showSearchResultToUi();

    const startSearchBasedOnValues = () => {
        const bookmarks = [];

        if (searchObject.searchText.trim().length === 0) {
            filteredBookmarks = [];
            showSearchResultToUi();
            return;
        };

        // Function to search for all objects based on multiple criteria, including nested objects
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

            // Check if the title matches the search text
            const matchesTitle = normalizedSearchText ? obj.title.toLowerCase().includes(normalizedSearchText) : false;

            // Include the object if it matches the title and the appropriate type
            if (matchesCreatedDate &&
                ((includeBookmarks && isBookmark && (matchesTitle || (includedSearchInUrls && obj.url.toLowerCase().includes(normalizedSearchText)))) ||
                    (includeFolders && isFolder && matchesTitle))) {
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

        // Function to collect all matching bookmarks based on search criteria
        const collectMatchingBookmarks = (bookmarks, criteria) => {
            const allMatches = [];
            bookmarks.forEach(bookmark => {
                allMatches.push(...searchInObject(bookmark, criteria)); // Collect matches from each bookmark
            });
            return allMatches; // Return all collected matches
        };

        // Get all matching bookmarks based on search criteria
        filteredBookmarks = collectMatchingBookmarks(userProfileExport.currentUserBookmarks, searchObject);
        showSearchResultToUi();
    }

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
                searchWindowBodyLeftSearchFiltersContentResultViewTitleEl.innerText = 'Choose Compact View';
                searchWindowBodyLeftSearchFiltersContentResultViewToggleButtonEl.innerHTML = viewAsCompactIconSVG;
                searchObject.view = 'list';
            } else {
                searchWindowBodyLeftSearchFiltersContentResultViewTitleEl.innerText = 'Choose List View';
                searchWindowBodyLeftSearchFiltersContentResultViewToggleButtonEl.innerHTML = viewAsListIconSVG;
                searchObject.view = 'compact';
            }
            showSearchResultToUi();
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
    }
    addEventListenersToSearchManager();

}

