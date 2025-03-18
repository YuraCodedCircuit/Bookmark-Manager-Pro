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
import { settingMainMenu, defaultUserBookmarks, defaultBookmarkStyle, defaultFolderStyle, defaultMainUserSettings, settingWindowOpen, currentFolderId, folderNamesForAddressBarPreview, exportFileExtensionName, browserAndOSInfo, currentLanguage, userProfileExport, backgroundImageExample, symbolArray, userActivityRegister, userProfile, userActiveProfile, exportType, defaultProfileImageBase64, manageUserProfiles, createCurrentBookmarkFolder, firefoxLogoSVG, chromeLogoSVG, extensionLogoSVG } from './main.js';
import { indexedDBManipulation, generateColorPalette, showEmojiPicker, getInfoFromVersion, updateIdsAndParentIds, findBookmarkByKey, animateElement, getElementPosition, debounce, createTooltip, truncateTextIfOverflow, checkIfColorBrightness, randomIntFromInterval, getRandomColor, inputHexValid, invertHexColor, rgbToHex, hexToRGB, hexToRGBA, isObjectEmpty, resizeImageBase64, truncateString, translateUserName, checkIfAllowedToCreateScreenshotFromURL, changeBase64ImageColor, showMessageToastify, getSupportedFontFamilies, sortFolderByChildrenIndex, applyStylesToElement, getNextMaxIndex, generateRandomIdForObj, generateRandomID, formatDateTime, capitalizeString, correctIndexes, moveObjectInParentArray, changeIds, actionForArray, countTo, moveElementsInArray, getType, fetchImageAsBase64, getBrowserAndOSInfo, removeAllNestingFromObj, calculateGradientPercentages, formatBytes, isValidDate, checkIfImageBase64, updateInputRangeAndOutput, updateColorisInputValue } from './utilityFunctions.js';
import { importValidation } from './importValidation.js';

/**
 * Toggles the visibility of the settings window based on the provided status and type.
 *
 * @param {string} status - The desired status of the settings window, either 'open' or 'close'.
 * @param {string} [type='default'] - The type of settings window to open, either 'default' or 'folder'.
 * @returns {void}
 * @description This function manages the opening and closing of the settings window.
 * It validates the input parameters, updates the settings window's visibility, and dynamically generates the settings window's content based on the specified type.
 * The function also sets up event listeners for various UI elements within the settings window.
 */
export const openCloseSettingWindow = async (status, type = 'default') => {
    try {
        if (!['default', 'folder'].includes(type)) {
            console.error('%c%s', '', 'Invalid type', type);
            return;
        }
        if (!['close', 'open'].includes(status)) {
            console.error('%c%s', '', 'Invalid status', status);
            return;
        }
        const settingsBodyEl = $('#settingsBody');
        if (status == 'close') {
            settingWindowOpen.status = false;
            settingsBodyEl.css('display', 'none').html('');
            return;
        }
        let currentMenu = settingMainMenu[type][0].submenu[0].data;
        let currentClickEventListeners = [];
        let editingDefaultUserFolderStyle = {};
        let editingMainUserSettings = {};
        let currentFolderObj = {};
        let colorPalette = [];
        let activeTabBorderColor = '';
        let notActiveTabBorderColor = '';

        const languageAllObject = await indexedDBManipulation('get', 'language');
        const getValueByType = (languageObject, type) => {
            // Check if the type is valid
            if (type === 'default' || type === 'folder') {
                return languageObject._settingWindow._menuList[`_${type}`];
            } else {
                throw new Error("Invalid type for language object. Use 'default' or 'folder'.");
            }
        }
        const languageObject = getValueByType(languageAllObject, type);

        settingWindowOpen.status = true;
        if (type == 'folder') {
            currentFolderObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, currentFolderId);
            editingDefaultUserFolderStyle = structuredClone(currentFolderObj.style.folder);
            editingMainUserSettings = structuredClone(userProfileExport.mainUserSettings);
            let backgroundType = currentFolderObj.style.folder.background.backgroundType;
            if (backgroundType == 'gradient' || backgroundType == 'color') {
                currentMenu = settingMainMenu[type][0].submenu[1].data;
            }
        } else if (type == 'default') {
            editingDefaultUserFolderStyle = structuredClone(userProfileExport.defaultUserFolderStyle);
            editingMainUserSettings = structuredClone(userProfileExport.mainUserSettings);
        } else {
            throw new Error("Invalid type. Use 'default' or 'folder'.");
        }

        const settingsBodyHtml = `
            <div id="settingsWindow">
                <div id="settingsWindowLeftSection">
                    <div id="leftMenuHeader"></div>
                    <div id="leftMenuBody"></div>
                    <div id="leftMenuFooter"></div>
                </div>
                <div id="settingsWindowRightSection"></div>
                <div id="settingsWindowFooterSection">
                    <div id="buttonsSection">
                        <button id="settingsWindowCancelButton">Cancel</button>
                        <button id="settingsWindowSaveButton">Save</button>
                    </div>
                </div>
            </div>
        `;
        settingsBodyEl.css('display', 'flex').html(settingsBodyHtml);

        /**
         * Adds event listeners to the footer buttons of the settings window.
         *
         * @returns {void}
         * @description This function sets up event listeners for the 'Cancel' and 'Save' buttons in the settings window footer.
         * It handles mouse enter and leave events to change button background colors and click events to either save or discard changes.
         */
        const addEventListenersToSettingFooterButtons = () => {
            // Get the 'Cancel' and 'Save' buttons from the DOM.
            const settingWindowCancelButtonEl = document.getElementById('settingsWindowCancelButton');
            const settingWindowSaveButtonEl = document.getElementById('settingsWindowSaveButton');

            /**
             * Handles the mouse enter event for the buttons.
             *
             * @param {Event} element - The event object.
             * @returns {void}
             * @description Changes the background color of the button on mouse enter based on the brightness of the main window background color.
             */
            const handleCancelMouseEnter = (element) => {
                element.target.style.backgroundColor = editingMainUserSettings.windows.button.danger.hoverBackgroundColor;
            };

            /**
             * Handles the mouse leave event for the buttons.
             *
             * @param {Event} element - The event object.
             * @returns {void}
             * @description Resets the background color of the button to transparent on mouse leave.
             */
            const handleCancelMouseLeave = (element) => {
                element.target.style.backgroundColor = editingMainUserSettings.windows.button.danger.backgroundColor;
            };

            /**
             * Handles the mouse enter event for the buttons.
             *
             * @param {Event} element - The event object.
             * @returns {void}
             * @description Changes the background color of the button on mouse enter based on the brightness of the main window background color.
             */
            const handleSaveMouseEnter = (element) => {
                element.target.style.backgroundColor = editingMainUserSettings.windows.button.success.hoverBackgroundColor;
            };

            /**
             * Handles the mouse leave event for the buttons.
             *
             * @param {Event} element - The event object.
             * @returns {void}
             * @description Resets the background color of the button to transparent on mouse leave.
             */
            const handleSaveMouseLeave = (element) => {
                element.target.style.backgroundColor = editingMainUserSettings.windows.button.success.backgroundColor;
            };

            /**
             * Handles the click event for the 'Cancel' button.
             *
             * @returns {void}
             * @description Resets the editing styles and closes the settings window without saving changes.
             */
            const handleMouseClickCancel = (el) => {
                animateElement(el.target, editingMainUserSettings.windows.button.danger.animation);
                editingDefaultUserFolderStyle = {};
                editingMainUserSettings = {};
                currentFolderObj = {};
                openCloseSettingWindow('close');
            };

            /**
             * Handles the click event for the 'Save' button.
             *
             * @returns {void}
             * @description Saves the changes to the user profile and updates the current bookmark folder.
             * Displays a success or error message based on the save status.
             */
            const handleMouseClickSave = async (el) => {
                if (type == 'folder') {
                    currentFolderObj.style.folder = editingDefaultUserFolderStyle;
                    userActiveProfile.currentUserBookmarks = userProfileExport.currentUserBookmarks;
                } else if (type == 'default') {
                    userProfileExport.defaultUserFolderStyle = editingDefaultUserFolderStyle;
                    userProfileExport.mainUserSettings = editingMainUserSettings;
                    userActiveProfile.defaultUserFolderStyle = editingDefaultUserFolderStyle;
                    userActiveProfile.mainUserSettings = editingMainUserSettings;
                }
                const saveStatus = await manageUserProfiles('save');
                if (!saveStatus) {
                    showMessageToastify('error', ``, `Failed to save your settings. Please try again or check your input for any errors.`, 6000, false, 'bottom', 'right', true);
                } else {
                    showMessageToastify('success', ``, `Your settings have been successfully saved!`, 4000, false, 'bottom', 'right', true);
                }
                if (!editingMainUserSettings.main.synchronizationToBrowser.status && userActiveProfile.mainUserSettings.main.synchronizationToBrowser.status !== editingMainUserSettings.main.synchronizationToBrowser.status) {
                    showMessageToastify('success', ``, 'Synchronization has been successfully turned off. Your folders will no longer sync automatically.', 5000, false, 'bottom', 'right', true);
                }
                browser.runtime.sendMessage({ sync: { updateSettings: true } });
                animateElement(el.target, editingMainUserSettings.windows.button.success.animation);
                editingDefaultUserFolderStyle = {};
                editingMainUserSettings = {};
                currentFolderObj = {};
                openCloseSettingWindow('close');
                createCurrentBookmarkFolder();
            };

            // Add event listeners for mouse enter, leave, and click events to the 'Cancel' button.
            settingWindowCancelButtonEl.addEventListener('mouseenter', handleCancelMouseEnter);
            settingWindowCancelButtonEl.addEventListener('mouseleave', handleCancelMouseLeave);
            settingWindowCancelButtonEl.addEventListener('click', handleMouseClickCancel);

            // Add event listeners for mouse enter, leave, and click events to the 'Save' button.
            settingWindowSaveButtonEl.addEventListener('mouseenter', handleSaveMouseEnter);
            settingWindowSaveButtonEl.addEventListener('mouseleave', handleSaveMouseLeave);
            settingWindowSaveButtonEl.addEventListener('click', handleMouseClickSave);
        }
        addEventListenersToSettingFooterButtons();

        /**
         * Adds event listeners to the left menu list items.
         *
         * @returns {void}
         * @description This function sets up event listeners for the left menu list items.
         * It handles mouse enter and leave events to change the background color of the items and click events to update the right section of the settings window.
         */
        const addEventListenersToLeftMenuList = () => {
            const leftMenuListEl = document.querySelectorAll('.buttonList');

            /**
             * Handles the mouse enter event for the menu items.
             *
             * @param {Event} element - The event object.
             * @returns {void}
             * @description Changes the background color of the menu item on mouse enter based on the brightness of the main window background color.
             */
            const handleMouseEnter = (element) => {
                element.target.style.backgroundColor = colorPalette[9];
            };

            /**
             * Handles the mouse leave event for the menu items.
             *
             * @returns {void}
             * @description Resets the background color of the menu items to transparent on mouse leave, except for the currently selected menu item.
             */
            const handleMouseLeave = () => {
                leftMenuListEl.forEach(el => {
                    if (el.dataset.data == currentMenu) {
                        el.style.backgroundColor = colorPalette[9];
                    } else {
                        el.style.backgroundColor = 'transparent';
                    }
                });
            };

            /**
             * Handles the click event for the menu items.
             *
             * @param {Event} element - The event object.
             * @returns {void}
             * @description Updates the right section of the settings window based on the clicked menu item.
             */
            const handleMouseClick = (element) => {
                const data = element.target.dataset.data;
                const value = findSubmenuDataOrDefault(data);
                leftMenuListEl.forEach(el => {
                    if (el.dataset.data == data) {
                        el.style.backgroundColor = colorPalette[9];
                    }
                });
                if (currentMenu != value) {
                    createSettingsWindowRightSection(data);
                }
            }

            // Remove existing event listeners if any.
            if (currentClickEventListeners.length > 0) {
                leftMenuListEl.forEach(element => {
                    element.removeEventListener('click', handleMouseClick);
                    element.removeEventListener('mouseenter', handleMouseEnter);
                    element.removeEventListener('mouseleave', handleMouseLeave);
                });
                currentClickEventListeners = [];
            }

            // Add event listeners for mouse enter, leave, and click events to the menu items.
            leftMenuListEl.forEach(element => {
                element.addEventListener('click', handleMouseClick);
                element.addEventListener('mouseenter', handleMouseEnter);
                element.addEventListener('mouseleave', handleMouseLeave);
                currentClickEventListeners.push({ element, listener: handleMouseClick });
            });
        }

        const setStyleToSettingsWindow = () => {
            const settingsWindowEl = document.getElementById('settingsWindow');
            const leftMenuListEl = document.querySelectorAll('.buttonList');
            const settingsWindowRightSectionEl = document.getElementById('settingsWindowRightSection');
            const settingWindowCancelButtonEl = document.getElementById('settingsWindowCancelButton');
            const settingWindowSaveButtonEl = document.getElementById('settingsWindowSaveButton');

            const userColor = editingMainUserSettings.windows.window.backgroundColor;
            colorPalette = generateColorPalette(userColor);

            activeTabBorderColor = hexToRGB(colorPalette[2]);
            notActiveTabBorderColor = hexToRGB(colorPalette[1]);

            leftMenuListEl.forEach(el => {
                if (el.dataset.data == currentMenu) {
                    el.style.backgroundColor = colorPalette[9];
                }
            });

            settingsWindowRightSectionEl.setAttribute('style', `--backgroundActiveColor: ${activeTabBorderColor};--backgroundNotActiveColor: ${notActiveTabBorderColor};`);
            settingsWindowEl.style.backgroundColor = editingMainUserSettings.windows.window.backgroundColor;
            settingsWindowEl.style.color = editingMainUserSettings.windows.window.font.color;
            settingsWindowEl.style.fontSize = `${editingMainUserSettings.windows.window.font.fontSize}px`;
            settingsWindowEl.style.fontFamily = editingMainUserSettings.windows.window.font.fontFamily;
            settingsWindowEl.style.fontStyle = editingMainUserSettings.windows.window.font.fontStyle;
            settingsWindowEl.style.fontWeight = editingMainUserSettings.windows.window.font.fontWeight;
            settingsWindowEl.style.borderLeft = `${editingMainUserSettings.windows.window.border.left.width}px ${editingMainUserSettings.windows.window.border.left.style} ${editingMainUserSettings.windows.window.border.left.color}`;
            settingsWindowEl.style.borderRight = `${editingMainUserSettings.windows.window.border.right.width}px ${editingMainUserSettings.windows.window.border.right.style} ${editingMainUserSettings.windows.window.border.right.color}`;
            settingsWindowEl.style.borderTop = `${editingMainUserSettings.windows.window.border.top.width}px ${editingMainUserSettings.windows.window.border.top.style} ${editingMainUserSettings.windows.window.border.top.color}`;
            settingsWindowEl.style.borderBottom = `${editingMainUserSettings.windows.window.border.bottom.width}px ${editingMainUserSettings.windows.window.border.bottom.style} ${editingMainUserSettings.windows.window.border.bottom.color}`;
            settingsWindowEl.style.borderTopLeftRadius = `${editingMainUserSettings.windows.window.border.left.radius}px`;
            settingsWindowEl.style.borderTopRightRadius = `${editingMainUserSettings.windows.window.border.top.radius}px`;
            settingsWindowEl.style.borderBottomRightRadius = `${editingMainUserSettings.windows.window.border.right.radius}px`;
            settingsWindowEl.style.borderBottomLeftRadius = `${editingMainUserSettings.windows.window.border.bottom.radius}px`;
            settingWindowCancelButtonEl.style.backgroundColor = editingMainUserSettings.windows.button.danger.backgroundColor;
            settingWindowSaveButtonEl.style.backgroundColor = editingMainUserSettings.windows.button.success.backgroundColor;
            Object.assign(settingWindowCancelButtonEl.style, editingMainUserSettings.windows.button.danger.font);
            Object.assign(settingWindowSaveButtonEl.style, editingMainUserSettings.windows.button.success.font);
        }
        setStyleToSettingsWindow();

        /**
         * Recursively finds a value by key in a nested object.
         *
         * @param {Object} obj - The object to search through.
         * @param {string} key - The key to find in the object.
         * @returns {*} The value associated with the key, or null if not found.
         */
        const findObject = (obj, key) => {
            // Check if the object has the key and return the associated value if found
            if (obj[key]) {
                return obj[key];
            }
            // Iterate over the properties of the object
            for (let prop in obj) {
                // Check if the current property is an object
                if (typeof obj[prop] === 'object') {
                    // Recursively search through the nested object
                    const result = findObject(obj[prop], key);
                    // Return the result if the key is found
                    if (result) {
                        return result;
                    }
                }
            }
            // Return null if the key is not found in the object
            return null;
        };

        /**
         * Creates a menu list in the left section of the settings window.
         *
         * @param {Array} array - The array containing menu items and their submenus.
         * @returns {void}
         * @description This function generates HTML for the left menu based on the provided array of menu items.
         * It appends the generated HTML to the left menu body element and adds event listeners to the menu items.
         */
        const createMenuList = (array) => {
            // Check if the provided parameter is an array.
            if (!Array.isArray(array)) {
                console.error('%c%s', '', 'Invalid array');
                return;
            }

            // Get the left menu body element from the DOM.
            const leftMenuBodyEl = document.getElementById('leftMenuBody');

            /**
             * Converts an array of items into a string of HTML list items (li).
             * @param {Array} items - The array of items to convert.
             * @returns {string} The HTML string of list items.
             */
            const generateListItemsHtml = (items) => {
                return items.map(item => {
                    // Generate nested list if children exist
                    let nestedListHtml = generateNestedListHtml(item.submenu || []);
                    let listItemHtml = ``;
                    let listMenuToLanguageTitle = findObject(languageObject, `_${item.data}`);
                    listItemHtml = `
                        <li>
                            <div data-id="${item.data}">
                                <button class="leftMenuListSubmenu buttonList" data-data="${item.data}">
                                    <div class="leftMenuListText" data-data="${item.data}">${listMenuToLanguageTitle._data ?? item.title}</div>
                                </button>
                            </div>
                        </li>
                        ${nestedListHtml}
                    `;
                    return listItemHtml;
                }).join('');
            };
            /**
             * Generates an HTML string for a nested list if the dataset is not empty.
             * @param {Array} dataset - The array of items to generate the nested list from.
             * @returns {string} The HTML string of the nested list or an empty string if the dataset is empty.
             */
            const generateNestedListHtml = (dataset) => {
                return dataset.length ? `<div class="menuContainer"><ul>${generateListItemsHtml(dataset)}</ul></div>` : '';
            };
            // Generate the top-level list HTML using the default dataset
            leftMenuBodyEl.innerHTML = generateNestedListHtml(array);

            // Set the inner HTML of the left menu body element to the generated HTML.
            // Add event listeners to the left menu items.
            addEventListenersToLeftMenuList();
        }
        // Create the menu list using the settingMainMenu array for the specified type.
        createMenuList(settingMainMenu[type]);

        /**
        * Creates the right body section of the UI based on the currentMenu data.
        *
        * @param {string} data - The data identifier used to determine the content of the right body section.
        * @returns {void}
        * @description This function dynamically generates and updates the right body section of the settings window UI based on the provided data. It handles the styling and content of the section, including previews and examples.
        */
        const createUIRightBodySection = async (data) => {
            if (data == '') { return; }
            // Get the right section element of the settings window.
            const settingsWindowRightSectionEl = document.getElementById('settingsWindowRightSection');
            // Get all elements with the class 'buttonList'.
            const leftMenuListEl = document.querySelectorAll('.buttonList');
            // Number of example objects to generate.
            const numberOfExamplesObj = 5;
            activeTabBorderColor = hexToRGB(colorPalette[2]);
            notActiveTabBorderColor = hexToRGB(colorPalette[1]);
            settingsWindowRightSectionEl.setAttribute('style', `--backgroundActiveColor: ${activeTabBorderColor};--backgroundNotActiveColor: ${notActiveTabBorderColor};`);

            // Initialize variables for HTML content and names array.
            let settingsWindowRightSectionHtml = '';
            let namesArray = [];
            let rightBodySectionEl = null;

            // Loop through each element in the left menu list and update its background color based on the provided data.
            leftMenuListEl.forEach(el => {
                if (el.dataset.data == data) {
                    el.style.backgroundColor = colorPalette[9];
                } else {
                    el.style.backgroundColor = '#00000000';
                }
            });

            /**
            * Creates the HTML structure for the right preview section.
            *
            * @returns {void}
            * @description This function sets the inner HTML of the settings window right section and updates its background color.
            */
            const createRightPreviewHtml = () => {
                settingsWindowRightSectionEl.innerHTML = `
                    <div id="transparencyGridPreview"></div>
                    <div id="rightHeaderSection"></div>
                    <div id="rightBodySection"></div>
                `;
                rightBodySectionEl = document.getElementById('rightBodySection');
            }

            /**
            * Generates an array of random folder names for the address bar preview.
            *
            * @returns {void}
            * @description This function populates the namesArray with random folder names from the folderNamesForAddressBarPreview array.
            */
            const generateNames = () => {
                for (let index = 0; index <= numberOfExamplesObj; index++) {
                    namesArray.push(folderNamesForAddressBarPreview[randomIntFromInterval(0, folderNamesForAddressBarPreview.length - 1)]);
                }
            }
            generateNames();

            /**
            * Updates the style preview for folders in the right header section of the UI.
            * It dynamically generates HTML content based on predefined styles and example names,
            * displaying a preview of address bars and bookmarks according to user-defined styles.
            */
            const updateFolderStylePreview = () => {
                // Get the element in the DOM where the preview will be displayed.
                const rightHeaderSectionEl = document.getElementById('rightHeaderSection');
                let addressBarStyle = ``; // Initialize an empty string for the address bar style.

                // Function to generate HTML for the address bar preview.
                const generateExampleForAddressBar = () => {
                    let html = ``;
                    let symbolStyle = `color: ${editingDefaultUserFolderStyle.addressBar.icon.color};font-size: ${editingDefaultUserFolderStyle.addressBar.icon.fontSize}px;`;
                    let addressBarTitleStyle = `color: ${editingDefaultUserFolderStyle.addressBar.text.color};font-size: ${editingDefaultUserFolderStyle.addressBar.text.fontSize}px;font-family: ${editingDefaultUserFolderStyle.addressBar.text.fontFamily};font-style: ${editingDefaultUserFolderStyle.addressBar.text.fontStyle};font-weight: ${editingDefaultUserFolderStyle.addressBar.text.fontWeight};`;
                    // Loop through the number of examples to generate.
                    for (let index = 0; index <= numberOfExamplesObj - 2; index++) {
                        // Append HTML for each address bar section, including a random folder name.
                        html += `
                            <div class="addressBarSectionPreview">
                                <div class="addressBarSymbolPreview" style="${symbolStyle}">${editingDefaultUserFolderStyle.addressBar.icon.content}</div>
                                <div class="addressBarTitlePreview" style="${addressBarTitleStyle}">${namesArray[index]}</div>
                                <div class="addressBarBoxPreview"></div>
                            </div>
                        `;
                    }
                    return html; // Return the generated HTML content.
                }
                // Function to generate HTML for the bookmarks preview.
                const generateExampleForBookmarks = () => {
                    let html = ``; // Initialize an empty string to hold the HTML content.
                    let bodyStyle = ``; // Initialize an empty string for the body style.
                    let imageStyle = ``; // Initialize an empty string for the image style.
                    let textStyle = ``; // Initialize an empty string for the text style.
                    let boxStyle = ``; // Initialize an empty string for the box style.
                    let activeBoxStyle = ``; // Initialize an empty string for the active box style.
                    // Define the body style using user-defined bookmark box styles.
                    bodyStyle = `display:flex;position:relative;width:${editingDefaultUserFolderStyle.bookmarksBox.width};height:${editingDefaultUserFolderStyle.bookmarksBox.height};overflow:hidden;border-left:${userProfileExport.defaultUserBookmarkStyle.border.left.width}px ${userProfileExport.defaultUserBookmarkStyle.border.left.style} ${userProfileExport.defaultUserBookmarkStyle.border.left.color};border-top:${userProfileExport.defaultUserBookmarkStyle.border.top.width}px ${userProfileExport.defaultUserBookmarkStyle.border.top.style} ${userProfileExport.defaultUserBookmarkStyle.border.top.color};border-right:${userProfileExport.defaultUserBookmarkStyle.border.right.width}px ${userProfileExport.defaultUserBookmarkStyle.border.right.style} ${userProfileExport.defaultUserBookmarkStyle.border.right.color};border-bottom:${userProfileExport.defaultUserBookmarkStyle.border.bottom.width}px ${userProfileExport.defaultUserBookmarkStyle.border.bottom.style} ${userProfileExport.defaultUserBookmarkStyle.border.bottom.color};border-radius:${userProfileExport.defaultUserBookmarkStyle.border.left.radius}px ${userProfileExport.defaultUserBookmarkStyle.border.top.radius}px ${userProfileExport.defaultUserBookmarkStyle.border.right.radius}px ${userProfileExport.defaultUserBookmarkStyle.border.bottom.radius}px;`;
                    // Conditionally define the image style based on user-defined bookmark styles.
                    if (userProfileExport.defaultUserBookmarkStyle.color.backgroundColor !== '' && userProfileExport.defaultUserBookmarkStyle.image.backgroundBase64 == '') {
                        imageStyle = `background-image:none;display:${userProfileExport.defaultUserBookmarkStyle.color.display};position:${userProfileExport.defaultUserBookmarkStyle.color.position};width:${userProfileExport.defaultUserBookmarkStyle.color.width}%;height:${userProfileExport.defaultUserBookmarkStyle.color.height}%;background-color:${userProfileExport.defaultUserBookmarkStyle.color.backgroundColor};left:${userProfileExport.defaultUserBookmarkStyle.color.left}%;top:${userProfileExport.defaultUserBookmarkStyle.color.top}%;transform:rotate(${userProfileExport.defaultUserBookmarkStyle.color.angle}deg)`;
                    }
                    if (userProfileExport.defaultUserBookmarkStyle.image.backgroundBase64 !== '' && userProfileExport.defaultUserBookmarkStyle.color.backgroundColor == '') {
                        imageStyle = `background-color:none;display:${userProfileExport.defaultUserBookmarkStyle.image.display};position:${userProfileExport.defaultUserBookmarkStyle.image.position};width:${userProfileExport.defaultUserBookmarkStyle.image.width}%;height:${userProfileExport.defaultUserBookmarkStyle.image.height}%;left:${userProfileExport.defaultUserBookmarkStyle.image.left}%;top:${userProfileExport.defaultUserBookmarkStyle.image.top}%;transform:rotate(${userProfileExport.defaultUserBookmarkStyle.image.angle}deg);background-image:url(${userProfileExport.defaultUserBookmarkStyle.image.backgroundBase64});background-repeat:no-repeat;background-size:100% 100%;`;
                    }
                    // Define the text style using user-defined bookmark text styles.
                    textStyle = `display:${userProfileExport.defaultUserBookmarkStyle.text.display};position:${userProfileExport.defaultUserBookmarkStyle.text.position};white-space:${userProfileExport.defaultUserBookmarkStyle.text.whiteSpace};overflow:${userProfileExport.defaultUserBookmarkStyle.text.overflow};background-color:${userProfileExport.defaultUserBookmarkStyle.text.backgroundColor};width:${userProfileExport.defaultUserBookmarkStyle.text.width}%;height:${userProfileExport.defaultUserBookmarkStyle.text.height}%;transform:rotate(${userProfileExport.defaultUserBookmarkStyle.text.angle}deg);left:${userProfileExport.defaultUserBookmarkStyle.text.left}%;top:${userProfileExport.defaultUserBookmarkStyle.text.top}%;color:${userProfileExport.defaultUserBookmarkStyle.font.color};font-size:${userProfileExport.defaultUserBookmarkStyle.font.fontSize}px;font-family:${userProfileExport.defaultUserBookmarkStyle.font.fontFamily};font-weight:${userProfileExport.defaultUserBookmarkStyle.font.fontWeight};font-style:${userProfileExport.defaultUserBookmarkStyle.font.fontStyle};justify-content:${userProfileExport.defaultUserBookmarkStyle.font.textAlign};`;
                    // Define the box style.
                    boxStyle = `display:flex;position:absolute;width:100%;height:100%;background-color:#00000000;`;
                    activeBoxStyle = `display: flex;justify-content: center;align-items: center;padding: 5px;color:${userProfileExport.defaultUserBookmarkStyle.font.color};font-size:${userProfileExport.defaultUserBookmarkStyle.font.fontSize}px;font-family:${userProfileExport.defaultUserBookmarkStyle.font.fontFamily};font-weight:${userProfileExport.defaultUserBookmarkStyle.font.fontWeight};font-style:${userProfileExport.defaultUserBookmarkStyle.font.fontStyle};justify-content:${userProfileExport.defaultUserBookmarkStyle.font.textAlign};background-color:${userProfileExport.defaultUserBookmarkStyle.text.backgroundColor};`;
                    // Loop through the number of bookmarks to generate.
                    for (let index = 0; index <= numberOfExamplesObj; index++) {
                        // Append HTML for each bookmark, including a random folder name and position.
                        html += `
                            <div id='bookmarkBodyPreview' style="${bodyStyle}">
                                <div id='bookmarkImagePreview' style="${imageStyle}"></div>
                                <div id='bookmarkTextPreview' style="${textStyle}">${namesArray[index]}</div>
                                <div id='bookmarkActiveBoxPreview' style="${boxStyle}justify-content: center;align-items: flex-start;"><div style="${activeBoxStyle}">Position: ${index + 1}</div></div>
                            </div>
                        `;
                    }
                    return html; // Return the generated HTML content.
                }

                if (editingDefaultUserFolderStyle.addressBar.background.backgroundType == 'color') {
                    addressBarStyle = `background-color: ${editingDefaultUserFolderStyle.addressBar.background.backgroundColor};`;
                } else if (editingDefaultUserFolderStyle.addressBar.background.backgroundType == 'image') {
                    addressBarStyle = `background-image: ${editingDefaultUserFolderStyle.addressBar.background.backgroundBase64};background-repeat: ${editingDefaultUserFolderStyle.addressBar.background.backgroundRepeat};background-size: ${editingDefaultUserFolderStyle.addressBar.background.backgroundSize};background-attachment: ${editingDefaultUserFolderStyle.addressBar.background.backgroundAttachment};background-position: ${editingDefaultUserFolderStyle.addressBar.background.backgroundPosition};background-origin: ${editingDefaultUserFolderStyle.addressBar.background.backgroundOrigin};`;
                }
                // Define the style for the bookmarks body preview.
                let bookmarksBodyPreviewStyle = `display: grid;grid-template-columns: ${editingDefaultUserFolderStyle.bookmarksBox.width} repeat(auto-fill, ${editingDefaultUserFolderStyle.bookmarksBox.width});grid-template-rows: ${editingDefaultUserFolderStyle.bookmarksBox.height} repeat(auto-fill, ${editingDefaultUserFolderStyle.bookmarksBox.height});grid-auto-flow:${editingDefaultUserFolderStyle.grid.gridAutoFlow} dense;gap: 20px 20px;justify-items: center;align-items: center;width: 550px;height: 300px;padding: 10px;overflow-y: scroll;`;
                // Combine the generated HTML for address bar and bookmarks previews.
                let html = `
                    <div id='addressBarBodyPreview' style="${addressBarStyle}">${generateExampleForAddressBar()}</div>
                    <div id='bookmarksBodyPreview' style="${bookmarksBodyPreviewStyle}">${generateExampleForBookmarks()}</div>
                `;
                // Set the display style of the right header section and inject the generated HTML.
                switch (editingDefaultUserFolderStyle.background.backgroundType) {
                    case 'image':
                        rightHeaderSectionEl.setAttribute('style', `display:flex;background-image: url(${editingDefaultUserFolderStyle.background.imageType.backgroundBase64});background-repeat: ${editingDefaultUserFolderStyle.background.imageType.backgroundRepeat};background-size: ${editingDefaultUserFolderStyle.background.imageType.backgroundSize};background-position: ${editingDefaultUserFolderStyle.background.imageType.backgroundPosition};background-origin: ${editingDefaultUserFolderStyle.background.imageType.backgroundOrigin};`);
                        break;
                    case 'color':
                        rightHeaderSectionEl.setAttribute('style', `display:flex;background-color:${editingDefaultUserFolderStyle.background.colorType.backgroundColor};`);
                        break;
                    case 'gradient':
                        const gradientArray = new Gradient().setColorGradient(...editingDefaultUserFolderStyle.background.gradientType.backgroundColorArray).setMidpoint(30).getColors();
                        const backgroundColorGradient = calculateGradientPercentages(gradientArray);
                        const createGradient = `linear-gradient(${editingDefaultUserFolderStyle.background.gradientType.angle}deg, ${backgroundColorGradient})`;
                        rightHeaderSectionEl.setAttribute('style', `display:flex;background:${createGradient};`);
                        break;
                    default:
                        console.error('%c%s', '', 'No background type selected.');
                        break;
                }
                rightHeaderSectionEl.innerHTML = html;
            }

            switch (data) {
                case 'offlineProfile':
                    settingsWindowRightSectionHtml = `
                        <div id="editProfileSection">
                            <div id="headerProfileSection">
                                <div id="profileName">
                                    <div id="name"></div>
                                </div>
                                <div id="profileLogo">
                                    <div id="logo">
                                        <img id="logoImg" src="" alt="">
                                    </div>
                                </div>
                            </div>
                            <div id="bodyProfileSection"></div>
                        </div>
                    `;
                    settingsWindowRightSectionEl.innerHTML = settingsWindowRightSectionHtml;

                    const setStyleToHeaderProfileSection = () => {
                        const headerProfileSectionEl = document.getElementById('headerProfileSection');
                        const profileLogoEl = document.getElementById('profileLogo');

                        headerProfileSectionEl.style.backgroundColor = colorPalette[1];
                        profileLogoEl.style.backgroundColor = colorPalette[3];
                    }
                    setStyleToHeaderProfileSection();

                    const setCurrentProfileToHeader = () => {
                        const nameEl = document.getElementById('name');
                        const logoImgEl = document.getElementById('logoImg');
                        if (isObjectEmpty(userActiveProfile) || isObjectEmpty(userProfile)) return;
                        if (checkIfImageBase64(userActiveProfile.image)) {
                            logoImgEl.src = userActiveProfile.image;
                        } else {
                            logoImgEl.src = defaultProfileImageBase64;
                        }
                        if (userActiveProfile.name.trim().length > 0) {
                            nameEl.textContent = userActiveProfile.name;
                            if (userActiveProfile.name.length < 30) { return };
                            const status = translateUserName('profileUserName', 'name');
                            if (!status) {
                                showMessageToastify('error', ``, `Failed to translate username`, 4000, false, 'bottom', 'right', true);
                            }
                        } else {
                            nameEl.textContent = `Not set`;
                        }
                    }
                    setCurrentProfileToHeader();

                    const createListProfiles = () => {
                        const bodyProfileSectionEl = document.getElementById('bodyProfileSection');
                        const typeArray = [
                            {
                                title: 'Bookmarks',
                                id: 'bookmarks',
                                statusDefaultChecked: true,
                                statusCurrentChecked: false,
                            },
                            {
                                title: 'Bookmark Style',
                                id: 'bookmarkStyle',
                                statusDefaultChecked: true,
                                statusCurrentChecked: false,
                            },
                            {
                                title: 'Folder Style',
                                id: 'folderStyle',
                                statusDefaultChecked: true,
                                statusCurrentChecked: false,
                            },
                            {
                                title: 'Settings',
                                id: 'settings',
                                statusDefaultChecked: true,
                                statusCurrentChecked: false,
                            }
                        ];

                        const listHtml = `
                            <div id="headerProfile">
                                <div id="createNewProfile">
                                    <div id="createNewProfileTitle">Create New Profile:</div>
                                    <div id="createNewProfileBody">
                                        <div id="createNewProfileName">
                                            <div id="createNewProfileNameTitle">Name:</div>
                                            <input type="text" id="profileNameInputField" />
                                        </div>
                                        <div id="createNewProfileSetting">
                                            <div id="createNewProfileSettingHeading">
                                                <div id="createNewProfileSettingHeadingType">Copy From</div>
                                                <div id="createNewProfileSettingHeadingDefault">Default</div>
                                                <div id="createNewProfileSettingHeadingCurrent">Current</div>
                                            </div>
                                            <div id="createNewProfileSettingBody"></div>
                                        </div>
                                        <div id="createNewProfileApply">
                                            <button id="createNewProfileApplyButton">Apply</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div id="bodyProfileList">
                                <div id="bodyProfileListTable">
                                    <div id="bodyProfileListTableHeading">
                                        <div id="bodyProfileListTableHeadingName">Name</div>
                                        <div id="bodyProfileListTableHeadingCreated">Created</div>
                                        <div id="bodyProfileListTableHeadingActive">Active</div>
                                        <div id="bodyProfileListTableHeadingEdit">Edit</div>
                                        <div id="bodyProfileListTableHeadingDelete">Delete</div>
                                    </div>
                                    <div id="bodyProfileListTableBody"></div>
                                </div>
                            </div>
                        `;
                        bodyProfileSectionEl.innerHTML = listHtml;

                        const setStyleToCreateNewProfile = () => {
                            const headerProfileEl = document.getElementById('headerProfile');
                            const profileNameInputFieldEl = document.getElementById('profileNameInputField');

                            headerProfileEl.style.backgroundColor = colorPalette[0];
                            profileNameInputFieldEl.style.backgroundColor = colorPalette[6];
                            profileNameInputFieldEl.style.border = `1px solid ${invertHexColor(colorPalette[5])}`;
                        }
                        setStyleToCreateNewProfile();

                        const updateOfflineProfileSettingsTitlesUI = () => {
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
                                createNewProfileTitle: {
                                    id: 'createNewProfileTitle',
                                    text: languageObject._userProfile._offlineProfile.createNewProfile,
                                    classNames: []
                                },
                                createNewProfileNameTitle: {
                                    id: 'createNewProfileNameTitle',
                                    text: languageObject._userProfile._offlineProfile.name,
                                    classNames: []
                                },
                                createNewProfileSettingHeadingType: {
                                    id: 'createNewProfileSettingHeadingType',
                                    text: languageObject._userProfile._offlineProfile.type,
                                    classNames: []
                                },
                                createNewProfileSettingHeadingDefault: {
                                    id: 'createNewProfileSettingHeadingDefault',
                                    text: languageObject._userProfile._offlineProfile.default,
                                    classNames: []
                                },
                                createNewProfileSettingHeadingCurrent: {
                                    id: 'createNewProfileSettingHeadingCurrent',
                                    text: languageObject._userProfile._offlineProfile.current,
                                    classNames: []
                                },
                                bookmarksTypeTitle: {
                                    id: 'bookmarksTypeTitle',
                                    text: languageObject._userProfile._offlineProfile._typeList.bookmarks,
                                    classNames: []
                                },
                                bookmarkStyleTypeTitle: {
                                    id: 'bookmarkStyleTypeTitle',
                                    text: languageObject._userProfile._offlineProfile._typeList.defaultBookmarkStyle,
                                    classNames: []
                                },
                                folderStyleTypeTitle: {
                                    id: 'folderStyleTypeTitle',
                                    text: languageObject._userProfile._offlineProfile._typeList.defaultFolderStyle,
                                    classNames: []
                                },
                                settingsTypeTitle: {
                                    id: 'settingsTypeTitle',
                                    text: languageObject._userProfile._offlineProfile._typeList.settings,
                                    classNames: []
                                },
                                createNewProfileApplyButton: {
                                    id: 'createNewProfileApplyButton',
                                    text: languageObject._userProfile._offlineProfile._buttons.apply,
                                    classNames: []
                                },
                                bodyProfileListTableHeadingName: {
                                    id: 'bodyProfileListTableHeadingName',
                                    text: languageObject._userProfile._offlineProfile._tableHeaderProfilesList.name,
                                    classNames: []
                                },
                                bodyProfileListTableHeadingCreated: {
                                    id: 'bodyProfileListTableHeadingCreated',
                                    text: languageObject._userProfile._offlineProfile._tableHeaderProfilesList.created,
                                    classNames: []
                                },
                                bodyProfileListTableHeadingActive: {
                                    id: 'bodyProfileListTableHeadingActive',
                                    text: languageObject._userProfile._offlineProfile._tableHeaderProfilesList.active,
                                    classNames: []
                                },
                                bodyProfileListTableHeadingEdit: {
                                    id: 'bodyProfileListTableHeadingEdit',
                                    text: languageObject._userProfile._offlineProfile._tableHeaderProfilesList.edit,
                                    classNames: []
                                },
                                bodyProfileListTableHeadingDelete: {
                                    id: 'bodyProfileListTableHeadingDelete',
                                    text: languageObject._userProfile._offlineProfile._tableHeaderProfilesList.delete,
                                    classNames: []
                                }
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

                        const createNewProfileSettingBodyList = () => {
                            const createNewProfileSettingBodyEl = document.getElementById('createNewProfileSettingBody');
                            let settingBodyHtml = ``;

                            typeArray.forEach(type => {
                                settingBodyHtml += `
                                    <div class="createNewProfileSettingBodyType">
                                        <div id="${type.id}TypeTitle" class="createNewProfileSettingType">${type.title}</div>
                                        <div class="createNewProfileSettingDefault">
                                            <label class="toggle" for="${type.id}SettingDefault">
                                                <input type="checkbox" class="toggleInput settingToggleInput" id="${type.id}SettingDefault" data-type="${type.id}Default" ${type.statusDefaultChecked ? 'checked' : ''} />
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
                                        <div class="createNewProfileSettingCurrent">
                                            <label class="toggle" for="${type.id}SettingCurrent">
                                                <input type="checkbox" class="toggleInput settingToggleInput" id="${type.id}SettingCurrent" data-type="${type.id}Current" ${type.statusCurrentChecked ? 'checked' : ''} />
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
                                    </div>
                                `;
                            });
                            createNewProfileSettingBodyEl.innerHTML = settingBodyHtml;

                            const addNewProfileSettingBodyEventListeners = () => {
                                const settingToggleInputArray = document.querySelectorAll('.settingToggleInput');

                                const toggleInput = (element) => {
                                    const type = element.target.dataset.type;
                                    const status = element.target.checked;
                                    const id = type.includes('Default') ? type.replace('Default', '') : type.replace('Current', '');
                                    const object = typeArray.find(a => a.id === id);
                                    if (type.includes('Default')) {
                                        const oppositeElement = document.getElementById(`${id}SettingCurrent`);
                                        object.statusDefaultChecked = status;
                                        object.statusCurrentChecked = !status;
                                        oppositeElement.checked = !status;
                                    } else {
                                        const oppositeElement = document.getElementById(`${id}SettingDefault`);
                                        object.statusDefaultChecked = !status;
                                        object.statusCurrentChecked = status;
                                        oppositeElement.checked = !status;
                                    }
                                }

                                settingToggleInputArray.forEach(input => {
                                    input.addEventListener('change', toggleInput);
                                });
                            }
                            addNewProfileSettingBodyEventListeners();

                        }
                        createNewProfileSettingBodyList();

                        const createBodyProfileListTableBody = () => {
                            if (!Array.isArray(userProfile.offline)) return;
                            const bodyProfileListEl = document.getElementById('bodyProfileList');
                            const bodyProfileListTableBodyEl = document.getElementById('bodyProfileListTableBody');
                            let bodyTableHtml = ``;
                            let idsArrayForTooltip = [];
                            const selectedSvg = `
                                <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8 12.5L11 15.5L16 9.5" stroke="${editingMainUserSettings.windows.button.success.backgroundColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <circle cx="12" cy="12" r="10" stroke="${editingMainUserSettings.windows.button.success.backgroundColor}" stroke-width="2"/>
                                </svg>
                            `;
                            const notSelectedSvg = `
                                <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="12" cy="12" r="10" stroke="${editingMainUserSettings.windows.button.secondary.backgroundColor}" stroke-width="2"/>
                                </svg>
                            `;
                            const editSvg = `
                                <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M16.4745 5.40801L18.5917 7.52524M17.8358 3.54289L12.1086 9.27005C11.8131 9.56562 11.6116 9.94206 11.5296 10.3519L11 13L13.6481 12.4704C14.0579 12.3884 14.4344 12.1869 14.7299 11.8914L20.4571 6.16423C21.181 5.44037 21.181 4.26676 20.4571 3.5429C19.7332 2.81904 18.5596 2.81903 17.8358 3.54289Z" stroke="${editingMainUserSettings.windows.button.success.backgroundColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M19 15V18C19 19.1046 18.1046 20 17 20H6C4.89543 20 4 19.1046 4 18V7C4 5.89543 4.89543 5 6 5H9" stroke="${editingMainUserSettings.windows.button.primary.backgroundColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            `;
                            const deleteSvg = `
                                <svg style="pointer-events: none;" width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 6H20L18.4199 20.2209C18.3074 21.2337 17.4512 22 16.4321 22H7.56786C6.54876 22 5.69264 21.2337 5.5801 20.2209L4 6Z" stroke="${editingMainUserSettings.windows.button.danger.backgroundColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M7.34491 3.14716C7.67506 2.44685 8.37973 2 9.15396 2H14.846C15.6203 2 16.3249 2.44685 16.6551 3.14716L18 6H6L7.34491 3.14716Z" stroke="${editingMainUserSettings.windows.button.danger.backgroundColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M2 6H22" stroke="${editingMainUserSettings.windows.button.danger.backgroundColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M10 11V16" stroke="${editingMainUserSettings.windows.button.secondary.backgroundColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M14 11V16" stroke="${editingMainUserSettings.windows.button.secondary.backgroundColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            `;

                            userProfile.offline.sort((a, b) => (a.timestampCreation > b.timestampCreation) ? ((a.timestampCreation > b.timestampCreation) ? 1 : 0) : -1);
                            // userProfile.offline.sort((a, b) => (a.timestampCreation < b.timestampCreation) ? ((a.timestampCreation > b.timestampCreation) ? 1 : 0) : -1);
                            userProfile.offline.forEach((profile, index) => {
                                let date = 'Invalid date';
                                let time = 'Invalid time';
                                if (isValidDate(profile.timestampCreation)) {
                                    date = formatDateTime(profile.timestampCreation, currentLanguage, 'date');
                                    time = formatDateTime(profile.timestampCreation, currentLanguage, 'time');
                                }
                                if (profile.name.length >= 29) {
                                    idsArrayForTooltip.push({ id: profile.userId, name: profile.name });
                                }
                                bodyTableHtml += `
                                    <div class="bodyProfileListTableRow" ${index % 2 ? `style="background-color: ${colorPalette[3]}"` : `style="background-color: ${colorPalette[6]}"`}>
                                        <div class="bodyProfileListTableRowName" data-id="${profile.userId}">${truncateString(profile.name, 29, 0)}</div>
                                        <div class="bodyProfileListTableRowInfo">
                                            <div class="bodyProfileListTableRowInfoDate">${date}</div>
                                            <div class="bodyProfileListTableRowInfoTime">${time}</div>
                                        </div>
                                        <div class="bodyProfileListTableRowSet">
                                            <button class="profileSetButton" data-id="${profile.userId}">
                                                ${userActiveProfile.userId === profile.userId ? selectedSvg : notSelectedSvg}
                                            </button>
                                        </div>
                                        <div class="bodyProfileListTableRowEdit">
                                            <button class="profileEditButton" data-id="${profile.userId}">${editSvg}</button>
                                        </div>
                                        <div class="bodyProfileListTableRowDelete">
                                            <button class="profileDeleteButton" data-id="${profile.userId}">${deleteSvg}</button>
                                        </div>
                                    </div>
                                `;
                            });
                            bodyProfileListTableBodyEl.innerHTML = bodyTableHtml;
                            bodyProfileListEl.style.backgroundColor = colorPalette[1];

                            const addBodyProfileSectionEventListeners = () => {
                                const profileSetButtonArray = document.querySelectorAll('.profileSetButton');
                                const profileEditButtonArray = document.querySelectorAll('.profileEditButton');
                                const profileDeleteButtonArray = document.querySelectorAll('.profileDeleteButton');

                                /**
                                 * Function to create a tooltip for long profile names.
                                 *
                                 * @returns {void}
                                 */
                                const createTooltipForLongProfileNames = () => {
                                    const backgroundColorBrightness = checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff';
                                    const style = {
                                        backgroundColor: editingMainUserSettings.windows.window.backgroundColor,
                                        color: editingMainUserSettings.windows.window.font.color,
                                        padding: '5px',
                                        borderRadius: '5px',
                                        border: `1px solid ${backgroundColorBrightness}`,
                                        fontSize: `${editingMainUserSettings.windows.window.font.fontSize}px`,
                                        fontWeight: editingMainUserSettings.windows.window.font.fontWeight,
                                        fontFamily: editingMainUserSettings.windows.window.font.fontFamily,
                                        maxWidth: '400px'
                                    }
                                    const underlineStyle = {
                                        textDecorationColor: editingMainUserSettings.windows.window.font.color,
                                        textDecorationLine: 'underline',
                                        textDecorationStyle: 'dotted',
                                    }
                                    idsArrayForTooltip.forEach(profile => {
                                        const profileName = document.querySelector(`.bodyProfileListTableRowName[data-id="${profile.id}"]`);
                                        Object.assign(profileName.style, underlineStyle);
                                        createTooltip(profileName, 'top', profile.name, style);
                                    });
                                }
                                if (idsArrayForTooltip.length > 0) { createTooltipForLongProfileNames(); }

                                const setToCurrentProfile = async (event) => {
                                    event.stopPropagation();
                                    const buttonElement = event.target.closest('button');
                                    const dataId = buttonElement.dataset.id;
                                    if (userActiveProfile.userId !== dataId) {
                                        profileSetButtonArray.forEach(button => {
                                            if (dataId === button.dataset.id) {
                                                button.innerHTML = selectedSvg;
                                            } else {
                                                button.innerHTML = notSelectedSvg;
                                            }
                                        });
                                        userProfile.offline.forEach(profile => {
                                            if (dataId === profile.userId) {
                                                profile.active = true;
                                            } else {
                                                profile.active = false;
                                            }
                                        });
                                        await manageUserProfiles('save');
                                        await indexedDBManipulation('save', 'openSettingsAfterReload', true);
                                        window.location.reload();
                                    }
                                }

                                const editSelectedProfile = (event) => {
                                    event.stopPropagation();
                                    const buttonElement = event.target.closest('button');
                                    const dataId = buttonElement.dataset.id;
                                    getDetailSelectedProfile(dataId);
                                }

                                const deleteSelectedProfile = (event) => {
                                    event.stopPropagation();
                                    const buttonElement = event.target.closest('button');
                                    const dataId = buttonElement.dataset.id;
                                    manageUserProfiles('delete', false, { userID: dataId }).then(deleteStatus => {
                                        if (deleteStatus === true) {
                                            showMessageToastify('success', '', `Profile deleted successfully`, 1500, false, 'bottom', 'right', true);
                                            createBodyProfileListTableBody();
                                        } else if (deleteStatus === 'Cannot delete the last user profile') {
                                            showMessageToastify('error', '', `Cannot delete the last user profile.`, 2500, false, 'bottom', 'right', true);
                                        } else if (deleteStatus === 'Same Id as active') {
                                            showMessageToastify('error', '', `You can't delete active profile.`, 2500, false, 'bottom', 'right', true);
                                        } else if (deleteStatus === 'Not found') {
                                            showMessageToastify('error', '', `Profile not found.`, 2500, false, 'bottom', 'right', true);
                                        }
                                    })
                                }

                                profileSetButtonArray.forEach(button => {
                                    button.addEventListener('click', setToCurrentProfile);
                                });
                                profileEditButtonArray.forEach(button => {
                                    button.addEventListener('click', editSelectedProfile);
                                });
                                profileDeleteButtonArray.forEach(button => {
                                    button.addEventListener('click', deleteSelectedProfile);
                                });
                            }
                            addBodyProfileSectionEventListeners();
                        }
                        createBodyProfileListTableBody();

                        const setToDefaultAfterSave = () => {
                            const profileNameInputFieldEl = document.getElementById('profileNameInputField');
                            const settingToggleInputArray = document.querySelectorAll('.settingToggleInput');
                            profileNameInputFieldEl.value = '';
                            settingToggleInputArray.forEach(element => {
                                const type = element.dataset.type;
                                const id = type.includes('Default') ? type.replace('Default', '') : type.replace('Current', '');
                                const object = typeArray.find(a => a.id === id);
                                if (type.includes('Default')) {
                                    object.statusDefaultChecked = true;
                                    object.statusCurrentChecked = false;
                                    element.checked = true;
                                } else {
                                    object.statusDefaultChecked = true;
                                    object.statusCurrentChecked = false;
                                    element.checked = false;
                                }
                            });
                            createBodyProfileListTableBody();
                        }

                        const addBodyProfileSectionEventListeners = () => {
                            const profileNameInputFieldEl = document.getElementById('profileNameInputField');
                            const createNewProfileApplyButton = document.getElementById('createNewProfileApplyButton');

                            createNewProfileApplyButton.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                            createNewProfileApplyButton.style.color = editingMainUserSettings.windows.button.primary.font.color;

                            const checkNewProfileNameInput = () => {
                                if (profileNameInputFieldEl.value.trim().length >= 200) {
                                    showMessageToastify('error', '', `Name is too long`, 1500, false, 'bottom', 'right', true);
                                    profileNameInputFieldEl.value = profileNameInputFieldEl.value.slice(0, 200);
                                }
                            }

                            const applyToCreateNewProfile = async () => {
                                if (profileNameInputFieldEl.value.trim().length == 0) {
                                    gsap.fromTo(profileNameInputFieldEl, 0.2, {
                                        x: -3,
                                    }, {
                                        duration: .2,
                                        x: +3,
                                        backgroundColor: '#ff0000',
                                        yoyo: true,
                                        repeat: 5,
                                        onComplete: () => {
                                            gsap.killTweensOf(profileNameInputFieldEl);
                                            gsap.set(profileNameInputFieldEl, { clearProps: 'all' });
                                        }
                                    });
                                    return;
                                }
                                const dataObject = {
                                    userName: profileNameInputFieldEl.value.trim(),
                                    userID: '',
                                    image: '',
                                    bookmarkDefault: true,
                                    bookmarkStyleDefault: true,
                                    folderStyleDefault: true,
                                    settingsDefault: true,
                                    importStatus: false,
                                    importObjects: {},
                                }
                                typeArray.forEach(type => {
                                    if (type.id === 'bookmarks') { dataObject.bookmarkDefault = type.statusDefaultChecked; }
                                    if (type.id === 'bookmarkStyle') { dataObject.bookmarkStyleDefault = type.statusDefaultChecked; }
                                    if (type.id === 'folderStyle') { dataObject.folderStyleDefault = type.statusDefaultChecked; }
                                    if (type.id === 'settings') { dataObject.settingsDefault = type.statusDefaultChecked; }
                                });
                                const statusNew = await manageUserProfiles('create', false, dataObject);
                                showMessageToastify('success', '', `Profile created successfully`, 1500, false, 'bottom', 'right', true);
                                setToDefaultAfterSave();
                            }

                            const mouseEnterApplyToCreateNewProfile = (el) => {
                                el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                            }

                            const mouseLeaveApplyToCreateNewProfile = (el) => {
                                el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                            }

                            profileNameInputFieldEl.addEventListener('input', checkNewProfileNameInput);
                            createNewProfileApplyButton.addEventListener('click', applyToCreateNewProfile);
                            createNewProfileApplyButton.addEventListener('mouseenter', mouseEnterApplyToCreateNewProfile);
                            createNewProfileApplyButton.addEventListener('mouseleave', mouseLeaveApplyToCreateNewProfile);
                        }
                        addBodyProfileSectionEventListeners();
                        updateOfflineProfileSettingsTitlesUI();

                    }
                    createListProfiles();

                    const getDetailSelectedProfile = (id) => {
                        const bodyProfileSectionEl = document.getElementById('bodyProfileSection');
                        if (id.length == 0) {
                            createListProfiles();
                            throw Error('No profile ID given');
                        }
                        const selectedProfile = userProfile.offline.find(a => a.userId === id);
                        if (isObjectEmpty(selectedProfile)) {
                            createListProfiles();
                            throw Error('No profile found');
                        }

                        const profileDetailHtml = `
                            <div id="returnBack">
                                <button id="returnBackButton" style="background-color: ${editingMainUserSettings.windows.button.primary.backgroundColor}">
                                    <svg width="30px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M8 5L3 10L8 15" stroke="${editingMainUserSettings.windows.button.primary.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M3 10H11C16.5228 10 21 14.4772 21 20V21" stroke="${editingMainUserSettings.windows.button.primary.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </button>
                            </div>
                            <div id="profileNameEditor">
                                <div id="profileNameInputTitle">Change Name:</div>
                                <div id="profileNameInputContainer">
                                    <input type="text" id="profileNameInputField" />
                                    <button id="profileNameSaveButton">Change</button>
                                </div>
                                <div id="profilePictureContainer">
                                    <div id="imageWrapper">
                                        <img id="profileLogoImg" src="${selectedProfile.image}" alt="">
                                        <div id="uploadNewImageTrigger">Change</div>
                                    </div>
                                </div>
                            </div>
                            <div id="profileImageEditor">
                                <label for="imagePickerInputTitle" id="imagePickerInputTitle">Choose Image:</label>
                                <div id="profileImageButtons">
                                    <div id="imagePickerInputFileSection">
                                        <input type="file" id="imagePickerInputFile" />
                                        <span id="imagePickerInputFileInfo">Select Image</span>
                                    </div>
                                    <button id="profileImageDeleteButton">Delete</button>
                                </div>
                            </div>
                            <div id="profileContains">
                                <div id="currentProfileDetailTable">
                                    <div id="currentProfileDetailTableHeading">
                                        <div id="currentProfileDetailTableHeadType">Type</div>
                                        <div id="currentProfileDetailTableHeadDetail">Detail</div>
                                        <div id="currentProfileDetailTableHeadDefault">Default</div>
                                    </div>
                                    <div id="currentProfileDetailTableBody">
                                        <div id="currentProfileDetailTableRowBookmarks">
                                            <div class="currentProfileDetailTableCellType" id="currentProfileDetailTableCellTypeBookmarks">Bookmarks</div>
                                            <div class="currentProfileDetailTableCellDetail" id="currentProfileDetailTableCellDetailBookmarks">
                                                <div id="detailBookmarksAmountFolders">
                                                    <div id="foldersTitle">Folders:</div>
                                                    <div id="foldersAmount"></div>
                                                </div>
                                                <div id="detailBookmarksAmountBookmarks">
                                                    <div id="bookmarksTitle">Bookmarks:</div>
                                                    <div id="bookmarksAmount"></div>
                                                </div>
                                            </div>
                                            <div class="currentProfileDetailTableCellDefault" id="currentProfileDetailTableCellDefaultBookmarks">
                                                <button class="currentProfileDetailButton" id="resetToDefaultBookmarks">Reset</button>
                                            </div>
                                        </div>
                                        <div id="currentProfileDetailTableRowBookmarksStyle">
                                            <div class="currentProfileDetailTableCellType" id="currentProfileDetailTableCellTypeBookmarksStyle">Default Bookmark Style</div>
                                            <div class="currentProfileDetailTableCellDetail" id="currentProfileDetailTableCellDetailBookmarksStyle"></div>
                                            <div class="currentProfileDetailTableCellDefault" id="currentProfileDetailTableCellDefaultBookmarksStyle">
                                                <button class="currentProfileDetailButton" id="resetToDefaultBookmarksStyle">Reset</button>
                                            </div>
                                        </div>
                                        <div id="currentProfileDetailTableRowFolderStyle">
                                            <div class="currentProfileDetailTableCellType" id="currentProfileDetailTableCellTypeFolderStyle">Default Folder Style</div>
                                            <div class="currentProfileDetailTableCellDetail" id="currentProfileDetailTableCellDetailFolderStyle"></div>
                                            <div class="currentProfileDetailTableCellDefault" id="currentProfileDetailTableCellDefaultFolderStyle">
                                                <button class="currentProfileDetailButton" id="resetToDefaultFolderStyle">Reset</button>
                                            </div>
                                        </div>
                                        <div id="currentProfileDetailTableRowSetting">
                                            <div class="currentProfileDetailTableCellType" id="currentProfileDetailTableCellTypeSetting">Setting</div>
                                            <div class="currentProfileDetailTableCellDetail" id="currentProfileDetailTableCellDetailSetting"></div>
                                            <div class="currentProfileDetailTableCellDefault" id="currentProfileDetailTableCellDefaultSetting">
                                                <button class="currentProfileDetailButton" id="resetToDefaultSetting">Reset</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                        bodyProfileSectionEl.innerHTML = profileDetailHtml;

                        const setStyleToEditProfile = () => {
                            const headerProfileSectionEl = document.getElementById('headerProfileSection');
                            const profileLogoEl = document.getElementById('profileLogo');
                            const currentProfileDetailTableEl = document.getElementById('currentProfileDetailTable');
                            const profileNameInputFieldEl = document.getElementById('profileNameInputField');

                            headerProfileSectionEl.style.backgroundColor = colorPalette[1];
                            profileLogoEl.style.backgroundColor = colorPalette[3];
                            currentProfileDetailTableEl.style.backgroundColor = colorPalette[0];
                            profileNameInputFieldEl.style.backgroundColor = colorPalette[6];
                            profileNameInputFieldEl.style.border = `1px solid ${invertHexColor(colorPalette[5])}`;
                        }
                        setStyleToEditProfile();

                        const updateOfflineProfileEditSettingsTitlesUI = () => {
                            /**
                            * Helper function to update the text content of a given element.
                            * @param {HTMLElement} element - The DOM element whose text content needs to be updated.
                            * @param {string} text - The new text content to be set for the element.
                            */
                            const updateTextContent = (element, text) => {
                                if (element && text !== undefined) {
                                    element.innerText = text;
                                } else {
                                    console.error({ element: element, text: text });
                                    throw Error(`Invalid arguments passed to updateTextContent(), element: ${element}, text: ${text}`);
                                }
                            };

                            // Mapping of element IDs to their corresponding text values
                            const titlesToUpdate = {
                                profileNameInputTitle: {
                                    id: 'profileNameInputTitle',
                                    text: languageObject._userProfile._offlineProfile.changeName,
                                    classNames: []
                                },
                                profileNameSaveButton: {
                                    id: 'profileNameSaveButton',
                                    text: languageObject._userProfile._offlineProfile._buttons.apply,
                                    classNames: []
                                },
                                imagePickerInputTitle: {
                                    id: 'imagePickerInputTitle',
                                    text: languageObject._userProfile._offlineProfile.chooseProfilePicture,
                                    classNames: []
                                },
                                imagePickerInputFile: {
                                    id: 'imagePickerInputFile',
                                    text: languageObject._userProfile._offlineProfile.selectImage,
                                    classNames: []
                                },
                                uploadNewImageTrigger: {
                                    id: 'uploadNewImageTrigger',
                                    text: languageObject._userProfile._offlineProfile.selectImage,
                                    classNames: []
                                },
                                profileImageDeleteButton: {
                                    id: 'profileImageDeleteButton',
                                    text: languageObject._userProfile._offlineProfile._buttons.delete,
                                    classNames: []
                                },
                                currentProfileDetailTableHeadType: {
                                    id: 'currentProfileDetailTableHeadType',
                                    text: languageObject._userProfile._offlineProfile._tableHeaderEditedProfile.type,
                                    classNames: []
                                },
                                currentProfileDetailTableHeadDetail: {
                                    id: 'currentProfileDetailTableHeadDetail',
                                    text: languageObject._userProfile._offlineProfile._tableHeaderEditedProfile.detail,
                                    classNames: []
                                },
                                currentProfileDetailTableHeadDefault: {
                                    id: 'currentProfileDetailTableHeadDefault',
                                    text: languageObject._userProfile._offlineProfile._tableHeaderEditedProfile.default,
                                    classNames: []
                                },
                                currentProfileDetailTableCellTypeBookmarks: {
                                    id: 'currentProfileDetailTableCellTypeBookmarks',
                                    text: languageObject._userProfile._offlineProfile._typeList.bookmarks,
                                    classNames: []
                                },
                                currentProfileDetailTableCellTypeBookmarksStyle: {
                                    id: 'currentProfileDetailTableCellTypeBookmarksStyle',
                                    text: languageObject._userProfile._offlineProfile._typeList.defaultBookmarkStyle,
                                    classNames: []
                                },
                                currentProfileDetailTableCellTypeFolderStyle: {
                                    id: 'currentProfileDetailTableCellTypeFolderStyle',
                                    text: languageObject._userProfile._offlineProfile._typeList.defaultFolderStyle,
                                    classNames: []
                                },
                                currentProfileDetailTableCellTypeSetting: {
                                    id: 'currentProfileDetailTableCellTypeSetting',
                                    text: languageObject._userProfile._offlineProfile._typeList.settings,
                                    classNames: []
                                },
                                foldersTitle: {
                                    id: 'foldersTitle',
                                    text: languageObject._userProfile._offlineProfile.bookmarksTypeDetailFolders,
                                    classNames: []
                                },
                                bookmarksTitle: {
                                    id: 'bookmarksTitle',
                                    text: languageObject._userProfile._offlineProfile.bookmarksTypeDetailBookmarks,
                                    classNames: []
                                },
                                resetToDefaultBookmarks: {
                                    id: 'resetToDefaultBookmarks',
                                    text: languageObject._userProfile._offlineProfile._buttons.reset,
                                    classNames: []
                                },
                                resetToDefaultBookmarksStyle: {
                                    id: 'resetToDefaultBookmarksStyle',
                                    text: languageObject._userProfile._offlineProfile._buttons.reset,
                                    classNames: []
                                },
                                resetToDefaultFolderStyle: {
                                    id: 'resetToDefaultFolderStyle',
                                    text: languageObject._userProfile._offlineProfile._buttons.reset,
                                    classNames: []
                                },
                                resetToDefaultSetting: {
                                    id: 'resetToDefaultSetting',
                                    text: languageObject._userProfile._offlineProfile._buttons.reset,
                                    classNames: []
                                },
                            };

                            // Update the text content and class of each UI element
                            Object.entries(titlesToUpdate).forEach(([elementType, { id, text, classNames }]) => {
                                let element;
                                if (id.length > 0) {
                                    element = document.getElementById(id); // Try to get by ID
                                } else if (classNames.length === 1) {
                                    element = document.getElementsByClassName(classNames); // Try to get by class name
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
                        updateOfflineProfileEditSettingsTitlesUI();

                        const setDefaultToOfflineProfileUI = () => {
                            if (isObjectEmpty(selectedProfile)) return;
                            const profileNameInputFieldEl = document.getElementById('profileNameInputField');
                            const profileImageDeleteButton = document.getElementById('profileImageDeleteButton');
                            const foldersAmountEl = document.getElementById('foldersAmount');
                            const bookmarksAmountEl = document.getElementById('bookmarksAmount');

                            profileNameInputFieldEl.value = selectedProfile.name;

                            profileImageDeleteButton.style.backgroundColor = editingMainUserSettings.windows.button.danger.backgroundColor;
                            if (selectedProfile.image === defaultProfileImageBase64) {
                                profileImageDeleteButton.style.display = 'none';
                            } else {
                                profileImageDeleteButton.style.display = 'flex';
                            }

                            if (Array.isArray(selectedProfile.currentUserBookmarks) && selectedProfile.currentUserBookmarks) {
                                const countTypes = (bookmarks) => {
                                    const count = { folders: 0, bookmarks: 0 };

                                    const traverse = (items) => {
                                        items.forEach(item => {
                                            if (item.type === 'folder') {
                                                count.folders++;
                                                if (item.children && item.children.length > 0) {
                                                    traverse(item.children);
                                                }
                                            } else if (item.type === 'bookmark') {
                                                count.bookmarks++;
                                            }
                                        });
                                    };

                                    traverse(bookmarks);
                                    return count;
                                };

                                const result = countTypes(selectedProfile.currentUserBookmarks);
                                foldersAmountEl.textContent = `${result.folders - 1}`;
                                bookmarksAmountEl.textContent = `${result.bookmarks}`;
                            }
                        }
                        setDefaultToOfflineProfileUI();

                        const addEventListenersToOfflineProfile = () => {
                            const returnBackButtonEl = document.getElementById('returnBackButton');
                            const profileNameInputFieldEl = document.getElementById('profileNameInputField');
                            const profileNameSaveButtonEl = document.getElementById('profileNameSaveButton');
                            const profileNameEl = document.getElementById('profileName');
                            const imagePickerInputFileSectionEl = document.getElementById('imagePickerInputFileSection');
                            const imagePickerInputFileEl = document.getElementById('imagePickerInputFile');
                            const profileImageDeleteButtonEl = document.getElementById('profileImageDeleteButton');
                            const uploadNewImageTriggerEl = document.getElementById('uploadNewImageTrigger');
                            const logoImgEl = document.getElementById('logoImg');
                            const profileLogoImgEl = document.getElementById('profileLogoImg');
                            const resetToDefaultBookmarksEl = document.getElementById('resetToDefaultBookmarks');
                            const resetToDefaultBookmarksStyleEl = document.getElementById('resetToDefaultBookmarksStyle');
                            const resetToDefaultFolderStyleEl = document.getElementById('resetToDefaultFolderStyle');
                            const resetToDefaultSettingEl = document.getElementById('resetToDefaultSetting');

                            profileNameSaveButtonEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                            profileNameSaveButtonEl.style.color = editingMainUserSettings.windows.button.primary.font.color;
                            imagePickerInputFileSectionEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                            imagePickerInputFileSectionEl.style.color = editingMainUserSettings.windows.button.primary.font.color;
                            resetToDefaultBookmarksEl.style.backgroundColor = editingMainUserSettings.windows.button.danger.backgroundColor;
                            resetToDefaultBookmarksEl.style.color = editingMainUserSettings.windows.button.danger.font.color;
                            resetToDefaultBookmarksStyleEl.style.backgroundColor = editingMainUserSettings.windows.button.danger.backgroundColor;
                            resetToDefaultBookmarksStyleEl.style.color = editingMainUserSettings.windows.button.danger.font.color;
                            resetToDefaultFolderStyleEl.style.backgroundColor = editingMainUserSettings.windows.button.danger.backgroundColor;
                            resetToDefaultFolderStyleEl.style.color = editingMainUserSettings.windows.button.danger.font.color;
                            resetToDefaultSettingEl.style.backgroundColor = editingMainUserSettings.windows.button.danger.backgroundColor;
                            resetToDefaultSettingEl.style.color = editingMainUserSettings.windows.button.danger.font.color;
                            profileImageDeleteButtonEl.style.backgroundColor = editingMainUserSettings.windows.button.danger.backgroundColor;
                            profileImageDeleteButtonEl.style.color = editingMainUserSettings.windows.button.danger.font.color;

                            const mouseEnterApplyButton = (el) => {
                                el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                            }

                            const mouseLeaveApplyButton = (el) => {
                                el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                            }

                            const mouseEnterResetButton = (el) => {
                                el.target.style.backgroundColor = editingMainUserSettings.windows.button.danger.hoverBackgroundColor;
                            }

                            const mouseLeaveResetButton = (el) => {
                                el.target.style.backgroundColor = editingMainUserSettings.windows.button.danger.backgroundColor;
                            }

                            const resetToDefaultBookmarks = async () => {
                                const foldersAmountEl = document.getElementById('foldersAmount');
                                const bookmarksAmountEl = document.getElementById('bookmarksAmount');
                                userProfile.offline.forEach(profile => {
                                    if (profile.userId === id) {
                                        profile.currentUserBookmarks = structuredClone(defaultUserBookmarks);
                                        foldersAmountEl.textContent = `0`;
                                        bookmarksAmountEl.textContent = `0`;
                                    }
                                });
                                const saveStatus = await manageUserProfiles('save');
                                if (!saveStatus) {
                                    showMessageToastify('error', ``, `Failed to reset profile bookmarks.`, 4000, false, 'bottom', 'right', true);
                                } else {
                                    showMessageToastify('success', ``, `Successfully reset profile bookmarks.`, 4000, false, 'bottom', 'right', true);
                                    await manageUserProfiles('get');
                                    createCurrentBookmarkFolder();
                                }
                            }

                            const resetToDefaultBookmarkStyle = async () => {
                                userProfile.offline.forEach(profile => {
                                    if (profile.userId === id) {
                                        profile.defaultUserBookmarkStyle = structuredClone(defaultBookmarkStyle);
                                    }
                                });
                                if (userActiveProfile.userId === id) {
                                    userProfileExport.defaultUserBookmarkStyle = structuredClone(defaultBookmarkStyle);
                                    setStyleToSettingsWindow();
                                    setStyleToEditProfile();
                                }
                                const saveStatus = await manageUserProfiles('save');
                                if (!saveStatus) {
                                    showMessageToastify('error', ``, `Failed to reset profile bookmark style.`, 4000, false, 'bottom', 'right', true);
                                } else {
                                    showMessageToastify('success', ``, `Successfully reset profile bookmark style.`, 4000, false, 'bottom', 'right', true);
                                    await manageUserProfiles('get');
                                }
                            }

                            const resetToDefaultFolderStyle = async () => {
                                userProfile.offline.forEach(profile => {
                                    if (profile.userId === id) {
                                        profile.defaultUserFolderStyle = structuredClone(defaultFolderStyle);;
                                    }
                                });
                                if (userActiveProfile.userId === id) {
                                    editingDefaultUserFolderStyle = structuredClone(defaultFolderStyle);
                                    userProfileExport.defaultUserFolderStyle = structuredClone(defaultFolderStyle);
                                    setStyleToSettingsWindow();
                                    setStyleToEditProfile();
                                }
                                const saveStatus = await manageUserProfiles('save');
                                if (!saveStatus) {
                                    showMessageToastify('error', ``, `Failed to reset profile folder style.`, 4000, false, 'bottom', 'right', true);
                                } else {
                                    showMessageToastify('success', ``, `Successfully reset profile folder style.`, 4000, false, 'bottom', 'right', true);
                                    await manageUserProfiles('get');
                                }
                            }

                            const resetToDefaultSettings = async () => {
                                userProfile.offline.forEach(profile => {
                                    if (profile.userId === id) {
                                        profile.mainUserSettings = structuredClone(defaultMainUserSettings);
                                    }
                                });
                                if (userActiveProfile.userId === id) {
                                    editingMainUserSettings = structuredClone(defaultMainUserSettings);
                                    userProfileExport.mainUserSettings = structuredClone(defaultMainUserSettings);
                                    setStyleToSettingsWindow();
                                    setStyleToEditProfile();
                                }
                                const saveStatus = await manageUserProfiles('save');
                                if (!saveStatus) {
                                    showMessageToastify('error', ``, `Failed to reset profile settings.`, 4000, false, 'bottom', 'right', true);
                                } else {
                                    showMessageToastify('success', ``, `Successfully reset profile settings.`, 4000, false, 'bottom', 'right', true);
                                    await manageUserProfiles('get');
                                }
                            }

                            const returnBack = () => {
                                createListProfiles();
                            }

                            const mouseEnterReturnBack = (el) => {
                                el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                            }

                            const mouseLeaveReturnBack = (el) => {
                                el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                            }

                            const checkNameLength = () => {
                                if (profileNameInputFieldEl.value.trim().length >= 200) {
                                    showMessageToastify('error', '', `Name is too long`, 1500, false, 'bottom', 'right', true);
                                    profileNameInputFieldEl.value = profileNameInputFieldEl.value.slice(0, 200);
                                }
                            }

                            const updateUserName = async () => {
                                const nameValue = profileNameInputFieldEl.value.trim();
                                selectedProfile.name = nameValue;
                                userProfile.offline.forEach(profile => {
                                    if (profile.userId === id) {
                                        profileNameEl.innerHTML = `<div id="name">${nameValue}</div>`;
                                        profile.name = nameValue;
                                        if (nameValue.length < 30) { return };
                                        const status = translateUserName('profileUserName', 'name');
                                        if (!status) {
                                            showMessageToastify('error', ``, `Failed to translate username`, 4000, false, 'bottom', 'right', true);
                                        }
                                    }
                                });
                                await manageUserProfiles('save');
                            }

                            const triggerInputFile = () => {
                                imagePickerInputFileEl.click();
                            }

                            const deleteSelectedProfileImage = async () => {
                                selectedProfile.image = defaultProfileImageBase64
                                profileLogoImgEl.src = defaultProfileImageBase64;
                                if (selectedProfile.userId === id) {
                                    logoImgEl.src = defaultProfileImageBase64;
                                    userActiveProfile.image = defaultProfileImageBase64;
                                    $('#profileImage').css('background', `url(${defaultProfileImageBase64}) center center / cover no-repeat`);
                                }
                                await manageUserProfiles('save');
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
                                try {
                                    const file = event.target.files[0];
                                    if (!file) {
                                        throw new Error('No file selected.');
                                    }
                                    // Extracts the file name and extension, then truncates the file name if necessary.
                                    if (file.name) {
                                        const [name, extension] = file.name.split(/\.(?=[^\.]+$)/);
                                        // Truncates the middle file name and appends the file extension.
                                        const fileName = `${truncateString(name, 27, 3)}.${extension}`;
                                    }
                                    // Creates a FileReader to read the selected image file.
                                    const reader = new FileReader();
                                    // Defines the onload event handler for the FileReader.
                                    // This event is triggered when the FileReader has successfully read the file.
                                    reader.onload = (e) => {
                                        // Extracts the MIME type from the result to verify the file type.
                                        const fileType = e.target.result.split(';')[0];
                                        // Checks if the file type is either PNG or JPEG. If not, logs a warning and exits the function.
                                        if (!/^data:image\/(png|jpeg)$/.test(fileType)) {
                                            console.warn("File is not a PNG or JPEG image.");
                                            showMessageToastify('error', ``, `File is not a PNG or JPEG image.`, 4000, false, 'bottom', 'right', true);
                                            return;
                                        }
                                        const resizedImage = resizeImageBase64(e.target.result, 70, 70);
                                        resizedImage.then(async image => {
                                            profileLogoImgEl.src = image;
                                            selectedProfile.image = image;
                                            if (userActiveProfile.userId === id) {
                                                logoImgEl.src = image;
                                                userActiveProfile.image = image;
                                                $('#profileImage').css('background', `url(${userActiveProfile.image ? userActiveProfile.image : defaultProfileImageBase64}) center center / cover no-repeat`);
                                            }
                                            await manageUserProfiles('save');
                                            profileImageDeleteButtonEl.style.display = 'flex';
                                        }).catch(error => {
                                            console.error('%c%s', '', `Error resizing image: ${error}`);
                                        });
                                    };
                                    // Initiates the read operation on the selected file as a Data URL (base64 encoded string).
                                    reader.readAsDataURL(file);
                                } catch (error) {
                                    console.error('%c%s', '', `Error reading file: ${error}`);
                                }
                            };

                            const mouseEnterGetImage = () => {
                                imagePickerInputFileSectionEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                            }

                            const mouseLeaveGetImage = () => {
                                imagePickerInputFileSectionEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                            }

                            returnBackButtonEl.addEventListener('click', returnBack);
                            returnBackButtonEl.addEventListener('mouseenter', mouseEnterReturnBack);
                            returnBackButtonEl.addEventListener('mouseleave', mouseLeaveReturnBack);
                            profileNameInputFieldEl.addEventListener('input', checkNameLength);
                            profileNameSaveButtonEl.addEventListener('click', updateUserName);
                            profileNameSaveButtonEl.addEventListener('mouseenter', mouseEnterApplyButton);
                            profileNameSaveButtonEl.addEventListener('mouseleave', mouseLeaveApplyButton);
                            resetToDefaultBookmarksEl.addEventListener('click', resetToDefaultBookmarks);
                            resetToDefaultBookmarksEl.addEventListener('mouseenter', mouseEnterResetButton);
                            resetToDefaultBookmarksEl.addEventListener('mouseleave', mouseLeaveResetButton);
                            resetToDefaultBookmarksStyleEl.addEventListener('click', resetToDefaultBookmarkStyle);
                            resetToDefaultBookmarksStyleEl.addEventListener('mouseenter', mouseEnterResetButton);
                            resetToDefaultBookmarksStyleEl.addEventListener('mouseleave', mouseLeaveResetButton);
                            resetToDefaultFolderStyleEl.addEventListener('click', resetToDefaultFolderStyle);
                            resetToDefaultFolderStyleEl.addEventListener('mouseenter', mouseEnterResetButton);
                            resetToDefaultFolderStyleEl.addEventListener('mouseleave', mouseLeaveResetButton);
                            resetToDefaultSettingEl.addEventListener('click', resetToDefaultSettings);
                            resetToDefaultSettingEl.addEventListener('mouseenter', mouseEnterResetButton);
                            resetToDefaultSettingEl.addEventListener('mouseleave', mouseLeaveResetButton);
                            uploadNewImageTriggerEl.addEventListener('click', triggerInputFile);
                            imagePickerInputFileEl.addEventListener('change', getImage);
                            imagePickerInputFileEl.addEventListener('mouseenter', mouseEnterGetImage);
                            imagePickerInputFileEl.addEventListener('mouseleave', mouseLeaveGetImage);
                            profileImageDeleteButtonEl.addEventListener('click', deleteSelectedProfileImage);
                            profileImageDeleteButtonEl.addEventListener('mouseenter', mouseEnterResetButton);
                            profileImageDeleteButtonEl.addEventListener('mouseleave', mouseLeaveResetButton);
                        }
                        addEventListenersToOfflineProfile();
                    }

                    break;
                case 'onlineProfile':
                    settingsWindowRightSectionHtml = `
                        <div id="editProfileSection">
                            <div id="headerProfileSection">
                                <div id="profileName">
                                    <div id="name">Online profile </div>
                                    <div id="part">name</div>
                                </div>
                                <div id="profileLogo">
                                    <div id="logoBroken">
                                    </div>
                                </div>
                            </div>
                            <div id="bodyProfileSectionMessage">
                                <div class="notification">
                                    <h2 class="notification-title">Upcoming Feature Update</h2>
                                    <p class="notification-message">We would like to inform you that in a future update, you will be able to create an online profile. This feature will allow you to sync your bookmarks and settings across browsers using this extension.</p>
                                    <p class="notification-footer">Thank you for your continued support.</p>
                                </div>
                            </div>
                        </div>
                    `;
                    settingsWindowRightSectionEl.innerHTML = settingsWindowRightSectionHtml;

                    const createEffectUnderDevelopment = () => {
                        gsap.to('#part', {
                            duration: 4,
                            y: 15,
                            rotation: 45,
                            ease: 'bounce.out',
                            onComplete: () => {
                            }
                        });
                    }
                    createEffectUnderDevelopment();

                    break;
                case 'backgroundImage':
                    createRightPreviewHtml();
                    settingsWindowRightSectionHtml = `
                        <div id="backgroundImageSection">
                            <div id="imagePickerSection">
                                <label for="imagePickerInputTitle" id="imagePickerInputTitle">Choose Image:</label>
                                <div id="imagePickerInputFileSection">
                                    <input type="file" id="imagePickerInputFile" />
                                    <span id="imagePickerInputFileInfo">Select Image</span>
                                    <span id="imagePickerInputFileName"></span>
                                </div>
                            </div>
                            <div id="backgroundImageExampleSection">
                                <div id="backgroundImageExampleTitle">Select Background Image Position:</div>
                                <div id="exampleImagesSection">
                                    <div id="imagesSelection"></div>
                                </div>
                            </div>
                        </div>
                    `;
                    rightBodySectionEl.innerHTML = settingsWindowRightSectionHtml;
                    updateFolderStylePreview();

                    const createExampleImagesSectionButtons = () => {
                        const imagesSelectionEl = document.getElementById('imagesSelection');
                        let imagesSelectionHtml = ``;

                        backgroundImageExample.forEach(type => {
                            imagesSelectionHtml += `
                                <div id="exampleImage${capitalizeString(type.type)}" class="exampleImage" data-type="${type.type}">
                                    <img id="exampleImageImg${capitalizeString(type.type)}" class="exampleImageImg" src="${type.base64}" alt="${type.type}" data-type="${type.type}">
                                    <div id="exampleImageLabel${capitalizeString(type.type)}" class="exampleImageLabel" data-type="${type.type}">${type.title}</div>
                                </div>
                            `;
                        });
                        imagesSelectionEl.innerHTML = imagesSelectionHtml;
                    }
                    createExampleImagesSectionButtons();

                    const selectDefaultBackgroundPosition = (backgroundSize = '', datasetType = '') => {
                        const exampleImage = document.querySelectorAll(`.exampleImage`);
                        let type = '';
                        if (backgroundSize.length > 0) {
                            switch (backgroundSize) {
                                case 'auto auto':
                                    type = 'center';
                                    break;
                                case 'auto 100%':
                                    type = 'fill';
                                    break;
                                case '100% auto':
                                    type = 'fit';
                                    break;
                                case '100% 100%':
                                    type = 'stretch';
                                    break;
                                case 'auto':
                                    type = 'tile';
                                    break;
                                default:
                                    console.error('%c%s', '', 'Error to get backgroundSize');
                                    break;
                            }
                        }
                        exampleImage.forEach(el => {
                            if ((el.dataset.type === type) || (el.dataset.type === datasetType)) {
                                el.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                                el.style.color = editingMainUserSettings.windows.button.primary.font.color;
                            } else {
                                el.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                                el.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                            }
                        });
                    }
                    selectDefaultBackgroundPosition(editingDefaultUserFolderStyle.background.imageType.backgroundSize);

                    const updateFolderStyleBackgroundImageSettingsTitlesUI = () => {
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
                            imagePickerInputTitle: {
                                id: 'imagePickerInputTitle',
                                text: languageObject._defaultFolderStyle._backgroundImage.chooseAnImage,
                                classNames: []
                            },
                            imagePickerInputFileInfo: {
                                id: 'imagePickerInputFileInfo',
                                text: languageObject._defaultFolderStyle._backgroundImage.selectImage,
                                classNames: []
                            },
                            backgroundImageExampleTitle: {
                                id: 'backgroundImageExampleTitle',
                                text: languageObject._defaultFolderStyle._backgroundImage.setBackgroundImagePosition,
                                classNames: []
                            },
                            exampleImageLabelCenter: {
                                id: 'exampleImageLabelCenter',
                                text: languageObject._defaultFolderStyle._backgroundImage.center,
                                classNames: []
                            },
                            exampleImageLabelStretch: {
                                id: 'exampleImageLabelStretch',
                                text: languageObject._defaultFolderStyle._backgroundImage.stretch,
                                classNames: []
                            },
                            exampleImageLabelFit: {
                                id: 'exampleImageLabelFit',
                                text: languageObject._defaultFolderStyle._backgroundImage.fit,
                                classNames: []
                            },
                            exampleImageLabelFill: {
                                id: 'exampleImageLabelFill',
                                text: languageObject._defaultFolderStyle._backgroundImage.fill,
                                classNames: []
                            },
                            exampleImageLabelTile: {
                                id: 'exampleImageLabelTile',
                                text: languageObject._defaultFolderStyle._backgroundImage.tile,
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
                    updateFolderStyleBackgroundImageSettingsTitlesUI();

                    const eventListenerImageStyleEl = () => {
                        const imagePickerInputFileInfoEl = document.getElementById('imagePickerInputFileInfo');
                        const imagePickerInputEl = document.getElementById('imagePickerInputFile');
                        const imagePickerInputFileNameEl = document.getElementById('imagePickerInputFileName');
                        const exampleImage = document.querySelectorAll('.exampleImage');

                        imagePickerInputFileInfoEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        imagePickerInputFileInfoEl.style.color = editingMainUserSettings.windows.button.primary.font.color;
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
                            try {
                                const file = event.target.files[0];
                                if (!file) {
                                    throw new Error('No file selected.');
                                }
                                // Extracts the file name and extension, then truncates the file name if necessary.
                                if (file.name) {
                                    const [name, extension] = file.name.split(/\.(?=[^\.]+$)/);
                                    // Truncates the middle file name and appends the file extension.
                                    const fileName = `${truncateString(name, 27, 3)}.${extension}`;
                                    imagePickerInputFileNameEl.innerHTML = fileName;
                                }
                                // Creates a FileReader to read the selected image file.
                                const reader = new FileReader();
                                // Defines the onload event handler for the FileReader.
                                // This event is triggered when the FileReader has successfully read the file.
                                reader.onload = (e) => {
                                    // Extracts the MIME type from the result to verify the file type.
                                    const fileType = e.target.result.split(';')[0];
                                    // Checks if the file type is either PNG or JPEG. If not, logs a warning and exits the function.
                                    if (!/^data:image\/(png|jpeg)$/.test(fileType)) {
                                        console.warn("File is not a PNG or JPEG image.");
                                        showMessageToastify('error', ``, `File is not a PNG or JPEG image.`, 4000, false, 'bottom', 'right', true);
                                        return;
                                    }
                                    editingDefaultUserFolderStyle.background.backgroundType = 'image';
                                    editingDefaultUserFolderStyle.background.imageType.backgroundBase64 = e.target.result;
                                    updateFolderStylePreview();
                                };
                                // Initiates the read operation on the selected file as a Data URL (base64 encoded string).
                                reader.readAsDataURL(file);
                            } catch (error) {
                                console.error('%c%s', '', `Error reading file: ${error}`);
                            }
                        };
                        const changeBackgroundImagePosition = (el) => {
                            const type = el.target.dataset.type;
                            if (editingDefaultUserFolderStyle.background.backgroundType == 'image') {
                                switch (type) {
                                    case 'center':
                                        editingDefaultUserFolderStyle.background.imageType.backgroundPosition = 'center center';
                                        editingDefaultUserFolderStyle.background.imageType.backgroundSize = 'auto auto';
                                        editingDefaultUserFolderStyle.background.imageType.backgroundRepeat = 'no-repeat';
                                        break;
                                    case 'fill':
                                        editingDefaultUserFolderStyle.background.imageType.backgroundPosition = 'center center';
                                        editingDefaultUserFolderStyle.background.imageType.backgroundSize = 'auto 100%';
                                        editingDefaultUserFolderStyle.background.imageType.backgroundRepeat = 'no-repeat';
                                        break;
                                    case 'fit':
                                        editingDefaultUserFolderStyle.background.imageType.backgroundPosition = 'center center';
                                        editingDefaultUserFolderStyle.background.imageType.backgroundSize = '100% auto';
                                        editingDefaultUserFolderStyle.background.imageType.backgroundRepeat = 'no-repeat';
                                        break;
                                    case 'stretch':
                                        editingDefaultUserFolderStyle.background.imageType.backgroundPosition = 'center center';
                                        editingDefaultUserFolderStyle.background.imageType.backgroundSize = '100% 100%';
                                        editingDefaultUserFolderStyle.background.imageType.backgroundRepeat = 'no-repeat';
                                        break;
                                    case 'tile':
                                        editingDefaultUserFolderStyle.background.imageType.backgroundPosition = 'left top';
                                        editingDefaultUserFolderStyle.background.imageType.backgroundSize = 'auto';
                                        editingDefaultUserFolderStyle.background.imageType.backgroundRepeat = 'repeat';
                                        break;
                                }
                                selectDefaultBackgroundPosition(editingDefaultUserFolderStyle.background.imageType.backgroundSize, type);
                                updateFolderStylePreview();
                            }
                        }
                        imagePickerInputEl.addEventListener('change', getImage);
                        imagePickerInputEl.addEventListener('mouseenter', () => {
                            imagePickerInputFileInfoEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                        });
                        imagePickerInputEl.addEventListener('mouseleave', () => {
                            imagePickerInputFileInfoEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        });
                        exampleImage.forEach(button => {
                            button.addEventListener('click', changeBackgroundImagePosition);
                            button.addEventListener('mouseenter', () => {
                                selectDefaultBackgroundPosition(editingDefaultUserFolderStyle.background.imageType.backgroundSize, button.dataset.type);
                            });
                            button.addEventListener('mouseleave', () => {
                                selectDefaultBackgroundPosition(editingDefaultUserFolderStyle.background.imageType.backgroundSize, '');
                            });
                        });
                    }
                    eventListenerImageStyleEl();
                    break;
                case 'backgroundColor':
                    createRightPreviewHtml();
                    let arrayOfGradientBackgroundColor = [];
                    let updateColor = '';
                    settingsWindowRightSectionHtml = `
                    <div id="backgroundColorSection">
                        <div id="colorPickerSection">
                            <div id="colorPicker">
                                <label for="colorPickerInputTitle" id="colorPickerInputTitle">Choose Color:</label>
                                <input type="text" id="colorPickerInput" data-coloris="" readonly="readonly">
                            </div>
                            <div id="addColorButton">
                                <button id="addColor"></button>
                                <button id="addRandomColor"></button>
                            </div>
                        </div>
                        <div id="colorArrayAndDirectionSection">
                            <div id="colorArraySection"></div>
                            <div id="gradientDirectionSection">
                                <label for="colorRotationInput" id="colorRotationInputTitle">Define Rotation Angle:</label>
                                <div id="colorRotationInputSection">
                                    <input type="text" id="colorRotationInput" class="colorRotationInputDial" value="0">
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                    rightBodySectionEl.innerHTML = settingsWindowRightSectionHtml;
                    updateFolderStylePreview();

                    const updateBackgroundColorSettingsTitlesUI = () => {
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
                            colorPickerInputTitle: {
                                id: 'colorPickerInputTitle',
                                text: languageObject._defaultFolderStyle._backgroundColor.chooseColor,
                                classNames: []
                            },
                            colorRotationInputTitle: {
                                id: 'colorRotationInputTitle',
                                text: languageObject._defaultFolderStyle._backgroundColor.defineRotationAngle,
                                classNames: []
                            }
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
                    updateBackgroundColorSettingsTitlesUI();

                    const updateDefaultFolderBackgroundColorToUI = () => {
                        const colorPickerInputEl = document.getElementById('colorPickerInput');
                        const colorRotationInputEl = $(".colorRotationInputDial");
                        switch (editingDefaultUserFolderStyle.background.backgroundType) {
                            case 'image':
                                break;
                            case 'color':
                                arrayOfGradientBackgroundColor.push(editingDefaultUserFolderStyle.background.colorType.backgroundColor);
                                break;
                            case 'gradient':
                                arrayOfGradientBackgroundColor = editingDefaultUserFolderStyle.background.gradientType.backgroundColorArray;
                                colorPickerInputEl.value = arrayOfGradientBackgroundColor[0];
                                break;
                            default:
                                console.error('%c%s', '', 'No background type selected.');
                                break;
                        }
                        colorRotationInputEl.val(Number(editingDefaultUserFolderStyle.background.gradientType.angle)).trigger('change');
                        updateColorisInputValue('colorPickerInput', getRandomColor(), false, editingMainUserSettings.windows.window.backgroundColor);
                        colorPickerInputEl.style.border = `1px solid ${invertHexColor(userProfileExport.mainUserSettings.windows.window.backgroundColor)}`;
                        addEventListenerToColorPicker('add');
                        updateColorPickerButtonIcon('add');
                        createListOfColors();
                        addEventListenerToColorRotationInput();
                    }

                    const updateColorPickerButtonIcon = (status) => {
                        const addColorEl = document.getElementById('addColor');
                        addColorEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        addColorEl.style.display = 'none';
                        if (status == 'add') {
                            addColorEl.style.display = 'flex';
                            addColorEl.innerHTML = `
                            <svg width="30px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path stroke="${editingMainUserSettings.windows.button.primary.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M8 12H12M12 12H16M12 12V16M12 12V8M4 16.8002V7.2002C4 6.08009 4 5.51962 4.21799 5.0918C4.40973 4.71547 4.71547 4.40973 5.0918 4.21799C5.51962 4 6.08009 4 7.2002 4H16.8002C17.9203 4 18.4801 4 18.9079 4.21799C19.2842 4.40973 19.5905 4.71547 19.7822 5.0918C20.0002 5.51962 20.0002 6.07967 20.0002 7.19978V16.7998C20.0002 17.9199 20.0002 18.48 19.7822 18.9078C19.5905 19.2841 19.2842 19.5905 18.9079 19.7822C18.4805 20 17.9215 20 16.8036 20H7.19691C6.07899 20 5.5192 20 5.0918 19.7822C4.71547 19.5905 4.40973 19.2842 4.21799 18.9079C4 18.4801 4 17.9203 4 16.8002Z"/>
                            </svg>
                        `;
                        }
                        if (status == 'update') {
                            addColorEl.style.display = 'flex';
                            addColorEl.innerHTML = `
                            <svg width="30px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="3" width="18" height="18" rx="2" stroke="${editingMainUserSettings.windows.button.primary.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M7 13L10 16L17 9" stroke="${editingMainUserSettings.windows.button.primary.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        `;
                        }
                    }

                    const addEventListenerToColorPicker = () => {
                        const colorPickerInputEl = document.getElementById('colorPickerInput');
                        const addColorEl = document.getElementById('addColor');
                        const addRandomColorEl = document.getElementById('addRandomColor');
                        const addIconToRandomColorEl = () => {
                            addRandomColorEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                            addRandomColorEl.innerHTML = `<svg fill="${editingMainUserSettings.windows.button.primary.font.color}" width="30px" height="25px" viewBox="0 -4 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m24.983 8.539v-2.485h-4.902l-3.672 5.945-2.099 3.414-3.24 5.256c-.326.51-.889.844-1.53.845h-9.54v-3.568h8.538l3.673-5.946 2.099-3.414 3.24-5.256c.325-.509.886-.843 1.525-.845h5.904v-2.485l7.417 4.27-7.417 4.27z"/><path d="m12.902 6.316-.63 1.022-1.468 2.39-2.265-3.675h-8.538v-3.568h9.54c.641.001 1.204.335 1.526.838l.004.007 1.836 2.985z"/><path d="m24.983 24v-2.485h-5.904c-.639-.002-1.201-.336-1.521-.838l-.004-.007-1.836-2.985.63-1.022 1.468-2.39 2.264 3.675h4.902v-2.485l7.417 4.27-7.417 4.27z"/></svg>`;
                        }
                        addIconToRandomColorEl();
                        // Updates the background color in newUserBookmarkStyle and the UI.
                        const getColor = () => {
                            colorPickerInputEl.style.backgroundColor = colorPickerInputEl.value;
                            colorPickerInputEl.style.color = checkIfColorBrightness(colorPickerInputEl.value, 120) ? '#000000' : '#ffffff';
                            if (arrayOfGradientBackgroundColor.length >= 10) {
                                updateColorPickerButtonIcon('');
                                return;
                            }
                            if (!arrayOfGradientBackgroundColor.includes(colorPickerInputEl.value) && updateColor == '') {
                                updateColorPickerButtonIcon('add');
                            }
                            if (arrayOfGradientBackgroundColor.includes(colorPickerInputEl.value) && updateColor != '') {
                                updateColorPickerButtonIcon('update');
                            }
                        };

                        const pushColorToArray = () => {
                            if (updateColor != '') {
                                let index = arrayOfGradientBackgroundColor.findIndex(e => e == updateColor);
                                arrayOfGradientBackgroundColor[index] = colorPickerInputEl.value;
                                updateColor = '';
                            }
                            if (!arrayOfGradientBackgroundColor.includes(colorPickerInputEl.value) && arrayOfGradientBackgroundColor.length < 10 && updateColor == '') {
                                arrayOfGradientBackgroundColor.push(colorPickerInputEl.value);
                                editingDefaultUserFolderStyle.background.gradientType.backgroundColorArray = arrayOfGradientBackgroundColor;
                                editingDefaultUserFolderStyle.background.backgroundType = 'gradient';
                                updateFolderStylePreview();
                            }
                            updateColorPickerButtonIcon('');
                            createListOfColors();
                        }

                        const mouseEnterPushColorToArray = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                        }

                        const mouseLeavePushColorToArray = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        }

                        const createRandomColor = () => {
                            const randomHexColor = getRandomColor();
                            colorPickerInputEl.value = randomHexColor;
                            colorPickerInputEl.style.backgroundColor = randomHexColor;
                            colorPickerInputEl.style.color = checkIfColorBrightness(randomHexColor, 120) ? '#000000' : '#ffffff';
                            updateColorPickerButtonIcon('add');
                        }

                        const mouseEnterCreateRandomColor = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                        }

                        const mouseLeaveCreateRandomColor = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        }

                        colorPickerInputEl.removeEventListener('input', getColor);
                        colorPickerInputEl.addEventListener('input', getColor);
                        addColorEl.addEventListener('click', pushColorToArray);
                        addColorEl.addEventListener('mouseenter', mouseEnterPushColorToArray);
                        addColorEl.addEventListener('mouseleave', mouseLeavePushColorToArray);
                        addRandomColorEl.addEventListener('click', createRandomColor);
                        addRandomColorEl.addEventListener('mouseenter', mouseEnterCreateRandomColor);
                        addRandomColorEl.addEventListener('mouseleave', mouseLeaveCreateRandomColor);
                    }
                    const addEventListenerToUpdateColorHex = () => {
                        const colorEl = document.querySelectorAll('.color');
                        const updateSelectedColor = (el) => {
                            updateColor = el.target.dataset.hex;
                            updateColorisInputValue('colorPickerInput', updateColor, false, editingMainUserSettings.windows.window.backgroundColor);
                            updateColorPickerButtonIcon('update');
                        }
                        if (colorEl) {
                            colorEl.forEach(el => {
                                el.removeEventListener('click', updateSelectedColor);
                            });
                        }
                        if (colorEl) {
                            colorEl.forEach(el => {
                                el.addEventListener('click', updateSelectedColor);
                            });
                        }
                    }
                    const addEventListenerToMoveColorInArray = () => {
                        const moveUpEl = document.querySelectorAll('.moveUp');
                        const moveDownEl = document.querySelectorAll('.moveDown');
                        const moveColorUp = (el) => {
                            el.preventDefault();
                            if (el.target.dataset.index == 0) { return };
                            const hex = el.target.dataset.hex;
                            const index = arrayOfGradientBackgroundColor.findIndex(i => i == hex);
                            arrayOfGradientBackgroundColor = moveElementsInArray(arrayOfGradientBackgroundColor, index, index - 1);
                            editingDefaultUserFolderStyle.background.gradientType.backgroundColorArray = arrayOfGradientBackgroundColor;
                            createListOfColors();
                            updateFolderStylePreview();
                        }
                        const moveColorDown = (el) => {
                            el.preventDefault();
                            if (el.target.dataset.index == arrayOfGradientBackgroundColor.length - 1) { return };
                            const hex = el.target.dataset.hex;
                            const index = arrayOfGradientBackgroundColor.findIndex(i => i == hex);
                            arrayOfGradientBackgroundColor = moveElementsInArray(arrayOfGradientBackgroundColor, index, index + 1);
                            editingDefaultUserFolderStyle.background.gradientType.backgroundColorArray = arrayOfGradientBackgroundColor;
                            createListOfColors();
                            updateFolderStylePreview();
                        }
                        if (moveUpEl) {
                            moveUpEl.forEach(el => {
                                el.removeEventListener('click', moveColorUp);
                            });
                        }
                        if (moveDownEl) {
                            moveDownEl.forEach(el => {
                                el.removeEventListener('click', moveColorDown);
                            });
                        }
                        if (moveUpEl) {
                            moveUpEl.forEach(el => {
                                el.addEventListener('click', moveColorUp);
                            });
                        }
                        if (moveDownEl) {
                            moveDownEl.forEach(el => {
                                el.addEventListener('click', moveColorDown);
                            });
                        }
                    }
                    const addEventListenerToDeleteColorFromArray = () => {
                        const deleteEl = document.querySelectorAll('.delete');
                        const removeColor = (el) => {
                            if (editingDefaultUserFolderStyle.background.imageType.backgroundBase64 == '' && arrayOfGradientBackgroundColor.length <= 1) {
                                editingDefaultUserFolderStyle.background.backgroundType = 'color';
                            }
                            if (arrayOfGradientBackgroundColor.length <= 1 && editingDefaultUserFolderStyle.background.backgroundType != 'image') {
                                showMessageToastify('error', ``, `You can't delete last color`, 4000, false, 'bottom', 'right', true);
                                return;
                            }
                            arrayOfGradientBackgroundColor = arrayOfGradientBackgroundColor.filter(e => e !== el.target.dataset.hex);
                            editingDefaultUserFolderStyle.background.gradientType.backgroundColorArray = arrayOfGradientBackgroundColor;
                            createListOfColors();
                            updateColorPickerButtonIcon('add');
                            updateFolderStylePreview();
                        }
                        if (deleteEl) {
                            deleteEl.forEach(el => {
                                el.removeEventListener('click', removeColor);
                            });
                        }
                        if (deleteEl) {
                            deleteEl.forEach(el => {
                                el.addEventListener('click', removeColor);
                            });
                        }
                    }
                    const addEventListenerToColorRotationInput = () => {
                        const colorRotationInputEl = $(".colorRotationInputDial");
                        colorRotationInputEl.knob({
                            'min': 0,
                            'max': 180,
                            'width': 70,
                            'height': 70,
                            'step': 1,
                            'displayPrevious': true,
                            'displayInput': true,
                            'fgColor': "#00177c",
                            'inputColor': "hsl(100, 100%, 25%)",
                            'bgColor': "hsl(100, 100%, 25%)",
                            'release': (value) => {
                                editingDefaultUserFolderStyle.background.gradientType.angle = value;
                                updateFolderStylePreview();
                            },
                            'format': (value) => { return value + '°'; },
                            'change': (value) => {
                                let percentage = value / 360;
                                let newBgColor = `hsl(100, 100%, ${70 - (percentage * 50)}%)`;
                                colorRotationInputEl.trigger(
                                    'configure', {
                                    'bgColor': newBgColor,
                                }
                                );
                            }
                        });
                    }

                    const createListOfColors = () => {
                        const createColorList = () => {
                            const colorArraySectionEl = document.getElementById('colorArraySection');
                            let html = '';
                            arrayOfGradientBackgroundColor.forEach((color, index) => {
                                html += `
                                <div class="colorArray" style="border: 1px solid ${invertHexColor(editingMainUserSettings.windows.window.backgroundColor)};background-color: ${index % 2 ? colorPalette[0] : colorPalette[2]}">
                                    <div class="color" style="background-color: ${color};" data-hex="${color}" data-index="${index}"></div>
                                    <div class="move">
                                        <button class="moveUp" data-hex="${color}" style="background-color: ${editingMainUserSettings.windows.button.secondary.backgroundColor}">
                                            <svg style="pointer-events: none;" width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 17V7M12 7L8 11M12 7L16 11" stroke="${editingMainUserSettings.windows.button.secondary.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            </svg>
                                        </button>
                                        <button class="moveDown" data-hex="${color}" style="background-color: ${editingMainUserSettings.windows.button.secondary.backgroundColor}">
                                            <svg style="pointer-events: none;" width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 7V17M12 17L16 13M12 17L8 13" stroke="${editingMainUserSettings.windows.button.secondary.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            </svg>
                                        </button>
                                    </div>
                                    <button class="delete" style="background-color: ${editingMainUserSettings.windows.button.danger.backgroundColor}" data-hex="${color}">
                                        <svg style="pointer-events: none;" width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4 6H20L18.4199 20.2209C18.3074 21.2337 17.4512 22 16.4321 22H7.56786C6.54876 22 5.69264 21.2337 5.5801 20.2209L4 6Z" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M7.34491 3.14716C7.67506 2.44685 8.37973 2 9.15396 2H14.846C15.6203 2 16.3249 2.44685 16.6551 3.14716L18 6H6L7.34491 3.14716Z" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M2 6H22" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M10 11V16" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M14 11V16" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </button>
                                </div>
                            `;
                            });
                            colorArraySectionEl.innerHTML = html;
                        }
                        const createColor = () => {
                            editingDefaultUserFolderStyle.background.backgroundType = 'color';
                            editingDefaultUserFolderStyle.background.colorType.backgroundColor = `${arrayOfGradientBackgroundColor[0]}`;
                            updateFolderStylePreview();
                        }
                        createColorList();
                        if (arrayOfGradientBackgroundColor.length == 0) {
                            return;
                        } else if (arrayOfGradientBackgroundColor.length == 1) {
                            createColor();
                        } else if (arrayOfGradientBackgroundColor.length > 1) {
                        }
                        addEventListenerToUpdateColorHex();
                        addEventListenerToMoveColorInArray();
                        addEventListenerToDeleteColorFromArray();
                    }
                    updateDefaultFolderBackgroundColorToUI();
                    break;
                case 'bookmarksSize':
                    createRightPreviewHtml();
                    settingsWindowRightSectionHtml = `
                    <div id="bookmarkSizeSection">
                        <div id="gridAutoFlowSection">
                            <label for="gridAutoFlow" id="gridAutoFlowTitle">Grid Flow Control:</label>
                            <div id="gridAutoFlowButtons">
                                <button id="gridAutoFlowRow" class="gridAutoFlow" data-flow="row">Row</button>
                                <button id="gridAutoFlowColumn" class="gridAutoFlow" data-flow="column">Column</button>
                            </div>
                            <div id="gridAutoFlowStatus">
                                <div id="gridAutoFlowStatusDirection"></div>
                                <div id="gridAutoFlowStatusExplanation"></div>
                            </div>
                        </div>
                        <div id="widthSizeSection">
                            <label for="widthSizeRangeInput" id="widthSizeRangeInputTitle">Width:</label>
                            <input type="range" id="widthSizeRangeInput" min="100" max="200" step="1" value="200">
                            <div id="widthSizeRangeInputOutput">
                                <output id="widthSizeRangeInputValue">0</output>
                            </div>
                        </div>
                        <div id="heightSizeSection">
                            <label for="heightSizeRangeInput" id="heightSizeRangeInputTitle">Height:</label>
                            <input type="range" id="heightSizeRangeInput" min="100" max="200" step="1" value="200">
                            <div id="heightSizeRangeInputOutput">
                                <output id="heightSizeRangeInputValue">0</output>
                            </div>
                        </div>
                    </div>
                `;
                    rightBodySectionEl.innerHTML = settingsWindowRightSectionHtml;
                    updateFolderStylePreview();

                    const updateBookmarkSizeSettingsTitlesUI = () => {
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
                            gridAutoFlowTitle: {
                                id: 'gridAutoFlowTitle',
                                text: languageObject._defaultFolderStyle._bookmarksSize.gridFlowControl,
                                classNames: []
                            },
                            gridAutoFlowRow: {
                                id: 'gridAutoFlowRow',
                                text: languageObject._defaultFolderStyle._bookmarksSize._gridButtons.row,
                                classNames: []
                            },
                            gridAutoFlowColumn: {
                                id: 'gridAutoFlowColumn',
                                text: languageObject._defaultFolderStyle._bookmarksSize._gridButtons.column,
                                classNames: []
                            },
                            widthSizeRangeInputTitle: {
                                id: 'widthSizeRangeInputTitle',
                                text: languageObject._defaultFolderStyle._bookmarksSize.width,
                                classNames: []
                            },
                            heightSizeRangeInputTitle: {
                                id: 'heightSizeRangeInputTitle',
                                text: languageObject._defaultFolderStyle._bookmarksSize.height,
                                classNames: []
                            }
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
                    updateBookmarkSizeSettingsTitlesUI();

                    const setGridAutoFlowStatusUIText = () => {
                        const gridAutoFlowStatusDirectionEl = document.getElementById('gridAutoFlowStatusDirection');
                        const gridAutoFlowStatusExplanationEl = document.getElementById('gridAutoFlowStatusExplanation');
                        if (editingDefaultUserFolderStyle.grid.gridAutoFlow === 'row') {
                            gridAutoFlowStatusDirectionEl.innerText = languageObject._defaultFolderStyle._bookmarksSize._gridAutoFlowStatusDirection.row;
                            gridAutoFlowStatusExplanationEl.innerText = languageObject._defaultFolderStyle._bookmarksSize._gridAutoFlowStatusExplanation.row;
                        } else {
                            gridAutoFlowStatusDirectionEl.innerText = languageObject._defaultFolderStyle._bookmarksSize._gridAutoFlowStatusDirection.column;
                            gridAutoFlowStatusExplanationEl.innerText = languageObject._defaultFolderStyle._bookmarksSize._gridAutoFlowStatusExplanation.column;
                        }
                    }

                    const updateDefaultSettingsBookmarkSizeUI = () => {
                        const gridAutoFlow = document.querySelectorAll('.gridAutoFlow');
                        setGridAutoFlowStatusUIText();
                        gridAutoFlow.forEach(button => {
                            if (button.dataset.flow === editingDefaultUserFolderStyle.grid.gridAutoFlow) {
                                button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                            } else {
                                button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.hoverBackgroundColor;
                            }
                            button.style.color = userProfileExport.mainUserSettings.windows.button.primary.font.color;
                        });
                        updateInputRangeAndOutput('widthSizeRangeInput', 'widthSizeRangeInputValue', editingDefaultUserFolderStyle.bookmarksBox.width);
                        updateInputRangeAndOutput('heightSizeRangeInput', 'heightSizeRangeInputValue', editingDefaultUserFolderStyle.bookmarksBox.height);
                    }
                    updateDefaultSettingsBookmarkSizeUI();

                    const addEventListenersToBookmarkSizeSection = () => {
                        const gridAutoFlowEl = document.querySelectorAll('.gridAutoFlow');
                        const widthSizeRangeInputEl = document.getElementById('widthSizeRangeInput');
                        const heightSizeRangeInputEl = document.getElementById('heightSizeRangeInput');

                        const changeGridAutoFlow = (el) => {
                            const gridAutoFlow = el.target.dataset.flow;
                            editingDefaultUserFolderStyle.grid.gridAutoFlow = gridAutoFlow;
                            setGridAutoFlowStatusUIText();
                            updateFolderStylePreview();
                        }
                        const updateWidthSize = () => {
                            let widthValue = widthSizeRangeInputEl.value;
                            editingDefaultUserFolderStyle.bookmarksBox.width = `${widthValue}px`;
                            updateInputRangeAndOutput('widthSizeRangeInput', 'widthSizeRangeInputValue', widthValue);
                            updateFolderStylePreview();
                        }
                        const updateHeightSize = () => {
                            let heightValue = heightSizeRangeInputEl.value;
                            editingDefaultUserFolderStyle.bookmarksBox.height = `${heightValue}px`;
                            updateInputRangeAndOutput('heightSizeRangeInput', 'heightSizeRangeInputValue', heightValue);
                            updateFolderStylePreview();
                        }
                        gridAutoFlowEl.forEach(button => {
                            button.addEventListener('click', changeGridAutoFlow);
                            button.addEventListener('mouseenter', () => {
                                button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                            });
                            button.addEventListener('mouseleave', () => {
                                if (button.dataset.flow === editingDefaultUserFolderStyle.grid.gridAutoFlow) {
                                    button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                                } else {
                                    button.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.hoverBackgroundColor;
                                }
                            });
                        });
                        widthSizeRangeInputEl.addEventListener('input', updateWidthSize);
                        heightSizeRangeInputEl.addEventListener('input', updateHeightSize);
                    }
                    addEventListenersToBookmarkSizeSection();

                    break;
                case 'navigationBarSymbol':
                    createRightPreviewHtml();
                    settingsWindowRightSectionHtml = `
                        <div id="addressBarSymbolSection">
                            <div id="symbolColorPickerSection">
                                <label for="symbolColorPickerInputTitle" id="symbolColorPickerInputTitle"></label>
                                <div id="inputAndAddRandomColorButton">
                                    <input type="text" id="symbolColorPickerInput" data-coloris="" readonly="readonly">
                                    <div id="addRandomColorButton">
                                        <button id="addRandomColor">
                                            <svg fill="${editingMainUserSettings.windows.button.primary.font.color}" width="30px" height="25px" viewBox="0 -4 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m24.983 8.539v-2.485h-4.902l-3.672 5.945-2.099 3.414-3.24 5.256c-.326.51-.889.844-1.53.845h-9.54v-3.568h8.538l3.673-5.946 2.099-3.414 3.24-5.256c.325-.509.886-.843 1.525-.845h5.904v-2.485l7.417 4.27-7.417 4.27z"/><path d="m12.902 6.316-.63 1.022-1.468 2.39-2.265-3.675h-8.538v-3.568h9.54c.641.001 1.204.335 1.526.838l.004.007 1.836 2.985z"/><path d="m24.983 24v-2.485h-5.904c-.639-.002-1.201-.336-1.521-.838l-.004-.007-1.836-2.985.63-1.022 1.468-2.39 2.264 3.675h4.902v-2.485l7.417 4.27-7.417 4.27z"/></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div id="addressBarSymbolSizeSection">
                                <label for="symbolSizeRangeInput" id="symbolSizeRangeInputTitle"></label>
                                <input type="range" id="symbolSizeRangeInput" min="10" max="30" step="1" value="20">
                                <div id="symbolSizeRangeInputOutput">
                                    <output id="symbolSizeRangeInputValue">0</output>
                                </div>
                            </div>
                            <div id="addressBarSymbolTypeSection">
                                <label for="addressBarSymbolTypeButtons" id="symbolTypeTitle"></label>
                                <div id="addressBarSymbolTypeButtons"></div>
                            </div>
                        </div>
                    `;
                    rightBodySectionEl.innerHTML = settingsWindowRightSectionHtml;
                    updateFolderStylePreview();

                    const createNavigationBarSymbolTypeButtons = () => {
                        let addressBarSymbolTypeButtonsEl = document.getElementById('addressBarSymbolTypeButtons');
                        let symbolsHtml = ``;
                        symbolArray.forEach(e => {
                            symbolsHtml += `<button data-symbol=${e}>${e}</button>`;
                        });
                        addressBarSymbolTypeButtonsEl.innerHTML = symbolsHtml;
                    }
                    createNavigationBarSymbolTypeButtons();

                    const updateNavigationBarSymbolSettingsTitlesUI = () => {
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
                            symbolColorPickerInputTitle: {
                                id: 'symbolColorPickerInputTitle',
                                text: languageObject._navigationBarStyle._navigationBarSymbol.chooseColor,
                                classNames: []
                            },
                            symbolSizeRangeInputTitle: {
                                id: 'symbolSizeRangeInputTitle',
                                text: languageObject._navigationBarStyle._navigationBarSymbol.chooseSize,
                                classNames: []
                            },
                            symbolTypeTitle: {
                                id: 'symbolTypeTitle',
                                text: languageObject._navigationBarStyle._navigationBarSymbol.chooseSymbol,
                                classNames: []
                            }
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
                    updateNavigationBarSymbolSettingsTitlesUI();

                    const updateDefaultStylesInNavigationBarSymbol = () => {
                        const addRandomColorEl = document.getElementById('addRandomColor');
                        const addressBarSymbolTypeButtonsEl = document.getElementById('addressBarSymbolTypeButtons');
                        const addressBarSymbolTypeButtons = document.querySelectorAll('#addressBarSymbolTypeButtons button');

                        addRandomColorEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        addRandomColorEl.style.border = `1px solid ${checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff'}`;
                        addressBarSymbolTypeButtonsEl.style.backgroundColor = colorPalette[1];
                        updateColorisInputValue('symbolColorPickerInput', editingDefaultUserFolderStyle.addressBar.icon.color, false, editingMainUserSettings.windows.window.backgroundColor);
                        updateInputRangeAndOutput('symbolSizeRangeInput', 'symbolSizeRangeInputValue', editingDefaultUserFolderStyle.addressBar.icon.fontSize);
                        addressBarSymbolTypeButtons.forEach(button => {
                            if (button.dataset.symbol == editingDefaultUserFolderStyle.addressBar.icon.content) {
                                button.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                                button.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                            } else {
                                button.style.backgroundColor = editingMainUserSettings.windows.button.info.backgroundColor;
                                button.style.color = editingMainUserSettings.windows.button.info.font.color;
                            }
                        });
                    }
                    updateDefaultStylesInNavigationBarSymbol();

                    const addEventListenersToNavigationBarSymbolSection = () => {
                        const symbolColorPickerInputEl = document.getElementById('symbolColorPickerInput');
                        const addRandomColorEl = document.getElementById('addRandomColor');
                        const symbolSizeRangeInputEl = document.getElementById('symbolSizeRangeInput');
                        const addressBarSymbolTypeButtons = document.querySelectorAll('#addressBarSymbolTypeButtons button');

                        const changeSymbolColor = () => {
                            const symbolColor = symbolColorPickerInputEl.value;
                            symbolColorPickerInputEl.style.backgroundColor = symbolColor;
                            symbolColorPickerInputEl.style.color = checkIfColorBrightness(symbolColor, 120) ? '#000000' : '#ffffff';
                            editingDefaultUserFolderStyle.addressBar.icon.color = symbolColor;
                            updateFolderStylePreview();
                        }

                        const createRandomColor = () => {
                            const randomHexColor = getRandomColor();
                            symbolColorPickerInputEl.value = randomHexColor;
                            symbolColorPickerInputEl.style.backgroundColor = randomHexColor;
                            symbolColorPickerInputEl.style.color = checkIfColorBrightness(randomHexColor, 120) ? '#000000' : '#ffffff';
                            editingDefaultUserFolderStyle.addressBar.icon.color = randomHexColor;
                            updateFolderStylePreview();
                        }

                        const mouseEnterCreateRandomColor = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                        }

                        const mouseLeaveCreateRandomColor = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        }

                        const updateSymbolSize = () => {
                            let symbolSizeValue = symbolSizeRangeInputEl.value;
                            editingDefaultUserFolderStyle.addressBar.icon.fontSize = symbolSizeValue;
                            updateInputRangeAndOutput('symbolSizeRangeInput', 'symbolSizeRangeInputValue', symbolSizeValue);
                            updateFolderStylePreview();
                        }

                        const changeSymbolType = (el) => {
                            const symbolType = el.target.dataset.symbol;
                            editingDefaultUserFolderStyle.addressBar.icon.content = symbolType;
                            addressBarSymbolTypeButtons.forEach(button => {
                                if (button.dataset.symbol == editingDefaultUserFolderStyle.addressBar.icon.content) {
                                    button.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                                    button.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                                } else {
                                    button.style.backgroundColor = editingMainUserSettings.windows.button.info.backgroundColor;
                                    button.style.color = editingMainUserSettings.windows.button.info.font.color;
                                }
                            });
                            updateFolderStylePreview();
                        }

                        symbolColorPickerInputEl.addEventListener('input', changeSymbolColor);
                        addRandomColorEl.addEventListener('click', createRandomColor);
                        addRandomColorEl.addEventListener('mouseenter', mouseEnterCreateRandomColor);
                        addRandomColorEl.addEventListener('mouseleave', mouseLeaveCreateRandomColor);
                        symbolSizeRangeInputEl.addEventListener('input', updateSymbolSize);
                        addressBarSymbolTypeButtons.forEach(button => {
                            button.addEventListener('click', changeSymbolType);
                            button.addEventListener('mouseenter', () => {
                                button.style.backgroundColor = editingMainUserSettings.windows.button.info.hoverBackgroundColor;
                            });
                            button.addEventListener('mouseleave', () => {
                                if (button.dataset.symbol === editingDefaultUserFolderStyle.addressBar.icon.content) {
                                    button.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                                    button.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                                } else {
                                    button.style.backgroundColor = editingMainUserSettings.windows.button.info.backgroundColor;
                                    button.style.color = editingMainUserSettings.windows.button.info.font.color;
                                }
                            });
                        });
                    }
                    addEventListenersToNavigationBarSymbolSection();
                    break;
                case 'navigationBarBackgroundColor':
                    createRightPreviewHtml();
                    settingsWindowRightSectionHtml = `
                    <div id="addressBarBackgroundColorSection">
                        <div id="backgroundColorPickerSection">
                            <label for="backgroundColorPickerInputTitle" id="backgroundColorPickerInputTitle">Choose Background Color:</label>
                            <div id="backgroundColorPickerInputSection">
                                <input type="text" id="backgroundColorPickerInput" data-coloris="" readonly="readonly">
                                <button id="addRandomColor"></button>
                            </div>
                        </div>
                    </div>
                `;
                    rightBodySectionEl.innerHTML = settingsWindowRightSectionHtml;
                    updateFolderStylePreview();

                    const addIconToRandomColorEl = () => {
                        const addRandomColorEl = document.getElementById('addRandomColor');
                        addRandomColorEl.style.border = `1px solid ${checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff'}`;
                        addRandomColorEl.innerHTML = `<svg fill="${editingMainUserSettings.windows.button.primary.font.color}" width="25px" height="25px" viewBox="0 -4 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m24.983 8.539v-2.485h-4.902l-3.672 5.945-2.099 3.414-3.24 5.256c-.326.51-.889.844-1.53.845h-9.54v-3.568h8.538l3.673-5.946 2.099-3.414 3.24-5.256c.325-.509.886-.843 1.525-.845h5.904v-2.485l7.417 4.27-7.417 4.27z"/><path d="m12.902 6.316-.63 1.022-1.468 2.39-2.265-3.675h-8.538v-3.568h9.54c.641.001 1.204.335 1.526.838l.004.007 1.836 2.985z"/><path d="m24.983 24v-2.485h-5.904c-.639-.002-1.201-.336-1.521-.838l-.004-.007-1.836-2.985.63-1.022 1.468-2.39 2.264 3.675h4.902v-2.485l7.417 4.27-7.417 4.27z"/></svg>`
                    }
                    addIconToRandomColorEl();

                    const updateNavigationBarBackgroundColorSettingsTitlesUI = () => {
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
                            backgroundColorPickerInputTitle: {
                                id: 'backgroundColorPickerInputTitle',
                                text: languageObject._navigationBarStyle._navigationBarBackgroundColor.chooseColor,
                                classNames: []
                            }
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
                    updateNavigationBarBackgroundColorSettingsTitlesUI();

                    const updateDefaultSettingsNavigationBarBackgroundColorUI = () => {
                        const addRandomColorEl = document.getElementById('addRandomColor');
                        addRandomColorEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        updateColorisInputValue('backgroundColorPickerInput', editingDefaultUserFolderStyle.addressBar.background.backgroundColor, true, editingMainUserSettings.windows.window.backgroundColor);
                    }
                    updateDefaultSettingsNavigationBarBackgroundColorUI();

                    const addEventListenersToAddressBarBackgroundColorSection = () => {
                        const backgroundColorPickerInputEl = document.getElementById('backgroundColorPickerInput');
                        const addRandomColorEl = document.getElementById('addRandomColor');
                        const changeBackgroundColor = () => {
                            const backgroundColor = backgroundColorPickerInputEl.value;
                            backgroundColorPickerInputEl.style.backgroundColor = backgroundColor.slice(0, 7);
                            backgroundColorPickerInputEl.style.color = checkIfColorBrightness(backgroundColor.slice(0, 7)) ? '#000000' : '#ffffff';
                            editingDefaultUserFolderStyle.addressBar.background.backgroundType = 'color';
                            editingDefaultUserFolderStyle.addressBar.background.backgroundColor = backgroundColor;
                            updateFolderStylePreview();
                        }
                        const getRandomNavigationBarBackgroundColor = () => {
                            updateColorisInputValue('backgroundColorPickerInput', getRandomColor(true), true, editingMainUserSettings.windows.window.backgroundColor);
                        }

                        const mouseEnterCreateRandomColor = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                        }

                        const mouseLeaveCreateRandomColor = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        }

                        backgroundColorPickerInputEl.addEventListener('input', changeBackgroundColor);
                        addRandomColorEl.addEventListener('click', getRandomNavigationBarBackgroundColor);
                        addRandomColorEl.addEventListener('mouseenter', mouseEnterCreateRandomColor);
                        addRandomColorEl.addEventListener('mouseleave', mouseLeaveCreateRandomColor);
                    }
                    addEventListenersToAddressBarBackgroundColorSection();
                    break;
                case 'navigationBarFont':
                    createRightPreviewHtml();
                    settingsWindowRightSectionHtml = `
                        <div id="addressBarFontSection">
                            <div id="fontColorPickerSection">
                                <label for="fontColorPickerInputTitle" id="fontColorPickerInputTitle">Choose Font Color:</label>
                                <div id="backgroundColorPickerInputSection">
                                    <input type="text" id="fontColorPickerInput" data-coloris="" readonly="readonly">
                                    <button id="addRandomColor"></button>
                                </div>
                            </div>
                            <div id="addressBarFontSizeSection">
                                <label for="fontSizeRangeInput" id="fontSizeRangeInputTitle">Size:</label>
                                <input type="range" id="fontSizeRangeInput" min="10" max="30" step="1" value="20">
                                <div id="fontSizeRangeInputOutput">
                                    <output id="fontSizeRangeInputValue">0</output>
                                </div>
                            </div>
                        </div>
                    `;
                    rightBodySectionEl.innerHTML = settingsWindowRightSectionHtml;
                    updateFolderStylePreview();

                    const addIconToRandomColorFontEl = () => {
                        const addRandomColorEl = document.getElementById('addRandomColor');
                        addRandomColorEl.style.border = `1px solid ${checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff'}`;
                        addRandomColorEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        addRandomColorEl.innerHTML = `<svg fill="${editingMainUserSettings.windows.button.primary.font.color}" width="25px" height="25px" viewBox="0 -4 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m24.983 8.539v-2.485h-4.902l-3.672 5.945-2.099 3.414-3.24 5.256c-.326.51-.889.844-1.53.845h-9.54v-3.568h8.538l3.673-5.946 2.099-3.414 3.24-5.256c.325-.509.886-.843 1.525-.845h5.904v-2.485l7.417 4.27-7.417 4.27z"/><path d="m12.902 6.316-.63 1.022-1.468 2.39-2.265-3.675h-8.538v-3.568h9.54c.641.001 1.204.335 1.526.838l.004.007 1.836 2.985z"/><path d="m24.983 24v-2.485h-5.904c-.639-.002-1.201-.336-1.521-.838l-.004-.007-1.836-2.985.63-1.022 1.468-2.39 2.264 3.675h4.902v-2.485l7.417 4.27-7.417 4.27z"/></svg>`
                    }
                    addIconToRandomColorFontEl();

                    const updateNavigationBarFontColorSettingsTitlesUI = () => {
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
                            fontColorPickerInputTitle: {
                                id: 'fontColorPickerInputTitle',
                                text: languageObject._navigationBarStyle._navigationBarFont.chooseColor,
                                classNames: []
                            },
                            fontSizeRangeInputTitle: {
                                id: 'fontSizeRangeInputTitle',
                                text: languageObject._navigationBarStyle._navigationBarFont.chooseSize,
                                classNames: []
                            }
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
                    updateNavigationBarFontColorSettingsTitlesUI();

                    const updateDefaultSettingsAddressFontColorUI = () => {
                        updateColorisInputValue('fontColorPickerInput', editingDefaultUserFolderStyle.addressBar.text.color, false, editingMainUserSettings.windows.window.backgroundColor);
                        updateInputRangeAndOutput('fontSizeRangeInput', 'fontSizeRangeInputValue', editingDefaultUserFolderStyle.addressBar.text.fontSize);
                    }
                    updateDefaultSettingsAddressFontColorUI();

                    const addEventListenersToAddressBarFontColorSection = () => {
                        const fontColorPickerInputEl = document.getElementById('fontColorPickerInput');
                        const addRandomColorEl = document.getElementById('addRandomColor');
                        const fontSizeRangeInputEl = document.getElementById('fontSizeRangeInput');

                        const updateFontColor = () => {
                            const fontColor = fontColorPickerInputEl.value;
                            fontColorPickerInputEl.style.backgroundColor = fontColor;
                            fontColorPickerInputEl.style.color = checkIfColorBrightness(fontColor, 120) ? '#000000' : '#ffffff';
                            editingDefaultUserFolderStyle.addressBar.text.color = fontColor;
                            updateFolderStylePreview();
                        }

                        const getRandomFontColor = () => {
                            updateColorisInputValue('fontColorPickerInput', getRandomColor(), false, editingMainUserSettings.windows.window.backgroundColor);
                            updateFolderStylePreview();
                        }

                        const mouseEnterGetRandomFontColor = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                        }

                        const mouseLeaveGetRandomFontColor = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        }

                        const updateAddressBarForFolderSize = () => {
                            const fontSizeValue = fontSizeRangeInputEl.value;
                            updateInputRangeAndOutput('fontSizeRangeInput', 'fontSizeRangeInputValue', fontSizeValue);
                            editingDefaultUserFolderStyle.addressBar.text.fontSize = fontSizeValue;
                            updateFolderStylePreview();
                        }

                        fontColorPickerInputEl.addEventListener('input', updateFontColor);
                        addRandomColorEl.addEventListener('click', getRandomFontColor);
                        addRandomColorEl.addEventListener('mouseenter', mouseEnterGetRandomFontColor);
                        addRandomColorEl.addEventListener('mouseleave', mouseLeaveGetRandomFontColor);
                        fontSizeRangeInputEl.addEventListener('input', updateAddressBarForFolderSize);
                    }
                    addEventListenersToAddressBarFontColorSection();
                    break;
                case 'windowBackgroundColor':
                    settingsWindowRightSectionHtml = `
                        <div id="windowBackgroundColorSection">
                            <div id="backgroundColorPickerSection">
                                <label for="backgroundColorPickerInputTitle" id="backgroundColorPickerInputTitle">Choose Background Color:</label>
                                <div id="backgroundColorPickerInputSection">
                                    <input type="text" id="backgroundColorPickerInput" data-coloris="" readonly="readonly">
                                    <button id="addRandomColor"></button>
                                </div>
                            </div>
                        </div>
                    `;
                    settingsWindowRightSectionEl.innerHTML = settingsWindowRightSectionHtml;

                    const addIconToRandomColorWindowsBackgroundColorEl = () => {
                        const addRandomColorEl = document.getElementById('addRandomColor');
                        addRandomColorEl.style.border = `1px solid ${checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff'}`;
                        addRandomColorEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        addRandomColorEl.innerHTML = `<svg fill="${editingMainUserSettings.windows.button.primary.font.color}" width="25px" height="25px" viewBox="0 -4 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m24.983 8.539v-2.485h-4.902l-3.672 5.945-2.099 3.414-3.24 5.256c-.326.51-.889.844-1.53.845h-9.54v-3.568h8.538l3.673-5.946 2.099-3.414 3.24-5.256c.325-.509.886-.843 1.525-.845h5.904v-2.485l7.417 4.27-7.417 4.27z"/><path d="m12.902 6.316-.63 1.022-1.468 2.39-2.265-3.675h-8.538v-3.568h9.54c.641.001 1.204.335 1.526.838l.004.007 1.836 2.985z"/><path d="m24.983 24v-2.485h-5.904c-.639-.002-1.201-.336-1.521-.838l-.004-.007-1.836-2.985.63-1.022 1.468-2.39 2.264 3.675h4.902v-2.485l7.417 4.27-7.417 4.27z"/></svg>`
                    }
                    addIconToRandomColorWindowsBackgroundColorEl();

                    const updateWindowStyleBackgroundColorSettingsTitlesUI = () => {
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
                            backgroundColorPickerInputTitle: {
                                id: 'backgroundColorPickerInputTitle',
                                text: languageObject._windowStyle._windowBackgroundColor.chooseColor,
                                classNames: []
                            }
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
                    updateWindowStyleBackgroundColorSettingsTitlesUI();

                    const updateDefaultSettingsWindowBackgroundColorUI = () => {
                        updateColorisInputValue('backgroundColorPickerInput', editingMainUserSettings.windows.window.backgroundColor, false, editingMainUserSettings.windows.window.backgroundColor);
                    }
                    updateDefaultSettingsWindowBackgroundColorUI();

                    const addEventListenersToWindowBackgroundColorSection = () => {
                        const backgroundColorPickerInputEl = document.getElementById('backgroundColorPickerInput');
                        const addRandomColorEl = document.getElementById('addRandomColor');

                        const changeBackgroundColor = () => {
                            const backgroundColor = backgroundColorPickerInputEl.value;
                            backgroundColorPickerInputEl.style.backgroundColor = backgroundColor;
                            backgroundColorPickerInputEl.style.color = invertHexColor(backgroundColor);
                            editingMainUserSettings.windows.window.backgroundColor = backgroundColor;
                            backgroundColorPickerInputEl.style.border = `1px solid ${checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff'}`;
                            addRandomColorEl.style.border = `1px solid ${checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff'}`;
                            setStyleToSettingsWindow();
                        }

                        const getRandomBackgroundColor = () => {
                            const randomColor = getRandomColor();
                            backgroundColorPickerInputEl.value = randomColor;
                            backgroundColorPickerInputEl.style.backgroundColor = randomColor;
                            backgroundColorPickerInputEl.style.color = invertHexColor(randomColor);
                            editingMainUserSettings.windows.window.backgroundColor = randomColor;
                            backgroundColorPickerInputEl.style.border = `1px solid ${checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff'}`;
                            addRandomColorEl.style.border = `1px solid ${checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff'}`;
                            setStyleToSettingsWindow();
                        }

                        const mouseEnterGetRandomBackgroundColor = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                        }

                        const mouseLeaveGetRandomBackgroundColor = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        }

                        backgroundColorPickerInputEl.addEventListener('input', changeBackgroundColor);
                        addRandomColorEl.addEventListener('click', getRandomBackgroundColor);
                        addRandomColorEl.addEventListener('mouseenter', mouseEnterGetRandomBackgroundColor);
                        addRandomColorEl.addEventListener('mouseleave', mouseLeaveGetRandomBackgroundColor);
                    }
                    addEventListenersToWindowBackgroundColorSection();
                    break;
                case 'windowFont':
                    settingsWindowRightSectionHtml = `
                        <div id="windowFontSection">
                            <div id="windowFontColorPickerSection">
                                <label for="windowFontColorPickerInputTitle" id="windowFontColorPickerInputTitle">Choose Font Color:</label>
                                <div id="windowFontColorPickerInputSection">
                                    <input type="text" id="windowFontColorPickerInput" data-coloris="" readonly="readonly">
                                    <button id="addRandomColor"></button>
                                </div>
                            </div>
                            <div id="windowFontSizeSection">
                                <label for="windowFontSizeRangeInput" id="windowFontSizeRangeInputTitle">Size:</label>
                                <input type="range" id="windowFontSizeRangeInput" min="10" max="20" step="1" value="20">
                                <div id="windowFontSizeRangeInputOutput">
                                    <output id="windowFontSizeRangeInputValue">0</output>
                                </div>
                            </div>
                        </div>
                    `;
                    settingsWindowRightSectionEl.innerHTML = settingsWindowRightSectionHtml;

                    const addIconToRandomColorWindowsFontEl = () => {
                        const addRandomColorEl = document.getElementById('addRandomColor');
                        addRandomColorEl.style.border = `1px solid ${checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff'}`;
                        addRandomColorEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        addRandomColorEl.innerHTML = `<svg fill="${editingMainUserSettings.windows.button.primary.font.color}" width="25px" height="25px" viewBox="0 -4 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m24.983 8.539v-2.485h-4.902l-3.672 5.945-2.099 3.414-3.24 5.256c-.326.51-.889.844-1.53.845h-9.54v-3.568h8.538l3.673-5.946 2.099-3.414 3.24-5.256c.325-.509.886-.843 1.525-.845h5.904v-2.485l7.417 4.27-7.417 4.27z"/><path d="m12.902 6.316-.63 1.022-1.468 2.39-2.265-3.675h-8.538v-3.568h9.54c.641.001 1.204.335 1.526.838l.004.007 1.836 2.985z"/><path d="m24.983 24v-2.485h-5.904c-.639-.002-1.201-.336-1.521-.838l-.004-.007-1.836-2.985.63-1.022 1.468-2.39 2.264 3.675h4.902v-2.485l7.417 4.27-7.417 4.27z"/></svg>`
                    }
                    addIconToRandomColorWindowsFontEl();

                    const updateWindowStyleFontSettingsTitlesUI = () => {
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
                            windowFontColorPickerInputTitle: {
                                id: 'windowFontColorPickerInputTitle',
                                text: languageObject._windowStyle._windowFont.chooseColor,
                                classNames: []
                            },
                            windowFontSizeRangeInputTitle: {
                                id: 'windowFontSizeRangeInputTitle',
                                text: languageObject._windowStyle._windowFont.chooseSize,
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
                    updateWindowStyleFontSettingsTitlesUI();

                    const updateDefaultSettingsWindowFontUI = () => {
                        updateColorisInputValue('windowFontColorPickerInput', editingMainUserSettings.windows.window.font.color, false, editingMainUserSettings.windows.window.backgroundColor);
                        updateInputRangeAndOutput('windowFontSizeRangeInput', 'windowFontSizeRangeInputValue', editingMainUserSettings.windows.window.font.fontSize);
                    }
                    updateDefaultSettingsWindowFontUI();

                    const addEventListenersToWindowFontSection = () => {
                        const windowFontColorPickerInputEl = document.getElementById('windowFontColorPickerInput');
                        const addRandomColorEl = document.getElementById('addRandomColor');
                        const windowFontSizeRangeInputEl = document.getElementById('windowFontSizeRangeInput');

                        const updateFontColor = () => {
                            const fontColor = windowFontColorPickerInputEl.value;
                            windowFontColorPickerInputEl.style.backgroundColor = fontColor;
                            windowFontColorPickerInputEl.style.color = invertHexColor(fontColor);
                            editingMainUserSettings.windows.window.font.color = fontColor;
                            setStyleToSettingsWindow();
                        }

                        const getRandomBackgroundColor = () => {
                            const randomColor = getRandomColor();
                            windowFontColorPickerInputEl.value = randomColor;
                            windowFontColorPickerInputEl.style.backgroundColor = randomColor;
                            windowFontColorPickerInputEl.style.color = invertHexColor(randomColor);
                            editingMainUserSettings.windows.window.font.color = randomColor;
                            windowFontColorPickerInputEl.style.border = `1px solid ${checkIfColorBrightness(editingMainUserSettings.windows.window.font.color, 120) ? '#000000' : '#ffffff'}`;
                            addRandomColorEl.style.border = `1px solid ${checkIfColorBrightness(editingMainUserSettings.windows.window.font.color, 120) ? '#000000' : '#ffffff'}`;
                            setStyleToSettingsWindow();
                        }

                        const updateFontSize = () => {
                            const fontSizeValue = windowFontSizeRangeInputEl.value;
                            updateInputRangeAndOutput('windowFontSizeRangeInput', 'windowFontSizeRangeInputValue', fontSizeValue);
                            editingMainUserSettings.windows.window.font.fontSize = fontSizeValue;
                            setStyleToSettingsWindow();
                        }

                        const mouseEnterGetRandomBackgroundColor = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                        }

                        const mouseLeaveGetRandomBackgroundColor = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        }

                        windowFontColorPickerInputEl.addEventListener('input', updateFontColor);
                        addRandomColorEl.addEventListener('click', getRandomBackgroundColor);
                        addRandomColorEl.addEventListener('mouseenter', mouseEnterGetRandomBackgroundColor);
                        addRandomColorEl.addEventListener('mouseleave', mouseLeaveGetRandomBackgroundColor);
                        windowFontSizeRangeInputEl.addEventListener('input', updateFontSize);
                    }
                    addEventListenersToWindowFontSection();
                    break;
                case 'windowBorder':
                    let borderType = 'left';
                    settingsWindowRightSectionHtml = `
                        <div id="windowBorderSection">
                            <div id="windowBorderMenuSection">
                                <button class="windowBorderMenu" id="windowBorderLeftMenu" data-type="left" data-active="true">Left</button>
                                <button class="windowBorderMenu" id="windowBorderTopMenu" data-type="top" data-active="false">Top</button>
                                <button class="windowBorderMenu" id="windowBorderRightMenu" data-type="right" data-active="false">Right</button>
                                <button class="windowBorderMenu" id="windowBorderBottomMenu" data-type="bottom" data-active="false">Bottom</button>
                            </div>
                            <div id="windowBorderMenuOptionsSection">
                                <div id="windowBorderColorPickerSection">
                                    <label for="windowBorderColorPickerInput" id="windowBorderColorPickerInputTitle">Choose Font Color:</label>
                                    <div id="windowBorderColorPickerInputSection">
                                        <input type="text" id="windowBorderColorPickerInput" data-coloris="" readonly="readonly">
                                        <button id="addRandomColor"></button>
                                    </div>
                                </div>
                                <div id="windowBorderStyleSection">
                                    <label id="windowBorderStyleButtonsTitle">Choose Border Style:</label>
                                    <div id="windowBorderStyleButtonsSection">
                                        <button class="windowBorderStyleButton" id="borderStyleDotted" data-style="dotted">Dotted</button>
                                        <button class="windowBorderStyleButton" id="borderStyleDashed" data-style="dashed">Dashed</button>
                                        <button class="windowBorderStyleButton" id="borderStyleSolid" data-style="solid">Solid</button>
                                        <button class="windowBorderStyleButton" id="borderStyleDouble" data-style="double">Double</button>
                                        <button class="windowBorderStyleButton" id="borderStyleGroove" data-style="groove">Groove</button>
                                        <button class="windowBorderStyleButton" id="borderStyleRidge" data-style="ridge">Ridge</button>
                                        <button class="windowBorderStyleButton" id="borderStyleInset" data-style="inset">Inset</button>
                                        <button class="windowBorderStyleButton" id="borderStyleOutset" data-style="outset">Outset</button>
                                    </div>
                                </div>
                                <div id="windowBorderWidthRangeSection">
                                    <label for="windowBorderWidthRangeInput" id="windowBorderWidthRangeInputTitle">Size:</label>
                                    <input type="range" id="windowBorderWidthRangeInput" min="0" max="10" step="1" value="3">
                                    <div id="windowBorderWidthRangeInputOutput">
                                        <output id="windowBorderWidthRangeInputValue">0</output>
                                    </div>
                                </div>
                                <div id="windowBorderRadiusRangeSection">
                                    <label for="windowBorderRadiusRangeInput" id="windowBorderRadiusRangeInputTitle">Radius:</label>
                                    <input type="range" id="windowBorderRadiusRangeInput" min="0" max="40" step="1" value="3">
                                    <div id="windowBorderRadiusRangeInputOutput">
                                        <output id="windowBorderRadiusRangeInputValue">0</output>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    settingsWindowRightSectionEl.innerHTML = settingsWindowRightSectionHtml;

                    const addIconToRandomColorWindowsBorderEl = () => {
                        const windowBorderMenu = document.querySelectorAll('.windowBorderMenu');
                        const addRandomColorEl = document.getElementById('addRandomColor');
                        addRandomColorEl.innerHTML = `<svg fill="${editingMainUserSettings.windows.button.primary.font.color}" width="25px" height="25px" viewBox="0 -4 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m24.983 8.539v-2.485h-4.902l-3.672 5.945-2.099 3.414-3.24 5.256c-.326.51-.889.844-1.53.845h-9.54v-3.568h8.538l3.673-5.946 2.099-3.414 3.24-5.256c.325-.509.886-.843 1.525-.845h5.904v-2.485l7.417 4.27-7.417 4.27z"/><path d="m12.902 6.316-.63 1.022-1.468 2.39-2.265-3.675h-8.538v-3.568h9.54c.641.001 1.204.335 1.526.838l.004.007 1.836 2.985z"/><path d="m24.983 24v-2.485h-5.904c-.639-.002-1.201-.336-1.521-.838l-.004-.007-1.836-2.985.63-1.022 1.468-2.39 2.264 3.675h4.902v-2.485l7.417 4.27-7.417 4.27z"/></svg>`
                        addRandomColorEl.style.border = `1px solid ${checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff'}`;
                        addRandomColorEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        windowBorderMenu.forEach(menu => {
                            if (menu.dataset.type === borderType) {
                                menu.style.backgroundColor = `rgb(${activeTabBorderColor})`;
                                menu.dataset.active = true;
                            } else {
                                menu.style.backgroundColor = `rgb(${notActiveTabBorderColor})`;
                                menu.dataset.active = false;
                            }
                        })
                    }
                    addIconToRandomColorWindowsBorderEl();

                    const updateWindowStyleBorderSettingsTitlesUI = () => {
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
                            windowBorderLeftMenu: {
                                id: 'windowBorderLeftMenu',
                                text: languageObject._windowStyle._windowBorder._typeMenu.left,
                                classNames: []
                            },
                            windowBorderTopMenu: {
                                id: 'windowBorderTopMenu',
                                text: languageObject._windowStyle._windowBorder._typeMenu.top,
                                classNames: []
                            },
                            windowBorderRightMenu: {
                                id: 'windowBorderRightMenu',
                                text: languageObject._windowStyle._windowBorder._typeMenu.right,
                                classNames: []
                            },
                            windowBorderBottomMenu: {
                                id: 'windowBorderBottomMenu',
                                text: languageObject._windowStyle._windowBorder._typeMenu.bottom,
                                classNames: []
                            },
                            windowBorderColorPickerInputTitle: {
                                id: 'windowBorderColorPickerInputTitle',
                                text: languageObject._windowStyle._windowBorder[`_${borderType}`][`choose${capitalizeString(borderType)}Color`],
                                classNames: []
                            },
                            windowBorderStyleButtonsTitle: {
                                id: 'windowBorderStyleButtonsTitle',
                                text: languageObject._windowStyle._windowBorder[`_${borderType}`][`choose${capitalizeString(borderType)}Style`],
                                classNames: []
                            },
                            borderStyleDotted: {
                                id: 'borderStyleDotted',
                                text: languageObject._windowStyle._windowBorder._styleMenu.dotted,
                                classNames: []
                            },
                            borderStyleDashed: {
                                id: 'borderStyleDashed',
                                text: languageObject._windowStyle._windowBorder._styleMenu.dashed,
                                classNames: []
                            },
                            borderStyleSolid: {
                                id: 'borderStyleSolid',
                                text: languageObject._windowStyle._windowBorder._styleMenu.solid,
                                classNames: []
                            },
                            borderStyleDouble: {
                                id: 'borderStyleDouble',
                                text: languageObject._windowStyle._windowBorder._styleMenu.double,
                                classNames: []
                            },
                            borderStyleGroove: {
                                id: 'borderStyleGroove',
                                text: languageObject._windowStyle._windowBorder._styleMenu.groove,
                                classNames: []
                            },
                            borderStyleRidge: {
                                id: 'borderStyleRidge',
                                text: languageObject._windowStyle._windowBorder._styleMenu.ridge,
                                classNames: []
                            },
                            borderStyleInset: {
                                id: 'borderStyleInset',
                                text: languageObject._windowStyle._windowBorder._styleMenu.inset,
                                classNames: []
                            },
                            borderStyleOutset: {
                                id: 'borderStyleOutset',
                                text: languageObject._windowStyle._windowBorder._styleMenu.outset,
                                classNames: []
                            },
                            windowBorderWidthRangeInputTitle: {
                                id: 'windowBorderWidthRangeInputTitle',
                                text: languageObject._windowStyle._windowBorder[`_${borderType}`][`choose${capitalizeString(borderType)}Width`],
                                classNames: []
                            },
                            windowBorderRadiusRangeInputTitle: {
                                id: 'windowBorderRadiusRangeInputTitle',
                                text: languageObject._windowStyle._windowBorder[`_${borderType}`][`choose${capitalizeString(borderType)}Radius`],
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
                    updateWindowStyleBorderSettingsTitlesUI();

                    const updateDefaultSettingsWindowBorderUI = () => {
                        const windowBorderStyleButton = document.querySelectorAll('.windowBorderStyleButton');
                        updateColorisInputValue('windowBorderColorPickerInput', editingMainUserSettings.windows.window.border[borderType].color, false, editingMainUserSettings.windows.window.backgroundColor);
                        updateInputRangeAndOutput('windowBorderWidthRangeInput', 'windowBorderWidthRangeInputValue', editingMainUserSettings.windows.window.border[borderType].width);
                        updateInputRangeAndOutput('windowBorderRadiusRangeInput', 'windowBorderRadiusRangeInputValue', editingMainUserSettings.windows.window.border[borderType].radius);
                        windowBorderStyleButton.forEach(button => {
                            if (button.dataset.style === editingMainUserSettings.windows.window.border[borderType].style) {
                                button.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                                button.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                            } else {
                                button.style.backgroundColor = editingMainUserSettings.windows.button.info.backgroundColor;
                                button.style.color = editingMainUserSettings.windows.button.info.font.color;
                            }
                        });
                    }
                    updateDefaultSettingsWindowBorderUI();

                    const addEventListenersToWindowBorderSection = () => {
                        const windowBorderMenu = document.querySelectorAll('.windowBorderMenu');
                        const windowBorderColorPickerInputEl = document.getElementById('windowBorderColorPickerInput');
                        const addRandomColorEl = document.getElementById('addRandomColor');
                        const windowBorderStyleButton = document.querySelectorAll('.windowBorderStyleButton');
                        const windowBorderWidthRangeInputEl = document.getElementById('windowBorderWidthRangeInput');
                        const windowBorderRadiusRangeInputEl = document.getElementById('windowBorderRadiusRangeInput');

                        const changeBorderType = (el) => {
                            borderType = el.target.dataset.type;
                            windowBorderMenu.forEach(menu => {
                                if (menu.dataset.type === borderType) {
                                    menu.style.backgroundColor = `rgb(${activeTabBorderColor})`;
                                    menu.dataset.active = true;
                                } else {
                                    menu.style.backgroundColor = `rgb(${notActiveTabBorderColor})`;
                                    menu.dataset.active = false;
                                }
                            });
                            updateWindowStyleBorderSettingsTitlesUI();
                            updateDefaultSettingsWindowBorderUI();
                        }

                        const borderTypeButtonsMouseEnter = (el) => {
                            el.target.style.backgroundColor = `rgb(${activeTabBorderColor})`;
                            el.target.dataset.active = true;
                        }

                        const borderTypeButtonsMouseLeave = () => {
                            windowBorderMenu.forEach(menu => {
                                if (menu.dataset.type === borderType) {
                                    menu.style.backgroundColor = `rgb(${activeTabBorderColor})`;
                                    menu.dataset.active = true;
                                } else {
                                    menu.style.backgroundColor = `rgb(${notActiveTabBorderColor})`;
                                    menu.dataset.active = false;
                                }
                            })
                        }

                        const updateBorderColor = () => {
                            const borderColor = windowBorderColorPickerInputEl.value;
                            windowBorderColorPickerInputEl.style.backgroundColor = borderColor;
                            windowBorderColorPickerInputEl.style.color = invertHexColor(borderColor);
                            editingMainUserSettings.windows.window.border[borderType].color = borderColor;
                            setStyleToSettingsWindow();
                        }

                        const getRandomBackgroundColor = () => {
                            const randomColor = getRandomColor();
                            windowBorderColorPickerInputEl.value = randomColor;
                            windowBorderColorPickerInputEl.style.backgroundColor = randomColor;
                            windowBorderColorPickerInputEl.style.color = invertHexColor(randomColor);
                            editingMainUserSettings.windows.window.border[borderType].color = randomColor;
                            setStyleToSettingsWindow();
                        }

                        const mouseEnterGetRandomBackgroundColor = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                        }

                        const mouseLeaveGetRandomBackgroundColor = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        }

                        const changeBorderStyle = (el) => {
                            const borderStyle = el.target.dataset.style;
                            editingMainUserSettings.windows.window.border[borderType].style = borderStyle;
                            windowBorderStyleButton.forEach(button => {
                                if (button.dataset.style === editingMainUserSettings.windows.window.border[borderType].style) {
                                    button.style.backgroundColor = editingMainUserSettings.windows.button.secondary.hoverBackgroundColor;
                                    button.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                                } else {
                                    button.style.backgroundColor = editingMainUserSettings.windows.button.info.backgroundColor;
                                    button.style.color = editingMainUserSettings.windows.button.info.font.color;
                                }
                            });
                            setStyleToSettingsWindow();
                        }

                        const borderStyleButtonsMouseEnter = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.hoverBackgroundColor;
                            el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        }

                        const borderStyleButtonsMouseLeave = (el) => {
                            if (el.target.dataset.style === editingMainUserSettings.windows.window.border[borderType].style) {
                                el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                                el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                            } else {
                                el.target.style.backgroundColor = editingMainUserSettings.windows.button.info.backgroundColor;
                                el.target.style.color = editingMainUserSettings.windows.button.info.font.color;
                            }
                        }

                        const updateBorderSize = () => {
                            const fontSizeValue = windowBorderWidthRangeInputEl.value;
                            updateInputRangeAndOutput('windowBorderWidthRangeInput', 'windowBorderWidthRangeInputValue', fontSizeValue);
                            editingMainUserSettings.windows.window.border[borderType].width = fontSizeValue;
                            setStyleToSettingsWindow();
                        }

                        const updateBorderRadius = () => {
                            const fontSizeValue = windowBorderRadiusRangeInputEl.value;
                            updateInputRangeAndOutput('windowBorderRadiusRangeInput', 'windowBorderRadiusRangeInputValue', fontSizeValue);
                            editingMainUserSettings.windows.window.border[borderType].radius = fontSizeValue;
                            setStyleToSettingsWindow();
                        }

                        windowBorderMenu.forEach(element => {
                            element.addEventListener('click', changeBorderType);
                            element.addEventListener('mouseenter', borderTypeButtonsMouseEnter);
                            element.addEventListener('mouseleave', borderTypeButtonsMouseLeave);
                        });
                        windowBorderColorPickerInputEl.addEventListener('input', updateBorderColor);
                        addRandomColorEl.addEventListener('click', getRandomBackgroundColor);
                        addRandomColorEl.addEventListener('mouseenter', mouseEnterGetRandomBackgroundColor);
                        addRandomColorEl.addEventListener('mouseleave', mouseLeaveGetRandomBackgroundColor);
                        windowBorderStyleButton.forEach(element => {
                            element.addEventListener('click', changeBorderStyle);
                            element.addEventListener('mouseenter', borderStyleButtonsMouseEnter);
                            element.addEventListener('mouseleave', borderStyleButtonsMouseLeave);
                        });
                        windowBorderWidthRangeInputEl.addEventListener('input', updateBorderSize);
                        windowBorderRadiusRangeInputEl.addEventListener('input', updateBorderRadius);
                    }
                    addEventListenersToWindowBorderSection();

                    break;
                case 'windowButtons':
                    let buttonsColorType = 'actions';
                    const activeTabButtonsColor = hexToRGB(colorPalette[2]);
                    const notActiveTabButtonsColor = hexToRGB(colorPalette[1]);
                    let buttonTypeFirst = '';
                    let buttonTypeSecond = '';
                    let animationEmojiBuffer = [];
                    const emojiNoSelectedArray = ['😐', '😔', '😢', '😭', '😞', '😟', '😠', '😡', '😓', '☹️'];
                    settingsWindowRightSectionHtml = `
                        <div id="windowButtonsSection">
                            <div id="windowButtonsMenuSection">
                                <buttons class="windowButtonsMenu" id="windowButtonsActionsMenu" data-type="actions" data-active="true">Actions</buttons>
                                <buttons class="windowButtonsMenu" id="windowButtonsAlertsMenu" data-type="alerts" data-active="false">Alerts</buttons>
                                <buttons class="windowButtonsMenu" id="windowButtonsNotificationsMenu" data-type="notifications" data-active="false">Notifications</buttons>
                                <buttons class="windowButtonsMenu" id="windowButtonsNeutralsMenu" data-type="neutrals" data-active="false">Neutrals</buttons>
                            </div>
                            <div id="windowButtonsMenuOptionsSection">
                                <div id="windowButtonsMenuOptionsFirstSection">
                                    <label class="windowButtonColorTitle" id="windowButtonColorFirstTitle">Primary Button:</label>
                                    <div class="buttonStyleExample">
                                        <button class="exampleButton" id="exampleFirstButton"></button>
                                    </div>
                                    <div class="windowButtonColorPickerSection">
                                        <label class="windowButtonColorPickerInputTitle" id="windowButtonBackgroundColorPickerInputFirstTitle">Choose Background Color:</label>
                                        <div class="windowButtonColorPickerInputSection">
                                            <input type="text" class="windowButtonColorPickerInput" id="windowButtonBackgroundColorPickerFirstInput" data-coloris="" readonly="readonly">
                                            <button class="addRandomColor" id="addRandomBackgroundColorFirst"></button>
                                        </div>
                                    </div>
                                    <div class="windowButtonColorPickerSection">
                                        <label class="windowButtonColorPickerInputTitle" id="windowButtonHoverBackgroundColorPickerInputFirstTitle">Choose Button Hover Background Color:</label>
                                        <div class="windowButtonColorPickerInputSection">
                                            <input type="text" class="windowButtonColorPickerInput" id="windowButtonHoverBackgroundColorPickerFirstInput" data-coloris="" readonly="readonly">
                                            <button class="addRandomColor" id="addRandomButtonHoverBackgroundColorFirst"></button>
                                        </div>
                                    </div>
                                    <div class="windowButtonAnimationSection">
                                        <label class="windowButtonAnimationTitle" id="windowButtonAnimationFirstTitle">Choose Button Click Animation:</label>
                                        <div class="windowButtonAnimationAndEmojiSection">
                                            <button class="buttonAnimationList" id="buttonAnimationListFirst">
                                                <span class="buttonAnimationListText" id="buttonAnimationListTextFirst">Select</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960"><path d="M400-280v-400l200 200z"/></svg>
                                            </button>
                                            <div class="showEmojiPicker" id="showEmojiPickerFirst"></div>
                                            <div class="emojiUserSelectedList" id="emojiUserSelectedListFirst">
                                                <div class="emojiUserList" id="emojiUserListFirst"></div>
                                                <div class="emojiListNavigation" id="emojiListNavigationFirst">
                                                    <button id="copyEmojiListFirst">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240zm0-80h360v-480H360zM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80zm160-240v-480z"/></svg>
                                                    </button>
                                                    <button id="pasteEmojiListFirst">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M14 4a2 2 0 0 1 2-2" /> <path d="M16 10a2 2 0 0 1-2-2" /> <path d="M20 2a2 2 0 0 1 2 2" /> <path d="M22 8a2 2 0 0 1-2 2" /> <path d="m3 7 3 3 3-3" /> <path d="M6 10V5a3 3 0 0 1 3-3h1" /><rect x="2" y="14" width="8" height="8" rx="2" /></svg>
                                                    </button>
                                                    <button id="deleteEmojiListFirst">
                                                        <svg style="pointer-events: none;" width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M4 6H20L18.4199 20.2209C18.3074 21.2337 17.4512 22 16.4321 22H7.56786C6.54876 22 5.69264 21.2337 5.5801 20.2209L4 6Z" stroke="${editingMainUserSettings.windows.button.danger.backgroundColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                            <path d="M7.34491 3.14716C7.67506 2.44685 8.37973 2 9.15396 2H14.846C15.6203 2 16.3249 2.44685 16.6551 3.14716L18 6H6L7.34491 3.14716Z" stroke="${editingMainUserSettings.windows.button.danger.backgroundColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                            <path d="M2 6H22" stroke="${editingMainUserSettings.windows.button.danger.backgroundColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                            <path d="M10 11V16" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                            <path d="M14 11V16" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div id="windowButtonsMenuOptionsSecondSection">
                                    <label class="windowButtonColorTitle" id="windowButtonColorSecondTitle">Secondary Button:</label>
                                    <div class="buttonStyleExample">
                                        <button class="exampleButton" id="exampleSecondButton"></button>
                                    </div>
                                    <div class="windowButtonColorPickerSection">
                                        <label class="windowButtonColorPickerInputTitle" id="windowButtonBackgroundColorPickerInputSecondTitle">Choose Background Color:</label>
                                        <div class="windowButtonColorPickerInputSection">
                                            <input type="text" class="windowButtonColorPickerInput" id="windowButtonBackgroundColorPickerSecondInput" data-coloris="" readonly="readonly">
                                            <button class="addRandomColor" id="addRandomBackgroundColorSecond"></button>
                                        </div>
                                    </div>
                                    <div class="windowButtonColorPickerSection">
                                        <label class="windowButtonColorPickerInputTitle" id="windowButtonHoverBackgroundColorPickerInputSecondTitle">Choose Button Hover Background Color:</label>
                                        <div class="windowButtonColorPickerInputSection">
                                            <input type="text" class="windowButtonColorPickerInput" id="windowButtonHoverBackgroundColorPickerSecondInput" data-coloris="" readonly="readonly">
                                            <button class="addRandomColor" id="addRandomButtonHoverBackgroundColorSecond"></button>
                                        </div>
                                    </div>
                                    <div class="windowButtonAnimationSection">
                                        <label class="windowButtonAnimationTitle" id="windowButtonAnimationSecondTitle">Choose Button Click Animation:</label>
                                        <div class="windowButtonAnimationAndEmojiSection">
                                            <button class="buttonAnimationList" id="buttonAnimationListSecond">
                                                <span class="buttonAnimationListText" id="buttonAnimationListTextSecond">Select</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960"><path d="M400-280v-400l200 200z"/></svg>
                                            </button>
                                            <div class="showEmojiPicker" id="showEmojiPickerSecond"></div>
                                            <div class="emojiUserSelectedList" id="emojiUserSelectedListSecond">
                                                <div class="emojiUserList" id="emojiUserListSecond"></div>
                                                <div class="emojiListNavigation" id="emojiListNavigationSecond">
                                                    <button id="copyEmojiListSecond">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240zm0-80h360v-480H360zM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80zm160-240v-480z"/></svg>
                                                    </button>
                                                    <button id="pasteEmojiListSecond">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <path d="M14 4a2 2 0 0 1 2-2" /> <path d="M16 10a2 2 0 0 1-2-2" /> <path d="M20 2a2 2 0 0 1 2 2" /> <path d="M22 8a2 2 0 0 1-2 2" /> <path d="m3 7 3 3 3-3" /> <path d="M6 10V5a3 3 0 0 1 3-3h1" /><rect x="2" y="14" width="8" height="8" rx="2" /></svg>
                                                    </button>
                                                    <button id="deleteEmojiListSecond">
                                                        <svg style="pointer-events: none;" width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                            <path d="M4 6H20L18.4199 20.2209C18.3074 21.2337 17.4512 22 16.4321 22H7.56786C6.54876 22 5.69264 21.2337 5.5801 20.2209L4 6Z" stroke="${editingMainUserSettings.windows.button.danger.backgroundColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                            <path d="M7.34491 3.14716C7.67506 2.44685 8.37973 2 9.15396 2H14.846C15.6203 2 16.3249 2.44685 16.6551 3.14716L18 6H6L7.34491 3.14716Z" stroke="${editingMainUserSettings.windows.button.danger.backgroundColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                            <path d="M2 6H22" stroke="${editingMainUserSettings.windows.button.danger.backgroundColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                            <path d="M10 11V16" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                            <path d="M14 11V16" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    settingsWindowRightSectionEl.innerHTML = settingsWindowRightSectionHtml;

                    const updateWindowStyleButtonsSettingsTitlesUI = () => {
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

                        buttonTypeFirst = '';
                        buttonTypeSecond = '';
                        switch (buttonsColorType) {
                            case 'actions':
                                buttonTypeFirst = 'primary';
                                buttonTypeSecond = 'secondary';
                                break;
                            case 'alerts':
                                buttonTypeFirst = 'success';
                                buttonTypeSecond = 'danger';
                                break;
                            case 'notifications':
                                buttonTypeFirst = 'warning';
                                buttonTypeSecond = 'info';
                                break;
                            case 'neutrals':
                                buttonTypeFirst = 'light';
                                buttonTypeSecond = 'dark';
                                break;
                        }

                        // Mapping of element IDs to their corresponding text values
                        const titlesToUpdate = {
                            windowButtonsActionsMenu: {
                                id: 'windowButtonsActionsMenu',
                                text: languageObject._windowStyle._windowButtons._actions._data,
                                classNames: []
                            },
                            windowButtonsAlertsMenu: {
                                id: 'windowButtonsAlertsMenu',
                                text: languageObject._windowStyle._windowButtons._alerts._data,
                                classNames: []
                            },
                            windowButtonsNotificationsMenu: {
                                id: 'windowButtonsNotificationsMenu',
                                text: languageObject._windowStyle._windowButtons._notifications._data,
                                classNames: []
                            },
                            windowButtonsNeutralsMenu: {
                                id: 'windowButtonsNeutralsMenu',
                                text: languageObject._windowStyle._windowButtons._neutrals._data,
                                classNames: []
                            },
                            windowButtonColorFirstTitle: {
                                id: 'windowButtonColorFirstTitle',
                                text: languageObject._windowStyle._windowButtons[`_${buttonsColorType}`][[`_${buttonTypeFirst}`]][[`${buttonTypeFirst}Button`]],
                                classNames: []
                            },
                            windowButtonBackgroundColorPickerInputFirstTitle: {
                                id: 'windowButtonBackgroundColorPickerInputFirstTitle',
                                text: languageObject._windowStyle._windowButtons[`_${buttonsColorType}`][[`_${buttonTypeFirst}`]].chooseColor,
                                classNames: []
                            },
                            windowButtonHoverBackgroundColorPickerInputFirstTitle: {
                                id: 'windowButtonHoverBackgroundColorPickerInputFirstTitle',
                                text: languageObject._windowStyle._windowButtons[`_${buttonsColorType}`][[`_${buttonTypeFirst}`]].chooseHoverColor,
                                classNames: []
                            },
                            windowButtonAnimationFirstTitle: {
                                id: 'windowButtonAnimationFirstTitle',
                                text: languageObject._windowStyle._windowButtons[`_${buttonsColorType}`][[`_${buttonTypeFirst}`]].chooseEmoji,
                                classNames: []
                            },
                            buttonAnimationListTextFirst: {
                                id: 'buttonAnimationListTextFirst',
                                text: languageObject._windowStyle._windowButtons[`_${buttonsColorType}`][[`_${buttonTypeFirst}`]].emoji,
                                classNames: []
                            },
                            exampleFirstButton: {
                                id: 'exampleFirstButton',
                                text: languageObject._windowStyle._windowButtons[`_${buttonsColorType}`][[`_${buttonTypeFirst}`]][buttonTypeFirst],
                                classNames: []
                            },
                            windowButtonColorSecondTitle: {
                                id: 'windowButtonColorSecondTitle',
                                text: languageObject._windowStyle._windowButtons[`_${buttonsColorType}`][[`_${buttonTypeSecond}`]][[`${buttonTypeSecond}Button`]],
                                classNames: []
                            },
                            windowButtonBackgroundColorPickerInputSecondTitle: {
                                id: 'windowButtonBackgroundColorPickerInputSecondTitle',
                                text: languageObject._windowStyle._windowButtons[`_${buttonsColorType}`][[`_${buttonTypeSecond}`]].chooseColor,
                                classNames: []
                            },
                            windowButtonHoverBackgroundColorPickerInputSecondTitle: {
                                id: 'windowButtonHoverBackgroundColorPickerInputSecondTitle',
                                text: languageObject._windowStyle._windowButtons[`_${buttonsColorType}`][[`_${buttonTypeSecond}`]].chooseHoverColor,
                                classNames: []
                            },
                            windowButtonAnimationSecondTitle: {
                                id: 'windowButtonAnimationSecondTitle',
                                text: languageObject._windowStyle._windowButtons[`_${buttonsColorType}`][[`_${buttonTypeSecond}`]].chooseEmoji,
                                classNames: []
                            },
                            buttonAnimationListTextSecond: {
                                id: 'buttonAnimationListTextSecond',
                                text: languageObject._windowStyle._windowButtons[`_${buttonsColorType}`][[`_${buttonTypeSecond}`]].emoji,
                                classNames: []
                            },
                            exampleSecondButton: {
                                id: 'exampleSecondButton',
                                text: languageObject._windowStyle._windowButtons[`_${buttonsColorType}`][[`_${buttonTypeSecond}`]][buttonTypeSecond],
                                classNames: []
                            },
                        };
                        if (editingMainUserSettings.windows.button[buttonTypeFirst].animation.type.length === 0) {
                            titlesToUpdate.emojiUserListFirst = {
                                id: 'emojiUserListFirst',
                                text: `${languageObject._windowStyle._windowButtons.noEmoji} ${(emojiNoSelectedArray)[randomIntFromInterval(0, emojiNoSelectedArray.length - 1)]}`,
                                classNames: []
                            };
                        }
                        if (editingMainUserSettings.windows.button[buttonTypeSecond].animation.type.length === 0) {
                            titlesToUpdate.emojiUserListSecond = {
                                id: 'emojiUserListSecond',
                                text: `${languageObject._windowStyle._windowButtons.noEmoji} ${(emojiNoSelectedArray)[randomIntFromInterval(0, emojiNoSelectedArray.length - 1)]}`,
                                classNames: []
                            };
                        }

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

                    const showHideCopyPasteDeleteButtons = () => {
                        const pasteEmojiListFirstEl = document.getElementById('pasteEmojiListFirst');
                        const copyEmojiListFirstEl = document.getElementById('copyEmojiListFirst');
                        const deleteEmojiListFirstEl = document.getElementById('deleteEmojiListFirst');
                        const pasteEmojiListSecondEl = document.getElementById('pasteEmojiListSecond');
                        const copyEmojiListSecondEl = document.getElementById('copyEmojiListSecond');
                        const deleteEmojiListSecondEl = document.getElementById('deleteEmojiListSecond');

                        if (animationEmojiBuffer.length === 0) {
                            pasteEmojiListFirstEl.style.display = 'none';
                            pasteEmojiListSecondEl.style.display = 'none';
                        } else {
                            pasteEmojiListFirstEl.style.display = 'flex';
                            pasteEmojiListSecondEl.style.display = 'flex';
                        }

                        if (editingMainUserSettings.windows.button[buttonTypeFirst].animation.type.length === 0) {
                            copyEmojiListFirstEl.style.display = 'none';
                            deleteEmojiListFirstEl.style.display = 'none';
                        } else {
                            copyEmojiListFirstEl.style.display = 'flex';
                            deleteEmojiListFirstEl.style.display = 'flex';
                        }
                        if (editingMainUserSettings.windows.button[buttonTypeSecond].animation.type.length === 0) {
                            copyEmojiListSecondEl.style.display = 'none';
                            deleteEmojiListSecondEl.style.display = 'none';
                        } else {
                            copyEmojiListSecondEl.style.display = 'flex';
                            deleteEmojiListSecondEl.style.display = 'flex';
                        }

                        updateWindowStyleButtonsSettingsTitlesUI();
                    }

                    const createUserAnimationEmojiList = () => {
                        const emojiUserListFirstEl = document.getElementById('emojiUserListFirst');
                        const emojiUserListSecondEl = document.getElementById('emojiUserListSecond');

                        const createEmojiListHtml = (array, modifierClass) => {
                            let html = '';
                            if (array.length == 0) return '';
                            array.forEach((emoji, index) => {
                                html += `
                                    <div class="emojiContainer${modifierClass}" data-index="${index}">
                                        <div class="emoji">${emoji.native}</div>
                                        <div class="amount">
                                            <button class="emojiAmountButtonDecrement${modifierClass}" data-index="${index}">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 -960 960 960"><path d="M480-360 280-560h400z"/></svg>
                                            </button>
                                            <input class="emojiAmountInput${modifierClass}" data-index="${index}" type="number" value="${emoji.amount}" min="1" max="10" step="1" disabled>
                                            <button class="emojiAmountButtonIncrement${modifierClass}" data-index="${index}">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 -960 960 960"><path d="m280-400 200-200 200 200z"/></svg>
                                            </button>
                                        </div>
                                        <button class="delete${modifierClass}" data-index="${index}" style="background-color: ${editingMainUserSettings.windows.button.danger.backgroundColor}">
                                            <svg width="100%" height="100%" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path fill-rule="evenodd" clip-rule="evenodd" d="M0.877075 7.49988C0.877075 3.84219 3.84222 0.877045 7.49991 0.877045C11.1576 0.877045 14.1227 3.84219 14.1227 7.49988C14.1227 11.1575 11.1576 14.1227 7.49991 14.1227C3.84222 14.1227 0.877075 11.1575 0.877075 7.49988ZM7.49991 1.82704C4.36689 1.82704 1.82708 4.36686 1.82708 7.49988C1.82708 10.6329 4.36689 13.1727 7.49991 13.1727C10.6329 13.1727 13.1727 10.6329 13.1727 7.49988C13.1727 4.36686 10.6329 1.82704 7.49991 1.82704ZM9.85358 5.14644C10.0488 5.3417 10.0488 5.65829 9.85358 5.85355L8.20713 7.49999L9.85358 9.14644C10.0488 9.3417 10.0488 9.65829 9.85358 9.85355C9.65832 10.0488 9.34173 10.0488 9.14647 9.85355L7.50002 8.2071L5.85358 9.85355C5.65832 10.0488 5.34173 10.0488 5.14647 9.85355C4.95121 9.65829 4.95121 9.3417 5.14647 9.14644L6.79292 7.49999L5.14647 5.85355C4.95121 5.65829 4.95121 5.3417 5.14647 5.14644C5.34173 4.95118 5.65832 4.95118 5.85358 5.14644L7.50002 6.79289L9.14647 5.14644C9.34173 4.95118 9.65832 4.95118 9.85358 5.14644Z" fill="currentColor"/>
                                            </svg>
                                        </button>
                                    </div>
                                `;
                            });
                            return html;
                        }

                        const setDefaultValues = () => {
                            switch (buttonsColorType) {
                                case 'actions':
                                    buttonTypeFirst = 'primary';
                                    buttonTypeSecond = 'secondary';
                                    break;
                                case 'alerts':
                                    buttonTypeFirst = 'success';
                                    buttonTypeSecond = 'danger';
                                    break;
                                case 'notifications':
                                    buttonTypeFirst = 'warning';
                                    buttonTypeSecond = 'info';
                                    break;
                                case 'neutrals':
                                    buttonTypeFirst = 'light';
                                    buttonTypeSecond = 'dark';
                                    break;
                            }
                            emojiUserListFirstEl.innerHTML = createEmojiListHtml(editingMainUserSettings.windows.button[buttonTypeFirst].animation.type, 'First');
                            emojiUserListSecondEl.innerHTML = createEmojiListHtml(editingMainUserSettings.windows.button[buttonTypeSecond].animation.type, 'Second');
                            showHideCopyPasteDeleteButtons();
                        }
                        setDefaultValues();

                        const addEventListenersToEmojiList = () => {
                            const emojiAmountButtonDecrementFirst = document.querySelectorAll('.emojiAmountButtonDecrementFirst');
                            const emojiAmountButtonIncrementFirst = document.querySelectorAll('.emojiAmountButtonIncrementFirst');
                            const deleteFirst = document.querySelectorAll('.deleteFirst');

                            const emojiAmountButtonDecrementSecond = document.querySelectorAll('.emojiAmountButtonDecrementSecond');
                            const emojiAmountButtonIncrementSecond = document.querySelectorAll('.emojiAmountButtonIncrementSecond');
                            const deleteSecond = document.querySelectorAll('.deleteSecond');

                            const decrementEmojiAmountFirst = (el) => {
                                const positionIndex = el.currentTarget.dataset.index;
                                if (!positionIndex) return;
                                let firstAmount = editingMainUserSettings.windows.button[buttonTypeFirst].animation.type[parseInt(positionIndex)].amount;
                                let firstInputByIndex = document.querySelector(`.emojiAmountInputFirst[data-index="${positionIndex}"]`);
                                if (firstAmount > 1) {
                                    firstAmount--;
                                }
                                editingMainUserSettings.windows.button[buttonTypeFirst].animation.type[parseInt(positionIndex)].amount = firstAmount;
                                firstInputByIndex.value = firstAmount;
                            }

                            const incrementEmojiAmountFirst = (el) => {
                                const positionIndex = el.currentTarget.dataset.index;
                                if (!positionIndex) return;
                                let firstAmount = editingMainUserSettings.windows.button[buttonTypeFirst].animation.type[parseInt(positionIndex)].amount;
                                let firstInputByIndex = document.querySelector(`.emojiAmountInputFirst[data-index="${positionIndex}"]`);
                                if (firstAmount < 9) {
                                    firstAmount++;
                                }
                                editingMainUserSettings.windows.button[buttonTypeFirst].animation.type[parseInt(positionIndex)].amount = firstAmount;
                                firstInputByIndex.value = firstAmount;
                            }

                            const deleteEmojiFirst = (el) => {
                                const positionIndex = el.currentTarget.dataset.index;
                                if (!positionIndex) return;
                                editingMainUserSettings.windows.button[buttonTypeFirst].animation.type.splice(parseInt(positionIndex), 1);
                                el.currentTarget.parentElement.remove();
                                if (editingMainUserSettings.windows.button[buttonTypeFirst].animation.type.length === 0) {
                                    editingMainUserSettings.windows.button[buttonTypeFirst].animation.status = false;
                                    showHideCopyPasteDeleteButtons();
                                }
                            }

                            const decrementEmojiAmountSecond = (el) => {
                                const positionIndex = el.currentTarget.dataset.index;
                                if (!positionIndex) return;
                                let secondAmount = editingMainUserSettings.windows.button[buttonTypeSecond].animation.type[parseInt(positionIndex)].amount;
                                let secondInputByIndex = document.querySelector(`.emojiAmountInputSecond[data-index="${positionIndex}"]`);
                                if (secondAmount > 1) {
                                    secondAmount--;
                                }
                                editingMainUserSettings.windows.button[buttonTypeSecond].animation.type[parseInt(positionIndex)].amount = secondAmount;
                                secondInputByIndex.value = secondAmount;
                            }

                            const incrementEmojiAmountSecond = (el) => {
                                const positionIndex = el.currentTarget.dataset.index;
                                if (!positionIndex) return;
                                let secondAmount = editingMainUserSettings.windows.button[buttonTypeSecond].animation.type[parseInt(positionIndex)].amount;
                                let secondInputByIndex = document.querySelector(`.emojiAmountInputSecond[data-index="${positionIndex}"]`);
                                if (secondAmount < 9) {
                                    secondAmount++;
                                }
                                editingMainUserSettings.windows.button[buttonTypeSecond].animation.type[parseInt(positionIndex)].amount = secondAmount;
                                secondInputByIndex.value = secondAmount;
                            }

                            const deleteEmojiSecond = (el) => {
                                const positionIndex = el.currentTarget.dataset.index;
                                if (!positionIndex) return;
                                editingMainUserSettings.windows.button[buttonTypeSecond].animation.type.splice(parseInt(positionIndex), 1);
                                el.currentTarget.parentElement.remove();
                                if (editingMainUserSettings.windows.button[buttonTypeSecond].animation.type.length === 0) {
                                    editingMainUserSettings.windows.button[buttonTypeSecond].animation.status = false;
                                    showHideCopyPasteDeleteButtons();
                                }
                            }

                            emojiAmountButtonDecrementFirst.forEach(button => {
                                button.addEventListener('click', decrementEmojiAmountFirst);
                            });
                            emojiAmountButtonIncrementFirst.forEach(button => {
                                button.addEventListener('click', incrementEmojiAmountFirst);
                            });
                            emojiAmountButtonDecrementSecond.forEach(button => {
                                button.addEventListener('click', decrementEmojiAmountSecond);
                            });
                            emojiAmountButtonIncrementSecond.forEach(button => {
                                button.addEventListener('click', incrementEmojiAmountSecond);
                            });
                            deleteFirst.forEach(button => {
                                button.addEventListener('click', deleteEmojiFirst);
                            });
                            deleteSecond.forEach(button => {
                                button.addEventListener('click', deleteEmojiSecond);
                            });
                        }
                        addEventListenersToEmojiList();
                    }
                    createUserAnimationEmojiList();

                    const addIconToRandomColorWindowsButtonBackgroundEl = () => {
                        const windowButtonsMenu = document.querySelectorAll('.windowButtonsMenu');
                        const windowButtonsSectionEl = document.getElementById('windowButtonsSection');
                        windowButtonsSectionEl.setAttribute('style', `--backgroundActiveColor: ${activeTabButtonsColor};--backgroundNotActiveColor: ${notActiveTabButtonsColor};`);
                        windowButtonsMenu.forEach(menu => {
                            if (menu.dataset.type === buttonsColorType) {
                                menu.style.backgroundColor = `rgb(${activeTabButtonsColor})`;
                                menu.dataset.active = true;
                            } else {
                                menu.style.backgroundColor = `rgb(${notActiveTabButtonsColor})`;
                                menu.dataset.active = false;
                            }
                        });
                        switch (buttonsColorType) {
                            case 'actions':
                                buttonTypeFirst = 'primary';
                                buttonTypeSecond = 'secondary';
                                break;
                            case 'alerts':
                                buttonTypeFirst = 'success';
                                buttonTypeSecond = 'danger';
                                break;
                            case 'notifications':
                                buttonTypeFirst = 'warning';
                                buttonTypeSecond = 'info';
                                break;
                            case 'neutrals':
                                buttonTypeFirst = 'light';
                                buttonTypeSecond = 'dark';
                                break;
                        }
                        updateColorisInputValue('windowButtonBackgroundColorPickerFirstInput', editingMainUserSettings.windows.button[buttonTypeFirst].backgroundColor, false, editingMainUserSettings.windows.window.backgroundColor);
                        updateColorisInputValue('windowButtonHoverBackgroundColorPickerFirstInput', editingMainUserSettings.windows.button[buttonTypeFirst].hoverBackgroundColor, false, editingMainUserSettings.windows.window.backgroundColor);
                        updateColorisInputValue('windowButtonBackgroundColorPickerSecondInput', editingMainUserSettings.windows.button[buttonTypeSecond].backgroundColor, false, editingMainUserSettings.windows.window.backgroundColor);
                        updateColorisInputValue('windowButtonHoverBackgroundColorPickerSecondInput', editingMainUserSettings.windows.button[buttonTypeSecond].hoverBackgroundColor, false, editingMainUserSettings.windows.window.backgroundColor);
                    }
                    addIconToRandomColorWindowsButtonBackgroundEl();

                    const loadDefaultValuesInButtonMenu = () => {
                        const exampleFirstButtonEl = document.getElementById('exampleFirstButton');
                        const exampleSecondButtonEl = document.getElementById('exampleSecondButton');
                        const addRandomColor = document.querySelectorAll('.addRandomColor');
                        addRandomColor.forEach(button => {
                            button.innerHTML = `<svg fill="${editingMainUserSettings.windows.button.primary.font.color}" width="25px" height="25px" viewBox="0 -4 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m24.983 8.539v-2.485h-4.902l-3.672 5.945-2.099 3.414-3.24 5.256c-.326.51-.889.844-1.53.845h-9.54v-3.568h8.538l3.673-5.946 2.099-3.414 3.24-5.256c.325-.509.886-.843 1.525-.845h5.904v-2.485l7.417 4.27-7.417 4.27z"/><path d="m12.902 6.316-.63 1.022-1.468 2.39-2.265-3.675h-8.538v-3.568h9.54c.641.001 1.204.335 1.526.838l.004.007 1.836 2.985z"/><path d="m24.983 24v-2.485h-5.904c-.639-.002-1.201-.336-1.521-.838l-.004-.007-1.836-2.985.63-1.022 1.468-2.39 2.264 3.675h4.902v-2.485l7.417 4.27-7.417 4.27z"/></svg>`
                            button.style.border = `1px solid ${checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff'}`;
                            button.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        });

                        exampleFirstButtonEl.style.border = `1px solid ${checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff'}`;
                        exampleFirstButtonEl.style.backgroundColor = editingMainUserSettings.windows.button[buttonTypeFirst].backgroundColor;
                        exampleSecondButtonEl.style.border = `1px solid ${checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff'}`;
                        exampleSecondButtonEl.style.backgroundColor = editingMainUserSettings.windows.button[buttonTypeSecond].backgroundColor;
                    }
                    loadDefaultValuesInButtonMenu();

                    const addEventListenersToWindowButtons = () => {
                        const windowButtonsMenu = document.querySelectorAll('.windowButtonsMenu');
                        const exampleFirstButtonEl = document.getElementById('exampleFirstButton');
                        const windowButtonBackgroundColorPickerFirstInputEl = document.getElementById('windowButtonBackgroundColorPickerFirstInput');
                        const addRandomBackgroundColorFirstEl = document.getElementById('addRandomBackgroundColorFirst');
                        const windowButtonHoverBackgroundColorPickerFirstInputEl = document.getElementById('windowButtonHoverBackgroundColorPickerFirstInput');
                        const addRandomButtonHoverBackgroundColorFirstEl = document.getElementById('addRandomButtonHoverBackgroundColorFirst');
                        const buttonAnimationListFirstEl = document.getElementById('buttonAnimationListFirst');
                        const copyEmojiListFirstEl = document.getElementById('copyEmojiListFirst');
                        const pasteEmojiListFirstEl = document.getElementById('pasteEmojiListFirst');
                        const deleteEmojiListFirstEl = document.getElementById('deleteEmojiListFirst');

                        const exampleSecondButtonEl = document.getElementById('exampleSecondButton');
                        const windowButtonBackgroundColorPickerSecondInputEl = document.getElementById('windowButtonBackgroundColorPickerSecondInput');
                        const addRandomBackgroundColorSecondEl = document.getElementById('addRandomBackgroundColorSecond');
                        const windowButtonHoverBackgroundColorPickerSecondInputEl = document.getElementById('windowButtonHoverBackgroundColorPickerSecondInput');
                        const addRandomButtonHoverBackgroundColorSecondEl = document.getElementById('addRandomButtonHoverBackgroundColorSecond');
                        const buttonAnimationListSecondEl = document.getElementById('buttonAnimationListSecond');
                        const copyEmojiListSecondEl = document.getElementById('copyEmojiListSecond');
                        const pasteEmojiListSecondEl = document.getElementById('pasteEmojiListSecond');
                        const deleteEmojiListSecondEl = document.getElementById('deleteEmojiListSecond');

                        const changeButtonsTabMenu = (event) => {
                            const menuType = event.target.dataset.type;
                            if (menuType === buttonsColorType) return;
                            buttonsColorType = menuType;
                            addIconToRandomColorWindowsButtonBackgroundEl();
                            createUserAnimationEmojiList();
                            loadDefaultValuesInButtonMenu();
                            updateWindowStyleButtonsSettingsTitlesUI();
                        }

                        const updateBackgroundColorForFirst = () => {
                            const hexColor = windowButtonBackgroundColorPickerFirstInputEl.value;
                            switch (buttonsColorType) {
                                case 'actions':
                                    editingMainUserSettings.windows.button.primary.backgroundColor = hexColor;
                                    break;
                                case 'alerts':
                                    editingMainUserSettings.windows.button.success.backgroundColor = hexColor;
                                    setStyleToSettingsWindow();
                                    break;
                                case 'notifications':
                                    editingMainUserSettings.windows.button.warning.backgroundColor = hexColor;
                                    break;
                                case 'neutrals':
                                    editingMainUserSettings.windows.button.light.backgroundColor = hexColor;
                                    break;
                            }
                            windowButtonBackgroundColorPickerFirstInputEl.style.backgroundColor = hexColor;
                            windowButtonBackgroundColorPickerFirstInputEl.style.color = checkIfColorBrightness(hexColor, 120) ? '#000000' : '#ffffff';
                            loadDefaultValuesInButtonMenu();
                        }

                        const generateRandomBackgroundColorForFirst = () => {
                            const hexColor = getRandomColor();
                            switch (buttonsColorType) {
                                case 'actions':
                                    editingMainUserSettings.windows.button.primary.backgroundColor = hexColor;
                                    break;
                                case 'alerts':
                                    editingMainUserSettings.windows.button.success.backgroundColor = hexColor;
                                    setStyleToSettingsWindow();
                                    break;
                                case 'notifications':
                                    editingMainUserSettings.windows.button.warning.backgroundColor = hexColor;
                                    break;
                                case 'neutrals':
                                    editingMainUserSettings.windows.button.light.backgroundColor = hexColor;
                                    break;
                            }
                            windowButtonBackgroundColorPickerFirstInputEl.value = hexColor;
                            windowButtonBackgroundColorPickerFirstInputEl.style.backgroundColor = hexColor;
                            windowButtonBackgroundColorPickerFirstInputEl.style.color = checkIfColorBrightness(hexColor, 120) ? '#000000' : '#ffffff';
                            loadDefaultValuesInButtonMenu();
                            animateElement('addRandomBackgroundColorFirst', editingMainUserSettings.windows.button.primary.animation);
                        }

                        const updateButtonHoverBackgroundColorForFirst = () => {
                            const hexColor = windowButtonHoverBackgroundColorPickerFirstInputEl.value;
                            switch (buttonsColorType) {
                                case 'actions':
                                    editingMainUserSettings.windows.button.primary.hoverBackgroundColor = hexColor;
                                    break;
                                case 'alerts':
                                    editingMainUserSettings.windows.button.success.hoverBackgroundColor = hexColor;
                                    break;
                                case 'notifications':
                                    editingMainUserSettings.windows.button.warning.hoverBackgroundColor = hexColor;
                                    break;
                                case 'neutrals':
                                    editingMainUserSettings.windows.button.light.hoverBackgroundColor = hexColor;
                                    break;
                            }
                            windowButtonHoverBackgroundColorPickerFirstInputEl.value = hexColor;
                            windowButtonHoverBackgroundColorPickerFirstInputEl.style.backgroundColor = hexColor;
                            windowButtonHoverBackgroundColorPickerFirstInputEl.style.color = checkIfColorBrightness(hexColor, 120) ? '#000000' : '#ffffff';
                            loadDefaultValuesInButtonMenu();
                        }

                        const generateRandomButtonHoverBackgroundColorForFirst = () => {
                            const hexColor = getRandomColor();
                            addRandomButtonHoverBackgroundColorFirstEl.style.backgroundColor = hexColor;
                            switch (buttonsColorType) {
                                case 'actions':
                                    editingMainUserSettings.windows.button.primary.hoverBackgroundColor = hexColor;
                                    break;
                                case 'alerts':
                                    editingMainUserSettings.windows.button.success.hoverBackgroundColor = hexColor;
                                    break;
                                case 'notifications':
                                    editingMainUserSettings.windows.button.warning.hoverBackgroundColor = hexColor;
                                    break;
                                case 'neutrals':
                                    editingMainUserSettings.windows.button.light.hoverBackgroundColor = hexColor;
                                    break;
                            }
                            windowButtonHoverBackgroundColorPickerFirstInputEl.value = hexColor;
                            windowButtonHoverBackgroundColorPickerFirstInputEl.style.backgroundColor = hexColor;
                            windowButtonHoverBackgroundColorPickerFirstInputEl.style.color = checkIfColorBrightness(hexColor, 120) ? '#000000' : '#ffffff';
                            loadDefaultValuesInButtonMenu();
                            animateElement('addRandomButtonHoverBackgroundColorFirst', editingMainUserSettings.windows.button.primary.animation);
                        }

                        const updateButtonAnimationForFirst = () => {
                            showEmojiPicker('showEmojiPickerFirst')
                                .then(selectedEmoji => {
                                    if (editingMainUserSettings.windows.button[buttonTypeFirst].animation.type.length >= 8 || !selectedEmoji) { return; };
                                    editingMainUserSettings.windows.button[buttonTypeFirst].animation.status = true;
                                    editingMainUserSettings.windows.button[buttonTypeFirst].animation.type.push(
                                        {
                                            native: selectedEmoji.native,
                                            amount: 1,
                                        }
                                    );
                                    createUserAnimationEmojiList();
                                })
                                .catch(error => {
                                    console.error('Error:', error);
                                });
                        }

                        const showExampleFirstButtonAnimation = (el) => {
                            animateElement(el.target, editingMainUserSettings.windows.button[buttonTypeFirst].animation);
                        }

                        const showExampleFirstButtonMouseEnter = (el) => {
                            switch (buttonsColorType) {
                                case 'actions':
                                    el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                                    break;
                                case 'alerts':
                                    el.target.style.backgroundColor = editingMainUserSettings.windows.button.success.hoverBackgroundColor;
                                    break;
                                case 'notifications':
                                    el.target.style.backgroundColor = editingMainUserSettings.windows.button.warning.hoverBackgroundColor;
                                    break;
                                case 'neutrals':
                                    el.target.style.backgroundColor = editingMainUserSettings.windows.button.light.hoverBackgroundColor;
                                    break;
                            }
                        }

                        const showExampleFirstButtonMouseLeave = (el) => {
                            switch (buttonsColorType) {
                                case 'actions':
                                    el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                                    break;
                                case 'alerts':
                                    el.target.style.backgroundColor = editingMainUserSettings.windows.button.success.backgroundColor;
                                    break;
                                case 'notifications':
                                    el.target.style.backgroundColor = editingMainUserSettings.windows.button.warning.backgroundColor;
                                    break;
                                case 'neutrals':
                                    el.target.style.backgroundColor = editingMainUserSettings.windows.button.light.backgroundColor;
                                    break;
                            }
                        }

                        const copyEmojiFromFirstList = () => {
                            if (editingMainUserSettings.windows.button[buttonTypeFirst].animation.type.length === 0) { console.error('NO list'); return; }
                            animationEmojiBuffer = editingMainUserSettings.windows.button[buttonTypeFirst].animation.type;
                            showHideCopyPasteDeleteButtons();
                            showMessageToastify('success', '', `Successfully copied from ${capitalizeString(buttonTypeFirst)}`, 2000, false, 'bottom', 'right', true, false);
                        }

                        const pasteEmojiToFirstList = () => {
                            if (animationEmojiBuffer.length === 0) { console.error('NO list'); return; }
                            editingMainUserSettings.windows.button[buttonTypeFirst].animation.type = animationEmojiBuffer;
                            animationEmojiBuffer = [];
                            createUserAnimationEmojiList();
                            showMessageToastify('success', '', `Successfully replace the ${capitalizeString(buttonTypeFirst)}`, 2000, false, 'bottom', 'right', true, false);
                        }

                        const deleteEmojiFromFirstList = () => {
                            if (editingMainUserSettings.windows.button[buttonTypeFirst].animation.type.length === 0) { console.error('NO list'); return; }
                            editingMainUserSettings.windows.button[buttonTypeFirst].animation.status = false;
                            editingMainUserSettings.windows.button[buttonTypeFirst].animation.type = [];
                            createUserAnimationEmojiList();
                            showMessageToastify('success', '', `Successfully deleted from ${capitalizeString(buttonTypeFirst)}`, 2000, false, 'bottom', 'right', true, false);
                        }

                        const updateBackgroundColorForSecond = () => {
                            const hexColor = windowButtonBackgroundColorPickerSecondInputEl.value;
                            switch (buttonsColorType) {
                                case 'actions':
                                    editingMainUserSettings.windows.button.secondary.backgroundColor = hexColor;
                                    break;
                                case 'alerts':
                                    editingMainUserSettings.windows.button.danger.backgroundColor = hexColor;
                                    setStyleToSettingsWindow();
                                    break;
                                case 'notifications':
                                    editingMainUserSettings.windows.button.info.backgroundColor = hexColor;
                                    break;
                                case 'neutrals':
                                    editingMainUserSettings.windows.button.dark.backgroundColor = hexColor;
                                    break;
                            }
                            windowButtonBackgroundColorPickerSecondInputEl.style.backgroundColor = hexColor;
                            windowButtonBackgroundColorPickerSecondInputEl.style.color = checkIfColorBrightness(hexColor, 120) ? '#000000' : '#ffffff';
                            loadDefaultValuesInButtonMenu();
                        }

                        const generateRandomBackgroundColorForSecond = () => {
                            const hexColor = getRandomColor();
                            switch (buttonsColorType) {
                                case 'actions':
                                    editingMainUserSettings.windows.button.secondary.backgroundColor = hexColor;
                                    break;
                                case 'alerts':
                                    editingMainUserSettings.windows.button.danger.backgroundColor = hexColor;
                                    setStyleToSettingsWindow();
                                    break;
                                case 'notifications':
                                    editingMainUserSettings.windows.button.info.backgroundColor = hexColor;
                                    break;
                                case 'neutrals':
                                    editingMainUserSettings.windows.button.dark.backgroundColor = hexColor;
                                    break;
                            }
                            windowButtonBackgroundColorPickerSecondInputEl.value = hexColor;
                            windowButtonBackgroundColorPickerSecondInputEl.style.backgroundColor = hexColor;
                            windowButtonBackgroundColorPickerSecondInputEl.style.color = checkIfColorBrightness(hexColor, 120) ? '#000000' : '#ffffff';
                            loadDefaultValuesInButtonMenu();
                            animateElement('addRandomBackgroundColorSecond', editingMainUserSettings.windows.button.primary.animation);
                        }

                        const updateButtonHoverBackgroundColorForSecond = () => {
                            const hexColor = windowButtonHoverBackgroundColorPickerSecondInputEl.value;
                            switch (buttonsColorType) {
                                case 'actions':
                                    editingMainUserSettings.windows.button.secondary.hoverBackgroundColor = hexColor;
                                    break;
                                case 'alerts':
                                    editingMainUserSettings.windows.button.danger.hoverBackgroundColor = hexColor;
                                    break;
                                case 'notifications':
                                    editingMainUserSettings.windows.button.info.hoverBackgroundColor = hexColor;
                                    break;
                                case 'neutrals':
                                    editingMainUserSettings.windows.button.dark.hoverBackgroundColor = hexColor;
                                    break;
                            }
                            windowButtonHoverBackgroundColorPickerSecondInputEl.style.backgroundColor = hexColor;
                            windowButtonHoverBackgroundColorPickerSecondInputEl.style.color = checkIfColorBrightness(hexColor, 120) ? '#000000' : '#ffffff';
                            loadDefaultValuesInButtonMenu();
                        }

                        const generateRandomButtonHoverBackgroundColorForSecond = () => {
                            const hexColor = getRandomColor();
                            switch (buttonsColorType) {
                                case 'actions':
                                    editingMainUserSettings.windows.button.secondary.hoverBackgroundColor = hexColor;
                                    break;
                                case 'alerts':
                                    editingMainUserSettings.windows.button.danger.hoverBackgroundColor = hexColor;
                                    break;
                                case 'notifications':
                                    editingMainUserSettings.windows.button.info.hoverBackgroundColor = hexColor;
                                    break;
                                case 'neutrals':
                                    editingMainUserSettings.windows.button.dark.hoverBackgroundColor = hexColor;
                                    break;
                            }
                            windowButtonHoverBackgroundColorPickerSecondInputEl.value = hexColor;
                            windowButtonHoverBackgroundColorPickerSecondInputEl.style.backgroundColor = hexColor;
                            windowButtonHoverBackgroundColorPickerSecondInputEl.style.color = checkIfColorBrightness(hexColor, 120) ? '#000000' : '#ffffff';
                            loadDefaultValuesInButtonMenu();
                            animateElement('addRandomButtonHoverBackgroundColorSecond', editingMainUserSettings.windows.button.primary.animation);
                        }

                        const showExampleSecondButtonAnimation = (el) => {
                            animateElement(el.target, editingMainUserSettings.windows.button[buttonTypeSecond].animation);
                        }

                        const showExampleSecondButtonMouseEnter = (el) => {
                            switch (buttonsColorType) {
                                case 'actions':
                                    el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.hoverBackgroundColor;
                                    break;
                                case 'alerts':
                                    el.target.style.backgroundColor = editingMainUserSettings.windows.button.danger.hoverBackgroundColor;
                                    break;
                                case 'notifications':
                                    el.target.style.backgroundColor = editingMainUserSettings.windows.button.info.hoverBackgroundColor;
                                    break;
                                case 'neutrals':
                                    el.target.style.backgroundColor = editingMainUserSettings.windows.button.dark.hoverBackgroundColor;
                                    break;
                            }
                        }

                        const showExampleSecondButtonMouseLeave = (el) => {
                            switch (buttonsColorType) {
                                case 'actions':
                                    el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                                    break;
                                case 'alerts':
                                    el.target.style.backgroundColor = editingMainUserSettings.windows.button.danger.backgroundColor;
                                    break;
                                case 'notifications':
                                    el.target.style.backgroundColor = editingMainUserSettings.windows.button.info.backgroundColor;
                                    break;
                                case 'neutrals':
                                    el.target.style.backgroundColor = editingMainUserSettings.windows.button.dark.backgroundColor;
                                    break;
                            }
                        }

                        const updateButtonAnimationForSecond = () => {
                            showEmojiPicker('showEmojiPickerSecond')
                                .then(selectedEmoji => {
                                    if (editingMainUserSettings.windows.button[buttonTypeSecond].animation.type.length >= 8 || !selectedEmoji) { return; };
                                    editingMainUserSettings.windows.button[buttonTypeSecond].animation.status = true;
                                    editingMainUserSettings.windows.button[buttonTypeSecond].animation.type.push(
                                        {
                                            native: selectedEmoji.native,
                                            amount: 1,
                                        }
                                    );
                                    createUserAnimationEmojiList();
                                })
                                .catch(error => {
                                    console.error('Error:', error);
                                });
                        }

                        const copyEmojiFromSecondList = () => {
                            if (editingMainUserSettings.windows.button[buttonTypeSecond].animation.type.length === 0) { console.error('NO list'); return; }
                            animationEmojiBuffer = editingMainUserSettings.windows.button[buttonTypeSecond].animation.type;
                            showHideCopyPasteDeleteButtons();
                            showMessageToastify('success', '', `Successfully copied from ${capitalizeString(buttonTypeSecond)}`, 2000, false, 'bottom', 'right', true, false);
                        }

                        const pasteEmojiToSecondList = () => {
                            if (animationEmojiBuffer.length === 0) { console.error('NO list'); return; }
                            editingMainUserSettings.windows.button[buttonTypeSecond].animation.type = animationEmojiBuffer;
                            animationEmojiBuffer = [];
                            createUserAnimationEmojiList();
                            showMessageToastify('success', '', `Successfully replace the ${capitalizeString(buttonTypeSecond)}`, 2000, false, 'bottom', 'right', true, false);
                        }

                        const deleteEmojiFromSecondList = () => {
                            if (editingMainUserSettings.windows.button[buttonTypeSecond].animation.type.length === 0) { console.error('NO list'); return; }
                            editingMainUserSettings.windows.button[buttonTypeSecond].animation.status = false;
                            editingMainUserSettings.windows.button[buttonTypeSecond].animation.type = [];
                            createUserAnimationEmojiList();
                            showMessageToastify('success', '', `Successfully deleted from ${capitalizeString(buttonTypeSecond)}`, 2000, false, 'bottom', 'right', true, false);
                        }

                        const addRandomColorFirstMouseEnter = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                        }

                        const addRandomColorFirstMouseLeave = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        }

                        windowButtonsMenu.forEach(menu => { menu.addEventListener('click', changeButtonsTabMenu); });
                        exampleFirstButtonEl.addEventListener('click', showExampleFirstButtonAnimation);
                        exampleFirstButtonEl.addEventListener('mouseenter', showExampleFirstButtonMouseEnter);
                        exampleFirstButtonEl.addEventListener('mouseleave', showExampleFirstButtonMouseLeave);
                        windowButtonBackgroundColorPickerFirstInputEl.addEventListener('input', updateBackgroundColorForFirst);
                        addRandomBackgroundColorFirstEl.addEventListener('click', generateRandomBackgroundColorForFirst);
                        addRandomBackgroundColorFirstEl.addEventListener('mouseenter', addRandomColorFirstMouseEnter);
                        addRandomBackgroundColorFirstEl.addEventListener('mouseleave', addRandomColorFirstMouseLeave);
                        windowButtonHoverBackgroundColorPickerFirstInputEl.addEventListener('input', updateButtonHoverBackgroundColorForFirst);
                        addRandomButtonHoverBackgroundColorFirstEl.addEventListener('click', generateRandomButtonHoverBackgroundColorForFirst);
                        addRandomButtonHoverBackgroundColorFirstEl.addEventListener('mouseenter', addRandomColorFirstMouseEnter);
                        addRandomButtonHoverBackgroundColorFirstEl.addEventListener('mouseleave', addRandomColorFirstMouseLeave);
                        buttonAnimationListFirstEl.addEventListener('click', updateButtonAnimationForFirst);
                        copyEmojiListFirstEl.addEventListener('click', copyEmojiFromFirstList);
                        pasteEmojiListFirstEl.addEventListener('click', pasteEmojiToFirstList);
                        deleteEmojiListFirstEl.addEventListener('click', deleteEmojiFromFirstList);

                        exampleSecondButtonEl.addEventListener('click', showExampleSecondButtonAnimation);
                        exampleSecondButtonEl.addEventListener('mouseenter', showExampleSecondButtonMouseEnter);
                        exampleSecondButtonEl.addEventListener('mouseleave', showExampleSecondButtonMouseLeave);
                        windowButtonBackgroundColorPickerSecondInputEl.addEventListener('input', updateBackgroundColorForSecond);
                        addRandomBackgroundColorSecondEl.addEventListener('click', generateRandomBackgroundColorForSecond);
                        addRandomBackgroundColorSecondEl.addEventListener('mouseenter', addRandomColorFirstMouseEnter);
                        addRandomBackgroundColorSecondEl.addEventListener('mouseleave', addRandomColorFirstMouseLeave);
                        windowButtonHoverBackgroundColorPickerSecondInputEl.addEventListener('input', updateButtonHoverBackgroundColorForSecond);
                        addRandomButtonHoverBackgroundColorSecondEl.addEventListener('click', generateRandomButtonHoverBackgroundColorForSecond);
                        addRandomButtonHoverBackgroundColorSecondEl.addEventListener('mouseenter', addRandomColorFirstMouseEnter);
                        addRandomButtonHoverBackgroundColorSecondEl.addEventListener('mouseleave', addRandomColorFirstMouseLeave);
                        buttonAnimationListSecondEl.addEventListener('click', updateButtonAnimationForSecond);
                        copyEmojiListSecondEl.addEventListener('click', copyEmojiFromSecondList);
                        pasteEmojiListSecondEl.addEventListener('click', pasteEmojiToSecondList);
                        deleteEmojiListSecondEl.addEventListener('click', deleteEmojiFromSecondList);
                    }
                    addEventListenersToWindowButtons();
                    break;
                case 'windowButtonsFont':
                    let buttonsFontType = 'actions';
                    const activeTabButtonsFont = hexToRGB(colorPalette[2]);
                    const notActiveTabButtonsFont = hexToRGB(colorPalette[1]);
                    let fontButtonTypeFirst = '';
                    let fontButtonTypeSecond = '';
                    const fontWeightArray = ['normal', 'lighter', 'bold', 'bolder', '100', '200', '300', '400', '500', '600', '700', '800', '900', 'unset', 'inherit'];
                    const fontStyleArray = ['normal', 'italic', 'inherit'];
                    settingsWindowRightSectionHtml = `
                        <div id="windowButtonsSection">
                            <div id="windowButtonsMenuSection">
                                <buttons class="windowButtonsMenu" id="windowButtonsActionsMenu" data-type="actions" data-active="true">Actions</buttons>
                                <buttons class="windowButtonsMenu" id="windowButtonsAlertsMenu" data-type="alerts" data-active="false">Alerts</buttons>
                                <buttons class="windowButtonsMenu" id="windowButtonsNotificationsMenu" data-type="notifications" data-active="false">Notifications</buttons>
                                <buttons class="windowButtonsMenu" id="windowButtonsNeutralsMenu" data-type="neutrals" data-active="false">Neutrals</buttons>
                            </div>
                            <div id="windowButtonsMenuOptionsSection">
                                <div id="windowButtonsMenuOptionsFirstSection">
                                    <label class="windowButtonColorTitle" id="windowButtonFontColorFirstTitle">Primary Button:</label>
                                    <div class="buttonStyleExample">
                                        <button class="exampleButton" id="exampleFirstButton"></button>
                                    </div>
                                    <div class="windowButtonColorPickerSection">
                                        <label class="windowButtonColorPickerInputTitle" id="windowButtonFontColorPickerInputFirstTitle">Choose Font Color:</label>
                                        <div class="windowButtonColorPickerInputSection">
                                            <input type="text" class="windowButtonColorPickerInput" id="windowButtonFontColorPickerFirstInput" data-coloris="" readonly="readonly">
                                            <button class="addRandomColor" id="addRandomFontColorFirst"></button>
                                        </div>
                                    </div>
                                    <div class="windowButtonsFontSizeSection">
                                        <label class="windowButtonsFontSizeRangeInputTitle" for="windowButtonsFontSizeRangeInput" id="windowButtonsFontSizeRangeInputFirstTitle">Size:</label>
                                        <input type="range" id="windowButtonsFontSizeRangeInputFirst" min="10" max="20" step="1" value="20">
                                        <div class="windowButtonsFontSizeRangeInputOutput">
                                            <output id="windowButtonsFontSizeRangeInputValueFirst">0</output>
                                        </div>
                                    </div>
                                    <div class="windowButtonsFontFamilyStyleWeight">
                                        <div class="buttonsFontFamily">
                                            <label id="buttonsFontFamilyFirstTitle">Font Family:</label>
                                            <button id="buttonsFontFamilyFirst">
                                                <div id="buttonsFontFamilyFirstButtonTitle"></div>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960"><path d="M400-280v-400l200 200z"/></svg>
                                                <div id="buttonsFontFamilyFirstMenu"></div>
                                            </button>
                                        </div>
                                        <div class="buttonsFontStyle">
                                            <label id="buttonsFontStyleFirstTitle">Font Style:</label>
                                            <button id="buttonsFontStyleFirst">
                                                <div id="buttonsFontStyleFirstButtonTitle"></div>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960"><path d="M400-280v-400l200 200z"/></svg>
                                                <div id="buttonsFontStyleFirstMenu"></div>
                                            </button>
                                        </div>
                                        <div class="buttonsFontWeight">
                                            <label id="buttonsFontWeightFirstTitle">Font Weight:</label>
                                            <button id="buttonsFontWeightFirst">
                                                <div id="buttonsFontWeightFirstButtonTitle"></div>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960"><path d="M400-280v-400l200 200z"/></svg>
                                                <div id="buttonsFontWeightFirstMenu"></div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div id="windowButtonsMenuOptionsSecondSection">
                                    <label class="windowButtonColorTitle" id="windowButtonFontColorSecondTitle">Secondary Button:</label>
                                    <div class="buttonStyleExample">
                                        <button class="exampleButton" id="exampleSecondButton"></button>
                                    </div>
                                    <div class="windowButtonColorPickerSection">
                                        <label class="windowButtonColorPickerInputTitle" id="windowButtonFontColorPickerInputSecondTitle">Choose Font Color:</label>
                                        <div class="windowButtonColorPickerInputSection">
                                            <input type="text" class="windowButtonColorPickerInput" id="windowButtonFontColorPickerSecondInput" data-coloris="" readonly="readonly">
                                            <button class="addRandomColor" id="addRandomFontColorSecond"></button>
                                        </div>
                                    </div>
                                    <div class="windowButtonsFontSizeSection">
                                        <label class="windowButtonsFontSizeRangeInputTitle" for="windowButtonsFontSizeRangeInput" id="windowButtonsFontSizeRangeInputSecondTitle">Size:</label>
                                        <input type="range" id="windowButtonsFontSizeRangeInputSecond" min="10" max="20" step="1" value="20">
                                        <div class="windowButtonsFontSizeRangeInputOutput">
                                            <output id="windowButtonsFontSizeRangeInputValueSecond">0</output>
                                        </div>
                                    </div>
                                    <div class="windowButtonsFontFamilyStyleWeight">
                                        <div class="buttonsFontFamily">
                                            <label id="buttonsFontFamilySecondTitle">Font Family:</label>
                                            <button id="buttonsFontFamilySecond">
                                                <div id="buttonsFontFamilySecondButtonTitle"></div>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960"><path d="M400-280v-400l200 200z"/></svg>
                                                <div id="buttonsFontFamilySecondMenu"></div>
                                            </button>
                                        </div>
                                        <div class="buttonsFontStyle">
                                            <label id="buttonsFontStyleSecondTitle">Font Style:</label>
                                            <button id="buttonsFontStyleSecond">
                                                <div id="buttonsFontStyleSecondButtonTitle"></div>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960"><path d="M400-280v-400l200 200z"/></svg>
                                                <div id="buttonsFontStyleSecondMenu"></div>
                                            </button>
                                        </div>
                                        <div class="buttonsFontWeight">
                                            <label id="buttonsFontWeightSecondTitle">Font Weight:</label>
                                            <button id="buttonsFontWeightSecond">
                                                <div id="buttonsFontWeightSecondButtonTitle"></div>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960"><path d="M400-280v-400l200 200z"/></svg>
                                                <div id="buttonsFontWeightSecondMenu"></div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    settingsWindowRightSectionEl.innerHTML = settingsWindowRightSectionHtml;

                    const updateWindowStyleButtonsFontSettingsTitlesUI = () => {
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

                        fontButtonTypeFirst = '';
                        fontButtonTypeSecond = '';
                        switch (buttonsFontType) {
                            case 'actions':
                                fontButtonTypeFirst = 'primary';
                                fontButtonTypeSecond = 'secondary';
                                break;
                            case 'alerts':
                                fontButtonTypeFirst = 'success';
                                fontButtonTypeSecond = 'danger';
                                break;
                            case 'notifications':
                                fontButtonTypeFirst = 'warning';
                                fontButtonTypeSecond = 'info';
                                break;
                            case 'neutrals':
                                fontButtonTypeFirst = 'light';
                                fontButtonTypeSecond = 'dark';
                                break;
                        }

                        // Mapping of element IDs to their corresponding text values
                        const titlesToUpdate = {
                            windowButtonsActionsMenu: {
                                id: 'windowButtonsActionsMenu',
                                text: languageObject._windowStyle._windowButtonsFont._actions._data,
                                classNames: []
                            },
                            windowButtonsAlertsMenu: {
                                id: 'windowButtonsAlertsMenu',
                                text: languageObject._windowStyle._windowButtonsFont._alerts._data,
                                classNames: []
                            },
                            windowButtonsNotificationsMenu: {
                                id: 'windowButtonsNotificationsMenu',
                                text: languageObject._windowStyle._windowButtonsFont._notifications._data,
                                classNames: []
                            },
                            windowButtonsNeutralsMenu: {
                                id: 'windowButtonsNeutralsMenu',
                                text: languageObject._windowStyle._windowButtonsFont._neutrals._data,
                                classNames: []
                            },
                            windowButtonFontColorFirstTitle: {
                                id: 'windowButtonFontColorFirstTitle',
                                text: languageObject._windowStyle._windowButtonsFont[`_${buttonsFontType}`][[`_${fontButtonTypeFirst}`]][[`${fontButtonTypeFirst}Button`]],
                                classNames: []
                            },
                            windowButtonFontColorPickerInputFirstTitle: {
                                id: 'windowButtonFontColorPickerInputFirstTitle',
                                text: languageObject._windowStyle._windowButtonsFont[`_${buttonsFontType}`][[`_${fontButtonTypeFirst}`]].chooseColor,
                                classNames: []
                            },
                            windowButtonsFontSizeRangeInputFirstTitle: {
                                id: 'windowButtonsFontSizeRangeInputFirstTitle',
                                text: languageObject._windowStyle._windowButtonsFont[`_${buttonsFontType}`][[`_${fontButtonTypeFirst}`]].chooseSize,
                                classNames: []
                            },
                            buttonsFontFamilyFirstTitle: {
                                id: 'buttonsFontFamilyFirstTitle',
                                text: languageObject._windowStyle._windowButtonsFont[`_${buttonsFontType}`][[`_${fontButtonTypeFirst}`]].fontFamily,
                                classNames: []
                            },
                            buttonsFontStyleFirstTitle: {
                                id: 'buttonsFontStyleFirstTitle',
                                text: languageObject._windowStyle._windowButtonsFont[`_${buttonsFontType}`][[`_${fontButtonTypeFirst}`]].fontStyle,
                                classNames: []
                            },
                            buttonsFontWeightFirstTitle: {
                                id: 'buttonsFontWeightFirstTitle',
                                text: languageObject._windowStyle._windowButtonsFont[`_${buttonsFontType}`][[`_${fontButtonTypeFirst}`]].fontWeight,
                                classNames: []
                            },
                            exampleFirstButton: {
                                id: 'exampleFirstButton',
                                text: languageObject._windowStyle._windowButtonsFont[`_${buttonsFontType}`][[`_${fontButtonTypeFirst}`]][fontButtonTypeFirst],
                                classNames: []
                            },
                            windowButtonFontColorSecondTitle: {
                                id: 'windowButtonFontColorSecondTitle',
                                text: languageObject._windowStyle._windowButtonsFont[`_${buttonsFontType}`][[`_${fontButtonTypeSecond}`]][[`${fontButtonTypeSecond}Button`]],
                                classNames: []
                            },
                            windowButtonFontColorPickerInputSecondTitle: {
                                id: 'windowButtonFontColorPickerInputSecondTitle',
                                text: languageObject._windowStyle._windowButtonsFont[`_${buttonsFontType}`][[`_${fontButtonTypeSecond}`]].chooseColor,
                                classNames: []
                            },
                            windowButtonsFontSizeRangeInputSecondTitle: {
                                id: 'windowButtonsFontSizeRangeInputSecondTitle',
                                text: languageObject._windowStyle._windowButtonsFont[`_${buttonsFontType}`][[`_${fontButtonTypeSecond}`]].chooseSize,
                                classNames: []
                            },
                            buttonsFontFamilySecondTitle: {
                                id: 'buttonsFontFamilySecondTitle',
                                text: languageObject._windowStyle._windowButtonsFont[`_${buttonsFontType}`][[`_${fontButtonTypeSecond}`]].fontFamily,
                                classNames: []
                            },
                            buttonsFontStyleSecondTitle: {
                                id: 'buttonsFontStyleSecondTitle',
                                text: languageObject._windowStyle._windowButtonsFont[`_${buttonsFontType}`][[`_${fontButtonTypeSecond}`]].fontStyle,
                                classNames: []
                            },
                            buttonsFontWeightSecondTitle: {
                                id: 'buttonsFontWeightSecondTitle',
                                text: languageObject._windowStyle._windowButtonsFont[`_${buttonsFontType}`][[`_${fontButtonTypeSecond}`]].fontWeight,
                                classNames: []
                            },
                            exampleSecondButton: {
                                id: 'exampleSecondButton',
                                text: languageObject._windowStyle._windowButtonsFont[`_${buttonsFontType}`][[`_${fontButtonTypeSecond}`]][fontButtonTypeSecond],
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
                    updateWindowStyleButtonsFontSettingsTitlesUI();

                    const addIconToRandomColorWindowsButtonFontEl = () => {
                        const windowButtonsMenu = document.querySelectorAll('.windowButtonsMenu');
                        const windowButtonsSectionEl = document.getElementById('windowButtonsSection');
                        windowButtonsSectionEl.setAttribute('style', `--backgroundActiveColor: ${activeTabButtonsFont};--backgroundNotActiveColor: ${notActiveTabButtonsFont};`);
                        windowButtonsMenu.forEach(menu => {
                            if (menu.dataset.type === buttonsFontType) {
                                menu.style.backgroundColor = `rgb(${activeTabButtonsFont})`;
                                menu.dataset.active = true;
                            } else {
                                menu.style.backgroundColor = `rgb(${notActiveTabButtonsFont})`;
                                menu.dataset.active = false;
                            }
                        });
                        updateColorisInputValue('windowButtonFontColorPickerFirstInput', editingMainUserSettings.windows.button[fontButtonTypeFirst].font.color, false, editingMainUserSettings.windows.window.backgroundColor);
                        updateColorisInputValue('windowButtonFontColorPickerSecondInput', editingMainUserSettings.windows.button[fontButtonTypeSecond].font.color, false, editingMainUserSettings.windows.window.backgroundColor);
                    }
                    addIconToRandomColorWindowsButtonFontEl();

                    const createFontFamilyWeightStyleFirstMenus = () => {
                        const createFontFamilyMenuFirst = () => {
                            const exampleFirstButtonEl = document.getElementById('exampleFirstButton');
                            const buttonsFontFamilyFirstEl = document.getElementById('buttonsFontFamilyFirst');
                            const buttonsFontFamilyFirstButtonTitleEl = document.getElementById('buttonsFontFamilyFirstButtonTitle');
                            const buttonsFontFamilyFirstMenuEl = document.getElementById('buttonsFontFamilyFirstMenu');
                            const familyOSArrayObject = getSupportedFontFamilies();
                            let html = '';

                            buttonsFontFamilyFirstEl.style.backgroundColor = colorPalette[3];
                            const familyObject = familyOSArrayObject.find(family => family.fontFamily === editingMainUserSettings.windows.button[fontButtonTypeFirst].font.fontFamily);
                            buttonsFontFamilyFirstButtonTitleEl.innerText = familyObject.fontFamily;
                            buttonsFontFamilyFirstMenuEl.style.backgroundColor = colorPalette[2];

                            familyOSArrayObject.forEach(font => {
                                html += `<span class="fontFamilyFirst" data-family="${font.fontFamily}">${font.fontFamily}</span>`;
                            });

                            buttonsFontFamilyFirstMenuEl.innerHTML = html;
                            const fontFamily = document.querySelectorAll('.fontFamilyFirst');

                            const showButtonsFontFamilyFirstMenu = () => {
                                const status = buttonsFontFamilyFirstMenuEl.style.display;
                                if (status === 'none') {
                                    buttonsFontFamilyFirstMenuEl.style.display = 'flex';
                                } else {
                                    buttonsFontFamilyFirstMenuEl.style.display = 'none';
                                }
                            }

                            const hidesButtonsFontFamilyFirstMenu = () => {
                                buttonsFontFamilyFirstMenuEl.style.display = 'none';
                            }

                            const changeFontFamilyFirst = (el) => {
                                const familyValue = el.target.dataset.family;
                                const familyObject = familyOSArrayObject.find(family => family.fontFamily === familyValue);
                                buttonsFontFamilyFirstButtonTitleEl.innerText = familyValue;
                                const fontFamily = 'inherit' ? familyObject.fontFamily : `"${familyObject.fontFamily}", ${familyObject.genericFontName}`;
                                exampleFirstButtonEl.style.fontFamily = fontFamily;
                                editingMainUserSettings.windows.button[fontButtonTypeFirst].font.fontFamily = fontFamily;
                                buttonsFontFamilyFirstMenuEl.style.display = 'none';
                                if (buttonsFontType === 'alerts') { setStyleToSettingsWindow(); }
                            }

                            const mouseEnterFontFamilyFirst = (el) => {
                                el.target.style.backgroundColor = colorPalette[1];
                            }

                            const mouseLeaveFontFamilyFirst = (el) => {
                                el.target.style.backgroundColor = colorPalette[2];
                            }

                            buttonsFontFamilyFirstEl.addEventListener('click', showButtonsFontFamilyFirstMenu);
                            buttonsFontFamilyFirstEl.addEventListener('mouseleave', hidesButtonsFontFamilyFirstMenu);
                            fontFamily.forEach(menu => {
                                menu.addEventListener('click', changeFontFamilyFirst);
                                menu.addEventListener('mouseover', mouseEnterFontFamilyFirst);
                                menu.addEventListener('mouseleave', mouseLeaveFontFamilyFirst);
                            });
                        }
                        createFontFamilyMenuFirst();

                        const createFontStyleMenuFirst = () => {
                            const exampleFirstButtonEl = document.getElementById('exampleFirstButton');
                            const buttonsFontStyleFirstEl = document.getElementById('buttonsFontStyleFirst');
                            const buttonsFontStyleFirstButtonTitleEl = document.getElementById('buttonsFontStyleFirstButtonTitle');
                            const buttonsFontStyleFirstMenuEl = document.getElementById('buttonsFontStyleFirstMenu');
                            let html = '';

                            buttonsFontStyleFirstMenuEl.style.backgroundColor = colorPalette[3];
                            buttonsFontStyleFirstButtonTitleEl.innerText = editingMainUserSettings.windows.button[fontButtonTypeFirst].font.fontStyle;
                            buttonsFontStyleFirstEl.style.backgroundColor = colorPalette[2];

                            fontStyleArray.forEach(font => {
                                html += `<span class="fontStyleFirst" data-style="${font}">${font}</span>`;
                            });
                            buttonsFontStyleFirstMenuEl.innerHTML = html;
                            const fontStyle = document.querySelectorAll('.fontStyleFirst');

                            const showButtonsFontStyleFirstMenu = () => {
                                const status = buttonsFontStyleFirstMenuEl.style.display;
                                if (status === 'none') {
                                    buttonsFontStyleFirstMenuEl.style.display = 'flex';
                                } else {
                                    buttonsFontStyleFirstMenuEl.style.display = 'none';
                                }
                            }

                            const hidesButtonsFontStyleFirstMenu = () => {
                                buttonsFontStyleFirstMenuEl.style.display = 'none';
                            }

                            const changeFontStyleFirst = (el) => {
                                const styleValue = el.originalTarget.dataset.style;
                                buttonsFontStyleFirstButtonTitleEl.innerText = styleValue;
                                exampleFirstButtonEl.style.fontStyle = styleValue;
                                editingMainUserSettings.windows.button[fontButtonTypeFirst].font.fontStyle = styleValue;
                                if (buttonsFontType === 'alerts') { setStyleToSettingsWindow(); }
                            }

                            const mouseEnterFontStyleFirst = (el) => {
                                el.target.style.backgroundColor = colorPalette[1];
                            }

                            const mouseLeaveFontStyleFirst = (el) => {
                                el.target.style.backgroundColor = colorPalette[2];
                            }

                            buttonsFontStyleFirstEl.addEventListener('click', showButtonsFontStyleFirstMenu);
                            buttonsFontStyleFirstEl.addEventListener('mouseleave', hidesButtonsFontStyleFirstMenu);
                            fontStyle.forEach(menu => {
                                menu.addEventListener('click', changeFontStyleFirst);
                                menu.addEventListener('mouseenter', mouseEnterFontStyleFirst);
                                menu.addEventListener('mouseleave', mouseLeaveFontStyleFirst);
                            });
                        }
                        createFontStyleMenuFirst();

                        const createFontWeightMenuFirst = () => {
                            const exampleFirstButtonEl = document.getElementById('exampleFirstButton');
                            const buttonsFontWeightFirstEl = document.getElementById('buttonsFontWeightFirst');
                            const buttonsFontWeightFirstButtonTitleEl = document.getElementById('buttonsFontWeightFirstButtonTitle');
                            const buttonsFontWeightFirstMenuEl = document.getElementById('buttonsFontWeightFirstMenu');
                            let html = '';

                            buttonsFontWeightFirstMenuEl.style.backgroundColor = colorPalette[3];
                            buttonsFontWeightFirstButtonTitleEl.innerText = editingMainUserSettings.windows.button[fontButtonTypeFirst].font.fontStyle;
                            buttonsFontWeightFirstEl.style.backgroundColor = colorPalette[2];

                            fontWeightArray.forEach(font => {
                                html += `<span class="fontWeightFirst" data-weight="${font}">${font}</span>`;
                            });
                            buttonsFontWeightFirstMenuEl.innerHTML = html;
                            const fontWeight = document.querySelectorAll('.fontWeightFirst');

                            const showButtonsFontWeightFirstMenu = () => {
                                const status = buttonsFontWeightFirstMenuEl.style.display;
                                if (status === 'none') {
                                    buttonsFontWeightFirstMenuEl.style.display = 'flex';
                                } else {
                                    buttonsFontWeightFirstMenuEl.style.display = 'none';
                                }
                            }

                            const hidesButtonsFontWeightFirstMenu = () => {
                                buttonsFontWeightFirstMenuEl.style.display = 'none';
                            }

                            const changeFontWeightFirst = (el) => {
                                const weightValue = el.originalTarget.dataset.weight;
                                buttonsFontWeightFirstButtonTitleEl.innerText = weightValue;
                                exampleFirstButtonEl.style.fontWeight = weightValue;
                                editingMainUserSettings.windows.button[fontButtonTypeFirst].font.fontWeight = weightValue;
                                if (buttonsFontType === 'alerts') { setStyleToSettingsWindow(); }
                            }

                            const mouseEnterFontWeightFirst = (el) => {
                                el.target.style.backgroundColor = colorPalette[1];
                            }

                            const mouseLeaveFontWeightFirst = (el) => {
                                el.target.style.backgroundColor = colorPalette[2];
                            }

                            buttonsFontWeightFirstEl.addEventListener('click', showButtonsFontWeightFirstMenu);
                            buttonsFontWeightFirstEl.addEventListener('mouseleave', hidesButtonsFontWeightFirstMenu);
                            fontWeight.forEach(menu => {
                                menu.addEventListener('click', changeFontWeightFirst);
                                menu.addEventListener('mouseenter', mouseEnterFontWeightFirst);
                                menu.addEventListener('mouseleave', mouseLeaveFontWeightFirst);
                            });
                        }
                        createFontWeightMenuFirst();
                    }
                    createFontFamilyWeightStyleFirstMenus();

                    const createFontFamilyWeightStyleSecondMenus = () => {
                        const createFontFamilyMenuSecond = () => {
                            const exampleSecondButtonEl = document.getElementById('exampleSecondButton');
                            const buttonsFontFamilySecondEl = document.getElementById('buttonsFontFamilySecond');
                            const buttonsFontFamilySecondButtonTitleEl = document.getElementById('buttonsFontFamilySecondButtonTitle');
                            const buttonsFontFamilySecondMenuEl = document.getElementById('buttonsFontFamilySecondMenu');
                            const familyOSArrayObject = getSupportedFontFamilies();
                            let html = '';

                            buttonsFontFamilySecondEl.style.backgroundColor = colorPalette[3];
                            const familyObject = familyOSArrayObject.find(family => family.fontFamily === editingMainUserSettings.windows.button[fontButtonTypeSecond].font.fontFamily);
                            buttonsFontFamilySecondButtonTitleEl.innerText = familyObject.fontFamily;
                            buttonsFontFamilySecondMenuEl.style.backgroundColor = colorPalette[2];

                            familyOSArrayObject.forEach(font => {
                                html += `<span class="fontFamilySecond" data-family="${font.fontFamily}">${font.fontFamily}</span>`;
                            });

                            buttonsFontFamilySecondMenuEl.innerHTML = html;
                            const fontFamily = document.querySelectorAll('.fontFamilySecond');

                            const showButtonsFontFamilySecondMenu = () => {
                                const status = buttonsFontFamilySecondMenuEl.style.display;
                                if (status === 'none') {
                                    buttonsFontFamilySecondMenuEl.style.display = 'flex';
                                } else {
                                    buttonsFontFamilySecondMenuEl.style.display = 'none';
                                }
                            }

                            const hidesButtonsFontFamilySecondMenu = () => {
                                buttonsFontFamilySecondMenuEl.style.display = 'none';
                            }

                            const changeFontFamilySecond = (el) => {
                                const familyValue = el.target.dataset.family;
                                const familyObject = familyOSArrayObject.find(family => family.fontFamily === familyValue);
                                buttonsFontFamilySecondButtonTitleEl.innerText = familyValue;
                                const fontFamily = 'inherit' ? familyObject.fontFamily : `"${familyObject.fontFamily}", ${familyObject.genericFontName}`;
                                exampleSecondButtonEl.style.fontFamily = fontFamily;
                                editingMainUserSettings.windows.button[fontButtonTypeSecond].font.fontFamily = fontFamily;
                                buttonsFontFamilySecondMenuEl.style.display = 'none';
                                if (buttonsFontType === 'alerts') { setStyleToSettingsWindow(); }
                            }

                            const mouseEnterFontFamilySecond = (el) => {
                                el.target.style.backgroundColor = colorPalette[1];
                            }

                            const mouseLeaveFontFamilySecond = (el) => {
                                el.target.style.backgroundColor = colorPalette[2];
                            }

                            buttonsFontFamilySecondEl.addEventListener('click', showButtonsFontFamilySecondMenu);
                            buttonsFontFamilySecondEl.addEventListener('mouseleave', hidesButtonsFontFamilySecondMenu);
                            fontFamily.forEach(menu => {
                                menu.addEventListener('click', changeFontFamilySecond);
                                menu.addEventListener('mouseover', mouseEnterFontFamilySecond);
                                menu.addEventListener('mouseleave', mouseLeaveFontFamilySecond);
                            });
                        }
                        createFontFamilyMenuSecond();

                        const createFontStyleMenuSecond = () => {
                            const exampleSecondButtonEl = document.getElementById('exampleSecondButton');
                            const buttonsFontStyleSecondEl = document.getElementById('buttonsFontStyleSecond');
                            const buttonsFontStyleSecondButtonTitleEl = document.getElementById('buttonsFontStyleSecondButtonTitle');
                            const buttonsFontStyleSecondMenuEl = document.getElementById('buttonsFontStyleSecondMenu');
                            let html = '';

                            buttonsFontStyleSecondMenuEl.style.backgroundColor = colorPalette[3];
                            buttonsFontStyleSecondButtonTitleEl.innerText = editingMainUserSettings.windows.button[fontButtonTypeSecond].font.fontStyle;
                            buttonsFontStyleSecondEl.style.backgroundColor = colorPalette[2];

                            fontStyleArray.forEach(font => {
                                html += `<span class="fontStyleSecond" data-style="${font}">${font}</span>`;
                            });
                            buttonsFontStyleSecondMenuEl.innerHTML = html;
                            const fontStyle = document.querySelectorAll('.fontStyleSecond');

                            const showButtonsFontStyleSecondMenu = () => {
                                const status = buttonsFontStyleSecondMenuEl.style.display;
                                if (status === 'none') {
                                    buttonsFontStyleSecondMenuEl.style.display = 'flex';
                                } else {
                                    buttonsFontStyleSecondMenuEl.style.display = 'none';
                                }
                            }

                            const hidesButtonsFontStyleSecondMenu = () => {
                                buttonsFontStyleSecondMenuEl.style.display = 'none';
                            }

                            const changeFontStyleSecond = (el) => {
                                const styleValue = el.originalTarget.dataset.style;
                                buttonsFontStyleSecondButtonTitleEl.innerText = styleValue;
                                exampleSecondButtonEl.style.fontStyle = styleValue;
                                editingMainUserSettings.windows.button[fontButtonTypeSecond].font.fontStyle = styleValue;
                                if (buttonsFontType === 'alerts') { setStyleToSettingsWindow(); }
                            }

                            const mouseEnterFontStyleSecond = (el) => {
                                el.target.style.backgroundColor = colorPalette[1];
                            }

                            const mouseLeaveFontStyleSecond = (el) => {
                                el.target.style.backgroundColor = colorPalette[2];
                            }

                            buttonsFontStyleSecondEl.addEventListener('click', showButtonsFontStyleSecondMenu);
                            buttonsFontStyleSecondEl.addEventListener('mouseleave', hidesButtonsFontStyleSecondMenu);
                            fontStyle.forEach(menu => {
                                menu.addEventListener('click', changeFontStyleSecond);
                                menu.addEventListener('mouseenter', mouseEnterFontStyleSecond);
                                menu.addEventListener('mouseleave', mouseLeaveFontStyleSecond);
                            });
                        }
                        createFontStyleMenuSecond();

                        const createFontWeightMenuSecond = () => {
                            const exampleSecondButtonEl = document.getElementById('exampleSecondButton');
                            const buttonsFontWeightSecondEl = document.getElementById('buttonsFontWeightSecond');
                            const buttonsFontWeightSecondButtonTitleEl = document.getElementById('buttonsFontWeightSecondButtonTitle');
                            const buttonsFontWeightSecondMenuEl = document.getElementById('buttonsFontWeightSecondMenu');
                            let html = '';

                            buttonsFontWeightSecondMenuEl.style.backgroundColor = colorPalette[3];
                            buttonsFontWeightSecondButtonTitleEl.innerText = editingMainUserSettings.windows.button[fontButtonTypeSecond].font.fontStyle;
                            buttonsFontWeightSecondEl.style.backgroundColor = colorPalette[2];

                            fontWeightArray.forEach(font => {
                                html += `<span class="fontWeightSecond" data-weight="${font}">${font}</span>`;
                            });
                            buttonsFontWeightSecondMenuEl.innerHTML = html;
                            const fontWeight = document.querySelectorAll('.fontWeightSecond');

                            const showButtonsFontWeightSecondMenu = () => {
                                const status = buttonsFontWeightSecondMenuEl.style.display;
                                if (status === 'none') {
                                    buttonsFontWeightSecondMenuEl.style.display = 'flex';
                                } else {
                                    buttonsFontWeightSecondMenuEl.style.display = 'none';
                                }
                            }

                            const hidesButtonsFontWeightSecondMenu = () => {
                                buttonsFontWeightSecondMenuEl.style.display = 'none';
                            }

                            const changeFontWeight = (el) => {
                                const weightValue = el.originalTarget.dataset.weight;
                                buttonsFontWeightSecondButtonTitleEl.innerText = weightValue;
                                exampleSecondButtonEl.style.fontWeight = weightValue;
                                editingMainUserSettings.windows.button[fontButtonTypeSecond].font.fontWeight = weightValue;
                                if (buttonsFontType === 'alerts') { setStyleToSettingsWindow(); }
                            }

                            const mouseEnterFontWeight = (el) => {
                                el.target.style.backgroundColor = colorPalette[1];
                            }

                            const mouseLeaveFontWeight = (el) => {
                                el.target.style.backgroundColor = colorPalette[2];
                            }

                            buttonsFontWeightSecondEl.addEventListener('click', showButtonsFontWeightSecondMenu);
                            buttonsFontWeightSecondEl.addEventListener('mouseleave', hidesButtonsFontWeightSecondMenu);
                            fontWeight.forEach(menu => {
                                menu.addEventListener('click', changeFontWeight);
                                menu.addEventListener('mouseenter', mouseEnterFontWeight);
                                menu.addEventListener('mouseleave', mouseLeaveFontWeight);
                            });
                        }
                        createFontWeightMenuSecond();
                    }
                    createFontFamilyWeightStyleSecondMenus();

                    const loadDefaultValuesInButtonFontMenu = () => {
                        const exampleFirstButtonEl = document.getElementById('exampleFirstButton');
                        const exampleSecondButtonEl = document.getElementById('exampleSecondButton');
                        const addRandomColor = document.querySelectorAll('.addRandomColor');
                        addRandomColor.forEach(button => {
                            button.innerHTML = `<svg fill="${editingMainUserSettings.windows.button.primary.font.color}" width="25px" height="25px" viewBox="0 -4 32 32" xmlns="http://www.w3.org/2000/svg"><path d="m24.983 8.539v-2.485h-4.902l-3.672 5.945-2.099 3.414-3.24 5.256c-.326.51-.889.844-1.53.845h-9.54v-3.568h8.538l3.673-5.946 2.099-3.414 3.24-5.256c.325-.509.886-.843 1.525-.845h5.904v-2.485l7.417 4.27-7.417 4.27z"/><path d="m12.902 6.316-.63 1.022-1.468 2.39-2.265-3.675h-8.538v-3.568h9.54c.641.001 1.204.335 1.526.838l.004.007 1.836 2.985z"/><path d="m24.983 24v-2.485h-5.904c-.639-.002-1.201-.336-1.521-.838l-.004-.007-1.836-2.985.63-1.022 1.468-2.39 2.264 3.675h4.902v-2.485l7.417 4.27-7.417 4.27z"/></svg>`
                            button.style.border = `1px solid ${checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff'}`;
                            button.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        });

                        exampleFirstButtonEl.style.border = `1px solid ${checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff'}`;
                        exampleFirstButtonEl.style.backgroundColor = editingMainUserSettings.windows.button[fontButtonTypeFirst].backgroundColor;
                        Object.assign(exampleFirstButtonEl.style, editingMainUserSettings.windows.button[fontButtonTypeFirst].font);
                        exampleSecondButtonEl.style.border = `1px solid ${checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff'}`;
                        exampleSecondButtonEl.style.backgroundColor = editingMainUserSettings.windows.button[fontButtonTypeSecond].backgroundColor;
                        Object.assign(exampleSecondButtonEl.style, editingMainUserSettings.windows.button[fontButtonTypeSecond].font);
                        switch (buttonsFontType) {
                            case 'actions':
                                exampleFirstButtonEl.innerText = 'Primary';
                                exampleSecondButtonEl.innerText = 'Secondary';
                                break;
                            case 'alerts':
                                exampleFirstButtonEl.innerText = 'Success';
                                exampleSecondButtonEl.innerText = 'Danger';
                                break;
                            case 'notifications':
                                exampleFirstButtonEl.innerText = 'Warning';
                                exampleSecondButtonEl.innerText = 'Info';
                                break;
                            case 'neutrals':
                                exampleFirstButtonEl.innerText = 'Light';
                                exampleSecondButtonEl.innerText = 'Dark';
                                break;
                        }
                        updateInputRangeAndOutput('windowButtonsFontSizeRangeInputFirst', 'windowButtonsFontSizeRangeInputValueFirst', editingMainUserSettings.windows.button[fontButtonTypeFirst].font.fontSize);
                        updateInputRangeAndOutput('windowButtonsFontSizeRangeInputSecond', 'windowButtonsFontSizeRangeInputValueSecond', editingMainUserSettings.windows.button[fontButtonTypeSecond].font.fontSize);
                    }
                    loadDefaultValuesInButtonFontMenu();

                    const addEventListenersToWindowButtonsFont = () => {
                        const windowButtonsMenu = document.querySelectorAll('.windowButtonsMenu');
                        const windowButtonFontColorPickerFirstInputEl = document.getElementById('windowButtonFontColorPickerFirstInput');
                        const addRandomFontColorFirstEl = document.getElementById('addRandomFontColorFirst');
                        const windowButtonsFontSizeRangeInputFirstEl = document.getElementById('windowButtonsFontSizeRangeInputFirst');
                        const exampleFirstButtonEl = document.getElementById('exampleFirstButton');
                        const windowButtonFontColorPickerSecondInputEl = document.getElementById('windowButtonFontColorPickerSecondInput');
                        const addRandomFontColorSecondEl = document.getElementById('addRandomFontColorSecond');
                        const windowButtonsFontSizeRangeInputSecondEl = document.getElementById('windowButtonsFontSizeRangeInputSecond');
                        const exampleSecondButtonEl = document.getElementById('exampleSecondButton');

                        const changeButtonsTabMenu = (event) => {
                            const menuType = event.target.dataset.type;
                            if (menuType === buttonsFontType) return;
                            buttonsFontType = menuType;
                            updateWindowStyleButtonsFontSettingsTitlesUI();
                            addIconToRandomColorWindowsButtonFontEl();
                            loadDefaultValuesInButtonFontMenu();
                        }

                        const updateFontColorForFirst = () => {
                            const hexColor = windowButtonFontColorPickerFirstInputEl.value;
                            editingMainUserSettings.windows.button[fontButtonTypeFirst].font.color = hexColor;
                            windowButtonFontColorPickerFirstInputEl.style.backgroundColor = hexColor;
                            windowButtonFontColorPickerFirstInputEl.style.color = checkIfColorBrightness(hexColor, 120) ? '#000000' : '#ffffff';
                            loadDefaultValuesInButtonFontMenu();
                            if (buttonsFontType === 'alerts') { setStyleToSettingsWindow(); };
                        }

                        const generateRandomFontColorForFirst = () => {
                            const hexColor = getRandomColor();
                            editingMainUserSettings.windows.button[fontButtonTypeFirst].font.color = hexColor;
                            windowButtonFontColorPickerFirstInputEl.value = hexColor;
                            windowButtonFontColorPickerFirstInputEl.style.backgroundColor = hexColor;
                            windowButtonFontColorPickerFirstInputEl.style.color = checkIfColorBrightness(hexColor, 120) ? '#000000' : '#ffffff';
                            loadDefaultValuesInButtonFontMenu();
                            if (buttonsFontType === 'alerts') { setStyleToSettingsWindow(); };
                            animateElement('addRandomBackgroundColorFirst', editingMainUserSettings.windows.button.primary.animation);
                        }

                        const mouseEnterGenerateRandomFontColorForFirst = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                        }

                        const mouseLeaveGenerateRandomFontColorForFirst = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        }

                        const updateButtonsFontSizeFirst = () => {
                            const buttonFontSizeValue = windowButtonsFontSizeRangeInputFirstEl.value;
                            editingMainUserSettings.windows.button[fontButtonTypeFirst].font.fontSize = `${buttonFontSizeValue}px`;
                            loadDefaultValuesInButtonFontMenu();
                            if (buttonsFontType === 'alerts') { setStyleToSettingsWindow(); };
                        }

                        const mouseEnterExampleFirstButton = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button[fontButtonTypeFirst].hoverBackgroundColor;
                            Object.assign(el.target.style, editingMainUserSettings.windows.button[fontButtonTypeFirst].font);
                        }

                        const mouseLeaveExampleFirstButton = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button[fontButtonTypeFirst].backgroundColor;
                            Object.assign(el.target.style, editingMainUserSettings.windows.button[fontButtonTypeFirst].font);
                        }

                        const updateFontColorForSecond = () => {
                            const hexColor = windowButtonFontColorPickerSecondInputEl.value;
                            editingMainUserSettings.windows.button[fontButtonTypeSecond].font.color = hexColor;
                            windowButtonFontColorPickerSecondInputEl.style.backgroundColor = hexColor;
                            windowButtonFontColorPickerSecondInputEl.style.color = checkIfColorBrightness(hexColor, 120) ? '#000000' : '#ffffff';
                            loadDefaultValuesInButtonFontMenu();
                            if (buttonsFontType === 'alerts') { setStyleToSettingsWindow(); };
                        }

                        const generateRandomFontColorForSecond = () => {
                            const hexColor = getRandomColor();
                            editingMainUserSettings.windows.button[fontButtonTypeSecond].font.color = hexColor;
                            windowButtonFontColorPickerSecondInputEl.value = hexColor;
                            windowButtonFontColorPickerSecondInputEl.style.backgroundColor = hexColor;
                            windowButtonFontColorPickerSecondInputEl.style.color = checkIfColorBrightness(hexColor, 120) ? '#000000' : '#ffffff';
                            loadDefaultValuesInButtonFontMenu();
                            if (buttonsFontType === 'alerts') { setStyleToSettingsWindow(); };
                            animateElement('addRandomBackgroundColorFirst', editingMainUserSettings.windows.button.primary.animation);
                        }

                        const mouseEnterGenerateRandomFontColorForSecond = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                        }

                        const mouseLeaveGenerateRandomFontColorForSecond = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        }

                        const updateButtonsFontSizeSecond = () => {
                            const buttonFontSizeValue = windowButtonsFontSizeRangeInputSecondEl.value;
                            editingMainUserSettings.windows.button[fontButtonTypeSecond].font.fontSize = `${buttonFontSizeValue}px`;
                            loadDefaultValuesInButtonFontMenu();
                            if (buttonsFontType === 'alerts') { setStyleToSettingsWindow(); };
                        }

                        const mouseEnterExampleSecondButton = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button[fontButtonTypeSecond].hoverBackgroundColor;
                            Object.assign(el.target.style, editingMainUserSettings.windows.button[fontButtonTypeSecond].font);
                        }

                        const mouseLeaveExampleSecondButton = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button[fontButtonTypeSecond].backgroundColor;
                            Object.assign(el.target.style, editingMainUserSettings.windows.button[fontButtonTypeSecond].font);
                        }

                        windowButtonsMenu.forEach(menu => { menu.addEventListener('click', changeButtonsTabMenu); });

                        windowButtonFontColorPickerFirstInputEl.addEventListener('input', updateFontColorForFirst);
                        addRandomFontColorFirstEl.addEventListener('click', generateRandomFontColorForFirst);
                        addRandomFontColorFirstEl.addEventListener('mouseenter', mouseEnterGenerateRandomFontColorForFirst);
                        addRandomFontColorFirstEl.addEventListener('mouseleave', mouseLeaveGenerateRandomFontColorForFirst);
                        windowButtonsFontSizeRangeInputFirstEl.addEventListener('input', updateButtonsFontSizeFirst);
                        exampleFirstButtonEl.addEventListener('mouseenter', mouseEnterExampleFirstButton);
                        exampleFirstButtonEl.addEventListener('mouseleave', mouseLeaveExampleFirstButton);

                        windowButtonFontColorPickerSecondInputEl.addEventListener('input', updateFontColorForSecond);
                        addRandomFontColorSecondEl.addEventListener('click', generateRandomFontColorForSecond);
                        addRandomFontColorSecondEl.addEventListener('mouseenter', mouseEnterGenerateRandomFontColorForSecond);
                        addRandomFontColorSecondEl.addEventListener('mouseleave', mouseLeaveGenerateRandomFontColorForSecond);
                        windowButtonsFontSizeRangeInputSecondEl.addEventListener('input', updateButtonsFontSizeSecond);
                        exampleSecondButtonEl.addEventListener('mouseenter', mouseEnterExampleSecondButton);
                        exampleSecondButtonEl.addEventListener('mouseleave', mouseLeaveExampleSecondButton);
                    }
                    addEventListenersToWindowButtonsFont();
                    break;
                case 'myActivity':
                    let allUserActivityStatus = true;
                    let editAllUserActivityMenuBoxStatus = true;
                    let filterAllUserActivityMenuBoxStatus = true;
                    let userActivityArray = await userActivityRegister('get', 'getAllLog').then(activities => { return activities; });
                    let userActivityArrayFiltering = userActivityArray.activities;
                    let pageNumber = 1;
                    let itemsPerPage = 20;
                    let pagesQuantity = 1;
                    let userActivityArrayPaginate = [];
                    let allowButtonsStatus = {};
                    let sortStateStatus = {
                        date: 'ascending',
                        action: 'none',
                    };
                    const filterStatus = {};

                    const sortNoneSvg = `<svg width="800px" height="800px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.0686 15H7.9313C7.32548 15 7.02257 15 6.88231 15.1198C6.76061 15.2238 6.69602 15.3797 6.70858 15.5393C6.72305 15.7232 6.93724 15.9374 7.36561 16.3657L11.4342 20.4344C11.6323 20.6324 11.7313 20.7314 11.8454 20.7685C11.9458 20.8011 12.054 20.8011 12.1544 20.7685C12.2686 20.7314 12.3676 20.6324 12.5656 20.4344L16.6342 16.3657C17.0626 15.9374 17.2768 15.7232 17.2913 15.5393C17.3038 15.3797 17.2392 15.2238 17.1175 15.1198C16.9773 15 16.6744 15 16.0686 15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.9313 9.00005H16.0686C16.6744 9.00005 16.9773 9.00005 17.1175 8.88025C17.2393 8.7763 17.3038 8.62038 17.2913 8.46082C17.2768 8.27693 17.0626 8.06274 16.6342 7.63436L12.5656 3.56573C12.3676 3.36772 12.2686 3.26872 12.1544 3.23163C12.054 3.199 11.9458 3.199 11.8454 3.23163C11.7313 3.26872 11.6323 3.36772 11.4342 3.56573L7.36561 7.63436C6.93724 8.06273 6.72305 8.27693 6.70858 8.46082C6.69602 8.62038 6.76061 8.7763 6.88231 8.88025C7.02257 9.00005 7.32548 9.00005 7.9313 9.00005Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                    const sortUpArrowSvg = `<svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.9313 9.00005H16.0686C16.6744 9.00005 16.9773 9.00005 17.1175 8.88025C17.2393 8.7763 17.3038 8.62038 17.2913 8.46082C17.2768 8.27693 17.0626 8.06274 16.6342 7.63436L12.5656 3.56573C12.3676 3.36772 12.2686 3.26872 12.1544 3.23163C12.054 3.199 11.9458 3.199 11.8454 3.23163C11.7313 3.26872 11.6323 3.36772 11.4342 3.56573L7.36561 7.63436C6.93724 8.06273 6.72305 8.27693 6.70858 8.46082C6.69602 8.62038 6.76061 8.7763 6.88231 8.88025C7.02257 9.00005 7.32548 9.00005 7.9313 9.00005Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                    const sortDownArrowSvg = `<svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.0686 15H7.9313C7.32548 15 7.02257 15 6.88231 15.1198C6.76061 15.2237 6.69602 15.3797 6.70858 15.5392C6.72305 15.7231 6.93724 15.9373 7.36561 16.3657L11.4342 20.4343C11.6322 20.6323 11.7313 20.7313 11.8454 20.7684C11.9458 20.8011 12.054 20.8011 12.1544 20.7684C12.2686 20.7313 12.3676 20.6323 12.5656 20.4343L16.6342 16.3657C17.0626 15.9373 17.2768 15.7231 17.2913 15.5392C17.3038 15.3797 17.2392 15.2237 17.1175 15.1198C16.9773 15 16.6744 15 16.0686 15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                    const filterSvg = `<svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 4.6C3 4.03995 3 3.75992 3.10899 3.54601C3.20487 3.35785 3.35785 3.20487 3.54601 3.10899C3.75992 3 4.03995 3 4.6 3H19.4C19.9601 3 20.2401 3 20.454 3.10899C20.6422 3.20487 20.7951 3.35785 20.891 3.54601C21 3.75992 21 4.03995 21 4.6V6.33726C21 6.58185 21 6.70414 20.9724 6.81923C20.9479 6.92127 20.9075 7.01881 20.8526 7.10828C20.7908 7.2092 20.7043 7.29568 20.5314 7.46863L14.4686 13.5314C14.2957 13.7043 14.2092 13.7908 14.1474 13.8917C14.0925 13.9812 14.0521 14.0787 14.0276 14.1808C14 14.2959 14 14.4182 14 14.6627V17L10 21V14.6627C10 14.4182 10 14.2959 9.97237 14.1808C9.94787 14.0787 9.90747 13.9812 9.85264 13.8917C9.7908 13.7908 9.70432 13.7043 9.53137 13.5314L3.46863 7.46863C3.29568 7.29568 3.2092 7.2092 3.14736 7.10828C3.09253 7.01881 3.05213 6.92127 3.02763 6.81923C3 6.70414 3 6.58185 3 6.33726V4.6Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                    const exportCsv = `<svg width="20px" height="20px" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.5 3.5H14V3.29289L13.8536 3.14645L13.5 3.5ZM10.5 0.5L10.8536 0.146447L10.7071 0H10.5V0.5ZM6.5 6.5V6H6V6.5H6.5ZM6.5 8.5H6V9H6.5V8.5ZM8.5 8.5H9V8H8.5V8.5ZM8.5 10.5V11H9V10.5H8.5ZM10.5 9.5H10V9.70711L10.1464 9.85355L10.5 9.5ZM11.5 10.5L11.1464 10.8536L11.5 11.2071L11.8536 10.8536L11.5 10.5ZM12.5 9.5L12.8536 9.85355L13 9.70711V9.5H12.5ZM2.5 6.5V6H2V6.5H2.5ZM2.5 10.5H2V11H2.5V10.5ZM2 5V1.5H1V5H2ZM13 3.5V5H14V3.5H13ZM2.5 1H10.5V0H2.5V1ZM10.1464 0.853553L13.1464 3.85355L13.8536 3.14645L10.8536 0.146447L10.1464 0.853553ZM2 1.5C2 1.22386 2.22386 1 2.5 1V0C1.67157 0 1 0.671573 1 1.5H2ZM1 12V13.5H2V12H1ZM2.5 15H12.5V14H2.5V15ZM14 13.5V12H13V13.5H14ZM12.5 15C13.3284 15 14 14.3284 14 13.5H13C13 13.7761 12.7761 14 12.5 14V15ZM1 13.5C1 14.3284 1.67157 15 2.5 15V14C2.22386 14 2 13.7761 2 13.5H1ZM9 6H6.5V7H9V6ZM6 6.5V8.5H7V6.5H6ZM6.5 9H8.5V8H6.5V9ZM8 8.5V10.5H9V8.5H8ZM8.5 10H6V11H8.5V10ZM10 6V9.5H11V6H10ZM10.1464 9.85355L11.1464 10.8536L11.8536 10.1464L10.8536 9.14645L10.1464 9.85355ZM11.8536 10.8536L12.8536 9.85355L12.1464 9.14645L11.1464 10.1464L11.8536 10.8536ZM13 9.5V6H12V9.5H13ZM5 6H2.5V7H5V6ZM2 6.5V10.5H3V6.5H2ZM2.5 11H5V10H2.5V11Z" fill="currentColor"/></svg>`;

                    settingsWindowRightSectionHtml = `
                        <div id="userActivitySection">
                            <div id="userActivityTop">
                                <div id="userActivityLeft">
                                    <div id="userActivityStatus">
                                        <label class="toggle" for="allowUserActivity">
                                            <input type="checkbox" class="toggleAllInput" id="allowUserActivity" ${allUserActivityStatus ? 'checked' : ''} />
                                            <span class="toggleTrack">
                                                <span class="toggleIndicator">
                                                    <span class="checkMark">
                                                        <svg viewBox="0 0 24 24" id="ghq-svg-check" role="presentation" aria-hidden="true">
                                                            <path d="M9.86 18a1 1 0 01-.73-.32l-4.86-5.17a1.001 1.001 0 011.46-1.37l4.12 4.39 8.41-9.2a1 1 0 111.48 1.34l-9.14 10a1 1 0 01-.73.33h-.01z"></path>
                                                        </svg>
                                                    </span>
                                                </span>
                                            </span>
                                            <span id="allowUserActivityTitle">Enable my activity</span>
                                        </label>
                                        <div id="editAllUserActivity">
                                            <button id="editAllUserActivityBtn">
                                                <svg width="20px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M12 12H12.01M12 6H12.01M12 18H12.01M13 12C13 12.5523 12.5523 13 12 13C11.4477 13 11 12.5523 11 12C11 11.4477 11.4477 11 12 11C12.5523 11 13 11.4477 13 12ZM13 18C13 18.5523 12.5523 19 12 19C11.4477 19 11 18.5523 11 18C11 17.4477 11.4477 17 12 17C12.5523 17 13 17.4477 13 18ZM13 6C13 6.55228 12.5523 7 12 7C11.4477 7 11 6.55228 11 6C11 5.44772 11.4477 5 12 5C12.5523 5 13 5.44772 13 6Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                </svg>
                                            </button>
                                        </div>
                                        <div id="editAllUserActivityMenuBox"></div>
                                    </div>
                                    <div id="quantityFilterSection">
                                        <button id="pageLeftToStart">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M3 19V5"/><path d="m13 6-6 6 6 6"/><path d="M7 12h14"/></svg>
                                        </button>
                                        <button id="pageLeft">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                                        </button>
                                        <button id="editQuantityFilterPerPage" aria-expanded="false" aria-controls="listQuantity">
                                            <span id="editQuantityFilterPerPageSpan"></span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960"><path d="M480-360 280-560h400z"/></svg>
                                            <div id="listQuantity" role="menu" aria-hidden="true">
                                                <span class="quantity" data-quantity="20">20</span>
                                                <span class="quantity" data-quantity="50">50</span>
                                                <span class="quantity" data-quantity="100">100</span>
                                                <span class="quantity" data-quantity="150">150</span>
                                                <span class="quantity" data-quantity="200">200</span>
                                            </div>
                                        </button>
                                        <button id="pageRight">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                        </button>
                                        <button id="pageRightToEnd">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M17 12H3"/><path d="m11 18 6-6-6-6"/><path d="M21 5v14"/></svg>
                                        </button>
                                    </div>
                                </div>
                                <div id="userActivityRight">
                                    <div id="userActivityRightTop">
                                        <label id="deleteAllUserActivity" for="deleteAllUserActivity">
                                            Delete all my activity
                                        </label>
                                        <button id="deleteAllActivityButton" title="Effect will apply immediately!">
                                            <svg style="pointer-events: none;" width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M4 6H20L18.4199 20.2209C18.3074 21.2337 17.4512 22 16.4321 22H7.56786C6.54876 22 5.69264 21.2337 5.5801 20.2209L4 6Z" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                <path d="M7.34491 3.14716C7.67506 2.44685 8.37973 2 9.15396 2H14.846C15.6203 2 16.3249 2.44685 16.6551 3.14716L18 6H6L7.34491 3.14716Z" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                <path d="M2 6H22" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                <path d="M10 11V16" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                <path d="M14 11V16" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            </svg>
                                        </button>
                                    </div>
                                    <div id="userActivityRightBottom">
                                        <button id="userActivityExportToCsv">${exportCsv}</button>
                                        <button id="userActivityFilter">${filterSvg}</button>
                                        <div id="userActivityFilterMenuBox"></div>
                                    </div>
                                </div>
                            </div>
                            <div id="userActivityMiddle">
                                <div id="activityHeader">
                                    <div id="activityHeaderDate">
                                        <div id="activityHeaderDateTitle">Date</div>
                                        <button id="activityHeaderDateArrow"></button>
                                    </div>
                                    <div id="activityHeaderAction">
                                        <div id="activityHeaderActionTitle">Action</div>
                                        <button id="activityHeaderActionArrow"></button>
                                    </div>
                                    <div id="activityHeaderDetail">
                                        <div id="activityHeaderDetailTitle">Detail</div>
                                        <button id="activityHeaderDetailArrow"></button>
                                    </div>
                                    <div id="activityHeaderDelete">
                                        <div id="activityHeaderDeleteTitle">Delete</div>
                                        <button id="activityHeaderDeleteArrow"></button>
                                    </div>
                                </div>
                                <div id="activityList"></div>
                            </div>
                        </div>
                    `;
                    settingsWindowRightSectionEl.innerHTML = settingsWindowRightSectionHtml;

                    const updateWindowStyleActivitySettingsTitlesUI = () => {
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
                            deleteAllUserActivity: {
                                id: 'deleteAllUserActivity',
                                text: languageObject._activity._myActivity.deleteAllMyActivity,
                                classNames: []
                            },
                            activityHeaderDateTitle: {
                                id: 'activityHeaderDateTitle',
                                text: languageObject._activity._myActivity._activityTableHeader.date,
                                classNames: []
                            },
                            activityHeaderActionTitle: {
                                id: 'activityHeaderActionTitle',
                                text: languageObject._activity._myActivity._activityTableHeader.action,
                                classNames: []
                            },
                            activityHeaderDetailTitle: {
                                id: 'activityHeaderDetailTitle',
                                text: languageObject._activity._myActivity._activityTableHeader.detail,
                                classNames: []
                            },
                            activityHeaderDeleteTitle: {
                                id: 'activityHeaderDeleteTitle',
                                text: languageObject._activity._myActivity._activityTableHeader.delete,
                                classNames: []
                            },
                        };

                        const allowUserActivityTitleEl = document.getElementById('allowUserActivityTitle');
                        if (!editAllUserActivityMenuBoxStatus) {
                            allowUserActivityTitleEl.innerText = languageObject._activity._myActivity.activityIsDisabled;
                        } else if (editAllUserActivityMenuBoxStatus) {
                            allowUserActivityTitleEl.innerText = languageObject._activity._myActivity.activityIsEnabled;
                        }

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
                    updateWindowStyleActivitySettingsTitlesUI();

                    const setDefaultValuesMyActivity = () => {
                        const pageLeftToStartButton = document.getElementById('pageLeftToStart');
                        const pageLeftButton = document.getElementById('pageLeft');
                        const quantityButtonsArray = document.querySelectorAll('[data-quantity]');
                        const editQuantityFilterPerPageButton = document.getElementById('editQuantityFilterPerPage');
                        const pageRightButton = document.getElementById('pageRight');
                        const pageRightToEndButton = document.getElementById('pageRightToEnd');

                        const deleteAllActivityButtonEl = document.getElementById('deleteAllActivityButton');
                        const userActivityFilterEl = document.getElementById('userActivityFilter');
                        const userActivityExportToCsvEl = document.getElementById('userActivityExportToCsv');

                        pageLeftToStartButton.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                        pageLeftToStartButton.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        pageLeftButton.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                        pageLeftButton.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        editQuantityFilterPerPageButton.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                        editQuantityFilterPerPageButton.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        pageRightButton.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                        pageRightButton.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        pageRightToEndButton.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                        pageRightToEndButton.style.color = editingMainUserSettings.windows.button.secondary.font.color;

                        deleteAllActivityButtonEl.style.backgroundColor = editingMainUserSettings.windows.button.danger.backgroundColor;
                        deleteAllActivityButtonEl.style.color = editingMainUserSettings.windows.button.danger.font.color;
                        userActivityFilterEl.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                        userActivityFilterEl.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        userActivityExportToCsvEl.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                        userActivityExportToCsvEl.style.color = editingMainUserSettings.windows.button.secondary.font.color;

                        quantityButtonsArray.forEach(button => {
                            if (itemsPerPage === parseInt(button.dataset.quantity)) {
                                button.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                                button.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                            } else {
                                button.style.backgroundColor = editingMainUserSettings.windows.button.info.backgroundColor;
                                button.style.color = editingMainUserSettings.windows.button.info.font.color;
                            }
                        });
                    }
                    setDefaultValuesMyActivity();

                    const createFilterUserActivityStatus = () => {
                        editingMainUserSettings.main.allowUserActivity.forEach(activity => {
                            filterStatus[activity.action] = true;
                        });
                    }
                    createFilterUserActivityStatus();

                    /**
                    * @description This function updates the "allow user activity" checkbox based on the
                    * current user activity status. It checks if any user activity is allowed and updates
                    * the checkbox accordingly.
                    * @returns {void}
                    */
                    const changeAllCheckBox = () => {
                        const allowUserActivityEl = document.getElementById('allowUserActivity');
                        const allowUserActivityTitleEl = document.getElementById('allowUserActivityTitle');
                        /**
                        * @description This function checks if any user activity in the provided array is allowed.
                        * It returns a boolean indicating if at least one user activity has a status of true.
                        * @param {Array} allowUserActivity - An array of user activity objects to check.
                        * @returns {boolean} - Returns true if any user activity is allowed, otherwise false.
                        */
                        const updateAllUserActivityStatus = (allowUserActivity) => {
                            const status = allowUserActivity.some(activity => activity.status);
                            return status;
                        };

                        allUserActivityStatus = updateAllUserActivityStatus(editingMainUserSettings.main.allowUserActivity);
                        allowUserActivityEl.checked = allUserActivityStatus;
                        if (!editingMainUserSettings.main.allowUserActivity.some(activity => activity.status)) {
                            allowUserActivityTitleEl.innerText = languageObject._activity._myActivity.activityIsDisabled;
                        } else if (editingMainUserSettings.main.allowUserActivity.some(activity => activity.status)) {
                            allowUserActivityTitleEl.innerText = languageObject._activity._myActivity.activityIsEnabled;
                        }
                    }
                    changeAllCheckBox();

                    const createEditAllUserActivityMenuBox = () => {
                        const editAllUserActivityMenuBoxEl = document.getElementById('editAllUserActivityMenuBox');
                        const userActivityFilterMenuBoxEl = document.getElementById('userActivityFilterMenuBox');
                        let menuHtml = ``;
                        if (editAllUserActivityMenuBoxStatus == false) {
                            editAllUserActivityMenuBoxEl.style.display = 'none';
                            editAllUserActivityMenuBoxStatus = true;
                            editAllUserActivityMenuBoxEl.innerHTML = menuHtml;
                            return;
                        }
                        if (filterAllUserActivityMenuBoxStatus == false) {
                            userActivityFilterMenuBoxEl.style.display = 'none';
                            filterAllUserActivityMenuBoxStatus = true;
                            userActivityFilterMenuBoxEl.innerHTML = menuHtml;
                        }
                        editAllUserActivityMenuBoxEl.style.display = 'flex';
                        editAllUserActivityMenuBoxStatus = false;

                        editingMainUserSettings.main.allowUserActivity.forEach((activity, index) => {
                            menuHtml += `
                                <div class="activityBox" style="background-color: ${editingMainUserSettings.windows.window.backgroundColor}">
                                    <label class="toggle" for="${activity.action}UserActivity">
                                        <input type="checkbox" class="toggleInput" id="${activity.action}UserActivity" data-action="${activity.action}" ${editingMainUserSettings.main.allowUserActivity[index].status ? 'checked' : ''} />
                                        <span class="toggleTrack">
                                            <span class="toggleIndicator">
                                                <span class="checkMark">
                                                    <svg viewBox="0 0 24 24" id="ghq-svg-check" role="presentation" aria-hidden="true">
                                                        <path d="M9.86 18a1 1 0 01-.73-.32l-4.86-5.17a1.001 1.001 0 011.46-1.37l4.12 4.39 8.41-9.2a1 1 0 111.48 1.34l-9.14 10a1 1 0 01-.73.33h-.01z"></path>
                                                    </svg>
                                                </span>
                                            </span>
                                        </span>
                                        ${languageObject._activity._myActivity._activityListTitles[activity.action] ? languageObject._activity._myActivity._activityListTitles[activity.action] : activity.title}
                                    </label>
                                </div>
                            `;
                        });
                        editAllUserActivityMenuBoxEl.innerHTML = menuHtml;

                        const toggleInput = document.querySelectorAll('.toggleInput');
                        const changeActivity = (el) => {
                            editingMainUserSettings.main.allowUserActivity.forEach(activity => {
                                if (activity.action == el.target.dataset.action) {
                                    activity.status = el.target.checked;
                                }
                            });
                            changeAllCheckBox();
                        }

                        toggleInput.forEach(el => {
                            el.addEventListener('change', changeActivity);
                        });
                    }

                    /**
                    * @description This function adds the appropriate sorting arrow icons to the sorting buttons
                    * for the activity header based on the current sort state (date or action). It updates the
                    * inner HTML of the sorting arrow elements to display either a down arrow, up arrow, or
                    * nothing, depending on the sort state.
                    * @returns {void}
                    */
                    const addArrowToSortingButtons = () => {
                        const activityHeaderDateArrowEl = document.getElementById('activityHeaderDateArrow');
                        const activityHeaderActionArrowEl = document.getElementById('activityHeaderActionArrow');

                        if (sortStateStatus.date == 'ascending') {
                            activityHeaderDateArrowEl.innerHTML = sortDownArrowSvg;
                        } else if (sortStateStatus.date == 'descending') {
                            activityHeaderDateArrowEl.innerHTML = sortUpArrowSvg;
                        } else if (sortStateStatus.date == 'none') {
                            activityHeaderDateArrowEl.innerHTML = sortNoneSvg;
                        }
                        if (sortStateStatus.action == 'ascending') {
                            activityHeaderActionArrowEl.innerHTML = sortDownArrowSvg;
                        } else if (sortStateStatus.action == 'descending') {
                            activityHeaderActionArrowEl.innerHTML = sortUpArrowSvg;
                        } else if (sortStateStatus.action == 'none') {
                            activityHeaderActionArrowEl.innerHTML = sortNoneSvg;
                        }
                    }
                    addArrowToSortingButtons();

                    /**
                    * @description This function creates and populates the current user's activity list
                    * with activity details. It fetches the user's activities, sorts them based on the
                    * current sort state (date or action), and generates HTML content to display these
                    * activities. It then sets the inner HTML of the activity list element and adds
                    * event listeners to the delete buttons.
                    * @returns {void}
                    */
                    const createCurrentUserActivityList = async () => {
                        try {
                            const activityListEl = document.getElementById('activityList');
                            let userActivityHtml = ``;

                            const paginateArray = (array, pageNumber, itemsPerPage) => {
                                // Calculate the starting index of the items for the requested page
                                const startIndex = (pageNumber - 1) * itemsPerPage;
                                // Calculate the ending index
                                const endIndex = startIndex + itemsPerPage;
                                // Return the sliced array for the requested page
                                return array.slice(startIndex, endIndex);
                            }

                            // paginate the userActivityArray based on the current page number and items per page
                            userActivityArrayPaginate = paginateArray(userActivityArrayFiltering, pageNumber, itemsPerPage);

                            if (sortStateStatus.date != 'none') {
                                if (sortStateStatus.date == 'ascending') {
                                    userActivityArrayPaginate.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                                } else if (sortStateStatus.date == 'descending') {
                                    userActivityArrayPaginate.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                                }
                            } else if (sortStateStatus.action != 'none') {
                                if (sortStateStatus.action == 'ascending') {
                                    userActivityArrayPaginate.sort((a, b) => parseFloat(b.actionId) - parseFloat(a.actionId));
                                } else if (sortStateStatus.action == 'descending') {
                                    userActivityArrayPaginate.sort((a, b) => parseFloat(a.actionId) - parseFloat(b.actionId));
                                }
                            }

                            userActivityArrayPaginate.forEach(action => {
                                if ((action.action == 'createProfile' && filterStatus[action.action]) || (action.action == 'deleteProfile' && filterStatus[action.action])) {
                                    userActivityHtml += `
                                        <div class="activityItem">
                                            <div class="dateTime">
                                                <div class="date">${formatDateTime(action.timestamp, 'en-US', 'date')}</div>
                                                <div class="time">${formatDateTime(action.timestamp, 'en-US', 'time')}</div>
                                            </div>
                                            <div class="action">${languageObject._activity._myActivity._activityListTitles[action.action]}</div>
                                            <div class="actionDetail">
                                                <div class="detail">
                                                    <div class="detailProfile" title="${action.details.profileName}">${truncateString(action.details.profileName, 26, 0)}</div>
                                                    <div class="detailOsAndBrowser">
                                                        <div class="os">${action.details.os}</div>
                                                        <div class="browser">${action.details.browser.name} ${action.details.browser.version}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="delete">
                                                <button class="deleteButton" style="background-color: ${editingMainUserSettings.windows.button.danger.backgroundColor}" data-id="${action.id}">
                                                    <svg style="pointer-events: none;" width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M4 6H20L18.4199 20.2209C18.3074 21.2337 17.4512 22 16.4321 22H7.56786C6.54876 22 5.69264 21.2337 5.5801 20.2209L4 6Z" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                        <path d="M7.34491 3.14716C7.67506 2.44685 8.37973 2 9.15396 2H14.846C15.6203 2 16.3249 2.44685 16.6551 3.14716L18 6H6L7.34491 3.14716Z" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                        <path d="M2 6H22" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                        <path d="M10 11V16" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                        <path d="M14 11V16" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    `;
                                }
                                if ((action.action == 'openExtension' && filterStatus[action.action]) || (action.action == 'closeExtension' && filterStatus[action.action])) {
                                    userActivityHtml += `
                                        <div class="activityItem">
                                            <div class="dateTime">
                                                <div class="date">${formatDateTime(action.timestamp, 'en-US', 'date')}</div>
                                                <div class="time">${formatDateTime(action.timestamp, 'en-US', 'time')}</div>
                                            </div>
                                            <div class="action">${languageObject._activity._myActivity._activityListTitles[action.action]}</div>
                                            <div class="actionDetail">
                                                <div class="detail">
                                                    <div class="detailProfile"></div>
                                                    <div class="detailOsAndBrowser">
                                                        <div class="os">${action.details.os}</div>
                                                        <div class="browser">${action.details.browser.name} ${action.details.browser.version}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="delete">
                                                <button class="deleteButton" style="background-color: ${editingMainUserSettings.windows.button.danger.backgroundColor}" data-id="${action.id}">
                                                    <svg style="pointer-events: none;" width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M4 6H20L18.4199 20.2209C18.3074 21.2337 17.4512 22 16.4321 22H7.56786C6.54876 22 5.69264 21.2337 5.5801 20.2209L4 6Z" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                        <path d="M7.34491 3.14716C7.67506 2.44685 8.37973 2 9.15396 2H14.846C15.6203 2 16.3249 2.44685 16.6551 3.14716L18 6H6L7.34491 3.14716Z" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                        <path d="M2 6H22" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                        <path d="M10 11V16" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                        <path d="M14 11V16" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    `;
                                }
                                if ((action.action == 'createBookmark' && filterStatus[action.action]) || (action.action == 'createFolder' && filterStatus[action.action])) {
                                    userActivityHtml += `
                                        <div class="activityItem">
                                            <div class="dateTime">
                                                <div class="date">${formatDateTime(action.timestamp, 'en-US', 'date')}</div>
                                                <div class="time">${formatDateTime(action.timestamp, 'en-US', 'time')}</div>
                                            </div>
                                            <div class="action">${languageObject._activity._myActivity._activityListTitles[action.action]}</div>
                                            <div class="actionDetail">
                                                <div class="detail">
                                                    <div class="detailProfile" title="${action.action == 'createBookmark' ? action.details.bookmark.title : action.details.folder.title}">${action.action == 'createBookmark' ? truncateString(action.details.bookmark.title, 33, 0) : truncateString(action.details.folder.title, 33, 0)}</div>
                                                    <div class="detailOsAndBrowser">
                                                        <div class="os">${action.details.os}</div>
                                                        <div class="browser">${action.details.browser.name} ${action.details.browser.version}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="delete">
                                                <button class="deleteButton" style="background-color: ${editingMainUserSettings.windows.button.danger.backgroundColor}" data-id="${action.id}">
                                                    <svg style="pointer-events: none;" width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M4 6H20L18.4199 20.2209C18.3074 21.2337 17.4512 22 16.4321 22H7.56786C6.54876 22 5.69264 21.2337 5.5801 20.2209L4 6Z" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                        <path d="M7.34491 3.14716C7.67506 2.44685 8.37973 2 9.15396 2H14.846C15.6203 2 16.3249 2.44685 16.6551 3.14716L18 6H6L7.34491 3.14716Z" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                        <path d="M2 6H22" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                        <path d="M10 11V16" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                        <path d="M14 11V16" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    `;
                                }
                                if ((action.action == 'deleteBookmark' && filterStatus[action.action]) || (action.action == 'deleteFolder' && filterStatus[action.action])) {
                                    userActivityHtml += `
                                        <div class="activityItem">
                                            <div class="dateTime">
                                                <div class="date">${formatDateTime(action.timestamp, 'en-US', 'date')}</div>
                                                <div class="time">${formatDateTime(action.timestamp, 'en-US', 'time')}</div>
                                            </div>
                                            <div class="action">${languageObject._activity._myActivity._activityListTitles[action.action]}</div>
                                            <div class="actionDetail">
                                                <div class="detail">
                                                    <div class="detailProfile" title="${action.action == 'deleteBookmark' ? action.details.bookmark.title : action.details.folder.title}">${action.action == 'deleteBookmark' ? truncateString(action.details.bookmark.title, 33, 0) : truncateString(action.details.folder.title, 33, 0)}</div>
                                                    <div class="detailOsAndBrowser">
                                                        <div class="os">${action.details.os}</div>
                                                        <div class="browser">${action.details.browser.name} ${action.details.browser.version}</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="delete">
                                                <button class="deleteButton" style="background-color: ${editingMainUserSettings.windows.button.danger.backgroundColor}" data-id="${action.id}">
                                                    <svg style="pointer-events: none;" width="25px" height="25px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M4 6H20L18.4199 20.2209C18.3074 21.2337 17.4512 22 16.4321 22H7.56786C6.54876 22 5.69264 21.2337 5.5801 20.2209L4 6Z" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                        <path d="M7.34491 3.14716C7.67506 2.44685 8.37973 2 9.15396 2H14.846C15.6203 2 16.3249 2.44685 16.6551 3.14716L18 6H6L7.34491 3.14716Z" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                        <path d="M2 6H22" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                        <path d="M10 11V16" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                        <path d="M14 11V16" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    `;
                                }
                            });
                            activityListEl.innerHTML = userActivityHtml;

                            const setStylesToActivityItem = () => {
                                const activityItem = document.querySelectorAll('.activityItem');
                                activityItem.forEach((item, index) => {
                                    if (index % 2) {
                                        item.style.backgroundColor = colorPalette[0];
                                    } else {
                                        item.style.backgroundColor = colorPalette[2];
                                    }
                                });
                            }
                            setStylesToActivityItem();

                            const addEventListenersDeleteMyActivity = () => {
                                const deleteButton = document.querySelectorAll('.deleteButton');

                                deleteButton.forEach(el => {
                                    el.addEventListener('click', (event) => {
                                        const id = el.dataset.id;
                                        userActivityRegister('delete', 'deleteLogById', id);
                                        const parentElement = event.target.closest('.activityItem');
                                        if (parentElement) {
                                            parentElement.remove();
                                        }
                                    });
                                });
                            }
                            addEventListenersDeleteMyActivity();
                        } catch (error) {
                            console.error('Error creating current user activity list: ', error);
                        }
                    }

                    const setPagesQuantity = () => {
                        const editQuantityFilterPerPageSpanEl = document.getElementById('editQuantityFilterPerPageSpan');
                        if (userActivityArrayFiltering.length === 0) {
                            editQuantityFilterPerPageSpanEl.innerText = `${languageObject._activity._myActivity.page} 0 / 0`;
                            allowButtonsStatus = {
                                pageLeftToStartButton: false,
                                pageLeftButton: false,
                                quantityButtonsArray: false,
                                pageRightButton: false,
                                pageRightToEndButton: false,
                            };
                            createCurrentUserActivityList();
                            return;
                        }
                        allowButtonsStatus = {
                            pageLeftToStartButton: true,
                            pageLeftButton: true,
                            quantityButtonsArray: true,
                            pageRightButton: true,
                            pageRightToEndButton: true
                        };
                        pagesQuantity = Math.ceil((userActivityArrayFiltering.length + 1) / itemsPerPage);
                        editQuantityFilterPerPageSpanEl.innerText = `${languageObject._activity._myActivity.page} ${pageNumber} / ${pagesQuantity}`;
                        createCurrentUserActivityList();
                    }

                    const addEventListenerToNavigateByPage = async () => {
                        const pageLeftToStartButton = document.getElementById('pageLeftToStart');
                        const pageLeftButton = document.getElementById('pageLeft');
                        const editQuantityFilterPerPageButton = document.getElementById('editQuantityFilterPerPage');
                        const quantityButtonsArray = document.querySelectorAll('[data-quantity]');
                        const listQuantityEl = document.getElementById('listQuantity');
                        const pageRightButton = document.getElementById('pageRight');
                        const pageRightToEndButton = document.getElementById('pageRightToEnd');

                        listQuantityEl.style.backgroundColor = editingMainUserSettings.windows.window.backgroundColor;

                        setPagesQuantity();

                        const pageNumberToStart = () => {
                            if (allowButtonsStatus.pageLeftToStartButton) { pageNumber = 1; setPagesQuantity(); };
                        }

                        const mouseEnterPageNumberToStart = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.hoverBackgroundColor;
                            el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        }

                        const mouseLeavePageNumberToStart = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                            el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        }

                        const decreasePageNumber = () => {
                            if (pageNumber > 1 && allowButtonsStatus.pageLeftButton) { pageNumber--; setPagesQuantity(); };
                        }

                        const mouseEnterDecreasePageNumber = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.hoverBackgroundColor;
                            el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        }

                        const mouseLeaveDecreasePageNumber = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                            el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        }

                        const showQuantityMenu = () => {
                            if (listQuantityEl.style.display === 'flex') {
                                listQuantityEl.style.display = 'none';
                            } else {
                                listQuantityEl.style.display = 'flex';
                            }
                            quantityButtonsArray.forEach(button => {
                                if (itemsPerPage === parseInt(button.dataset.quantity)) {
                                    button.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                                    button.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                                } else {
                                    button.style.backgroundColor = editingMainUserSettings.windows.button.info.backgroundColor;
                                    button.style.color = editingMainUserSettings.windows.button.info.font.color;
                                }
                            });
                        }

                        const setQuantity = (el) => {
                            if (!allowButtonsStatus.quantityButtonsArray) return;
                            const quantity = el.target.dataset.quantity;
                            itemsPerPage = parseInt(quantity);
                            pageNumber = 1;
                            quantityButtonsArray.forEach(button => {
                                if (itemsPerPage === parseInt(button.dataset.quantity)) {
                                    button.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                                    button.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                                } else {
                                    button.style.backgroundColor = editingMainUserSettings.windows.button.info.backgroundColor;
                                    button.style.color = editingMainUserSettings.windows.button.info.font.color;
                                }
                            });
                            setPagesQuantity();
                        }

                        const mouseEnterSetQuantity = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.info.hoverBackgroundColor;
                            el.target.style.color = editingMainUserSettings.windows.button.info.font.color;
                        }

                        const mouseLeaveSetQuantity = (el) => {
                            if (itemsPerPage === parseInt(el.target.dataset.quantity)) {
                                el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                                el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                            } else {
                                el.target.style.backgroundColor = editingMainUserSettings.windows.button.info.backgroundColor;
                                el.target.style.color = editingMainUserSettings.windows.button.info.font.color;
                            }
                        }

                        const mouseEnterShowQuantityMenu = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.hoverBackgroundColor;
                            el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        }

                        const mouseLeaveShowQuantityMenu = (el) => {
                            listQuantityEl.style.display = 'none';
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                            el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        }

                        const increasePageNumber = () => {
                            if (pageNumber < pagesQuantity && allowButtonsStatus.pageRightButton) { pageNumber++; setPagesQuantity(); };
                        }

                        const mouseEnterIncreasePageNumber = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.hoverBackgroundColor;
                            el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        }

                        const mouseLeaveIncreasePageNumber = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                            el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        }

                        const pageNumberToEnd = () => {
                            if (allowButtonsStatus.pageRightToEndButton) { pageNumber = pagesQuantity; setPagesQuantity(); };
                        }

                        const mouseEnterPageNumberToEnd = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.hoverBackgroundColor;
                            el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        }

                        const mouseLeavePageNumberToEnd = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                            el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        }

                        pageLeftToStartButton.addEventListener('click', pageNumberToStart);
                        pageLeftToStartButton.addEventListener('mouseenter', mouseEnterPageNumberToStart);
                        pageLeftToStartButton.addEventListener('mouseleave', mouseLeavePageNumberToStart);
                        pageLeftButton.addEventListener('click', decreasePageNumber);
                        pageLeftButton.addEventListener('mouseenter', mouseEnterDecreasePageNumber);
                        pageLeftButton.addEventListener('mouseleave', mouseLeaveDecreasePageNumber);
                        pageRightButton.addEventListener('click', increasePageNumber);
                        pageRightButton.addEventListener('mouseenter', mouseEnterIncreasePageNumber);
                        pageRightButton.addEventListener('mouseleave', mouseLeaveIncreasePageNumber);
                        pageRightToEndButton.addEventListener('click', pageNumberToEnd);
                        pageRightToEndButton.addEventListener('mouseenter', mouseEnterPageNumberToEnd);
                        pageRightToEndButton.addEventListener('mouseleave', mouseLeavePageNumberToEnd);
                        editQuantityFilterPerPageButton.addEventListener('click', showQuantityMenu);
                        editQuantityFilterPerPageButton.addEventListener('mouseenter', mouseEnterShowQuantityMenu);
                        editQuantityFilterPerPageButton.addEventListener('mouseleave', mouseLeaveShowQuantityMenu);
                        quantityButtonsArray.forEach(button => {
                            button.addEventListener('click', setQuantity);
                            button.addEventListener('mouseenter', mouseEnterSetQuantity);
                            button.addEventListener('mouseleave', mouseLeaveSetQuantity);
                        });

                    }
                    addEventListenerToNavigateByPage();

                    const createFilterUserActivityMenuBox = () => {
                        const editAllUserActivityMenuBoxEl = document.getElementById('editAllUserActivityMenuBox');
                        const userActivityFilterMenuBoxEl = document.getElementById('userActivityFilterMenuBox');
                        let menuHtml = ``;
                        if (filterAllUserActivityMenuBoxStatus == false) {
                            userActivityFilterMenuBoxEl.style.display = 'none';
                            filterAllUserActivityMenuBoxStatus = true;
                            userActivityFilterMenuBoxEl.innerHTML = menuHtml;
                            return;
                        }
                        if (editAllUserActivityMenuBoxStatus == false) {
                            editAllUserActivityMenuBoxEl.style.display = 'none';
                            editAllUserActivityMenuBoxStatus = true;
                            editAllUserActivityMenuBoxEl.innerHTML = menuHtml;
                        }
                        userActivityFilterMenuBoxEl.style.display = 'flex';
                        filterAllUserActivityMenuBoxStatus = false;

                        editingMainUserSettings.main.allowUserActivity.forEach(activity => {
                            menuHtml += `
                                <div class="activityBox" style="background-color: ${editingMainUserSettings.windows.window.backgroundColor}">
                                    <label class="toggle" for="${activity.action}UserActivity">
                                        <input type="checkbox" class="toggleInput" id="${activity.action}UserActivity" data-action="${activity.action}" ${filterStatus[activity.action] ? 'checked' : ''} />
                                        <span class="toggleTrack">
                                            <span class="toggleIndicator">
                                                <span class="checkMark">
                                                    <svg viewBox="0 0 24 24" id="ghq-svg-check" role="presentation" aria-hidden="true">
                                                        <path d="M9.86 18a1 1 0 01-.73-.32l-4.86-5.17a1.001 1.001 0 011.46-1.37l4.12 4.39 8.41-9.2a1 1 0 111.48 1.34l-9.14 10a1 1 0 01-.73.33h-.01z"></path>
                                                    </svg>
                                                </span>
                                            </span>
                                        </span>
                                        ${languageObject._activity._myActivity._activityListTitles[activity.action] ? languageObject._activity._myActivity._activityListTitles[activity.action] : activity.title}
                                    </label>
                                </div>
                            `;
                        });
                        userActivityFilterMenuBoxEl.innerHTML = menuHtml;

                        const toggleInput = document.querySelectorAll('.toggleInput');
                        const changeActivity = (el) => {
                            const action = el.target.dataset.action;
                            filterStatus[action] = el.target.checked;
                            userActivityArrayFiltering = userActivityArray.activities.filter(action => { return filterStatus[action.action] });
                            pageNumber = 1;
                            setPagesQuantity();
                        }

                        toggleInput.forEach(el => {
                            el.addEventListener('change', changeActivity);
                        });
                    }

                    /**
                    * Adds event listeners to various elements related to user activity management.
                    * This function sets up event listeners for buttons and elements that allow the user to edit,
                    * change, delete, and sort user activities.
                    */
                    const addEventListenersMyActivity = () => {
                        const editAllUserActivityBtn = document.getElementById('editAllUserActivityBtn');
                        const allowUserActivityTitleEl = document.getElementById('allowUserActivityTitle');
                        const allowUserActivityEl = document.getElementById('allowUserActivity');
                        const deleteAllActivityButtonEl = document.getElementById('deleteAllActivityButton');
                        const activityHeaderDateArrowEl = document.getElementById('activityHeaderDateArrow');
                        const activityHeaderActionArrowEl = document.getElementById('activityHeaderActionArrow');
                        const userActivityExportToCsvBtn = document.getElementById('userActivityExportToCsv');
                        const userActivityFilterBtn = document.getElementById('userActivityFilter');

                        /**
                        * Displays the menu box for editing all user activities.
                        * Adds a 'mouseleave' event listener to hide the menu box when the mouse leaves the area.
                        */
                        const showEditAllUserActivityMenuBox = () => {
                            const editAllUserActivityMenuBoxEl = document.getElementById('editAllUserActivityMenuBox');
                            createEditAllUserActivityMenuBox();
                            editAllUserActivityMenuBoxEl.addEventListener('mouseleave', () => {
                                editAllUserActivityMenuBoxStatus = false;
                                createEditAllUserActivityMenuBox();
                            });
                        }

                        /**
                        * Changes the status of all user activities based on the checkbox state.
                        * @param {Event} el - The event object from the change event.
                        */
                        const changeAllUserActivity = (el) => {
                            editingMainUserSettings.main.allowUserActivity.forEach(activity => {
                                activity.status = el.target.checked;
                            });
                            editAllUserActivityMenuBoxStatus = false;
                            if (!editingMainUserSettings.main.allowUserActivity.some(activity => activity.status)) {
                                allowUserActivityTitleEl.innerText = languageObject._activity._myActivity.activityIsDisabled;
                            } else if (editingMainUserSettings.main.allowUserActivity.some(activity => activity.status)) {
                                allowUserActivityTitleEl.innerText = languageObject._activity._myActivity.activityIsEnabled;
                            }
                            createEditAllUserActivityMenuBox();
                        }

                        /**
                        * Deletes all user activities.
                        * This function calls the userActivityRegister function with the 'delete' action and 'deleteLogAll' method
                        * to remove all user activity logs from the system.
                        *
                        * @returns {void} This function does not return a value.
                        */
                        const deleteAllUserActivity = async () => {
                            userActivityRegister('delete', 'deleteLogAll', '');
                            await addEventListenerToNavigateByPage();
                        }

                        const mouseenterDeleteAllUserActivity = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.hoverBackgroundColor;
                            el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        }

                        const mouseleaveDeleteAllUserActivity = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                            el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        }

                        /**
                        * Sorts the user activities by date.
                        * Toggles the sort state between 'none', 'ascending', and 'descending'.
                        */
                        const sortByDate = () => {
                            sortStateStatus.action = 'none';
                            if (sortStateStatus.date == 'none') {
                                sortStateStatus.date = 'ascending';
                            } else if (sortStateStatus.date == 'ascending') {
                                sortStateStatus.date = 'descending';
                            } else if (sortStateStatus.date == 'descending') {
                                sortStateStatus.date = 'ascending';
                            }
                            addArrowToSortingButtons();
                            createCurrentUserActivityList();
                        }

                        /**
                        * Sorts the user activities by action.
                        * Toggles the sort state between 'none', 'ascending', and 'descending'.
                        */
                        const sortByAction = () => {
                            sortStateStatus.date = 'none';
                            if (sortStateStatus.action == 'none') {
                                sortStateStatus.action = 'ascending';
                            } else if (sortStateStatus.action == 'ascending') {
                                sortStateStatus.action = 'descending';
                            } else if (sortStateStatus.action == 'descending') {
                                sortStateStatus.action = 'ascending';
                            }
                            addArrowToSortingButtons();
                            createCurrentUserActivityList();
                        }

                        /**
                        * Displays the filter menu box for user activities and sets up event listeners.
                        * This function shows the filter menu box for user activities and adds a 'mouseleave' event listener
                        * to hide the menu box when the mouse leaves the area.
                        */
                        const showFilterAllUserActivityMenuBox = () => {
                            const userActivityFilterMenuBoxEl = document.getElementById('userActivityFilterMenuBox');
                            createFilterUserActivityMenuBox();
                            userActivityFilterMenuBoxEl.addEventListener('mouseleave', () => {
                                filterAllUserActivityMenuBoxStatus = false;
                                createFilterUserActivityMenuBox();
                            });
                        }

                        const mouseenterShowFilterAllUserActivityMenuBox = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.hoverBackgroundColor;
                            el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        }

                        const mouseleaveShowFilterAllUserActivityMenuBox = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                            el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        }

                        /**
                         * Exports user activity data to a CSV file.
                         */
                        const exportToCsvFile = async () => {
                            try {
                                const userActivity = await userActivityRegister('get', 'getAllLog').then(activities => { return activities; });

                                /**
                                 * Saves the provided content to a file and triggers a download.
                                 *
                                 * @param {string} content - The content to be saved in the file.
                                 * @param {string} fileName - The name of the file to be created.
                                 * @param {string} contentType - The MIME type of the file content.
                                 */
                                const saveToFile = (content, fileName, contentType) => {
                                    let a = document.createElement("a");
                                    let file = new Blob([content], { type: contentType });
                                    a.href = URL.createObjectURL(file);
                                    a.download = fileName;
                                    a.click();
                                };

                                /**
                                 * Converts a JSON array to a CSV string.
                                 *
                                 * @param {Object[]} json - The JSON array to be converted. Each object in the array should have the same keys.
                                 * @returns {string} The CSV string representation of the JSON array.
                                 */
                                const jsonToCSV = (json) => {
                                    const keys = Object.keys(json[0]);
                                    const csvRows = [keys.join(',')];
                                    json.forEach(obj => {
                                        const values = keys.map(key => obj[key]);
                                        csvRows.push(values.join(','));
                                    });

                                    return csvRows.join('\n');
                                };

                                /**
                                 * Exports a JSON array to a CSV file.
                                 *
                                 * @param {Object[]} json - The JSON array to be exported.
                                 */
                                const exportToCSV = async (json) => {
                                    try {
                                        const timestamp = new Date().getTime();
                                        const csv = jsonToCSV(json);
                                        saveToFile(csv, `Export my activity (${formatDateTime(timestamp, currentLanguage, 'dateAndTime')}).csv`, 'text/csv');
                                    } catch (error) {
                                        console.error('%c%s', '', 'Error exporting to CSV:', error);
                                    }
                                };

                                const preparingJson = removeAllNestingFromObj(userActivity.activities);

                                exportToCSV(preparingJson);
                            } catch (error) {
                                console.error('Error', error);
                            }
                        };

                        const mouseenterExportToCsvFile = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.hoverBackgroundColor;
                            el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        }

                        const mouseleaveExportToCsvFile = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.secondary.backgroundColor;
                            el.target.style.color = editingMainUserSettings.windows.button.secondary.font.color;
                        }

                        editAllUserActivityBtn.addEventListener('click', showEditAllUserActivityMenuBox);
                        allowUserActivityEl.addEventListener('change', changeAllUserActivity);
                        deleteAllActivityButtonEl.addEventListener('click', deleteAllUserActivity);
                        deleteAllActivityButtonEl.addEventListener('mouseenter', mouseenterDeleteAllUserActivity);
                        deleteAllActivityButtonEl.addEventListener('mouseleave', mouseleaveDeleteAllUserActivity);
                        activityHeaderDateArrowEl.addEventListener('click', sortByDate);
                        activityHeaderActionArrowEl.addEventListener('click', sortByAction);
                        userActivityFilterBtn.addEventListener('click', showFilterAllUserActivityMenuBox);
                        userActivityFilterBtn.addEventListener('mouseenter', mouseenterShowFilterAllUserActivityMenuBox);
                        userActivityFilterBtn.addEventListener('mouseleave', mouseleaveShowFilterAllUserActivityMenuBox);
                        userActivityExportToCsvBtn.addEventListener('click', exportToCsvFile);
                        userActivityExportToCsvBtn.addEventListener('mouseenter', mouseenterExportToCsvFile);
                        userActivityExportToCsvBtn.addEventListener('mouseleave', mouseleaveExportToCsvFile);
                    }
                    addEventListenersMyActivity();
                    break;
                case 'exportProfile':
                    let allowToSetPasswordToggle = false;
                    let isPasswordVisible = true;
                    let fileName = ``;
                    let setDefaultToUI;

                    const hidePasswordSvg = `<svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16.01C14.2091 16.01 16 14.2191 16 12.01C16 9.80087 14.2091 8.01001 12 8.01001C9.79086 8.01001 8 9.80087 8 12.01C8 14.2191 9.79086 16.01 12 16.01Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 11.98C8.09 1.31996 15.91 1.32996 22 11.98" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 12.01C15.91 22.67 8.09 22.66 2 12.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                    const showPasswordSvg = `<svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.83 9.17999C14.2706 8.61995 13.5576 8.23846 12.7813 8.08386C12.0049 7.92926 11.2002 8.00851 10.4689 8.31152C9.73758 8.61453 9.11264 9.12769 8.67316 9.78607C8.23367 10.4444 7.99938 11.2184 8 12.01C7.99916 13.0663 8.41619 14.08 9.16004 14.83" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 16.01C13.0609 16.01 14.0783 15.5886 14.8284 14.8384C15.5786 14.0883 16 13.0709 16 12.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.61 6.39004L6.38 17.62C4.6208 15.9966 3.14099 14.0944 2 11.99C6.71 3.76002 12.44 1.89004 17.61 6.39004Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.9994 3L17.6094 6.39" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.38 17.62L3 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.5695 8.42999C20.4801 9.55186 21.2931 10.7496 21.9995 12.01C17.9995 19.01 13.2695 21.4 8.76953 19.23" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

                    let exportObj = {
                        details: {
                            exportType: [],
                            timestampCreation: '',
                        },
                        export: {},
                    };
                    settingsWindowRightSectionHtml = `
                        <div id="exportProfileSection">
                            <div id="exportFileTitle">
                                <title for="exportFileTitleInput" id="exportFileTitleInputTitle">File Title</title>
                                <div id="exportFileTitleInputAndExtension">
                                    <input type="text" id="exportFileTitleInput">
                                    <div id="fileExtension">.${exportFileExtensionName}</div>
                                </div>
                            </div>
                            <div id="exportSelectType"></div>
                            <div id="exportFilePassword">
                                <div id="passwordBox">
                                    <title for="exportFilePasswordInput" id="exportFilePasswordInputTitle">File Password</title>
                                    <div id="passwordAndIcon">
                                        <input type="password" id="exportFilePasswordInput" >
                                        <button id="passwordShowHideIcon">${hidePasswordSvg}</button>
                                    </div>
                                </div>
                                <div id="toggleSetPassword">
                                    <label class="toggle" for="showHideExportPassword">
                                        <span id="showHideExportPasswordTitle">Set Encryption</span>
                                        <input type="checkbox" class="toggleInput" id="showHideExportPassword" ${allowToSetPasswordToggle ? 'checked' : ''} />
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
                            </div>
                            <div id="exportAnimationAndButton">
                                <div id="exportAnimationProgress">
                                    <div id="progressContainer">
                                        <div id="progressBar"></div>
                                        <div id="progressNumber">0%</div>
                                    </div>
                                </div>
                                <div id="exportControls">
                                    <button id="exportButton">Export</button>
                                </div>
                            </div>
                        </div>
                    `;
                    settingsWindowRightSectionEl.innerHTML = settingsWindowRightSectionHtml;

                    const updateWindowStyleExportSettingsTitlesUI = () => {
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
                            exportFileTitleInputTitle: {
                                id: 'exportFileTitleInputTitle',
                                text: languageObject._exportImportOptions._exportProfile.chooseTitle,
                                classNames: []
                            },
                            showHideExportPasswordTitle: {
                                id: 'showHideExportPasswordTitle',
                                text: languageObject._exportImportOptions._exportProfile.setEncryption,
                                classNames: []
                            },
                            exportFilePasswordInputTitle: {
                                id: 'exportFilePasswordInputTitle',
                                text: languageObject._exportImportOptions._exportProfile.setPassword,
                                classNames: []
                            },
                            exportButton: {
                                id: 'exportButton',
                                text: languageObject._exportImportOptions._exportProfile.export,
                                classNames: []
                            }
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
                    updateWindowStyleExportSettingsTitlesUI();

                    const setDefaultStyleToElements = () => {
                        const exportFileTitleInputEl = document.getElementById('exportFileTitleInput');
                        const exportFilePasswordInputEl = document.getElementById('exportFilePasswordInput');
                        const progressContainerEl = document.getElementById('progressContainer');
                        const exportButtonEl = document.getElementById('exportButton');

                        exportFileTitleInputEl.style.backgroundColor = colorPalette[1];
                        exportFilePasswordInputEl.style.backgroundColor = colorPalette[1];
                        progressContainerEl.style.backgroundColor = colorPalette[1];
                        exportButtonEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                    }
                    setDefaultStyleToElements();

                    const createExportSelectTypeMenuBox = () => {
                        const exportSelectTypeEl = document.getElementById('exportSelectType');

                        let exportSelectTypeHtml = ``;
                        exportSelectTypeEl.innerHTML = exportSelectTypeHtml;

                        exportType.forEach(type => {
                            type.status = false;
                            const typeLanguageTitle = languageObject._exportImportOptions._exportProfile._exportTypes[type.type];
                            exportSelectTypeHtml += `
                                <div class="exportTypeBox" style="background-color: ${colorPalette[1]};">
                                    <label class="toggle" for="${type.type}Export">
                                        <input type="checkbox" class="toggleInput exportToggleInput" id="${type.type}Export" data-type="${type.type}" ${type.status ? 'checked' : ''} />
                                        <span class="toggleTrack">
                                            <span class="toggleIndicator">
                                                <span class="checkMark">
                                                    <svg viewBox="0 0 24 24" id="ghq-svg-check" role="presentation" aria-hidden="true">
                                                        <path d="M9.86 18a1 1 0 01-.73-.32l-4.86-5.17a1.001 1.001 0 011.46-1.37l4.12 4.39 8.41-9.2a1 1 0 111.48 1.34l-9.14 10a1 1 0 01-.73.33h-.01z"></path>
                                                    </svg>
                                                </span>
                                            </span>
                                        </span>
                                        ${typeLanguageTitle ?? type.title}
                                    </label>
                                </div>
                            `;
                        });
                        exportSelectTypeEl.innerHTML = exportSelectTypeHtml;

                        const exportToggleInput = document.querySelectorAll('.exportToggleInput');

                        const gradientArray = new Gradient().setColorGradient(editingMainUserSettings.windows.button.warning.backgroundColor, editingMainUserSettings.windows.button.info.backgroundColor).setMidpoint(20).getColors();
                        const progressBarEl = document.getElementById('progressBar');
                        const progressNumberEl = document.getElementById('progressNumber');

                        progressBarEl.style.background = `linear-gradient(0deg, ${gradientArray.map(i => `${i}`).join(',')})`;
                        progressNumberEl.style.backgroundColor = editingMainUserSettings.windows.button.warning.backgroundColor;
                        progressNumberEl.style.color = editingMainUserSettings.windows.button.warning.font.color;

                        setDefaultToUI = () => {
                            const exportFileTitleInputEl = document.getElementById('exportFileTitleInput');
                            const showHideExportPasswordEl = document.getElementById('showHideExportPassword');
                            const passwordBoxEl = document.getElementById('passwordBox');
                            const exportFilePasswordInputEl = document.getElementById('exportFilePasswordInput');
                            const dateToFormat = formatDateTime(new Date().getTime(), currentLanguage, 'fileName');
                            fileName = `${languageObject._exportImportOptions._exportProfile.export ?? 'Export'} ${dateToFormat.replace(/[<>:{}'"/\\|?*]+/g, '')}`;
                            exportFileTitleInputEl.value = fileName;
                            exportType.forEach(type => {
                                type.status = false;
                                const checkbox = document.querySelector(`[data-type="${type.type}"]`);
                                checkbox.checked = false;
                                checkbox.removeAttribute('disabled');
                            });
                            exportFilePasswordInputEl.value = '';
                            passwordBoxEl.style.display = `none`;
                            showHideExportPasswordEl.checked = false;
                        }
                        setDefaultToUI();

                        const applyStatusToCheckbox = (type, status) => {
                            let someFilter = exportType.filter(a => !(a.type === 'allProfiles' || a.type === 'currentAllProfile' || a.type === type)).some(a => a.status);
                            if (type == 'allProfiles' && status) {
                                exportToggleInput.forEach(element => {
                                    if (element.dataset.type != type) {
                                        element.checked = true;
                                        element.setAttribute('disabled', 'disabled');
                                    } else {
                                        element.removeAttribute('disabled');
                                    }
                                });
                            } else if (type == 'allProfiles' && !status) {
                                exportToggleInput.forEach(element => {
                                    if (element.dataset.type != type) {
                                        element.checked = false;
                                        element.removeAttribute('disabled');
                                    }
                                });
                            }
                            if (type == 'currentAllProfile' && status) {
                                exportToggleInput.forEach(element => {
                                    if (element.dataset.type != type) {
                                        element.checked = true;
                                        element.setAttribute('disabled', 'disabled');
                                    } else {
                                        element.removeAttribute('disabled');
                                    }
                                    if (element.dataset.type == 'allProfiles') { element.checked = false; }
                                });
                            } else if (type == 'currentAllProfile' && !status) {
                                exportToggleInput.forEach(element => {
                                    if (element.dataset.type != type) {
                                        element.checked = false;
                                        element.removeAttribute('disabled');
                                    }
                                });
                            }
                            if ((type == 'currentBookmarks' && status) ||
                                (type == 'defaultFolderStyle' && status) ||
                                (type == 'defaultBookmarksStyle' && status) ||
                                (type == 'userSettings' && status) ||
                                (type == 'currentUserActivityLog' && status)) {
                                exportToggleInput.forEach(element => {
                                    if (element.dataset.type == 'allProfiles' || element.dataset.type == 'currentAllProfile') {
                                        element.setAttribute('disabled', 'disabled');
                                        element.checked = false;
                                    }
                                });
                            } else if ((type == 'currentBookmarks' && !status && !someFilter) ||
                                (type == 'defaultFolderStyle' && !status && !someFilter) ||
                                (type == 'defaultBookmarksStyle' && !status && !someFilter) ||
                                (type == 'userSettings' && !status && !someFilter) ||
                                (type == 'currentUserActivityLog' && !status && !someFilter)) {
                                exportToggleInput.forEach(element => {
                                    if (element.dataset.type != type) {
                                        element.removeAttribute('disabled');
                                    }
                                });
                            }
                        }

                        const changeExportType = (el) => {
                            const type = el.target.dataset.type;
                            const status = el.target.checked;
                            exportType.forEach(typeObj => {
                                if (typeObj.type === type) {
                                    typeObj.status = status;
                                }
                            });
                            applyStatusToCheckbox(type, status);
                        }

                        exportToggleInput.forEach(el => {
                            el.addEventListener('change', changeExportType);
                        });
                    }
                    createExportSelectTypeMenuBox();

                    const addEventListenersToExportProfile = () => {
                        const exportFileTitleInputEl = document.getElementById('exportFileTitleInput');
                        const showHideExportPasswordEl = document.getElementById('showHideExportPassword');
                        const passwordShowHideIconBtn = document.getElementById('passwordShowHideIcon');
                        const exportFilePasswordInputEl = document.getElementById('exportFilePasswordInput');
                        const exportButtonEl = document.getElementById('exportButton');

                        let passwordValue = '';
                        let preparedObjectToExport = '';
                        exportButtonEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;

                        const showErrorToInputFileName = () => {
                            gsap.fromTo(exportFileTitleInputEl, 0.2, {
                                x: -3,
                            }, {
                                duration: .2,
                                x: +3,
                                backgroundColor: editingMainUserSettings.windows.button.danger.backgroundColor,
                                yoyo: true,
                                repeat: 5,
                                onComplete: () => {
                                    gsap.killTweensOf(exportFileTitleInputEl);
                                    gsap.set(exportFileTitleInputEl, { clearProps: 'all' });
                                }
                            });
                        }

                        const preparingFileName = () => {
                            const regex = /[<>:{}'"/.\\|?*]+/g;
                            if (!regex.test(exportFileTitleInputEl.value)) {
                                fileName = exportFileTitleInputEl.value;
                            } else {
                                fileName = exportFileTitleInputEl.value.replace(regex, '');
                                showErrorToInputFileName();
                            }
                            const truncatedFileName = fileName.length <= 150 ? fileName : fileName.slice(0, 150);
                            exportFileTitleInputEl.value = truncatedFileName;
                        }

                        const preparingUserPassword = (el) => {
                            passwordValue = el.target.value;
                        }

                        const toggleShowPasswordIcon = () => {
                            if (isPasswordVisible) {
                                passwordShowHideIconBtn.innerHTML = hidePasswordSvg;
                                isPasswordVisible = false;
                                exportFilePasswordInputEl.setAttribute('type', 'password');
                            } else {
                                passwordShowHideIconBtn.innerHTML = showPasswordSvg;
                                exportFilePasswordInputEl.setAttribute('type', 'text');
                                isPasswordVisible = true;
                            }
                            exportFilePasswordInputEl.focus();
                        }

                        const toggleShowPassword = () => {
                            const status = showHideExportPasswordEl.checked;
                            const passwordBoxEl = document.getElementById('passwordBox');
                            setTimeout(() => {
                                if (status) {
                                    showHideExportPasswordEl.blur();
                                    exportFilePasswordInputEl.value = '';
                                    setTimeout(() => exportFilePasswordInputEl.focus(), 50);
                                    passwordBoxEl.style.display = `flex`;
                                } else {
                                    passwordBoxEl.style.display = `none`;
                                }
                            }, 600);
                            allowToSetPasswordToggle = status;
                        }
                        toggleShowPassword();

                        const exportProfile = () => {
                            try {
                                const progressBarEl = document.getElementById('progressBar');
                                const progressNumberEl = document.getElementById('progressNumber');
                                const date = new Date().toISOString();
                                const statusFilter = exportType.some(a => a.status);
                                let number = 0;

                                if (fileName.length <= 0) {
                                    showErrorToInputFileName();
                                    showMessageToastify('error', ``, `Enter a file name. The maximum length does not exceed 150 characters.`, 6000, false, 'bottom', 'right', true);
                                    throw Error('Enter a file name. The maximum length does not exceed 150 characters.');
                                }
                                if (!statusFilter) {
                                    const exportTypeBox = document.querySelectorAll('.exportTypeBox');
                                    exportTypeBox.forEach((el, index) => {
                                        // Shake the elements to indicate an error
                                        gsap.fromTo(el, 0.2, {
                                            x: -3,
                                        }, {
                                            x: 3,
                                            delay: index / .85 - index,
                                            repeat: 1,
                                            backgroundColor: editingMainUserSettings.windows.button.danger.backgroundColor,
                                            yoyo: true,
                                            ease: Quad.easeInOut,
                                            onComplete: () => {
                                                gsap.set(el, { clearProps: 'all' });
                                                gsap.killTweensOf(el);
                                                el.style.backgroundColor = colorPalette[1];
                                            }
                                        });
                                    });
                                    showMessageToastify('error', ``, `Select the export type.`, 4000, false, 'bottom', 'right', true);
                                    throw Error('Must select export type');
                                }

                                /**
                                 * Function to check if a key exists in an object and remove it.
                                 * @param {Object} obj - The object to check.
                                 * @param {string} key - The key to look for and remove.
                                 * @returns {boolean} - Returns true if the key was found and removed, false otherwise.
                                 */
                                const removeKeyIfExists = (obj, key) => obj.hasOwnProperty(key) && (delete obj[key], true) || false;

                                /**
                                 * Removes the first occurrence of a specified element from an array if it exists.
                                 * Modifies the original array in place.
                                 *
                                 * @param {Array} arr - The array from which to remove the element.
                                 * @param {*} element - The element to remove from the array.
                                 * @returns {boolean} - Returns true if the element was found and removed, false otherwise.
                                 */
                                const removeElementIfExists = (arr, element) => (arr.includes(element) && arr.splice(arr.indexOf(element), 1), true) || false;

                                exportObj.details.timestampCreation = date;
                                for (const key in browserAndOSInfo) {
                                    exportObj.details[key] = browserAndOSInfo[key];
                                }
                                exportType.forEach(typeObj => {
                                    if (typeObj.type == 'allProfiles' && typeObj.status) {
                                        exportObj.details.exportType.push(typeObj.type);
                                        exportObj.export.profileDetail = { name: userActiveProfile.name, userId: userActiveProfile.userId, timestampCreation: userActiveProfile.timestampCreation, image: userActiveProfile.image };
                                        exportObj.export.allProfiles = { ...Object.keys(userProfile).reduce((a, k) => k !== 'online' ? { ...a, [k]: userProfile[k] } : a, {}) };
                                        return;
                                    }
                                    if (typeObj.type == 'allProfiles' && !typeObj.status) {
                                        removeKeyIfExists(exportObj.export, typeObj.type);
                                        removeElementIfExists(exportObj.details.exportType, typeObj.type);
                                    }
                                    if (typeObj.type == 'currentAllProfile' && typeObj.status) {
                                        exportObj.details.exportType.push(typeObj.type);
                                        exportObj.export.profileDetail = { name: userActiveProfile.name, userId: userActiveProfile.userId, timestampCreation: userActiveProfile.timestampCreation, image: userActiveProfile.image };
                                        exportObj.export.currentAllProfile = userActiveProfile;
                                        return;
                                    }
                                    if (typeObj.type == 'currentAllProfile' && !typeObj.status) {
                                        removeKeyIfExists(exportObj.export, typeObj.type);
                                        removeElementIfExists(exportObj.details.exportType, typeObj.type);
                                    }
                                    if (typeObj.type == 'currentBookmarks' && typeObj.status) {
                                        exportObj.details.exportType.push(typeObj.type);
                                        exportObj.export.profileDetail = { name: userActiveProfile.name, userId: userActiveProfile.userId, timestampCreation: userActiveProfile.timestampCreation, image: userActiveProfile.image };
                                        exportObj.export.currentBookmarks = userActiveProfile.currentUserBookmarks;
                                    }
                                    if (typeObj.type == 'currentBookmarks' && !typeObj.status) {
                                        removeKeyIfExists(exportObj.export, typeObj.type);
                                        removeElementIfExists(exportObj.details.exportType, typeObj.type);
                                    }
                                    if (typeObj.type == 'defaultFolderStyle' && typeObj.status) {
                                        exportObj.details.exportType.push(typeObj.type);
                                        exportObj.export.profileDetail = { name: userActiveProfile.name, userId: userActiveProfile.userId, timestampCreation: userActiveProfile.timestampCreation, image: userActiveProfile.image };
                                        exportObj.export.defaultFolderStyle = userActiveProfile.defaultUserFolderStyle;
                                    }
                                    if (typeObj.type == 'defaultFolderStyle' && !typeObj.status) {
                                        removeKeyIfExists(exportObj.export, typeObj.type);
                                        removeElementIfExists(exportObj.details.exportType, typeObj.type);
                                    }
                                    if (typeObj.type == 'defaultBookmarksStyle' && typeObj.status) {
                                        exportObj.details.exportType.push(typeObj.type);
                                        exportObj.export.profileDetail = { name: userActiveProfile.name, userId: userActiveProfile.userId, timestampCreation: userActiveProfile.timestampCreation, image: userActiveProfile.image };
                                        exportObj.export.defaultBookmarksStyle = userActiveProfile.defaultUserBookmarkStyle;
                                    }
                                    if (typeObj.type == 'defaultBookmarksStyle' && !typeObj.status) {
                                        removeKeyIfExists(exportObj.export, typeObj.type);
                                        removeElementIfExists(exportObj.details.exportType, typeObj.type);
                                    }
                                    if (typeObj.type == 'userSettings' && typeObj.status) {
                                        exportObj.details.exportType.push(typeObj.type);
                                        exportObj.export.profileDetail = { name: userActiveProfile.name, userId: userActiveProfile.userId, timestampCreation: userActiveProfile.timestampCreation, image: userActiveProfile.image };
                                        exportObj.export.userSettings = userActiveProfile.mainUserSettings;
                                    }
                                    if (typeObj.type == 'defaultBookmarksStyle' && !typeObj.status) {
                                        removeKeyIfExists(exportObj.export, typeObj.type);
                                        removeElementIfExists(exportObj.details.exportType, typeObj.type);
                                    }
                                    if (typeObj.type == 'currentUserActivityLog' && typeObj.status) {
                                        exportObj.details.exportType.push(typeObj.type);
                                        exportObj.export.profileDetail = { name: userActiveProfile.name, userId: userActiveProfile.userId, timestampCreation: userActiveProfile.timestampCreation, image: userActiveProfile.image };
                                        exportObj.export.currentUserActivityLog = userActiveProfile.userActivityLog;
                                    }
                                    if (typeObj.type == 'currentUserActivityLog' && !typeObj.status) {
                                        removeKeyIfExists(exportObj.export, typeObj.type);
                                        removeElementIfExists(exportObj.details.exportType, typeObj.type);
                                    }
                                });
                                if (allowToSetPasswordToggle) {
                                    passwordValue = exportFilePasswordInputEl.value;
                                    if (passwordValue.length <= 0) {
                                        showHideExportPasswordEl.checked = false;
                                        toggleShowPassword();
                                    }
                                }

                                const saveObjectToFile = () => {
                                    try {
                                        if (preparedObjectToExport.length <= 0) {
                                            throw error('Empty object string');
                                        }
                                        if (fileName.length <= 0) {
                                            throw error('Empty file name string');
                                        }
                                        const save = (content, fileName, contentType) => {
                                            let a = document.createElement("a");
                                            let file = new Blob([content], { type: contentType });
                                            a.href = URL.createObjectURL(file);
                                            a.download = fileName;
                                            a.click();
                                        }
                                        save(preparedObjectToExport, `${fileName}.${exportFileExtensionName}`, 'text/plain');
                                    } catch (error) {
                                        console.error('%c%s', '', error);
                                        showMessageToastify('error', ``, `Failed save to a file.`, 6000, false, 'bottom', 'right', true);
                                    }
                                }

                                const encryptObject = () => {
                                    try {
                                        if (allowToSetPasswordToggle && passwordValue.length > 0) {
                                            const iv = CryptoJS.lib.WordArray.random(16);
                                            const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(exportObj), passwordValue, { iv: iv });
                                            const encryptedIv = CryptoJS.AES.encrypt(JSON.stringify(iv), passwordValue);
                                            const encryptedResult = `${encryptedIv.toString()}*${encryptedData.toString()}`;
                                            preparedObjectToExport = encryptedResult;
                                            saveObjectToFile();
                                        }
                                    } catch (error) {
                                        console.error('%c%s', '', error);
                                    }
                                }

                                const updateBar = () => {
                                    if (number == -1) {
                                        progressBarEl.style.width = `2%`;
                                        progressNumberEl.style.left = `15px`;
                                        progressNumberEl.innerHTML = `0%`;
                                        return;
                                    }
                                    number <= 100 ? number += randomIntFromInterval(5, 10) : number = 100;
                                    progressBarEl.style.width = `${number}%`;
                                    if (number <= 91) {
                                        progressNumberEl.style.left = `${number + 0.6}%`;
                                    } else {
                                        progressNumberEl.style.left = `91%`;
                                    }
                                    progressNumberEl.innerHTML = `${number > 100 ? 100 : number}%`;
                                    if (number >= 100) {
                                        clearInterval(update);
                                        if (allowToSetPasswordToggle && passwordValue.length > 0) {
                                            encryptObject();
                                        } else {
                                            preparedObjectToExport = JSON.stringify(exportObj);
                                            saveObjectToFile();
                                        }
                                        number = 0;
                                        resetUIAfterSave();
                                    }
                                }

                                const resetUIAfterSave = () => {
                                    number = -1;
                                    setDefaultToUI();
                                    updateBar();
                                }

                                const intervalTime = JSON.stringify(exportObj).length / 100;
                                const convertToMs = intervalTime >= 50 ? (intervalTime <= 700 ? intervalTime : 700) : 50;

                                let update = setInterval(updateBar, convertToMs);
                            } catch (error) {
                                console.warn('%c%s', '', error);
                            }
                        }

                        const exportButtonChangeBackgroundColorMouseEnter = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                        }

                        const exportButtonChangeBackgroundColorMouseLeave = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        }

                        exportFileTitleInputEl.addEventListener('input', preparingFileName);
                        exportFilePasswordInputEl.addEventListener('input', preparingUserPassword)
                        passwordShowHideIconBtn.addEventListener('click', toggleShowPasswordIcon);
                        showHideExportPasswordEl.addEventListener('change', toggleShowPassword);
                        exportButtonEl.addEventListener('click', exportProfile);
                        exportButtonEl.addEventListener('mouseenter', exportButtonChangeBackgroundColorMouseEnter);
                        exportButtonEl.addEventListener('mouseleave', exportButtonChangeBackgroundColorMouseLeave);
                    }
                    addEventListenersToExportProfile();

                    break;
                case 'importProfile':
                    let fileSize = ``;
                    let isPasswordVisibleImport = true;
                    let fileData = null;
                    let validObject = {};
                    const hidePasswordImportSvg = `<svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16.01C14.2091 16.01 16 14.2191 16 12.01C16 9.80087 14.2091 8.01001 12 8.01001C9.79086 8.01001 8 9.80087 8 12.01C8 14.2191 9.79086 16.01 12 16.01Z" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 11.98C8.09 1.31996 15.91 1.32996 22 11.98" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 12.01C15.91 22.67 8.09 22.66 2 12.01" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                    const showPasswordImportSvg = `<svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.83 9.17999C14.2706 8.61995 13.5576 8.23846 12.7813 8.08386C12.0049 7.92926 11.2002 8.00851 10.4689 8.31152C9.73758 8.61453 9.11264 9.12769 8.67316 9.78607C8.23367 10.4444 7.99938 11.2184 8 12.01C7.99916 13.0663 8.41619 14.08 9.16004 14.83" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 16.01C13.0609 16.01 14.0783 15.5886 14.8284 14.8384C15.5786 14.0883 16 13.0709 16 12.01" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M17.61 6.39004L6.38 17.62C4.6208 15.9966 3.14099 14.0944 2 11.99C6.71 3.76002 12.44 1.89004 17.61 6.39004Z" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20.9994 3L17.6094 6.39" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.38 17.62L3 21" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.5695 8.42999C20.4801 9.55186 21.2931 10.7496 21.9995 12.01C17.9995 19.01 13.2695 21.4 8.76953 19.23" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
                    const importStatusObject = {
                        userProfiles: {
                            new: false,
                        },
                        userActiveProfile: {
                            new: false,
                        },
                        bookmarks: {
                            current: false,
                        },
                        defaultFolderStyle: {
                            current: false,
                        },
                        defaultBookmarkStyle: {
                            current: false,
                        },
                        userSettings: {
                            current: false,
                        }
                    };
                    const conversionMap = {
                        currentBookmarks: 'Current Bookmarks',
                        defaultFolderStyle: 'Default Folder Style',
                        defaultBookmarksStyle: 'Default Bookmarks Style',
                        userSettings: 'User Settings',
                        allProfiles: 'All Profiles',
                        currentAllProfile: 'Current Profile',
                    };

                    settingsWindowRightSectionHtml = `
                        <div id="importProfileSection">
                            <div id="importSelectFileSection">
                                <label for="filePickerInputTitle" id="filePickerInputTitle">Choose File:</label>
                                <div id="filePickerInputFileSection">
                                    <input type="file" id="filePickerInputFile" title=""/>
                                    <span id="filePickerInputFileInfo">Click here to open</span>
                                    <span id="filePickerInputFileName"></span>
                                </div>
                            </div>
                            <div id="importFileDecryptionInfoSection">
                                <div id="importFileInfoTop" style="background-color: ${colorPalette[2]};">
                                    <div id="importFileInfoTopTitle">Information about file</div>
                                    <div id="importFileInfoDetail">
                                        <div id="importFileInfoInclude"></div>
                                        <div id="importFileInfoSizeAndDate">
                                            <div id="importFileInfoDate">
                                                <div id="importFileDateTitle">Date</div>
                                                <div id="importFileDate"></div>
                                            </div>
                                            <div id="importFileInfoSize">
                                                <div id="importFileSizeTitle">Size</div>
                                                <div id="importFileSize"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div id="importFileInfoMiddle">
                                    <div id="importFileInfoMiddleDetail"></div>
                                </div>
                            </div>
                            <div id="importFileFooterSection">
                                <div id="importFileButtons">
                                    <button id="importFileContinueButton">Continue</button>
                                    <button id="importFileApplyButton">Apply</button>
                                </div>
                            </div>
                        </div>
                    `;
                    settingsWindowRightSectionEl.innerHTML = settingsWindowRightSectionHtml;

                    const updateWindowStyleImportSettingsTitlesUI = () => {
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
                            filePickerInputTitle: {
                                id: 'filePickerInputTitle',
                                text: languageObject._exportImportOptions._importProfile.chooseFile,
                                classNames: []
                            },
                            filePickerInputFileInfo: {
                                id: 'filePickerInputFileInfo',
                                text: languageObject._exportImportOptions._importProfile.clickToImport,
                                classNames: []
                            },
                            importFileInfoTopTitle: {
                                id: 'importFileInfoTopTitle',
                                text: languageObject._exportImportOptions._importProfile.informationAboutFile,
                                classNames: []
                            },
                            importFileDateTitle: {
                                id: 'importFileDateTitle',
                                text: languageObject._exportImportOptions._importProfile.date,
                                classNames: []
                            },
                            importFileSizeTitle: {
                                id: 'importFileSizeTitle',
                                text: languageObject._exportImportOptions._importProfile.size,
                                classNames: []
                            },
                            importFileContinueButton: {
                                id: 'importFileContinueButton',
                                text: languageObject._exportImportOptions._importProfile.continue,
                                classNames: []
                            },
                            importFileApplyButton: {
                                id: 'importFileApplyButton',
                                text: languageObject._exportImportOptions._importProfile.apply,
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
                    updateWindowStyleImportSettingsTitlesUI();

                    const setDefaultValues = () => {
                        const filePickerInputFileInfoEl = document.getElementById('filePickerInputFileInfo');
                        const importFileContinueButton = document.getElementById('importFileContinueButton');
                        const importFileApplyButton = document.getElementById('importFileApplyButton');

                        importFileContinueButton.style.display = 'none';
                        importFileApplyButton.style.display = 'none';
                        filePickerInputFileInfoEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        filePickerInputFileInfoEl.style.color = editingMainUserSettings.windows.button.primary.font.color;
                        importFileContinueButton.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        importFileContinueButton.style.color = editingMainUserSettings.windows.button.primary.font.color;
                        importFileApplyButton.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        importFileApplyButton.style.color = editingMainUserSettings.windows.button.primary.font.color;
                    }
                    setDefaultValues();

                    const applyImport = () => {
                        const importFileInfoMiddleDetailEl = document.getElementById('importFileInfoMiddleDetail');
                        const importFileApplyButton = document.getElementById('importFileApplyButton');
                        let showDetailErrorStatus = true;

                        const importFileInfoMiddleDetailHtml = `
                            <div id="importFileVerificationContainer">
                                <div id="importFileVerificationStatus" style="background-color: ${colorPalette[1]};">
                                    <div id="importFileVerificationStatusSuccess">
                                        <div id="importFileVerificationStatusSuccessTitle">Success:</div>
                                        <div id="importFileVerificationStatusSuccessCount">0</div>
                                    </div>
                                    <div id="importFileVerificationStatusError">
                                        <div id="importFileVerificationStatusErrorTitle">Error:</div>
                                        <div id="importFileVerificationStatusErrorCount">0</div>
                                        <div id="importFileVerificationStatusErrorShowDetail" style="display: none">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                        </div>
                                    </div>
                                    <div id="importFileVerificationStatusCriticalError">
                                        <div id="importFileVerificationStatusCriticalErrorTitle">Critical Error:</div>
                                        <div id="importFileVerificationStatusCriticalErrorCount">0</div>
                                        <div id="importFileVerificationStatusCriticalErrorShowDetail" style="display: none">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                                        </div>
                                    </div>
                                </div>
                                <div id="importFileVerificationStatusShowDetail" style="background-color: ${colorPalette[2]};"></div>
                                <div id="importFileVerificationMiddle" style="background-color: ${colorPalette[2]};"></div>
                            </div>
                        `;
                        importFileInfoMiddleDetailEl.innerHTML = importFileInfoMiddleDetailHtml;

                        const updateWindowStyleImportApplyTitlesUI = () => {
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
                                importFileVerificationStatusSuccessTitle: {
                                    id: 'importFileVerificationStatusSuccessTitle',
                                    text: languageObject._exportImportOptions._importProfile.success,
                                    classNames: []
                                },
                                importFileVerificationStatusErrorTitle: {
                                    id: 'importFileVerificationStatusErrorTitle',
                                    text: languageObject._exportImportOptions._importProfile.error,
                                    classNames: []
                                },
                                importFileVerificationStatusCriticalErrorTitle: {
                                    id: 'importFileVerificationStatusCriticalErrorTitle',
                                    text: languageObject._exportImportOptions._importProfile.criticalError,
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
                        updateWindowStyleImportApplyTitlesUI();

                        const showDetailError = () => {
                            const importFileVerificationStatusShowDetailEl = document.getElementById('importFileVerificationStatusShowDetail');
                            const importFileVerificationMiddleEl = document.getElementById('importFileVerificationMiddle');
                            let html = ``;

                            validObject.status.messages.forEach((message, index) => {
                                html += `<div class="errorList" style="width: fit-content">${message}</div>`;
                            });

                            gsap.fromTo(importFileVerificationStatusShowDetailEl, {
                                height: showDetailErrorStatus ? 0 : '270px',
                                display: showDetailErrorStatus ? 'none' : 'flex'
                            }, {
                                height: showDetailErrorStatus ? '270px' : 0,
                                display: showDetailErrorStatus ? 'flex' : 'none',
                                duration: .9,
                                ease: Linear.easeNone,
                                onComplete: () => {
                                }
                            });
                            gsap.fromTo(importFileVerificationMiddleEl, {
                                height: showDetailErrorStatus ? '270px' : 0,
                                display: showDetailErrorStatus ? 'flex' : 'none'
                            }, {
                                height: showDetailErrorStatus ? 0 : '270px',
                                display: showDetailErrorStatus ? 'none' : 'flex',
                                duration: .9,
                                ease: Linear.easeNone,
                                onComplete: () => {
                                }
                            });

                            if (showDetailErrorStatus) {
                                importFileVerificationMiddleEl.innerHTML = ``;
                                importFileVerificationStatusShowDetailEl.innerHTML = html;

                                setTimeout(() => {
                                    const errorListElArray = document.querySelectorAll('.errorList');
                                    let maxWidth = 0;
                                    errorListElArray.forEach((item) => {
                                        const itemWidth = item.offsetWidth;
                                        if (itemWidth > maxWidth) {
                                            maxWidth = itemWidth + 5;
                                        }
                                    });
                                    errorListElArray.forEach((item, index) => {
                                        item.style.width = `${maxWidth}px`;
                                        if (index % 2) {
                                            item.style.backgroundColor = colorPalette[6];
                                        } else {
                                            item.style.backgroundColor = colorPalette[3];
                                        }
                                    });
                                }, 100);
                            } else {
                                importFileVerificationStatusShowDetailEl.innerHTML = ``;
                                createToggleElements();
                            }

                            showDetailErrorStatus = !showDetailErrorStatus;
                        }

                        if (validObject.status) {
                            const importFileVerificationStatusErrorShowDetailEl = document.getElementById('importFileVerificationStatusErrorShowDetail');
                            const importFileVerificationStatusCriticalErrorShowDetailEl = document.getElementById('importFileVerificationStatusCriticalErrorShowDetail');

                            if (validObject.status.error > 0) {
                                importFileVerificationStatusErrorShowDetailEl.style.display = 'flex';
                                importFileVerificationStatusErrorShowDetailEl.addEventListener('click', () => {
                                    showDetailError();
                                });
                            } else {
                                importFileVerificationStatusErrorShowDetailEl.style.display = 'none';
                            }
                            if (validObject.status.criticalError > 0) {
                                importFileVerificationStatusCriticalErrorShowDetailEl.style.display = 'flex';
                                importFileVerificationStatusCriticalErrorShowDetailEl.addEventListener('click', () => {
                                    showDetailError();
                                });
                            } else {
                                importFileVerificationStatusCriticalErrorShowDetailEl.style.display = 'none';
                            }
                            countTo(0, validObject.status.success, (validObject.status.success + 800), document.getElementById('importFileVerificationStatusSuccessCount'));
                            countTo(0, validObject.status.error, (1000), document.getElementById('importFileVerificationStatusErrorCount'));
                            countTo(0, validObject.status.criticalError, (1200), document.getElementById('importFileVerificationStatusCriticalErrorCount'));
                        }

                        const createToggleElements = () => {
                            const importFileVerificationMiddleEl = document.getElementById('importFileVerificationMiddle');
                            let importFileVerificationResultTableHtml = ``;
                            validObject.validObject.details.exportType.forEach((exportType, index) => {
                                importFileVerificationResultTableHtml += `
                                    <div class="importTableBodyElement" style="background-color: ${index % 2 ? colorPalette[6] : colorPalette[3]};">
                                        <div class="tableBodyName">${conversionMap[exportType] ? conversionMap[exportType] : exportType}</div>
                                        <div class="tableBodyCurrentProfile" data-status="${exportType === 'allProfiles' || exportType === 'currentAllProfile' ? 'disabled' : 'allowed'}" data-index="${index}">
                                            <button class="tableBodyCurrentProfileInfo" data-type="${exportType}"  style="display: ${exportType === 'allProfiles' || exportType === 'currentAllProfile' ? 'none' : 'flex'};">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" class="bi bi-question-circle" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"/></svg>
                                            </button>
                                            <div class="importTypeBox">
                                                <label class="toggle" for="importCurrentProfile${capitalizeString(exportType)}">
                                                    <input type="checkbox" class="toggleInput importToggleInput" id="importCurrentProfile${capitalizeString(exportType)}" data-type="${exportType}Current" ${exportType === 'allProfiles' || exportType === 'currentAllProfile' ? 'disabled' : ''} />
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
                                        </div>
                                        <div class="tableBodyNewProfile" data-status="${exportType === 'allProfiles' || exportType === 'currentAllProfile' ? 'allowed' : 'disabled'}" data-index="${index}">
                                            <div class="importTypeBox">
                                                <label class="toggle" for="importNewProfile${capitalizeString(exportType)}">
                                                    <input type="checkbox" class="toggleInput importToggleInput" id="importNewProfile${capitalizeString(exportType)}" data-type="${exportType}New" ${exportType === 'allProfiles' || exportType === 'currentAllProfile' ? '' : 'disabled'} />
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
                                        </div>
                                    </div>
                                `;
                            });
                            importFileVerificationMiddleEl.innerHTML = `
                                <div id="importFileVerificationResultTable">
                                    <div id="importFileVerificationResultTableHeader" style="background-color: ${colorPalette[4]};">
                                        <div id="resultTableHeaderName">Name</div>
                                        <div id="resultTableHeaderCurrentProfile">Current Profile</div>
                                        <div id="resultTableHeaderNewProfile">New Profile</div>
                                    </div>
                                    <div id="importFileVerificationResultTableBody">
                                        ${importFileVerificationResultTableHtml}
                                    </div>
                                </div>
                            `;

                            const updateWindowStyleImportApplyTableTitlesUI = () => {
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
                                    resultTableHeaderName: {
                                        id: 'resultTableHeaderName',
                                        text: languageObject._exportImportOptions._importProfile._importTableHeader.importType,
                                        classNames: []
                                    },
                                    resultTableHeaderCurrentProfile: {
                                        id: 'resultTableHeaderCurrentProfile',
                                        text: languageObject._exportImportOptions._importProfile._importTableHeader.toCurrentProfile,
                                        classNames: []
                                    },
                                    resultTableHeaderNewProfile: {
                                        id: 'resultTableHeaderNewProfile',
                                        text: languageObject._exportImportOptions._importProfile._importTableHeader.toNewProfile,
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
                            updateWindowStyleImportApplyTableTitlesUI();

                            const setDefaultValues = () => {
                                const importToggleInputArray = document.querySelectorAll('.importToggleInput');
                                importToggleInputArray.forEach(input => {
                                    switch (input.dataset.type) {
                                        case 'allProfilesCurrent':
                                            input.checked = false;
                                            break;
                                        case 'allProfilesNew':
                                            input.checked = importStatusObject.userProfiles.new;
                                            break;
                                        case 'currentAllProfileCurrent':
                                            input.checked = false;
                                            break;
                                        case 'currentAllProfileNew':
                                            input.checked = importStatusObject.userActiveProfile.new;
                                            break;
                                        case 'currentBookmarksCurrent':
                                            input.checked = importStatusObject.bookmarks.current;
                                            break;
                                        case 'currentBookmarksNew':
                                            input.checked = false;
                                            break;
                                        case 'defaultFolderStyleCurrent':
                                            input.checked = importStatusObject.defaultFolderStyle.current;
                                            break;
                                        case 'defaultFolderStyleNew':
                                            input.checked = false;
                                            break;
                                        case 'defaultBookmarksStyleCurrent':
                                            input.checked = importStatusObject.defaultBookmarkStyle.current;
                                            break;
                                        case 'defaultBookmarksStyleNew':
                                            input.checked = false;
                                            break;
                                        case 'userSettingsCurrent':
                                            input.checked = importStatusObject.userSettings.current;
                                            break;
                                        case 'userSettingsNew':
                                            input.checked = false;
                                            break;
                                    }
                                });
                            }
                            setDefaultValues();

                            const addEventListenerToToggleInput = () => {
                                const importToggleInputArray = document.querySelectorAll('.importToggleInput');
                                const tableBodyCurrentProfileInfoArray = document.querySelectorAll('.tableBodyCurrentProfileInfo');

                                importToggleInputArray.forEach(input => {
                                    input.addEventListener('change', (event) => {
                                        switch (event.target.dataset.type) {
                                            case 'allProfilesCurrent':
                                                if (!event.target.checked) { break; }
                                                const infoAllProfilesMessage = 'Do or do not, there is no try. The Force is strong with this one, but the current profile cannot be imported to. Choose wisely, young Padawan!';
                                                showMessageToastify('info', ``, infoAllProfilesMessage, 18000, true, 'bottom', 'right', true);
                                                console.info(infoAllProfilesMessage);
                                                break;
                                            case 'allProfilesNew':
                                                importStatusObject.userProfiles.new = event.target.checked;
                                                break;
                                            case 'currentAllProfileCurrent':
                                                if (!event.target.checked) { break; }
                                                const infoAllProfileMessage = 'Your attempt is strong, but the input is as locked as the gates of the Death Star. Only a true Jedi can find another way to import. May the Force guide you!';
                                                showMessageToastify('info', ``, infoAllProfileMessage, 18000, true, 'bottom', 'right', true);
                                                console.info(infoAllProfileMessage);
                                                break;
                                            case 'currentAllProfileNew':
                                                importStatusObject.userActiveProfile.new = event.target.checked;
                                                break;
                                            case 'currentBookmarksCurrent':
                                                importStatusObject.bookmarks.current = event.target.checked;
                                                break;
                                            case 'currentBookmarksNew':
                                                if (!event.target.checked) { break; }
                                                const infoBookmarksMessage = 'Alas, young Padawan, the bookmarks cannot be imported to a new profile. The path you seek is blocked by the will of the Force. Changing the code will not alter your fate.';
                                                showMessageToastify('info', ``, infoBookmarksMessage, 18000, true, 'bottom', 'right', true);
                                                console.info(infoBookmarksMessage);
                                                break;
                                            case 'defaultFolderStyleCurrent':
                                                importStatusObject.defaultFolderStyle.current = event.target.checked;
                                                break;
                                            case 'defaultFolderStyleNew':
                                                if (!event.target.checked) { break; }
                                                const infoFolderStyleMessage = 'Even the mightiest Jedi cannot change the course of destiny. The folder style remains locked to the new profile. Your attempt to override the code is futile—accept this truth.';
                                                showMessageToastify('info', ``, infoFolderStyleMessage, 18000, true, 'bottom', 'right', true);
                                                console.info(infoFolderStyleMessage);
                                                break;
                                            case 'defaultBookmarksStyleCurrent':
                                                importStatusObject.defaultBookmarkStyle.current = event.target.checked;
                                                break;
                                            case 'defaultBookmarksStyleNew':
                                                if (!event.target.checked) { break; }
                                                const infoBookmarksStyleMessage = 'Attempting to import the bookmark style to a new profile is like trying to alter the fabric of the galaxy. The Force has deemed this action impossible, no matter how you manipulate the code.';
                                                showMessageToastify('info', ``, infoBookmarksStyleMessage, 18000, true, 'bottom', 'right', true);
                                                console.info(infoBookmarksStyleMessage);
                                                break;
                                            case 'userSettingsCurrent':
                                                importStatusObject.userSettings.current = event.target.checked;
                                                break;
                                            case 'userSettingsNew':
                                                if (!event.target.checked) { break; }
                                                const infoSettingsMessage = 'The settings are bound to their profile, and no amount of code tampering can change that. The Force is clear: importing to a new profile is not within your power.';
                                                showMessageToastify('info', ``, infoSettingsMessage, 18000, true, 'bottom', 'right', true);
                                                console.info(infoSettingsMessage);
                                                break;
                                        }
                                    });
                                });

                                tableBodyCurrentProfileInfoArray.forEach(info => {
                                    const style = {
                                        backgroundColor: editingMainUserSettings.windows.window.backgroundColor,
                                        color: editingMainUserSettings.windows.window.font.color,
                                        padding: '5px',
                                        borderRadius: '5px',
                                        fontSize: `${editingMainUserSettings.windows.window.font.fontSize}px`,
                                        fontWeight: editingMainUserSettings.windows.window.font.fontWeight,
                                        fontFamily: editingMainUserSettings.windows.window.font.fontFamily,
                                        width: '300px'
                                    }
                                    switch (info.dataset.type) {
                                        case 'currentBookmarks':
                                            createTooltip(info, 'top', 'Notice: You can find the imported bookmarks in the Home folder, labeled by the import date.', style);
                                            break;
                                        case 'defaultFolderStyle':
                                            createTooltip(info, 'top', 'Importing will overwrite your existing folder style with the imported values. This change is permanent and cannot be reversed. Please proceed with caution.', style);
                                            break;
                                        case 'defaultBookmarksStyle':
                                            createTooltip(info, 'top', 'Importing will overwrite your existing bookmark style with the imported values. This change is permanent and cannot be reversed. Please proceed with caution.', style);
                                            break;
                                        case 'userSettings':
                                            createTooltip(info, 'top', 'Importing will overwrite your existing settings with the imported values. This change is permanent and cannot be reversed. Please proceed with caution.', style);
                                            break;
                                    }
                                });
                            }
                            addEventListenerToToggleInput();
                        }
                        setTimeout(() => {
                            importFileApplyButton.style.display = 'flex';
                            createToggleElements();
                        }, validObject.status.success + 800);

                        const addEventListenerToApplyImport = () => {
                            const importFileApplyButton = document.getElementById('importFileApplyButton');

                            const applyImport = async () => {
                                try {

                                    /**
                                     * Checks if any value is true in a given object
                                     * @param {Object} statusObject - The object to check
                                     * @returns {boolean} - True if any value is true, false otherwise
                                     */
                                    const isAnyValueTrue = (statusObject) => {
                                        return Object.values(statusObject).some(profile => {
                                            // Check if the profile object has any true values
                                            return Object.values(profile).some(value => value === true);
                                        });
                                    };

                                    if (importStatusObject.userProfiles.new) {
                                        validObject.validObject.export.allProfiles.offline.forEach(async profile => {
                                            const saveStatus = await manageUserProfiles('pushOne', false, { importOneObject: profile });
                                            if (!saveStatus) {
                                                console.error(saveStatus);
                                                throw new Error('Error saving profile');
                                            }
                                        });
                                    }
                                    if (importStatusObject.userActiveProfile.new) {
                                        const saveStatus = await manageUserProfiles('pushOne', false, { importOneObject: validObject.validObject.export.currentAllProfile });
                                        if (!saveStatus) {
                                            console.error(saveStatus);
                                            throw new Error('Error saving profile');
                                        }
                                    }
                                    if (importStatusObject.bookmarks.current) {
                                        let bookmarks = validObject.validObject.export.currentBookmarks;
                                        const bookmarksWithNewIds = updateIdsAndParentIds(bookmarks);
                                        const nextIndex = getNextMaxIndex(userProfileExport.currentUserBookmarks[0].children);
                                        bookmarksWithNewIds[0].index = nextIndex;
                                        bookmarksWithNewIds[0].title = formatDateTime(validObject.validObject.details.timestampCreation, currentLanguage, 'dateAndTime');
                                        userProfileExport.currentUserBookmarks[0].children.push(...bookmarksWithNewIds);
                                        createCurrentBookmarkFolder();
                                    }
                                    if (importStatusObject.defaultFolderStyle.current) {
                                        userProfileExport.defaultUserFolderStyle = validObject.validObject.export.defaultFolderStyle;
                                    }
                                    if (importStatusObject.defaultBookmarkStyle.current) {
                                        userProfileExport.defaultUserBookmarkStyle = validObject.validObject.export.defaultBookmarksStyle;
                                    }
                                    if (importStatusObject.userSettings.current) {
                                        userProfileExport.mainUserSettings = validObject.validObject.export.userSettings;
                                        editingMainUserSettings = structuredClone(userProfileExport.mainUserSettings);
                                        setStyleToSettingsWindow();
                                        const importFileInfoTopEl = document.getElementById('importFileInfoTop');
                                        const importFileVerificationStatusEl = document.getElementById('importFileVerificationStatus');
                                        const importFileVerificationResultTableHeaderEl = document.getElementById('importFileVerificationResultTableHeader');
                                        const importFileVerificationStatusShowDetailEl = document.getElementById('importFileVerificationStatusShowDetail');
                                        const importFileVerificationMiddleEl = document.getElementById('importFileVerificationMiddle');
                                        const importTableBodyElementArray = document.querySelectorAll('.importTableBodyElement');
                                        importFileVerificationResultTableHeaderEl.style.backgroundColor = colorPalette[4];
                                        importFileVerificationStatusShowDetailEl.style.backgroundColor = colorPalette[2];
                                        importFileVerificationMiddleEl.style.backgroundColor = colorPalette[2];
                                        importFileVerificationStatusEl.style.backgroundColor = colorPalette[1];
                                        importFileInfoTopEl.style.backgroundColor = colorPalette[2];
                                        importTableBodyElementArray.forEach((element, index) => {
                                            if (index % 2) {
                                                element.style.backgroundColor = colorPalette[6];
                                            } else {
                                                element.style.backgroundColor = colorPalette[3];
                                            }
                                        });
                                    }
                                    if (isAnyValueTrue(importStatusObject)) {
                                        const savedStatus = await manageUserProfiles('save');
                                        if (!savedStatus) {
                                            throw new Error('Error saving profile');
                                        }
                                        const CleanDataAfterImport = () => {
                                            const filePickerInputFileNameEl = document.getElementById('filePickerInputFileName');
                                            const importFileInfoTopEl = document.getElementById('importFileInfoTop');
                                            const importFileDateEl = document.getElementById('importFileDate');
                                            const importFileSizeEl = document.getElementById('importFileSize');
                                            const importFileInfoMiddleDetailEl = document.getElementById('importFileInfoMiddleDetail');

                                            filePickerInputFileNameEl.value = '';
                                            fileData = null;
                                            importFileInfoMiddleDetailEl.innerHTML = '';
                                            filePickerInputFileNameEl.setAttribute('title', '');
                                            filePickerInputFileNameEl.innerHTML = '';
                                            importFileSizeEl.innerHTML = '';
                                            importFileDateEl.innerHTML = '';
                                            importFileInfoTopEl.style.opacity = 0;
                                            setDefaultValues();
                                        }
                                        CleanDataAfterImport();
                                        showMessageToastify('success', ``, languageObject._exportImportOptions._importProfile._infoMessages.importSuccessful, 2000, false, 'bottom', 'right', true);
                                    } else {
                                        const dataStatusArray = document.querySelectorAll('[data-status]');
                                        dataStatusArray.forEach((el, index) => {
                                            if (el.dataset.status === 'allowed') {
                                                // Shake the elements to indicate an error
                                                gsap.fromTo(el, 0.2, {
                                                    x: -1,
                                                }, {
                                                    x: 1,
                                                    delay: index / .85 - index,
                                                    repeat: 1,
                                                    backgroundColor: editingMainUserSettings.windows.button.danger.backgroundColor,
                                                    yoyo: true,
                                                    ease: Quad.easeInOut,
                                                    onComplete: () => {
                                                        gsap.set(el, { clearProps: 'all' });
                                                        gsap.killTweensOf(el);
                                                        parseInt(el.dataset.index) % 2 ? el.style.backgroundColor = colorPalette[6] : el.style.backgroundColor = colorPalette[3];
                                                    }
                                                });
                                            }
                                        });
                                        showMessageToastify('warning', ``, languageObject._exportImportOptions._importProfile._infoMessages.notSelectedLocation, 2000, false, 'bottom', 'right', true);
                                    }
                                } catch (error) {
                                    showMessageToastify('error', ``, languageObject._exportImportOptions._importProfile._infoMessages.errorImportingFile, 2000, false, 'bottom', 'right', true);
                                    console.error('Error importing file', error);
                                    return error;
                                }
                            }

                            const mouseEnterApplyImport = (el) => {
                                el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                            }

                            const mouseLeaveApplyImport = (el) => {
                                el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                            }

                            importFileApplyButton.addEventListener('click', applyImport);
                            importFileApplyButton.addEventListener('mouseenter', mouseEnterApplyImport);
                            importFileApplyButton.addEventListener('mouseleave', mouseLeaveApplyImport);
                        }
                        addEventListenerToApplyImport();
                    }

                    const fileIsJson = (fileData) => {
                        const importFileInfoMiddleDetailEl = document.getElementById('importFileInfoMiddleDetail');

                        const importFileInfoMiddleDetailHtml = `
                            <div id="importDataDetailExtension" style="background-color: ${colorPalette[1]};">
                                <div id="importDataDetailExtensionTitle">Extension Version:</div>
                                <div id="importDataDetailExtensionDetail"></div>
                            </div>
                            <div id="importDataDetailBrowser" style="background-color: ${colorPalette[2]};">
                                <div id="importDataDetailBrowserTitle">Browser:</div>
                                <div id="importDataDetailBrowserDetail"></div>
                            </div>
                            <div id="importDataDetailOS" style="background-color: ${colorPalette[1]};">
                                <div id="importDataDetailOSTitle">OS:</div>
                                <div id="importDataDetailOSDetail"></div>
                            </div>
                            <div id="importDataDetailTimestamp" style="background-color: ${colorPalette[2]};">
                                <div id="importDataDetailTimestampTitle">Created:</div>
                                <div id="importDataDetailTimestampDetail"></div>
                            </div>
                            <div id="importDataDetailProfile" style="background-color: ${colorPalette[1]};">
                                <div id="resultTableHeaderCurrentProfile">Profile:</div>
                                <div id="importDataDetailProfileDetail">
                                    <div id="importDataDetailProfileDetailBox">
                                        <div id="profileDetailImage"></div>
                                        <div id="profileDetailName"></div>
                                    </div>
                                </div>
                            </div>
                        `;
                        importFileInfoMiddleDetailEl.innerHTML = importFileInfoMiddleDetailHtml;

                        const updateWindowStyleImportDetailTitlesUI = () => {
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
                                importDataDetailExtensionTitle: {
                                    id: 'importDataDetailExtensionTitle',
                                    text: languageObject._exportImportOptions._importProfile.extensionVersion,
                                    classNames: []
                                },
                                importDataDetailBrowserTitle: {
                                    id: 'importDataDetailBrowserTitle',
                                    text: languageObject._exportImportOptions._importProfile.browser,
                                    classNames: []
                                },
                                importDataDetailOSTitle: {
                                    id: 'importDataDetailOSTitle',
                                    text: languageObject._exportImportOptions._importProfile.osType,
                                    classNames: []
                                },
                                importDataDetailTimestampTitle: {
                                    id: 'importDataDetailTimestampTitle',
                                    text: languageObject._exportImportOptions._importProfile.createdAt,
                                    classNames: []
                                },
                                resultTableHeaderCurrentProfile: {
                                    id: 'resultTableHeaderCurrentProfile',
                                    text: languageObject._exportImportOptions._importProfile.profileName,
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
                        updateWindowStyleImportDetailTitlesUI();

                        const validateImportObject = () => {
                            const importDataDetailExtensionDetailEl = document.getElementById('importDataDetailExtensionDetail');
                            const importDataDetailBrowserDetailEl = document.getElementById('importDataDetailBrowserDetail');
                            const importDataDetailOSDetailEl = document.getElementById('importDataDetailOSDetail');
                            const importDataDetailTimestampDetailEl = document.getElementById('importDataDetailTimestampDetail');
                            const profileDetailNameEl = document.getElementById('profileDetailName');
                            const importFileInfoIncludeEl = document.getElementById('importFileInfoInclude');
                            const importFileContinueButton = document.getElementById('importFileContinueButton');
                            let includeList = '';

                            importValidation(JSON.parse(fileData), 'userProfileObject').then((data) => {
                                if (isObjectEmpty(data)) return null;
                                validObject = data;
                                importFileContinueButton.style.display = 'flex';
                                importFileContinueButton.style.color = editingMainUserSettings.windows.button.primary.font.color;
                                importDataDetailExtensionDetailEl.innerText = data.validObject.details.extension.version;
                                importDataDetailBrowserDetailEl.innerText = `${data.validObject.details.browser.name}, ${languageObject._exportImportOptions._importProfile.browserVersion} ${data.validObject.details.browser.version}`;
                                importDataDetailOSDetailEl.innerText = data.validObject.details.os.name;
                                importDataDetailTimestampDetailEl.innerText = formatDateTime(data.validObject.details.timestampCreation, currentLanguage, 'dateAndTime');
                                const imageBase64 = data.validObject.export.profileDetail.image;
                                $('#profileDetailImage').css('background', `url(${imageBase64}) center center / cover no-repeat`);
                                profileDetailNameEl.innerText = data.validObject.export.profileDetail.name;
                                data.validObject.details.exportType.forEach((exportType) => {
                                    if (conversionMap[exportType]) {
                                        includeList += `${conversionMap[exportType]}, `;
                                    }
                                });
                                importFileInfoIncludeEl.innerText = includeList.slice(0, -2);
                            });

                            const confirmImport = () => {
                                importFileContinueButton.style.display = 'none';
                                applyImport();
                            }

                            const mouseEnterConfirmImport = (el) => {
                                el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                            }

                            const mouseLeaveConfirmImport = (el) => {
                                el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                            }

                            importFileContinueButton.addEventListener('click', confirmImport);
                            importFileContinueButton.addEventListener('mouseenter', mouseEnterConfirmImport);
                            importFileContinueButton.addEventListener('mouseleave', mouseLeaveConfirmImport);
                        }
                        validateImportObject();

                    }

                    const fileIsEncrypted = (fileData) => {
                        const importFileInfoMiddleDetailEl = document.getElementById('importFileInfoMiddleDetail');

                        const importFileInfoMiddleDetailHtml = `
                            <div id="importFileInfoMiddleDetailBox">
                                <div id="decryptionBox">
                                    <div id="passwordBox">
                                        <title for="importFilePasswordInput" id="importFilePasswordInputTitle">File Password</title>
                                        <div id="passwordAndIcon">
                                            <input type="password" id="importFilePasswordInput" >
                                            <button id="passwordShowHideIcon">${hidePasswordImportSvg}</button>
                                        </div>
                                    </div>
                                    <button id="decryptButton">Decrypt</button>
                                </div>
                            </div>
                        `;
                        importFileInfoMiddleDetailEl.innerHTML = importFileInfoMiddleDetailHtml;

                        const updateWindowStyleImportDecryptionTitlesUI = () => {
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
                                importFilePasswordInputTitle: {
                                    id: 'importFilePasswordInputTitle',
                                    text: languageObject._exportImportOptions._importProfile.filePassword,
                                    classNames: []
                                },
                                decryptButton: {
                                    id: 'decryptButton',
                                    text: languageObject._exportImportOptions._importProfile.decrypt,
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
                        updateWindowStyleImportDecryptionTitlesUI();

                        const decryptionFile = () => {
                            const importFilePasswordInputEl = document.getElementById('importFilePasswordInput');
                            const drpt = () => {
                                try {
                                    const passwordValue = importFilePasswordInputEl.value;
                                    const decryptionSeparate = fileData.split('*');
                                    const decryptionIv = CryptoJS.AES.decrypt(decryptionSeparate[0], passwordValue);
                                    const decryptionData = CryptoJS.AES.decrypt(decryptionSeparate[1], passwordValue, { iv: CryptoJS.enc.Hex.parse(decryptionIv.toString()) }).toString(CryptoJS.enc.Utf8);
                                    return decryptionData;
                                } catch (error) {
                                    return false;
                                }
                            }
                            const statusOfDecryption = drpt();
                            if (statusOfDecryption === false) {
                                importFilePasswordInputEl.value = '';
                                showMessageToastify('error', ``, languageObject._exportImportOptions._importProfile._infoMessages.failedToDecryptFile, 4000, false, 'bottom', 'right', true);
                                console.error('Failed to decrypt file: Invalid password or file is corrupted.');
                                return;
                            }
                            fileIsJson(statusOfDecryption);
                        }

                        const changePasswordIcon = () => {
                            const importFilePasswordInputEl = document.getElementById('importFilePasswordInput');
                            const passwordShowHideIconEl = document.getElementById('passwordShowHideIcon');
                            if (isPasswordVisibleImport) {
                                passwordShowHideIconEl.innerHTML = showPasswordImportSvg;
                                isPasswordVisibleImport = false;
                                importFilePasswordInputEl.setAttribute('type', 'text');
                            } else {
                                passwordShowHideIconEl.innerHTML = hidePasswordImportSvg;
                                isPasswordVisibleImport = true;
                                importFilePasswordInputEl.setAttribute('type', 'password');
                            }
                        }

                        const addEventListenersToDecrypt = () => {
                            const passwordShowHideIconEl = document.getElementById('passwordShowHideIcon');
                            const decryptionButtonEl = document.getElementById('decryptButton');
                            decryptionButtonEl.addEventListener('click', decryptionFile);
                            passwordShowHideIconEl.addEventListener('click', changePasswordIcon);
                        }
                        addEventListenersToDecrypt();
                    }

                    const addEventListenersToImportProfile = () => {
                        const filePickerInputFileEl = document.getElementById('filePickerInputFile');
                        const filePickerInputFileNameEl = document.getElementById('filePickerInputFileName');
                        const importFileDateEl = document.getElementById('importFileDate');
                        const importFileSizeEl = document.getElementById('importFileSize');
                        const importFileInfoTopEl = document.getElementById('importFileInfoTop');
                        const filePickerInputFileInfoEl = document.getElementById('filePickerInputFileInfo');

                        const readDataFromFile = (event) => {
                            try {
                                if (event.type !== 'change') { throw Error('File picker input must have a change event'); }
                                const importFileInfoIncludeEl = document.getElementById('importFileInfoInclude');
                                const importFileInfoMiddleDetailEl = document.getElementById('importFileInfoMiddleDetail');
                                importFileInfoMiddleDetailEl.innerHTML = '';
                                importFileInfoIncludeEl.textContent = '';
                                fileData = null;
                                const file = event.target.files[0];
                                let fileName = '';
                                if (!file) {
                                    throw Error('No file selected');
                                }
                                setDefaultValues();
                                if (file.name) {
                                    const [name, extension] = file.name.split(/\.(?=[^\.]+$)/);
                                    fileName = `${truncateString(name, 33, 3)}.${extension}`;
                                    filePickerInputFileNameEl.setAttribute('title', name);
                                    filePickerInputFileNameEl.innerText = fileName;
                                }
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                    fileData = e.target.result;
                                    if (fileData.length === 0) {
                                        showMessageToastify('error', ``, languageObject._exportImportOptions._importProfile._infoMessages.errorReadEmpty, 4000, false, 'bottom', 'right', true);
                                        throw Error('Error to read file');
                                    }
                                    const isEncrypted = fileContent => {
                                        try {
                                            JSON.parse(fileContent);
                                            return false;
                                        } catch (error) {
                                            return true;
                                        }
                                    }
                                    importFileInfoTopEl.style.opacity = 1;
                                    importFileDateEl.innerText = formatDateTime(file.lastModified, currentLanguage, 'date');
                                    fileSize = formatBytes(file.size);
                                    importFileSizeEl.innerText = fileSize;
                                    if (isEncrypted(fileData) === true) {
                                        if (fileData.charAt(0) !== 'U') {
                                            importFileInfoTopEl.style.opacity = 0;
                                            filePickerInputFileNameEl.value = '';
                                            filePickerInputFileNameEl.innerText = '';
                                            showMessageToastify('error', ``, languageObject._exportImportOptions._importProfile._infoMessages.errorReadInvalid, 5000, false, 'bottom', 'right', true);
                                            throw Error('Unsupported file data');
                                        }
                                        fileIsEncrypted(fileData);
                                    } else if (isEncrypted(fileData) === false) {
                                        fileIsJson(fileData);
                                    }
                                };
                                reader.readAsText(file);
                            } catch (error) {
                                console.warn('%c%s', '', error);
                            }
                        }

                        const cancelReadDataFromFile = () => {
                            const filePickerInputFileNameEl = document.getElementById('filePickerInputFileName');
                            const importFileInfoTopEl = document.getElementById('importFileInfoTop');
                            const importFileDateEl = document.getElementById('importFileDate');
                            const importFileSizeEl = document.getElementById('importFileSize');
                            const importFileInfoMiddleDetailEl = document.getElementById('importFileInfoMiddleDetail');

                            filePickerInputFileNameEl.value = '';
                            fileData = null;
                            importFileInfoMiddleDetailEl.innerHTML = '';
                            filePickerInputFileNameEl.setAttribute('title', '');
                            filePickerInputFileNameEl.innerHTML = '';
                            importFileSizeEl.innerHTML = '';
                            importFileDateEl.innerHTML = '';
                            importFileInfoTopEl.style.opacity = 0;
                            setDefaultValues();
                        }

                        const mouseEnter = () => {
                            filePickerInputFileInfoEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                        }

                        const mouseLeave = () => {
                            filePickerInputFileInfoEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        }

                        filePickerInputFileEl.addEventListener('change', readDataFromFile);
                        filePickerInputFileEl.addEventListener('cancel', cancelReadDataFromFile);
                        filePickerInputFileEl.addEventListener('error', cancelReadDataFromFile);
                        filePickerInputFileEl.addEventListener('mouseenter', mouseEnter);
                        filePickerInputFileEl.addEventListener('mouseleave', mouseLeave);
                    }
                    addEventListenersToImportProfile();
                    break;
                case 'syncBrowserBookmarks':
                    const editFolderSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${editingMainUserSettings.windows.button.primary.font.color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 11.5V5a2 2 0 0 1 2-2h3.9c.7 0 1.3.3 1.7.9l.8 1.2c.4.6 1 .9 1.7.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-9.5" /><path d="M11.378 13.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" /></svg>`;
                    const deleteFolderSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${editingMainUserSettings.windows.button.danger.font.color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /><path d="m9.5 10.5 5 5" /><path d="m14.5 10.5-5 5" /></svg>`;
                    const checkMarkSVG = `<svg class="checkMarkFolder" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 12.5L11 15.5L16 9.5" stroke="${editingMainUserSettings.windows.button.success.backgroundColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="10" stroke="${editingMainUserSettings.windows.button.success.backgroundColor}" stroke-width="2"/></svg>`;
                    const notAllowCheckMarkSVG = `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M0.877075 7.49988C0.877075 3.84219 3.84222 0.877045 7.49991 0.877045C11.1576 0.877045 14.1227 3.84219 14.1227 7.49988C14.1227 11.1575 11.1576 14.1227 7.49991 14.1227C3.84222 14.1227 0.877075 11.1575 0.877075 7.49988ZM7.49991 1.82704C4.36689 1.82704 1.82708 4.36686 1.82708 7.49988C1.82708 10.6329 4.36689 13.1727 7.49991 13.1727C10.6329 13.1727 13.1727 10.6329 13.1727 7.49988C13.1727 4.36686 10.6329 1.82704 7.49991 1.82704ZM9.85358 5.14644C10.0488 5.3417 10.0488 5.65829 9.85358 5.85355L8.20713 7.49999L9.85358 9.14644C10.0488 9.3417 10.0488 9.65829 9.85358 9.85355C9.65832 10.0488 9.34173 10.0488 9.14647 9.85355L7.50002 8.2071L5.85358 9.85355C5.65832 10.0488 5.34173 10.0488 5.14647 9.85355C4.95121 9.65829 4.95121 9.3417 5.14647 9.14644L6.79292 7.49999L5.14647 5.85355C4.95121 5.65829 4.95121 5.3417 5.14647 5.14644C5.34173 4.95118 5.65832 4.95118 5.85358 5.14644L7.50002 6.79289L9.14647 5.14644C9.34173 4.95118 9.65832 4.95118 9.85358 5.14644Z" fill="currentColor" /></svg>`;
                    const forbiddenBookmarkIdArray = ['root________'];
                    const animationToshowFoldersTreeTime = 0.9;
                    let bookmarkArray = [];
                    let synchronizeStatus = false;
                    let showFolderSelection = false;
                    let browserBookmarkArray = [];
                    let extensionBookmarkArray = userProfileExport.currentUserBookmarks;
                    let selectedFolderId = '';
                    let treeFolderType = 'browser';
                    let reloadBrowserTree = false;
                    let synchronizeDirection = {
                        browserToExtension: false,
                        bothDirections: false,
                        extensionToBrowser: false
                    };
                    settingsWindowRightSectionHtml = `
                        <div id="synchronizeBrowserBookmarksContainer">
                            <div id="synchronizeBrowserBookmarksContainerTop">
                                <div id="synchronizeStatusContainer" style="background-color: ${colorPalette[1]}">
                                    <div id="synchronizeStatusTitle">Synchronize Bookmarks</div>
                                    <div id="synchronizeStatusToggle">
                                        <div class="importTypeBox">
                                            <label class="toggle" for="synchronizeStatusInput">
                                                <input type="checkbox" class="toggleInput importToggleInput" id="synchronizeStatusInput" />
                                                <span class="toggleTrack">
                                                    <span class="toggleIndicator">
                                                        <span class="checkMark">
                                                            <svg viewBox="0 0 24 24" id="ghq-svg-check" role="presentation" aria-hidden="true">
                                                                <path d="M9.86 18a1 1 0 01-.73-.32l-4.86-5.17a1.001 1.001 0 011.46-1.37l4.12 4.39 8.41-9.2a1 1 0 111.48 1.34l-9.14 10a1 1 0 01-.73.33h-.01z"></path>
                                                            </svg>
                                                        </span>
                                                    </span>
                                                </span>
                                                <span id="synchronizeStatusInputTitle">Synchronization Is On</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div id="synchronizeTypeContainer" style="background-color: ${colorPalette[2]}">
                                    <div id="synchronizeTypeTitle">Synchronize Type</div>
                                    <div id="synchronizeTypeList">
                                        <div id="synchronizeBrowserToExtension">
                                            <div class="importTypeBox">
                                                <label class="toggle" for="synchronizeTypeBrowserToExtension">
                                                    <input type="checkbox" class="toggleInput importToggleInput" id="synchronizeTypeBrowserToExtension" />
                                                    <span class="toggleTrack">
                                                        <span class="toggleIndicator">
                                                            <span class="checkMark">
                                                                <svg viewBox="0 0 24 24" id="ghq-svg-check" role="presentation" aria-hidden="true">
                                                                    <path d="M9.86 18a1 1 0 01-.73-.32l-4.86-5.17a1.001 1.001 0 011.46-1.37l4.12 4.39 8.41-9.2a1 1 0 111.48 1.34l-9.14 10a1 1 0 01-.73.33h-.01z"></path>
                                                                </svg>
                                                            </span>
                                                        </span>
                                                    </span>
                                                    <span id="synchronizeTypeBrowserToExtensionTitle">Browser To Extension</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div id="synchronizeBothDirections">
                                            <div class="importTypeBox">
                                                <label class="toggle" for="synchronizeTypeBothDirections">
                                                    <input type="checkbox" class="toggleInput importToggleInput" id="synchronizeTypeBothDirections" />
                                                    <span class="toggleTrack">
                                                        <span class="toggleIndicator">
                                                            <span class="checkMark">
                                                                <svg viewBox="0 0 24 24" id="ghq-svg-check" role="presentation" aria-hidden="true">
                                                                    <path d="M9.86 18a1 1 0 01-.73-.32l-4.86-5.17a1.001 1.001 0 011.46-1.37l4.12 4.39 8.41-9.2a1 1 0 111.48 1.34l-9.14 10a1 1 0 01-.73.33h-.01z"></path>
                                                                </svg>
                                                            </span>
                                                        </span>
                                                    </span>
                                                    <span id="synchronizeTypeBothDirectionsTitle">Both Directions</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div id="synchronizeExtensionToBrowser">
                                            <div class="importTypeBox">
                                                <label class="toggle" for="synchronizeTypeExtensionToBrowser">
                                                    <input type="checkbox" class="toggleInput importToggleInput" id="synchronizeTypeExtensionToBrowser" />
                                                    <span class="toggleTrack">
                                                        <span class="toggleIndicator">
                                                            <span class="checkMark">
                                                                <svg viewBox="0 0 24 24" id="ghq-svg-check" role="presentation" aria-hidden="true">
                                                                    <path d="M9.86 18a1 1 0 01-.73-.32l-4.86-5.17a1.001 1.001 0 011.46-1.37l4.12 4.39 8.41-9.2a1 1 0 111.48 1.34l-9.14 10a1 1 0 01-.73.33h-.01z"></path>
                                                                </svg>
                                                            </span>
                                                        </span>
                                                    </span>
                                                    <span id="synchronizeTypeExtensionToBrowserTitle">Extension To Browser</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div id="synchronizeVisualStatusContainer" style="background-color: ${colorPalette[1]}">
                                    <div id="synchronizeVisualStatus">
                                        <div id="synchronizeVisualStatusLeft">${firefoxLogoSVG.replace(/width="[^"]*"/, `width="80px"`).replace(/height="[^"]*"/, `height="80px"`)}</div>
                                        <div id="synchronizeVisualStatusMiddle">
                                            <div id="synchronizeVisualArrowTop"></div>
                                            <div id="synchronizeVisualArrowBottom"></div>
                                        </div>
                                        <div id="synchronizeVisualStatusRight">${extensionLogoSVG.replace(/width="[^"]*"/, `width="80px"`).replace(/height="[^"]*"/, `height="80px"`)}</div>
                                    </div>
                                    <div id="synchronizeVisualStatusFoldersContainer">
                                        <div id="synchronizeVisualStatusBrowserFolder">
                                            <div id="synchronizeVisualStatusBrowserFolderTitle">Browser Folder</div>
                                            <div id="synchronizeVisualStatusBrowserFolderIconAndName">
                                                <div id="synchronizeVisualStatusBrowserFolderIcon" style="display: none">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${editingMainUserSettings.windows.button.success.backgroundColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /><path d="m9 13 2 2 4-4" /></svg>
                                                </div>
                                                <div id="synchronizeVisualStatusBrowserFolderName">
                                                    <div id="browserFolderName"></div>
                                                    <div id="browserFolderButtons">
                                                        <button id="browserFolderEditButton">${editFolderSVG}</button>
                                                        <button id="browserFolderDeleteButton" style="display: none">${deleteFolderSVG}</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div id="synchronizeVisualStatusExtensionFolder">
                                            <div id="synchronizeVisualStatusExtensionFolderTitle">Extension Folder</div>
                                            <div id="synchronizeVisualStatusExtensionFolderIconAndName">
                                                <div id="synchronizeVisualStatusExtensionFolderIcon" style="display: none">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${editingMainUserSettings.windows.button.success.backgroundColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /><path d="m9 13 2 2 4-4" /></svg>
                                                </div>
                                                <div id="synchronizeVisualStatusExtensionFolderName">
                                                    <div id="extensionFolderName"></div>
                                                    <div id="extensionFolderButtons">
                                                        <button id="extensionFolderEditButton">${editFolderSVG}</button>
                                                        <button id="extensionFolderDeleteButton" style="display: none">${deleteFolderSVG}</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div id="synchronizeBrowserBookmarksContainerMiddle">
                                <div id="synchronizeBrowserBookmarksContainerMiddleFolderStatus">
                                    <div id="synchronizeBrowserBookmarksContainerMiddleFolderName"></div>
                                    <div id="synchronizeBrowserBookmarksContainerMiddleFolderApplyButton">
                                        <button id="folderCancelButton">Cancel</button>
                                        <button id="folderApplyButton">Change</button>
                                    </div>
                                </div>
                                <div id="synchronizeBrowserBookmarksContainerMiddleFolderTree"></div>
                            </div>
                            <div id="synchronizeBrowserBookmarksContainerBottom">
                                <div id="synchronizeBrowserBookmarksContainerBottomButtons">
                                    <button id="synchronizeApplyButton">Sync</button>
                                </div>
                            </div>
                        </div>
                    `;
                    settingsWindowRightSectionEl.innerHTML = settingsWindowRightSectionHtml;

                    const updateWindowStyleSynchronizeSettingsTitlesUI = () => {
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
                            synchronizeStatusTitle: {
                                id: 'synchronizeStatusTitle',
                                text: languageObject._syncBackup._syncBrowserBookmarks.synchronizeBookmarks,
                                classNames: []
                            },
                            synchronizeTypeTitle: {
                                id: 'synchronizeTypeTitle',
                                text: languageObject._syncBackup._syncBrowserBookmarks.synchronizeType,
                                classNames: []
                            },
                            synchronizeTypeBrowserToExtensionTitle: {
                                id: 'synchronizeTypeBrowserToExtensionTitle',
                                text: languageObject._syncBackup._syncBrowserBookmarks._browserToExtension.title,
                                classNames: []
                            },
                            synchronizeTypeBothDirectionsTitle: {
                                id: 'synchronizeTypeBothDirectionsTitle',
                                text: languageObject._syncBackup._syncBrowserBookmarks._bothDirections.title,
                                classNames: []
                            },
                            synchronizeTypeExtensionToBrowserTitle: {
                                id: 'synchronizeTypeExtensionToBrowserTitle',
                                text: languageObject._syncBackup._syncBrowserBookmarks._extensionToBrowser.title,
                                classNames: []
                            },
                            synchronizeVisualStatusBrowserFolderTitle: {
                                id: 'synchronizeVisualStatusBrowserFolderTitle',
                                text: languageObject._syncBackup._syncBrowserBookmarks.browserFolder,
                                classNames: []
                            },
                            synchronizeVisualStatusExtensionFolderTitle: {
                                id: 'synchronizeVisualStatusExtensionFolderTitle',
                                text: languageObject._syncBackup._syncBrowserBookmarks.extensionFolder,
                                classNames: []
                            },
                            folderCancelButton: {
                                id: 'folderCancelButton',
                                text: languageObject._syncBackup._syncBrowserBookmarks.cancel,
                                classNames: []
                            },
                            folderApplyButton: {
                                id: 'folderApplyButton',
                                text: languageObject._syncBackup._syncBrowserBookmarks.setFolder,
                                classNames: []
                            },
                            synchronizeApplyButton: {
                                id: 'synchronizeApplyButton',
                                text: languageObject._syncBackup._syncBrowserBookmarks.synchronize,
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
                        const createInfoForTypeNames = () => {
                            const backgroundColorBrightness = checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff';
                            const style = {
                                backgroundColor: editingMainUserSettings.windows.window.backgroundColor,
                                color: editingMainUserSettings.windows.window.font.color,
                                padding: '5px',
                                borderRadius: '5px',
                                border: `1px solid ${backgroundColorBrightness}`,
                                fontSize: `${editingMainUserSettings.windows.window.font.fontSize}px`,
                                fontWeight: editingMainUserSettings.windows.window.font.fontWeight,
                                fontFamily: editingMainUserSettings.windows.window.font.fontFamily,
                                width: '400px'
                            }

                            const underlineStyle = {
                                textDecorationColor: editingMainUserSettings.windows.window.font.color,
                            }

                            const synchronizeTypeBrowserToExtensionTitleEl = document.getElementById('synchronizeTypeBrowserToExtensionTitle');
                            const synchronizeTypeBothDirectionsTitleEl = document.getElementById('synchronizeTypeBothDirectionsTitle');
                            const synchronizeTypeExtensionToBrowserTitleEl = document.getElementById('synchronizeTypeExtensionToBrowserTitle');

                            Object.assign(synchronizeTypeBrowserToExtensionTitleEl.style, underlineStyle);
                            Object.assign(synchronizeTypeBothDirectionsTitleEl.style, underlineStyle);
                            Object.assign(synchronizeTypeExtensionToBrowserTitleEl.style, underlineStyle);

                            createTooltip(synchronizeTypeBrowserToExtensionTitleEl, 'top', languageObject._syncBackup._syncBrowserBookmarks._browserToExtension.explain, style);
                            createTooltip(synchronizeTypeBothDirectionsTitleEl, 'top', languageObject._syncBackup._syncBrowserBookmarks._bothDirections.explain, style);
                            createTooltip(synchronizeTypeExtensionToBrowserTitleEl, 'top', languageObject._syncBackup._syncBrowserBookmarks._extensionToBrowser.explain, style);
                        }
                        createInfoForTypeNames();
                    }
                    updateWindowStyleSynchronizeSettingsTitlesUI();

                    const setDefaultValuesToTypeInput = () => {
                        const synchronizeTypeBrowserToExtensionEl = document.getElementById('synchronizeTypeBrowserToExtension');
                        const synchronizeTypeBothDirectionsEl = document.getElementById('synchronizeTypeBothDirections');
                        const synchronizeTypeExtensionToBrowserEl = document.getElementById('synchronizeTypeExtensionToBrowser');

                        synchronizeDirection = editingMainUserSettings.main.synchronizationToBrowser.synchronizeDirection;
                        const isAnyValueTrue = (statusObject) => {
                            return Object.values(statusObject).some(value => value === true);
                        };
                        if (!isAnyValueTrue(synchronizeDirection)) {
                            synchronizeDirection.bothDirections = true;
                            editingMainUserSettings.main.synchronizationToBrowser.synchronizeDirection.bothDirections = true;
                        }

                        synchronizeTypeBrowserToExtensionEl.checked = synchronizeDirection.browserToExtension;
                        synchronizeTypeBothDirectionsEl.checked = synchronizeDirection.bothDirections;
                        synchronizeTypeExtensionToBrowserEl.checked = synchronizeDirection.extensionToBrowser;

                    }
                    const setDefaultValuesToInputStatus = () => {
                        const synchronizeStatusInputEl = document.getElementById('synchronizeStatusInput');
                        const synchronizeStatusInputTitleEl = document.getElementById('synchronizeStatusInputTitle');
                        if (editingMainUserSettings.main.synchronizationToBrowser.browserFolderId.length > 0 &&
                            editingMainUserSettings.main.synchronizationToBrowser.extensionFolderId.length > 0
                        ) {
                            synchronizeStatusInputTitleEl.innerText = languageObject._syncBackup._syncBrowserBookmarks.synchronizationIsOn;
                            editingMainUserSettings.main.synchronizationToBrowser.status = true;
                            synchronizeStatus = true;
                            synchronizeStatusInputEl.checked = synchronizeStatus;
                        } else {
                            synchronizeStatusInputTitleEl.innerText = languageObject._syncBackup._syncBrowserBookmarks.synchronizationIsOff;
                            editingMainUserSettings.main.synchronizationToBrowser.status = false;
                            synchronizeStatus = false;
                            synchronizeStatusInputEl.checked = synchronizeStatus;
                        }
                    }

                    const setDefaultValuesToSynchronizeWindow = () => {
                        const folderCancelButtonEL = document.getElementById('folderCancelButton');
                        const folderApplyButtonEL = document.getElementById('folderApplyButton');
                        const synchronizeApplyButtonEl = document.getElementById('synchronizeApplyButton');
                        const browserFolderEditButtonEl = document.getElementById('browserFolderEditButton');
                        const extensionFolderEditButtonEl = document.getElementById('extensionFolderEditButton');
                        folderCancelButtonEL.style.backgroundColor = editingMainUserSettings.windows.button.danger.backgroundColor;
                        folderCancelButtonEL.style.color = editingMainUserSettings.windows.button.danger.font.color;
                        folderApplyButtonEL.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        folderApplyButtonEL.style.color = editingMainUserSettings.windows.button.primary.font.color;
                        synchronizeApplyButtonEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        synchronizeApplyButtonEl.style.display = 'none';
                        browserFolderEditButtonEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        extensionFolderEditButtonEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;

                        setDefaultValuesToInputStatus();
                        setDefaultValuesToTypeInput();

                        (async () => {
                            try {
                                // Await the retrieval of the bookmark tree
                                browserBookmarkArray = await browser.bookmarks.getTree();
                                setFoldersNameAndButtons();
                            } catch (error) {
                                console.error('Error retrieving bookmark tree:', error);
                            }
                        })();
                    }
                    setDefaultValuesToSynchronizeWindow();

                    const setCheckerToFolderTree = () => {
                        const synchronizeBrowserBookmarksContainerMiddleFolderNameEl = document.getElementById('synchronizeBrowserBookmarksContainerMiddleFolderName');
                        const checkArray = document.querySelectorAll(`.check`);
                        const liArray = document.querySelectorAll(`li[data-id]`);
                        const id = selectedFolderId;
                        if (checkArray.length === 0) { return; }
                        synchronizeBrowserBookmarksContainerMiddleFolderNameEl.innerText = '';
                        checkArray.forEach((check, index) => {
                            if (check.dataset.id === id && liArray[index].dataset.id === id) {
                                liArray[index].style.setProperty('--lineWidth', '5px');
                                check.innerHTML = forbiddenBookmarkIdArray.includes(id) ? notAllowCheckMarkSVG : checkMarkSVG;
                            } else {
                                liArray[index].style.setProperty('--lineWidth', '15px');
                                check.innerHTML = '';
                            }
                        });
                        if (id.length === 0) { return; }
                        const object = findBookmarkByKey(bookmarkArray, id);
                        truncateTextIfOverflow(synchronizeBrowserBookmarksContainerMiddleFolderNameEl, object.title);
                    }

                    const setFoldersNameAndButtons = () => {
                        const synchronizeVisualStatusBrowserFolderIconEl = document.getElementById('synchronizeVisualStatusBrowserFolderIcon');
                        const browserFolderNameEl = document.getElementById('browserFolderName');
                        const browserFolderDeleteButtonEl = document.getElementById('browserFolderDeleteButton');

                        const synchronizeVisualStatusExtensionFolderIconEl = document.getElementById('synchronizeVisualStatusExtensionFolderIcon');
                        const extensionFolderNameEl = document.getElementById('extensionFolderName');
                        const extensionFolderDeleteButtonEl = document.getElementById('extensionFolderDeleteButton');

                        const backgroundColorBrightness = checkIfColorBrightness(editingMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff';
                        const style = {
                            backgroundColor: editingMainUserSettings.windows.window.backgroundColor,
                            color: editingMainUserSettings.windows.window.font.color,
                            padding: '5px',
                            borderRadius: '5px',
                            border: `1px solid ${backgroundColorBrightness}`,
                            fontSize: `${editingMainUserSettings.windows.window.font.fontSize}px`,
                            fontWeight: editingMainUserSettings.windows.window.font.fontWeight,
                            fontFamily: editingMainUserSettings.windows.window.font.fontFamily,
                            width: 'auto',
                            maxWidth: '250px',
                        }

                        const underlineStyle = {
                            textDecorationColor: editingMainUserSettings.windows.window.font.color,
                        }

                        Object.assign(browserFolderNameEl.style, underlineStyle);
                        Object.assign(extensionFolderNameEl.style, underlineStyle);

                        if (editingMainUserSettings.main.synchronizationToBrowser.extensionFolderId.length > 0) {
                            const objectBookmarkFolder = findBookmarkByKey(extensionBookmarkArray, editingMainUserSettings.main.synchronizationToBrowser.extensionFolderId);
                            if (objectBookmarkFolder === undefined || objectBookmarkFolder === null) {
                                showMessageToastify('error', ``, 'The selected folder is not accessible. Please ensure that the folder you chose in this extension is still available.', 5000, false, 'bottom', 'right', true);
                                editingMainUserSettings.main.synchronizationToBrowser.extensionFolderId = '';
                                setDefaultValuesToInputStatus();
                                setDefaultValuesToTypeInput();
                                creationOfSynchronizeVisualStatus();
                            }
                            truncateTextIfOverflow(extensionFolderNameEl, objectBookmarkFolder.title);
                            createTooltip(extensionFolderNameEl, 'top', objectBookmarkFolder.title, style);
                            synchronizeVisualStatusExtensionFolderIconEl.style.display = 'flex';
                            extensionFolderDeleteButtonEl.style.display = 'flex';
                            extensionFolderDeleteButtonEl.style.backgroundColor = editingMainUserSettings.windows.button.danger.backgroundColor;
                        } else {
                            synchronizeVisualStatusExtensionFolderIconEl.style.display = 'none';
                            extensionFolderDeleteButtonEl.style.display = 'none';
                            extensionFolderNameEl.innerText = '';
                        }

                        if (editingMainUserSettings.main.synchronizationToBrowser.browserFolderId.length > 0) {
                            const objectBrowserFolder = findBookmarkByKey(browserBookmarkArray, editingMainUserSettings.main.synchronizationToBrowser.browserFolderId);
                            if (objectBrowserFolder === undefined || objectBrowserFolder === null) {
                                showMessageToastify('error', ``, 'The selected folder is not accessible. Please ensure that the folder you chose in your web browser is still available.', 5000, false, 'bottom', 'right', true);
                                editingMainUserSettings.main.synchronizationToBrowser.browserFolderId = '';
                                setDefaultValuesToInputStatus();
                                setDefaultValuesToTypeInput();
                                creationOfSynchronizeVisualStatus();
                            }
                            truncateTextIfOverflow(browserFolderNameEl, objectBrowserFolder.title);
                            createTooltip(browserFolderNameEl, 'top', objectBrowserFolder.title, style);
                            synchronizeVisualStatusBrowserFolderIconEl.style.display = 'flex';
                            browserFolderDeleteButtonEl.style.display = 'flex';
                            browserFolderDeleteButtonEl.style.backgroundColor = editingMainUserSettings.windows.button.danger.backgroundColor;
                        } else {
                            synchronizeVisualStatusBrowserFolderIconEl.style.display = 'none';
                            browserFolderDeleteButtonEl.style.display = 'none';
                            browserFolderNameEl.innerText = '';
                        }
                    }

                    const creationOfSynchronizeVisualStatus = () => {
                        const synchronizeVisualArrowTopEl = document.getElementById('synchronizeVisualArrowTop');
                        const synchronizeVisualArrowBottomEl = document.getElementById('synchronizeVisualArrowBottom');
                        const newColorArray = ['#00cc00', '#006000', '#263900'];
                        const originalColorArray = ['#3a8ee6', '#9059ff', '#c139e6'];
                        let timeOutTop;
                        let timeOutBottom;

                        const cleanOfSynchronizeVisualBrowserToExtension = () => {
                            const arrowRightEl = document.querySelectorAll('.arrowRight');
                            const extensionsLogoSVG = document.getElementById('extensionsLogo');
                            for (let i = 0; i < arrowRightEl.length; i++) {
                                gsap.killTweensOf(arrowRightEl[i]);
                            }
                            synchronizeVisualArrowTopEl.innerHTML = '';
                            clearTimeout(timeOutTop);
                            clearTimeout(timeOutBottom);
                            extensionsLogoSVG.style.fill = '#ff6666';
                        }

                        const creationOfSynchronizeVisualBrowserToExtension = () => {
                            let synchronizeVisualArrowTopHtml = ``;
                            for (let i = 0; i < 9; i++) {
                                synchronizeVisualArrowTopHtml += `<svg width="20" height="20" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="green" stroke="#000" stroke-width="1" class="arrowRight"><path d="m0,99.85741l0,-99.85741l100,49.92871l-100,49.92871z"/></svg>`;
                            }
                            synchronizeVisualArrowTopEl.innerHTML = synchronizeVisualArrowTopHtml;
                            const arrowRightEl = document.querySelectorAll('.arrowRight');
                            const extensionsLogoSVG = document.getElementById('extensionsLogo');

                            for (let i = 0; i < arrowRightEl.length; i++) {
                                gsap.fromTo(arrowRightEl[i], {
                                    opacity: 0,
                                    fill: '#00000000',
                                    stroke: '#00000000'
                                }, {
                                    opacity: 1,
                                    fill: '#28c02d',
                                    stroke: '#000',
                                    duration: 1.5,
                                    delay: 0.8 + (i * .1),
                                    ease: Linear.easeNone,
                                    repeat: -1,
                                    onComplete: () => {
                                    },
                                    onRepeat: () => {
                                        // if (i === arrowRightEl.length - 1) {
                                        //     extensionsLogoSVG.style.fill = '#28c02d';
                                        //     timeOutTop = setTimeout(() => {
                                        //         extensionsLogoSVG.style.fill = '#ff6666';
                                        //     }, 500);
                                        // }
                                    }
                                });
                            }
                        }

                        const cleanOfSynchronizeVisualExtensionToBrowser = () => {
                            const arrowLeftEl = document.querySelectorAll('.arrowLeft');
                            const stopColorArray = document.querySelectorAll('.stopColor');
                            for (let i = 0; i < arrowLeftEl.length; i++) {
                                gsap.killTweensOf(arrowLeftEl[i]);
                                arrowLeftEl[i].remove();
                            }
                            clearTimeout(timeOutBottom);
                            stopColorArray.forEach((stopColor, index) => {
                                stopColor.style.stopColor = originalColorArray[index];
                            });
                        }

                        const creationOfSynchronizeVisualExtensionToBrowser = () => {
                            let synchronizeVisualArrowBottomHtml = ``;
                            for (let i = 0; i < 9; i++) {
                                synchronizeVisualArrowBottomHtml += `<svg width="20" height="20" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="green" stroke="#000" stroke-width="1" class="arrowLeft"><path d="m99.42575,99.0906l-99.22305,-49.5453l99.22305,-49.5453l0,99.0906z"/></svg>`;
                            }
                            synchronizeVisualArrowBottomEl.innerHTML = synchronizeVisualArrowBottomHtml;
                            const arrowLeftEl = document.querySelectorAll('.arrowLeft');
                            const stopColorArray = document.querySelectorAll('.stopColor');
                            for (let i = arrowLeftEl.length - 1; i >= 0; i--) {
                                gsap.fromTo(arrowLeftEl[i], {
                                    opacity: 0,
                                    fill: '#00000000',
                                    stroke: '#00000000'
                                }, {
                                    opacity: 1,
                                    fill: '#28c02d',
                                    stroke: '#000',
                                    duration: 1.5,
                                    delay: 0.8 + ((arrowLeftEl.length - 1 - i) * 0.1),
                                    ease: Linear.easeNone,
                                    repeat: -1,
                                    onComplete: () => {
                                    },
                                    onRepeat: () => {
                                        // if (i === 0) {
                                        //     stopColorArray.forEach((stopColor, index) => {
                                        //         stopColor.style.stopColor = newColorArray[index];
                                        //     });
                                        //     timeOutBottom = setTimeout(() => {
                                        //         stopColorArray.forEach((stopColor, index) => {
                                        //             stopColor.style.stopColor = originalColorArray[index];
                                        //         });
                                        //     }, 500);
                                        // }
                                    }
                                });
                            }
                        }

                        cleanOfSynchronizeVisualBrowserToExtension();
                        cleanOfSynchronizeVisualExtensionToBrowser();
                        if (synchronizeDirection.browserToExtension && !showFolderSelection && synchronizeStatus) {
                            creationOfSynchronizeVisualBrowserToExtension();
                        } else if (synchronizeDirection.bothDirections && !showFolderSelection && synchronizeStatus) {
                            creationOfSynchronizeVisualBrowserToExtension();
                            creationOfSynchronizeVisualExtensionToBrowser();
                        } else if (synchronizeDirection.extensionToBrowser && !showFolderSelection && synchronizeStatus) {
                            creationOfSynchronizeVisualExtensionToBrowser();
                        }
                    }
                    creationOfSynchronizeVisualStatus();

                    // Create a custom event system
                    const animationEvents = {
                        listeners: {},
                        on(event, callback) {
                            if (!this.listeners[event]) {
                                this.listeners[event] = [];
                            }
                            this.listeners[event].push(callback);
                        },
                        emit(event, data) {
                            if (this.listeners[event]) {
                                this.listeners[event].forEach(callback => callback(data));
                            }
                        },
                        remove(event, callback) {
                            if (!this.listeners[event]) return;

                            // Filter out the callback to be removed
                            this.listeners[event] = this.listeners[event].filter(
                                listener => listener !== callback
                            );
                        }
                    };

                    const browserBookmarkHasChanged = () => {
                        const browserFolderEditButtonEl = document.getElementById('browserFolderEditButton');
                        if (reloadBrowserTree || !showFolderSelection) { return; }
                        reloadBrowserTree = true;
                        showFolderSelection = false;
                        selectedFolderId = '';
                        creationOfSynchronizeVisualStatus();
                        hideHowSynchronizeVisualStatusContainer();
                        showMessageToastify('info', ``, 'The browser bookmarks have changed. Waiting for the animation to rebuild the folder tree.', 5000, false, 'bottom', 'right', true);
                        const onAnimationComplete = () => {
                            animationEvents.remove('animationCompleteTree', onAnimationComplete);
                            browserFolderEditButtonEl.click();
                        };

                        animationEvents.on('animationCompleteTree', onAnimationComplete);
                    }

                    const debounceBrowserBookmarkHasChanged = debounce(browserBookmarkHasChanged, animationToshowFoldersTreeTime + 0.4 * 1000);

                    const createFolderTree = (type) => {
                        const synchronizeBrowserBookmarksContainerMiddleFolderStatusEl = document.getElementById('synchronizeBrowserBookmarksContainerMiddleFolderStatus');
                        const synchronizeBrowserBookmarksContainerMiddleFolderTreeEl = document.getElementById('synchronizeBrowserBookmarksContainerMiddleFolderTree');

                        if (type === 'browser') {
                            (async () => {
                                try {
                                    // Await the retrieval of the bookmark tree
                                    browserBookmarkArray = await browser.bookmarks.getTree();
                                    setFoldersNameAndButtons();
                                } catch (error) {
                                    console.error('Error retrieving bookmark tree:', error);
                                }
                            })();
                            bookmarkArray = browserBookmarkArray;
                            selectedFolderId = editingMainUserSettings.main.synchronizationToBrowser.browserFolderId;
                            // Helper function to manage event listeners
                            const manageListener = (event, handler) => {
                                if (!event.hasListener(handler)) {
                                    event.addListener(handler);
                                }
                            };

                            if (!browser.bookmarks.onCreated.hasListener(browserBookmarkHasChanged)) {
                                // Manage listeners for each bookmark event
                                manageListener(browser.bookmarks.onCreated, debounceBrowserBookmarkHasChanged);
                                manageListener(browser.bookmarks.onChanged, debounceBrowserBookmarkHasChanged);
                                manageListener(browser.bookmarks.onRemoved, debounceBrowserBookmarkHasChanged);
                                manageListener(browser.bookmarks.onMoved, debounceBrowserBookmarkHasChanged);
                            }
                        } else if (type === 'extension') {
                            bookmarkArray = extensionBookmarkArray;
                            selectedFolderId = editingMainUserSettings.main.synchronizationToBrowser.extensionFolderId;
                        }

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
                                        html += `<li data-id="${bookmark.id}"><div class="folder"><div class="check" data-id="${bookmark.id}"></div><span class="folderName" data-id="${bookmark.id}">${bookmark.id === 'root________' ? 'Root' : bookmark.title}</span></div>`;
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
                            const htmlOutput = `<div class="tree">${buildFolderTreeHTML(bookmarkArray)}</div>`; // Wrap the output in a single tree div
                            // Return the generated HTML
                            return htmlOutput;
                        };
                        synchronizeBrowserBookmarksContainerMiddleFolderTreeEl.innerHTML = generateHtmlListFromData();

                        setCheckerToFolderTree();

                        const setDefaultValues = () => {
                            synchronizeBrowserBookmarksContainerMiddleFolderStatusEl.style.backgroundColor = colorPalette[1];
                            synchronizeBrowserBookmarksContainerMiddleFolderTreeEl.style.backgroundColor = colorPalette[2];
                        }
                        setDefaultValues();

                        const addEventListenersToFolderTree = () => {
                            const folderNameArray = document.querySelectorAll('.folderName');

                            const changeSelectedFolder = (e) => {
                                selectedFolderId = e.target.dataset.id;
                                setCheckerToFolderTree();
                            }

                            folderNameArray.forEach(folder => {
                                folder.addEventListener('click', changeSelectedFolder);
                            });
                        }
                        addEventListenersToFolderTree();
                    }

                    const hideHowSynchronizeVisualStatusContainer = () => {
                        const synchronizeBrowserBookmarksContainerMiddleEl = document.getElementById('synchronizeBrowserBookmarksContainerMiddle');
                        const synchronizeVisualStatusContainerEl = document.getElementById('synchronizeVisualStatusContainer');
                        const synchronizeApplyButtonEl = document.getElementById('synchronizeApplyButton');
                        if (showFolderSelection) {
                            gsap.fromTo(synchronizeVisualStatusContainerEl, {
                                opacity: 1,
                                display: 'flex',
                            }, {
                                opacity: 0,
                                display: 'none',
                                duration: animationToshowFoldersTreeTime,
                                ease: Quad.easeIn,
                                onComplete: () => {
                                    gsap.fromTo(synchronizeBrowserBookmarksContainerMiddleEl, {
                                        opacity: 0,
                                        display: 'none',
                                    }, {
                                        opacity: 1,
                                        display: 'flex',
                                        duration: animationToshowFoldersTreeTime,
                                        ease: Quad.easeIn,
                                        onStart: () => animationEvents.emit('animationStart'),
                                        onComplete: () => {
                                            animationEvents.emit('animationComplete');
                                            reloadBrowserTree = false;
                                        },
                                        onRepeat: () => { },
                                    });
                                },
                                onRepeat: () => {
                                }
                            });
                            return;
                        }
                        if (synchronizeStatus) { synchronizeApplyButtonEl.style.display = 'flex'; }
                        gsap.fromTo(synchronizeBrowserBookmarksContainerMiddleEl, {
                            opacity: 1,
                            display: 'flex',
                        }, {
                            opacity: 0,
                            display: 'none',
                            duration: animationToshowFoldersTreeTime,
                            ease: Quad.easeIn,
                            onComplete: () => {
                                gsap.fromTo(synchronizeVisualStatusContainerEl, {
                                    opacity: 0,
                                    display: 'none',
                                }, {
                                    opacity: 1,
                                    display: 'flex',
                                    duration: animationToshowFoldersTreeTime,
                                    ease: Quad.easeIn,
                                    onComplete: () => animationEvents.emit('animationCompleteTree'),
                                    onRepeat: () => { },
                                    onUpdate: () => animationEvents.emit('animationUpdate'),
                                });
                            },
                            onRepeat: () => {
                            }
                        });
                    }

                    const addEventListenersToSynchronizeBrowserBookmarksWindow = () => {
                        const synchronizeStatusInputEl = document.getElementById('synchronizeStatusInput');
                        const synchronizeTypeBrowserToExtensionEl = document.getElementById('synchronizeTypeBrowserToExtension');
                        const synchronizeTypeBrowserToExtensionTitleEl = document.getElementById('synchronizeTypeBrowserToExtensionTitle');
                        const synchronizeTypeBothDirectionsEl = document.getElementById('synchronizeTypeBothDirections');
                        const synchronizeTypeBothDirectionsTitleEl = document.getElementById('synchronizeTypeBothDirectionsTitle');
                        const synchronizeTypeExtensionToBrowserEl = document.getElementById('synchronizeTypeExtensionToBrowser');
                        const synchronizeTypeExtensionToBrowserTitleEl = document.getElementById('synchronizeTypeExtensionToBrowserTitle');
                        const synchronizeVisualStatusBrowserFolderIconEl = document.getElementById('synchronizeVisualStatusBrowserFolderIcon');
                        const browserFolderEditButtonEl = document.getElementById('browserFolderEditButton');
                        const browserFolderDeleteButtonEl = document.getElementById('browserFolderDeleteButton');
                        const synchronizeVisualStatusExtensionFolderIconEl = document.getElementById('synchronizeVisualStatusExtensionFolderIcon');
                        const extensionFolderEditButtonEl = document.getElementById('extensionFolderEditButton');
                        const extensionFolderDeleteButtonEl = document.getElementById('extensionFolderDeleteButton');
                        const folderCancelButtonEL = document.getElementById('folderCancelButton');
                        const folderApplyButtonEL = document.getElementById('folderApplyButton');
                        const synchronizeApplyButtonEl = document.getElementById('synchronizeApplyButton');

                        const changeSynchronizeStatus = () => {
                            const synchronizeVisualStatusBrowserFolderEl = document.getElementById('synchronizeVisualStatusBrowserFolder');
                            const synchronizeVisualStatusExtensionFolderEl = document.getElementById('synchronizeVisualStatusExtensionFolder');
                            const synchronizeStatusInputTitleEl = document.getElementById('synchronizeStatusInputTitle');
                            const elementsArray = [];
                            const message = { sync: { update: false } };

                            synchronizeStatusInputTitleEl.innerText = languageObject._syncBackup._syncBrowserBookmarks.synchronizationIsOn;
                            if (editingMainUserSettings.main.synchronizationToBrowser.browserFolderId.length === 0) {
                                elementsArray.push(synchronizeVisualStatusBrowserFolderEl);
                            }
                            if (editingMainUserSettings.main.synchronizationToBrowser.extensionFolderId.length === 0) {
                                elementsArray.push(synchronizeVisualStatusExtensionFolderEl);
                            }
                            if (elementsArray.length > 0) {
                                elementsArray.forEach((element, index) => {
                                    gsap.fromTo(element, 0.2, {
                                        x: -1,
                                    }, {
                                        x: 1,
                                        repeat: 3,
                                        duration: 1.7,
                                        delay: index * 0.1,
                                        backgroundColor: editingMainUserSettings.windows.button.danger.backgroundColor,
                                        yoyo: true,
                                        ease: Quad.easeInOut,
                                        onComplete: () => {
                                            gsap.set(element, { clearProps: 'all' });
                                            gsap.killTweensOf(element);
                                            element.style.backgroundColor = colorPalette[1];
                                            setDefaultValuesToInputStatus();
                                        }
                                    });
                                });
                            }
                            if (elementsArray.length === 1 && elementsArray[0].id === 'synchronizeVisualStatusBrowserFolder') {
                                showMessageToastify('error', ``, 'You must select a folder in the browser bookmarks. This selection is required.', 5000, false, 'bottom', 'right', true);
                            }
                            if (elementsArray.length === 1 && elementsArray[0].id === 'synchronizeVisualStatusExtensionFolder') {
                                showMessageToastify('error', ``, 'You must select a folder in the extension bookmarks. This selection is required.', 5000, false, 'bottom', 'right', true);
                            }
                            if (elementsArray.length === 2) {
                                showMessageToastify('error', ``, 'You must select a folder in both the browser and the extension bookmarks. Both selections are required.', 5000, false, 'bottom', 'right', true);
                            }
                            if (elementsArray.length === 0 && synchronizeStatus) {
                                synchronizeStatus = false;
                                editingMainUserSettings.main.synchronizationToBrowser.browserFolderId = '';
                                editingMainUserSettings.main.synchronizationToBrowser.extensionFolderId = '';
                                synchronizeApplyButtonEl.style.display = 'none';
                                setFoldersNameAndButtons();
                                // browser.runtime.sendMessage(message)
                                //     .then(response => {
                                //         if (response) {
                                //             showMessageToastify('success', ``, 'Synchronization has been successfully turned off. Your folders will no longer sync automatically.', 5000, false, 'bottom', 'right', true);
                                //         } else {
                                //             showMessageToastify('error', ``, 'Failed to turn off synchronization. Please try again or check your settings.', 5000, false, 'bottom', 'right', true);
                                //         }
                                //     })
                                //     .catch(error => {
                                //         console.error("Error sending message:", error);
                                //     });
                            } else if (elementsArray.length === 0 && !synchronizeStatus) {
                                synchronizeStatus = true;
                                synchronizeApplyButtonEl.style.display = 'flex';
                            }
                            editingMainUserSettings.main.synchronizationToBrowser.status = synchronizeStatus;
                            creationOfSynchronizeVisualStatus();
                        }

                        const changeTypeBrowserToExtension = () => {
                            if (synchronizeStatus) {
                                synchronizeApplyButtonEl.style.display = 'flex';
                            }
                            synchronizeTypeBrowserToExtensionEl.checked = true;
                            synchronizeDirection.browserToExtension = true;
                            synchronizeDirection.bothDirections = false;
                            synchronizeDirection.extensionToBrowser = false;
                            setDefaultValuesToTypeInput();
                            creationOfSynchronizeVisualStatus();
                        }

                        const changeTypeBothDirections = () => {
                            if (synchronizeStatus) {
                                synchronizeApplyButtonEl.style.display = 'flex';
                            }
                            synchronizeTypeBothDirectionsEl.checked = true;
                            synchronizeDirection.bothDirections = true;
                            synchronizeDirection.browserToExtension = false;
                            synchronizeDirection.extensionToBrowser = false;
                            setDefaultValuesToTypeInput();
                            creationOfSynchronizeVisualStatus();
                        }

                        const changeTypeExtensionToBrowser = () => {
                            if (synchronizeStatus) {
                                synchronizeApplyButtonEl.style.display = 'flex';
                            }
                            synchronizeTypeExtensionToBrowserEl.checked = true;
                            synchronizeDirection.extensionToBrowser = true;
                            synchronizeDirection.browserToExtension = false;
                            synchronizeDirection.bothDirections = false;
                            setDefaultValuesToTypeInput();
                            creationOfSynchronizeVisualStatus();
                        }

                        const changeBrowserFolder = () => {
                            showFolderSelection = true;
                            creationOfSynchronizeVisualStatus();
                            hideHowSynchronizeVisualStatusContainer();
                            treeFolderType = 'browser';
                            createFolderTree(treeFolderType);
                        }

                        const changeExtensionFoler = () => {
                            showFolderSelection = true;
                            creationOfSynchronizeVisualStatus();
                            hideHowSynchronizeVisualStatusContainer();
                            treeFolderType = 'extension';
                            createFolderTree(treeFolderType);
                        }

                        const deleteBrowserFolder = () => {
                            editingMainUserSettings.main.synchronizationToBrowser.browserFolderId = '';
                            setDefaultValuesToInputStatus();
                            setFoldersNameAndButtons();
                            creationOfSynchronizeVisualStatus();
                        }

                        const deleteExtensionFoler = () => {
                            editingMainUserSettings.main.synchronizationToBrowser.extensionFolderId = '';
                            setDefaultValuesToInputStatus();
                            setFoldersNameAndButtons();
                            creationOfSynchronizeVisualStatus();
                        }

                        const cancelFolderName = () => {
                            if (!showFolderSelection) return;
                            showFolderSelection = false;
                            selectedFolderId = '';
                            creationOfSynchronizeVisualStatus();
                            hideHowSynchronizeVisualStatusContainer();
                            if (!browser.bookmarks.onCreated.hasListener(browserBookmarkHasChanged)) return;
                            browser.bookmarks.onCreated.removeListener(browserBookmarkHasChanged);
                            browser.bookmarks.onChanged.removeListener(browserBookmarkHasChanged);
                            browser.bookmarks.onRemoved.removeListener(browserBookmarkHasChanged);
                            browser.bookmarks.onMoved.removeListener(browserBookmarkHasChanged);
                        }

                        const applyFolderName = () => {
                            if (selectedFolderId.length === 0) {
                                showMessageToastify('info', ``, `Currently, you haven't selected a folder. Please choose a folder to start syncing`, 5000, false, 'bottom', 'right', true);
                                return;
                            }
                            if (forbiddenBookmarkIdArray.includes(selectedFolderId)) {
                                selectedFolderId = '';
                                setCheckerToFolderTree();
                                showMessageToastify('error', ``, 'The selected folder is not permitted. Please choose another folder.', 5000, false, 'bottom', 'right', true);
                                return;
                            }
                            if (treeFolderType === 'browser') {
                                editingMainUserSettings.main.synchronizationToBrowser.browserFolderId = selectedFolderId;
                            } else if (treeFolderType === 'extension') {
                                editingMainUserSettings.main.synchronizationToBrowser.extensionFolderId = selectedFolderId;
                            }
                            setFoldersNameAndButtons();
                            cancelFolderName();
                        }

                        const applySynchronize = async () => {
                            const synchronizeVisualStatusBrowserFolderEl = document.getElementById('synchronizeVisualStatusBrowserFolder');
                            const synchronizeVisualStatusExtensionFolderEl = document.getElementById('synchronizeVisualStatusExtensionFolder');
                            const userSyncSettings = editingMainUserSettings.main.synchronizationToBrowser;
                            const elementsArray = [];
                            const message = { sync: { update: true, firstSync: true } };

                            const isAnyValueTrue = (statusObject) => {
                                return Object.values(statusObject).some(value => value === true);
                            };

                            if (synchronizeStatus && userSyncSettings.browserFolderId.length > 0 && userSyncSettings.extensionFolderId.length > 0 && isAnyValueTrue(userSyncSettings.synchronizeDirection)) {
                                editingMainUserSettings.main.synchronizationToBrowser.status = true;
                                userActiveProfile.mainUserSettings.main.synchronizationToBrowser = userSyncSettings;
                                await manageUserProfiles('save');

                                browser.runtime.sendMessage(message)
                                    .then(response => {
                                        if (response) {
                                            synchronizeApplyButtonEl.style.display = 'none';
                                            showMessageToastify('success', ``, 'Your folders have been successfully synchronized! Synchronization will continue automatically until you choose to turn it off.', 5000, false, 'bottom', 'right', true);
                                        } else {
                                            showMessageToastify('error', ``, 'Synchronization failed. Please check your folder settings and try again.', 5000, false, 'bottom', 'right', true);
                                        }
                                    })
                                    .catch(error => {
                                        console.error("Error sending message:", error);
                                    });
                            }
                            if (!userSyncSettings.status) {
                                const synchronizeStatusContainerEl = document.getElementById('synchronizeStatusContainer');
                                elementsArray.push(synchronizeStatusContainerEl);
                            }
                            if (editingMainUserSettings.main.synchronizationToBrowser.browserFolderId.length === 0) {
                                elementsArray.push(synchronizeVisualStatusBrowserFolderEl);
                            }
                            if (editingMainUserSettings.main.synchronizationToBrowser.extensionFolderId.length === 0) {
                                elementsArray.push(synchronizeVisualStatusExtensionFolderEl);
                            }
                            if (elementsArray.length > 0) {
                                elementsArray.forEach((element, index) => {
                                    gsap.fromTo(element, .3, {
                                        x: -1,
                                    }, {
                                        x: 1,
                                        repeat: 3,
                                        delay: index * 0.1,
                                        backgroundColor: editingMainUserSettings.windows.button.danger.backgroundColor,
                                        yoyo: true,
                                        ease: Quad.easeInOut,
                                        onComplete: () => {
                                            gsap.set(element, { clearProps: 'all' });
                                            gsap.killTweensOf(element);
                                            element.style.backgroundColor = colorPalette[1];
                                        }
                                    });
                                });
                            }
                            let messageToToastify = '';
                            if (elementsArray.length === 1 && elementsArray[0].id === 'synchronizeStatusContainer') {
                                messageToToastify = `You must change synchronization to 'On.' This selection is required.`;
                            }
                            if (elementsArray.length === 1 && elementsArray[0].id === 'synchronizeVisualStatusBrowserFolder') {
                                messageToToastify = `You must select a folder in the browser bookmarks. This selection is required.`;
                            }
                            if (elementsArray.length === 1 && elementsArray[0].id === 'synchronizeVisualStatusExtensionFolder') {
                                messageToToastify = `You must select a folder in the extension bookmarks. This selection is required.`;
                            }
                            if (elementsArray.length > 1) {
                                let idArray = [];
                                elementsArray.forEach(element => { idArray.push(element.id) });
                                if (idArray.includes('synchronizeStatusContainer') && idArray.includes('synchronizeVisualStatusBrowserFolder')) {
                                    messageToToastify = `You must select a folder in the browser bookmarks and change synchronization to 'On.' This selection is required.`;
                                }
                                if (idArray.includes('synchronizeStatusContainer') && idArray.includes('synchronizeVisualStatusExtensionFolder')) {
                                    messageToToastify = `You must select a folder in the extension bookmarks and change synchronization to 'On.' This selection is required.`;
                                }
                                if (idArray.includes('synchronizeVisualStatusExtensionFolder') && idArray.includes('synchronizeVisualStatusBrowserFolder')) {
                                    messageToToastify = 'You must select a folder in both the browser and the extension bookmarks. Both selections are required.';
                                }
                            }
                            if (messageToToastify.length !== 0 && elementsArray.length !== 0) {
                                showMessageToastify('error', ``, messageToToastify, 5000, false, 'bottom', 'right', true);
                            }
                        }

                        const applySynchronizeMouseEnter = () => {
                            synchronizeApplyButtonEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                        }

                        const applySynchronizeMouseLeave = () => {
                            synchronizeApplyButtonEl.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        }

                        const deleteButtonMouseEnter = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.danger.hoverBackgroundColor;
                        }

                        const deleteButtonMouseLeave = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.danger.backgroundColor;
                        }

                        const editButtonMouseEnter = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                        }

                        const editButtonMouseLeave = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        }

                        const applyFolderNameMouseEnter = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.hoverBackgroundColor;
                        }

                        const applyFolderNameMouseLeave = (el) => {
                            el.target.style.backgroundColor = editingMainUserSettings.windows.button.primary.backgroundColor;
                        }

                        synchronizeStatusInputEl.addEventListener('change', changeSynchronizeStatus);
                        synchronizeTypeBrowserToExtensionEl.addEventListener('change', changeTypeBrowserToExtension);
                        synchronizeTypeBothDirectionsEl.addEventListener('change', changeTypeBothDirections);
                        synchronizeTypeExtensionToBrowserEl.addEventListener('change', changeTypeExtensionToBrowser);
                        synchronizeVisualStatusBrowserFolderIconEl.addEventListener('click', changeBrowserFolder);
                        browserFolderEditButtonEl.addEventListener('click', changeBrowserFolder);
                        browserFolderEditButtonEl.addEventListener('mouseenter', editButtonMouseEnter);
                        browserFolderEditButtonEl.addEventListener('mouseleave', editButtonMouseLeave);
                        browserFolderDeleteButtonEl.addEventListener('click', deleteBrowserFolder);
                        browserFolderDeleteButtonEl.addEventListener('mouseenter', deleteButtonMouseEnter);
                        browserFolderDeleteButtonEl.addEventListener('mouseleave', deleteButtonMouseLeave);
                        synchronizeVisualStatusExtensionFolderIconEl.addEventListener('click', changeExtensionFoler);
                        extensionFolderEditButtonEl.addEventListener('click', changeExtensionFoler);
                        extensionFolderEditButtonEl.addEventListener('mouseenter', editButtonMouseEnter);
                        extensionFolderEditButtonEl.addEventListener('mouseleave', editButtonMouseLeave);
                        extensionFolderDeleteButtonEl.addEventListener('click', deleteExtensionFoler);
                        extensionFolderDeleteButtonEl.addEventListener('mouseenter', deleteButtonMouseEnter);
                        extensionFolderDeleteButtonEl.addEventListener('mouseleave', deleteButtonMouseLeave);
                        folderCancelButtonEL.addEventListener('click', cancelFolderName);
                        folderCancelButtonEL.addEventListener('mouseenter', deleteButtonMouseEnter);
                        folderCancelButtonEL.addEventListener('mouseleave', deleteButtonMouseLeave);
                        folderApplyButtonEL.addEventListener('click', applyFolderName);
                        folderApplyButtonEL.addEventListener('mouseenter', applyFolderNameMouseEnter);
                        folderApplyButtonEL.addEventListener('mouseleave', applyFolderNameMouseLeave);
                        synchronizeApplyButtonEl.addEventListener('click', applySynchronize);
                        synchronizeApplyButtonEl.addEventListener('mouseenter', applySynchronizeMouseEnter);
                        synchronizeApplyButtonEl.addEventListener('mouseleave', applySynchronizeMouseLeave);
                    }
                    addEventListenersToSynchronizeBrowserBookmarksWindow();
                    break;
                case 'aboutInfo':
                    const createBubbleHtml = (number) => {
                        let bubbleHtml = '';
                        for (let i = 0; i < number; i++) {
                            bubbleHtml += `<div class="steam" id="steam${i}"> </div>`;
                        }
                        return bubbleHtml;
                    }

                    const firefoxIcon = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" fill="currentColor" id="firefoxIcon" class="bi bi-browser-firefox" viewBox="0 0 16 16">
                            <path d="M13.384 3.408c.535.276 1.22 1.152 1.556 1.963a8 8 0 0 1 .503 3.897l-.009.077-.026.224A7.758 7.758 0 0 1 .006 8.257v-.04q.025-.545.114-1.082c.01-.074.075-.42.09-.489l.01-.051a6.6 6.6 0 0 1 1.041-2.35q.327-.465.725-.87.35-.358.758-.65a1.5 1.5 0 0 1 .26-.137c-.018.268-.04 1.553.268 1.943h.003a5.7 5.7 0 0 1 1.868-1.443 3.6 3.6 0 0 0 .021 1.896q.105.07.2.152c.107.09.226.207.454.433l.068.066.009.009a2 2 0 0 0 .213.18c.383.287.943.563 1.306.741.201.1.342.168.359.193l.004.008c-.012.193-.695.858-.933.858-2.206 0-2.564 1.335-2.564 1.335.087.997.714 1.839 1.517 2.357a4 4 0 0 0 .439.241q.114.05.228.094c.325.115.665.18 1.01.194 3.043.143 4.155-2.804 3.129-4.745v-.001a3 3 0 0 0-.731-.9 3 3 0 0 0-.571-.37l-.003-.002a2.68 2.68 0 0 1 1.87.454 3.92 3.92 0 0 0-3.396-1.983q-.116.001-.23.01l-.042.003V4.31h-.002a4 4 0 0 0-.8.14 7 7 0 0 0-.333-.314 2 2 0 0 0-.2-.152 4 4 0 0 1-.088-.383 5 5 0 0 1 1.352-.289l.05-.003c.052-.004.125-.01.205-.012C7.996 2.212 8.733.843 10.17.002l-.003.005.003-.001.002-.002h.002l.002-.002h.015a.02.02 0 0 1 .012.007 2.4 2.4 0 0 0 .206.48q.09.153.183.297c.49.774 1.023 1.379 1.543 1.968.771.874 1.512 1.715 2.036 3.02l-.001-.013a8 8 0 0 0-.786-2.353"/>
                        </svg>
                    `;
                    const firefoxMessageIcon = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" id="firefoxMessageIcon" fill="currentColor" viewBox="0 -960 960 960">
                            <path d="m363-390 117-71 117 71-31-133 104-90-137-11-53-126-53 126-137 11 104 90zM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240zm126-240h594v-480H160v525zm-46 0v-480z"/>
                        </svg>
                    `;
                    const twitterIcon = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" fill="currentColor" id="twitterIcon" class="bi bi-twitter" viewBox="0 0 16 16">
                            <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334q.002-.211-.006-.422A6.7 6.7 0 0 0 16 3.542a6.7 6.7 0 0 1-1.889.518 3.3 3.3 0 0 0 1.447-1.817 6.5 6.5 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.32 9.32 0 0 1-6.767-3.429 3.29 3.29 0 0 0 1.018 4.382A3.3 3.3 0 0 1 .64 6.575v.045a3.29 3.29 0 0 0 2.632 3.218 3.2 3.2 0 0 1-.865.115 3 3 0 0 1-.614-.057 3.28 3.28 0 0 0 3.067 2.277A6.6 6.6 0 0 1 .78 13.58a6 6 0 0 1-.78-.045A9.34 9.34 0 0 0 5.026 15"/>
                        </svg>
                    `;
                    const twitterIconX = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" fill="currentColor" id="twitterIconX" class="bi bi-twitter-x" viewBox="0 0 16 16">
                            <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"/>
                        </svg>
                    `;
                    const githubIcon = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" id="githubIcon" fill="currentColor" class="bi bi-github" viewBox="0 0 16 16">
                            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/>
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" id="githubIconBraces" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"/><path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>
                        </svg>
                        <div id="githubIconMessage">Suggest Idea</div>
                    `;
                    const buyMeACoffeeIcon = `
                        ${createBubbleHtml(randomIntFromInterval(6, 14))}
                        <svg width="24" height="39" id="buyMeACoffeeSvg" viewBox="0 0 884 1279" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M791.109 297.518L790.231 297.002L788.201 296.383C789.018 297.072 790.04 297.472 791.109 297.518V297.518Z" fill="currentColor"/>
                            <path d="M803.896 388.891L802.916 389.166L803.896 388.891Z" fill="currentColor"/>
                            <path d="M791.484 297.377C791.359 297.361 791.237 297.332 791.118 297.29C791.111 297.371 791.111 297.453 791.118 297.534C791.252 297.516 791.379 297.462 791.484 297.377V297.377Z" fill="currentColor"/>
                            <path d="M791.113 297.529H791.244V297.447L791.113 297.529Z" fill="currentColor"/>
                            <path d="M803.111 388.726L804.591 387.883L805.142 387.573L805.641 387.04C804.702 387.444 803.846 388.016 803.111 388.726V388.726Z" fill="currentColor"/>
                            <path d="M793.669 299.515L792.223 298.138L791.243 297.605C791.77 298.535 792.641 299.221 793.669 299.515V299.515Z" fill="currentColor"/>
                            <path d="M430.019 1186.18C428.864 1186.68 427.852 1187.46 427.076 1188.45L427.988 1187.87C428.608 1187.3 429.485 1186.63 430.019 1186.18Z" fill="currentColor"/>
                            <path d="M641.187 1144.63C641.187 1143.33 640.551 1143.57 640.705 1148.21C640.705 1147.84 640.86 1147.46 640.929 1147.1C641.015 1146.27 641.084 1145.46 641.187 1144.63Z" fill="currentColor"/>
                            <path d="M619.284 1186.18C618.129 1186.68 617.118 1187.46 616.342 1188.45L617.254 1187.87C617.873 1187.3 618.751 1186.63 619.284 1186.18Z" fill="currentColor"/>
                            <path d="M281.304 1196.06C280.427 1195.3 279.354 1194.8 278.207 1194.61C279.136 1195.06 280.065 1195.51 280.684 1195.85L281.304 1196.06Z" fill="currentColor"/>
                            <path d="M247.841 1164.01C247.704 1162.66 247.288 1161.35 246.619 1160.16C247.093 1161.39 247.489 1162.66 247.806 1163.94L247.841 1164.01Z" fill="currentColor"/>
                            <path class="cls-1" d="M472.623 590.836C426.682 610.503 374.546 632.802 306.976 632.802C278.71 632.746 250.58 628.868 223.353 621.274L270.086 1101.08C271.74 1121.13 280.876 1139.83 295.679 1153.46C310.482 1167.09 329.87 1174.65 349.992 1174.65C349.992 1174.65 416.254 1178.09 438.365 1178.09C462.161 1178.09 533.516 1174.65 533.516 1174.65C553.636 1174.65 573.019 1167.08 587.819 1153.45C602.619 1139.82 611.752 1121.13 613.406 1101.08L663.459 570.876C641.091 563.237 618.516 558.161 593.068 558.161C549.054 558.144 513.591 573.303 472.623 590.836Z" fill="#FFDD00"/>
                            <path d="M78.6885 386.132L79.4799 386.872L79.9962 387.182C79.5987 386.787 79.1603 386.435 78.6885 386.132V386.132Z" fill="currentColor"/>
                            <path d="M879.567 341.849L872.53 306.352C866.215 274.503 851.882 244.409 819.19 232.898C808.711 229.215 796.821 227.633 788.786 220.01C780.751 212.388 778.376 200.55 776.518 189.572C773.076 169.423 769.842 149.257 766.314 129.143C763.269 111.85 760.86 92.4243 752.928 76.56C742.604 55.2584 721.182 42.8009 699.88 34.559C688.965 30.4844 677.826 27.0375 666.517 24.2352C613.297 10.1947 557.342 5.03277 502.591 2.09047C436.875 -1.53577 370.983 -0.443234 305.422 5.35968C256.625 9.79894 205.229 15.1674 158.858 32.0469C141.91 38.224 124.445 45.6399 111.558 58.7341C95.7448 74.8221 90.5829 99.7026 102.128 119.765C110.336 134.012 124.239 144.078 138.985 150.737C158.192 159.317 178.251 165.846 198.829 170.215C256.126 182.879 315.471 187.851 374.007 189.968C438.887 192.586 503.87 190.464 568.44 183.618C584.408 181.863 600.347 179.758 616.257 177.304C634.995 174.43 647.022 149.928 641.499 132.859C634.891 112.453 617.134 104.538 597.055 107.618C594.095 108.082 591.153 108.512 588.193 108.942L586.06 109.252C579.257 110.113 572.455 110.915 565.653 111.661C551.601 113.175 537.515 114.414 523.394 115.378C491.768 117.58 460.057 118.595 428.363 118.647C397.219 118.647 366.058 117.769 334.983 115.722C320.805 114.793 306.661 113.611 292.552 112.177C286.134 111.506 279.733 110.801 273.333 110.009L267.241 109.235L265.917 109.046L259.602 108.134C246.697 106.189 233.792 103.953 221.025 101.251C219.737 100.965 218.584 100.249 217.758 99.2193C216.932 98.1901 216.482 96.9099 216.482 95.5903C216.482 94.2706 216.932 92.9904 217.758 91.9612C218.584 90.9319 219.737 90.2152 221.025 89.9293H221.266C232.33 87.5721 243.479 85.5589 254.663 83.8038C258.392 83.2188 262.131 82.6453 265.882 82.0832H265.985C272.988 81.6186 280.026 80.3625 286.994 79.5366C347.624 73.2302 408.614 71.0801 469.538 73.1014C499.115 73.9618 528.676 75.6996 558.116 78.6935C564.448 79.3474 570.746 80.0357 577.043 80.8099C579.452 81.1025 581.878 81.4465 584.305 81.7391L589.191 82.4445C603.438 84.5667 617.61 87.1419 631.708 90.1703C652.597 94.7128 679.422 96.1925 688.713 119.077C691.673 126.338 693.015 134.408 694.649 142.03L696.731 151.752C696.786 151.926 696.826 152.105 696.852 152.285C701.773 175.227 706.7 198.169 711.632 221.111C711.994 222.806 712.002 224.557 711.657 226.255C711.312 227.954 710.621 229.562 709.626 230.982C708.632 232.401 707.355 233.6 705.877 234.504C704.398 235.408 702.75 235.997 701.033 236.236H700.895L697.884 236.649L694.908 237.044C685.478 238.272 676.038 239.419 666.586 240.486C647.968 242.608 629.322 244.443 610.648 245.992C573.539 249.077 536.356 251.102 499.098 252.066C480.114 252.57 461.135 252.806 442.162 252.771C366.643 252.712 291.189 248.322 216.173 239.625C208.051 238.662 199.93 237.629 191.808 236.58C198.106 237.389 187.231 235.96 185.029 235.651C179.867 234.928 174.705 234.177 169.543 233.397C152.216 230.798 134.993 227.598 117.7 224.793C96.7944 221.352 76.8005 223.073 57.8906 233.397C42.3685 241.891 29.8055 254.916 21.8776 270.735C13.7217 287.597 11.2956 305.956 7.64786 324.075C4.00009 342.193 -1.67805 361.688 0.472751 380.288C5.10128 420.431 33.165 453.054 73.5313 460.35C111.506 467.232 149.687 472.807 187.971 477.556C338.361 495.975 490.294 498.178 641.155 484.129C653.44 482.982 665.708 481.732 677.959 480.378C681.786 479.958 685.658 480.398 689.292 481.668C692.926 482.938 696.23 485.005 698.962 487.717C701.694 490.429 703.784 493.718 705.08 497.342C706.377 500.967 706.846 504.836 706.453 508.665L702.633 545.797C694.936 620.828 687.239 695.854 679.542 770.874C671.513 849.657 663.431 928.434 655.298 1007.2C653.004 1029.39 650.71 1051.57 648.416 1073.74C646.213 1095.58 645.904 1118.1 641.757 1139.68C635.218 1173.61 612.248 1194.45 578.73 1202.07C548.022 1209.06 516.652 1212.73 485.161 1213.01C450.249 1213.2 415.355 1211.65 380.443 1211.84C343.173 1212.05 297.525 1208.61 268.756 1180.87C243.479 1156.51 239.986 1118.36 236.545 1085.37C231.957 1041.7 227.409 998.039 222.9 954.381L197.607 711.615L181.244 554.538C180.968 551.94 180.693 549.376 180.435 546.76C178.473 528.023 165.207 509.681 144.301 510.627C126.407 511.418 106.069 526.629 108.168 546.76L120.298 663.214L145.385 904.104C152.532 972.528 159.661 1040.96 166.773 1109.41C168.15 1122.52 169.44 1135.67 170.885 1148.78C178.749 1220.43 233.465 1259.04 301.224 1269.91C340.799 1276.28 381.337 1277.59 421.497 1278.24C472.979 1279.07 524.977 1281.05 575.615 1271.72C650.653 1257.95 706.952 1207.85 714.987 1130.13C717.282 1107.69 719.576 1085.25 721.87 1062.8C729.498 988.559 737.115 914.313 744.72 840.061L769.601 597.451L781.009 486.263C781.577 480.749 783.905 475.565 787.649 471.478C791.392 467.391 796.352 464.617 801.794 463.567C823.25 459.386 843.761 452.245 859.023 435.916C883.318 409.918 888.153 376.021 879.567 341.849ZM72.4301 365.835C72.757 365.68 72.1548 368.484 71.8967 369.792C71.8451 367.813 71.9483 366.058 72.4301 365.835ZM74.5121 381.94C74.6842 381.819 75.2003 382.508 75.7337 383.334C74.925 382.576 74.4089 382.009 74.4949 381.94H74.5121ZM76.5597 384.641C77.2996 385.897 77.6953 386.689 76.5597 384.641V384.641ZM80.672 387.979H80.7752C80.7752 388.1 80.9645 388.22 81.0333 388.341C80.9192 388.208 80.7925 388.087 80.6548 387.979H80.672ZM800.796 382.989C793.088 390.319 781.473 393.726 769.996 395.43C641.292 414.529 510.713 424.199 380.597 419.932C287.476 416.749 195.336 406.407 103.144 393.382C94.1102 392.109 84.3197 390.457 78.1082 383.798C66.4078 371.237 72.1548 345.944 75.2003 330.768C77.9878 316.865 83.3218 298.334 99.8572 296.355C125.667 293.327 155.64 304.218 181.175 308.09C211.917 312.781 242.774 316.538 273.745 319.36C405.925 331.405 540.325 329.529 671.92 311.91C695.905 308.686 719.805 304.941 743.619 300.674C764.835 296.871 788.356 289.731 801.175 311.703C809.967 326.673 811.137 346.701 809.778 363.615C809.359 370.984 806.139 377.915 800.779 382.989H800.796Z" fill="currentColor"/>
                        </svg>
                        <div id="buyMeACoffeeIconMessage">Support Project</div>
                    `;

                    settingsWindowRightSectionHtml = `
                        <div id="infoMainSection">
                            <div id="infoWelcomeSection">
                                <h2>Welcome to Bookmark Manager Pro!</h2>
                                <p>A user-friendly extension for managing bookmarks efficiently, resembling an OS file manager.</p>
                            </div>
                            <div id="infoUserBenefitsSection">
                                <h3>User Benefits</h3>
                                <p>Operates offline for privacy and security, using a secure JavaScript library for data storage.</p>
                            </div>
                            <div id="infoPrivacyAndSecuritySection">
                                <h3>Privacy and Security</h3>
                                <p>No data collection; all operations are offline, ensuring secure storage of bookmarks.</p>
                            </div>
                            <div id="infoSupportAndFeedbackSection">
                                <h3>Support and Feedback</h3>
                                <p>Feedback is welcome; visit our GitHub page for support.</p>
                            </div>
                            <div id="infoFuturePlansSection">
                                <h3>Future Plans</h3>
                                <p>Upcoming features include online profile synchronization and auto-backup options for popular storage services.</p>
                            </div>
                            <div id="infoSupportTheProjectSection">
                                <h3>Support the Project</h3>
                                <p>Consider supporting development through options at the bottom of the page.</p>
                            </div>
                            <div id="infoThankYouSection">
                                <h3>Thank You!</h3>
                                <p>We appreciate your choice of Bookmark Manager Pro!</p>
                            </div>
                            <div id="shareIcons">
                                <button id="shareFirefox">
                                    <div id="shareFirefoxIcon"></div>
                                    <div id="shareFirefoxMessageIcon"></div>
                                    <div id="firefoxMessage">Reviews Here</div>
                                </button>
                                <button id="shareTwitter">
                                    <div id="twitterIconSvg"></div>
                                    <div id="twitterIconMessage">Share Tweet</div>
                                </button>
                                <button id="shareGitHub"></button>
                                <button id="shareBuyMeACoffee"></button>
                            </div>
                        </div>
                    `;
                    settingsWindowRightSectionEl.innerHTML = settingsWindowRightSectionHtml;

                    const addIconsToButtons = () => {
                        const shareFirefoxIconEl = document.getElementById('shareFirefoxIcon');
                        const twitterIconSvgEl = document.getElementById('twitterIconSvg');
                        const shareFirefoxMessageIconEl = document.getElementById('shareFirefoxMessageIcon');
                        const shareGitHubButton = document.getElementById('shareGitHub');
                        const shareBuyMeACoffeeButton = document.getElementById('shareBuyMeACoffee');

                        twitterIconSvgEl.innerHTML = twitterIcon;
                        shareFirefoxIconEl.innerHTML = firefoxIcon;
                        shareFirefoxMessageIconEl.innerHTML = firefoxMessageIcon;
                        shareGitHubButton.innerHTML = githubIcon;
                        shareBuyMeACoffeeButton.innerHTML = buyMeACoffeeIcon;
                    }
                    addIconsToButtons();

                    const getAllSavedUrls = (type) => {
                        switch (type) {
                            case 'firefox':
                                return 'https://addons.mozilla.org/en-US/firefox/addon/bookmark-manager-pro/';
                            case 'twitter':
                                const twitterMessages = [
                                    "🌟 Just started using Bookmark Manager Pro! It's an amazing offline bookmark manager that keeps my data secure. Highly recommend! #BookmarkManagerPro #Privacy",
                                    "📚 Tired of messy bookmarks? Check out Bookmark Manager Pro! A user-friendly extension that organizes everything perfectly. #BookmarkManagerPro #Productivity",
                                    "🔒 Love the privacy features of Bookmark Manager Pro! No data collection and works offline. Perfect for secure browsing! #BookmarkManagerPro #PrivacyFirst",
                                    "✨ If you want a simple and effective way to manage your bookmarks, try Bookmark Manager Pro! It's a game changer! #BookmarkManagerPro #BrowserExtension",
                                    "🚀 Just discovered Bookmark Manager Pro! It makes managing bookmarks so easy and secure. Give it a try! #BookmarkManagerPro #Tech",
                                    "💡 Bookmark Manager Pro is a must-have for anyone who values organization and privacy in their browsing experience! #BookmarkManagerPro #Efficiency",
                                    "🛡️ Keep your bookmarks safe and organized with Bookmark Manager Pro! Offline functionality means your data stays private. #BookmarkManagerPro #SecureBrowsing",
                                    "👍 Loving Bookmark Manager Pro! It's like a file manager for your bookmarks. So intuitive and easy to use! #BookmarkManagerPro #UserFriendly"
                                ];
                                const randomMessage = twitterMessages[randomIntFromInterval(0, twitterMessages.length - 1)];
                                return `https://twitter.com/intent/tweet?text=${encodeURIComponent(randomMessage)}`;
                            case 'github':
                                return 'https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro';
                            case 'buymeacoffee':
                                return 'https://buymeacoffee.com/yuradeveloper';
                            default:
                                return false;
                        }
                    }

                    const copyTextToClipboard = (text) => {
                        navigator.clipboard.writeText(text).then(() => {
                            showMessageToastify('info', ``, `URL copied to clipboard successfully!`, 4000, false, 'bottom', 'right', true);
                        }, () => {
                            showMessageToastify('error', ``, `Failed to copy URL. Please try again.`, 4000, false, 'bottom', 'right', true);
                        });
                    }

                    const addEventListenerToShareButtons = () => {
                        const shareFirefoxButton = document.getElementById('shareFirefox');
                        const shareTwitterButton = document.getElementById('shareTwitter');
                        const twitterIconSvgEl = document.getElementById('twitterIconSvg');
                        const shareGitHubButton = document.getElementById('shareGitHub');
                        const shareBuyMeACoffeeButton = document.getElementById('shareBuyMeACoffee');
                        const steamArrayEl = document.querySelectorAll('.steam');

                        const clickFirefoxButton = (event) => {
                            const url = getAllSavedUrls('firefox');
                            if (!url) {
                                showMessageToastify('error', ``, `Failed to get URL. Please try again.`, 4000, false, 'bottom', 'right', true);
                                return;
                            }
                            if (event.button === 0) {
                                window.open(url, '_self');
                            } else if (event.button === 1) {
                                browser.tabs.create({ url: url });
                            } else if (event.button === 2) {
                                copyTextToClipboard(url);
                            }
                        }

                        const animationMouseEnterFirefoxButton = () => {
                            const elementPosition = getElementPosition('shareFirefox', '%', 'top', 5);
                            confetti({
                                particleCount: 15,
                                angle: 60,
                                spread: 30,
                                startVelocity: 20,
                                decay: 0.85,
                                flat: false,
                                gravity: 0.65,
                                drift: 9,
                                ticks: 200,
                                position: elementPosition,
                                colors: ['#FFE900'],
                                shapes: ['star'],
                                scalar: 1.8,
                                zIndex: 100,
                                disableForReducedMotion: true
                            });
                            gsap.fromTo('#firefoxIcon', {
                                scale: 1,
                            }, {
                                scale: 1.3,
                                duration: 0.2,
                                ease: Linear.easeNone,
                                onComplete: () => {
                                    gsap.fromTo('#firefoxIcon', {
                                        scale: 1.3,
                                    }, {
                                        scale: 1,
                                        duration: 0.2,
                                        ease: Linear.easeNone,
                                        onComplete: () => {
                                        }
                                    });
                                }
                            });
                            gsap.fromTo('#firefoxMessageIcon', {
                                opacity: 0,
                                right: 0,
                                top: 0,
                            }, {
                                opacity: 1,
                                right: -30,
                                top: -25,
                                duration: .5,
                                ease: Linear.easeNone,
                                onComplete: () => {
                                }
                            });
                            gsap.to('#firefoxMessage', {
                                y: 40,
                                opacity: 1,
                                duration: 0.9,
                                ease: 'power1.inOut',
                                onComplete: () => {
                                }
                            });
                        }

                        const animationMouseLeaveFirefoxButton = () => {
                            gsap.to('#firefoxMessageIcon', {
                                opacity: 0,
                                right: 0,
                                top: 0,
                                duration: .2,
                                ease: Linear.easeNone,
                                onComplete: () => {
                                    gsap.killTweensOf('#firefoxMessageIcon'); // Stops any ongoing animations on the element.
                                    gsap.set('#firefoxMessageIcon', { clearProps: 'all' }); // Resets all properties of the element to their initial state.
                                }
                            });
                            gsap.to('#firefoxMessage', {
                                y: 0,
                                opacity: 0,
                                duration: 0.5,
                                ease: 'power1.inOut',
                                onComplete: () => {
                                    gsap.killTweensOf('#firefoxMessage'); // Stops any ongoing animations on the element.
                                    gsap.set('#firefoxMessage', { clearProps: 'all' }); // Resets all properties of the element to their initial state.
                                }
                            });
                        }

                        const clickTwitterButton = (event) => {
                            const url = getAllSavedUrls('twitter');
                            if (!url) {
                                showMessageToastify('error', ``, `Failed to get URL. Please try again.`, 4000, false, 'bottom', 'right', true);
                                return;
                            }
                            if (event.button === 0) {
                                window.open(url, '_self');
                            } else if (event.button === 1) {
                                browser.tabs.create({ url: url });
                            } else if (event.button === 2) {
                                copyTextToClipboard(url);
                            }
                        }

                        const animationMouseEnterTwitterButton = () => {
                            const twitterIconEl = document.getElementById('twitterIcon');
                            const twitterIconXEl = document.getElementById('twitterIconX');
                            const base64StrArray = [];

                            const generateAllAlphabet = () => {
                                const alphabet = `ABCDEFGHIJKLMNOPQRSTUVWXYZ`;
                                for (let i = 0; i < alphabet.length; i++) {
                                    const color = hexToRGB(getRandomColor());
                                    const letterSVG = {
                                        src: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 100 100'><text x='10' y='75' font-family='Arial' font-size='80' fill='rgb(${color})'>${alphabet[i]}</text></svg>`,
                                        width: 120,
                                        height: 120,
                                    };
                                    base64StrArray.push(letterSVG);
                                }
                            }
                            generateAllAlphabet();

                            setTimeout(() => {
                                const elementPosition = getElementPosition('shareTwitter', '%', 'top', 5);
                                confetti({
                                    particleCount: 20,
                                    angle: 100,
                                    spread: 75,
                                    startVelocity: 15,
                                    decay: 0.90,
                                    flat: false,
                                    gravity: 0.55,
                                    drift: 0.5,
                                    ticks: 200,
                                    position: elementPosition,
                                    shapes: ['image'],
                                    shapeOptions: {
                                        image: base64StrArray,
                                    },
                                    scalar: 8.4,
                                    disableForReducedMotion: true,
                                });
                            }, 100);
                            if (twitterIconEl) {
                                gsap.fromTo(twitterIconEl, {
                                    rotateZ: 0,
                                }, {
                                    rotateZ: -360,
                                    repeat: 5,
                                    duration: 0.4,
                                    ease: Linear.easeNone,
                                    onComplete: () => {
                                    }
                                });
                                gsap.fromTo(twitterIconEl, {
                                    scale: 1,
                                    opacity: 1,
                                }, {
                                    scale: 0,
                                    opacity: 0,
                                    duration: 1.8,
                                    ease: Linear.easeNone,
                                    onComplete: () => {
                                        gsap.killTweensOf(twitterIconEl); // Stops any ongoing animations on the element.
                                        gsap.set(twitterIconEl, { clearProps: 'all' }); // Resets all properties of the element to their initial state.
                                        twitterIconSvgEl.innerHTML = twitterIconX;
                                        const twitterIconXEl = document.getElementById('twitterIconX');
                                        if (twitterIconXEl) {
                                            gsap.fromTo(twitterIconXEl, {
                                                rotateY: 0,
                                            }, {
                                                rotateY: -360,
                                                repeat: 3,
                                                yoyo: true,
                                                duration: 0.5,
                                                ease: Linear.easeNone,
                                                onComplete: () => {
                                                }
                                            });
                                            gsap.fromTo(twitterIconXEl, {
                                                scale: 0,
                                                opacity: 0,
                                            }, {
                                                scale: 1.5,
                                                opacity: 1,
                                                duration: 1.8,
                                                ease: "bounce.out",
                                                onComplete: () => {
                                                    gsap.to(twitterIconXEl, {
                                                        scale: 1,
                                                        duration: .3,
                                                        ease: Linear.easeNone,
                                                        onComplete: () => {
                                                        }
                                                    });
                                                }
                                            });
                                        }
                                    }
                                });
                            }
                            if (twitterIconXEl) {
                                gsap.fromTo(twitterIconXEl, {
                                    scale: 1,
                                }, {
                                    scale: 1.3,
                                    duration: 0.2,
                                    ease: Linear.easeNone,
                                    onComplete: () => {
                                        gsap.fromTo(twitterIconXEl, {
                                            scale: 1.3,
                                        }, {
                                            scale: 1,
                                            duration: 0.2,
                                            ease: Linear.easeNone,
                                            onComplete: () => {
                                            }
                                        });
                                    }
                                });
                            }
                            gsap.to('#twitterIconMessage', {
                                y: 40,
                                opacity: 1,
                                duration: 0.9,
                                ease: 'power1.inOut',
                                onComplete: () => {
                                }
                            });
                        }

                        const animationMouseLeaveTwitterButton = () => {
                            gsap.to('#twitterIconMessage', {
                                y: 0,
                                opacity: 0,
                                duration: 0.5,
                                ease: 'power1.inOut',
                                onComplete: () => {
                                    gsap.killTweensOf('#twitterIconMessage'); // Stops any ongoing animations on the element.
                                    gsap.set('#twitterIconMessage', { clearProps: 'all' }); // Resets all properties of the element to their initial state.
                                }
                            });
                        }

                        const clickGitHubButton = (event) => {
                            const url = getAllSavedUrls('github');
                            if (!url) {
                                showMessageToastify('error', ``, `Failed to get URL. Please try again.`, 4000, false, 'bottom', 'right', true);
                                return;
                            }
                            if (event.button === 0) {
                                window.open(url, '_self');
                            } else if (event.button === 1) {
                                browser.tabs.create({ url: url });
                            } else if (event.button === 2) {
                                copyTextToClipboard(url);
                            }
                        }

                        const animationMouseEnterGitHubButton = () => {
                            const base64StrArray = [
                                {
                                    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFlElEQVR4nO1Xa2xURRQeQERUrG1ntoD4woIS8bmdu+UR6967xQooYCxBpSq7Zy4v8REV/0iqxkR8JMZfYkKMiUZC/eEzJEi6Z5YCf6j4iATUKA9jCA+x3XtLA0HWnNlH19Jaomy7Nf2SyXbPvZ39zsx3vjPD2BCGMIR+QadTNZENZniOfGhQJ+E51tpkRC5ngxFts6rLfFse9hz5AhtsSDWy4Z5jbfIdK9VhW0vZYEKqvn6E58j1RN6z5ekTkeBVbLAgVVNzke9YTUTeJODId9mg0rxjJfLI70/WBDk9S9VVjvLDodm+bb3l29ZGzw7dzIoJ7Y6c7Dvypxx52+rww9YtR6dPH+M78nnfsY6mn8kNbTNnlrJiQkc4FPRt+Xse+ZO+I+u82qqpvmPtzdaCZ1srWbGhsyZ0jedYh7rIy9MdtlxA8eyq0250ONY8VozwHLk5S55G0qlaQXGSSi6piFzIihFe7bSA51hn8op2HcVTweBIz5GdGc3vZsWK9khoUn7RZouzw66+Im9X9rLi7rby10wCO3PxuspRxoWysrozOIMVK3xHrjFEbastVV09Oi/+ZtcuyGZW1J3XtvYYohGpuh/kchILyxtZsSI5K3iD78jjpHeSVTbuReSDuV0IW8+wYsYJR05LNzM5NxujZHzbOpJJIsqKHclIaIrvyC/JRrMx37aOkZSOR4IlA8uOMcYhHhRKr+aA7wnATVzh2kBM11au2jQq+05HjTXBd6puM3+HQ/d6jtxHR43uc5UrLQXoJqHwBwEY527ijoIRL3kELxeACaF0Kj3wTF8/aIo7bDUcq7MuM4Sj28YLF2cKhQ1lgBMqFm++xMQUrqc5OeCJUrelMPeGAGB1F/lcEkmu8FsOegsN2hFaUa70J+a70q0C9B6h8CBXujP7P8LV9d1SHSaU3pt5/lhBEjBJKIwIwE856KNnJ9PbwCQH/E4o3MhBN5ZHm6/vaW7RtburWX+Atp5HcZGIYoMAvJ9WVcT0fZRkWSxhlcX0FLECLz2XuUqWt5RypX0jIzc+p+DkJzy1YzTJJLPCDSSBf3p//Mot5QEX5/embw76dTMX6D2sES8oGPHcD7rxOX+TCeABAfoLofAdrvTbNITCDzK1sU8A/pkuUu1xVz/OGlO5RscB5wqlT3PAw4HY1n66YjamhnNARQVMbnSOtXBQAK4TbmIWc1tNjwhAfF5aOriRXIkNBDhsmRyI4eIA4DIB+jkO+hUaAvBZDolYwI0741w0l/p8iBhWCsBVY6PNV7OBAlc6SivIQX8sVuDYriepYUQ64OqbBOiHhdIfUuO7LLajbMDIsvqmERVRnMrdxO0Vy7YHKCQAj+fLxMjBxHqWFQd9iByqX3mXLG8pNZ0ySzb9+TkdH7jCRaZI+9A/FagAvUFA/K6eHGvskq2CK/1aX272r8CV/rrLbbSm9n/WO0v1pADoBdk6IG0b/cd0rXCbr+uLGAe9kOavcOOh856AcY8uCewjCZ2vuSuWbQ8I0C8JwFO0SwWpEVoVrvBIN9//SgC+wQEfELH4DNOgMtbYI+q/v5C7iXHk86Zrp0knhMKTGYvdRfWVn9h5TaI8um1MxiK/6VXr1KyoPtLjAFf4Mw0B2N7L++3k/+UxfU9+YyPbpS7PCgVqOKR3AfgiV/p9rvQ2qhNDGPShPGf6gyv8hVZXKGw2p1TAV8l6TcetbxqRP68AvJUr/ZEA3Ub3hIIlQKtV+mjiSpLFf52qAhLXcsAnyRzS1ou7+uc44baO5ErfzZV+gm5kdEzmLgKdkcpdrDKutKRlIg3quKaOYno2HfwE4MsC8DOu9P6MlE4ZW3Zxfr6U+hGpYYasi/O5i2vMFRH0TgH4o1D4G0kp7TJGXrs56BajfVc/TbezcW7rxQNAeghD+F/gL76ssK8TFCCXAAAAAElFTkSuQmCC",
                                    width: 48,
                                    height: 48,
                                },
                                {
                                    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAADGUlEQVR4nO2YPWgUQRTHZ2dzM5dYaCFBAiaFNkZRBMUuiI0fRdBCwSZFolj4kWCSmRMJhyksBJVgI2qhhYIpFEREczPZmUSDSBo/kIAERWMnETQmSDRPdm89g4TczCXrXnD/8Jpr9vfb92Z25hBKkiRJEoTAQTy3GWcEd7i8i7l4hZkYx0x+x1xMYi4+YCaeOlxecrncgbJZXD5vrUNsDIC5BNNyuHiITnor40ZHKHuvCjM5ZgNfKCaHYu+Ey/p3lgQflpvJ7YpVAHPZHL7NMXRK1COeq8VcvrAYpe54BZhoy4PIa39+k13mAvJiWQgUOtAu6+w6IMtEoMRyEoGYu+SEHQBN2kBTmFVToOkzUGTfUhWAoBSdAU0Plf70jLfW4fJy+KWdWMi8lySgg/oKMl1nze52ykbM5LfFhi5BAEDRs3b0+e1w0d/4HALnzQTIqBW/w0VP1PBBMXEsEFDk9LwCfnlVq4wFMBNvohcQn1H7o+p8B+jtogKK7DGjb/VWYC5mIhaY8A+CyId/sqw6WKjFBVrNBHhuezTjIn9iJt87TF5FHXLN78eBpreKwufrjNn4ZORBy1EYwVw2oc6+muBmZhgAhEHRC4bw/k50zkyAi6Pmu4i4iY4/oKbQhZFRqQOg6LAxfH6EuJkAEy2GW2A/ynoVAdTjyhrQtAc0eQua/rAC06YC6SYjAbdT7DWZZ8T61gXwXsUW0ORTJNB6Vg2mNpn1mMn1BgJDeXiUBk3eRQ6v6CQMo5SZwP5et9hX2OHiSiCgSGPk8DqoO8gmDhPS6AyjyIl/AD/tj6mVAGbiiJFAsTPMYsAr2oysw3PL5/u/J2KBKdD0NShy3XzhzhGXid2YiemSBRSN98IehMsGf7//+16wdASKZMEjpGKW/M8EyBgMkHrQ6dWg6POlJ6BI4e9H0KSrTARoi4XAR/BSG2AwXQuavgwFuuMVCEZiAWvAo4djFTC+z869gL9YXdQjExhGVaDJDTt4Mgo63YDKKaAqtvrXPlBEh0fsifAsMw6KjoCi90GRLAxUboNe5MbNmyRJElQe+QWgfIcmva+j+wAAAABJRU5ErkJggg==",
                                    width: 48,
                                    height: 48,
                                },
                                {
                                    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAACKElEQVR4nO2WT0hVQRTGz/GZ7yEiRJJ/SsMiRaigUFwUhQgGouLChZS5Cmmj5c4kol1tRNoYLcJ0JRKUFYmUJi5EQSP/dEFxkUW4iQyUIMS+mHe5jtN7ihLeO8L54OPBmXmX+c2c+90hEolEIisFh2CTSQAcOQFIC+1GQbcM5CV2gt91SIw6we885EPm2GHarYJeMATACX7XIS3k/M+O8YZ7282xmT5CbTkjI42RGGJkHWbUVTJmX+4DgMFOQiSsx2iTkyMcHbcWYH2WkHtU18NJjILj7q9XKz7D+PPJUoCPz3U9IYEx/cKtLw4STmQzbl5jrExYfALDXbqu2uj3lJ7/64NlKRQP4MuQWa8uZXx+t9PnWQCgfPmC+eJGwozrNYz5/n0C8G2YcLYgNoFCIRdkddJyAGW1yNYGRkpyLMjpPMaPMcsBPH8fJdxvJqQfMiEar3KwACrvtwP4N+d/jlM0/7352Rk+AqgUqSphvH6kawsDJsCrDj3W/YBQeCo279tb9H+SDvgE0NNG0c+/lya36hkddwnnz5ktoe4+ar66/3i1kmLG1yG3vjxOuFSkx9TX2heAuTcaYCufPKavBg9bzZNhZhxJN68SyrcbfGyh908JqSnxF69a4e0Ts/fv3Nge+GJh/CjdMwDlpRFCUx0jJ9PNc3VNriljTD6LP3+sh3ClgpGf6+7+wVR34Y/vEdZmtkq1PQTwwyQAjpwAfG0hkUgkIj/0FxH0JVVHu8XgAAAAAElFTkSuQmCC",
                                    width: 48,
                                    height: 48,
                                },
                                {
                                    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFEUlEQVR4nO2ZXUxbZRjHn46oUQE/ksULvWBBr7xw48K4TJ1LjNmFF462zs0BMc6puC8+CgiFUhhkyeaFZm5hOYdtgA6aCWgYLkP6AaUU+R6Er8BAhgutbPJVoKX0Me+BUCk9H6Wn0Av+yZOcnNP3nN//Pc/zvG9zALa1rSDU6caXQFFngJz2JVB3OEGhr4VT1Tsh6CXHEEjSXQJ1uxPyu3FNqNuckKQvBpXmSQhKJepOQVaLbR24Z2S1zEOSPhWCRgk1ByHD/JAX3DMyzI8g8c5HWweedudVSDG2QJ6P4GuiCyGtYQDO1r6+eeCq6nBINf4CuR2ujYN7RG6nCxSGGjhT8XzgwBEloKjLgexWh2jg+Z6F3r4IKYYCUOEOceFPa+NA+ecUH0BU4SDmGK2o+2sWeycWcNaxxAQ5JufU9VbmN7xGMptnIaEm3n/wxPq3Id00xPUwSX43ystHsf+RHYWqb2IBZeWjzFhOI8qmcUg2fOA7uMr0IqQazZDXxfmAyCsDaP57DjeqxrE53HV5gNsEYUgxmkFhDBNuIN08wvea9xXdR4ttEf3VxJwTD/w0zG3iWyPCyeo+4Qby7nHe8L2SYbQ7XSiW7E4Xvlt8f/2zVM0IZ+8iKPQISVoUboADPuLHfrSKMPPe3kTklZV0yu1ESPgDIVm3DM+Ezn8DpOj8yXk+NTywoYTAEvhVcBENkG7DJ1IXGXoL7qYH8dkLPUzsoQdRabBwvrmm0Wnce6nNC7hIBsjsk/bHJU3vFIZd7GFNv/DvevBW39SaMQ8mFzDmZi9KUtjARTJAFiA+eN6+vjIRxITNsYSqu8P4dHodD7hIBsgKy5U2XDPv2dcJ9Cu5JoHgIhkgWwE2kZwXBJ/W4G6LCv3qeG/A66/5aYBrq/AGxbO/yWpGOOMG3xIDM/YlVgOhbOlzzls/d8N5ivuanwamOQysz/8uhGQ9wtEShOPlCMlaEQzoA5dCpOe79y0mhNibCDLaHR9fR/jyV9Y3AYJSyE8D2hH2Is40WBBULQhfVK4F94wjRQjxVVtjQF3P3katM3YMjyvhhv9fhH6uwTd/aPWxjeoDu5DdahxGiZwffoe8ECuaRtDlQtR0WjHyfNPmGBCylSAmwmOKWOGfiy3G8qaRNWMcThcWmB/izuyGwBogISsb4jTApNPUPGaWtmJUSiWGHivCsJgi5jirtBX/mZ5nHfd4bhFTbw9hSEAM5HYgnPwdJYevYWO/BQMlY+84Sj65gfDVb8t9328D5P9oohbhyI3VNIj4uoyZZbE1Mb2Akd9o3Cn3aQkzaRszcO7e8r7l2M9ec3l/1m20L7IvbL7KvriE72RWea+d2NLl/RNZQwTrM00FXzfZp6xCy+S8KDN/ILuau3vJCxHiNFrhBk4UPAFSSg0y2sZ1413xGjT5URPG3nEmJXkmy8awHPz+KfBZ8usvg5QqACnlZHsA6f3Si7XYOzYpGLxn7F+MvlDLA065QEZr4PC1CPBbhwqjQEbr+NJqj6ISszVtWNv1kDE0M+9gghyTc6qyNtydXCFktW4EObUXRFc0/T7I6G6hWwbfgxoAGSWHgIrUh5w+AVLKKhq4lH4MUip1Y3m+UR29/ALI6PMgoxf8AHcwNSant/ADYHTha0yxLRedL+lSA9Krm/hlhk+Hrr4FUtokALwV5PR+CE6hhClCKTW8Pl2oMaZ25JoQCHp9WPAMyCglyKihlVAy57a1LQg6/QeJ2JhT+6JnrAAAAABJRU5ErkJggg==",
                                    width: 48,
                                    height: 48,
                                },
                                {
                                    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEyklEQVR4nO2YTWzbZBzGc+DEYbbbLnXzobRpEqfrlLIuX86HknRtmnZtlvSCuHCEC9JuXNluHBFISI1hCDiwDo2KVahUZYxBk5Uytkl0IDRVoyxpRz/WspG1a5f90es1mePaTuwELUL5S88lF/+e18/75vGrUtWnPvWpz/92Mq6jvgztmL7XE5zLjcT+gpERENOTeBwWaDqbpKjZJEWdTpnN2ucOnqEdkNcy7dzIRiK/CcE/ikbhlyNHIGW1FpSkqGyKol5/7uB8Lfu9sBONFuDvRyJw9fDhIvgiI1brazUBXiSPCzb7w3A3FIIrHR2i8HsGHs51dur/O3jacapscI7SXjf8MzgIt1yukiZSVutbNQWPtBIKFmK0NTQEt71emBUzQlGpmoJHenj8+L7NvHviBKQDgX17IklR6zUFj+IjdaTm4nFYOXYMrnd15U1s1ww8Pz4gpXgc7oXDcLO7e7dm4MXiA/y3EIvBZn8/LHq9cNVme1Iz8FLx2RoaYo/W351O+PHQocIeuGg0VvYG7niODlYDnh+fHGeVOXnfpymD4YFieAgEXki77fPVMrARDsNyMAi/2u0wy1llKV1oaUkrNpCh7SerBb/aE5Jc6ZSAfjCbYZwkbyiCX/T5iAxtX6sUfMnjhI2+XjY2i36/LAPftLbCeZK8pMhAmra/W/nKu+DBwEAh96g+lAufpCj4WqdDBsZkwy+5XB0Z2rFTKXxW4Mj82WYry8DFtjaY1Ong8+bmd5Ss/mSlx+Wj4WHB4/K2x1MSfsZiYeGRzh08+KZsA5s9wZTizPs98DgWEz3v/45ESmffYHhmoKnpZdkGcvH4+rLHtSIXHn2woPO9VEX4SeIj5rLZXIBHOkuSDtkGnrbD6Jwc+LvBAAtXTs9ZoGnxjavXFxlgdLoGRQaQ0IpKgvvcsBoKwnpvL9zo6mLrMKrFpQygP7SUgIHp1tYi+K90OpANzzWAYDIepyA0t5T9yTnf0T8s6jOoJkjdQszx/om/a28vgkea0GqV9SD+auWht0SaJFp9oRVFvy8Fg7ArsC9uud3Pcm8ywSQvOnsGshUbQA1RqgKjs77UqYI+F/lvZb2v72ldsFj25T6vL0lyrSID9wcG2Iff8ftFDXDjU46u2WzsXtkeHoYrVqsoPNJ4c/Mfig2gC6f89ymKgpgBsfiU0mWLBcY1GlF41oDSIoc22Xx3d9EDhWJUTnwEa0J7O5xpaAAGx+GsWi1qQHGRW6DpHP+hQjFCv8mFn2prgw8JgoXPS8yEoiKHJkVRG/wHoy7PNyC330/o9fABD56RMKGoyKFBt8RCANwYyYnP92YzfKZWC4IzEiYUFbk9A6eFQLgxKvf0mTIa4aPGxpLwjIAJRUUOzQxFadgrbokYlYrPJZMJxkiybHBGwISiIpcfdD8vFiOp+KC4nNdoRLNersbUavhYo2lUVTLofp7/JlCMhOIzbTTCOZIUBU9g2BaDYUsJDLuZwLAZBsMmEhj2CYPjb4/i+MkEjr/K4PjwKEH4EgTR+T6GEapqDIoTuuJGt8RJq3X1us32+JrNtv2tybQzaTCsfaHVzn/a1HQhgWHvMRh2isHxNxIE8Qpz4EBfAsNeOkMQ+tGWlherAlOf+tSnPqpamn8BvPy5ZOiJW2sAAAAASUVORK5CYII=",
                                    width: 48,
                                    height: 48,
                                },
                                {
                                    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAADcUlEQVR4nO2Za0hTYRzG34roQ2lRROatC8XSiow+RDc/FV1Ms8I0L59MJXDTMi1JUkQryqJIo6Iv0YXKyggyulgRBGakFFrYxcjb5o5O5zZ11yfOe9qituqcue0sOA88H162sz2/9/z/7/vujBBJkiRJ8ltpkwKWM9umdXbHBNm6N80EXw+mBAByMjpnk0HISQ1yiMzt8MrNMwQF9ziEnFqD3SRMMACdeTfDewHipmAAoWXj5XLSCgfwQHi7tcmBo4YgYgKwNpxIBgqm/L8AqqSFsHxpAsoj/QegJ30FumNC+PfDlQrY9P3AqWjxAJicDVDGhXPj2DAMnM6DMn42v7uwcxFsJiNgNAAnV4oDoNwyC/qa81ClRnHjBBkMDy5DlRjBC2Kk4QmoDBqgdJ44JdSTGgVTayOYvZsdpWRsfgV15up/AgxUHYBDHY3Angni9ACjWA+rXktLiB335sXC2s9Aczjjr9f17ovDL7pXKF4Ta45kATYbhp7X0FLSlKUDVgv0NRfQbe+T3/sgefGvACM6YP9U8ZZR3dUKmsOiaqezqz1XRMfGlgb0pC11BkiMhJPu5ou4D8QEY+jxdS6IxQxddSV0N8/QoXVQA035Lqf+cdLnFyJvZLFhGK5/5Mhj6emA6dNbx9jw8BqU2+dxPZAf7wxgMQH5gZ4F0KdN5A/ALqfxc2BsrncOZ8/4o8QGLx11/YZjyzwLwF6kS5skCEKVIIP56/s/QsBsgqVP5fq1qnWeB3AHgq1xc1cbBKtyrXcAWAstJ1XKEpja/nInXKkswnsArIfPZ0KdFc0fYscCjLx5xi+8vhdQjPUuAAomw9rejKGnt8DkbuS5xIZg+OX9fwPo1MDBIC8DsC6ZA5umk36nRfWNrvl9xWlQZ6yiO69y61x67qcb2sVSmFqb+JdQ4w0fANghmK/wik6t8QEA68LpQEut5wFeX/URAGvFGKBaDugY9wOrPwJd7+gBkGqgy4cAdrNHgNpirhH5yGrmZvrwwp+fcSgc+PCQ+6XmcwC7c8cDZ9cDdceB1jqgv5M7KrOzq2e4Axt79i8Kdn19zjigtkREAC+bSABy6Q7AtyWUTZ/Pw0884A7AHT8IDupsckM4QA6RIZv0+UH4PshJqGAACiEnoeyfC+zzeRGCayEnt6Eg890KL0mSJEnEF/oOinNuaNeI/LUAAAAASUVORK5CYII=",
                                    width: 48,
                                    height: 48,
                                },
                                {
                                    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEB0lEQVR4nO1X+09bVRxv5g++/VX9I3z8ZEzMdOJkixsbyaZzWyCDKeIc23Q1czFbQy3QewdoWaG9Dyi05UJ7W+h75WFbOh6ltdBBr5NZNQLyyDRq/Xl8zemyYh80t49oYu4n+SYn537O93zu95zzPd8jEgkQIECAgP8PjG8bH8LFmhe7ZOZzlNyq1SlGRgdVnmkD4Z1jSR/H0hM/JIz0cagPfdN2uEcQl2geOtt2SfuCRCLZVVJRSonxiS6p+T1Nu9PKUj7O57j9163AOny/+CfEuDgvQ1w0Bo1lSS/X+6XL0iVja69d1D5esLD2C7pnadxOm+mbd8KTq/f4ionxtLnJlXum7sklGrfRaC7ewto+Nj5KyW3dDia4cnv+t5KKimUxNAeai8StlESieSSnOJVkYI++YzSwGNzMO2J+zxKUH64uWOhicGOL6RyPEE2m17OKU0rZWicTXC10Am3fCNQ3SIqOqJMJrpNyy/sp4rqk5kOOIsTFuDhImwjAW3tLsuzOgeCGutFUkRCnaNA9ZVB5vt2JrNeNwkt7KpL2clklHDlxBlrbtHBn8Y8k73T95RTeK28egcp364Fhvs7LzwMbVHmj2Kf0kyIKs16LhjZ3/Bs51gMYvh2ZpYXfYdy9ACdrPwFZC5XsLztwHMKBle3NH/kVbtjDsO9wVV5+HthCcHOLbLFgIr1yfDpXuM+cbwRGP5bRPzURgzcOnki0Azd/hP2VpzI4kdBaksPHT8bqKcemRCjP5RJYcfR04oSm98/NrsJr+99JtNEyIgHpHNtwAKpqL/L2k24sPbEkYmn/jgK5ubuwu/xo1j1CUzb44OyVRLsF6wG8tS+Do1AMwOdXr/P2k24mJDDXErtd83Cs+ty24Pm7MDv5E5CkBcreOg4uRzjRX/fRFTAZ/RnjL4ibgSKtvP1kXWK0EVGSzEZAf/fPk4eigPbaeXEzOG2hJK/8UBV8M7OcMb7yWB2M3rjF20/KIZnd2CLl1hYROsqDai+XjXS1UQlKJbvj/ozxtEL8DKo8UVSoJHIhSoroPkwn1dR9BtbhmaIF1uTpxzUQWidk5gOp97DUXG3vTxW59+DJxCkrVuDePPw4+md/UTdbarLexx2N7G799cKKhViRhhIz0zkWUX5hejVnRYNKHgqzko7+0PK/Vm71h5ZpzK5WNCgeFvEFLtY8Q2E2EiXL0MTPpY1oNA7Ip6nb/x2N24ivLjNP8xaWGVHiMZXMdKq33TVsJLyc187FIzNreZf8kek18Ni5uIHwRTXtjqFOqbEaFccFC8suVrILF/c+TzQNfXj/0eR2G9TeKQPhCaOHkqnbH0N2/9HkCaNvuo4RN43Z+tCYtks9z5X80SRAgAABAkT/Kf4G7C5iIDz5DDIAAAAASUVORK5CYII=",
                                    width: 48,
                                    height: 48,
                                },
                                {
                                    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFGElEQVR4nM2ab2xecxTHP9Wt6CYIZhNGCLNE/HvBC/bCKhGRqUYm/lQQkYj2hfmT6TYv8KbGxiqydktII/EvS4zM0BdCJWinQknYwhL/uiJZ1jJl1VVO871y/NzfvU+f5z7rTnKe3Ps85+/9nd8553eeC8XBXOABoN599yrwiruvF43RzjiYEfPcfSswCWwH6oAm3Rtep+/e1n2L4zt5phzqAkaBW3X/iTO4Fxh293b9gbvvF89tkmGyqg41wCx33+cM+sJdl4pfumuTlcAs6SocntCTXA2cqyeXZeBeoFnhciCHdlQy10jH2mo4sHmaT3iT491WAW9FcApQq+uOEhT/CrwBTAC7xH8aMASMA1t1nSdngwunBeUav8At7zvAzxFlvwNPAZcAR4j3LuCg0Gj+VCZK4GLgaWBfRKbp6gF+kwzLVNOG2pw4HwMeBU6I8N8r5fuBqyI0x0nGWIaefS4Kpg1J3g5xADivBP4LgNNLoDsH+Ciiy+pKyVCjbGN5+dkglyfYDcymeKiLJIph2WI2rc9LsbZp9mQs50YX59WCdRn6h0rRvypDwG7g2wJwJ/AW8FAky3RH9LeV8gQWTTNnV4r7gZVBaBwFfJpCe3bM6LmKsf4SKmy1sDOw6cKUCj4qG7vCBtC6ypEZMnzS4XJn0+yMomep9aRwFZoPAwcGnD23ZNDdHAulQRH8AlwL3KEi873idKXahSwjngTaA3wceL2Epu4gcKRs2SFd16sh/Es0n6XFf6sYEkHW9yTwGvA3cKbud+YYYRswBkvUJ8V4J1QPlriHkUCPo9shm+fYD/elCDIjTwXOcnVheQEO1Kl3ivG+K7o1LqSOB86IFNUVRnw08GZkOSfVRT7vzrp5DizWanm0B9GgbjTGNw5cJB0LgQ/d92mrtk22/7vje1N2+lq1wx7yHCgHx4EbU1bsMmCLQtjTvx+2M00pLYRtvDQo2oGfgKVkQ3vAY7Y2+tFHmuDVh8iBH1S0sqAtwvsy+kj78ZFD5MCk0qVt1On2Zy8mBI0pVa+jTAc2q9Qn+JyrL1n4QoquB9X87Q1oh1Sn/pPewk28pUwHTFYI1qg9lsM3lpKCOyO0vV5PvU49IdF3BTqA+vivc3gbAvrPM2i3J6n9/gyi21XAPOZNFRYFNeBYZ9T6HN6v1Ocs00w1L+ysCE+V4xa1qZNVwIedAzcVJLMPuCdpJTwMVtmBhQXIG4yE6NSQttorgI6llcpsDo2fV8WTWOjAigJkjgSj/amWulOxNVJlByy7vFSB4X2ajvwv/v2QKWSc0Ka5sgyMDbbOz+BpjXSg0UN9KWV7l5bNJnJ3arZ5OZXDFVqla4AThd9EbDDbMqE2Z7A1kdKIVQLHpIRsVgjvyZuT1qh1tR7mmcgpyPbK1e7AkdWE5UGDZPSogL2Xom9YfVmXbKupZLh7wP3NtFTf3VCBA22SkRyaFqc4YDaUBbWR5VymTLLOdZ/lzEuNJ+nBrEIb3B3JPGWN1+frXDyqp+DDKTyY79b5wf/JEXsol4rWFzTT86M7hw9rdjqi78yWsmC+835Dibn6D00TtmpI263RzIB+K0VGh3O4rH9n0mBTwQUuCy0sC4d2pbFVKnZFVuxRyWyTDtNVFfCb6WNnQDldrP9zvD+io6qwMXjVoD+Y2/iCOBwcWe21BINmreQhedUghDlBR9gSvOzR6Axu0iAqmQBar5OAyThs3l6x46l/3cZGNjZ3SsB+M5rCDP4HvLiyg8qfU0cAAAAASUVORK5CYII=",
                                    width: 48,
                                    height: 48,
                                },
                                {
                                    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAADtUlEQVR4nO2XW0hTcRzH10NURhFEQRBERFJ2Q7vSY9lDBBU6W1lWqK0sNXfRTc/OmdPptozKzKKXHoJ6KijoIWhRdDsQ9eK2M93cdFtE4ZyXTKakv/ivztzlnF1o21lwvvB5/3zOn/PwEwj48ePHLysnxJxQwkAR5oAauQuaaz1xua+4O/qzfSX4DYv+Df3CV0kHFLTZoVjFHFGMOeBinIi7igcjXnwXICbaVmVWHm2T3gb57TYoYokQqpxQVc8c0al8PErLByNaV2dOng5AbGu3s0aUYA441zAYJt+heD4+hO8Ok6f5oV2TGfnQgECEzgZHVQ7ml8CcUK4YCMhr699MDBF7GOVpxlrWgt+Qk175yADEVp0NjuBsLzEAyqYX49/jyM9FrAO/Pid98kwBiC06OxzGo1+iFP/s/0rsnklEPhihyWUKSI08WwBis84Gh4i5CBHeM2WVimddkjLwqfMTDkCMajaAX5/iL09vxTUrsEbobXCQcEAxTk1T0sqZwboKQLgkZ8BHJBcxot4Ik7ocoyDl67bA8uu9kMcSsV3XM22SiX/R8jTuurMwnMRLjDbnpvbLhwYglt2wQp4h4gUM1MzH+vNR8kEk5TCMF3AoHxKAWNI5F5Gnt86+U1yaYpUPRlSAl9jBkXxEAGLxTSog/7Kx1h9XPgQvvpPp502zPEPAvG4zPJR3TPbXVINLcjrhAMSQag94iUx9eXqh8rcscEd5Y8JUcR0Q/dVScEnLkovA9sJYxuQFAsGCLjrADFewrnFansZ2sQHc0pMJB3xTFmZOHm1JJwWLbppmW4lbY5HyNH1VTeCWncg+ebSlnRb4JK35yiZPYz2vBo9MlF3yaB9kde548nMRLeCRHYuSfyS9N6CudesFXKzvkiIh+WCEWAtf5CVBeQlm9NE3AicRpMgIvVVNSUVQYh145MIwec4iSJERAhEXCDBVXks44nLT2yh5TiLIvwEI6wU1mCriR5Sq3/pOK8NPzKiIGk9zxgNIkREosRbMlVdjyL/2BW4ElRPKlH9OTE5fgowIQFjEV8Bc2cEuT5MNESRDAAIJm88Z2OVDIk41chhBsgQgespvg0XcDgfaXvkKNf0shz7HEWSMAMT+tjfDgQNHZ4f92RhBxpLXvveFnZjZGEEmKp9MRCZ/bJJB/rjmmWt9xH0cjh32ZUsEGSF/UvN0AN0H87soWG/oY4/IlpcgGeRp/osIkkU+pRGNaYyIJZ+qCCGWxohTmieDseT/iwh+/PjxE6R7vwHpwkGS7i/bmgAAAABJRU5ErkJggg==",
                                    width: 48,
                                    height: 48,
                                },
                                {
                                    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABCUAAAOqCAYAAACrSe8RAAAACXBIWXMAAC4jAAAuIwF4pT92AAAgAElEQVR4nOzdT3JbR7YnYNwKz+VegVQTTKVagfhmPROxAtErML0C0+MemFqBqRWAGvTY5ApKjJ5h8sgVtLiBRse1EyqYligAvPee/PN9EQz1q/c6CsgLJhO/PHmyW6/XMwAAAICp/cOIAwAAABGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhBBKAAAAACGEEgAAAEAIoQQAAAAQQigBAAAAhPjOsANA2brl6sVsNnuR3sTR1pt5NZvNvt/6n/v/m+cHvtn72Wz28cF/dpX+/bT1v/u4Xsw/+UgBALvo1uu1gQKAjG2FDpuQYfvfZ5m+8putsOJTCjBu14v5bQavDQDIhFACADLRLVevtsKHzf/7ZYXP5zqFFbepsuJqh/8/AECFhBIAECAFENs/rxt/Dpug4ioFFSoqoGIPjp3NHhw923h4BO1bNpVZ27b/M9VakCGhBACMLC2+X6VFtwBiN3cpoLjs/9WnAsrQLVcPj5jNtgKHp/S1GdrmiNntgx99cWBiQgkAGFgKIY62fnJZhJfsJgUUl+vF/GHDTWBCW8HDJnw4Sv/WdNzseiusuBJWwHiEEgDwREKIyX2uolgv5peNvXeYVLdcHW31uHmVeYPdsd1vHTMTVMBAhBIAcIC0UD9OIUSNzShLcZ8qKC40zITDbVU/HG2FDwLWb7vZDir0rID9CSUAYAdpwb4JIY4b3inM2V0KKM59MYDHbVVAHAkgBrWZh670w4HdCCUA4Cu2goj+541xKkp/HvwiHfHwpYCmPaiCONJsd1Ifto6bCUvhC4QSALBFEFGd+xROqJ6gKY6YZelmKyw1H0EilACAPxfw/eL9RBBRtb564kzvCWrULVevto6XqYTIn4ACEqEEAM1Ki/iT9KNHRDvuUjhx0fpAUK5U1bVdDaEnRLk+pHDCnESThBIANGXreMapkubmCScoiuNl1XPcjCYJJQBoQrdc9Xfsn7k5gy8QTpCtFEScOJbRnOt01bF5ieoJJQCoWuoVcWoxzw6EE2RBRQRb7raqJ9wkRJWEEgBUZ2tBf+acNQfovwScrhfzS4PHlDTc5RH90Y7zVD3haAdVEUoAUI0URpymH0c0eCq3dTC6dLTsVMNd9vA+zU3CCaoglACgePpFMDJfABhct1xtbv5xtIxDmZuoglACgGJthRFvPUVGdp/OdJ8ZaA6lKoKRvE9HzvScoEhCCQCKI4wg0E1a/DvSwc665eoohRF6RTCWTc8JDTEpjlACgGKknhF9GPGjp0awd6ls2uKfr0pHNPow4qVRYiL3KTh1ixDFEEoAkD0NLMlUv/g/cUsH29z+QyZUdVEMoQQAWUs7jefCCDL2IYUTqiYaJjwlUx9SOKEZJtkSSgCQpXQG+1zZM4XoqyaO7Uq2RxhBAe7TcbNzD4scCSUAyEpqYnmuIRyF0muiEcIICnSTqro+enjkRCgBQDa65erMAp8KWPhXLh0r0zOCUv3iemNyIpQAIFw6qnFhgU9FdMCvkLmKighPyYZQAoAwqfz5wlENKvY+hROOcxSsW65epWNlr1sfC6qjaoJwQgkAQnTL1XEKJBzVoHY3qQmm7veFScFp/4Xtx9bHgqqZowgllABgUqmR5YUdRxrjdo7CdMvVaQokBKe0wJEzwgglAJiMRT7MfrDoz5ujGjTuQ+o14cgZkxFKADA6vSPgL96vF/MTQ5IXRzXgs7tU2aUJJpMQSgAwKr0j4IvsRmbErRrwRT+tF/NzQ8PYhBIAjMKuI3xT31zuSDARxzwF3+QGIUYnlABgcOlMdr/r+NLowqN0vQ+iOgJ2Zp5iVP8wvAAMqVuu+rPyVwIJ2En/e/IxBXlMpFuu+pL03wUSsJPNPHVkuBiDSgkABpHKoPuF/lsjCnu7T0c5NJYbkSoueDI3CDE4lRIAPFla6F8JJOBgfSPYKxUT40lXEqvigqf5rVuuhBIMSqUEAE/idg0YlIqJgbmSGEbhBiEGI5QA4GDdctV3rf/ZCMKgBBMDSZUnl3pHwCjcIMQghBIA7M3OI4xOMPFEqenub0W/CcjfXbqZw1zFwYQSAOylW65epJ1H57JhXIKJA6Uz73rcwDTMVTyJUAKAnW01tNQ/AqahPHoPqYpLM0uYnmCCg7l9A4CdpFLofwskYFIv060c3xv2x6XQ9FYgASE2NwgdG372JZQA4JvSVXrOZkOMl+nIFF+RQlNVXBCr//1bpt9H2JlQAoBHpbPZvxolCPU6/S7yQLoF6DeBBGTjN8EE+9BTAoAvSuXi55rFQVZ+Wi/m5x7JnzS0hKz9sF7Mhal8k1ACgL/RLA6ytlgv5k0f50hzVD8GrzN4OcDXNT9f8W1CCQD+QiAB2Wu6y705CoriVg6+SU8JAD6z2Ici9L0TLlq8kSPdsPHRHAXF2NzK8coj42uEEgD8wXV6UJT+97Sps9ppjupD0+cZvBxgd4IJHiWUAGB7sa97PZTjTbqut3rmKChesxVefJueEgCNs9iH4v2r5vPa5iioyk3qMfHJY2VDpQRAwyz2oQqXte4+mqOgOi/TdePwmVACoFEW+1CN5zUu8rvl6sQcBVV62y1Xggk+c3wDoEECCajSYr2YX9bwxrrl6mg2m/2ewUsBxvPDejFvqmEvXyaUAGhMKvO+FUhAde5ns9mr9WJ+W/IbE5pCM+5Tf4lqe+KwG8c3ABqSAgmLfajTs9KvCRVIQFOe1dwTh90JJQAasRVIvPTMoVqvS70mVCABTep74lRx7IzDOb4B0ACBBDSlL4l+UdKVewIJaN4v68X8rPVBaJVKCYA2XAgkoBlFHePolqsXAglo3s+pwS0NEkoAVK5brvovJ288Z2jKm265Os79DacqrkuBBNCHqfpLtEkoAVCxbrnqSyHfesbQpPOcF/iOlQEPPC+9WS+HEUoAVKpbrk76ckjPF5rVL/BzbnrpWBnw0Ju0fqEhGl0CVCidy/zdswVms9k/14v5bU4DkY6VqeICvqRv1vsqt3mL8aiUAKhM6mLvei1gI6ty6HRlqUAC+JqimvXydEIJgIqkM9oXmsYBW17n0tU+lWX/msFLAfL2OgWYNEAoAVCXS2e0gS8I33VMVVzn0a8DKMaZ2zjaIJQAqEQ6o/3a8wS+4Hlk87itmzZUcQG7coyjERpdAlQgfdn4zbMEHtE3j3uxXsw/TTlIrv4Enui/1ov5lUGsl0oJgMKlkmiBBPAtz4KuCD0XSABPoFqickIJgIJt7UAC7OJ0yjPabtoABtAfPzszkPUSSgCUzRltYB+TVUukGz/ctAEMYdJAlWkJJQAK1S1XSqKBQ4y+uO+WqxfpNiCAITxze0+9hBIABeqWq+PZbPajZwccYIpqiUtVXMDA3qbAk8oIJQAKk/4ga/oEPMVo1RKquIARWf9USCgBUB47kMBTjVItoYoLGNnr1K+GigglAApiBxIY0KDVEqq4gIm4iaMy37U+AAClsAPJI+5ns9nHHQao/9L43ECS9NUSxwMGCaq4gCn8US2xXsxdiV4JoQRVSDs9rzxNkiHL+vovelfrxfxT5OCmz7gdyLbdzGaz2/SZ7H/6z+THQz+b3XLVz5nfp9+XzRz6uvVBbtDZEHOLKi6+Ynve+rQVnt6uF/PbXQdtq1z/xYMfc1a7zgZe7xGoW6/Xxp9ipVLRfiH0xlNkRO/Xi/lJ5AB3y9WVxVdT+sqHq/TzccrdoBRWvEqLvSOVFU1YrBfzg6/vTF8Yf299EJldb4L8FDrsUr31ZGktuJmzhKtt+S/VEnUQSlCsVMp+oVSUCXxYL+bHUQPdLVd9M7pfPejq3aTy98upFvO7SAv+o1TmLwCu08FzXKriuvW3uEnXm/A0ty+GKSg7TnOXCp56ha7PGI5QgiKlnbwriyAm8q+oL4npC+FHn/Vq3aRw9XKfUuZIKRDuf962/vBqsl7Mu0PeTrdcXQqrmnGT1l6XJe1Op7+j/Zx1IqCo0j9L+fvJ1wklKE7albnyh4WJ/LJezMO6PHfL1Uef9ercpSDiouSFVJqLj9O1kj6jhTsklFDF1YTigtPHpIDiNM1djqbVIfyILU8nlKA4dmWY0N16MX8RNeDdctWHIT974NXoS53Pn3J2P1epem2z0FfVU6B9QwlVXFWrKoj4mm65OknVE3pQlK3vwfQiuiE5T+P2DYqSdmUEEkwlLHlPX/IEEnV433cJr3lxn443naTqidP048tqOX454JXq6VSXu9TT5ryVUvj1Yv5HxdpWqOpIWpmepfXaeesDUTKVEhRDd28m9m69mJ9GDbrbNqpQfRjxmLQLeaZEOnt7H1FzbKMqH9JRsuoquPaVqn/OhBNFCq1s5emEEhRBd28m1u8YvYoqBbTgL17TYcRD6fN8Zv7OysG74o5tVOE+PX/z1BekyolzGwPFedLVxsQSSlAEzf6YWNgfNgv+ogkjvmLrWIcjSTHuNlc3pusbD/6MquIq2n36sn3u/P23pZuGzlV7FcP1oAUTSpC9brm6UErHhEL/qFnwF+k6hRHFXJEXJYVuFz7joxsshNiWjuT8VsQIsE0YcSCBanH+h894mYQSZM0CiImFdnBOuzJLD70Y/eflNDVLYw/ps65R4nA25fiDhhDbHKMskjBiIOlIx4Wq3ez9tF7MNbwskFCCbKU/AFcWQEwo7I9ZWvB/VCZajHepOsJC/0CqJp7k/kElxMex/wtVLRbHHDUCV3Vn72a9mL9qfRBKJJQgS76gEeB6vZgfRQ18t1z1YciPHnz2+rL4E0c1huOzv7PrTTXEFCHENrdfFeU6zVF624wk/T5c2jTL1j99/svzXesDQLY0FmJK9+mO6xCpKsiXsvzZeRxBf/VuamZ8bpH/FzdbIUR0COaIUv7u0nEytw+MrP99TJVeV45zZOk0/VAQoQS5ctcwU8lhV8n5x7ypjhhZ35cjBRMtH9m7e9AXIovwK5Wr2yTIm8B0YmmsXznWlKVjoUR5HN8gSymBDtu5pgm3YzWE24fmltn7kAIJi/0JNNZLaPTmlE/liuLsCUwzoCl7lv419TE3nkYoARCoW65u7UJmyc0aQSoPJsL6QhzCLnDW3qc5SmCaAcFEdtzCURihBEAQXbyzdZN2H+2yBKkomLhJ7+OytN1szS2zdZ/mJ70jMuPWuKy4haMwQgmAAO78z5bjGpkodIF/t3VV52XJn6NuubpyXWt2+pDr2M0C+RJMZMUtHAXR6BIgxplFS3Z+WS/mZ60PQi76SpW0W5/zAv/+QQhRxQI4laILJPLiuEYBCpm3WnHk5qByqJQAmFhqHvffxj0b+kdkLMNmsNdbzSmrbDCo1012nI8vjONPWfiwXsyPWx+EUgglACameVxW+kDiSP+IvAU3kbvZqobI5qrOsXTLVX+V3q91vrvi6B9RMM0vw92vF/PvGx+DYgglACakSiIrGloWpFuu+p3iHyd4xXcPQohmziTrdZMVgWkFhHzhXA1aCD0lAKalZ0EebtKC3/nsQqwX89P0pXnoKqNNX4jL1kKILzgVSGRBYFqJ/thNan6pOjJGf3zD71EBVEoATESVRDYEEgUb4FaI+weVEBasqiRyYn6qULdc9fPMy9bHIcD1ejE/au5dF0ilBMB0VEnEs+Av33GqatgnmLjeqoQQQnyZKol45qd6bXbs/Y5Nyy1ChVApATABVRJZsOCvyDd6TFR/Q8aQVElkwfxUOTdyhNFXogAqJQCmoUoilgV/ZVKPifO0A9l/qe6f7UchxEFUScQyPzWgn5u65erdRA17+Y8jfSXyp1ICYGSqJMJZ8MNXqJII55aNhqTftyv9JSb1fr2YnzT0fov0j9YHAGACqiTiCCTgcaok4ggkGpP+FvmCPC2NLgsglAAY0UhXGLKbfsF/LJCAR50anjCu/WxQeubvWh+HCT1PazEyJpQAGJcFf4zNDuRti28edtEtVyeqJML8tF7MLxt97/xZQXlnHCbzqpH3WSyhBMC4hBIx7EDCtzlaFqM/437e4hvnT6mCz+/fdIQSmRNKAIzELmSYX+xAwuO65aq/teS5YZrcjaZ7zP4MJi7S9cWMTyiROaEEwHhUSUzvw3oxt/sE32Z+mt59usIWNvy9msaLFt5kyYQSACPolqsjV35N7k5Xc/i2dE3xa0M1uRN9bti2XsyvVEtMwnyXOaEEwDh8OZ6emzZgN3Znp/fOsTK+wu/jBFIYS6a+82CASOmPxCB/KNKOQzjXgIb4SWNL+LY0PzlCMK07Xzz5mn7t0i1X13bzR9evNVUqZUooUYlUKn6SFhoa69GkbrnaXAMZ/eVUlcS0rnWyh51ZJ0zvRBUX39CHVr8bpFH1zS6z2Lzi7xzfqEC3XJ2nieythQaNe5bJbpQGctO5FwLBXsxP03qXSxUf+dJbYhLfN/AeiyWUKFy3XPVfwH5sfRxgS+huVLdcvXLN3qTONI6D3aT5SQPe6Ti2wT4ujNaoXAuaMaFEwdId4z+3Pg7wQHQjMbuQ03FsA/ajqmhajm2ws/VifpGq/xiHSomMCSUKlXY7JKrwV/cZdDfXQG46vmDBfvzOTOeDYxscwNp+PColMiaUKFDqnH2hfwT8TWgg0S1XJ34vJ/OLYxuwu1RdaX6ajqo5DqH6bzzmv4wJJcp07kwofJEqiTbcWbjB3lRJTEdoykHS5+bG6I0jXUNPhoQShemWq9N0ywbwV6FHN1IF0xvPZBJnzmnD7sxPk7oXmvJEjnCMRyiRKaFEQbrl6mg2m/3a+jjAV6iSaMNNagYG7M78NB2hKU8VvZ6pmWaXmRJKFCLtcpik4OuiG4pZ9E/DOW3Yn/lpGnduBOKpHOEYlWaXmRJKlONKgxZ4lKMb9bvWzR72Y36a1FlD75Vx+VtHU77zuPPXLVcaW8LjPgSXy9qFnIYF/1ekL552gPiS/2lUJnHnaBkD6jdafjSgg3N8I1NCicylKwZNSvC46KNNR8H//S1QJfFA6jN0kkIxlXQQy7ENBtP/veuWq3tz++CE95kSSmQsXVvjjxw87l6TyybYgUxSVcSFknzIxr05ihF8nM1mrw0sLdBTIm8nElJ4VL8QPIo8upF2q/2ejktZdNItV/0uz61AArJy7sYNRqA6kGaolMjbZSozcv4J/upT+mN9kcFCUJXE+FSM/SeQ0PQY8iM0ZQz9fP+zkR2U4xuZEkpkbL2Yf/SFB7Knn8S4lEX/x4VAArLzPl3hCINKfSUM6rD8Dc2U4xsAB0pn+92MM65LZdF/fNbOfNYgS0JTxnRjdGmBUALgcCqZxtf8gj81PVbCC/m5cysQI1OFQxOEEgCHc3RjXBb8fzrL4UUAf6PfDWP7aIRpgVAC4HBCiXGpkvizueXbDF4K8HfNz1GMTqXEwNKtaWRGKAFwgFRS/9zYjcqC304s5OqDfjdMQChBE4QSAIdxrdS4blrvaJ92c15n8FKAv7s0JkxA8EUThBIAh1H+Ny4Lfr0kIGfmKEa3Xsz1lKAJQgmAw6iUGFfTC35VEpA1RzcABiSUADiML4zjubM7pEoCMqZKAmBAQgmAPencPLqmrwFVJQHZE0owpTujTe2EEgD7c3RjXE2HEqokIGuObjA1N3BQPaEEwP6EEuNqdhdSlQRkr/XQFGBwQgmA/b0wZqO5a3wXUpUE5M3RDYCBCSUA9mcnezzN7kKqkoDs9aGpUnqm5jNH9YQSAHvolitHN8bVcmn0aQavAfg6RzeIIJSgekIJgP04ujGuJq8C7Zar/nP1JoOXAnydoxsAIxBKAOxHpcSI1ot5k6GEXhJQBJUSRPjeqFM7oQTAfoQS47mu9Y09JlVJvM33FQKa8BLIumNYrW5+ZE0oAbAfOxbjafXcrCoJyJ8qCaiAcDFPQgmA/bgdYTzNhRKqJKAYdleJYjOE6gklAMhFizuRJxm8BuDbVEoQ5aWRp3bfecIwnLTreer83yj6XaqzyLK7brk6ivrvbkRTJZXdcvW9a0ChDA034QUYnVACBtItV/2O52/GczSvUwmjneVKNbjo7wOJZxm8DuBxN8aHCDZDBtdkQ+0SOL4BA+iWq2OBxCSOg//7LQ7Gc1/rG/sSVRJQlFab8BJPPwmaIJSAJ0pfLs6N4yR0TK5Xa1USx6okoBiObhDFcWCaIOJRTZQAABwZSURBVJSAp+t3O58bx0lE71ZZHDAU14BCOQTiRHlh5AclYMyUUAKeQAl2c5RRjqeZhULqPyPIhHL4IkMUocSwBIyZEkrA05wrwZ6UK9nq1dJCQZAJwC5eG6VBCSUyJZSAA3XLVV/K/9b4NcXigCdJndTdOQ8FWS/mAnEml66ZZ1iqnjIllIDDaW45PQk3pdNLAoBd6GNFM4QScIC022nXfHoS7npVvxOZdr3MGwDsQigxMFVP+RJKwGEujFtblFEyAFUSAOzqyEjRCqEE7Enn/FCRlRJCCQ6WQi09aKA8N54ZQVTWDeu6pjdTG6EE7CFdAaqXRJD1Yq6nBKU68eSgSP7uMLl0TBiaIZSA/Zy6AjTMXaPvm8KlMNM1oADsSj+J4eknkTGhBOxHch1HHw9KdSzMBGAP1pvDu63tDdVEKAH76Y9u3BuzSfUVEj+tF3NNAimVzy6Uy441Ed4Y9cEJJTL2XesDAPtYL+aXs9nse4MG7KJbro41xoWiqXJiUunvBsNzrXzGVEoA7EYpJYfQSwKAfVhvDO9es/S8CSUAYATdcvXKlW4A7EmlxPBUSWROKAFADmo8FqVKAirQLVcvPEemkMJsR/6G5+aNzAklAMhBVc3k0jWgbzN4KcDTCSWYyomRHoUml5kTSgDA8FRJQD00uGYqjm6Mw/GNzAklAMhBbYt+u11QD9eCMjpHN8azXsyFEpkTSgDsRunfuKpZ9HfL1YmFJVTF8Q2moMJuHNc1vqnaCCUAdiOUGFdNlRKqJKAuQglGlfoQOboxDk0uCyCUACAHL2t4Cq4BhSr5nWZsfSDxzCiPwtGNAgglAMhCJdfuKb+FCrkWlJH52zEelRIFEEoAkIsa+koov4U6aXbJKLrl6qiWasEM3awX80+tD0IJhBIA5KLoRX9aWCq/hTodea6MRB+i8aiSKIRQAmA3kvbxlb4T6UsL1MvvN4NLx4LeGtnRCCUKIZQA2IE7ridR+qJfeTfU62W6IQGGdGY0RyWUKIRQAoBcPCu8mZwvLFA31RIMRpXE6PSTKIhQAoCcWPQDuTI/MSRVEuNSJVEQoQTA7u6M1ehKXvQ74gN1c7sOg1AlMYnLBt5jNYQSALu7NVajK3nRb1cG6va8W670jmEI50ZxVPfrxdzf5IIIJQDIybNSF/3rxbzflbnJ4KUA43F9I0+Sro9+YxRHJZAojFACYHfK86dR8qK/f+33GbwOYByOcPBUqiTG5+hGYYQSALvTxXkaxS7609WxfaXHdQYvBxieIxwcrFuuTvvrZY3g6IQShRFKAOxOKDGNohf968X8dr2Y9+W5/5zNZj/NZrMPKaRQQQF1OPUc2Ve3XH3vxo1JfHAVaHm+a30AAPbg+MZ0Tkpf+PfhRCrTVao7gLSg78f0WfFvhtId959HX3zY04X5axKqJAqkUgJgdxag09FMjocuLejJxDNzFPvolqtjzS0nI5QokFACYEepXwDT6G/hsOjnD+kc9mujQUYc4WAnqcrrwmhNwtGNQgklAPajL8B0hBLMUn+RX40EmXkuOGVHjm1MR5VEoYQSAPtRLTGd1+k+dxplh5HMCSV4VKrycmxjOkKJQgklAPZza7wmZdHftjPX55ExwSlflaq83LYxnfeObpRLKAGwH6HEtN52y9WLlt4wf0qN4X40HGTO7Tr8zVaVl2Mb01ElUTChBMB+HN+Ynp2mxji2QUFe6i3BF1yo8prU3XoxF0oUTCgBsB+VEtNTLdEe139SEsEpn3XL1Zk+EpMTYhdOKAGwB9eChrHgaITrPynQ8/RFlMalqpmfWx+HANYIhRNKAOzv2phNTkO5Brj+k4KdquhqW5q/fmt9HAJ8WC/mqlgLJ5QA2J8/fjHshFQs9ZFwJphSPTNHtSsFEletj0MQzWYrIJQA2J8jHDGUSNetDySetz4IFO11ujWGhqQKmSt9cEL0DS6FQRUQSgDsTygRR4l0hbrl6kIfCSpxYY5qx1aFl0Aiho2KSgglAPYklQ+lRLoyqTHc29bHgWqYoxqRAokrV3+GuXfkrx5CCYDD3Bi3MK/TDQ0ULgUSGsNRm9eOmtVNIJGF8/Vi/qn1QaiFUALgMKolYv2aGotRqHSbikCCWv3sxqA6bfWQEEjE0uCyIkIJgMPoKxHvMu1WUZgUKCm7pXaX+kvUJc1dHwUS4d6rkqiLUALgMCol4j13drs8W1fnaQxH7Z4JT+th7sqK41GVEUoAHGC9mN/2V1EZu3BvnN0uh0U9DXopPC1f6n9j7srD+7QGoyJCCYDDqZbIw89pwUjGBBI07E269pYCpeD7N3NXNmxEVEgoAXA4oUQ+ftP4Ml+p4Z9Agpa9FUyUpT92k57Zz62PRUZUSVRKKAFwOI368nIlmMhPqmL5XSAR4v81+J5z9tZxszJsVXa9bX0sMuP3p1JCCYADpc7PN8YvG88EE3lJgYRrP+P8n1bfeMb642auMsxYt1wdu/IzS6okKiaUAHgaRzjyIpjIRCp7FkjEuZ/NZv+r1TefuR8d5chPOq7RB0ZLlV3ZuVclUTehBMDTOMKRH8FEoLSwV/Ycr/9y9b9bH4SM6TGRka3jGj+2PhaZOlclUbduvV63PgYAT9ItV5/sqmSp31k5Xi/mqlkmkhb2fVD3vIk3nK+79WL+YvbnM+mfx5vWByRj12me+tT6QERJfT40s8xX/7f8hd+RuqmUAHg61RJ56oOi310XOo2te/wFEvG2y5zNT3l7rbIrRj/m3XL1USCRvTOBRP2EEgBPZ9Gft980lhvP1rV57vHPQ18lsX0swPyUv5cpmDhufSCmkqoj/q2ZZfb6+czf7wY4vgEwAEc4iqBMemCOa2Tpvx4eWXKEoyjv7AyPp1uujmaz2YU5qxh/m8+ok0oJgGHYjcxfXyZ9mxalPNHWTqPFfT6uv7KANz+V40fHOYbXLVcvUjj3uzmrGB8EEu0QSgAMw6K/DJs+E+f9sYPWB+MQfajTLVe3zmFn6fQrL8r8VJb+SMG/U/DHE6TjZf04/rdqoaLcPzKfUSHHNwAG4ghHce5ms9mJnZjdpBDn3FWf2Xq3Xsy/uohPfT88u/KYpw7ULVenqemrv8vl+WW9mAvlGqJSAmA4diPL8jxVTVyomnhc2mm89aU2W/cPbtz4EvNTmbbnqRetD8Yu+puAUjXXrwKJIt0JJNqjUgJgIOkM8L+NZ5HuU3M5Xb63pGs+z5zBzt5Pu3x20xc1z7Jsv/QVSxph/p35qhqaWzZIKAEwIIv+4t2lcOKi8vf5KIv7otysF/OdmiKmihe9QMp3n45SCSfMV7V5v17MT1ofhBYJJQAGlM6w/mpMi9dkOGFxX6R/rRfzj7u88FT+/9+tD1hF7tP1ln04cdvSG0+f5ZPUDNERjTr0n+cXgrY2CSUABpR6E/xfY1qNu61Ff5ULJYv7oj3a3PJL0rWIbiGoz4c0T1Vd9p6udD7R36ZKi/VirvdNo4QSAAPT5b5a7/uAopZFf6qKOPYFtVh9YPZq37Asfan7vfXBq9gmSL2opXpiKzg9UcVVrQ/rxfy49UFomVACYGAW/dW7SzcZXOxaNp+DVMVzlIKIY1URxTt4V1Hvm2bcpIDisrSAIgURxymIeJnBS2I8jm0glAAYQ7dcfbSQasJ9Ciiu0sI/q0VVuhHmKP2oiKjHk3YVU5XMb60PYmNu0lx1mWuYmgL94zRf+fvZDsc2EEoAjMGiv1l3KaDoF/0fpzzqkSohNiHE5l/VEPV58q5i+qzc+nw06z7NU1dTz1MbD+ar/ud16w+lUXv3xaFOQgmAkSiRJrlLXwD7oOLT1r+z9IVg5y+XaSext1nQv0g/r3zBbMYgu4quB+WBmzQ3fZ6rhggrtsKHzVx1lP71t5H+M3fk2AYzoQTAeCz6gYEN1gxOtQR7uNkKUmepwuKhTeiwISjlW3a+zpj6CSUARmLRDwxo8GZwglMgyE/rxfzc4LPxDyMBMI705cEfXWAIxyOUOZ+nsANgKh8EEjwklAAYl0U/8FTvxmhGKDgFJnaXrnmFvxBKAIzIoh94opuRu9MLToGpjFHxRQWEEgDjs+gHDnE/9q6i4BSYyE8aW/I1QgmAkVn0Awc6nWgRLzgFxvReHwkeI5QAmIZFP7CPfhF/McWIpeB0zCMiQLtuzC98i1ACYAIW/cAeJl/EpwDkzkMCBnSvjwS7EEoATMSiH9jBH30kghbxuuIDQ+oDiVsjyrcIJQCmZdEPPGaqPhJ/k64d/eDpAAP4YYyrjKmTUAJgQhb9wCPeTdVH4hGn+t8ATzRZTxzqIJQAmJ5FP/DQ9XoxD+87k0qtdckHDvVhvZirCmUvQgmAiVn0Aw/0vWaOcxmU9WJ+lpptAuzjxjFVDiGUAAiQFv2aXgK5dqd3WxCwj34uO3LTBocQSgDEsZsAhDW2fEzqf/Ou+acD7EIgwZMIJQCCWPRD837JvBmcii5gF0c5hquUQygBEMuiH9r0Ph3jylba9VTRBTzmB4EETyWUAAhk0Q9NuimlO32q6Polg5cC5OcHV38yBKEEQDDHOKApfXf6o5LesNs4gC8QSDAYoQRAHiz6oX653rSxi5P0+gHeCyQYklACIAOOcUD1Nt3pb0t8o+nMuGtCgfelHD+jHEIJgEykRf9PngdU6bj0ZnBpZ/R9Bi8FiCGQYBRCCYCMrBfz89ls9sEzgar8kHrH1ODUUTNokkCC0QglAPJzYtEP1aiqGVw6anasvwQ0RSDBqIQSAJnZ6i9h0Q9lq7I7feqL4QsKtEEgweiEEgAZ0lQOild1d/r1Yn6pBw5UTyDBJIQSAJlKX2jeeT5QnCYW8qkHjsaXUCeBBJPp1uu10QbIWLdc9TuSbzwjKEJzC/luueoru15m8FKAYbxbL+aqNZmMSgmA/Gl8CWVodWfxyBwF1fhBIMHUVEoAFKBbrr6fzWZ9c7lnnhdkqelS5265ejWbza7MUVC0Kpvzkj+VEgAFSDdyHLmRA7LU/Nnr1JzXHAVl6n9vFwIJoqiUAChI2o38t2cG2fhlvZifeRx/6parPpj4PYfXAuykDySOUrAIIVRKABQkLRp+8MwgCz8IJP5qvZhfmaOgGDcCCXKgUgKgQN1y1ZeK/+bZQRhnrx9hjoLsbQKJTx4V0YQSAIWy6IcQfanzqUDi28xRkK3m++CQF6EEQMEs+mFSzl7vyRwF2dEHh+wIJQAKZ9EPk7ibzWbHAon9maMgC32oerJezC89DnIjlACogEU/jMrZ6ycyR0EooSpZc/sGQAXS+XYd72F47wUST2eOgjDXs9nslUCCnKmUAKiI3UgY1Lv1Yn5qSIeT5qjz2Wz2rJb3BBnTP4IiCCUAKiOYgCdzw8aIuuXq1Ww2uxJMwGju03GNK0NMCYQSABWy6IeDOXs9AXMUjOYmzWG3hphSCCUAKmXRD3u7Tot5/SMm0C1X36c56mX1bxam4bgGRRJKAFTMoh92pn9EgDRH9cdk3jT35mE4jmtQNKEEQOUs+uFR7u7PQLdc9XPU29bHAQ7wIc1hKrwollACoBHdctV3vP/R84bPnL3OiCa9sBcNeamGUAKgIRb98JnjGhnSCwd2cp2qIwSqVEEoAdCYtOjvS9Wfe/Y0yNnrzOmFA1/Vz19n68X83BBRE6EEQIPSor8PJl57/jTE2euCOHIGf6E6gmoJJQAa1i1X/dVhP/sMUDnNLAvVLVfHqVGv4xy0Su8IqieUAGhct1wdpaoJi35qZHexcN1y9SLNUY5z0Jr3KZBQ3UXVhBIAOM5BjewuVkZlFw25SfOX3jc0QSgBwGfdctXfRvCrEaFwekdUKlV2XWjUS6U0sqRJQgkA/iLdznGhVJoC3aUwwu5ixVJl15kmmFTGUQ2aJZQA4IuUSlOYX2az2bkFfTtUTVCJ6xRGfPRAaZVQAoCvUjVBATSybJiqCQqmsgsSoQQA36RqggxZ0PNZqpo4F6BSgLvUN0ITXkiEEgDsJF3Ld+GGDoK5VYOvSgHqqSuOydB9OmJ25uHAXwklANhLt1wdp3DCop8p3aedcH0jeFQKUPsvfm+NFBkwd8E3CCUA2Fs6x33qSAcTeZfKnS3o2Vk60nGmuosgwgjYkVACgIOlHcl+0fXGKDKC9ymM0MSSg3XL1UkKJ9zSwRT0jIA9CSUAeDI7kgxMGMHg9JtgZDepKkIYAXsSSgAwGDuSPIFSZ0a3dfRMOMFQPqR5y01AcCChBACDE06wh7vUOFUYwWSEEzxRH6JequiCYQglABiNcIJHXPdhhFJnIgkn2NNNqui6FKLCcIQSAIwuhRP9ov+l0W7e+1QV8bH1gSAvQlS+YlMVYd6CkQglAJiMhpjNuku7ixd2F8ldt1wdpxDVPNU2VREwEaEEAJNLV4n24cSxkulq2V2kaGme6sOJE/NUMzY9bi70ioDpCCUACJPOcx8rma7Kh7SzqFcE1UhHO05UT1TpLgWoFwJUiCGUACAL3XL1Ku1Kqp4oz4e0qFfmTNW2qieOBalFE0RARoQSAGQn7Ur2i/43nk62BBE0TZBanJutOUsQARkRSgCQra3jHQKKeP3O4lVa1F8JIuA/UnPM/udIBUU27h/MWXpEQKaEEgAU4UFAcWRnchLXWwt6O4uwg1RBcZLmKdcgT+tma866aumNQ8mEEgAUKe1MHln4D+o67Sxa0MMAUg+KI2HqaG42c5YKLiiXUAKA4m0t/I+UT++sP47xMS3mPwohYHypimJ7rhJS7O5+a84SnEJFhBIAVCcd9dgs+l+5xu+PAOJ2E0CkEML5agiWQopXW3OVqq//uN7MV2nOcoQMKiWUAKAJW4v/TVXFiworKjbhw8etfz8qaYZydMvVJqDYzFe1h6rXab66FZpCm4QSADQtfQF48YWfHAOLTfnyLFU9bP79ZBcR6pVC1e+3AtUXKbTI/fjHJiidPZizZo5fABtCCQD4inQM5FX6326+FMy2vhRs+37P0uvrL/xnfbCwqWr4tBVA3No5BL5kK7DY/Ls9P41RZbEdjt5uhQ6f5y+BA7APoQQAAFRuK7zYePg/f8nn0EHQAIxFKAEAAACE+IdhBwAAACIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQgkAAAAghFACAAAACCGUAAAAAEIIJQAAAIAQQon/344dEwAAwDAMqn/Vc7E8IAMAAAAgISUAAACAhJQAAAAAElICAAAASEgJAAAAICElAAAAgISUAAAAABJSAgAAAEhICQAAACAhJQAAAICElAAAAAASUgIAAABISAkAAAAgISUAAACAhJQAAAAAElICAAAASEgJAAAAICElAAAAgISUAAAAABJSAgAAAEhICQAAACAhJQAAAICElAAAAAASUgIAAABISAkAAAAgISUAAACAhJQAAAAAElICAAAASEgJAAAAICElAAAAgISUAAAAABJSAgAAAEhICQAAACAhJQAAAICElAAAAAASUgIAAABISAkAAAAgISUAAACAhJQAAAAAElICAAAASEgJAAAAICElAAAAgISUAAAAABJSAgAAAEhICQAAACAhJQAAAICElAAAAAASUgIAAABISAkAAAAgISUAAACAhJQAAAAAElICAAAASEgJAAAAICElAAAAgISUAAAAABJSAgAAAEhICQAAACAhJQAAAICElAAAAAASUgIAAABISAkAAAAgISUAAACAhJQAAAAAElICAAAASEgJAAAAICElAAAAgISUAAAAABJSAgAAAEhICQAAACAhJQAAAICElAAAAAASUgIAAABISAkAAAAgISUAAACAhJQAAAAAElICAAAASEgJAAAAICElAAAAgISUAAAAABJSAgAAAEhICQAAACAhJQAAAICElAAAAAASUgIAAABISAkAAAAgISUAAACAhJQAAAAAElICAAAASEgJAAAAICElAAAAgISUAAAAABJSAgAAAEhICQAAACAhJQAAAICElAAAAAASUgIAAABISAkAAAAgISUAAACAhJQAAAAAElICAAAASEgJAAAAICElAAAAgISUAAAAABJSAgAAAEhICQAAACAhJQAAAICElAAAAAASUgIAAABISAkAAAAgISUAAACAhJQAAAAAElICAAAASEgJAAAAICElAAAAgISUAAAAABJSAgAAAEhICQAAACAhJQAAAICElAAAAAASUgIAAABISAkAAAAgISUAAACAhJQAAAAAElICAAAASEgJAAAAICElAAAAgISUAAAAABJSAgAAAEhICQAAACAhJQAAAICElAAAAAASUgIAAABISAkAAAAgISUAAACAhJQAAAAAElICAAAASEgJAAAAICElAAAAgISUAAAAABJSAgAAAEhICQAAACAhJQAAAICElAAAAAASUgIAAABISAkAAAAgISUAAACAhJQAAAAAElICAAAASEgJAAAAICElAAAAgISUAAAAABJSAgAAAEhICQAAACAhJQAAAICElAAAAAASUgIAAABISAkAAAAgISUAAACAhJQAAAAAElICAAAASEgJAAAAICElAAAAgISUAAAAABJSAgAAAEhICQAAACAhJQAAAIB/2w6LhvJSJ+iOngAAAABJRU5ErkJggg==",
                                    width: 48,
                                    height: 48,
                                },
                                {
                                    src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEsklEQVR4nO3Ze0yVdRzH8fdzrhzgHEFu4ygdReYZDlhw8oACCmcyndVqTWvL5pbd19y6Kf1T2fqry8o/WoY0Z/afablZ62JmLhRUUCARRERBMhXUyFsHxE8DW2umiXq4nI3v9vz/fT2/5/k+n30fGKUVhCzCsQT2HnjpMmwjnKobvJdgRRCO9YIuQwWjuX6H1DOwuBvKzkHDBdAlUBA0qgDNYP8Vco7D4t/g3VPwXSecOA06C+oGnQONKKC/yYOQ3gz3NcMLLfDhYfjmCBxqg94O0HHQCdApUCdo2AH7wVYJ6dXwYA0s3wur62BrPbTth75G0EFQM6gF1Ao6CmoHjThgB5RXQs8u0B5QDWgfqA70C6gBNNoBFVWgMQBjJxA+j1AvrA1LwCW40gNrBZFhBThiGPrAbFaW1SqTydSfg1JCBthitR4INaDFZNJ6m00vOxzKj4yUKypKERERstlsMpvNMhnGxpABvnA6u+8EUG2x6HOHQ2+7XHoiNlYz4uKUmJCg8ePHKyYmRk6nU1HXAJ4yjKZhBVRZLNocFaXy2Fi9lZio59xuPeDx6O7UVKWmpsrj8SglJUVut1tJSUlKuAEgw2rVBsPQ3oGAGmLAjzab1sfE6KPkZL05aZKWer16ODNTs30++Xw+ZWdnKysrSxkZGUpPT5fX61VaWtpNAVOjo/WM3a7vTaaBKdQHoQUsz8xc9VAg0FRSUtIbCARUVFSkwsJC5efnKy8vT36/f9CACW63cuPj9azTqTV2uxpMpv+M0H5ALZwl1DVv3jx7cXGxt7i4eH5BQcHSmTNnrszLy/vK7/c3+ny+4LWA3ClTtGDCBC2Li9PH0dEDJ9huGDf9BvSBuqCe4ah6iG0EX4PJ9EiV1bqy0mrdvtdiaWs2jOD1JlDXID5ifVev0IW5aoishoJqeLIG3tkHm2rhQD38+e8JdGgQI3REAFWwbfcgRuhoBlSMARg7gfB6hASvhyWgC84dgxdD1vxwAE4ZhjaazVpktcp1NcydBGaFDPCtw3E0lIBWk0kbbDaVRkaqyOlU7HXSqMMwfggZYJPT2X07gFbD0M82mz6LjtZrMTF6ND5e9yQl/W8atdlsGmc2633DaBsWQJ3JpO12uza6XFoVH68Vycla4vEokJamaYNMo86/AeMiIrTEYhm4GTWhTKNfOp3dX0dF6dPERL3n8ajU69XjWVm6d/r0W06j1wKmulx6zOHQJxaLThrGP5MopIBFs2cvmDt3bllJSUllIBDovN04nTpxogIJCXra5dLqiAjtM5tvOErroIuhqjlz5owrLCzMKSgoWJibm/uq3+8vz8nJ2Zadnd3RD/BNm6b5kydridutN+LitC46Wjus1oEXerBrlfOwm6GO0fXgq4eF+6G0EcqaYMtBaD0EfaNtN5pdCaW7YM0e2FkDXWPLXca204OvsfU6t/US/xS2J9ADwV5YEHaAi3AlCJuDkBOy5ocBcOEP2Hoell2Eu0La+FAATkJ7J2w+DctPwwyBdUiavlPAYeg4CtvboawDnj8Os9ogdsibvRVALZyph4oGKDsApU2wsAV8jeBkNNVOWFcF5VXwym64vxam9v/4Hum++usvJ71ky19p2KIAAAAASUVORK5CYII=",
                                    width: 48,
                                    height: 48,
                                },
                            ];
                            const elementPosition = getElementPosition('shareGitHub', '%', 'top', 5);
                            confetti({
                                particleCount: 10,
                                angle: 100,
                                spread: 75,
                                startVelocity: 15,
                                decay: 0.85,
                                flat: false,
                                gravity: 0.9,
                                drift: -5,
                                ticks: 200,
                                position: elementPosition,
                                shapes: ['image'],
                                shapeOptions: {
                                    image: base64StrArray,
                                },
                                scalar: 3.4,
                                disableForReducedMotion: true,
                            });
                            gsap.fromTo('#githubIcon', {
                                scale: 1,
                            }, {
                                scale: 1.3,
                                duration: 0.2,
                                ease: Linear.easeNone,
                                onComplete: () => {
                                    gsap.fromTo('#githubIcon', {
                                        scale: 1.3,
                                    }, {
                                        scale: 1,
                                        duration: 0.2,
                                        ease: Linear.easeNone,
                                        onComplete: () => {
                                        }
                                    });
                                }
                            });
                            gsap.fromTo('#githubIconBraces', {
                                scaleX: 1,
                                scaleY: 1,
                                opacity: 0
                            }, {
                                scaleX: 2.2,
                                scaleY: 1.4,
                                opacity: 1,
                                duration: 1,
                                ease: Linear.easeNone,
                            });
                            gsap.to('#githubIconMessage', {
                                y: 40,
                                opacity: 1,
                                duration: 0.9,
                                ease: 'power1.inOut',
                                onComplete: () => {
                                }
                            });
                        }

                        const animationMouseLeaveGitHubButton = () => {
                            gsap.to('#githubIconBraces', {
                                scale: 0,
                                opacity: 0,
                                duration: .5,
                                ease: Linear.easeNone,
                                onComplete: () => {
                                    gsap.killTweensOf('#githubIconBraces'); // Stops any ongoing animations on the element.
                                    gsap.set('#githubIconBraces', { clearProps: 'all' }); // Resets all properties of the element to their initial state.
                                }
                            });
                            gsap.to('#githubIconMessage', {
                                y: 0,
                                opacity: 0,
                                duration: 0.5,
                                ease: 'power1.inOut',
                                onComplete: () => {
                                    gsap.killTweensOf('#githubIconMessage'); // Stops any ongoing animations on the element.
                                    gsap.set('#githubIconMessage', { clearProps: 'all' }); // Resets all properties of the element to their initial state.
                                }
                            });
                        }

                        const clickBuyMeACoffeeButton = (event) => {
                            const url = getAllSavedUrls('buymeacoffee');
                            if (!url) {
                                showMessageToastify('error', ``, `Failed to get URL. Please try again.`, 4000, false, 'bottom', 'right', true);
                                return;
                            }
                            if (event.button === 0) {
                                window.open(url, '_self');
                            } else if (event.button === 1) {
                                browser.tabs.create({ url: url });
                            } else if (event.button === 2) {
                                copyTextToClipboard(url);
                            }
                        }

                        const animationMouseEnterBuyMeACoffeeButton = () => {
                            steamArrayEl.forEach((el, index) => {
                                gsap.fromTo(el, {
                                    translateY: 0,
                                    translateX: 0,
                                }, {
                                    keyframes: {
                                        "0%": {
                                            scale: 0.25,
                                            opacity: 0
                                        },
                                        "50%": {
                                            scale: 0.5,
                                            opacity: 0.2
                                        },
                                        "100%": {
                                            scale: 1,
                                            opacity: 0.4
                                        }
                                    },
                                    translateY: randomIntFromInterval(-60, -80),
                                    translateX: randomIntFromInterval(-20, 20),
                                    ["--clipPathSteam"]: `${randomIntFromInterval(20, 80)}% ${randomIntFromInterval(20, 80)}%, 52% 12%, ${randomIntFromInterval(20, 80)}% 29%, ${randomIntFromInterval(20, 80)}% 65%, 54% ${randomIntFromInterval(20, 80)}%, 73% 92%, ${randomIntFromInterval(20, 80)}% 74%, ${randomIntFromInterval(20, 80)}% 63%, 77% 57%, 95% ${randomIntFromInterval(20, 80)}%, ${randomIntFromInterval(20, 80)}% 3%, 34% 47%, 50% ${randomIntFromInterval(20, 80)}%, 69% ${randomIntFromInterval(20, 80)}%, 69% 29%, 76% ${randomIntFromInterval(20, 80)}%, 61% 6%, 64% ${randomIntFromInterval(20, 80)}%, 91% 9%, ${randomIntFromInterval(20, 80)}% 5%, 84% 61%, 91% ${randomIntFromInterval(20, 80)}%, ${randomIntFromInterval(20, 80)}% 19%, ${randomIntFromInterval(20, 80)}% 10%, 57% ${randomIntFromInterval(20, 80)}%, 57% ${randomIntFromInterval(20, 80)}%, 92% 19%`,
                                    delay: index * 0.4,
                                    duration: 3,
                                    ease: 'power1.inOut',
                                    stagger: 1,
                                    onComplete: () => {
                                        gsap.killTweensOf(el); // Stops any ongoing animations on the element.
                                        gsap.set(el, { clearProps: 'all' }); // Resets all properties of the element to their initial state.
                                    }
                                });
                            });
                            gsap.to('.cls-1', {
                                fill: getRandomColor(),
                                duration: 0.5,
                                ease: 'power1.inOut',
                                onComplete: () => {
                                }
                            });
                            gsap.to('#buyMeACoffeeIconMessage', {
                                y: 40,
                                opacity: 1,
                                duration: 0.9,
                                ease: 'power1.inOut',
                                onComplete: () => {
                                }
                            });
                        }

                        const animationMouseLeaveBuyMeACoffeeButton = () => {
                            gsap.to('.cls-1', {
                                fill: getRandomColor(),
                                duration: 0.5,
                                ease: 'power1.inOut',
                                onComplete: () => {
                                }
                            });
                            gsap.to('#buyMeACoffeeIconMessage', {
                                y: 0,
                                opacity: 0,
                                duration: 0.5,
                                ease: 'power1.inOut',
                                onComplete: () => {
                                    gsap.killTweensOf('#buyMeACoffeeIconMessage'); // Stops any ongoing animations on the element.
                                    gsap.set('#buyMeACoffeeIconMessage', { clearProps: 'all' }); // Resets all properties of the element to their initial state.
                                }
                            });
                        }

                        shareFirefoxButton.addEventListener('mousedown', clickFirefoxButton);
                        shareFirefoxButton.addEventListener('mouseenter', animationMouseEnterFirefoxButton);
                        shareFirefoxButton.addEventListener('mouseleave', animationMouseLeaveFirefoxButton);
                        shareTwitterButton.addEventListener('mousedown', clickTwitterButton);
                        shareTwitterButton.addEventListener('mouseenter', animationMouseEnterTwitterButton);
                        shareTwitterButton.addEventListener('mouseleave', animationMouseLeaveTwitterButton);
                        shareGitHubButton.addEventListener('mousedown', clickGitHubButton);
                        shareGitHubButton.addEventListener('mouseenter', animationMouseEnterGitHubButton);
                        shareGitHubButton.addEventListener('mouseleave', animationMouseLeaveGitHubButton);
                        shareBuyMeACoffeeButton.addEventListener('mousedown', clickBuyMeACoffeeButton);
                        shareBuyMeACoffeeButton.addEventListener('mouseenter', animationMouseEnterBuyMeACoffeeButton);
                        shareBuyMeACoffeeButton.addEventListener('mouseleave', animationMouseLeaveBuyMeACoffeeButton);
                    }
                    addEventListenerToShareButtons();
                    break;
                case 'aboutChangelog':
                    settingsWindowRightSectionHtml = `
                        <div id="changeLogSection">
                            <div id="changeLog">
                                ${getInfoFromVersion('getAllLog')}
                            </div>
                        </div>
                    `;
                    settingsWindowRightSectionEl.innerHTML = settingsWindowRightSectionHtml;
                    break;
                default:
                    console.error('%c%s', '', `Wrong data ${data}`);
                    break;
            }
        }

        /**
        * Finds the submenu data or returns the default data value if not found.
        * This function iterates through the `settingMainMenu` object to find a submenu
        * that matches the provided `dataValue`. If a match is found within a submenu,
        * it returns the first submenu's data. If no match is found in the submenus,
        * but the item's data matches the `dataValue`, it returns the item's data.
        * If no match is found at all, it returns the input `dataValue` as the default.
        *
        * @param {string} dataValue - The data value to search for within the `settingMainMenu`.
        * @returns {string} The found submenu data, the item's data if no submenu matches,
        *                   or the input `dataValue` if no match is found.
        */
        const findSubmenuDataOrDefault = (dataValue) => {
            for (const key in settingMainMenu) {
                for (const item of settingMainMenu[key]) {
                    if (item.data === dataValue) {
                        return item.submenu.length > 0 ? item.submenu[0].data : item.data;
                    }
                    for (const subItem of item.submenu) {
                        if (subItem.data === dataValue) {
                            return subItem.data;
                        }
                    }
                }
            }
            return dataValue; // Return the input value if not found in submenu
        };

        /**
        * Creates and updates the right section of the settings window based on the selected menu item.
        * This function determines the content to be displayed in the right section of the settings window
        * by finding the submenu data or default data associated with the menu item. It updates
        * the `currentMenu` variable to reflect the current selection. If the provided `data` parameter
        * is invalid or empty, the function logs an error and exits without making any changes.
        *
        * @param {string} data - The identifier for the selected menu item, used to determine the content
        *                        to be displayed in the right section of the settings window.
        */
        const createSettingsWindowRightSection = (data) => {
            if (!data) {
                console.error('%c%s', '', 'Invalid data');
                return;
            }
            currentMenu = findSubmenuDataOrDefault(data);
            createUIRightBodySection(currentMenu);
        }
        createSettingsWindowRightSection(currentMenu);

    } catch (error) {
        console.error('', error);
        return error;
    }
}

// h09 hyo v2l 3v1 mks 0cf 4m0 ecn age rlo
// cdz kgd h2s aet z54 s9a rjp 5lh pke o54
// i0p qic jz0 hlw ygz huj mof lm7 oy8 po2
// zcg lb1 2ud mxb 0su x2e bv5 uty p6l d1l
// q6c 5aw nyk tyy sk2 ibb lqp umf k2c mex
// uqn pl5 8w2 rl3 yup q7u d0a qxp ntv bi6
// jfv zl2 z1i pga uvg uj3 n1a odh 1g8 68q
// cre 1ru p1r 50p gez kzn r4d w88 mbl mv8
// emo mtv aut dhx g3v nmw kvy 4cx l5x b5k
// zkm diw jro c2o ws9 a9w wsp ox5 369 w4y

// uie 3xs 6nk z35 yeo 8y0 yfa mub rph vqg
// 102 qby 64p rkz 83r aob t15 fe3 b62 zdg
// 624 iev gl5 j0x 3le kic t0e 65c 2n5 lhz
// imq a73 ffj q33 3rd 249 1s6 rqz 60q z9k
// agj g3p 2h3 k8s 1m3 amo i7w 8dn 4jr 3u1
// et4 4xt h9l uud ik3 o4e jir j3n vp6 k9d
// wsc q2t pbb qgc nt1 p3k plw 4d3 n66 ov3
// yqa o90 y43 xba 983 01b 58o 72i kif 3um
// 3i3 h91 jte sgw 3ce hrr 1kd 6hl vaf nps
// z79 cc8 1ul 652 k9u a2z 1lb 6bk 8lt ---