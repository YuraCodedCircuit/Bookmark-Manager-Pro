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

"use strict";
import { userProfileExport, defaultUserBookmarks, defaultBookmarkStyle, defaultFolderStyle, currentFolderId, userActiveProfile, currentLanguageTextObj, manageUserProfiles, userActivityRegister, createCurrentBookmarkFolder} from './main.js';
import { isObjectEmpty, findBookmarkByKey, checkIfColorBrightness, pSBC, truncateString, invertHexColor, getNextMaxIndex, generateRandomIdForObj, indexedDBManipulation, showMessageToastify, capitalizeString, actionForArray, updateInputRangeAndOutput, updateColorisInputValue, checkIfAllowedToCreateScreenshotFromURL, getSupportedFontFamilies, getRandomColor, ensureHttps, resizeImageBase64, inputHexValid, generateColorPalette, truncateTextIfOverflow, createTooltip } from './utilityFunctions.js';

/**
 * Creates a new bookmark or folder object with default properties.
 * This function initializes a new bookmark or folder object based on the provided type.
 * It checks if the default user bookmarks, bookmark style, and folder style are empty,
 * and if so, it retrieves the user profiles. If the current ID to edit is null,
 * it creates a new object with the current date and default styles.
 *
 * @param {string} type - The type of object to create, either 'bookmark' or 'folder'.
 * @returns {Object} The newly created bookmark or folder object with default properties.
 */
export const createNewBookmarkOrFolderObj = async (type) => {
    let returnObj = {};
    await manageUserProfiles('get');
    if (userProfileExport.currentIdToEdit == null) {
        const currentDate = new Date().getTime();
        returnObj = window.structuredClone(defaultUserBookmarks[0]);
        returnObj.dateAdded = currentDate;
        returnObj.dateGroupModified = currentDate;
        returnObj.lastEdited = currentDate;
        returnObj.id = generateRandomIdForObj();
        returnObj.title = '';
        returnObj.url = type == 'folder' ? undefined : '';
        returnObj.type = type;
        returnObj.style.bookmark = window.structuredClone(userActiveProfile.defaultUserBookmarkStyle);
        returnObj.style.folder = window.structuredClone(userActiveProfile.defaultUserFolderStyle);
    }
    return returnObj;
}

/**
 * Creates and displays the window for creating or editing bookmarks and folders.
 * This function dynamically generates HTML content for the window based on the type of item (default, bookmark, or folder)
 * and the specific item ID. It handles the display logic for different sections of the window, such as title and link editors,
 * folder selection, and style customization options. The function also initializes or retrieves necessary styles and language
 * settings to populate the UI elements appropriately.
 *
 * @param {string} type - The type of item to create or edit, such as 'default', 'bookmark','folder' or 'close'.
 * @param {string} string - The ID of the item to edit. A value of 0 indicates a new item is being created.
 */
