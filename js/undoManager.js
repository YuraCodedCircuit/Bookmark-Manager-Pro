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

import { userProfileExport, currentLanguage, manageUserProfiles, createCurrentBookmarkFolder, currentLanguageTextObj } from './main.js';
import { indexedDBManipulation, isObjectEmpty, showMessageToastify, formatDateTime, capitalizeString, generateColorPalette, truncateTextIfOverflow, createTooltip, checkIfColorBrightness, findBookmarkByKey } from './utilityFunctions.js';

/**
 * Undo manager. Handles the undo manager UI and the actions it triggers.
 * @function undoManager
 * @param {string} status - The status of the undo manager. Can be 'addAction', 'deleteAction', 'closeUndoManagerUi', or 'showUndoManagerUi'.
 * @param {object} [information] - The information is a object that contains information about the action and original bookmark or folder.
 * @returns {void}
 */
export const undoManager = async (status, information) => {
    const uiElementsContainerEl = document.getElementById('uiElementsContainer');
    const userBackgroundColor = userProfileExport.mainUserSettings.windows.window.backgroundColor;
    const colorPalette = generateColorPalette(userBackgroundColor);
    const backgroundColorBrightness = checkIfColorBrightness(userBackgroundColor, 120) ? '#000000' : '#ffffff';
    const undoActionForbiddenIconSVG = `
        <!--Icon by contributors from https://lucide.dev/icons/redo-dot, licensed under https://lucide.dev/license. Modified by YuraCodedCircuit-->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${userProfileExport.mainUserSettings.windows.button.primary.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-undo-dot-icon lucide-undo-dot"><path d="M 21 17 a 9 9 0 0 0 -15 -6.7 L 3 13"/><path d="M3 7v6h6"/><path stroke-width="4" stroke="${userProfileExport.mainUserSettings.windows.button.danger.backgroundColor}" d="M 0 1 L 30 24"/><circle cx="12" cy="17" r="1"/></svg>
    `;
    const undoActionIconSVG = `
        <!--Icon by contributors from https://lucide.dev/icons/undo-dot, licensed under https://lucide.dev/license-->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${userProfileExport.mainUserSettings.windows.button.primary.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-undo-dot-icon lucide-undo-dot"><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/><path d="M3 7v6h6"/><circle cx="12" cy="17" r="1"/></svg>
    `;
    const deleteActionIconSVG = `
        <!--Icon by contributors from https://lucide.dev/icons/trash-2, licensed under https://lucide.dev/license-->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${userProfileExport.mainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
    `;
    const redoActionIconSVG = `
        <!--Icon by contributors from https://lucide.dev/icons/redo-dot, licensed under https://lucide.dev/license-->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${userProfileExport.mainUserSettings.windows.button.primary.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-redo-dot-icon lucide-redo-dot"><circle cx="12" cy="17" r="1"/><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>
    `;
    const redoActionForbiddenIconSVG = `
        <!--Icon by contributors from https://lucide.dev/icons/redo-dot, licensed under https://lucide.dev/license-->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${userProfileExport.mainUserSettings.windows.button.primary.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-redo-dot-icon lucide-redo-dot"><circle cx="12" cy="17" r="1"/><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/><path stroke-width="4" stroke="${userProfileExport.mainUserSettings.windows.button.danger.backgroundColor}" d="M 0 1 L 30 24"/></svg>
    `;
    const filterActionTriggerIconSVG = `
        <!--Icon by contributors from https://lucide.dev/icons/chevrons-right, licensed under https://lucide.dev/license-->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${userProfileExport.mainUserSettings.windows.button.primary.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevrons-right-icon lucide-chevrons-right"><path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/></svg>
    `;
    const deleteAllActionNoActionsIconSVG = `
        <!--Icon by contributors from https://lucide.dev/icons/trash-2, licensed under https://lucide.dev/license. Modified by YuraCodedCircuit-->
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="-2 0 27 21" fill="none" stroke="${userProfileExport.mainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2"><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M 8.4151 1.6963 L 8.6285 0.1782 C 8.7677 -0.8121 9.8972 -1.6632 10.8874 -1.524 L 14.8485 -0.9673 C 15.8387 -0.8282 16.6898 0.3013 16.5507 1.2916 L 16.2101 3.7147 M 21.0973 4.96 L 3.5509 0.4744"/></svg>
    `;
    const deleteAllActionIconSVG = `
        <!--Icon by contributors from https://lucide.dev/icons/trash-2, licensed under https://lucide.dev/license-->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${userProfileExport.mainUserSettings.windows.button.danger.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2-icon lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
    `;
    const sortAllActionByGroupIconSVG = `
        <!--Icon by contributors from https://lucide.dev/icons/group, licensed under https://lucide.dev/license-->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${userProfileExport.mainUserSettings.windows.button.primary.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-group-icon lucide-group"><path d="M3 7V5c0-1.1.9-2 2-2h2"/><path d="M17 3h2c1.1 0 2 .9 2 2v2"/><path d="M21 17v2c0 1.1-.9 2-2 2h-2"/><path d="M7 21H5c-1.1 0-2-.9-2-2v-2"/><rect width="7" height="5" x="7" y="7" rx="1"/><rect width="7" height="5" x="10" y="12" rx="1"/></svg>
    `;
    const sortAllActionByTimestampDescendingIconSVG = `
        <!--Icon by contributors from https://lucide.dev/icons/clock-arrow-down, licensed under https://lucide.dev/license-->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${userProfileExport.mainUserSettings.windows.button.primary.font.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock-arrow-down-icon lucide-clock-arrow-down"><path d="M12.338 21.994A10 10 0 1 1 21.925 13.227"/><path d="M12 6v6l2 1"/><path d="m14 18 4 4 4-4"/><path d="M18 14v8"/></svg>
    `;
    const filtersForActions = {
        created: true,
        edited: true,
        deleted: true,
        moved: true,
        copied: true,
        duplicated: true,
        showBookmarks: true,
        showFolders: true,
        groupSameId: true,
    }
    const arrayOfActions = [
        {
            title: 'Created',
            idName: 'Created',
            type: 'created',
            status: true,
        },
        {
            title: 'Edited',
            idName: 'Edited',
            type: 'edited',
            status: true,
        },
        {
            title: 'Deleted',
            idName: 'Deleted',
            type: 'deleted',
            status: true,
        },
        {
            title: 'Duplicated',
            idName: 'Duplicated',
            type: 'duplicated',
            status: true,
        },
        {
            title: 'Moved',
            idName: 'Moved',
            type: 'moved',
            status: true,
        },
    ];
    let actionsArray = [];

    /**
     * Load or save actions data to IndexedDB.
     * @param {string} status - The action to perform. Can be 'load' or 'save'.
     * @param {Array} data - The array of actions to save. Required only for the 'save' action.
     * @returns {Promise<boolean>} - Returns true if data is successfully saved or loaded, false otherwise.
     */
    const loadSaveActions = async (status, data) => {
        if (status === 'load') {
            const ifExist = await indexedDBManipulation('has', 'undoActions');
            if (ifExist) {
                actionsArray = await indexedDBManipulation('get', 'undoActions');
                if (!Array.isArray(actionsArray)) {
                    actionsArray = [];
                }
                return actionsArray.length > 0;
            }
        } else if (status === 'save') {
            const saveStatus = await indexedDBManipulation('save', 'undoActions', data);
            if (!saveStatus) {
                showMessageToastify('error', '', `Failed to save information for undo`, 3000, false, 'bottom', 'right', true);
            }
            return saveStatus;
        }
    }

    /**
     * Function to modify an array by ensuring its length and adding an item.
     * @param {Array} array - The array to modify.
     * @param {Object} item - The object to push at the beginning of the array.
     * @param {number} length - The maximum allowed length of the array.
     * @returns {Array} - The modified array.
     */
    const modifyArray = (array, item, length) => {
        // Validate input parameters
        if (!Array.isArray(array)) {
            throw new Error("Invalid input: 'array' must be an array.");
        }
        if (typeof length !== 'number' || length < 0) {
            throw new Error("Invalid input: 'length' must be a non-negative number.");
        }

        // Remove items from the end of the array until its length is same or less than 'length'
        while (array.length >= length) {
            array.pop(); // Remove the last item
        }
        console.log(array.length);

        // Add the new item at the beginning of the array
        array.unshift(item);

        // Return the modified array
        return array;
    };

    /**
     * Adds an action to the undo manager.
     * @param {Object} item - The object that contains information about the action.
     * @returns {Promise<boolean>} - Returns true if the action is successfully added, false otherwise.
     */
    const addAction = async (item) => {
        if (isObjectEmpty(item)) {
            console.error('Object item must not be empty', item);
            return false;
        }

        if (!['created', 'edited', 'deleted', 'duplicated', 'moved'].includes(item.type)) {
            console.error(`Wrong action type. Must be only 'created,' 'edited,' 'deleted,' 'duplicated,' 'moved.' But get type:`, item.type);
            return false;
        }

        if (isObjectEmpty(item.item)) {
            console.error(`Object 'item' in the item must be not empty`, item.item);
            return false;
        }

        if (userProfileExport.mainUserSettings.main.undoManager.maxLength === 0) {
            actionsArray = [];
            await loadSaveActions('save', actionsArray);
            return false;
        }

        if (!userProfileExport.mainUserSettings.main.undoManager.status) {
            return false;
        }

        await loadSaveActions('load');
        actionsArray = modifyArray(actionsArray, item, userProfileExport.mainUserSettings.main.undoManager.maxLength);
        const status = await loadSaveActions('save', actionsArray);
        return status;
    }

    /**
     * Deletes an action by its ID from the actions array and saves the updated array.
     * @param {string} id - The ID of the action to be deleted.
     * @returns {Promise<void>} - A promise that resolves when the action is deleted and saved.
     */
    const deleteActionById = async (id) => {
        actionsArray = actionsArray.filter(item => item.id !== id);
        const status = await loadSaveActions('save', actionsArray);
        return status;
    }

    /**
     * Sorts the array of actions by timestamp or bookmark ID.
     * @param {Array} array - The array of actions to sort.
     * @param {string} sortBy - The type of sorting. Can be 'timestamp' or 'bookmark'.
     * @returns {Array} - The sorted array of actions.
     */
    const sortActionsInArray = (array, sortBy) => {
        const timestampSortedEvents = [...array].sort((a, b) => b.timestamp - a.timestamp);
        const updatedEventsMap = new Map();

        for (const event of timestampSortedEvents) {
            const itemId = event.item.id;
            if (!updatedEventsMap.has(itemId)) {
                updatedEventsMap.set(itemId, []);
            }
            updatedEventsMap.get(itemId).push({ ...event });
        }

        const finalEvents = [];
        for (const [itemId, itemEvents] of updatedEventsMap) {
            if (itemEvents.length > 0) {
                itemEvents[0].disabledUndo = false;
                itemEvents[0].disabledRedo = true;
                for (let i = 1; i < itemEvents.length; i++) {
                    itemEvents[i].disabledUndo = true;
                    itemEvents[i].disabledRedo = true;
                }
            }
            finalEvents.push(...itemEvents);
        }

        if (sortBy === 'timestamp') {
            return timestampSortedEvents.map(event => {
                const itemId = event.item.id;
                const itemEvents = finalEvents.filter(e => e.item.id === itemId);
                const latestEvent = itemEvents[0];
                const updatedEvent = finalEvents.find(e => e.id === event.id);
                return updatedEvent || event;
            });
        } else if (sortBy === 'bookmark') {
            const bookmarkSortedEvents = [];
            const seenBookmarks = new Set();
            for (const event of timestampSortedEvents) {
                const itemId = event.item.id;
                if (!seenBookmarks.has(itemId)) {
                    const itemEvents = finalEvents.filter(e => e.item.id === itemId);
                    bookmarkSortedEvents.push(...itemEvents);
                    seenBookmarks.add(itemId);
                }
            }
            return bookmarkSortedEvents;
        }

        return timestampSortedEvents.map(event => {
            const itemId = event.item.id;
            const itemEvents = finalEvents.filter(e => e.item.id === itemId);
            const latestEvent = itemEvents[0];
            const updatedEvent = finalEvents.find(e => e.id === event.id);
            return updatedEvent || event;
        });
    }

    /**
     * Handles undo and redo actions for the given event ID.
     * @param {string} eventId - The ID of the event to handle.
     * @param {string} action - The action to perform: 'undo' or 'redo'.
     * @param {Array<Object>} events - The array of events.
     * @returns {Array<Object>} The updated array of events.
     */
    const handleUndoRedo = (eventId, action, events) => {
        const eventToHandle = events.find(e => e.id === eventId);
        if (!eventToHandle) {
            return events;
        }

        const bookmarkId = eventToHandle.item.id;
        const tempEvents = events
            .filter(e => e.item.id === bookmarkId)
            .sort((a, b) => b.timestamp - a.timestamp);

        const currentEventIndexInTemp = tempEvents.findIndex(e => e.id === eventId);

        if (currentEventIndexInTemp === -1) {
            return events;
        }

        const updatedTempEvents = tempEvents.map(e => ({ ...e }));

        if (action === 'undo') {
            const currentEvent = updatedTempEvents[currentEventIndexInTemp];
            currentEvent.disabledUndo = true;
            currentEvent.disabledRedo = false;
            currentEvent.delete = true;

            if (currentEventIndexInTemp > 0) {
                updatedTempEvents[currentEventIndexInTemp - 1].disabledUndo = true;
                updatedTempEvents[currentEventIndexInTemp - 1].disabledRedo = true;
                updatedTempEvents[currentEventIndexInTemp - 1].delete = true;
            }

            if (currentEventIndexInTemp < updatedTempEvents.length - 1) {
                updatedTempEvents[currentEventIndexInTemp + 1].disabledUndo = false;
                updatedTempEvents[currentEventIndexInTemp + 1].disabledRedo = true;
                updatedTempEvents[currentEventIndexInTemp + 1].delete = false;
            }

            for (let i = 0; i < currentEventIndexInTemp - 1; i++) {
                updatedTempEvents[i].disabledUndo = true;
                updatedTempEvents[i].disabledRedo = true;
                updatedTempEvents[i].delete = true;
            }

            for (let i = currentEventIndexInTemp + 2; i < updatedTempEvents.length; i++) {
                updatedTempEvents[i].disabledUndo = true;
                updatedTempEvents[i].disabledRedo = true;
                updatedTempEvents[i].delete = false;
            }
        } else if (action === 'redo') {
            const currentEvent = updatedTempEvents[currentEventIndexInTemp];
            currentEvent.disabledUndo = false;
            currentEvent.disabledRedo = true;
            currentEvent.delete = false;

            if (currentEventIndexInTemp > 0) {
                updatedTempEvents[currentEventIndexInTemp - 1].disabledUndo = true;
                updatedTempEvents[currentEventIndexInTemp - 1].disabledRedo = false;
                updatedTempEvents[currentEventIndexInTemp - 1].delete = true;
            }

            if (currentEventIndexInTemp < updatedTempEvents.length - 1) {
                updatedTempEvents[currentEventIndexInTemp + 1].disabledUndo = true;
                updatedTempEvents[currentEventIndexInTemp + 1].disabledRedo = true;
                updatedTempEvents[currentEventIndexInTemp + 1].delete = false;
            }

            for (let i = 0; i < currentEventIndexInTemp - 1; i++) {
                updatedTempEvents[i].disabledUndo = true;
                updatedTempEvents[i].disabledRedo = true;
                updatedTempEvents[i].delete = false;
            }

            for (let i = currentEventIndexInTemp + 2; i < updatedTempEvents.length; i++) {
                updatedTempEvents[i].disabledUndo = true;
                updatedTempEvents[i].disabledRedo = true;
                updatedTempEvents[i].delete = false;
            }
        }

        const finalEvents = events.map(event => {
            const updatedTempEvent = updatedTempEvents.find(tempEvent => tempEvent.id === event.id);
            if (updatedTempEvent) {
                return updatedTempEvent;
            }
            return event;
        });

        return finalEvents;
    }

    /**
     * Highlights the latest allowed undo item in the UI.
     * @param {string|Event} data - The ID of the item to highlight, or an event object.
     */
    const highlightLatestAllowedUndoItem = (data) => {
        let id;
        if (typeof data === 'string') {
            id = data;
        } else if (typeof data === 'object' && data.target instanceof HTMLElement) {
            id = data.target.dataset.item;
        }
        const latest = actionsArray.filter(item => (item.item.id === id) && !item.disabled)[0];
        const actionItemBoxElByTimestamp = document.querySelector(`.actionItemBox[data-timestamp="${latest.timestamp}"]`);
        const backgroundColor = actionItemBoxElByTimestamp.style.backgroundColor;

        gsap.to(actionItemBoxElByTimestamp, {
            duration: .2,
            backgroundColor: userProfileExport.mainUserSettings.windows.button.danger.backgroundColor,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
                gsap.killTweensOf(actionItemBoxElByTimestamp);
                gsap.set(actionItemBoxElByTimestamp, { clearProps: 'all' });
                actionItemBoxElByTimestamp.style.backgroundColor = backgroundColor;
            }
        });
    }

    /**
     * Highlights the allowed redo item in the UI.
     * @param {string} actionId - The ID of the action to highlight.
     */
    const highlightAllowedRedoItem = (actionId) => {
        const actionItem = actionsArray.find(item => item.id === actionId);
        const foundItem = actionsArray.find(item => item.item.id === actionItem.item.id && !item.disabledRedo);
        const confirmationToRedoActionElById = document.querySelector(`.confirmationToRedoAction[data-id="${foundItem.id}"]`);
        const backgroundColor = confirmationToRedoActionElById.style.backgroundColor;
        const confirmationToRedoActionElArray = document.querySelectorAll('.confirmationToRedoAction');

        gsap.to(confirmationToRedoActionElById, {
            duration: .2,
            backgroundColor: userProfileExport.mainUserSettings.windows.button.danger.backgroundColor,
            yoyo: true,
            repeat: 5,
            onComplete: () => {
                confirmationToRedoActionElById.style.backgroundColor = backgroundColor;
                confirmationToRedoActionElById.display = 'flex';
            }
        });
        confirmationToRedoActionElArray.forEach((el, index) => {
            if (index % 2) {
                el.style.backgroundColor = colorPalette[0];
            } else {
                el.style.backgroundColor = colorPalette[2];
            }
        });
    }

    /**
     * Closes the Undo Manager UI.
     * This function hides the UI elements and clears their HTML content, effectively closing the UI.
     */
    const closeUndoManagerUi = () => {
        uiElementsContainerEl.style.display = 'none'; // Hide the UI elements
        uiElementsContainerEl.innerHTML = '';
    }

    /**
     * Shows the warning before turning off the Undo Manager.
     * This function creates a dialog box with a title and a message, asking the user if they are sure they want to turn off the Undo Manager.
     * If the user clicks yes, the undoManagerLeftSectionMiddleTurnUndoOffToggleEl is unchecked, the Undo Manager status is set to false, and the warningBeforeTurnOffEl is hidden.
     * If the user clicks no, the warningBeforeTurnOffEl is hidden.
     */
    const showWarningBeforeTurnOff = () => {
        const warningBeforeTurnOffEl = document.getElementById('warningBeforeTurnOff');
        const dialogTitleObject = {
            deleteAction: {
                title: currentLanguageTextObj?._undoManager?._turnOffUndoManagerDialog?.title || 'Are you sure you want to turn off?',
                message: currentLanguageTextObj?._undoManager?._turnOffUndoManagerDialog?.message || `Press 'Yes' to save your settings. Press 'No' to keep your current settings.`,
                buttons: {
                    yes: currentLanguageTextObj?._undoManager?._turnOffUndoManagerDialog?._buttons?.yes || 'yes',
                    no: currentLanguageTextObj?._undoManager?._turnOffUndoManagerDialog?._buttons?.no || 'no'
                }
            }
        };
        const warningBeforeDeleteAllActionsElHtml = `
            <div id="confirmationToTurnOffBox" style="background-color: ${colorPalette[2]}; box-shadow: 0 4px 10px ${userProfileExport.mainUserSettings.windows.window.font.color}20;">
                <div id="confirmationTurnOffMessage">
                    <div id="confirmationTurnOffMessageTitle">${dialogTitleObject.deleteAction.title}</div>
                    <div id="confirmationTurnOffMessageText">${dialogTitleObject.deleteAction.message}</div>
                </div>
                <div id="confirmationTurnOffButtons">
                    <button id="confirmationDoNotTurnOff">${dialogTitleObject.deleteAction.buttons.no}</button>
                    <button id="confirmationTurnOff">${dialogTitleObject.deleteAction.buttons.yes}</button>
                </div>
            </div>
        `;
        warningBeforeTurnOffEl.innerHTML = warningBeforeDeleteAllActionsElHtml;

        /**
         * Sets the default styles for the warning before turning off the Undo Manager.
         * @private
         */
        const setDefaultStylesToWarningBeforeTurnOff = () => {
            const confirmationDoNotTurnOffEl = document.getElementById('confirmationDoNotTurnOff');
            const confirmationTurnOffEl = document.getElementById('confirmationTurnOff');

            warningBeforeTurnOffEl.style.display = 'flex';
            warningBeforeTurnOffEl.style.backgroundColor = colorPalette[1];

            confirmationDoNotTurnOffEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
            Object.assign(confirmationDoNotTurnOffEl.style, userProfileExport.mainUserSettings.windows.button.secondary.font);

            confirmationTurnOffEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
            Object.assign(confirmationTurnOffEl.style, userProfileExport.mainUserSettings.windows.button.primary.font);
        }
        setDefaultStylesToWarningBeforeTurnOff();

        /**
         * Adds event listeners to the warning before turning off the Undo Manager.
         * @function addEventListenersToWarningBeforeTurnOff
         * @private
         */
        const addEventListenersToWarningBeforeTurnOff = () => {
            const undoManagerLeftSectionMiddleTurnUndoOffToggleEl = document.getElementById('undoManagerLeftSectionMiddleTurnUndoOffToggle');
            const confirmationDoNotTurnOffEl = document.getElementById('confirmationDoNotTurnOff');
            const confirmationTurnOffEl = document.getElementById('confirmationTurnOff');

            const doNotTurnOffUndoManagerHandle = () => {
                undoManagerLeftSectionMiddleTurnUndoOffToggleEl.checked = true;
                userProfileExport.mainUserSettings.main.undoManager.status = true;
                warningBeforeTurnOffEl.style.display = 'none';
                warningBeforeTurnOffEl.innerHTML = '';
            }

            const doNotTurnOffMouseEnter = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.hoverBackgroundColor;
            }

            const doNotTurnOffMouseLeave = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
            }

            const turnOffUndoManagerHandle = async () => {
                undoManagerLeftSectionMiddleTurnUndoOffToggleEl.checked = false;
                userProfileExport.mainUserSettings.main.undoManager.status = false;
                actionsArray = [];
                await loadSaveActions('save', actionsArray);
                closeUndoManagerUi();
                // Save the current user bookmarks to local storage and show a success or error message.
                await manageUserProfiles('save');
            }

            const turnOffHandleMouseEnter = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.hoverBackgroundColor;
            }

            const turnOffHandleMouseLeave = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
            }

            confirmationDoNotTurnOffEl.addEventListener('click', doNotTurnOffUndoManagerHandle);
            confirmationDoNotTurnOffEl.addEventListener('mouseenter', doNotTurnOffMouseEnter);
            confirmationDoNotTurnOffEl.addEventListener('mouseleave', doNotTurnOffMouseLeave);

            confirmationTurnOffEl.addEventListener('click', turnOffUndoManagerHandle);
            confirmationTurnOffEl.addEventListener('mouseenter', turnOffHandleMouseEnter);
            confirmationTurnOffEl.addEventListener('mouseleave', turnOffHandleMouseLeave);
        }
        addEventListenersToWarningBeforeTurnOff();
    }

    /**
     * Shows the warning before deleting all actions.
     * This function creates a dialog box with a title and a message, asking the user if they are sure they want to delete all actions.
     * If the user clicks yes, the actionsArray is cleared, the actionsArray is saved using loadSaveActions, and the warningBeforeDeleteAllActionsEl is hidden.
     * If the user clicks no, the warningBeforeDeleteAllActionsEl is hidden.
     */
    const showWarningBeforeDeleteAllActions = () => {
        const warningBeforeDeleteAllActionsEl = document.getElementById('warningBeforeDeleteAllActions');
        const dialogTitleObject = {
            deleteAction: {
                title: currentLanguageTextObj?._undoManager?._deleteAllActionsDialog?.title || 'Are you sure you want to delete all actions?',
                message: currentLanguageTextObj?._undoManager?._deleteAllActionsDialog?.message || 'It cannot be restored.',
                buttons: {
                    yes: currentLanguageTextObj?._undoManager?._deleteAllActionsDialog?._buttons?.yes || 'yes',
                    no: currentLanguageTextObj?._undoManager?._deleteAllActionsDialog?._buttons?.no || 'no'
                }
            }
        };
        const warningBeforeDeleteAllActionsElHtml = `
            <div id="confirmationToDeleteAllActionsBox" style="background-color: ${colorPalette[2]}; box-shadow: 0 4px 10px ${userProfileExport.mainUserSettings.windows.window.font.color}20;">
                <div id="confirmationDeleteAllActionsMessage">
                    <div id="confirmationDeleteMessageTitle">${dialogTitleObject.deleteAction.title}</div>
                    <div id="confirmationDeleteMessageText">${dialogTitleObject.deleteAction.message}</div>
                </div>
                <div id="confirmationDeleteAllActionsButtons">
                    <button id="confirmationDoNotDeleteActions">${dialogTitleObject.deleteAction.buttons.no}</button>
                    <button id="confirmationDeleteActions">${dialogTitleObject.deleteAction.buttons.yes}</button>
                </div>
            </div>
        `;
        warningBeforeDeleteAllActionsEl.innerHTML = warningBeforeDeleteAllActionsElHtml;

        /**
         * Sets the default styles for the warning dialog shown before deleting all actions.
         * This function applies styles for the dialog and its buttons according to the user's settings.
         */
        const setDefaultStylesToWarningBeforeDeleteAllActions = () => {
            const confirmationDoNotDeleteActionsEl = document.getElementById('confirmationDoNotDeleteActions');
            const confirmationDeleteActionsEl = document.getElementById('confirmationDeleteActions');

            warningBeforeDeleteAllActionsEl.style.display = 'flex';
            warningBeforeDeleteAllActionsEl.style.backgroundColor = colorPalette[1];

            confirmationDoNotDeleteActionsEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.success.backgroundColor;
            Object.assign(confirmationDoNotDeleteActionsEl.style, userProfileExport.mainUserSettings.windows.button.success.font);

            confirmationDeleteActionsEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.danger.backgroundColor;
            Object.assign(confirmationDeleteActionsEl.style, userProfileExport.mainUserSettings.windows.button.danger.font);
        }
        setDefaultStylesToWarningBeforeDeleteAllActions();

        /**
         * Adds event listeners to the "Do not delete all actions" and "Delete all actions" buttons.
         * These buttons are displayed in the warning dialog shown before deleting all actions.
         */
        const addEventListenersToWarningBeforeDeleteAllActions = () => {
            const undoManagerLeftSectionMiddleClearAllActionsButtonEl = document.getElementById('undoManagerLeftSectionMiddleClearAllActionsButton');
            const confirmationDoNotDeleteActionsEl = document.getElementById('confirmationDoNotDeleteActions');
            const confirmationDeleteActionsEl = document.getElementById('confirmationDeleteActions');

            /**
             * Handles the click event of the "Do not delete all actions" button.
             * This function hides the warning dialog and resets its content.
             */
            const doNotDeleteActionsHandle = () => {
                warningBeforeDeleteAllActionsEl.style.display = 'none';
                warningBeforeDeleteAllActionsEl.innerHTML = '';
            }

            /**
             * Handles the mouse enter event for the "Do not delete all actions" button.
             * This function sets the button's background color to the success hover color.
             * @param {MouseEvent} el - The mouse event object.
             */
            const doNotDeleteActionsHandleMouseEnter = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.success.hoverBackgroundColor;
            }

            /**
             * Handles the mouse leave event for the "Do not delete all actions" button.
             * This function sets the button's background color to the success color.
             * @param {MouseEvent} el - The mouse event object.
             */
            const doNotDeleteActionsHandleMouseLeave = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.success.backgroundColor;
            }

            /**
             * Handles the click event of the "Delete all actions" button.
             * This function clears the actions array, saves the changes and updates the undo manager UI.
             * It also hides the warning dialog and resets its content.
             */
            const deleteAllActionsHandle = async () => {
                actionsArray = [];
                await loadSaveActions('save', actionsArray);
                await showUndoManagerUi();
                warningBeforeDeleteAllActionsEl.style.display = 'none';
                warningBeforeDeleteAllActionsEl.innerHTML = '';
                undoManagerLeftSectionMiddleClearAllActionsButtonEl.innerHTML = deleteAllActionNoActionsIconSVG;
            }

            /**
             * Handles the mouse enter event for the "Delete all actions" button.
             * This function sets the button's background color to the danger hover color.
             * @param {MouseEvent} el - The mouse event object.
             */
            const deleteAllActionsHandleMouseEnter = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.danger.hoverBackgroundColor;
            }

            /**
             * Handles the mouse leave event for the "Delete all actions" button.
             * This function sets the button's background color to the danger color.
             * @param {MouseEvent} el - The mouse event object.
             */
            const deleteAllActionsHandleMouseLeave = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.danger.backgroundColor;
            }

            confirmationDoNotDeleteActionsEl.addEventListener('click', doNotDeleteActionsHandle);
            confirmationDoNotDeleteActionsEl.addEventListener('mouseenter', doNotDeleteActionsHandleMouseEnter);
            confirmationDoNotDeleteActionsEl.addEventListener('mouseleave', doNotDeleteActionsHandleMouseLeave);

            confirmationDeleteActionsEl.addEventListener('click', deleteAllActionsHandle);
            confirmationDeleteActionsEl.addEventListener('mouseenter', deleteAllActionsHandleMouseEnter);
            confirmationDeleteActionsEl.addEventListener('mouseleave', deleteAllActionsHandleMouseLeave);
        }
        addEventListenersToWarningBeforeDeleteAllActions();
    }

    /**
     * Deletes all actions marked for deletion and updates the actions array in IndexedDB.
     * @returns {Promise<void>} - A promise that resolves when the actions have been filtered and saved.
     */
    const deleteAllActionByKey = async () => {
        await loadSaveActions('load');
        actionsArray = actionsArray.filter(action => !action.delete);
        const status = await loadSaveActions('save', actionsArray);
        return status;
    }

    /**
     * Updates the status of all the undo buttons in the undo manager UI.
     * For each action in the actions array, this function checks if the action is disabled for undo or redo.
     * If the action is disabled, it sets the button's content to the forbidden icon and sets its background color to the color palette's 9th color.
     * If the action is not disabled, it sets the button's content to the undo or redo icon and sets its background color to the user's setting for the primary or success button.
     * @returns {void}
     */
    const updateUndoButtonsStatus = () => {
        actionsArray.forEach(item => {
            const undoActionEl = document.querySelector(`.undoAction[data-id="${item.id}"]`);
            const actionItemUndoButtonNotAllowedEl = document.querySelector(`.actionItemUndoButtonNotAllowed[data-id="${item.id}"]`);
            const confirmationRedoActionEl = document.querySelector(`.confirmationRedoAction[data-id="${item.id}"]`);

            if (item.disabledRedo) {
                confirmationRedoActionEl.innerHTML = redoActionForbiddenIconSVG;
                confirmationRedoActionEl.style.backgroundColor = colorPalette[9];
            } else {
                confirmationRedoActionEl.innerHTML = redoActionIconSVG;
                confirmationRedoActionEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.success.backgroundColor;
            }
            if (item.disabledUndo) {
                undoActionEl.innerHTML = undoActionForbiddenIconSVG;
                undoActionEl.style.backgroundColor = colorPalette[9];
                actionItemUndoButtonNotAllowedEl.style.display = 'flex';
            } else {
                undoActionEl.innerHTML = undoActionIconSVG;
                undoActionEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                actionItemUndoButtonNotAllowedEl.style.display = 'none';
            }
        });
    }

    /**
     * Handles the redo action for the specified id.
     * @param {string} id - The id of the action to redo.
     * @returns {Promise<void>} - A promise that resolves when the action has been redone.
     */
    const redoAction = async (id) => {
        const item = actionsArray.find(item => item.id === id);

        if (item.type === 'created') {
            const parentFolderObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, item.item.parentId);
            parentFolderObj.children.push(item.item);
        }
        if (item.type === 'edited') {
            const currentBookmarkObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, item.item.id);
            currentBookmarkObj.title = item.item.title;
            currentBookmarkObj.style = item.item.style;
            currentBookmarkObj.url = item.item.url;
        }
        if (item.type === 'deleted') {
            const parentFolderObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, item.item.parentId);
            const objectIndex = parentFolderObj.children.findIndex(x => x.id === item.item.id);
            parentFolderObj.children.splice(objectIndex, 1);
        }
        if (item.type === 'duplicated') {
            const parentFolderObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, item.item.parentId);
            parentFolderObj.children.push(item.item);
        }
        if (item.type === 'moved') {
            const currentParentFolderObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, item.oldObjectParentId);
            const currentObjectIndex = currentParentFolderObj.children.findIndex(x => x.id === item.item.id);
            currentParentFolderObj.children.splice(currentObjectIndex, 1);
            const originalParentFolderObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, item.item.parentId);
            originalParentFolderObj.children.push(item.item);
        }

        actionsArray = handleUndoRedo(item.id, 'redo', actionsArray);
        updateUndoButtonsStatus();
        await loadSaveActions('save', actionsArray);
        // Save the current user bookmarks to local storage and show a success or error message.
        await manageUserProfiles('save');
        // Refresh the current bookmark folder display.
        createCurrentBookmarkFolder();
    }

    /**
     * Handles the undo action for the specified id.
     * @param {string} id - The id of the action to undo.
     * @returns {Promise<void>} - A promise that resolves when the action has been undone.
     */
    const undoAction = async (id) => {
        const item = actionsArray.find(item => item.id === id);

        if (item.type === 'created') {
            const parentFolderObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, item.item.parentId);
            const objectIndex = parentFolderObj.children.findIndex(x => x.id === item.item.id);
            parentFolderObj.children.splice(objectIndex, 1);
        }
        if (item.type === 'edited') {
            const currentBookmarkObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, item.item.id);
            currentBookmarkObj.title = item.originalItem.title;
            currentBookmarkObj.style = item.originalItem.style;
            currentBookmarkObj.url = item.originalItem.url;
        }
        if (item.type === 'deleted') {
            const parentFolderObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, item.item.parentId);
            parentFolderObj.children.push(item.item);
        }
        if (item.type === 'duplicated') {
            const parentFolderObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, item.item.parentId);
            const objectIndex = parentFolderObj.children.findIndex(x => x.id === item.item.id);
            parentFolderObj.children.splice(objectIndex, 1);
        }
        if (item.type === 'moved') {
            const currentParentFolderObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, item.item.parentId);
            const currentObjectIndex = currentParentFolderObj.children.findIndex(x => x.id === item.item.id);
            currentParentFolderObj.children.splice(currentObjectIndex, 1);
            const originalParentFolderObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, item.oldObjectParentId);
            originalParentFolderObj.children.push(item.item);
        }

        actionsArray = handleUndoRedo(item.id, 'undo', actionsArray);
        updateUndoButtonsStatus();
        await loadSaveActions('save', actionsArray);
        // Save the current user bookmarks to local storage and show a success or error message.
        await manageUserProfiles('save');
        // Refresh the current bookmark folder display.
        createCurrentBookmarkFolder();
    }

    /**
     * Shows the undo manager user interface.
     * @returns {Promise<void>} - A promise that resolves when the user interface has been shown.
     */
    const showUndoManagerUi = async () => {
        await deleteAllActionByKey();
        // Create the undo manager user interface.
        const uiElementsContainerElHtml = `
            <div id="undoManager">
                <div id="undoManagerLeftSection">
                <div id="undoManagerLeftSectionTop">
                    <div id="undoManagerLeftSectionTopTitle">Settings & Filters</div>
                </div>
                <div id="undoManagerLeftSectionMiddle">
                    <div id="undoManagerLeftSectionMiddleTurnUndoOff" class="undoManagerLeftSectionMiddleElements">
                        <label class="toggle undoManagerLeftSectionMiddleElementsLabel" id="undoManagerLeftSectionMiddleTurnUndoOffToggleLabel" for="undoManagerLeftSectionMiddleTurnUndoOffToggle">
                            <div id="undoManagerLeftSectionMiddleTurnUndoOffToggleTitle">Undo Manager Is Enabled</div>
                            <input type="checkbox" class="toggleInput" id="undoManagerLeftSectionMiddleTurnUndoOffToggle" checked />
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
                    <div id="undoManagerLeftSectionMiddleFilterActions" class="undoManagerLeftSectionMiddleElements">
                        <div id="undoManagerLeftSectionMiddleFilterActionsTitle" class="undoManagerLeftSectionMiddleElementsLabel">Choose Action Visibility</div>
                        <div id="undoManagerLeftSectionMiddleFilterActionsTrigger">
                            <button id="undoManagerLeftSectionMiddleFilterActionsTriggerButton">${filterActionTriggerIconSVG}</button>
                            <div id="undoManagerLeftSectionMiddleFilterActionsTriggerContent"></div>
                        </div>
                    </div>
                    <div id="undoManagerLeftSectionMiddleShowBookmarks" class="undoManagerLeftSectionMiddleElements">
                        <label class="toggle undoManagerLeftSectionMiddleElementsLabel" id="undoManagerLeftSectionMiddleShowBookmarksToggleLabel" for="undoManagerLeftSectionMiddleShowBookmarksToggle">
                            <div id="undoManagerLeftSectionMiddleShowBookmarksToggleTitle">Bookmarks Visible</div>
                            <input type="checkbox" class="toggleInput" id="undoManagerLeftSectionMiddleShowBookmarksToggle" checked />
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
                    <div id="undoManagerLeftSectionMiddleShowFolders" class="undoManagerLeftSectionMiddleElements">
                        <label class="toggle undoManagerLeftSectionMiddleElementsLabel" id="undoManagerLeftSectionMiddleShowFoldersToggleLabel" for="undoManagerLeftSectionMiddleShowFoldersToggle">
                            <div id="undoManagerLeftSectionMiddleShowFoldersToggleTitle">Folders Visible</div>
                            <input type="checkbox" class="toggleInput" id="undoManagerLeftSectionMiddleShowFoldersToggle" checked />
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
                    <div id="undoManagerLeftSectionMiddleToggleChangeSorting" class="undoManagerLeftSectionMiddleElements">
                        <div id="undoManagerLeftSectionMiddleToggleChangeSortingTitle" class="undoManagerLeftSectionMiddleElementsLabel">${filtersForActions.groupSameId ? 'Choose Sort By Time' : 'Choose Sort By Item'}</div>
                        <div id="undoManagerLeftSectionMiddleToggleChangeSortingButtons">
                            <button id="undoManagerLeftSectionMiddleToggleChangeSortingButton">${filtersForActions.groupSameId ? sortAllActionByTimestampDescendingIconSVG : sortAllActionByGroupIconSVG}</button>
                        </div>
                    </div>
                    <div id="undoManagerLeftSectionMiddleClearAllActions" class="undoManagerLeftSectionMiddleElements">
                        <div id="undoManagerLeftSectionMiddleClearAllActionsTitle" class="undoManagerLeftSectionMiddleElementsLabel">Delete All Actions</div>
                        <div id="undoManagerLeftSectionMiddleClearAllActionsButtons">
                            <button id="undoManagerLeftSectionMiddleClearAllActionsButton">${actionsArray.length === 0 ? deleteAllActionNoActionsIconSVG : deleteAllActionIconSVG}</button>
                        </div>
                    </div>
                </div>
                <div id="undoManagerLeftSectionBottom">
                    <div id="undoManagerLeftSectionBottomClose">
                        <button id="undoManagerLeftSectionBottomCloseButton">Close</button>
                    </div>
                </div>
                </div>
                <div id="undoManagerRightSection">
                    <div id="undoManagerRightSectionActionsList"></div>
                    <div id="warningBeforeDeleteAllActions"></div>
                    <div id="warningBeforeTurnOff"></div>
                </div>
            </div>
        `;
        // Display the UI elements
        uiElementsContainerEl.style.display = 'flex';
        uiElementsContainerEl.innerHTML = uiElementsContainerElHtml;

        /**
         * Sets the styles of the undo manager UI based on the user's settings.
         * @private
         */
        const setStylesToUndoManagerUi = () => {
            const undoManagerEl = document.getElementById('undoManager');
            const undoManagerLeftSectionEl = document.getElementById('undoManagerLeftSection');
            const undoManagerLeftSectionMiddleElementsElArray = document.querySelectorAll('.undoManagerLeftSectionMiddleElements');
            const undoManagerLeftSectionMiddleFilterActionsTriggerButtonEl = document.getElementById('undoManagerLeftSectionMiddleFilterActionsTriggerButton');
            const undoManagerLeftSectionMiddleToggleChangeSortingButtonEl = document.getElementById('undoManagerLeftSectionMiddleToggleChangeSortingButton');
            const undoManagerLeftSectionMiddleClearAllActionsButtonEl = document.getElementById('undoManagerLeftSectionMiddleClearAllActionsButton');
            const undoManagerLeftSectionBottomCloseButtonEl = document.getElementById('undoManagerLeftSectionBottomCloseButton');

            undoManagerEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.window.backgroundColor;
            undoManagerEl.style.borderLeft = `${userProfileExport.mainUserSettings.windows.window.border.left.width}px ${userProfileExport.mainUserSettings.windows.window.border.left.style} ${userProfileExport.mainUserSettings.windows.window.border.left.color}`;
            undoManagerEl.style.borderTop = `${userProfileExport.mainUserSettings.windows.window.border.top.width}px ${userProfileExport.mainUserSettings.windows.window.border.top.style} ${userProfileExport.mainUserSettings.windows.window.border.top.color}`;
            undoManagerEl.style.borderRight = `${userProfileExport.mainUserSettings.windows.window.border.right.width}px ${userProfileExport.mainUserSettings.windows.window.border.right.style} ${userProfileExport.mainUserSettings.windows.window.border.right.color}`;
            undoManagerEl.style.borderBottom = `${userProfileExport.mainUserSettings.windows.window.border.bottom.width}px ${userProfileExport.mainUserSettings.windows.window.border.bottom.style} ${userProfileExport.mainUserSettings.windows.window.border.bottom.color}`;
            undoManagerEl.style.borderRadius = `${userProfileExport.mainUserSettings.windows.window.border.left.radius}px ${userProfileExport.mainUserSettings.windows.window.border.top.radius}px ${userProfileExport.mainUserSettings.windows.window.border.right.radius}px ${userProfileExport.mainUserSettings.windows.window.border.bottom.radius}px`;
            undoManagerEl.style.color = userProfileExport.mainUserSettings.windows.window.font.color;
            undoManagerEl.style.fontFamily = userProfileExport.mainUserSettings.windows.window.font.fontFamily;
            undoManagerEl.style.fontSize = `${userProfileExport.mainUserSettings.windows.window.font.fontSize}px`;
            undoManagerEl.style.fontStyle = userProfileExport.mainUserSettings.windows.window.font.fontStyle;
            undoManagerEl.style.fontWeight = userProfileExport.mainUserSettings.windows.window.font.fontWeight;

            undoManagerLeftSectionEl.style.backgroundColor = colorPalette[0];

            undoManagerLeftSectionMiddleElementsElArray.forEach((el, index) => {
                if (index % 2) {
                    el.style.backgroundColor = colorPalette[1];
                } else {
                    el.style.backgroundColor = colorPalette[2];
                }
            });

            undoManagerLeftSectionMiddleFilterActionsTriggerButtonEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
            undoManagerLeftSectionMiddleToggleChangeSortingButtonEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
            undoManagerLeftSectionMiddleClearAllActionsButtonEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.danger.backgroundColor;
            Object.assign(undoManagerLeftSectionMiddleClearAllActionsButtonEl.style, userProfileExport.mainUserSettings.windows.button.danger.font);
            undoManagerLeftSectionBottomCloseButtonEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
            Object.assign(undoManagerLeftSectionBottomCloseButtonEl.style, userProfileExport.mainUserSettings.windows.button.secondary.font);
        }
        setStylesToUndoManagerUi();

        /**
         * Updates the text content of the search manager UI elements based on the current language settings.
         * @function updateSearchManagerTitlesUI
         */
        const updateUndoManagerTitlesUI = () => {
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
                undoManagerLeftSectionTopTitle: {
                    id: 'undoManagerLeftSectionTopTitle',
                    text: currentLanguageTextObj._undoManager.filters,
                    classNames: []
                },
                undoManagerLeftSectionMiddleFilterActionsTitle: {
                    id: 'undoManagerLeftSectionMiddleFilterActionsTitle',
                    text: currentLanguageTextObj._undoManager.chooseActionVisibility,
                    classNames: []
                },
                undoManagerLeftSectionMiddleToggleChangeSortingTitle: {
                    id: 'undoManagerLeftSectionMiddleToggleChangeSortingTitle',
                    text: filtersForActions.groupSameId ? currentLanguageTextObj._undoManager.chooseSortByTime : currentLanguageTextObj._undoManager.chooseSortByItem,
                    classNames: []
                },
                undoManagerLeftSectionMiddleClearAllActionsTitle: {
                    id: 'undoManagerLeftSectionMiddleClearAllActionsTitle',
                    text: currentLanguageTextObj._undoManager.deleteAllActions,
                    classNames: []
                },
                undoManagerLeftSectionBottomCloseButton: {
                    id: 'undoManagerLeftSectionBottomCloseButton',
                    text: currentLanguageTextObj._undoManager.close,
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
        updateUndoManagerTitlesUI();

        /**
         * Sets the default values for the Undo Manager UI elements.
         * This function updates the UI toggle for enabling/disabling the Undo Manager
         * based on the user's settings and updates the title text accordingly.
         */
        const setDefaultValuesToUndoManagerUi = () => {
            const undoManagerLeftSectionMiddleTurnUndoOffToggleTitleEl = document.getElementById('undoManagerLeftSectionMiddleTurnUndoOffToggleTitle');
            const undoManagerLeftSectionMiddleTurnUndoOffToggleEl = document.getElementById('undoManagerLeftSectionMiddleTurnUndoOffToggle');
            const status = userProfileExport.mainUserSettings.main.undoManager.status;

            undoManagerLeftSectionMiddleTurnUndoOffToggleEl.checked = status;
            if (status) {
                undoManagerLeftSectionMiddleTurnUndoOffToggleTitleEl.innerText = currentLanguageTextObj._undoManager.undoManagerIsEnabled;
            } else {
                undoManagerLeftSectionMiddleTurnUndoOffToggleTitleEl.innerText = currentLanguageTextObj._undoManager.undoManagerIsDisabled;
            }
        }
        setDefaultValuesToUndoManagerUi();

        /**
         * Creates toggle elements for filter actions in the Undo Manager UI.
         * This function dynamically generates toggle switches for each action
         * and updates the UI with the corresponding HTML content.
         */
        const createTogglesElementsForFilterActions = () => {
            const undoManagerLeftSectionMiddleFilterActionsTriggerContentEl = document.getElementById('undoManagerLeftSectionMiddleFilterActionsTriggerContent');
            let undoManagerLeftSectionMiddleFilterActionsTriggerContentElHtml = ``;

            arrayOfActions.forEach(action => {
                const actionTitle = currentLanguageTextObj?._undoManager?._actionsVisibilityTitle[action.type] || action.title;

                undoManagerLeftSectionMiddleFilterActionsTriggerContentElHtml += `
                    <div id="undoManagerLeftSectionMiddleFilterActionsTriggerContent${action.idName}" class="undoManagerLeftSectionMiddleFilterActionsTriggerContentFilters">
                        <label class="toggle" id="undoManagerLeftSectionMiddleFilterActionsTriggerContent${action.idName}ToggleLabel" for="undoManagerLeftSectionMiddleFilterActionsTriggerContent${action.idName}Toggle">
                            <div id="undoManagerLeftSectionMiddleFilterActionsTriggerContent${action.idName}ToggleTitle">${actionTitle}</div>
                            <input type="checkbox" class="toggleInput undoManagerLeftSectionFilterActions" data-type="${action.type}" id="undoManagerLeftSectionMiddleFilterActionsTriggerContent${action.idName}Toggle" ${action.status ? 'checked' : ''} />
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
                `;
            });

            undoManagerLeftSectionMiddleFilterActionsTriggerContentEl.style.backgroundColor = userProfileExport.mainUserSettings.windows.window.backgroundColor;
            undoManagerLeftSectionMiddleFilterActionsTriggerContentEl.innerHTML = undoManagerLeftSectionMiddleFilterActionsTriggerContentElHtml;

            /**
             * Sets alternating styles to filter action toggle elements.
             * This function updates the background color of each filter action toggle
             * element based on its index to create an alternating pattern.
             */
            const setStyleToFilterActionsToggles = () => {
                const undoManagerLeftSectionMiddleFilterActionsTriggerContentFiltersElArray = document.querySelectorAll('.undoManagerLeftSectionMiddleFilterActionsTriggerContentFilters');

                undoManagerLeftSectionMiddleFilterActionsTriggerContentFiltersElArray.forEach((el, index) => {
                    if (index % 2) {
                        el.style.backgroundColor = colorPalette[1];
                    } else {
                        el.style.backgroundColor = colorPalette[2];
                    }
                });
            }
            setStyleToFilterActionsToggles();

            /**
             * Adds event listeners to toggle elements for filter actions.
             * This function attaches 'change' event listeners to each toggle element,
             * allowing the user to filter actions based on their toggle status.
             */
            const addEventListenerToTogglesForFilterActions = () => {
                const undoManagerLeftSectionFilterActionsElArray = document.querySelectorAll('.undoManagerLeftSectionFilterActions');

                const filterActionsArray = (el) => {
                    const toggleType = el.target.dataset.type;
                    const toggleStatus = el.target.checked;
                    filtersForActions[toggleType] = toggleStatus;
                    createUserActionList();
                }

                undoManagerLeftSectionFilterActionsElArray.forEach(el => {
                    el.addEventListener('change', filterActionsArray);
                });
            }
            addEventListenerToTogglesForFilterActions();
        }
        createTogglesElementsForFilterActions();

        /**
         * Creates and displays the user action list in the undo manager UI.
         * This function sorts the actions array, filters actions based on user settings,
         * and generates HTML content to display the actions list.
         * @returns {void}
         */
        const createUserActionList = () => {
            const undoManagerRightSectionActionsListEl = document.getElementById('undoManagerRightSectionActionsList');
            let undoManagerRightSectionActionsListHtml = ``;

            actionsArray = sortActionsInArray(actionsArray, filtersForActions.groupSameId ? 'bookmark' : 'timestamp');
            actionsArray.forEach((action, index) => {
                const filterToShowBookmarkOrFolders = (filtersForActions.showFolders && action.item.type === 'folder') || (filtersForActions.showBookmarks && action.item.type === 'bookmark');
                const allowedActionType = filtersForActions[action.type];
                const backgroundStyle = action.item.style.bookmark.image.backgroundBase64.length === 0 ? `background-color: ${action.item.style.bookmark.color.backgroundColor}` : `background-image: url(${action.item.style.bookmark.image.backgroundBase64})`;
                const itemTypeTitle = action.item.type === 'bookmark' ? currentLanguageTextObj._undoManager._itemsTitles.bookmark || 'Error' : currentLanguageTextObj._undoManager._itemsTitles.folder || 'Error';
                const actionTypeTitle = currentLanguageTextObj?._undoManager?._actionsVisibilityTitle[action.type] || capitalizeString(action.type, 1);
                const dialogTitleObject = {
                    redoAction: {
                        title: currentLanguageTextObj?._undoManager?._undoRedoActionDialog?.title || 'You have undone this action. You can redo it now.',
                        message: currentLanguageTextObj?._undoManager?._undoRedoActionDialog?.message || 'This action will be removed after the UI is closed.',
                    },
                    deleteAction: {
                        title: currentLanguageTextObj?._undoManager?._deleteActionDialog?.title || 'Are you sure you want to delete this action?',
                        message: currentLanguageTextObj?._undoManager?._deleteActionDialog?.message || 'It cannot be restored.',
                        buttons: {
                            yes: currentLanguageTextObj?._undoManager?._deleteActionDialog?._buttons?.yes || 'yes',
                            no: currentLanguageTextObj?._undoManager?._deleteActionDialog?._buttons?.no || 'no'
                        }
                    }
                };

                if (allowedActionType && filterToShowBookmarkOrFolders) {
                    undoManagerRightSectionActionsListHtml += `
                        <div class="actionItemBox" data-id="${action.id}" data-timestamp="${action.timestamp}" style="background-color: ${index % 2 ? colorPalette[0] : colorPalette[2]}">
                            <div class="actionItemContainer">
                                <div class="actionItemBoxAction">
                                    <div class="actionItemBoxActionTitle">${currentLanguageTextObj._undoManager._itemsTitles.action}</div>
                                    <div class="actionItemBoxActionType">${actionTypeTitle}</div>
                                </div>
                                <div class="actionItemDetail" style="background-color: ${action.item.style.bookmark.text.backgroundColor};color: ${action.item.style.bookmark.font.color};">
                                    <div class="actionItemImage" style="${backgroundStyle}"></div>
                                    <div class="actionItemInfo">
                                        <div class="actionItemBoxTitle" data-id="${action.id}">${action.item.title}</div>
                                        <div class="actionItemBoxType">
                                            <div class="actionItemBoxTypeTitle">${currentLanguageTextObj._undoManager._itemsTitles.type}</div>
                                            <div class="actionItemBoxTypeValue">${itemTypeTitle}</div>
                                        </div>
                                        <div class="actionItemBoxTimestamp">
                                            <div class="actionItemBoxTimestampTitle">${currentLanguageTextObj._undoManager._itemsTitles.date}</div>
                                            <div class="actionItemBoxTimestampDate">${formatDateTime(action.timestamp, currentLanguage, 'dateAndTime')}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="actionItemButtons">
                                <div class="actionItemUndoButton">
                                    <button class="undoAction" data-id="${action.id}" data-item="${action.item.id}" data-timestamp="${action.timestamp}">${action.disabledUndo ? undoActionForbiddenIconSVG : undoActionIconSVG}</button>
                                    <div class="actionItemUndoButtonNotAllowed" data-id="${action.id}" data-item="${action.item.id}" data-timestamp="${action.timestamp}" style="display: ${action.disabledUndo ? 'flex' : 'none'}"></div>
                                </div>
                                <div class="actionItemDeleteButton">
                                    <button class="deleteAction" data-id="${action.id}" style="background-color: ${userProfileExport.mainUserSettings.windows.button.danger.backgroundColor}">${deleteActionIconSVG}</button>
                                </div>
                            </div>
                            <div class="confirmationAction confirmationToRedoAction" data-id="${action.id}" style="background-color: ${index % 2 ? colorPalette[0] : colorPalette[1]};">
                                <div class="confirmationActionMessage">
                                    <div class="confirmationActionMessageTitle">${dialogTitleObject.redoAction.title}</div>
                                    <div class="confirmationActionMessageText">${dialogTitleObject.redoAction.message}</div>
                                </div>
                                <div class="confirmationActionButtons">
                                    <button class="confirmationRedoAction" data-id="${action.id}">${redoActionIconSVG}</button>
                                </div>
                            </div>
                            <div class="confirmationAction confirmationToDeleteAction" data-id="${action.id}" style="background-color: ${index % 2 ? colorPalette[0] : colorPalette[1]}">
                                <div class="confirmationActionMessage">
                                    <div class="confirmationActionMessageTitle">${dialogTitleObject.deleteAction.title}</div>
                                    <div class="confirmationActionMessageText">${dialogTitleObject.deleteAction.message}</div>
                                </div>
                                <div class="confirmationActionButtons">
                                    <button class="confirmationDoNotDeleteAction" data-id="${action.id}">${dialogTitleObject.deleteAction.buttons.no}</button>
                                    <button class="confirmationDeleteAction" data-id="${action.id}">${dialogTitleObject.deleteAction.buttons.yes}</button>
                                </div>
                            </div>
                            <div class="confirmationAction disabledAction" data-id="${action.id}" data-timestamp="${action.timestamp}" style="background-color: ${index % 2 ? colorPalette[0] : colorPalette[1]}"></div>
                        </div>
                    `;
                }
            });
            undoManagerRightSectionActionsListEl.innerHTML = undoManagerRightSectionActionsListHtml;

            /**
             * @function setStylesToUserActionList
             * @description Sets the button styles to the buttons in the Undo Manager window based on the user's settings.
             * @private
             */
            const setStylesToUserActionList = () => {
                const undoActionElArray = document.querySelectorAll('.undoAction');
                const deleteActionElArray = document.querySelectorAll('.deleteAction');
                const confirmationRedoActionElArray = document.querySelectorAll('.confirmationRedoAction');
                const confirmationDeleteActionElArray = document.querySelectorAll('.confirmationDeleteAction');
                const confirmationDoNotDeleteActionElArray = document.querySelectorAll('.confirmationDoNotDeleteAction');

                undoActionElArray.forEach(el => {
                    const id = el.dataset.id;
                    const item = actionsArray.find(item => item.id === id);
                    if (item.disabledUndo) {
                        el.style.backgroundColor = colorPalette[9];
                    } else {
                        el.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                    }
                    Object.assign(el.style, userProfileExport.mainUserSettings.windows.button.primary.font);
                });
                deleteActionElArray.forEach(el => {
                    el.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.danger.backgroundColor;
                    Object.assign(el.style, userProfileExport.mainUserSettings.windows.button.danger.font);
                });
                confirmationRedoActionElArray.forEach(el => {
                    const id = el.dataset.id;
                    const item = actionsArray.find(item => item.id === id);
                    if (item.disabledRedo) {
                        el.style.backgroundColor = colorPalette[9];
                    } else {
                        el.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.success.backgroundColor;
                    }
                    Object.assign(el.style, userProfileExport.mainUserSettings.windows.button.success.font);
                });
                confirmationDeleteActionElArray.forEach(el => {
                    el.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.danger.backgroundColor;
                    Object.assign(el.style, userProfileExport.mainUserSettings.windows.button.danger.font);
                });
                confirmationDoNotDeleteActionElArray.forEach(el => {
                    el.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.success.backgroundColor;
                    Object.assign(el.style, userProfileExport.mainUserSettings.windows.button.success.font);
                });
            }
            setStylesToUserActionList();

            /**
            * Truncates text of action item titles if they overflow and applies styles.
            * Adds tooltips to titles if they are truncated.
            */
            const createTruncateTextIfOverflowForItemsTitle = () => {
                const actionItemBoxTitleElArray = document.querySelectorAll('.actionItemBoxTitle');
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
                    maxWidth: '400px'
                }
                const underlineStyle = {
                    textDecorationColor: userProfileExport.mainUserSettings.windows.window.font.color,
                    textDecorationLine: 'underline',
                    textDecorationStyle: 'dotted',
                }

                actionItemBoxTitleElArray.forEach(el => {
                    const itemId = el.dataset.id;
                    const item = actionsArray.find(item => item.id === itemId);
                    const titleLength = truncateTextIfOverflow(el, el.textContent);
                    underlineStyle.textDecorationColor = item.item.style.bookmark.font.color;
                    if (item.item.title.length > titleLength) {
                        Object.assign(el.style, underlineStyle);
                        createTooltip(el, 'top', item.item.title, style);
                    }
                });
            }
            createTruncateTextIfOverflowForItemsTitle();

            /**
             * Adds event listeners to undo and delete action buttons on the user action list.
             * Listens for clicks on the buttons and calls the corresponding functions.
             * @function addEventListenerToUserActionList
             */
            const addEventListenerToUserActionList = () => {
                const undoActionElArray = document.querySelectorAll('.undoAction');
                const actionItemUndoButtonNotAllowedElArray = document.querySelectorAll('.actionItemUndoButtonNotAllowed');
                const deleteActionElArray = document.querySelectorAll('.deleteAction');
                const confirmationRedoActionElArray = document.querySelectorAll('.confirmationRedoAction');
                const confirmationDeleteActionElArray = document.querySelectorAll('.confirmationDeleteAction');
                const confirmationDoNotDeleteActionElArray = document.querySelectorAll('.confirmationDoNotDeleteAction');

                const undoActionButtonHandle = async (el) => {
                    const actionId = el.target.dataset.id;
                    const itemId = el.target.dataset.item;
                    const item = actionsArray.find(item => item.id === actionId);
                    if (item.disabledUndo) {
                        highlightLatestAllowedUndoItem(itemId);
                        return;
                    } else {
                        const confirmationToRedoActionEl = document.querySelector(`.confirmationToRedoAction[data-id="${actionId}"]`);
                        confirmationToRedoActionEl.style.display = 'flex';
                        await undoAction(actionId);
                    }
                }

                const undoActionButtonHandleMouseEnter = (el) => {
                    const actionId = el.target.dataset.id;
                    const item = actionsArray.find(item => item.id === actionId);
                    if (!item.disabledUndo) {
                        el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.hoverBackgroundColor;
                    }
                }

                const undoActionButtonHandleMouseLeave = (el) => {
                    const actionId = el.target.dataset.id;
                    const item = actionsArray.find(item => item.id === actionId);
                    if (!item.disabledUndo) {
                        el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
                    }
                }

                const showConfirmationForDeleteAction = async (el) => {
                    const actionId = el.target.dataset.id;
                    const confirmationToDeleteActionEl = document.querySelector(`.confirmationToDeleteAction[data-id="${actionId}"]`);
                    confirmationToDeleteActionEl.style.display = 'flex';
                }

                const showConfirmationForDeleteActionMouseEnter = (el) => {
                    el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.danger.hoverBackgroundColor;
                }

                const showConfirmationForDeleteActionMouseLeave = (el) => {
                    el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.danger.backgroundColor;
                }

                const redoActionButtonHandle = async (el) => {
                    const actionId = el.target.dataset.id;
                    const item = actionsArray.find(item => item.id === actionId);
                    if (item.disabledRedo) {
                        highlightAllowedRedoItem(actionId);
                    } else {
                        const confirmationToRedoActionEl = document.querySelector(`.confirmationToRedoAction[data-id="${actionId}"]`);
                        confirmationToRedoActionEl.style.display = 'none';
                        redoAction(actionId);
                    }
                }

                const redoActionButtonHandleMouseEnter = (el) => {
                    const actionId = el.target.dataset.id;
                    const item = actionsArray.find(item => item.id === actionId);
                    if (!item.disabledRedo) {
                        el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.success.hoverBackgroundColor;
                    }
                }

                const redoActionButtonHandleMouseLeave = (el) => {
                    const actionId = el.target.dataset.id;
                    const item = actionsArray.find(item => item.id === actionId);
                    if (!item.disabledRedo) {
                        el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.success.backgroundColor;
                    }
                }

                const deleteSelectedAction = async (el) => {
                    const actionId = el.target.dataset.id;
                    const actionItemBoxEl = document.querySelector(`.actionItemBox[data-id="${actionId}"]`);
                    actionItemBoxEl.remove();
                    await deleteActionById(actionId);
                    await showUndoManagerUi();
                }

                const deleteSelectedActionMouseEnter = (el) => {
                    el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.danger.hoverBackgroundColor;
                }

                const deleteSelectedActionMouseLeave = (el) => {
                    el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.danger.backgroundColor;
                }

                const doNotDeleteSelectedAction = (el) => {
                    const actionId = el.target.dataset.id;
                    const confirmationToDeleteActionEl = document.querySelector(`.confirmationToDeleteAction[data-id="${actionId}"]`);
                    confirmationToDeleteActionEl.style.display = 'none';
                }

                const doNotDeleteSelectedActionMouseEnter = (el) => {
                    el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.success.hoverBackgroundColor;
                }

                const doNotDeleteSelectedActionMouseLeave = (el) => {
                    el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.success.backgroundColor;
                }

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
                    maxWidth: '400px'
                }
                actionItemUndoButtonNotAllowedElArray.forEach(el => {
                    createTooltip(el, 'top', `This action not allowed until the latest action for this bookmark must undone.`, style);
                    el.addEventListener('click', highlightLatestAllowedUndoItem);
                });


                undoActionElArray.forEach(el => {
                    el.addEventListener('click', undoActionButtonHandle);
                    el.addEventListener('mouseenter', undoActionButtonHandleMouseEnter);
                    el.addEventListener('mouseleave', undoActionButtonHandleMouseLeave);
                });
                deleteActionElArray.forEach(el => {
                    el.addEventListener('click', showConfirmationForDeleteAction);
                    el.addEventListener('mouseenter', showConfirmationForDeleteActionMouseEnter);
                    el.addEventListener('mouseleave', showConfirmationForDeleteActionMouseLeave);
                });
                confirmationRedoActionElArray.forEach(el => {
                    el.addEventListener('click', redoActionButtonHandle);
                    el.addEventListener('mouseenter', redoActionButtonHandleMouseEnter);
                    el.addEventListener('mouseleave', redoActionButtonHandleMouseLeave);
                });
                confirmationDeleteActionElArray.forEach(el => {
                    el.addEventListener('click', deleteSelectedAction);
                    el.addEventListener('mouseenter', deleteSelectedActionMouseEnter);
                    el.addEventListener('mouseleave', deleteSelectedActionMouseLeave);
                });
                confirmationDoNotDeleteActionElArray.forEach(el => {
                    el.addEventListener('click', doNotDeleteSelectedAction);
                    el.addEventListener('mouseenter', doNotDeleteSelectedActionMouseEnter);
                    el.addEventListener('mouseleave', doNotDeleteSelectedActionMouseLeave);
                });
            }
            addEventListenerToUserActionList();
        }
        createUserActionList();

        /**
         * Adds event listeners to all the UI elements in the Undo Manager.
         * This includes the list of actions, the button to turn off the Undo Manager, the toggle for filter actions in the dropdown menu, and the toggle for showing bookmarks.
         */
        const addEventListenerToUndoManagerUi = () => {
            const undoManagerLeftSectionMiddleTurnUndoOffToggleEl = document.getElementById('undoManagerLeftSectionMiddleTurnUndoOffToggle');
            const undoManagerLeftSectionMiddleTurnUndoOffToggleTitleEl = document.getElementById('undoManagerLeftSectionMiddleTurnUndoOffToggleTitle');
            const undoManagerLeftSectionMiddleFilterActionsTriggerButtonEl = document.getElementById('undoManagerLeftSectionMiddleFilterActionsTriggerButton');
            const undoManagerLeftSectionMiddleFilterActionsTriggerContentEl = document.getElementById('undoManagerLeftSectionMiddleFilterActionsTriggerContent');
            const undoManagerLeftSectionMiddleShowBookmarksToggleEl = document.getElementById('undoManagerLeftSectionMiddleShowBookmarksToggle');
            const undoManagerLeftSectionMiddleShowBookmarksToggleTitleEl = document.getElementById('undoManagerLeftSectionMiddleShowBookmarksToggleTitle');
            const undoManagerLeftSectionMiddleShowFoldersToggleEl = document.getElementById('undoManagerLeftSectionMiddleShowFoldersToggle');
            const undoManagerLeftSectionMiddleShowFoldersToggleTitleEl = document.getElementById('undoManagerLeftSectionMiddleShowFoldersToggleTitle');
            const undoManagerLeftSectionMiddleToggleChangeSortingButtonEl = document.getElementById('undoManagerLeftSectionMiddleToggleChangeSortingButton');
            const undoManagerLeftSectionMiddleClearAllActionsButtonEl = document.getElementById('undoManagerLeftSectionMiddleClearAllActionsButton');
            const undoManagerLeftSectionBottomCloseButtonEl = document.getElementById('undoManagerLeftSectionBottomCloseButton');

            // Function to show a warning before turning off the Undo Manager
            const showWarningBeforeTurnOffToggle = async () => {
                if (!undoManagerLeftSectionMiddleTurnUndoOffToggleEl.checked) {
                    showWarningBeforeTurnOff();
                    undoManagerLeftSectionMiddleTurnUndoOffToggleTitleEl.innerText = currentLanguageTextObj._undoManager.undoManagerIsDisabled;
                } else {
                    const warningBeforeTurnOffEl = document.getElementById('warningBeforeTurnOff');
                    undoManagerLeftSectionMiddleTurnUndoOffToggleTitleEl.innerText = currentLanguageTextObj._undoManager.undoManagerIsEnabled;
                    warningBeforeTurnOffEl.style.display = 'none';
                    warningBeforeTurnOffEl.innerHTML = '';
                    userProfileExport.mainUserSettings.main.undoManager.status = true;
                    // Save the current user bookmarks to local storage and show a success or error message.
                    await manageUserProfiles('save');
                }
            }

            // Function to show or hide the toggle in the dropdown menu for filter actions
            const showFilterActionsToggleElements = () => {
                if (undoManagerLeftSectionMiddleFilterActionsTriggerContentEl.style.display === 'flex') {
                    undoManagerLeftSectionMiddleFilterActionsTriggerContentEl.style.display = 'none';
                } else {
                    undoManagerLeftSectionMiddleFilterActionsTriggerContentEl.style.display = 'flex';
                }
            }

            const showFilterActionsToggleElementsMouseEnter = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.hoverBackgroundColor;
            }

            const showFilterActionsToggleElementsMouseLeave = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
            }

            const hideFilterActionsToggleElements = () => {
                undoManagerLeftSectionMiddleFilterActionsTriggerContentEl.style.display = 'none';
            }

            // Function to change the toggle for showing bookmarks
            const changeToggleToShowBookmarks = (el) => {
                const toggleStatus = el.target.checked;
                if (toggleStatus) {
                    undoManagerLeftSectionMiddleShowBookmarksToggleTitleEl.innerText = currentLanguageTextObj._undoManager.bookmarksVisible;
                } else {
                    undoManagerLeftSectionMiddleShowBookmarksToggleTitleEl.innerText = currentLanguageTextObj._undoManager.bookmarksHidden;
                }
                filtersForActions.showBookmarks = toggleStatus;
                createUserActionList();
            }

            // Function to change the toggle for showing folders
            const changeToggleToShowFolders = (el) => {
                const toggleStatus = el.target.checked;
                if (toggleStatus) {
                    undoManagerLeftSectionMiddleShowFoldersToggleTitleEl.innerText = currentLanguageTextObj._undoManager.foldersVisible;
                } else {
                    undoManagerLeftSectionMiddleShowFoldersToggleTitleEl.innerText = currentLanguageTextObj._undoManager.foldersHidden;
                }
                filtersForActions.showFolders = toggleStatus;
                createUserActionList();
            }

            // Function to change the sorting of the actions
            const changeActionsSorting = async () => {
                filtersForActions.groupSameId = !filtersForActions.groupSameId;
                await showUndoManagerUi();
            }

            const changeEventsSortingMouseEnter = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.hoverBackgroundColor;
            }

            const changeEventsSortingMouseLeave = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
            }

            // Function to clear all actions
            const clearAllActions = () => {
                if (actionsArray.length === 0) {
                    showMessageToastify('info', '', `It looks like your list of actions is currently empty. To add more actions, please interact with your bookmarks or folders.`, 4000, false, 'bottom', 'right', true);
                } else {
                    showWarningBeforeDeleteAllActions();
                }
            }

            const clearAllActionsMouseEnter = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.danger.hoverBackgroundColor;
            }

            const clearAllActionsMouseLeave = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.danger.backgroundColor;
            }

            // Function to close the undo manager UI
            const closeUndoManagerUI = () => {
                undoManager('closeUndoManagerUi');
                deleteAllActionByKey();
            }

            const closeUndoManagerUIButtonMouseEnter = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.hoverBackgroundColor;
            }

            const closeUndoManagerUIButtonMouseLeave = (el) => {
                el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.secondary.backgroundColor;
            }

            undoManagerLeftSectionMiddleTurnUndoOffToggleEl.addEventListener('change', showWarningBeforeTurnOffToggle);
            undoManagerLeftSectionMiddleFilterActionsTriggerButtonEl.addEventListener('click', showFilterActionsToggleElements);
            undoManagerLeftSectionMiddleFilterActionsTriggerButtonEl.addEventListener('mouseenter', showFilterActionsToggleElementsMouseEnter);
            undoManagerLeftSectionMiddleFilterActionsTriggerButtonEl.addEventListener('mouseleave', showFilterActionsToggleElementsMouseLeave);
            undoManagerLeftSectionMiddleFilterActionsTriggerContentEl.addEventListener('mouseleave', hideFilterActionsToggleElements);
            undoManagerLeftSectionMiddleShowBookmarksToggleEl.addEventListener('change', changeToggleToShowBookmarks);
            undoManagerLeftSectionMiddleShowFoldersToggleEl.addEventListener('change', changeToggleToShowFolders);
            undoManagerLeftSectionMiddleToggleChangeSortingButtonEl.addEventListener('click', changeActionsSorting);
            undoManagerLeftSectionMiddleToggleChangeSortingButtonEl.addEventListener('mouseenter', changeEventsSortingMouseEnter);
            undoManagerLeftSectionMiddleToggleChangeSortingButtonEl.addEventListener('mouseleave', changeEventsSortingMouseLeave);
            undoManagerLeftSectionMiddleClearAllActionsButtonEl.addEventListener('click', clearAllActions);
            undoManagerLeftSectionMiddleClearAllActionsButtonEl.addEventListener('mouseenter', clearAllActionsMouseEnter);
            undoManagerLeftSectionMiddleClearAllActionsButtonEl.addEventListener('mouseleave', clearAllActionsMouseLeave);
            undoManagerLeftSectionBottomCloseButtonEl.addEventListener('click', closeUndoManagerUI);
            undoManagerLeftSectionBottomCloseButtonEl.addEventListener('mouseenter', closeUndoManagerUIButtonMouseEnter);
            undoManagerLeftSectionBottomCloseButtonEl.addEventListener('mouseleave', closeUndoManagerUIButtonMouseLeave);

        }
        addEventListenerToUndoManagerUi();
    }

    // if the status is 'addAction' then add the action from the information object to the actions array
    if (status === 'addAction') {
        await addAction(information);
        return;
    }

    // if the status is 'deleteAction' then delete all actions from the actions array
    if (status === 'deleteAction') {
        await deleteAllActionByKey();
        return;
    }

    // if the status is 'closeUndoManagerUi' then close the undo manager UI
    if (status === 'closeUndoManagerUi') {
        closeUndoManagerUi();
        return;
    }

    // if the status is 'showUndoManagerUi' then show the undo manager UI
    if (status === 'showUndoManagerUi') {
        await showUndoManagerUi();
    }

}







