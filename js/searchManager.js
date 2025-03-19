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

import { userProfileExport } from './main.js';

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
                                <label class="toggle" id="searchWindowBodyLeftSearchFiltersContentIncludeBrowserBookmarksToggleLabel" for="includeBrowserBookmarksToggle">
                                    <div id="searchWindowBodyLeftSearchFiltersContentIncludeBrowserBookmarksToggleTitle">Browser Bookmarks</div>
                                    <input type="checkbox" class="toggleInput" id="includeBrowserBookmarksToggle" checked />
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
                                    <input type="date" id="searchWindowBodyLeftSearchFiltersContentDateStartedContentInput">
                                </div>
                            </div>
                            <div id="searchWindowBodyLeftSearchFiltersContentDateEnded">
                                <div id="searchWindowBodyLeftSearchFiltersContentDateEndedTitle">Select Created Before</div>
                                <div id="searchWindowBodyLeftSearchFiltersContentDateEndedContent">
                                    <input type="date" id="searchWindowBodyLeftSearchFiltersContentDateEndedContentInput">
                                </div>
                            </div>
                            <div id="searchWindowBodyLeftSearchFiltersContentIncludeBookmarks">
                                <label class="toggle" id="searchWindowBodyLeftSearchFiltersContentIncludeBookmarksToggleLabel" for="includeBookmarksToggle">
                                    <div id="searchWindowBodyLeftSearchFiltersContentIncludeBookmarksToggleTitle">Include Bookmarks</div>
                                    <input type="checkbox" class="toggleInput" id="includeBookmarksToggle" checked />
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
                                <label class="toggle" id="searchWindowBodyLeftSearchFiltersContentIncludeFoldersToggleLabel" for="includeFoldersToggle">
                                    <div id="searchWindowBodyLeftSearchFiltersContentIncludeFoldersToggleTitle">Include Folders</div>
                                    <input type="checkbox" class="toggleInput" id="includeFoldersToggle" checked />
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
                                <div id="searchWindowBodyLeftSearchFiltersContentResultViewTitle">Choose Tile View</div>
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
        const searchWindowBodyLeftSearchFiltersContentResultViewToggleButton = document.getElementById('searchWindowBodyLeftSearchFiltersContentResultViewToggleButton');
        searchWindowBodyLeftSearchFiltersContentResultViewToggleButton.innerHTML = viewAsListIconSVG;
    }
    setDefaultValuesToSearchManager();

}