export const createAndEditBookmarksWindow = async (type, menuType = '') => {
    let createEditWindowHtml = ``;
    // Select the context menu window element for manipulation.
    const contextMenuWindowEl = $('#contextMenuWindow');
    let currentStyleMenuTab = '';
    let currentTitleEditorInputListener = null;
    let currentUrlEditorInputListener = null;
    let currentEditingObj = {};
    let selectedFolderId = null;
    let objType = '';
    let editingObjBookmarkStyle = {};
    let bookmarkBoxSize = { width: '200px', height: '200px' };
    let colorPalette = [];

    if (type == 'close') {
        contextMenuWindowEl.css('display', 'none').html(``);
        userProfileExport.currentIdToEdit = null;
        return;
    }

    if (type == 'bookmark' && menuType == 'edit') {
        const currentDate = new Date().getTime();
        currentEditingObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, userProfileExport.currentIdToEdit);
        editingObjBookmarkStyle = structuredClone(currentEditingObj.style.bookmark);
        objType = currentEditingObj.type;
        selectedFolderId = currentEditingObj.parentId;
        currentEditingObj.lastEdited = currentDate;
    }
    if ((type == 'default' && menuType == 'newBookmark') || (type == 'default' && menuType == 'newFolder')) {
        userProfileExport.currentIdToEdit == null;
        if (menuType == 'newBookmark') { objType = 'bookmark' }
        if (menuType == 'newFolder') { objType = 'folder' }
        currentEditingObj = await createNewBookmarkOrFolderObj(objType);
        selectedFolderId = currentFolderId;
        currentEditingObj.parentId = selectedFolderId;
        editingObjBookmarkStyle = window.structuredClone(currentEditingObj.style.bookmark);
    }

    const userColor = userProfileExport.mainUserSettings.windows.window.backgroundColor;
    colorPalette = generateColorPalette(userColor);

    const updateBookmarkBoxSize = (folderId) => {
        let obj = findBookmarkByKey(userProfileExport.currentUserBookmarks, folderId);
        if (obj == null || obj == undefined) {
            bookmarkBoxSize = { width: '200px', height: '200px' };
        } else {
            bookmarkBoxSize = obj.style.folder.bookmarksBox;
        }
    }
    updateBookmarkBoxSize(currentFolderId);

    // Check if the language object is empty, indicating a failure to retrieve language settings.
    if (isObjectEmpty(currentLanguageTextObj)) {
        console.error('Error to get language object');
    }

    // Validate the type of bookmark window to be created. Exit if the type is not recognized.
    if (type != 'default' && type != 'bookmark') {
        contextMenuWindowEl.css('display', 'none').html(``);
        return;
    }

    switch (menuType) {
        case 'newBookmark':
        case 'newFolder':
        case 'edit':
            contextMenuWindowEl.css('display', 'flex');
            createEditWindowHtml = `
            <div id="mainWindowBody" data-listenerAdded="false">
                <div id="leftPanel">
                    <div id="titleEditor">
                        <div id="titleEditorInfo">Title:</div>
                        <div id="titleEditorInputContainer">
                            <input type="text" name="textEditor" value="" id="titleEditorInput"/>
                        </div>
                    </div>
                    <div id="linkEditor"${objType == 'folder' ? 'style="display:none"' : 'style="display:flex"'}>
                        <div id="linkEditorInfo">Url:</div>
                        <div id="linkEditorInputContainer">
                            <input type="text" name="linkEditor" value="" id="urlEditorInput"/>
                            <button type="button" id="linkEditorInputButton" alt="Take Screenshot">
                                <svg alt="Take Screenshot" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" id="linkEditorInputButtonIcon" ></svg>
                            </button>
                        </div>
                    </div>
                    <div id="listOfFolderNames">
                        <div id="listOfFolderNamesInfo">Select folder:</div>
                        <div id="listToSelectFolder"></div>
                    </div>
                </div>
                <div id="rightPanel">
                    <div id="showBookmarkPreview">
                        <div id='bookmarkBodyPreview'>
                            <div id='bookmarkImagePreview'></div>
                            <div id='bookmarkTextPreview'></div>
                            <div id='bookmarkActiveBoxPreview'></div>
                        </div>
                    </div>
                    <div id="rightStyleMenuContainer">
                        <button type="button" id="styleMenuBorder" class="styleMenu" data-id="1">Border</button>
                        <button type="button" id="styleMenuColor" class="styleMenu" data-id="2">Color</button>
                        <button type="button" id="styleMenuImage" class="styleMenu" data-id="3">Image</button>
                        <button type="button" id="styleMenuText" class="styleMenu" data-id="4">Text</button>
                        <button type="button" id="styleMenuFont" class="styleMenu" data-id="5">Font</button>
                    </div>
                    <div id="styleMenuBody"></div>
                </div>
                <div id="footerContainer">
                    <div id="buttonContainer">
                        <div id="buttonsContainerForSave">
                            <button type="button" id="contextMenuWindowCancel">Cancel</button>
                            <button type="button" id="contextMenuWindowSave">Save</button>
                        </div>
                        <div id="buttonsContainerForNew">
                            <span id="buttonsContainerForNewInfo"></span>
                            <div id="contextMenuWindowLoadDefBtn">
                                <button type="button" id="contextMenuWindowLoadDef">Load default</button>
                                <button type="button" id="contextMenuWindowSaveDef">Save by default</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
            break;
        default:
            contextMenuWindowEl.html(``);
            break;
    }
    contextMenuWindowEl.html(createEditWindowHtml);

    /**
     * Set default styles to the title, URL, and folder tree input fields in the context menu window.
     * It sets the border color of the input fields to black if the background color is light or white if the background color is dark.
     * @function
     */
    const setDefaultStylesToTitleURLFolderTree = () => {
        const titleEditorInputEl = document.getElementById('titleEditorInput');
        const urlEditorInputEl = document.getElementById('urlEditorInput');
        const listOfFolderNamesEl = document.getElementById('listToSelectFolder');
        const borderColor = checkIfColorBrightness(userProfileExport.mainUserSettings.windows.window.backgroundColor) ? '#000000' : '#ffffff';

        titleEditorInputEl.style.border = `1px solid ${borderColor}`;
        titleEditorInputEl.style.backgroundColor = colorPalette[3];
        urlEditorInputEl.style.border = `1px solid ${borderColor}`;
        urlEditorInputEl.style.backgroundColor = colorPalette[3];
        listOfFolderNamesEl.style.border = `1px solid ${borderColor}`;
        listOfFolderNamesEl.style.backgroundColor = colorPalette[3];
    }
    setDefaultStylesToTitleURLFolderTree();

    const linkEditorInputButtonIconEl = document.getElementById('linkEditorInputButtonIcon');
    linkEditorInputButtonIconEl.innerHTML = `<path fill="none" d="M0 0h24v24H0z"/><path d="M3 3h2v2H3V3zm4 0h2v2H7V3zm4 0h2v2h-2V3zm4 0h2v2h-2V3zm4 0h2v2h-2V3zm0 4h2v2h-2V7zM3 19h2v2H3v-2zm0-4h2v2H3v-2zm0-4h2v2H3v-2zm0-4h2v2H3V7zm7.667 4l1.036-1.555A1 1 0 0 1 12.535 9h2.93a1 1 0 0 1 .832.445L17.333 11H20a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h2.667zM9 19h10v-6h-2.737l-1.333-2h-1.86l-1.333 2H9v6zm5-1a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>`;

    linkEditorInputButtonIconEl.addEventListener('mouseenter', () => {
        linkEditorInputButtonIconEl.innerHTML = `<path fill="#2af0f0" d="M 3 3 L 21 3 L 21 10 L 19 10 L 19 5 L 5 5 L 5 19 L 6 19 L 6 21 L 3 21 z M 3 19 v 2 z m 0 -4 v 2 H 3 v -2 z m 0 -4 v 2 H 3 v -2 m 0 -4 h 2 z m 7.667 4 l 1.036 -1.555 A 1 1 0 0 1 12.535 9 h 2.93 a 1 1 0 0 1 0.832 0.445 L 17.333 11 H 20 a 1 1 0 0 1 1 1 v 8 a 1 1 0 0 1 -1 1 H 8 a 1 1 0 0 1 -1 -1 v -8 a 1 1 0 0 1 1 -1 h 2.667 z M 9 19 h 10 v -6 h -2.737 l -1.333 -2 h -1.86 l -1.333 2 H 9 v 6 z m 5 -1 a 2 2 0 1 1 0 -4 a 2 2 0 0 1 0 4 z"/>`;
    });
    linkEditorInputButtonIconEl.addEventListener('mouseleave', () => {
        linkEditorInputButtonIconEl.innerHTML = `<path fill="none" d="M0 0h24v24H0z"/><path d="M3 3h2v2H3V3zm4 0h2v2H7V3zm4 0h2v2h-2V3zm4 0h2v2h-2V3zm4 0h2v2h-2V3zm0 4h2v2h-2V7zM3 19h2v2H3v-2zm0-4h2v2H3v-2zm0-4h2v2H3v-2zm0-4h2v2H3V7zm7.667 4l1.036-1.555A1 1 0 0 1 12.535 9h2.93a1 1 0 0 1 .832.445L17.333 11H20a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h2.667zM9 19h10v-6h-2.737l-1.333-2h-1.86l-1.333 2H9v6zm5-1a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>`;
    });

    /**
    * Updates the title of the editing object and synchronizes the preview text.
    * This function first removes any existing 'input' event listener from the title editor input element
    * to prevent duplicate listeners. It then defines a new event listener that updates both the preview element's
    * innerHTML and the editing object's title property with the input's current value whenever the input changes.
    * Finally, it attaches this new listener to the title editor input element.
    */
    const updateObjTitle = () => {
        // Retrieve the title editor input and bookmark text preview elements from the DOM.
        const titleEditorInputEl = document.getElementById('titleEditorInput');
        const bookmarkTextPreviewEl = document.getElementById('bookmarkTextPreview');
        // Remove the existing 'input' event listener if it exists to prevent duplicates.
        if (currentTitleEditorInputListener) {
            titleEditorInputEl.removeEventListener('input', currentTitleEditorInputListener);
        }
        bookmarkTextPreviewEl.innerHTML = currentEditingObj.title;
        titleEditorInputEl.value = currentEditingObj.title;
        // Define a new event listener that updates the preview and editing object's title on input change.
        const handleTitleInputChange = () => {
            // Update the preview element's innerHTML and the editing object's title with the input's value.
            bookmarkTextPreviewEl.innerHTML = titleEditorInputEl.value;
            currentEditingObj.title = titleEditorInputEl.value;
        }
        // Store the new event listener for potential future removal.
        currentTitleEditorInputListener = handleTitleInputChange;
        // Attach the new event listener to the title editor input element.
        titleEditorInputEl.addEventListener('input', currentTitleEditorInputListener);
    }
    // Call the function to update the object title and synchronize the preview.
    updateObjTitle();

    /**
    * Updates the URL of the editing object and manages the display of the screenshot button based on the URL validity.
    * This function first checks if the operation is applicable based on the `menuId`. If the `menuId` is 2, indicating
    * a specific condition, the function returns immediately. It then retrieves the URL editor input element and the
    * screenshot button element from the DOM. Initially, the screenshot button is hidden.
    *
    * If there is an existing 'input' event listener attached to the URL editor input element, it is removed to prevent
    * duplicate listeners. A new event listener is defined to handle URL input changes. This listener updates the `editingObj.url`
    * property with the new URL value and decides whether to display the screenshot button based on the URL's validity,
    * determined by the `checkIfAllowedToCreateScreenshotFromURL` function.
    *
    * Finally, the new event listener is attached to the URL editor input element to monitor changes.
    */
    const updateObjUrl = () => {
        // Return immediately if the function is not applicable for the current menuId.
        if (objType == 'folder') { return; }
        // Retrieve the URL editor input and screenshot button elements.
        const urlEditorInputEl = document.getElementById('urlEditorInput');
        const linkEditorInputButtonEl = document.getElementById('linkEditorInputButton');
        // Initially hide the screenshot button.
        linkEditorInputButtonEl.style.display = 'none';
        // Remove any existing 'input' event listener to prevent duplicates.
        if (currentUrlEditorInputListener) {
            urlEditorInputEl.removeEventListener('input', currentUrlEditorInputListener);
        }
        // Define a new event listener for URL input changes.
        const showScreenshotButton = () => {
            // Display the screenshot button if the URL is valid for screenshot creation.
            if (checkIfAllowedToCreateScreenshotFromURL(urlEditorInputEl.value)) {
                linkEditorInputButtonEl.style.display = 'flex';
            } else {
                linkEditorInputButtonEl.style.display = 'none';
            }
        };
        urlEditorInputEl.value = currentEditingObj.url;
        const handleUrlInputChange = () => {
            // Update the editing object's URL and manage the screenshot button display.
            currentEditingObj.url = urlEditorInputEl.value;
            // showScreenshotButton();
        };
        // Store the new event listener for future reference.
        currentUrlEditorInputListener = handleUrlInputChange;
        // Attach the new event listener to the URL editor input element.
        urlEditorInputEl.addEventListener('input', currentUrlEditorInputListener);
    };
    // Call the function to update the object's URL and manage the screenshot button.
    if ((type == 'bookmark' && menuType == 'edit') || (type == 'default' && menuType == 'newBookmark')) { updateObjUrl(); }

    const createAndUpdateSelectFolderSection = () => {
        const listToSelectFolderEl = document.getElementById('listToSelectFolder');
        const checkMarkSVG = `<svg class="checkMarkFolder" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 12.5L11 15.5L16 9.5" stroke="${userProfileExport.mainUserSettings.windows.button.success.backgroundColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="10" stroke="${userProfileExport.mainUserSettings.windows.button.success.backgroundColor}" stroke-width="2"/></svg>`;

        /**
        * Generates an HTML string representing a list (ul) from an array of data.
        * @returns {string} The HTML string of the list.
        */
        const generateHtmlListFromData = () => {
            const buildFolderTreeHTML = (bookmarks) => {
                let html = '<ul>'; // Start with an unordered list
                bookmarks.forEach(bookmark => {
                    if (bookmark.type === 'folder') {
                        // Create the list item for the current bookmark
                        html += `<li data-id="${bookmark.id}"><div class="folder"><div class="check" data-id="${bookmark.id}"></div><span class="folderName" data-id="${bookmark.id}">${bookmark.title}</span></div>`;
                        // If there are children, recursively build their HTML
                        if (bookmark.children && bookmark.children.length > 0) {
                            html += buildFolderTreeHTML(bookmark.children); // Recursively build children
                        }
                        html += '</li>'; // Close the list item
                    }
                });
                html += '</ul>'; // Close the unordered list
                return html; // Return the constructed HTML
            };
            // Generate the HTML
            const htmlOutput = `<div class="tree" style="--lineColor:${userProfileExport.mainUserSettings.windows.window.font.color};">${buildFolderTreeHTML(userProfileExport.currentUserBookmarks)}</div>`; // Wrap the output in a single tree div
            // Return the generated HTML
            return htmlOutput;
        };
        listToSelectFolderEl.innerHTML = generateHtmlListFromData();

        const setCheckerToFolderTree = () => {
            const checkArray = document.querySelectorAll('.check');
            const liArray = document.querySelectorAll('li[data-id]');
            const id = selectedFolderId;
            if (checkArray.length === 0) { return; }
            checkArray.forEach((check, index) => {
                if (check.dataset.id === id && liArray[index].dataset.id === id) {
                    liArray[index].style.setProperty('--lineWidth', '5px');
                    check.innerHTML = checkMarkSVG;
                } else {
                    liArray[index].style.setProperty('--lineWidth', '15px');
                    check.innerHTML = '';
                }
            });
        }
        setCheckerToFolderTree();

        const folder = document.querySelectorAll('[class="folder"]');
        folder.forEach(element => {
            element.addEventListener('click', (e) => {
                selectedFolderId = e.target.dataset.id;
                setCheckerToFolderTree();
                updateBookmarkBoxSize(selectedFolderId);
                updateBookmarkStylePreview();
            });
        });
    }
    createAndUpdateSelectFolderSection();

    /**
    * Updates the text content of various UI elements in the context menu window based on the current language settings.
    * This function dynamically sets the text for elements like title, link editor, folder names, style menu options,
    * and buttons according to the language object `currentLanguageTextObj`. It ensures that the UI reflects the correct
    * language preferences of the user.
    */
    const updateColorSettingsTitleUI = () => {
        // Retrieve elements by their IDs or selectors
        const titleEditorInfoEl = document.getElementById('titleEditorInfo');
        const linkEditorInfoEl = document.getElementById('linkEditorInfo');
        const listOfFolderNamesInfoEl = document.getElementById('listOfFolderNamesInfo');

        const styleMenuBorderEl = document.querySelector('[data-id="1"]');
        const styleMenuColorEl = document.querySelector('[data-id="2"]');
        const styleMenuImageEl = document.querySelector('[data-id="3"]');
        const styleMenuTextEl = document.querySelector('[data-id="4"]');

        const contextMenuWindowCancelEl = document.getElementById('contextMenuWindowCancel');
        const contextMenuWindowSaveEl = document.getElementById('contextMenuWindowSave');
        const contextMenuWindowLoadDefEl = document.getElementById('contextMenuWindowLoadDef');
        const contextMenuWindowSaveDefEl = document.getElementById('contextMenuWindowSaveDef');

        /**
        * Helper function to update the text content of a given element.
        * @param {HTMLElement} element - The DOM element whose text content needs to be updated.
        * @param {string} text - The new text content to be set on the element.
        */
        const updateTextContent = (element, text) => {
            if (element && text !== undefined) {
                element.innerHTML = text;
            } else {
                console.error('Invalid arguments passed to updateTextContent()', { element: element, text: text });
            }
        };

        // Update the text content of UI elements based on the current language settings
        updateTextContent(titleEditorInfoEl, currentLanguageTextObj._createOrEditWindow.title);
        updateTextContent(linkEditorInfoEl, currentLanguageTextObj._createOrEditWindow.url);
        updateTextContent(listOfFolderNamesInfoEl, currentLanguageTextObj._createOrEditWindow.selectFolder);

        updateTextContent(styleMenuBorderEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu.border);
        updateTextContent(styleMenuColorEl, currentLanguageTextObj._createOrEditWindow._styleMenu._color._buttonMenu.color);
        updateTextContent(styleMenuImageEl, currentLanguageTextObj._createOrEditWindow._styleMenu._image._buttonMenu.image);
        updateTextContent(styleMenuTextEl, currentLanguageTextObj._createOrEditWindow._styleMenu._text._buttonMenu.text);

        updateTextContent(contextMenuWindowCancelEl, currentLanguageTextObj._createOrEditWindow._buttons.cancel);
        updateTextContent(contextMenuWindowSaveEl, currentLanguageTextObj._createOrEditWindow._buttons.save);
        updateTextContent(contextMenuWindowLoadDefEl, currentLanguageTextObj._createOrEditWindow._buttons.loadDefaultStyle);
        updateTextContent(contextMenuWindowSaveDefEl, currentLanguageTextObj._createOrEditWindow._buttons.saveByDefaultStyle);
    };
    updateColorSettingsTitleUI();

    /**
    * Sets the main style for the window and adds event listeners.
    * This function applies the main background color to the window body and adjusts the style menu body's background color
    * based on the brightness of the main background color. It uses the `pSBC` function to lighten or darken the color
    * accordingly. Event listeners can be added within this function for interactive elements.
    */
    const setMainStyleAndAddEventListener = () => {
        // Select the main window body and style menu body elements using jQuery.
        const mainWindowBodyEl = document.getElementById('mainWindowBody');
        const styleMenuBodyEl = $('#styleMenuBody');
        // Apply the main user settings background color to the main window body.
        mainWindowBodyEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.window.backgroundColor;
        mainWindowBodyEl.style.borderLeft = `${userProfileExport.mainUserSettings.windows.window.border.left.width}px ${userProfileExport.mainUserSettings.windows.window.border.left.style} ${userProfileExport.mainUserSettings.windows.window.border.left.color}`;
        mainWindowBodyEl.style.borderTop = `${userProfileExport.mainUserSettings.windows.window.border.top.width}px ${userProfileExport.mainUserSettings.windows.window.border.top.style} ${userProfileExport.mainUserSettings.windows.window.border.top.color}`;
        mainWindowBodyEl.style.borderRight = `${userProfileExport.mainUserSettings.windows.window.border.right.width}px ${userProfileExport.mainUserSettings.windows.window.border.right.style} ${userProfileExport.mainUserSettings.windows.window.border.right.color}`;
        mainWindowBodyEl.style.borderBottom = `${userProfileExport.mainUserSettings.windows.window.border.bottom.width}px ${userProfileExport.mainUserSettings.windows.window.border.bottom.style} ${userProfileExport.mainUserSettings.windows.window.border.bottom.color}`;
        mainWindowBodyEl.style.borderRadius = `${userProfileExport.mainUserSettings.windows.window.border.left.radius}px ${userProfileExport.mainUserSettings.windows.window.border.top.radius}px ${userProfileExport.mainUserSettings.windows.window.border.right.radius}px ${userProfileExport.mainUserSettings.windows.window.border.bottom.radius}px`;
        mainWindowBodyEl.style.color = userProfileExport.mainUserSettings.windows.window.font.color;

        styleMenuBodyEl.css('background-color', colorPalette[2]);

        /**
        * Sets or removes the event listeners for mouseenter and mouseleave events on buttons within the context menu window.
        * This function is designed to prevent memory leaks or unintended behavior by providing a mechanism to remove event listeners.
        *
        * @param {boolean} status - If true, attaches event listeners. If false, removes event listeners.
        */
        const setOrRemoveButtonEventListeners = (status) => {
            const buttons = [
                { id: 'contextMenuWindowSave', activeColor: userProfileExport.mainUserSettings.windows.button.success.hoverBackgroundColor, notActiveColor: userProfileExport.mainUserSettings.windows.button.success.backgroundColor, color: userProfileExport.mainUserSettings.windows.button.success.font.color, fontSize: userProfileExport.mainUserSettings.windows.button.success.font.fontSize },
                { id: 'contextMenuWindowCancel', activeColor: userProfileExport.mainUserSettings.windows.button.danger.hoverBackgroundColor, notActiveColor: userProfileExport.mainUserSettings.windows.button.danger.backgroundColor, color: userProfileExport.mainUserSettings.windows.button.danger.font.color, fontSize: userProfileExport.mainUserSettings.windows.button.danger.font.fontSize },
                { id: 'contextMenuWindowLoadDef', activeColor: userProfileExport.mainUserSettings.windows.button.secondary.hoverBackgroundColor, notActiveColor: userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor, color: userProfileExport.mainUserSettings.windows.button.secondary.font.color, fontSize: userProfileExport.mainUserSettings.windows.button.secondary.font.fontSize },
                { id: 'contextMenuWindowSaveDef', activeColor: userProfileExport.mainUserSettings.windows.button.secondary.hoverBackgroundColor, notActiveColor: userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor, color: userProfileExport.mainUserSettings.windows.button.secondary.font.color, fontSize: userProfileExport.mainUserSettings.windows.button.secondary.font.fontSize },
            ];

            buttons.forEach(button => {
                const buttonEl = document.getElementById(button.id);
                if (!buttonEl) return; // Skip if the button element is not found
                // Set initial background color
                buttonEl.style.backgroundColor = button.notActiveColor;
                buttonEl.style.color = button.color;
                buttonEl.style.fontSize = button.fontSize;
                // Define mouseenter event listener
                const handleMouseEnter = () => {
                    buttonEl.style.backgroundColor = button.activeColor;
                };
                // Define mouseleave event listener
                const handleMouseLeave = () => {
                    buttonEl.style.backgroundColor = button.notActiveColor;
                };
                if (status) {
                    // Attach event listeners
                    buttonEl.addEventListener('mouseenter', handleMouseEnter);
                    buttonEl.addEventListener('mouseleave', handleMouseLeave);
                } else {
                    // Remove event listeners
                    buttonEl.removeEventListener('mouseenter', handleMouseEnter);
                    buttonEl.removeEventListener('mouseleave', handleMouseLeave);
                }
            });
        };
        // Call the function to set event listeners on buttons
        setOrRemoveButtonEventListeners(true);

    }
    setMainStyleAndAddEventListener();


    /**
    * Closes the Create and Edit Bookmarks Window.
    * This function adds an event listener to the 'Cancel' button within the context menu window.
    * When the 'Cancel' button is clicked, the function hides the context menu window and clears its HTML content,
    * effectively closing the window and resetting its state.
    */
    const closeCreateAndEditBookmarksWindow = () => {
        // Add click event listener to the 'Cancel' button
        document.getElementById('contextMenuWindowCancel').addEventListener('click', () => {
            editingObjBookmarkStyle = {};
            createAndEditBookmarksWindow('close');
        });
    };
    // Call the function to enable closing of the Create and Edit Bookmarks Window
    closeCreateAndEditBookmarksWindow();

    /**
    * Attaches an event listener to the "Save" button within the context menu window for creating or editing bookmarks.
    * This function validates the input fields for title and URL (if applicable), performs the save operation,
    * and updates the UI accordingly.
    */
    const saveCreateAndEditBookmarksWindow = () => {
        const mainWindowBodyEl = document.getElementById('mainWindowBody');
        const contextMenuWindowSaveEl = document.getElementById('contextMenuWindowSave');
        const titleEditorInputEl = document.getElementById('titleEditorInput');
        const urlEditorInputEl = document.getElementById('urlEditorInput');
        let parentObj = {};

        const saveCurrentEditingObj = async () => {
            let syncObject = {};
            // Check if the title input is empty and show an error message if true.
            if (titleEditorInputEl.value.trim().length === 0) {
                showMessageToastify('error', '', `Please enter a title`, 3000, false, 'bottom', 'right', true);
                return;
            }
            // Check if the object type is a bookmark and the URL input is empty, then show an error message.
            if (objType == 'bookmark' && urlEditorInputEl.value.trim().length === 0) {
                showMessageToastify('error', '', `Please enter a URL`, 3000, false, 'bottom', 'right', true);
                return;
            }

            // If creating a default type object, find the bookmark by key, set properties, and add it to its parent.
            if (type == 'default') {
                parentObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, selectedFolderId);
                currentEditingObj.title = titleEditorInputEl.value.trim();
                currentEditingObj.url = ensureHttps(urlEditorInputEl.value.trim());
                currentEditingObj.index = getNextMaxIndex(parentObj.children);
                currentEditingObj.style.bookmark = editingObjBookmarkStyle;
                parentObj.children.push(currentEditingObj);
                syncObject = {
                    status: 'create',
                    title: currentEditingObj.title,
                    url: currentEditingObj.url.trim().length > 0 ? ensureHttps(parentObj.url) : null,
                    id: currentEditingObj.id,
                    parentId: parentObj.id === userProfileExport.mainUserSettings.main.synchronizationToBrowser.extensionFolderId ? userProfileExport.mainUserSettings.main.synchronizationToBrowser.browserFolderId : parentObj.id,
                };
            } else if (type == 'bookmark') {
                parentObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, userProfileExport.currentIdToEdit);
                parentObj.title = titleEditorInputEl.value.trim();
                parentObj.url = ensureHttps(urlEditorInputEl.value.trim());
                parentObj.style.bookmark = editingObjBookmarkStyle;
                if (currentEditingObj.parentId !== selectedFolderId) {
                    actionForArray(userProfileExport.currentUserBookmarks, 'cut', userProfileExport.currentIdToEdit, selectedFolderId);
                }
                syncObject = {
                    status: 'update',
                    title: parentObj.title,
                    url: parentObj.url.trim().length > 0 ? ensureHttps(parentObj.url) : null,
                    id: parentObj.id,
                    parentId: selectedFolderId === userProfileExport.mainUserSettings.main.synchronizationToBrowser.extensionFolderId ? userProfileExport.mainUserSettings.main.synchronizationToBrowser.browserFolderId : selectedFolderId,
                };
            }

            userActiveProfile.currentUserBookmarks = userProfileExport.currentUserBookmarks;
            if (userProfileExport.mainUserSettings.main.synchronizationToBrowser.status &&
                userProfileExport.mainUserSettings.main.synchronizationToBrowser.browserFolderId.length > 0 &&
                userProfileExport.mainUserSettings.main.synchronizationToBrowser.extensionFolderId.length > 0
            ) {
                const status = await indexedDBManipulation('save', 'tempBookmarkObject', syncObject);
                if (status) {
                    browser.runtime.sendMessage({ sync: { savedNewObject: true } })
                        .then(response => {
                            // if (response) {
                            //     showMessageToastify('success', ``, 'Synchronization has been successfully turned off. Your folders will no longer sync automatically.', 5000, false, 'bottom', 'right', true);
                            // } else {
                            //     showMessageToastify('error', ``, 'Failed to turn off synchronization. Please try again or check your settings.', 5000, false, 'bottom', 'right', true);
                            // }
                        })
                        .catch(error => {
                            console.error("Error sending message:", error);
                        });
                }
            }
            // Save the current user bookmarks to local storage and show a success or error message.
            const save = await manageUserProfiles('save');
            if (save) {
                showMessageToastify('success', '', `${capitalizeString(objType, 1, false)} created successfully`, 2000, false, 'bottom', 'right', true);
            } else {
                showMessageToastify('error', '', `Failed to create ${objType}`, 2000, false, 'bottom', 'right', true);
            }
            if (type == 'default' && menuType == 'newBookmark') {
                userActivityRegister('save', 'createBookmark', { id: currentEditingObj.id, title: currentEditingObj.title });
            }
            if (type == 'default' && menuType == 'newFolder') {
                userActivityRegister('save', 'createFolder', { id: currentEditingObj.id, title: currentEditingObj.title });
            }
            // Refresh the current bookmark folder display.
            createCurrentBookmarkFolder();
            // Reset the current ID being edited to null.
            userProfileExport.currentIdToEdit = null;
            // Hide the context menu window and clear its contents.
            contextMenuWindowEl.css('display', 'none').html(``);
        }

        // Define the event handler function
        const handleKeyPress = (event) => {
            if (event.key === 'Enter') {
                saveCurrentEditingObj();
            }
        };

        // Function to add the keypress event listener
        const addKeyPressListener = () => {
            // Check if the listener is already added
            if (!mainWindowBodyEl.dataset.listenerAdded) {
                mainWindowBodyEl.dataset.listenerAdded = 'true'; // Set a flag to indicate the listener is added
                mainWindowBodyEl.addEventListener('keypress', handleKeyPress);
            }
        };

        // Function to remove the keypress event listener
        const removeKeyPressListener = () => {
            if (mainWindowBodyEl.dataset.listenerAdded) {
                mainWindowBodyEl.removeEventListener('keypress', handleKeyPress);
                delete mainWindowBodyEl.dataset.listenerAdded; // Remove the flag
            }
        };

        // Check if the listener is already added
        if (mainWindowBodyEl.dataset.listenerAdded !== undefined && mainWindowBodyEl.dataset.listenerAdded === 'true') {
            // Remove the listener
            removeKeyPressListener();
        }
        // Add the listener
        addKeyPressListener();

        contextMenuWindowSaveEl.addEventListener('click', saveCurrentEditingObj);
    };
    saveCreateAndEditBookmarksWindow(); // Invoke the function to attach the event listener.

    /**
    * Initializes the event listener for the "Load Default" button within the context menu window.
    * This function is responsible for loading the default bookmark style from local storage if it exists,
    * or saving and applying a predefined style if it does not. It provides feedback to the user through
    * toast notifications about the success or failure of the operation.
    */
    const loadDefaultBookmarkStyle = () => {
        // Get the "Load Default" button element by its ID.
        const loadDefButton = document.getElementById('contextMenuWindowLoadDef');
        // Add a click event listener to the "Load Default" button.
        loadDefButton.addEventListener('click', async () => {
            if (await indexedDBManipulation('has', 'userProfile')) {
                try {
                    await manageUserProfiles('get');
                    editingObjBookmarkStyle = userActiveProfile.defaultUserBookmarkStyle;
                    // Reset the UI to reflect the loaded style.
                    resetUIAfterLoadStyle();
                    // Show a success message to the user using Toastify.
                    showMessageToastify('success', '', `Default style loaded successfully`, 2000, false, 'bottom', 'right', true);
                } catch (error) {
                    // Log the error to the console if the try block fails.
                    console.error('Failed to load default style', error);
                    // Show an error message to the user using Toastify.
                    showMessageToastify('error', '', `Failed to load default style`, 4000, false, 'bottom', 'right', true, true);
                }
            }
        });
    };
    // Call the function to ensure the event listener is added upon script execution.
    loadDefaultBookmarkStyle();

    /**
    * Attaches an event listener to a specific button for saving a new user bookmark style to local storage.
    * When the button is clicked, it attempts to save the new style. If successful, a success message is displayed;
    * otherwise, an error message is shown.
    */
    const saveNewUserBookmarkStyle = () => {
        // Attach an event listener to the 'contextMenuWindowSaveDef' button for the 'click' event.
        document.getElementById('contextMenuWindowSaveDef').addEventListener('click', async () => {
            try {
                // Attempt to save the defaultUserBookmarkStyle to local storage and check the save status.
                userActiveProfile.defaultUserBookmarkStyle = editingObjBookmarkStyle;
                const saveStatus = await manageUserProfiles('save');
                if (saveStatus) {
                    // If the save operation is successful, display a success message using Toastify.
                    showMessageToastify('success', '', `Default style saved successfully`, 2000, false, 'bottom', 'right', true, false);
                }
            } catch (error) {
                // Log any errors that occur during the save operation to the console.
                console.error('Failed to save default style', error);
                // Display an error message using Toastify if the save operation fails.
                showMessageToastify('error', '', `Failed to save default style`, 4000, false, 'bottom', 'right', true, false);
            }
        });
    };
    // Call the function to ensure the event listener is attached as soon as the script is loaded.
    saveNewUserBookmarkStyle();

    /**
    * Updates the preview of the bookmark style in the UI based on the current settings.
    * This function applies the styles for borders, background color, background image, and text
    * to the bookmark preview elements. It checks if the style objects are empty and logs an error if so.
    * The function dynamically adjusts styles such as border properties, background color or image, and text styles
    * based on the `editingObjBookmarkStyle` object.
    */
    const updateBookmarkStylePreview = () => {
        // Get references to the bookmark preview elements in the DOM.
        const bookmarkBodyPreviewEl = document.getElementById('bookmarkBodyPreview');
        const bookmarkImagePreviewEl = document.getElementById('bookmarkImagePreview');
        const bookmarkTextPreviewEl = document.getElementById('bookmarkTextPreview');
        const bookmarkActiveBoxPreviewEl = document.getElementById('bookmarkActiveBoxPreview');

        // Check if the newUserBookmarkStyle object is empty and log an error if true.
        if (isObjectEmpty(userProfileExport.defaultUserBookmarkStyle)) {
            console.error('Fault to load style obj');
            return;
        }
        // Apply border styles to the bookmark body preview element.
        bookmarkBodyPreviewEl.style.display = `flex`;
        bookmarkBodyPreviewEl.style.position = `relative`;
        bookmarkBodyPreviewEl.style.width = bookmarkBoxSize.width || '200px';
        bookmarkBodyPreviewEl.style.height = bookmarkBoxSize.height || '200px';
        bookmarkBodyPreviewEl.style.overflow = `hidden`;

        bookmarkBodyPreviewEl.style['border-left'] = `${editingObjBookmarkStyle.border.left.width}px ${editingObjBookmarkStyle.border.left.style} ${editingObjBookmarkStyle.border.left.color}`;
        bookmarkBodyPreviewEl.style['border-top'] = `${editingObjBookmarkStyle.border.top.width}px ${editingObjBookmarkStyle.border.top.style} ${editingObjBookmarkStyle.border.top.color}`;
        bookmarkBodyPreviewEl.style['border-right'] = `${editingObjBookmarkStyle.border.right.width}px ${editingObjBookmarkStyle.border.right.style} ${editingObjBookmarkStyle.border.right.color}`;
        bookmarkBodyPreviewEl.style['border-bottom'] = `${editingObjBookmarkStyle.border.bottom.width}px ${editingObjBookmarkStyle.border.bottom.style} ${editingObjBookmarkStyle.border.bottom.color}`;
        bookmarkBodyPreviewEl.style['border-radius'] = `${editingObjBookmarkStyle.border.left.radius}px ${editingObjBookmarkStyle.border.top.radius}px ${editingObjBookmarkStyle.border.right.radius}px ${editingObjBookmarkStyle.border.bottom.radius}px`;

        // Check if a background color is set and no background image is set, then apply color styles.
        if (editingObjBookmarkStyle.color.backgroundColor !== '' && editingObjBookmarkStyle.image.backgroundBase64 == '') {
            bookmarkImagePreviewEl.style.backgroundImage = ``;
            bookmarkImagePreviewEl.style.display = `${editingObjBookmarkStyle.color.display}`;
            bookmarkImagePreviewEl.style.position = `${editingObjBookmarkStyle.color.position}`;
            bookmarkImagePreviewEl.style.width = `${editingObjBookmarkStyle.color.width}%`;
            bookmarkImagePreviewEl.style.height = `${editingObjBookmarkStyle.color.height}%`;
            bookmarkImagePreviewEl.style.backgroundColor = `${editingObjBookmarkStyle.color.backgroundColor}`;
            bookmarkImagePreviewEl.style.left = `${editingObjBookmarkStyle.color.left}%`;
            bookmarkImagePreviewEl.style.top = `${editingObjBookmarkStyle.color.top}%`;
            bookmarkImagePreviewEl.style.transform = `rotate(${editingObjBookmarkStyle.color.angle}deg)`;
        }

        // Check if a background image is set and no background color is set, then apply image styles.
        if (editingObjBookmarkStyle.image.backgroundBase64 !== '' && editingObjBookmarkStyle.color.backgroundColor == '') {
            bookmarkImagePreviewEl.style.backgroundColor = ``;
            bookmarkImagePreviewEl.style.display = `${editingObjBookmarkStyle.image.display}`;
            bookmarkImagePreviewEl.style.position = `${editingObjBookmarkStyle.image.position}`;
            bookmarkImagePreviewEl.style.width = `${editingObjBookmarkStyle.image.width}%`;
            bookmarkImagePreviewEl.style.height = `${editingObjBookmarkStyle.image.height}%`;
            bookmarkImagePreviewEl.style.left = `${editingObjBookmarkStyle.image.left}%`;
            bookmarkImagePreviewEl.style.top = `${editingObjBookmarkStyle.image.top}%`;
            bookmarkImagePreviewEl.style.transform = `rotate(${editingObjBookmarkStyle.image.angle}deg)`;
            bookmarkImagePreviewEl.style.backgroundImage = `url(${editingObjBookmarkStyle.image.backgroundBase64})`;
            bookmarkImagePreviewEl.style.backgroundRepeat = `no-repeat`;
            bookmarkImagePreviewEl.style.backgroundSize = `100% 100%`;
        }

        // Apply text styles to the bookmark text preview element.
        bookmarkTextPreviewEl.style.display = `${editingObjBookmarkStyle.text.display}`;
        bookmarkTextPreviewEl.style.position = `${editingObjBookmarkStyle.text.position}`;
        bookmarkTextPreviewEl.style.whiteSpace = `${editingObjBookmarkStyle.text.whiteSpace}`;
        bookmarkTextPreviewEl.style.overflow = `${editingObjBookmarkStyle.text.overflow}`;
        bookmarkTextPreviewEl.style.backgroundColor = `${editingObjBookmarkStyle.text.backgroundColor}`;
        bookmarkTextPreviewEl.style.width = `${editingObjBookmarkStyle.text.width}%`;
        bookmarkTextPreviewEl.style.height = `${editingObjBookmarkStyle.text.height}%`;
        bookmarkTextPreviewEl.style.transform = `rotate(${editingObjBookmarkStyle.text.angle}deg)`;
        bookmarkTextPreviewEl.style.left = `${editingObjBookmarkStyle.text.left}%`;
        bookmarkTextPreviewEl.style.top = `${editingObjBookmarkStyle.text.top}%`;

        bookmarkTextPreviewEl.style.color = `${editingObjBookmarkStyle.font.color}`;
        bookmarkTextPreviewEl.style.fontSize = `${editingObjBookmarkStyle.font.fontSize}px`;
        bookmarkTextPreviewEl.style.fontFamily = `${editingObjBookmarkStyle.font.fontFamily}`;
        bookmarkTextPreviewEl.style.fontWeight = `${editingObjBookmarkStyle.font.fontWeight}`;
        bookmarkTextPreviewEl.style.fontStyle = `${editingObjBookmarkStyle.font.fontStyle}`;
        bookmarkTextPreviewEl.style.alignItems = `${editingObjBookmarkStyle.font.textAlign}`;

        bookmarkActiveBoxPreviewEl.style.display = 'flex';
        bookmarkActiveBoxPreviewEl.style.position = 'absolute';
        bookmarkActiveBoxPreviewEl.style.width = '100%';
        bookmarkActiveBoxPreviewEl.style.height = '100%';
        bookmarkActiveBoxPreviewEl.style.background = '#00000000';
    };

    const styleMenuBodyEl = $('#styleMenuBody');

    /**
    * Constructs and displays the border style menu for a bookmark box. This function dynamically generates HTML content
    * for configuring border properties such as position, width, color, style, and radius. It initializes the UI components
    * with default values and sets up event listeners for interactive elements to allow users to customize the appearance
    * of bookmark borders.
    */
    const displayBorderMenu = () => {
        // Variables to store references to event listeners for later removal if needed
        let currentInputRangeWidthListener = null;
        let currentInputColorEventListener = null;
        let currentButtonsStyleListener = null;
        let currentInputRangeRadiusListener = null;
        let currentClickEventListeners = [];

        // Template literal containing the HTML structure for the border style menu
        let borderHtmlBody = `
            <div id="bookmarkBoxStyleBody">
                <div id="borderPositionContainer">
                    <div class="borderPosition" data-position="left">
                        <span class="borderPositionTitle" data-position="left">${currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerLeft._button.left || 'Left'}</span>
                        <span class="borderPositionIcon" data-position="left"></span>
                    </div>
                    <div class="borderPosition" data-position="top">
                        <span class="borderPositionTitle" data-position="top">${currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerTop._button.top || 'Top'}</span>
                        <span class="borderPositionIcon" data-position="top"></span>
                    </div>
                    <div class="borderPosition" data-position="right">
                        <span class="borderPositionTitle" data-position="right">${currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerRight._button.right || 'Right'}</span>
                        <span class="borderPositionIcon" data-position="right"></span>
                    </div>
                    <div class="borderPosition" data-position="bottom">
                        <span class="borderPositionTitle" data-position="bottom">${currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerBottom._button.bottom || 'Bottom'}</span>
                        <span class="borderPositionIcon" data-position="bottom"></span>
                    </div>
                </div>
                <div id="bookmarkBoxBorderWidthContainer">
                    <div id="borderWidthTitle">Border width:</div>
                    <div id="borderWidthInput">
                        <input type="range" id="bookmarkBoxBorderWidthRange" min="0" max="20" step="1" value="1">
                        <div id="borderValueOutput">
                            <output id="borderWidthValue">0</output>
                        </div>
                    </div>
                </div>
                <div id="borderColor">
                    <div id="borderColorTitle">Border color:</div>
                    <div id="borderColorInputPicker">
                        <input type="text" id="borderColorInput" data-coloris readonly="readonly">
                        <button id="addRandomColor"></button>
                    </div>
                </div>
                <div id="borderStyleContainer">
                    <div id="borderStyleTitle">Border style:</div>
                    <div id="borderStyleSelectBox">
                        <div id="dropDownOptionsBox">
                            <button type="button" id="dropDownMenuButton" data-status="false">
                                <div id="dropDownMenuTitle">
                                    <span id="styleButtonMenuTitle">Select</span>
                                    <span id="styleButtonArrow"></span>
                                </div>
                                <ul id="borderSelectUl">
                                    <li id="borderSelectLi" data-value="none">
                                        <span id="borderSelectTitle" data-value="none">None</span>
                                        <span id="borderSelectIcon" style="--border-style:none" data-value="none"></span>
                                    </li>
                                    <li id="borderSelectLi" data-value="hidden">
                                        <span id="borderSelectTitle" data-value="hidden">Hidden</span>
                                        <span id="borderSelectIcon" style="--border-style:hidden" data-value="hidden"></span>
                                    </li>
                                    <li id="borderSelectLi" data-value="solid">
                                        <span id="borderSelectTitle" data-value="solid">Solid</span>
                                        <span id="borderSelectIcon" style="--border-style:solid" data-value="solid"></span>
                                    </li>
                                    <li id="borderSelectLi" data-value="dashed">
                                        <span id="borderSelectTitle" data-value="dashed">Dashed</span>
                                        <span id="borderSelectIcon" style="--border-style:dashed" data-value="dashed"></span>
                                    </li>
                                    <li id="borderSelectLi" data-value="dotted">
                                        <span id="borderSelectTitle" data-value="dotted">Dotted</span>
                                        <span id="borderSelectIcon" style="--border-style:dotted" data-value="dotted"></span>
                                    </li>
                                    <li id="borderSelectLi" data-value="double">
                                        <span id="borderSelectTitle" data-value="double">Double</span>
                                        <span id="borderSelectIcon" style="--border-style:double" data-value="double"></span>
                                    </li>
                                    <li id="borderSelectLi" data-value="groove">
                                        <span id="borderSelectTitle" data-value="groove">Groove</span>
                                        <span id="borderSelectIcon" style="--border-style:groove" data-value="groove"></span>
                                    </li>
                                    <li id="borderSelectLi" data-value="ridge">
                                        <span id="borderSelectTitle" data-value="ridge">Ridge</span>
                                        <span id="borderSelectIcon" style="--border-style:ridge" data-value="ridge"></span>
                                    </li>
                                    <li id="borderSelectLi" data-value="inset">
                                        <span id="borderSelectTitle" data-value="inset">Inset</span>
                                        <span id="borderSelectIcon" style="--border-style:inset" data-value="inset"></span>
                                    </li>
                                    <li id="borderSelectLi" data-value="outset">
                                        <span id="borderSelectTitle" data-value="outset">Outset</span>
                                        <span id="borderSelectIcon" style="--border-style:outset" data-value="outset"></span>
                                    </li>
                                </ul>
                            </button>
                        </div>
                    </div>
                </div>
                <div id="borderRadius">
                    <div id="borderRadiusTitle">Border radius:</div>
                    <div id="borderRadiusInput">
                        <input type="range" id="bookmarkBoxBorderRadiusRange" min="0" max="50" step="1" value="0">
                        <div id="borderValueOutput">
                            <output id="borderRadiusValue">0</output>
                        </div>
                    </div>
                </div>
            </div>
        `;
        styleMenuBodyEl.html(borderHtmlBody);

        /**
        * Updates the text for border width, color, and style settings in the UI based on the selected border position.
        * This function retrieves the appropriate text from the current language object and applies it to the UI elements.
        *
        * @param {string} position - The selected border position ('left', 'top', 'right', 'bottom').
        */
        const updateBorderSettingsTitlesUI = (position) => {
            // Ensure the current language object is not empty or undefined before proceeding.
            if (currentLanguageTextObj && Object.keys(currentLanguageTextObj).length !== 0) {
                // Retrieve the UI elements for border width, color, and style titles.
                const borderWidthTitleEl = document.getElementById('borderWidthTitle');
                const borderColorTitleEl = document.getElementById('borderColorTitle');
                const borderStyleTitleEl = document.getElementById('borderStyleTitle');
                const borderStyleBtnEl = document.getElementById('styleButtonMenuTitle');
                const borderRadiusTitleEl = document.getElementById('borderRadiusTitle');
                // Define a helper function to update the text content of the UI elements.
                const updateTextContent = (element, text) => {
                    if (element && text !== undefined) {
                        element.innerHTML = text;
                    } else {
                        console.error('Invalid arguments passed to updateTextContent()', { element: element, text: text });
                    }
                };
                // Based on the selected position, update the UI elements with the corresponding text from the current language object.
                switch (position) {
                    case 'left':
                        updateTextContent(borderWidthTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerLeft.borderLeftWidth);
                        updateTextContent(borderColorTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerLeft.borderLeftColor);
                        updateTextContent(borderStyleTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerLeft.borderLeftStyle);
                        updateTextContent(borderStyleBtnEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerLeft._button.select);
                        updateTextContent(borderRadiusTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerLeft.borderLeftRadius);
                        break;
                    case 'top':
                        updateTextContent(borderWidthTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerTop.borderTopWidth);
                        updateTextContent(borderColorTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerTop.borderTopColor);
                        updateTextContent(borderStyleTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerTop.borderTopStyle);
                        updateTextContent(borderStyleBtnEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerTop._button.select);
                        updateTextContent(borderRadiusTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerTop.borderTopRadius);
                        break;
                    case 'right':
                        updateTextContent(borderWidthTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerRight.borderRightWidth);
                        updateTextContent(borderColorTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerRight.borderRightColor);
                        updateTextContent(borderStyleTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerRight.borderRightStyle);
                        updateTextContent(borderStyleBtnEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerRight._button.select);
                        updateTextContent(borderRadiusTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerRight.borderRightRadius);
                        break;
                    case 'bottom':
                        updateTextContent(borderWidthTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerBottom.borderBottomWidth);
                        updateTextContent(borderColorTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerBottom.borderBottomColor);
                        updateTextContent(borderStyleTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerBottom.borderBottomStyle);
                        updateTextContent(borderStyleBtnEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerBottom._button.select);
                        updateTextContent(borderRadiusTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._border._buttonMenu._borerBottom.borderBottomRadius);
                        break;
                }
            }
        }

        /**
        * Changes the style of the dropdown menu based on the specified border color.
        * This function dynamically adjusts the background color and hover state color of the dropdown menu
        * based on the brightness of the provided border color. It sets custom CSS properties for the dropdown
        * menu's list items, including border color, title color, background color, and hover background color.
        *
        * @param {string} borderColor - The HEX color value used to determine the dropdown menu's style.
        */
        const changeButtonStyleUl = (borderColor) => {
            let backgroundColor, backgroundColorHover;
            const borderSelectUlEl = document.getElementById('borderSelectUl');
            // Check the brightness of the provided border color to determine the background color and hover state color.
            if (checkIfColorBrightness(borderColor)) {
                backgroundColor = '#000000'; // Dark background for light border colors
                backgroundColorHover = pSBC(0.30, backgroundColor, false, true); // Lighten for hover state
            } else {
                backgroundColor = '#ffffff'; // Light background for dark border colors
                backgroundColorHover = pSBC(-0.30, backgroundColor, false, true); // Darken for hover state
            }
            // Apply the calculated styles as custom CSS properties to the dropdown menu.
            borderSelectUlEl.setAttribute('style', `--liBorderColor: ${borderColor};--liTitleColor:${borderColor};--backgroundColorPopWindow: ${backgroundColor};--backgroundColorPopWindowHover: ${backgroundColorHover};`);
        }

        /**
        * Validates the selected border position before proceeding with event listener setup.
        * This function checks if the provided position is one of the valid options ('left', 'top', 'right', 'bottom').
        * If the position does not match any of these valid options, the function will return early and not proceed
        * with adding event listeners. This is a safeguard to ensure that event listeners are only added for valid
        * border positions, preventing potential errors in the application.
        *
        * @param {string} position - The selected border position to validate.
        * @returns {void} - The function returns early if the position is not valid, preventing further execution.
        */
        const applyBorderStyleToUI = (position) => {
            if (position !== 'left' && position !== 'top' && position !== 'right' && position !== 'bottom') return;
            let borderStyle = {
                color: '',
                style: '',
                width: '',
                radius: ''
            };
            // Get the DOM elements for the border width range input, border color input, border style button, and border radius range input.
            const bookmarkBoxBorderWidthRangeEl = document.getElementById('bookmarkBoxBorderWidthRange');
            const borderColorInputEl = document.getElementById('borderColorInput');
            const styleButtonMenuTitleEl = document.getElementById('styleButtonMenuTitle');
            const bookmarkBoxBorderRadiusRangeEl = document.getElementById('bookmarkBoxBorderRadiusRange');
            // If an event listener for color input changes already exists, remove it to prevent duplicate listeners.
            if (currentInputColorEventListener) borderColorInputEl.removeEventListener('input', currentInputColorEventListener);
            try {
                if (!bookmarkBoxBorderWidthRangeEl || !borderColorInputEl || !styleButtonMenuTitleEl || !bookmarkBoxBorderRadiusRangeEl) {
                    console.error('Elements not found');
                    return;
                }
                if (!position || !editingObjBookmarkStyle || isObjectEmpty(editingObjBookmarkStyle)) {
                    return;
                }
                // Trigger an update to the bookmark style preview to reflect the current text style settings.
                updateBookmarkStylePreview();
                switch (position) {
                    case 'left':
                        borderStyle = editingObjBookmarkStyle.border.left;
                        break;
                    case 'top':
                        borderStyle = editingObjBookmarkStyle.border.top;
                        break;
                    case 'right':
                        borderStyle = editingObjBookmarkStyle.border.right;
                        break;
                    case 'bottom':
                        borderStyle = editingObjBookmarkStyle.border.bottom;
                        break;
                }
                updateInputRangeAndOutput('bookmarkBoxBorderWidthRange', 'borderWidthValue', borderStyle.width);
                updateColorisInputValue('borderColorInput', borderStyle.color);
                const updateButtonIconStyle = (color) => {
                    const arrowRightEl = document.getElementById('styleButtonArrow');
                    arrowRightEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.font.color;
                    changeButtonStyleUl(color);
                };

                const borderColor = checkIfColorBrightness(editingObjBookmarkStyle.border.left.color) ? '#000000' : '#ffffff';
                borderColorInputEl.style.border = `1px solid ${borderColor}`;
                updateButtonIconStyle(borderStyle.color);
                styleButtonMenuTitleEl.innerHTML = borderStyle.style.charAt(0).toUpperCase() + borderStyle.style.slice(1);
                updateInputRangeAndOutput('bookmarkBoxBorderRadiusRange', 'borderRadiusValue', borderStyle.radius);
            } catch (error) {
                console.error(error);
            }
        };

        /**
        * Validates the selected border position before proceeding with event listener setup.
        * This function checks if the provided position is one of the valid options ('left', 'top', 'right', 'bottom').
        * If the position does not match any of these valid options, the function will return early and not proceed
        * with adding event listeners. This is a safeguard to ensure that event listeners are only added for valid
        * border positions, preventing potential errors in the application.
        *
        * @param {string} position - The selected border position to validate.
        * @returns {void} - The function returns early if the position is not valid, preventing further execution.
        */
        const eventListenerBorderStyleEl = (position) => {
            if (position !== 'left' && position !== 'top' && position !== 'right' && position !== 'bottom') return;
            // Retrieve elements related to border width, color, radius, and style selection.
            const bookmarkBoxBorderWidthRangeEl = document.getElementById('bookmarkBoxBorderWidthRange');
            const borderColorInputEl = document.getElementById('borderColorInput');
            const bookmarkBoxBorderRadiusRangeEl = document.getElementById('bookmarkBoxBorderRadiusRange');
            const borderSelectLiEl = document.querySelectorAll('[id="borderSelectLi"]');
            const addRandomColorEl = document.getElementById('addRandomColor');

            // Remove existing event listeners to avoid duplicates.
            if (currentInputRangeWidthListener) {
                bookmarkBoxBorderWidthRangeEl.removeEventListener('input', currentInputRangeWidthListener);
                borderColorInputEl.removeEventListener('input', currentInputColorEventListener);
                borderSelectLiEl.forEach(element => element.removeEventListener('click', () => { currentButtonsStyleListener }));
                bookmarkBoxBorderRadiusRangeEl.removeEventListener('input', currentInputRangeRadiusListener);
                currentClickEventListeners.forEach(({ element, listener }) => {
                    element.removeEventListener('click', listener);
                });
                currentClickEventListeners = [];
            }

            /**
             * Add a random color button to the background color picker.
             * Creates a CSS string that sets the background color of the button to the user's primary button color
             * and the color of the SVG icon to the user's primary button font color.
             * The SVG icon is a random color icon.
             */
            const addIconToRandomColorEl = () => {
                addRandomColorEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                addRandomColorEl.innerHTML = `<svg fill="${userProfileExport.mainUserSettings.windows.button.primary.font.color}" width="30px" height="25px" viewBox="0 -4 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m24.983 8.539v-2.485h-4.902l-3.672 5.945-2.099 3.414-3.24 5.256c-.326.51-.889.844-1.53.845h-9.54v-3.568h8.538l3.673-5.946 2.099-3.414 3.24-5.256c.325-.509.886-.843 1.525-.845h5.904v-2.485l7.417 4.27-7.417 4.27z"/><path d="m12.902 6.316-.63 1.022-1.468 2.39-2.265-3.675h-8.538v-3.568h9.54c.641.001 1.204.335 1.526.838l.004.007 1.836 2.985z"/><path d="m24.983 24v-2.485h-5.904c-.639-.002-1.201-.336-1.521-.838l-.004-.007-1.836-2.985.63-1.022 1.468-2.39 2.264 3.675h4.902v-2.485l7.417 4.27-7.417 4.27z"/></svg>`;
            };
            addIconToRandomColorEl();

            /**
             * Handles input events for the border width range input, updating the border width
             * in the newUserBookmarkStyle object based on the selected position. It also updates
             * the UI to reflect the new border width value and triggers a preview update.
             */
            const inputRangeWidth = () => {
                // Update the border width in newUserBookmarkStyle based on the selected position.
                switch (position) {
                    case 'left':
                        editingObjBookmarkStyle.border.left.width = bookmarkBoxBorderWidthRangeEl.value;
                        break;
                    case 'top':
                        editingObjBookmarkStyle.border.top.width = bookmarkBoxBorderWidthRangeEl.value;
                        break;
                    case 'right':
                        editingObjBookmarkStyle.border.right.width = bookmarkBoxBorderWidthRangeEl.value;
                        break;
                    case 'bottom':
                        editingObjBookmarkStyle.border.bottom.width = bookmarkBoxBorderWidthRangeEl.value;
                        break;
                }
                // Reflect the new border width value in the UI and update the bookmark style preview.
                updateInputRangeAndOutput('bookmarkBoxBorderWidthRange', 'borderWidthValue', bookmarkBoxBorderWidthRangeEl.value);
                updateBookmarkStylePreview();
            }
            /**
             * Updates the border color of the selected position and applies UI changes.
             * Validates the HEX color input, updates the border color for the selected position,
             * changes the button style based on the new color, and refreshes the bookmark style preview.
             */
            const updateBorderColor = () => {
                let borderColor = '#000000'; // Default color
                if (inputHexValid(borderColorInputEl.value)) {
                    borderColor = borderColorInputEl.value;
                    borderColorInputEl.style.backgroundColor = borderColor;
                    borderColorInputEl.style.color = invertHexColor(borderColor); // Adjust text color for visibility
                    borderColorInputEl.style.borderColor = checkIfColorBrightness(borderColor) ? '#000000' : '#ffffff'; // Adjust border color
                } else {
                    console.error('Invalid HEX color input');
                    return;
                }
                // Update the border color in the newUserBookmarkStyle object based on the selected position
                switch (position) {
                    case 'left':
                        editingObjBookmarkStyle.border.left.color = borderColor;
                        break;
                    case 'top':
                        editingObjBookmarkStyle.border.top.color = borderColor;
                        break;
                    case 'right':
                        editingObjBookmarkStyle.border.right.color = borderColor;
                        break;
                    case 'bottom':
                        editingObjBookmarkStyle.border.bottom.color = borderColor;
                        break;
                }
                changeButtonStyleUl(borderColor); // Apply UI changes for the button style
                updateBookmarkStylePreview(); // Refresh the bookmark style preview
            };

            /**
             * Generates a random color and applies it to the border color input element.
             * This function sets the input value, adjusts the background and text color for visibility,
             * updates the border color in the bookmark style, and refreshes the UI preview.
             */
            const createRandomColor = () => {
                const randomHexColor = getRandomColor();
                borderColorInputEl.value = randomHexColor;
                borderColorInputEl.style.backgroundColor = randomHexColor;
                borderColorInputEl.style.color = invertHexColor(randomHexColor); // Adjust text color for visibility
                borderColorInputEl.style.borderColor = checkIfColorBrightness(randomHexColor) ? '#000000' : '#ffffff'; // Adjust border color
                editingObjBookmarkStyle.border[position].color = randomHexColor;
                changeButtonStyleUl(randomHexColor); // Apply UI changes for the button style
                updateBookmarkStylePreview(); // Refresh the bookmark style preview
            }

            // Mouse enter and leave event handlers for the random color button
            const createRandomColorMouseEnter = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.hoverBackgroundColor;
            };

            // Mouse enter and leave event handlers for the random color button
            const createRandomColorMouseLeave = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
            };

            /**
             * Initializes and configures the border style selection menu. This includes setting up the
             * dropdown menu's appearance based on the user's settings, and handling mouse enter, leave,
             * and click events to update the UI and bookmark style accordingly.
             */
            const initializeBorderStyleMenu = () => {
                const dropDownMenuButtonEl = document.getElementById('dropDownMenuButton');
                const styleButtonMenuTitleEl = document.getElementById('styleButtonMenuTitle');
                const arrowRightEl = document.getElementById('styleButtonArrow');

                // Adjust the background color of the dropdown button based on the window's background color brightness.
                dropDownMenuButtonEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                Object.assign(dropDownMenuButtonEl.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                arrowRightEl.style.clipPath = "path('M 0 0 L 10 20 L 20 0')";

                // Handle mouse enter event on the dropdown menu button.
                const handleMouseEnter = () => {
                    dropDownMenuButtonEl.dataset.status = 'true';
                    dropDownMenuButtonEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.hoverBackgroundColor;
                    arrowRightEl.style.clipPath = "path('M 0 20 L 20 10 L 0 0')";
                };

                // Handle mouse leave event on the dropdown menu button.
                const handleMouseLeave = () => {
                    dropDownMenuButtonEl.dataset.status = 'false';
                    dropDownMenuButtonEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                    arrowRightEl.style.clipPath = "path('M 0 0 L 10 20 L 20 0')";
                };

                // Handle click events on each border style option.
                borderSelectLiEl.forEach(element => {
                    const handleMouseClick = (el) => {
                        let title = '';
                        switch (position) {
                            case 'left':
                                editingObjBookmarkStyle.border.left.style = el.target.dataset.value;
                                break;
                            case 'top':
                                editingObjBookmarkStyle.border.top.style = el.target.dataset.value;
                                break;
                            case 'right':
                                editingObjBookmarkStyle.border.right.style = el.target.dataset.value;
                                break;
                            case 'bottom':
                                editingObjBookmarkStyle.border.bottom.style = el.target.dataset.value;
                                break;
                        }
                        title = el.target.dataset.value.charAt(0).toUpperCase() + el.target.dataset.value.slice(1);
                        styleButtonMenuTitleEl.innerHTML = title;
                        dropDownMenuButtonEl.dataset.status = 'false';
                        updateBookmarkStylePreview();
                    };
                    element.addEventListener('click', handleMouseClick);
                    currentClickEventListeners.push({ element, listener: handleMouseClick });
                });

                addRandomColorEl.addEventListener('click', createRandomColor);
                addRandomColorEl.addEventListener('mouseenter', createRandomColorMouseEnter);
                addRandomColorEl.addEventListener('mouseleave', createRandomColorMouseLeave);
                currentClickEventListeners.push({ element: addRandomColorEl, listener: createRandomColor });

                // Attach mouse enter and leave event listeners to the dropdown menu button.
                dropDownMenuButtonEl.addEventListener('mouseenter', handleMouseEnter);
                dropDownMenuButtonEl.addEventListener('mouseleave', handleMouseLeave);
            };

            // Call the function to set up the border style selection menu.
            initializeBorderStyleMenu();
            /**
             * Handles the input event for the border radius range input element. It updates the border radius
             * value in the newUserBookmarkStyle object based on the selected position. After updating the value,
             * it calls functions to update the UI to reflect the new border radius value and to preview the updated
             * bookmark style.
             */
            const handleBorderRadiusInputChange = () => {
                switch (position) {
                    case 'left':
                        editingObjBookmarkStyle.border.left.radius = bookmarkBoxBorderRadiusRangeEl.value;
                        break;
                    case 'top':
                        editingObjBookmarkStyle.border.top.radius = bookmarkBoxBorderRadiusRangeEl.value;
                        break;
                    case 'right':
                        editingObjBookmarkStyle.border.right.radius = bookmarkBoxBorderRadiusRangeEl.value;
                        break;
                    case 'bottom':
                        editingObjBookmarkStyle.border.bottom.radius = bookmarkBoxBorderRadiusRangeEl.value;
                        break;
                }
                updateInputRangeAndOutput('bookmarkBoxBorderRadiusRange', 'borderRadiusValue', bookmarkBoxBorderRadiusRangeEl.value);
                updateBookmarkStylePreview();
            };

            // Assign the event listener functions for handling changes to border width, color, and radius.
            currentInputRangeWidthListener = inputRangeWidth;
            currentInputColorEventListener = updateBorderColor;
            currentInputRangeRadiusListener = handleBorderRadiusInputChange;

            // Add event listeners to the respective elements for handling input changes.
            bookmarkBoxBorderWidthRangeEl.addEventListener('input', currentInputRangeWidthListener);
            borderColorInputEl.addEventListener('input', currentInputColorEventListener);
            bookmarkBoxBorderRadiusRangeEl.addEventListener('input', currentInputRangeRadiusListener);
        }

        /**
        * Sets up interactions for border position buttons, including initial styles, mouse enter/leave effects,
        * and click behavior. This function ensures that each button responds visually to user interactions and
        * updates the UI to reflect the selected border position.
        */
        const setupBorderPositionButtonsInteraction = () => {
            const borderPositionButtonsEl = document.querySelectorAll('.borderPosition');
            let position = 'left';

            /**
            * Changes the icon of the border position buttons based on the selected position.
            * This function iterates over all elements with the class 'borderPositionIcon' and
            * updates their clipPath style to reflect the selected border position. The clipPath
            * is set to a specific SVG path value that visually indicates the selected state for
            * the icon corresponding to the current position, and a different one for non-selected
            * icons. This visual feedback helps users understand which border position is currently
            * selected.
            *
            * @param {string} position - The border position that has been selected ('left', 'top', 'right', 'bottom').
            *                            This determines which icon will be shown as selected.
            */
            const changeButtonIcon = (position) => {
                const borderPositionIconEl = document.querySelectorAll('.borderPositionIcon');
                borderPositionIconEl.forEach(el => {
                    if (el.dataset.position == position) {
                        // Sets the clipPath for the selected position icon to a specific SVG path that indicates selection.
                        el.style.clipPath = 'path("M 10 0 C 10 0 10 0 10 0 L 10 0 C 15 0 20 5 20 10 L 20 10 C 20 15 16 20 10 20 L 10 20 C 5 20 0 15 0 10 L 0 10 C 0 5 5 0 10 0 L 10 5 L 10 17 L 15 5 L 10 5 L 5 5 L 10 17")';
                        el.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.font.color;
                    } else {
                        // Sets the clipPath for non-selected position icons to a different SVG path.
                        el.style.clipPath = 'path("M 10 0 C 10 0 10 0 10 0 L 10 0 C 15 0 20 5 20 10 L 20 10 C 20 15 16 20 10 20 L 10 20 C 5 20 0 15 0 10 L 0 10 C 0 5 5 0 10 0 L 10 5 L 10 15 L 10 5 L 10 5 L 10 5 L 10 15")';
                        el.style.backgroundColor = '#00000000';
                    }
                });
            }
            /**
            * Iterates over each border position button, setting up initial styles and event listeners for mouse enter, leave, and click events.
            * This function dynamically adjusts the background color of the buttons based on the window's background color brightness.
            * It also defines and assigns event handlers for mouse enter (to brighten the button), mouse leave (to reset the brightness),
            * and click (to apply the selected border style and add relevant event listeners for the UI elements associated with the selected border position).
            */
            borderPositionButtonsEl.forEach(button => {
                /**
                * Sets the default button style based on its position.
                * Applies the primary style if the button's position is 'left',
                * otherwise applies the secondary style.
                */
                const setDefaultButtonStyle = () => {
                    if (button.dataset.position === position) {
                        button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                        Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                    } else {
                        button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
                        Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.secondary.font);
                    }
                }
                setDefaultButtonStyle();
                /**
                * Handles the mouse enter event on a button, brightening its background color to indicate hover state.
                */
                const buttonPositionMouseEnter = (el) => {
                    if (el.target.getAttribute('data-position') === position) {
                        el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.hoverBackgroundColor;
                    } else {
                        el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                    }
                    Object.assign(el.target.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                };
                /**
                * Handles the mouse leave event on a button, resetting its background color to the default state.
                */
                const buttonPositionMouseLeave = (el) => {
                    if (el.target.dataset.position === position) {
                        el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                        Object.assign(el.target.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                    } else {
                        el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
                        Object.assign(el.target.style, userProfileExport.mainUserSettings.windows.button.secondary.font);
                    }
                };
                /**
                * Handles the click event on a button, applying the selected border style and setting up the UI for the selected border position.
                * This involves changing the icon to indicate the selected position, updating the border settings text, applying the border style to the UI,
                * and adding event listeners to all style elements relevant to the selected border position.
                *
                * @param {string} position - The border position selected by the user ('left', 'top', 'right', 'bottom').
                */
                const buttonPositionMouseClick = () => {
                    position = button.dataset.position;
                    changeButtonIcon(position);
                    updateBorderSettingsTitlesUI(position);
                    applyBorderStyleToUI(position);
                    eventListenerBorderStyleEl(position);
                    borderPositionButtonsEl.forEach(btn => {
                        if (btn.dataset.position === position) {
                            btn.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                            Object.assign(btn.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                        } else {
                            btn.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
                            Object.assign(btn.style, userProfileExport.mainUserSettings.windows.button.secondary.font);
                        }
                    });
                };
                // Assign event listeners for mouse enter, mouse leave, and click events to the button.
                button.addEventListener('mouseenter', buttonPositionMouseEnter);
                button.addEventListener('mouseleave', buttonPositionMouseLeave);
                button.addEventListener('click', buttonPositionMouseClick);
            });

            // Initial setup for the 'left' border position as the default selection.
            changeButtonIcon('left');
            updateBorderSettingsTitlesUI('left');
            applyBorderStyleToUI('left');
            eventListenerBorderStyleEl('left');
        };
        // Calls the function to set up interactions for border position buttons.
        setupBorderPositionButtonsInteraction();
    }

    /**
     * Initializes the color menu for the bookmark style settings. This function sets up the initial state
     * for the color menu, including creating variables to store references to event listeners for dynamic
     * interaction handling. These event listeners can be added or removed as needed to manage user interactions
     * with the color settings UI components.
     */
    const displayColorMenu = () => {
        // Variables to store references to event listeners for later removal if needed
        let randomColorListener = null; // Stores the event listener for random color button
        let applyColorListener = null; // Stores the event listener for apply color button
        let currentInputColorisListener = null; // Stores the event listener for color input changes
        let currentInputWidthRangeListener = null; // Stores the event listener for width range input changes
        let currentInputHeighRangeListener = null; // Stores the event listener for height range input changes
        let currentInputPositionXRangeListener = null; // Stores the event listener for horizontal position range input changes
        let currentInputPositionYRangeListener = null; // Stores the event listener for vertical position range input changes

        let colorHtmlBody = `
            <div id="bookmarkStyleColorSettings">
                <div id="colorPickerSection">
                    <label for="colorPickerInputTitle" id="colorPickerInputTitle">Choose Color:</label>
                    <div id="colorInputContainer">
                        <input type="text" id="colorPickerInput" data-coloris="" readonly="readonly">
                        <button id="randomColor"></button>
                        <button id="applyColor"></button>
                    </div>
                </div>
                <div id="colorWidthSection">
                    <label for="colorWidthRangeInput" id="colorWidthRangeInputTitle">Adjust Width:</label>
                    <input type="range" id="colorWidthRangeInput" min="0" max="100" step="1" value="100">
                    <div id="colorWidthRangeInputOutput">
                        <output id="colorWidthRangeInputValue">0</output>
                    </div>
                </div>
                <div id="colorHeightSection">
                    <label for="colorHeightRangeInput" id="colorHeightRangeInputTitle">:</label>
                    <input type="range" id="colorHeightRangeInput" min="0" max="100" step="1" value="100">
                    <div id="colorHeightRangeInputOutput">
                        <output id="colorHeightRangeInputValue">0</output>
                    </div>
                </div>
                <div id="colorRotationSection">
                    <label for="colorRotationInput" id="colorRotationInputTitle">Define Rotation Angle:</label>
                    <div id="colorRotationInputSection">
                        <input type="text" id="colorRotationInput" class="colorRotationInputDial" value="0">
                    </div>
                </div>
                <div id="colorPositionXSection">
                    <label for="colorPositionXRangeInput" id="colorPositionXRangeInputTitle">Horizontal Position:</label>
                    <input type="range" id="colorPositionXRangeInput" min="-100" max="100" step="1" value="100">
                    <div id="colorPositionXRangeInputOutput">
                        <output id="colorPositionXRangeInputValue">0</output>
                    </div>
                </div>
                <div id="colorPositionYSection">
                    <label for="colorPositionYRangeInput" id="colorPositionYRangeInputTitle">:</label>
                    <input type="range" id="colorPositionYRangeInput" min="-100" max="100" step="1" value="100">
                    <div id="colorPositionYRangeInputOutput">
                        <output id="colorPositionYRangeInputValue">0</output>
                    </div>
                </div>
            </div>
        `;
        styleMenuBodyEl.html(colorHtmlBody);


        /**
         * Updates the text content of color settings UI elements based on the current language settings.
         * This function dynamically sets the labels for the color picker, width, height, rotation, and position
         * controls according to the language preferences of the user. It ensures that the UI reflects the correct
         * terminology and language for better accessibility and user experience.
         */
        const updateColorSettingsTitlesUI = () => {
            // Retrieve each UI element by its ID.
            const colorPickerInputTitleEl = document.getElementById('colorPickerInputTitle');
            const colorWidthRangeInputTitleEl = document.getElementById('colorWidthRangeInputTitle');
            const colorHeightRangeInputTitleEl = document.getElementById('colorHeightRangeInputTitle');
            const colorRotationInputTitleEl = document.getElementById('colorRotationInputTitle');
            const colorPositionXRangeInputTitleEl = document.getElementById('colorPositionXRangeInputTitle');
            const colorPositionYRangeInputTitleEl = document.getElementById('colorPositionYRangeInputTitle');

            /**
             * Helper function to update the text content of a given element.
             * @param {HTMLElement} element - The DOM element whose text content needs to be updated.
             * @param {string} text - The new text content to be set for the element.
             */
            const updateTextContent = (element, text) => {
                if (element && text !== undefined) {
                    element.innerHTML = text;
                } else {
                    console.error('Invalid arguments passed to updateTextContent()', { element: element, text: text });
                }
            };

            // Update the text content of each UI element with the corresponding text from the current language object.
            updateTextContent(colorPickerInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._color.chooseColor);
            updateTextContent(colorWidthRangeInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._color.adjustWidth);
            updateTextContent(colorHeightRangeInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._color.adjustHeight);
            updateTextContent(colorRotationInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._color.defineRotationAngle);
            updateTextContent(colorPositionXRangeInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._color.horizontalPosition);
            updateTextContent(colorPositionYRangeInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._color.verticalPosition);
        };
        // Call the function to update the UI with the current titles.
        updateColorSettingsTitlesUI();

        /**
        * Updates the UI with the current color style settings for the bookmark.
        * This function retrieves the current color style settings from the `newUserBookmarkStyle.color` object,
        * including background color, width, height, left position, top position, and rotation angle. It then
        * updates the corresponding UI elements to reflect these settings. This includes setting the value of
        * the color picker input, updating the values and outputs for width, height, and position range inputs,
        * and setting the rotation angle on the color rotation input dial. Finally, it triggers an update to
        * the bookmark style preview to reflect these changes.
        */
        const updateColorStyleToUI = () => {
            const colorPickerInputEl = document.getElementById('colorPickerInput');
            // Select the color rotation input element by its class.
            const colorRotationInputEl = $(".colorRotationInputDial");
            if (editingObjBookmarkStyle.color.backgroundColor == '') { editingObjBookmarkStyle.color.backgroundColor = getRandomColor(); }
            // Copy the current color style settings from the newUserBookmarkStyle object.
            const colorStyle = editingObjBookmarkStyle.color;

            colorPickerInputEl.style.border = `1px solid ${invertHexColor(userProfileExport.mainUserSettings.windows.window.backgroundColor)}`;
            // Update the color picker input value with the current background color.
            updateColorisInputValue('colorPickerInput', colorStyle.backgroundColor);
            // Update the width range input and its output display with the current width.
            updateInputRangeAndOutput('colorWidthRangeInput', 'colorWidthRangeInputValue', colorStyle.width);
            // Update the height range input and its output display with the current height.
            updateInputRangeAndOutput('colorHeightRangeInput', 'colorHeightRangeInputValue', colorStyle.height);

            // Update the horizontal position range input and its output display with the current left position.
            updateInputRangeAndOutput('colorPositionXRangeInput', 'colorPositionXRangeInputValue', colorStyle.left);
            // Update the vertical position range input and its output display with the current top position.
            updateInputRangeAndOutput('colorPositionYRangeInput', 'colorPositionYRangeInputValue', colorStyle.top);

            // Set the rotation angle on the color rotation input dial and trigger a change event to update the UI.
            colorRotationInputEl.val(Number(colorStyle.angle)).trigger('change');
            // Trigger an update to the bookmark style preview to reflect the current color style settings.
            updateBookmarkStylePreview();
        };
        // Call the function to update the UI with the current color style settings.
        updateColorStyleToUI();

        const setButtonIconAndStyleToRandomColorAndApply = () => {
            const randomColorButtonEl = document.getElementById('randomColor');
            const applyColorButtonEl = document.getElementById('applyColor');
            randomColorButtonEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${userProfileExport.mainUserSettings.windows.button.primary.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22"/><path d="m18 2 4 4-4 4"/><path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2"/><path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8"/><path d="m18 14 4 4-4 4"/></svg>`;
            applyColorButtonEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${userProfileExport.mainUserSettings.windows.button.success.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>`;
            randomColorButtonEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
            applyColorButtonEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.success.backgroundColor;
        }
        setButtonIconAndStyleToRandomColorAndApply();

        /**
         * Sets up and manages event listeners for color style elements in the UI.
         * This function handles the addition and removal of event listeners for the color picker,
         * width, height, rotation, and position range inputs. It updates the newUserBookmarkStyle object
         * with the new values and applies these changes to the UI to provide immediate visual feedback.
         */
        const eventListenerColorStyle = () => {
            // Reference to the color style input elements in the DOM.
            const randomColorButtonEl = document.getElementById('randomColor');
            const applyColorButtonEl = document.getElementById('applyColor');
            const colorPickerInputEl = document.getElementById('colorPickerInput');
            const colorWidthRangeInputEl = document.getElementById('colorWidthRangeInput');
            const colorHeightRangeInputEl = document.getElementById('colorHeightRangeInput');
            const colorRotationInputEl = $(".colorRotationInputDial");
            const colorPositionXRangeInputEl = document.getElementById('colorPositionXRangeInput');
            const colorPositionYRangeInputEl = document.getElementById('colorPositionYRangeInput');

            // Remove existing event listeners if they are already set.
            if (currentInputColorisListener) {
                randomColorButtonEl.removeEventListener('input', randomColorListener);
                applyColorButtonEl.removeEventListener('input', applyColorListener);
                colorPickerInputEl.removeEventListener('input', currentInputColorisListener);
                colorWidthRangeInputEl.removeEventListener('input', currentInputWidthRangeListener);
                colorHeightRangeInputEl.removeEventListener('input', currentInputHeighRangeListener);
                colorPositionXRangeInputEl.removeEventListener('input', currentInputPositionXRangeListener);
                colorPositionYRangeInputEl.removeEventListener('input', currentInputPositionYRangeListener);
            }

            const applyColor = () => {
                editingObjBookmarkStyle.image.backgroundBase64 = '';
                editingObjBookmarkStyle.color.backgroundColor = colorPickerInputEl.value;
                // Trigger an update to the bookmark style preview to reflect the current color style settings.
                updateBookmarkStylePreview();
            }

            // Updates the background color in newUserBookmarkStyle and the UI.
            const mouseEnterApplyColorButton = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.success.hoverBackgroundColor;
            }

            // Updates the background color in newUserBookmarkStyle and the UI.
            const mouseLeaveApplyColorButton = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.success.backgroundColor;
            }

            // Updates the background color in newUserBookmarkStyle and the UI.
            const randomColor = () => {
                const randomHexColor = getRandomColor();
                // Update the color picker input value with the current background color.
                updateColorisInputValue('colorPickerInput', randomHexColor);
            }

            // Updates the background color in newUserBookmarkStyle and the UI.
            const mouseEnterRandomColorButton = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.hoverBackgroundColor;
            }

            // Updates the background color in newUserBookmarkStyle and the UI.
            const mouseLeaveRandomColorButton = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
            }

            // Updates the background color in newUserBookmarkStyle and the UI.
            const getColor = () => {
                colorPickerInputEl.style.backgroundColor = colorPickerInputEl.value;
                colorPickerInputEl.style.color = invertHexColor(colorPickerInputEl.value);
                updateBookmarkStylePreview();
            };

            // Updates the width in newUserBookmarkStyle and the UI.
            const getColorWidth = () => {
                editingObjBookmarkStyle.color.width = colorWidthRangeInputEl.value;
                updateInputRangeAndOutput('colorWidthRangeInput', 'colorWidthRangeInputValue', colorWidthRangeInputEl.value);
                updateBookmarkStylePreview();
            };

            // Updates the height in newUserBookmarkStyle and the UI.
            const getColorHeigh = () => {
                editingObjBookmarkStyle.color.height = colorHeightRangeInputEl.value;
                updateInputRangeAndOutput('colorHeightRangeInput', 'colorHeightRangeInputValue', colorHeightRangeInputEl.value);
                updateBookmarkStylePreview();
            };

            // Initializes the knob control for color rotation and updates newUserBookmarkStyle and the UI on change.
            colorRotationInputEl.knob({
                'min': 0,
                'max': 180,
                'width': 70,
                'height': 70,
                'step': 1,
                'displayPrevious': true,
                'displayInput': true,
                'fgColor': "#00177c",
                'inputColor': "#00ffff",
                'bgColor': "hsl(180, 100%, 50%)",
                'release': (value) => {
                    editingObjBookmarkStyle.color.angle = value;
                    updateBookmarkStylePreview();
                },
                'format': (value) => { return value + '°'; },
                'change': (value) => {
                    let percentage = value / 360;
                    let newBgColor = `hsl(180, 100%, ${70 - (percentage * 50)}%)`;
                    $('.colorRotationInputDial').trigger(
                        'configure', {
                        'bgColor': newBgColor,
                    }
                    );
                }
            });

            // Updates the left position in newUserBookmarkStyle and the UI.
            const getColorPositionX = () => {
                editingObjBookmarkStyle.color.left = colorPositionXRangeInputEl.value;
                updateInputRangeAndOutput('colorPositionXRangeInput', 'colorPositionXRangeInputValue', colorPositionXRangeInputEl.value);
                updateBookmarkStylePreview();
            };

            // Updates the top position in newUserBookmarkStyle and the UI.
            const getColorPositionY = () => {
                editingObjBookmarkStyle.color.top = colorPositionYRangeInputEl.value;
                updateInputRangeAndOutput('colorPositionYRangeInput', 'colorPositionYRangeInputValue', colorPositionYRangeInputEl.value);
                updateBookmarkStylePreview();
            };

            // Assign the event listeners to the respective elements.
            randomColorListener = randomColor;
            applyColorListener = applyColor;
            currentInputColorisListener = getColor;
            currentInputWidthRangeListener = getColorWidth;
            currentInputHeighRangeListener = getColorHeigh;
            currentInputPositionXRangeListener = getColorPositionX;
            currentInputPositionYRangeListener = getColorPositionY;

            randomColorButtonEl.addEventListener('click', randomColorListener);
            randomColorButtonEl.addEventListener('mouseenter', mouseEnterRandomColorButton);
            randomColorButtonEl.addEventListener('mouseleave', mouseLeaveRandomColorButton);
            applyColorButtonEl.addEventListener('click', applyColorListener);
            applyColorButtonEl.addEventListener('mouseenter', mouseEnterApplyColorButton);
            applyColorButtonEl.addEventListener('mouseleave', mouseLeaveApplyColorButton);
            colorPickerInputEl.addEventListener('input', currentInputColorisListener);
            colorWidthRangeInputEl.addEventListener('input', currentInputWidthRangeListener);
            colorHeightRangeInputEl.addEventListener('input', currentInputHeighRangeListener);
            colorPositionXRangeInputEl.addEventListener('input', currentInputPositionXRangeListener);
            colorPositionYRangeInputEl.addEventListener('input', currentInputPositionYRangeListener);
        };
        eventListenerColorStyle();
    }

    const displayImageMenu = () => {
        /**
        * Variables to store references to event listeners for later removal if needed.
        * These variables are used to keep track of event listeners associated with the image menu UI elements,
        * allowing for their removal when the UI is updated or no longer needed. This helps prevent memory leaks
        * and ensures that outdated event listeners do not interfere with the current state of the UI.
        */
        let currentInputFileListener = null; // Stores the event listener for file input changes (image selection).
        let currentInputWidthRangeListener = null; // Stores the event listener for width range input changes.
        let currentInputHeighRangeListener = null; // Stores the event listener for height range input changes.
        let currentInputPositionXRangeListener = null; // Stores the event listener for horizontal position range input changes.
        let currentInputPositionYRangeListener = null; // Stores the event listener for vertical position range input changes.

        let imageHtmlBody = `
            <div id="bookmarkStyleImageSettings">
                <div id="imagePickerSection">
                    <label for="imagePickerInputTitle" id="imagePickerInputTitle">Choose Image:</label>
                    <div id="imagePickerInputFileSection">
                        <input type="file" id="imagePickerInputFile" />
                        <span id="imagePickerInputFileInfo">Click here to open</span>
                        <span id="imagePickerInputFileName"></span>
                    </div>
                </div>
                <div id="imageWidthSection">
                    <label for="imageWidthRangeInput" id="imageWidthRangeInputTitle">Adjust Width:</label>
                    <input type="range" id="imageWidthRangeInput" min="0" max="100" step="1" value="100">
                    <div id="imageWidthRangeInputOutput">
                        <output id="imageWidthRangeInputValue">0</output>
                    </div>
                </div>
                <div id="imageHeightSection">
                    <label for="imageHeightRangeInput" id="imageHeightRangeInputTitle">Adjust Height:</label>
                    <input type="range" id="imageHeightRangeInput" min="0" max="100" step="1" value="100">
                    <div id="imageHeightRangeInputOutput">
                        <output id="imageHeightRangeInputValue">0</output>
                    </div>
                </div>
                <div id="imageRotationSection">
                    <label for="imageRotationInput" id="imageRotationInputTitle">Define Rotation Angle:</label>
                    <div id="imageRotationInputSection">
                        <input type="text" id="imageRotationInput" class="imageRotationInputDial" value="0">
                    </div>
                </div>
                <div id="imagePositionXSection">
                    <label for="imagePositionXRangeInput" id="imagePositionXRangeInputTitle">Horizontal Position:</label>
                    <input type="range" id="imagePositionXRangeInput" min="-100" max="100" step="1" value="100">
                    <div id="imagePositionXRangeInputOutput">
                        <output id="imagePositionXRangeInputValue">0</output>
                    </div>
                </div>
                <div id="imagePositionYSection">
                    <label for="imagePositionYRangeInput" id="imagePositionYRangeInputTitle">Vertical Position:</label>
                    <input type="range" id="imagePositionYRangeInput" min="-100" max="100" step="1" value="100">
                    <div id="imagePositionYRangeInputOutput">
                        <output id="imagePositionYRangeInputValue">0</output>
                    </div>
                </div>
            </div>
        `;
        styleMenuBodyEl.html(imageHtmlBody);

        /**
         * Updates the text content of image settings UI elements based on the current language settings.
         * This function dynamically sets the labels for the image picker, width, height, rotation, and position
         * controls according to the language preferences of the user. It ensures that the UI reflects the correct
         * terminology and language for better accessibility and user experience.
         */
        const updateImageSettingsTitlesUI = () => {
            // Retrieve each UI element by its ID.
            const imagePickerInputTitleEl = document.getElementById('imagePickerInputTitle');
            const imagePickerInputFileInfoEl = document.getElementById('imagePickerInputFileInfo');
            const imageWidthRangeInputTitleEl = document.getElementById('imageWidthRangeInputTitle');
            const imageHeightRangeInputTitleEl = document.getElementById('imageHeightRangeInputTitle');
            const imageRotationInputTitleEl = document.getElementById('imageRotationInputTitle');
            const imagePositionXRangeInputTitleEl = document.getElementById('imagePositionXRangeInputTitle');
            const imagePositionYRangeInputTitleEl = document.getElementById('imagePositionYRangeInputTitle');

            /**
             * Helper function to update the text content of a given element.
             * @param {HTMLElement} element - The DOM element whose text content needs to be updated.
             * @param {string} text - The new text content to be set for the element.
             */
            const updateTextContent = (element, text) => {
                if (element && text !== undefined) {
                    element.innerHTML = text;
                } else {
                    console.error('Invalid arguments passed to updateTextContent()', { element: element, text: text });
                }
            };

            // Update the text content of each UI element with the corresponding text from the current language object.
            updateTextContent(imagePickerInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._image.chooseImage);
            updateTextContent(imagePickerInputFileInfoEl, currentLanguageTextObj._createOrEditWindow._styleMenu._image.clickToOpen);
            updateTextContent(imageWidthRangeInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._image.adjustWidth);
            updateTextContent(imageHeightRangeInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._image.adjustHeight);
            updateTextContent(imageRotationInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._image.defineRotationAngle);
            updateTextContent(imagePositionXRangeInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._image.horizontalPosition);
            updateTextContent(imagePositionYRangeInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._image.verticalPosition);
        };
        // Call the function to update the UI with the current titles.
        updateImageSettingsTitlesUI();

        /**
        * Updates the UI with the current image style settings for the bookmark.
        * This function retrieves the current image style settings from the `newUserBookmarkStyle.image` object,
        * including image URL, width, height, left position, top position, and rotation angle. It then
        * updates the corresponding UI elements to reflect these settings. This includes setting the value of
        * the image picker input, updating the values and outputs for width, height, and position range inputs,
        * and setting the rotation angle on the image rotation input dial. Finally, it triggers an update to
        * the bookmark style preview to reflect these changes.
        */
        const updateImageStyleToUI = () => {
            const imagePickerInputFileSectionEl = document.getElementById("imagePickerInputFileSection");
            const imagePickerInputEl = document.getElementById('imagePickerInputFile');
            const imageStyle = editingObjBookmarkStyle.image;

            /**
             * Resets the image style settings for the bookmark.
             * This code block clears the background image stored in the newUserBookmarkStyle object
             * and resets the value of the image picker input element. It is used when updating the UI
             * to reflect a change in the selected image or when initializing the image settings UI.
             */
            imagePickerInputEl.value = null;

            /**
             * Sets the style for the image picker button.
             * This function updates the background color and font style of the image picker button
             * using the primary button styles defined in the user's profile settings.
             */
            const setImagePickerButtonStyle = () => {
                imagePickerInputFileSectionEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                Object.assign(imagePickerInputFileSectionEl.style, userProfileExport.mainUserSettings.windows.button.primary.font);
            };
            setImagePickerButtonStyle();

            // Update the width range input and its output display with the current width.
            updateInputRangeAndOutput('imageWidthRangeInput', 'imageWidthRangeInputValue', imageStyle.width);
            // Update the height range input and its output display with the current height.
            updateInputRangeAndOutput('imageHeightRangeInput', 'imageHeightRangeInputValue', imageStyle.height);

            // Update the horizontal position range input and its output display with the current left position.
            updateInputRangeAndOutput('imagePositionXRangeInput', 'imagePositionXRangeInputValue', imageStyle.left);
            // Update the vertical position range input and its output display with the current top position.
            updateInputRangeAndOutput('imagePositionYRangeInput', 'imagePositionYRangeInputValue', imageStyle.top);

            // Image rotation similar to the color rotation
            const imageRotationInputEl = $(".imageRotationInputDial");
            // Set the rotation angle on the image rotation input dial and trigger a change event to update the UI.
            if (imageRotationInputEl.length > 0) {
                imageRotationInputEl.val(Number(imageStyle.angle)).trigger('change');
            }

            // Trigger an update to the bookmark style preview to reflect the current image style settings.
            updateBookmarkStylePreview();
        };
        // Call the function to update the UI with the current image style settings.
        updateImageStyleToUI();

        /**
         * Sets up and manages event listeners for image style elements in the UI.
         * This function handles the addition and removal of event listeners for the image picker,
         * width, height, rotation, and position range inputs. It updates the newUserBookmarkStyle object
         * with the new values and applies these changes to the UI to provide immediate visual feedback.
         */
        const eventListenerImageStyleEl = () => {
            // Reference to the image style input elements in the DOM.
            const imagePickerInputFileSectionEl = document.getElementById("imagePickerInputFileSection");
            const imagePickerInputEl = document.getElementById('imagePickerInputFile');
            const imagePickerInputFileNameEl = document.getElementById('imagePickerInputFileName');
            const imageWidthRangeInputEl = document.getElementById('imageWidthRangeInput');
            const imageHeightRangeInputEl = document.getElementById('imageHeightRangeInput');
            const imageRotationInputEl = $(".imageRotationInputDial");
            const imagePositionXRangeInputEl = document.getElementById('imagePositionXRangeInput');
            const imagePositionYRangeInputEl = document.getElementById('imagePositionYRangeInput');

            // Remove existing event listeners if they are already set.
            if (currentInputFileListener) {
                imagePickerInputEl.removeEventListener('input', currentInputFileListener);
                imageWidthRangeInputEl.removeEventListener('input', currentInputWidthRangeListener);
                imageHeightRangeInputEl.removeEventListener('input', currentInputHeighRangeListener);
                imagePositionXRangeInputEl.removeEventListener('input', currentInputPositionXRangeListener);
                imagePositionYRangeInputEl.removeEventListener('input', currentInputPositionYRangeListener);
            }

            /**
            * Handles the selection of an image file from the input element, reads the file,
            * and updates the newUserBookmarkStyle object with the base64 encoded image.
            * It checks if the selected file is a PNG or JPEG image before processing.
            * If the file is not of the correct type, it logs a warning and stops further execution.
            * Upon successful reading and conversion of the image file to base64, it updates the
            * newUserBookmarkStyle object's image backgroundBase64 property and triggers an update
            * to the bookmark style preview.
            *
            * @param {Event} event - The input event triggered by selecting a file.
            */
            const getImage = (event) => {
                const file = event.target.files[0];
                let fileName = '';
                if (!file) {
                    console.error('Failed to get file');
                    return;
                }
                // Extracts the file name and extension, then truncates the file name if necessary.
                if (file.name) {
                    const [name, extension] = file.name.split(/\.(?=[^\.]+$)/);
                    // Truncates the middle file name and appends the file extension.
                    fileName = `${truncateString(name, 13, 3)}.${extension}`;
                }
                // Creates a FileReader to read the selected image file.
                const reader = new FileReader();
                // Defines the onload event handler for the FileReader.
                // This event is triggered when the FileReader has successfully read the file.
                reader.onload = (e) => {
                    // Extracts the MIME type from the result to verify the file type.
                    let fileType = e.target.result.split(';')[0];
                    // Checks if the file type is either PNG or JPEG. If not, logs a warning and exits the function.
                    if (!/^data:image\/(png|jpeg)$/.test(fileType)) {
                        console.warn("File is not a PNG or JPEG image.");
                        showMessageToastify('error', ``, `File is not a PNG or JPEG image.`, 4000, false, 'bottom', 'right', true);
                        return;
                    }
                    // Calls resizeImageBase64 function with the base64 encoded string of the image file.
                    // This function is resize the image and return a Promise with the resized image's base64 string.
                    resizeImageBase64(e.target.result).then(base64Str => {
                        // Clears any existing background color in newUserBookmarkStyle to prioritize the image.
                        editingObjBookmarkStyle.color.backgroundColor = '';
                        // Updates newUserBookmarkStyle with the base64 string of the resized image.
                        editingObjBookmarkStyle.image.backgroundBase64 = base64Str;
                        // Show file name to UI;
                        imagePickerInputFileNameEl.innerHTML = fileName;
                        // Calls updateBookmarkStylePreview to reflect the changes in the UI.
                        updateBookmarkStylePreview();
                    });
                };
                // Initiates the read operation on the selected file as a Data URL (base64 encoded string).
                reader.readAsDataURL(file);
            };

            // Handles the mouse enter event on the image picker input file section.
            const mouseEnterImagePickerInput = () => {
                imagePickerInputFileSectionEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.hoverBackgroundColor;
            };

            // Handles the mouse leave event on the image picker input file section.
            const mouseLeaveImagePickerInput = () => {
                imagePickerInputFileSectionEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
            };

            // Updates the width in newUserBookmarkStyle and the UI.
            const getImageWidth = () => {
                editingObjBookmarkStyle.image.width = imageWidthRangeInputEl.value;
                updateInputRangeAndOutput('imageWidthRangeInput', 'imageWidthRangeInputValue', imageWidthRangeInputEl.value);
                updateBookmarkStylePreview();
            };

            // Updates the height in newUserBookmarkStyle and the UI.
            const getImageHeight = () => {
                editingObjBookmarkStyle.image.height = imageHeightRangeInputEl.value;
                updateInputRangeAndOutput('imageHeightRangeInput', 'imageHeightRangeInputValue', imageHeightRangeInputEl.value);
                updateBookmarkStylePreview();
            };

            // Updates the rotation in newUserBookmarkStyle and the UI.
            const getImageRotation = (value) => {
                editingObjBookmarkStyle.image.angle = value;
                updateBookmarkStylePreview();
            };

            // Updates the left position in newUserBookmarkStyle and the UI.
            const getImagePositionX = () => {
                editingObjBookmarkStyle.image.left = imagePositionXRangeInputEl.value;
                updateInputRangeAndOutput('imagePositionXRangeInput', 'imagePositionXRangeInputValue', imagePositionXRangeInputEl.value);
                updateBookmarkStylePreview();
            };

            // Updates the top position in newUserBookmarkStyle and the UI.
            const getImagePositionY = () => {
                editingObjBookmarkStyle.image.top = imagePositionYRangeInputEl.value;
                updateInputRangeAndOutput('imagePositionYRangeInput', 'imagePositionYRangeInputValue', imagePositionYRangeInputEl.value);
                updateBookmarkStylePreview();
            };

            // Assign the event listeners to the respective elements.
            currentInputFileListener = getImage;
            currentInputWidthRangeListener = getImageWidth;
            currentInputHeighRangeListener = getImageHeight;
            currentInputPositionXRangeListener = getImagePositionX;
            currentInputPositionYRangeListener = getImagePositionY;

            // Assign the event listeners to the respective elements.
            imagePickerInputEl.addEventListener('change', currentInputFileListener);
            imagePickerInputEl.addEventListener('mouseenter', mouseEnterImagePickerInput);
            imagePickerInputEl.addEventListener('mouseleave', mouseLeaveImagePickerInput);
            imageWidthRangeInputEl.addEventListener('input', currentInputWidthRangeListener);
            imageHeightRangeInputEl.addEventListener('input', currentInputHeighRangeListener);
            imagePositionXRangeInputEl.addEventListener('input', currentInputPositionXRangeListener);
            imagePositionYRangeInputEl.addEventListener('input', currentInputPositionYRangeListener);
            imageRotationInputEl.knob({
                'min': 0,
                'max': 180,
                'width': 70,
                'height': 70,
                'step': 1,
                'displayPrevious': true,
                'displayInput': true,
                'fgColor': "#00177c",
                'inputColor': "#00ffff",
                'bgColor': "hsl(180, 100%, 50%)",
                'release': (value) => {
                    editingObjBookmarkStyle.image.angle = value;
                    updateBookmarkStylePreview();
                },
                'format': (value) => { return value + '°'; },
                'change': (value) => {
                    let percentage = value / 360;
                    let newBgColor = `hsl(180, 100%, ${70 - (percentage * 50)}%)`;
                    $('.colorRotationInputDial').trigger(
                        'configure', {
                        'bgColor': newBgColor,
                    }
                    );
                },
                'release': getImageRotation
            });
        };
        eventListenerImageStyleEl();
    }

    const displayTextMenu = () => {
        // Variables to store references to event listeners for later removal if needed
        let currentInputColorisBackgroundListener = null; // Stores the event listener for color input changes
        let currentInputWidthRangeListener = null; // Stores the event listener for width range input changes
        let currentInputHeighRangeListener = null; // Stores the event listener for height range input changes
        let currentInputPositionXRangeListener = null; // Stores the event listener for horizontal position range input changes
        let currentInputPositionYRangeListener = null; // Stores the event listener for vertical position range input changes

        let textHtmlBody = `
            <div id="bookmarkStyleTextSettings">
                <div id="textBackgroundPickerSection">
                    <label for="backgroundColorPickerInput" id="backgroundColorPickerInputTitle">Choose Color:</label>
                    <div id="colorInputContainer">
                        <input type="text" id="backgroundColorPickerInput" data-coloris="" readonly="readonly">
                        <button id="addRandomColor"></button>
                    </div>
                </div>
                <div id="textWidthSection">
                    <label for="textWidthRangeInput" id="textWidthRangeInputTitle">Adjust Width:</label>
                    <input type="range" id="textWidthRangeInput" min="0" max="100" step="1" value="100">
                    <div id="textWidthRangeInputOutput">
                        <output id="textWidthRangeInputValue">0</output>
                    </div>
                </div>
                <div id="textHeightSection">
                    <label for="textHeightRangeInput" id="textHeightRangeInputTitle">Adjust Height:</label>
                    <input type="range" id="textHeightRangeInput" min="0" max="100" step="1" value="100">
                    <div id="textHeightRangeInputOutput">
                        <output id="textHeightRangeInputValue">0</output>
                    </div>
                </div>
                <div id="textRotationSection">
                    <label for="textRotationInput" id="textRotationInputTitle">Define Rotation Angle:</label>
                    <div id="textRotationInputSection">
                        <input type="text" id="textRotationInput" class="textRotationInputDial" value="0">
                    </div>
                </div>
                <div id="textPositionXSection">
                    <label for="textPositionXRangeInput" id="textPositionXRangeInputTitle">Horizontal Position:</label>
                    <input type="range" id="textPositionXRangeInput" min="0" max="100" step="1" value="100">
                    <div id="textPositionXRangeInputOutput">
                        <output id="textPositionXRangeInputValue">0</output>
                    </div>
                </div>
                <div id="textPositionYSection">
                    <label for="textPositionYRangeInput" id="textPositionYRangeInputTitle">Vertical Position:</label>
                    <input type="range" id="textPositionYRangeInput" min="0" max="100" step="1" value="100">
                    <div id="textPositionYRangeInputOutput">
                        <output id="textPositionYRangeInputValue">0</output>
                    </div>
                </div>
            </div>
        `;
        styleMenuBodyEl.html(textHtmlBody);

        /**
         * Updates the text content of text settings UI elements based on the current language settings.
         * This function dynamically sets the labels for the text color picker, width, height, rotation, and position
         * controls according to the language preferences of the user. It ensures that the UI reflects the correct
         * terminology and language for better accessibility and user experience.
         */
        const updateTextSettingsTitlesUI = () => {
            // Retrieve each UI element by its ID.
            const backgroundColorPickerInputTitleEl = document.getElementById('backgroundColorPickerInputTitle');
            const textWidthRangeInputTitleEl = document.getElementById('textWidthRangeInputTitle');
            const textHeightRangeInputTitleEl = document.getElementById('textHeightRangeInputTitle');
            const textRotationInputTitleEl = document.getElementById('textRotationInputTitle');
            const textPositionXRangeInputTitleEl = document.getElementById('textPositionXRangeInputTitle');
            const textPositionYRangeInputTitleEl = document.getElementById('textPositionYRangeInputTitle');

            /**
             * Helper function to update the text content of a given element.
             * @param {HTMLElement} element - The DOM element whose text content needs to be updated.
             * @param {string} text - The new text content to be set for the element.
             */
            const updateTextContent = (element, text) => {
                if (element && text !== undefined) {
                    element.innerHTML = text;
                } else {
                    console.error('Invalid arguments passed to updateTextContent()', { element: element, text: text });
                }
            };

            // Update the text content of each UI element with the corresponding text from the current language object.
            updateTextContent(backgroundColorPickerInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._text.backgroundColor);
            updateTextContent(textWidthRangeInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._text.adjustWidth);
            updateTextContent(textHeightRangeInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._text.adjustHeight);
            updateTextContent(textRotationInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._text.defineRotationAngle);
            updateTextContent(textPositionXRangeInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._text.horizontalPosition);
            updateTextContent(textPositionYRangeInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._text.verticalPosition);
        };
        // Call the function to update the UI with the current titles.
        updateTextSettingsTitlesUI();

        /**
        * Updates the UI with the current text style settings for the bookmark.
        * This function retrieves the current text style settings from the `newUserBookmarkStyle.text` object,
        * including font color, width, height, left position, top position, and rotation angle. It then
        * updates the corresponding UI elements to reflect these settings. This includes setting the value of
        * the text color input, updating the values and outputs for width, height, and position range inputs,
        * and setting the rotation angle on the text rotation input dial. Finally, it triggers an update to
        * the bookmark style preview to reflect these changes.
        */
        const updateTextStyleToUI = () => {
            const addRandomColorEl = document.getElementById('addRandomColor');
            const backgroundColorPickerInputEl = document.getElementById('backgroundColorPickerInput');
            // Select the text rotation input element by its class.
            const textRotationInputEl = $(".textRotationInputDial");
            // Copy the current text style settings from the newUserBookmarkStyle object.
            const textStyle = editingObjBookmarkStyle.text;

            /**
             * Add a random color button to the background color picker.
             * Creates a CSS string that sets the background color of the button to the user's primary button color
             * and the color of the SVG icon to the user's primary button font color.
             * The SVG icon is a random color icon.
             */
            const addIconToRandomColorEl = () => {
                addRandomColorEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                addRandomColorEl.innerHTML = `<svg fill="${userProfileExport.mainUserSettings.windows.button.primary.font.color}" width="30px" height="25px" viewBox="0 -4 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m24.983 8.539v-2.485h-4.902l-3.672 5.945-2.099 3.414-3.24 5.256c-.326.51-.889.844-1.53.845h-9.54v-3.568h8.538l3.673-5.946 2.099-3.414 3.24-5.256c.325-.509.886-.843 1.525-.845h5.904v-2.485l7.417 4.27-7.417 4.27z"/><path d="m12.902 6.316-.63 1.022-1.468 2.39-2.265-3.675h-8.538v-3.568h9.54c.641.001 1.204.335 1.526.838l.004.007 1.836 2.985z"/><path d="m24.983 24v-2.485h-5.904c-.639-.002-1.201-.336-1.521-.838l-.004-.007-1.836-2.985.63-1.022 1.468-2.39 2.264 3.675h4.902v-2.485l7.417 4.27-7.417 4.27z"/></svg>`;
            };
            addIconToRandomColorEl();

            backgroundColorPickerInputEl.style.border = `1px solid ${invertHexColor(userProfileExport.mainUserSettings.windows.window.backgroundColor)}`;
            updateColorisInputValue('backgroundColorPickerInput', textStyle.backgroundColor == '' ? getRandomColor() : textStyle.backgroundColor, true);
            // Update the width range input and its output display with the current width.
            updateInputRangeAndOutput('textWidthRangeInput', 'textWidthRangeInputValue', textStyle.width);
            // Update the height range input and its output display with the current height.
            updateInputRangeAndOutput('textHeightRangeInput', 'textHeightRangeInputValue', textStyle.height);

            // Update the horizontal position range input and its output display with the current left position.
            updateInputRangeAndOutput('textPositionXRangeInput', 'textPositionXRangeInputValue', textStyle.left);
            // Update the vertical position range input and its output display with the current top position.
            updateInputRangeAndOutput('textPositionYRangeInput', 'textPositionYRangeInputValue', textStyle.top);

            // Set the rotation angle on the text rotation input dial and trigger a change event to update the UI.
            textRotationInputEl.val(Number(textStyle.angle)).trigger('change');
            // Trigger an update to the bookmark style preview to reflect the current text style settings.
            updateBookmarkStylePreview();
        };
        // Call the function to update the UI with the current text style settings.
        updateTextStyleToUI();

        /**
         * Sets up and manages event listeners for color style elements in the UI.
         * This function handles the addition and removal of event listeners for the color picker,
         * width, height, rotation, and position range inputs. It updates the newUserBookmarkStyle object
         * with the new values and applies these changes to the UI to provide immediate visual feedback.
         */
        const eventListenerColorStyleEl = () => {
            // Reference to the color style input elements in the DOM.
            const backgroundColorPickerInputEl = document.getElementById('backgroundColorPickerInput');
            const addRandomColorEl = document.getElementById('addRandomColor');
            const textWidthRangeInputEl = document.getElementById('textWidthRangeInput');
            const textHeightRangeInputEl = document.getElementById('textHeightRangeInput');
            const textRotationInputDialEl = $(".textRotationInputDial");
            const textPositionXRangeInputEl = document.getElementById('textPositionXRangeInput');
            const textPositionYRangeInputEl = document.getElementById('textPositionYRangeInput');

            // Remove existing event listeners if they are already set.
            if (currentInputColorisBackgroundListener) {
                backgroundColorPickerInputEl.removeEventListener('input', currentInputColorisBackgroundListener);
                textWidthRangeInputEl.removeEventListener('input', currentInputWidthRangeListener);
                textHeightRangeInputEl.removeEventListener('input', currentInputHeighRangeListener);
                textPositionXRangeInputEl.removeEventListener('input', currentInputPositionXRangeListener);
                textPositionYRangeInputEl.removeEventListener('input', currentInputPositionYRangeListener);
            }

            // Updates the background color in newUserBookmarkStyle and the UI.
            const getBackground = () => {
                editingObjBookmarkStyle.text.backgroundColor = backgroundColorPickerInputEl.value;
                backgroundColorPickerInputEl.style.backgroundColor = backgroundColorPickerInputEl.value.length === 9 ? backgroundColorPickerInputEl.value.substring(0, 7) : backgroundColorPickerInputEl.value;
                backgroundColorPickerInputEl.style.color = backgroundColorPickerInputEl.value.length === 9 ? invertHexColor(backgroundColorPickerInputEl.value.substring(0, 7)) : invertHexColor(backgroundColorPickerInputEl.value);
                updateBookmarkStylePreview();
            };

            const getRandomBackgroundColor = () => {
                const randomColor = getRandomColor();
                backgroundColorPickerInputEl.value = randomColor;
                backgroundColorPickerInputEl.style.backgroundColor = randomColor;
                backgroundColorPickerInputEl.style.color = invertHexColor(randomColor);
                editingObjBookmarkStyle.text.backgroundColor = randomColor;
                backgroundColorPickerInputEl.style.border = `1px solid ${checkIfColorBrightness(editingObjBookmarkStyle.text.backgroundColor, 120) ? '#000000' : '#ffffff'}`;
                addRandomColorEl.style.border = `1px solid ${checkIfColorBrightness(editingObjBookmarkStyle.text.backgroundColor, 120) ? '#000000' : '#ffffff'}`;
                updateBookmarkStylePreview();
            }

            // Changes the background color when the mouse enters the element.
            const addRandomColorElMouseEnter = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.hoverBackgroundColor;
            }

            // Restores the original background color when the mouse leaves the element.
            const addRandomColorElMouseLeave = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
            }

            // Updates the width in newUserBookmarkStyle and the UI.
            const getColorWidth = () => {
                editingObjBookmarkStyle.text.width = textWidthRangeInputEl.value;
                updateInputRangeAndOutput('textWidthRangeInput', 'textWidthRangeInputValue', textWidthRangeInputEl.value);
                updateBookmarkStylePreview();
            };

            // Updates the height in newUserBookmarkStyle and the UI.
            const getColorHeigh = () => {
                editingObjBookmarkStyle.text.height = textHeightRangeInputEl.value;
                updateInputRangeAndOutput('textHeightRangeInput', 'textHeightRangeInputValue', textHeightRangeInputEl.value);
                updateBookmarkStylePreview();
            };

            // Initializes the knob control for color rotation and updates newUserBookmarkStyle and the UI on change.
            textRotationInputDialEl.knob({
                'min': 0,
                'max': 180,
                'width': 70,
                'height': 70,
                'step': 1,
                'displayPrevious': true,
                'displayInput': true,
                'fgColor': "#00177c",
                'inputColor': "#00ffff",
                'bgColor': "hsl(180, 100%, 50%)",
                'release': (value) => {
                    editingObjBookmarkStyle.text.angle = value;
                    updateBookmarkStylePreview();
                },
                'format': (value) => { return value + '°'; },
                'change': (value) => {
                    let percentage = value / 360;
                    let newBgColor = `hsl(180, 100%, ${70 - (percentage * 50)}%)`;
                    $('.colorRotationInputDial').trigger(
                        'configure', {
                        'bgColor': newBgColor,
                    }
                    );
                }
            });

            // Updates the left position in newUserBookmarkStyle and the UI.
            const getColorPositionX = () => {
                editingObjBookmarkStyle.text.left = textPositionXRangeInputEl.value;
                updateInputRangeAndOutput('textPositionXRangeInput', 'textPositionXRangeInputValue', textPositionXRangeInputEl.value);
                updateBookmarkStylePreview();
            };

            // Updates the top position in newUserBookmarkStyle and the UI.
            const getColorPositionY = () => {
                editingObjBookmarkStyle.text.top = textPositionYRangeInputEl.value;
                updateInputRangeAndOutput('textPositionYRangeInput', 'textPositionYRangeInputValue', textPositionYRangeInputEl.value);
                updateBookmarkStylePreview();
            };

            // Assign the event listeners to the respective elements.
            currentInputColorisBackgroundListener = getBackground;
            currentInputWidthRangeListener = getColorWidth;
            currentInputHeighRangeListener = getColorHeigh;
            currentInputPositionXRangeListener = getColorPositionX;
            currentInputPositionYRangeListener = getColorPositionY;

            backgroundColorPickerInputEl.addEventListener('input', currentInputColorisBackgroundListener);
            addRandomColorEl.addEventListener('click', getRandomBackgroundColor);
            addRandomColorEl.addEventListener('mouseenter', addRandomColorElMouseEnter);
            addRandomColorEl.addEventListener('mouseleave', addRandomColorElMouseLeave);
            textWidthRangeInputEl.addEventListener('input', currentInputWidthRangeListener);
            textHeightRangeInputEl.addEventListener('input', currentInputHeighRangeListener);
            textPositionXRangeInputEl.addEventListener('input', currentInputPositionXRangeListener);
            textPositionYRangeInputEl.addEventListener('input', currentInputPositionYRangeListener);
        };
        eventListenerColorStyleEl();
    }

    const displayFontMenu = () => {
        // Variables to store references to event listeners for later removal if needed
        let currentInputColorisFontColorListener = null; // Stores the event listener for color input changes
        let currentInputFontSizeRangeListener = null; // Stores the event listener for width range input changes
        let currentClickEventListeners = [];
        const fontFamilies = getSupportedFontFamilies();
        const borderColor = checkIfColorBrightness(userProfileExport.mainUserSettings.windows.window.backgroundColor) ? '#000000' : '#ffffff';
        const tooltipStyle = {
            backgroundColor: userProfileExport.mainUserSettings.windows.window.backgroundColor,
            color: userProfileExport.mainUserSettings.windows.window.font.color,
            padding: '5px',
            borderRadius: '5px',
            border: `1px solid ${borderColor}`,
            fontSize: `${userProfileExport.mainUserSettings.windows.window.font.fontSize}px`,
            fontWeight: userProfileExport.mainUserSettings.windows.window.font.fontWeight,
            fontFamily: userProfileExport.mainUserSettings.windows.window.font.fontFamily,
            width: 'auto',
            maxWidth: '250px',
        }

        const fontHtmlBody = `
            <div id="bookmarkStyleFontSettings">
                <div id="fontBackgroundPickerSection">
                    <label for="fontColorPickerInput" id="fontColorPickerInputTitle">Choose Color:</label>
                    <div id="colorInputContainer">
                        <input type="text" id="fontColorPickerInput" data-coloris="" readonly="readonly">
                        <button id="addRandomColor"></button>
                    </div>
                </div>
                <div id="fontWeightButtonsSection">
                    <label for="fontWeightButtons" id="fontWeightButtonsTitle">Choose Font Weight:</label>
                    <div id="buttonsWeightSections">
                        <button type="button" class="buttonWeight" data-weight="200">Ultra Light</button>
                        <button type="button" class="buttonWeight" data-weight="300">Light</button>
                        <button type="button" class="buttonWeight" data-weight="400">Normal</button>
                        <button type="button" class="buttonWeight" data-weight="500">Medium</button>
                        <button type="button" class="buttonWeight" data-weight="600">Semibold</button>
                        <button type="button" class="buttonWeight" data-weight="700">Bold</button>
                        <button type="button" class="buttonWeight" data-weight="800">Ultra Bold</button>
                        <button type="button" class="buttonWeight" data-weight="900">Black</button>
                    </div>
                </div>
                <div id="fontSizeSection">
                    <label for="fontSizeRangeInput" id="fontSizeRangeInputTitle">Adjust Font Size:</label>
                    <input type="range" id="fontSizeRangeInput" min="5" max="20" step="1" value="12">
                    <div id="fontSizeRangeInputOutput">
                        <output id="fontSizeRangeInputValue">0</output>
                    </div>
                </div>
                <div id="fontStyleButtonsSection">
                    <label for="fontStyleButtons" id="fontStyleButtonsTitle">Choose Font Style:</label>
                    <div id="buttonsStyleSections">
                        <button type="button" class="buttonStyle" data-style="normal">Normal</button>
                        <button type="button" class="buttonStyle" data-style="italic">Italic</button>
                    </div>
                </div>
                <div id="fontFamilySection">
                    <div id="fontFamilyTitle">Choose Font Family:</div>
                    <div id="fontFamilyDropDownOptionsBox">
                        <button type="button" id="fontFamilyDropDownMenuButton" data-status="false">
                            <div id="fontFamilyDropDownMenuTitle">
                                <span id="fontFamilyButtonMenuTitle">Select</span>
                                <span id="fontFamilyButtonArrow"></span>
                            </div>
                            <ul id="fontFamilySelectUl"></ul>
                        </button>
                    </div>
                </div>
                <div id="fontAlignmentButtonsSection">
                <label for="fontAlignmentButtons" id="fontAlignmentButtonsTitle">Choose Font Alignment:</label>
                <div id="buttonsAlignmentSections">
                    <button type="button" class="buttonAlignment" data-align="flex-start">Left</button>
                    <button type="button" class="buttonAlignment" data-align="center">Center</button>
                    <button type="button" class="buttonAlignment" data-align="flex-end">Right</button>
                </div>
            </div>
            </div>
        `;

        styleMenuBodyEl.html(fontHtmlBody);
        updateBookmarkStylePreview();

        /**
         * Populates the font family dropdown list in the UI.
         * This function generates a list of supported font families as list items
         * and inserts them into the font family selection dropdown. It ensures that
         * the font family options are dynamically populated based on the available font
         * families array.
         */
        const createListOfFontFamily = () => {
            if (fontFamilies.length <= 0) return;
            const fontFamilySelectUlEl = document.getElementById('fontFamilySelectUl');
            let fontFamiliesHtml = ``;
            fontFamilies.forEach((fontFamily) => {
                fontFamiliesHtml += `<li class="fontFamilySelectLi" data-id="${fontFamily.id}">${fontFamily.fontFamily}</li>`;
            });
            fontFamilySelectUlEl.innerHTML = fontFamiliesHtml;
        }
        createListOfFontFamily();

        /**
        * Updates the text content of font settings UI elements based on the current language settings.
        * This function dynamically sets the labels for the font color picker, weight, size, style, and family
        * controls according to the language preferences of the user. It ensures that the UI reflects the correct
        * terminology and language for better accessibility and user experience.
        */
        const updateFontSettingsTitlesUI = () => {
            // Retrieve each UI element by its ID.
            const fontColorPickerInputTitleEl = document.getElementById('fontColorPickerInputTitle');
            const fontWeightButtonsTitleEl = document.getElementById('fontWeightButtonsTitle');
            const fontSizeRangeInputTitleEl = document.getElementById('fontSizeRangeInputTitle');
            const fontStyleButtonsTitleEl = document.getElementById('fontStyleButtonsTitle');
            const fontFamilyTitleEl = document.getElementById('fontFamilyTitle');
            const fontAlignmentButtonsTitleEl = document.getElementById('fontAlignmentButtonsTitle');

            /**
            * Helper function to update the text content of a given element.
            * @param {HTMLElement} element - The DOM element whose text content needs to be updated.
            * @param {string} text - The new text content to be set for the element.
            */
            const updateTextContent = (element, text) => {
                if (element && text !== undefined) {
                    element.innerHTML = text;
                } else {
                    console.error('Invalid arguments passed to updateTextContent()', { element: element, text: text });
                }
            };

            // Update the text content of each UI element with the corresponding text from the current language object.
            updateTextContent(fontColorPickerInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._font.chooseColor);
            updateTextContent(fontWeightButtonsTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._font.chooseFontWeight);
            updateTextContent(fontSizeRangeInputTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._font.adjustFontSize);
            updateTextContent(fontStyleButtonsTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._font.chooseFontStyle);
            updateTextContent(fontFamilyTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._font.chooseFontFamily);
            updateTextContent(fontAlignmentButtonsTitleEl, currentLanguageTextObj._createOrEditWindow._styleMenu._font.chooseFontAlignment);
        };
        // Call the function to update the UI with the current titles.
        updateFontSettingsTitlesUI();

        const updateFontStyleToUI = () => {
            const fontColorPickerInputEl = document.getElementById('fontColorPickerInput');
            const addRandomColorEl = document.getElementById('addRandomColor');
            const buttonWeightEl = document.querySelectorAll('#buttonsWeightSections button');
            const buttonStyleEl = document.querySelectorAll('#buttonsStyleSections button');
            const buttonAlignmentEl = document.querySelectorAll('.buttonAlignment');
            const fontFamilyDropDownMenuButtonEl = document.getElementById('fontFamilyDropDownMenuButton');
            const fontFamilyButtonMenuTitleEl = document.getElementById('fontFamilyButtonMenuTitle');
            const fontFamilyButtonArrowEl = document.getElementById('fontFamilyButtonArrow');
            const fontFamilySelectUlEl = document.getElementById('fontFamilySelectUl');
            const fontFamilySelectLiEl = document.querySelectorAll('.fontFamilySelectLi');
            // Copy the current text style settings from the newUserBookmarkStyle object.
            const fontStyle = editingObjBookmarkStyle.font;
            updateInputRangeAndOutput('fontSizeRangeInput', 'fontSizeRangeInputValue', fontStyle.size);

            /**
             * Add a random color button to the background color picker.
             * Creates a CSS string that sets the background color of the button to the user's primary button color
             * and the color of the SVG icon to the user's primary button font color.
             * The SVG icon is a random color icon.
             */
            const addIconToRandomColorEl = () => {
                addRandomColorEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                addRandomColorEl.innerHTML = `<svg fill="${userProfileExport.mainUserSettings.windows.button.primary.font.color}" width="30px" height="25px" viewBox="0 -4 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m24.983 8.539v-2.485h-4.902l-3.672 5.945-2.099 3.414-3.24 5.256c-.326.51-.889.844-1.53.845h-9.54v-3.568h8.538l3.673-5.946 2.099-3.414 3.24-5.256c.325-.509.886-.843 1.525-.845h5.904v-2.485l7.417 4.27-7.417 4.27z"/><path d="m12.902 6.316-.63 1.022-1.468 2.39-2.265-3.675h-8.538v-3.568h9.54c.641.001 1.204.335 1.526.838l.004.007 1.836 2.985z"/><path d="m24.983 24v-2.485h-5.904c-.639-.002-1.201-.336-1.521-.838l-.004-.007-1.836-2.985.63-1.022 1.468-2.39 2.264 3.675h4.902v-2.485l7.417 4.27-7.417 4.27z"/></svg>`;
            };
            addIconToRandomColorEl();

            let fontObj = fontFamilies.find(obj => obj.fontFamily === editingObjBookmarkStyle.font.fontFamily);
            if (fontObj) {
                truncateTextIfOverflow(fontFamilyButtonMenuTitleEl, fontObj.fontFamily)
                createTooltip(fontFamilyButtonMenuTitleEl, 'top', fontObj.fontFamily, tooltipStyle);
            } else {
                truncateTextIfOverflow(fontFamilyButtonMenuTitleEl, fontFamilies[0].fontFamily);
                createTooltip(fontFamilyButtonMenuTitleEl, 'top', fontFamilies[0].fontFamily, tooltipStyle);
                fontObj = fontFamilies[0];
                editingObjBookmarkStyle.font.fontFamily = fontFamilies[0].fontFamily;
            }
            fontFamilySelectLiEl.forEach((button) => {
                if (parseInt(button.getAttribute('data-id')) === fontObj.id) {
                    button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                    Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                } else {
                    button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
                    Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.secondary.font);
                }
            });
            buttonWeightEl.forEach((button) => {
                if (button.getAttribute('data-weight') === editingObjBookmarkStyle.font.fontWeight) {
                    button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                    Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                } else {
                    button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
                    Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.secondary.font);
                }
            });
            buttonStyleEl.forEach((button) => {
                if (button.getAttribute('data-style') === editingObjBookmarkStyle.font.fontStyle) {
                    button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                    Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                } else {
                    button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
                    Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.secondary.font);
                }
            });
            buttonAlignmentEl.forEach((button) => {
                if (button.getAttribute('data-align') === editingObjBookmarkStyle.font.textAlign) {
                    button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                    Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                } else {
                    button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
                    Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.secondary.font);
                }
            });

            fontFamilyDropDownMenuButtonEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
            Object.assign(fontFamilyDropDownMenuButtonEl.style, userProfileExport.mainUserSettings.windows.button.secondary.font);

            fontFamilyButtonArrowEl.style.clipPath = "path('M 0 0 L 10 20 L 20 0')";
            fontFamilyButtonArrowEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.font.color;
            fontFamilySelectUlEl.style.backgroundColor = colorPalette[7];
            fontFamilySelectUlEl.style.border = `1px solid ${borderColor}`;

            fontColorPickerInputEl.style.border = `1px solid ${invertHexColor(fontColorPickerInputEl.value)}`;
            updateColorisInputValue('fontColorPickerInput', fontStyle.color == '' ? getRandomColor() : fontStyle.color);
            // Update the width range input and its output display with the current width.
            updateInputRangeAndOutput('fontSizeRangeInput', 'fontSizeRangeInputValue', fontStyle.fontSize);

            // Trigger an update to the bookmark style preview to reflect the current text style settings.
            updateBookmarkStylePreview();
        };
        // Call the function to update the UI with the current text style settings.
        updateFontStyleToUI();

        const eventListenerFontStyleEl = () => {
            // Reference to the color style input elements in the DOM.
            const fontColorPickerInputEl = document.getElementById('fontColorPickerInput');
            const buttonWeightEl = document.querySelectorAll('#buttonsWeightSections button');
            const fontSizeRangeInputEl = document.getElementById('fontSizeRangeInput');
            const buttonStyleEl = document.querySelectorAll('#buttonsStyleSections button');
            const buttonAlignmentEl = document.querySelectorAll('.buttonAlignment');
            const addRandomColorEl = document.getElementById('addRandomColor');
            const fontFamilyDropDownMenuButtonEl = document.getElementById('fontFamilyDropDownMenuButton');
            const fontFamilyButtonMenuTitleEl = document.getElementById('fontFamilyButtonMenuTitle');
            const fontFamilyButtonArrowEl = document.getElementById('fontFamilyButtonArrow');
            const fontFamilySelectLiEl = document.querySelectorAll('.fontFamilySelectLi');

            // Remove existing event listeners if they are already set.
            if (currentInputColorisFontColorListener) {
                fontColorPickerInputEl.removeEventListener('input', currentInputColorisFontColorListener);
                fontSizeRangeInputEl.removeEventListener('input', currentInputFontSizeRangeListener);

                buttonWeightEl.forEach(element => element.removeEventListener('click', () => { handleMouseClickButtonWeight }));
                buttonStyleEl.forEach(element => element.removeEventListener('click', () => { handleMouseClickButtonWeight }));
                buttonAlignmentEl.forEach(element => element.removeEventListener('click', () => { handleMouseClickButtonAlignment }));
                addRandomColorEl.removeEventListener('click', () => { generateRandomFontColor });
                fontFamilySelectLiEl.forEach(element => element.removeEventListener('click', () => { handleMouseClickFontFamily }));
                currentClickEventListeners.forEach(({ element, listener }) => {
                    element.removeEventListener('click', listener);
                });
                currentClickEventListeners = [];
            }

            const getFontColor = () => {
                editingObjBookmarkStyle.font.color = fontColorPickerInputEl.value;
                const invertColor = invertHexColor(fontColorPickerInputEl.value);
                fontColorPickerInputEl.style.backgroundColor = fontColorPickerInputEl.value;
                fontColorPickerInputEl.style.color = invertColor;
                fontColorPickerInputEl.style.border = `1px solid ${invertColor}`;
                updateBookmarkStylePreview();
            };

            const generateRandomFontColor = () => {
                const randomColor = getRandomColor();
                editingObjBookmarkStyle.font.color = randomColor;
                fontColorPickerInputEl.value = randomColor;
                const invertColor = invertHexColor(fontColorPickerInputEl.value);
                fontColorPickerInputEl.style.backgroundColor = fontColorPickerInputEl.value;
                fontColorPickerInputEl.style.color = invertColor;
                fontColorPickerInputEl.style.border = `1px solid ${invertColor}`;
                updateBookmarkStylePreview();
            };

            // Handles the mouse enter event for the add random color button.
            const handleMouseEnterAddRandomColor = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.hoverBackgroundColor;
            }

            // Handles the mouse leave event for the add random color button.
            const handleMouseLeaveAddRandomColor = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
            }

            const handleMouseClickButtonWeight = (el) => {
                const weight = el.target.dataset.weight;
                editingObjBookmarkStyle.font.fontWeight = weight;
                buttonWeightEl.forEach((button) => {
                    if (button.getAttribute('data-weight') === weight) {
                        button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                        Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                    } else {
                        button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
                        Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.secondary.font);
                    }
                });
                updateBookmarkStylePreview();
            }

            const handleMouseEnterButtonWeight = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                Object.assign(el.target.style, userProfileExport.mainUserSettings.windows.button.primary.font);
            }

            const handleMouseLeaveButtonWeight = (el) => {
                if (el.target.getAttribute('data-weight') === editingObjBookmarkStyle.font.fontWeight) {
                    el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                    Object.assign(el.target.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                } else {
                    el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
                    Object.assign(el.target.style, userProfileExport.mainUserSettings.windows.button.secondary.font);
                }
            }

            const getFontSize = () => {
                editingObjBookmarkStyle.font.fontSize = fontSizeRangeInputEl.value;
                updateInputRangeAndOutput('fontSizeRangeInput', 'fontSizeRangeInputValue', fontSizeRangeInputEl.value);
                updateBookmarkStylePreview();
            };

            const handleMouseClickButtonStyle = (el) => {
                const fontStyle = el.target.dataset.style;
                editingObjBookmarkStyle.font.fontStyle = fontStyle;
                buttonStyleEl.forEach((button) => {
                    if (button.getAttribute('data-style') === fontStyle) {
                        button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                        Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                    } else {
                        button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
                        Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.secondary.font);
                    }
                });
                updateBookmarkStylePreview();
            }

            const handleMouseEnterButtonStyle = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                Object.assign(el.target.style, userProfileExport.mainUserSettings.windows.button.primary.font);
            }

            const handleMouseLeaveButtonStyle = (el) => {
                if (el.target.getAttribute('data-style') === editingObjBookmarkStyle.font.fontStyle) {
                    el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                    Object.assign(el.target.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                } else {
                    el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
                    Object.assign(el.target.style, userProfileExport.mainUserSettings.windows.button.secondary.font);
                }
            }

            const handleMouseClickButtonAlignment = (el) => {
                const align = el.target.dataset.align;
                editingObjBookmarkStyle.font.textAlign = align;
                buttonAlignmentEl.forEach((button) => {
                    if (button.getAttribute('data-align') === align) {
                        button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                        Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                    } else {
                        button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
                        Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.secondary.font);
                    }
                });
                updateBookmarkStylePreview();
            }

            const handleMouseEnterButtonAlignment = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                Object.assign(el.target.style, userProfileExport.mainUserSettings.windows.button.primary.font);
            }

            const handleMouseLeaveButtonAlignment = (el) => {
                if (el.target.getAttribute('data-align') === editingObjBookmarkStyle.font.textAlign) {
                    el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                    Object.assign(el.target.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                } else {
                    el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
                    Object.assign(el.target.style, userProfileExport.mainUserSettings.windows.button.secondary.font);
                }
            }

            const handleMouseClickFontFamily = (el) => {
                const fontId = parseInt(el.target.dataset.id);
                let fontObj = fontFamilies.find(obj => obj.id === fontId);
                editingObjBookmarkStyle.font.fontFamily = fontObj.fontFamily;
                truncateTextIfOverflow(fontFamilyButtonMenuTitleEl, fontObj.fontFamily);
                createTooltip(fontFamilyButtonMenuTitleEl, 'top', fontObj.fontFamily, tooltipStyle);
                fontFamilyDropDownMenuButtonEl.dataset.status = 'false';
                updateBookmarkStylePreview();
            };

            const handleMouseEnterFontFamilyLi = (el) => {
                const fontObj = fontFamilies.find(obj => obj.fontFamily == editingObjBookmarkStyle.font.fontFamily);
                if (parseInt(el.target.getAttribute('data-id')) === fontObj.id) {
                    el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.hoverBackgroundColor;
                    Object.assign(el.target.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                } else {
                    el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.hoverBackgroundColor;
                    Object.assign(el.target.style, userProfileExport.mainUserSettings.windows.button.secondary.font);
                }
            };

            const handleMouseLeaveFontFamilyLi = (el) => {
                const fontObj = fontFamilies.find(obj => obj.fontFamily == editingObjBookmarkStyle.font.fontFamily);
                fontFamilySelectLiEl.forEach((button) => {
                    if (parseInt(button.getAttribute('data-id')) === fontObj.id) {
                        button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                        Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                    } else {
                        button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
                        Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.secondary.font);
                    }
                });
            };

            // Handle mouse enter event on the dropdown menu button.
            const handleMouseEnterFontFamily = (el) => {
                const fontFamilySelectLiEl = document.querySelectorAll('.fontFamilySelectLi');
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.hoverBackgroundColor;
                fontFamilyDropDownMenuButtonEl.dataset.status = 'true';
                fontFamilyButtonArrowEl.style.clipPath = "path('M 0 20 L 20 10 L 0 0')";
                const fontObj = fontFamilies.find(obj => obj.fontFamily == editingObjBookmarkStyle.font.fontFamily);
                fontFamilySelectLiEl.forEach((button) => {
                    if (parseInt(button.getAttribute('data-id')) === fontObj.id) {
                        button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                        Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                    } else {
                        button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
                        Object.assign(button.style, userProfileExport.mainUserSettings.windows.button.secondary.font);
                    }
                });
            };

            // Handle mouse leave event on the dropdown menu button.
            const handleMouseLeaveFontFamily = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
                fontFamilyDropDownMenuButtonEl.dataset.status = 'false';
                fontFamilyButtonArrowEl.style.clipPath = "path('M 0 0 L 10 20 L 20 0')";
            };
            // Assign the event listeners to the respective elements.
            currentInputColorisFontColorListener = getFontColor;
            currentInputFontSizeRangeListener = getFontSize;

            // Attach mouse enter and leave event listeners to the dropdown menu button.
            fontFamilyDropDownMenuButtonEl.addEventListener('mouseenter', handleMouseEnterFontFamily);
            fontFamilyDropDownMenuButtonEl.addEventListener('mouseleave', handleMouseLeaveFontFamily);

            buttonWeightEl.forEach(element => {
                element.addEventListener('click', handleMouseClickButtonWeight);
                element.addEventListener('mouseenter', handleMouseEnterButtonWeight);
                element.addEventListener('mouseleave', handleMouseLeaveButtonWeight);
                currentClickEventListeners.push({ element, listener: handleMouseClickButtonWeight });
            });
            buttonStyleEl.forEach(element => {
                element.addEventListener('click', handleMouseClickButtonStyle);
                element.addEventListener('mouseenter', handleMouseEnterButtonStyle);
                element.addEventListener('mouseleave', handleMouseLeaveButtonStyle);
                currentClickEventListeners.push({ element, listener: handleMouseClickButtonStyle });
            });
            buttonAlignmentEl.forEach(element => {
                element.addEventListener('click', handleMouseClickButtonAlignment);
                element.addEventListener('mouseenter', handleMouseEnterButtonAlignment);
                element.addEventListener('mouseleave', handleMouseLeaveButtonAlignment);
                currentClickEventListeners.push({ element, listener: handleMouseClickButtonAlignment });
            });
            fontFamilySelectLiEl.forEach(element => {
                element.addEventListener('click', handleMouseClickFontFamily);
                element.addEventListener('mouseenter', handleMouseEnterFontFamilyLi);
                element.addEventListener('mouseleave', handleMouseLeaveFontFamilyLi);
                currentClickEventListeners.push({ element, listener: handleMouseClickFontFamily });
            });

            fontColorPickerInputEl.addEventListener('input', currentInputColorisFontColorListener);
            addRandomColorEl.addEventListener('click', generateRandomFontColor);
            addRandomColorEl.addEventListener('mouseenter', handleMouseEnterAddRandomColor);
            addRandomColorEl.addEventListener('mouseleave', handleMouseLeaveAddRandomColor);
            fontSizeRangeInputEl.addEventListener('input', currentInputFontSizeRangeListener);
        };
        eventListenerFontStyleEl();
    }

    const removeClassFromAllStyleMenuButtons = () => {
        document.querySelectorAll('#rightStyleMenuContainer [data-id]').forEach(element => {
            element.classList.remove('styleMenuActive');
            element.style.backgroundColor = colorPalette[0];
        });
    };

    const addClassToSelectedStyleMenuButton = (id) => {
        document.querySelectorAll('#rightStyleMenuContainer [data-id]').forEach(element => {
            if (id == element.dataset.id) {
                element.classList.add('styleMenuActive');
                element.setAttribute('style', `--backgroundColor: ${colorPalette[4]};`)
                element.style.backgroundColor = `${colorPalette[4]}`;
            }
        });
    }

    /**
    * Activates a specific tab in the style menu based on the given ID.
    * It first removes the active class from all menu buttons, then adds it to the selected one,
    * and finally calls the corresponding menu function based on the ID.
    *
    * @param {string} tabId - The ID of the tab to activate.
    */
    const activateStyleMenuTab = (tabId) => {
        removeClassFromAllStyleMenuButtons();
        addClassToSelectedStyleMenuButton(tabId);
        switch (tabId) {
            case '1':
                displayBorderMenu();
                break;
            case '2':
                displayColorMenu();
                break;
            case '3':
                displayImageMenu();
                break;
            case '4':
                displayTextMenu();
                break;
            case '5':
                displayFontMenu();
                break;
        }
    };

    /**
    * Attaches click event listeners to style menu buttons. On click, it prevents event bubbling,
    * checks if the clicked tab is different from the current one, and activates the clicked tab.
    */
    const setupStyleMenuButtonClickHandler = () => {
        document.querySelectorAll('[class=styleMenu]').forEach(button => {
            button.addEventListener('click', event => {
                event.stopPropagation();
                const selectedTabId = event.target.dataset.id;
                if (currentStyleMenuTab == selectedTabId) {
                    return;
                }
                currentStyleMenuTab = selectedTabId;
                activateStyleMenuTab(selectedTabId);
            });
        });
    };

    /**
    * Initializes the style menu by checking the bookmark status. If bookmarks are available,
    * it sets the 'Color' menu as the initial active tab. If not, it logs an error.
    */
    const initializeStyleMenu = () => {
        try {
            const defaultTabId = '1';
            activateStyleMenuTab(defaultTabId); // Set 'Color' menu as initial active tab
            currentStyleMenuTab = defaultTabId;
        } catch (error) {
            console.error(error);
        }
    };

    const resetUIAfterLoadStyle = () => {
        activateStyleMenuTab(currentStyleMenuTab);
    }

    // Execute the setup and initialization functions
    setupStyleMenuButtonClickHandler();
    initializeStyleMenu();
}


// wx2 z4x 7o3 y57 fyo bv3 n0p zwy txr 5u7
// uts vvi 6p5 mmi x11 0dh wvq vl4 ggh itl
// j9j 2b3 wap hdm non af4 yof l7s aa5 1wi
// vvw sbl ari 55h va0 sgk 7hn eek 4qn xfh
// yxc 0vt d3h ge1 l8u ycd o6v h8f ixq h95
// cmd bfc 97r 11x clk nu5 b33 vbb 11f rnm
// 5zy eog 5fa 6zm klm bbf zel h3j kx8 s10
// kmx yaj lbp 6qr f40 t2t 4sv 40r sv7 93s
// fqs tsw 9fp jtf 1kw for t63 d4o lwu tsa
// 5nt vyb vhh 6ar 659 6er 0l4 7gt 07n gne

// hms vmr whx miu z8x gmc jlw xa7 jii nbt
// 966 lvq 0de 4p7 ixp xib 4v8 yf3 z5i pt2
// oll lao 88z i6a d9n eiu 4rm w0c q32 8nt
// a6w 4mz 2u4 iuk 2if xe0 w2i cte l5v 5rc
// 11n pkf tgt lyn a8o ovv tg1 x12 lfx 6uz
// d1d al0 4ne c1f jsj 3so kf9 idt k9q 5qp
// tm3 klw 5af na5 mj9 yey grz l4n 0pv 7hl
// 73f ace 1dg 5z1 5m4 bry f1m 32p krs 2p7
// 0fn 8iy t7m kt2 g2i duy 882 hq3 7rc o87
// llm mq5 vs7 mpk p0y o40 dqm 40e adb 65x
