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

"use strict";
let userAllProfiles = {};
let userActiveProfile = {};
let browserTreeBookmarks = [];
let tempBookmarkObject = {};
let syncUserSettings = {};
let disabledSync = false;
let isListenerAdded = false;
let isGettingTab = false;
let sendSyncStatus = false;
let userSelectedStationObject = {};
let userSelectedOnlineRadioManager;
let onlineRadioSeekInterval;
let onlineRadioSeek;
let notifications = {
    clean: false,
    update: false,
    cleanAfter: 5000
};
const allowAlphabetCharactersAndNumbers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const defaultUserBookmarks = [
    {
        dateAdded: 0,
        dateGroupModified: 0,
        lastEdited: 0,
        id: '',
        count: 0,
        index: 0,
        parentId: '',
        title: '',
        type: 'folder',
        url: '',
        style: {},
        children: [],
    },
];
const forbiddenStringArray = ['about:', 'browser:', 'moz-extension:'];

/**
 * Checks if an object is empty.
 *
 * This function determines whether the provided object has no properties. It does this by checking the length
 * of the array returned by Object.keys(), which contains all the enumerable property names of the object.
 *
 * @param {Object} obj - The object to check for emptiness.
 * @returns {boolean} - Returns true if the object has no properties, false otherwise.
 */
const isObjectEmpty = (obj) => Object.keys(obj).length === 0;

/**
 * Manipulates local storage based on the specified action.
 *
 * This function can either save data to local storage or retrieve data from it,
 * depending on the action specified. It uses a try-catch block to handle any errors
 * that may occur during the operation. The function expects three parameters for
 * the 'save' action and two for the 'get', 'has', 'remove', and 'getKeys' actions.
 *
 * @param {string} status - The action to perform. Can be 'save', 'get', 'has', 'remove', or 'getKeys'.
 * @param {string} key - The key under which the data is stored or retrieved. Not required for 'getKeys' action.
 * @param {*} data - The data to be saved. Required only for the 'save' action.
 * @returns {boolean|*|Error} - Returns true if data is successfully saved, the retrieved
 * data for the 'get' action, a boolean for the 'remove' action indicating success,
 * an array of keys for the 'getKeys' action, or an Error object if an error occurs.
 */
const indexedDBManipulation = async (status, key, data) => {
    try {
        localforage.setDriver([localforage.WEBSQL, localforage.INDEXEDDB]);

        const saveDataToIndexedDB = (key, data) => {
            return new Promise((resolve, reject) => {
                localforage.setItem(key, data).then((value) => {
                    resolve(value);
                }).catch((err) => {
                    reject(err);
                });
            })
        }

        const getDataFromIndexedDB = (key) => {
            return localforage.getItem(key).then((value) => {
                if (!isObjectEmpty(value)) {
                    return value;
                }
                return false;
            }).catch((err) => {
            });
        }

        const hasDataInIndexedDB = async (key) => {
            return localforage.getItem(key).then((value) => {
                if (value && !isObjectEmpty(value)) {
                    return true;
                }
                return false;
            }).catch((err) => {
            });
        }

        const removeDataFromIndexedDB = (key) => {
            return localforage.removeItem(key).then(() => {
                return true;
            }).catch((err) => {
                return false;
            });
        }

        const getKeysFromIndexedDB = () => {
            return localforage.keys().then((value) => {
                return value;
            }).catch((err) => {
            });
        }

        switch (status) {
            case 'save':
                return saveDataToIndexedDB(key, data).then(() => {
                    return true;
                }).catch((error) => {
                    return false;
                });
            case 'get':
                return getDataFromIndexedDB(key).then((result) => {
                    return result;
                }).catch((error) => {
                    return false;
                });
            case 'has':
                return getKeysFromIndexedDB().then((result) => {
                    if (result.includes(key)) {
                        return true;
                    }
                    return false;
                }).catch((error) => {
                    console.error(error);
                    return null;
                })
            case 'remove':
                return removeDataFromIndexedDB(key).then(() => {
                    return true;
                }).catch((error) => {
                    console.error(error);
                    return null;
                })
            case 'getKeys':
                return getKeysFromIndexedDB().then((result) => {
                    return result;
                }).catch((error) => {
                    console.error(error);
                    return null;
                })
            default:
                return null;
        }
    } catch (error) {
        console.error('Error: ', error);
        return null;
    }
}

/**
 * Searches for a bookmark by its ID within a nested structure of bookmarks, using a specific key to match.
 *
 * This function recursively searches through a hierarchical structure of bookmarks,
 * each possibly containing a 'children' array of more bookmarks, to find a bookmark
 * with the specified ID. It's designed to work with a nested structure where bookmarks
 * can contain other bookmarks as children, allowing for a deep search through all levels
 * of the hierarchy. The search is performed based on a specific key, typically 'id', to match
 * the desired bookmark.
 *
 * @param {Array} bookmarks - An array of bookmark objects. Each bookmark object may contain
 *                            a property matching the key parameter and optionally a 'children'
 *                            property which is an array of more bookmark objects.
 * @param {string} id - The value to find within the bookmarks, matching against the key.
 * @param {string} key - The key to match the id against within the bookmark objects.
 * @returns {Object|boolean} - Returns the bookmark object with the matching key value if found, otherwise returns false.
 */
const findBookmarkByKey = (bookmarks, id, key = 'id') => {
    for (const bookmark of bookmarks) {
        if (bookmark[key] === id) {
            return bookmark;
        }
        if (Array.isArray(bookmark.children) && bookmark.children.length > 0) {
            const obj = findBookmarkByKey(bookmark.children, id, key);
            if (obj) {
                return obj;
            }
        }
    }
    return false;
}

/**
 * Generates a random ID for an object with a specified length, ensuring uniqueness within a set of bookmarks.
 * @param {number} number The length of the ID to generate. Defaults to 12 if not specified.
 * @returns {string} A unique ID consisting of allowed alphabet characters and numbers.
 */
const generateRandomIdForObj = (number = 12) => {
    let id = ""; // Initialize the id variable to store the generated ID.
    let ifIdIsUnique = undefined; // Variable to check if the generated ID is unique among bookmarks.
    const getId = () => { // Function to generate a random ID.
        id = ""; // Reset id for each generation attempt.
        for (let i = 0; i < number; i++) { // Loop to generate each character of the ID.
            id += allowAlphabetCharactersAndNumbers[Math.floor(Math.random() * allowAlphabetCharactersAndNumbers.length)]; // Append a random character from the allowed set to the id.
        }
        ifIdIsUnique = findBookmarkByKey(userActiveProfile.currentUserBookmarks, id); // Check if the generated ID is unique by searching the bookmarks.
    };
    for (let i = 0; i < 5; i++) { // Attempt to generate a unique ID up to 5 times.
        getId(); // Call the function to generate a new ID.
        if (ifIdIsUnique === undefined) { // If the ID is unique (not found in bookmarks), exit the loop.
            break;
        }
    }
    return id; // Return the generated (and unique) ID.
};

/**
 * Generates a random color in hexadecimal format.
 *
 * This function creates a random color by generating a random integer within the RGB color range
 * (0 to 16777215), converting this integer to a hexadecimal string. It ensures the hexadecimal string
 * is always 6 characters long, padding with leading zeros if necessary, to form a valid hex color code.
 * If the alpha parameter is true, it also generates a random alpha value.
 *
 * @param {boolean} alpha - Optional parameter to indicate if alpha channel is needed.
 * @returns {string} A random color in the format of "#RRGGBB" or "#RRGGBBAA" if alpha is true.
 */
const getRandomColor = (alpha = false) => {
    let random = Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    if (alpha) {
        let randomAlpha = Math.floor(Math.random() * 255).toString(16).padStart(2, '0');
        return `#${random}${randomAlpha}`;
    }
    return `#${random}`;
}

/**
 * Creates a notification with the specified title and message.
 * @param {string} title - The title of the notification.
 * @param {string} message - The message of the notification.
 * @memberof module:background
 */
const showNotification = (title, message) => {
    // Create a notification object
    const notificationOptions = {
        type: "basic", // Type of notification
        iconUrl: browser.runtime.getURL('../icons/extensionsLogo/icon-48.png'), // Path to the icon
        title: title, // Title of the notification
        message: message, // Message of the notification
        priority: 2, // Priority level (0-2)
    };

    // Display the notification
    browser.notifications.create(notificationOptions)
        .then((id) => {
            if (!notifications.clean) {
                return;
            }
            setTimeout(() => {
                browser.notifications.clear(id)
                    .then(() => {
                        console.log("Notification dismissed after timeout.");
                    })
                    .catch((error) => {
                        console.error("Error dismissing notification:", error);
                    });
            }, 3000);
        })
        .catch((error) => {
            console.error("Error displaying notification:", error);
        });
};

const isAnyValueTrue = (statusObject) => {
    return Object.values(statusObject).some(value => value === true);
};

/**
 * Retrieves a tab by its ID and window ID, and waits for its status to change to 'complete'.
 * @param {number} tabId - The ID of the tab to retrieve.
 * @param {number} windowId - The ID of the window containing the tab.
 * @returns {Promise<Object|null>} - A promise that resolves to the tab object if found and fully loaded, or null if not found.
 */
const getTabByIdAndWindowId = async (tabId, windowId) => {
    // Prevent multiple executions
    if (isGettingTab) {
        return null; // or you can return a specific value to indicate ongoing process
    }

    isGettingTab = true; // Set the flag to indicate the function is in progress

    try {
        // Check if the provided IDs are valid numbers
        if (typeof tabId !== 'number' || typeof windowId !== 'number') {
            throw new Error('Invalid tabId or windowId. Both should be numbers.');
        }
        let tabs;

        if (windowId) {
            // Use the tabs API to get all tabs in the specified window
            tabs = await browser.tabs.query({ windowId });
        } else {
            tabs = await browser.tabs.query();
        }

        // Find the tab with the specified tabId
        const tab = tabs.find(t => t.id === tabId);

        // If the tab is not found, return null
        if (!tab) {
            isGettingTab = false; // Reset the flag before returning
            return null;
        }

        // Wait for the tab's status to change to 'complete'
        const loadedTab = await browser.tabs.get(tabId);
        isGettingTab = false; // Reset the flag after the operation is complete
        return loadedTab;
    } catch (error) {
        console.error('Error retrieving tab:', error);
        isGettingTab = false; // Reset the flag in case of an error
        return null; // Return null in case of an error
    }
};

/**
 * Checks if any string in the forbidden array is present at the beginning of the input string.
 * @param {string} inputString - The string to check.
 * @param {Array<string>} forbiddenArray - The array of forbidden strings.
 * @returns {boolean} - Returns false if any forbidden string is found at the start, otherwise true.
 */
const isStringAllowed = (inputString, forbiddenArray) => {
    // Check if the input is a string and the forbiddenArray is an array
    if (typeof inputString !== 'string' || !Array.isArray(forbiddenArray)) {
        throw new Error('Invalid input: inputString must be a string and forbiddenArray must be an array.');
    }

    // Check if any forbidden string is present at the beginning of the input string
    return !forbiddenArray.some(forbiddenString => inputString.startsWith(forbiddenString));
};

class manageUserProfile {
    constructor() {
        this.userProfile = {};
    }

    async _checkProfileExist() {
        const status = await indexedDBManipulation('has', 'userProfile');
        return status;
    }

    async _loadUserProfile() {
        if (!await this._checkProfileExist()) {
            return false;
        }
        await indexedDBManipulation('get', 'userProfile').then((result) => {
            this.userProfile = result;
            userAllProfiles = result;
        }).catch((error) => {
            console.error(error);
            return false;
        });
        return true;
    }

    async getAllProfiles() {
        if (await this._loadUserProfile()) {
            return this.userProfile;
        } else {
            return false;
        }
    }

    async getActiveProfile() {
        let profile = {};
        await this._loadUserProfile();
        if (Array.isArray(this.userProfile.offline) && this.userProfile.offline.length > 0) {
            this.userProfile.offline.forEach(element => {
                if (element.active) {
                    profile = element;
                }
            });
        }
        return profile;
    }

    async saveProfile() {
        this.userProfile = userAllProfiles;
        const status = await indexedDBManipulation('save', 'userProfile', this.userProfile);
        return status;
    }

    async deleteProfileById(id) {
        if (!await this._loadUserProfile()) { return false; }
        if (Array.isArray(this.userProfile.offline) && this.userProfile.offline.length > 0) {
            this.userProfile.offline.forEach((element, index) => {
                if (element.userId === id) {
                    this.userProfile.offline.splice(index, 1);
                }
            });
        }
        return await this.saveProfile();
    }

    async replaceProfileById(id, profile) {
        if (!await this._loadUserProfile()) { return false; }
        if (Array.isArray(this.userProfile.offline) && this.userProfile.offline.length > 0) {
            this.userProfile.offline.forEach((element, index) => {
                if (element.userId === id) {
                    profile.userId = id;
                    this.userProfile.offline.splice(index, 1, profile);
                }
            });
        }
        return await this.saveProfile();
    }

    async updatePartProfileValuesById(id, values = {}) {
        if (!await this._loadUserProfile()) { return false; }
        if (Array.isArray(this.userProfile.offline) && this.userProfile.offline.length > 0) {
            this.userProfile.offline.forEach((element, index) => {
                if (element.userId === id) {
                    const profile = { ...element, ...values }
                    this.userProfile.offline.splice(index, 1, profile);
                }
            });
        }
        return await this.saveProfile();
    }
}

class manageBrowserBookmarks {
    constructor() {
        this.browserBookmarks = [];
    }

    async getBrowserTreeBookmarks() {
        const bookmarks = await browser.bookmarks.getTree();
        this.browserBookmarks = bookmarks;
        browserTreeBookmarks = this.browserBookmarks;
        return this.browserBookmarks;
    }

    async getBrowserChildrenBookmarksById(parentId) {
        if (parentId == undefined || parentId.trim().length == 0) { return false; }
        return await browser.bookmarks.getChildren(parentId);
    }

    async createBrowserBookmark(bookmarkDetails) {
        return await browser.bookmarks.create(bookmarkDetails);
    }

    async deleteBrowserBookmark(id) {
        return await browser.bookmarks.remove(id);
    }

    async updateBrowserBookmark(id, bookmarkDetails) {
        return await browser.bookmarks.update(id, bookmarkDetails);
    }

    async moveBrowserBookmark(id, parentId) {
        return await browser.bookmarks.move(id, parentId);
    }
}

class manageUserBookmarks {
    constructor() {
        this.userBookmarks = [];
        this.defaultBookmark = [];
    }

    async _checkBookmarksExist() {
        const bookmarks = userActiveProfile.currentUserBookmarks;
        if (Array.isArray(bookmarks) && bookmarks.length > 0) {
            return true;
        }
        return false;
    }

    async loadUserBookmarks() {
        const profile = new manageUserProfile();
        const userProfile = await profile.getActiveProfile();
        userActiveProfile = userProfile;
        this.userBookmarks = userActiveProfile.currentUserBookmarks;
        return Array.isArray(this.userBookmarks) && this.userBookmarks.length > 0;
        // return typeof this.userBookmarks === 'object' ? Object.keys(this.userBookmarks).length !== 0 : false;
    }

    async saveUserBookmarks() {
        userActiveProfile.currentUserBookmarks = this.userBookmarks;
        const profile = new manageUserProfile();
        const saveStatus = await profile.saveProfile();
        return saveStatus;
    }

    async getAllBookmarks() {
        let status = await this.loadUserBookmarks();
        if (status === false) { return false; }
        return this.userBookmarks;
    }

    async getBookmarkById(id) {
        if (typeof id !== 'string' && id !== undefined && id !== null && id.trim().length !== 0) { return false; }
        let status = await this.loadUserBookmarks();
        if (status === false) { return false; }
        return findBookmarkByKey(this.userBookmarks, id);
    }

    async replaceBookmarkId(oldId, newId) {
        if (typeof oldId !== 'string' && oldId !== undefined && oldId !== null && oldId.trim().length !== 0) { return false; }
        if (typeof newId !== 'string' && newId !== undefined && newId !== null && newId.trim().length !== 0) { return false; }
        let status = await this.loadUserBookmarks();
        if (status === false) { return false; }
        const bookmark = findBookmarkByKey(this.userBookmarks, oldId);
        if (!isObjectEmpty(bookmark)) {
            bookmark.id = newId;
            status = await this.saveUserBookmarks();
            return status;
        }
        return false;
    }

    async createBookmark(type, parentId, newBookmark) {
        // this.loadUserBookmarks();
        if (!['bookmark', 'folder'].includes(type)) { return false; }
        let createdNewBookmarkObj = {};
        const currentDate = new Date().getTime();
        createdNewBookmarkObj = window.structuredClone(defaultUserBookmarks[0]);
        createdNewBookmarkObj.dateAdded = currentDate;
        createdNewBookmarkObj.dateGroupModified = currentDate;
        createdNewBookmarkObj.lastEdited = currentDate;
        createdNewBookmarkObj.id = newBookmark.id.length === 12 ? newBookmark.id : generateRandomIdForObj();
        createdNewBookmarkObj.title = newBookmark.title;
        createdNewBookmarkObj.url = type == 'folder' ? '' : newBookmark.url;
        createdNewBookmarkObj.type = type;
        createdNewBookmarkObj.style.bookmark = window.structuredClone(userActiveProfile.defaultUserBookmarkStyle);
        createdNewBookmarkObj.style.folder = window.structuredClone(userActiveProfile.defaultUserFolderStyle);
        createdNewBookmarkObj.style.bookmark.color.backgroundColor = getRandomColor();

        const parentObject = await this.getBookmarkById(parentId);
        if (parentObject === false) { return false; }
        if (!isObjectEmpty(parentObject)) {
            createdNewBookmarkObj.parentId = parentObject.id;
            let nextKeyIndex = 0;
            const findNextIndexInParentChild = () => {
                if (!Array.isArray(parentObject.children) || parentObject.children.length === 0) { return; }
                parentObject.children.sort((a, b) => a.index - b.index);
                nextKeyIndex = parentObject.children[parentObject.children.length - 1].index;
                nextKeyIndex++;
            }
            findNextIndexInParentChild();
            createdNewBookmarkObj.index = newBookmark.index === undefined ? nextKeyIndex : newBookmark.index;
            parentObject.children.push(createdNewBookmarkObj);
            const saveStatus = await this.saveUserBookmarks();
            return saveStatus;
        }
        return false;
    }

    async updateBookmarkById(id, bookmarkValues) {
        // this.loadUserBookmarks();
        this.loadUserBookmarks();
        let object = findBookmarkByKey(this.userBookmarks, id);
        if (!isObjectEmpty(object)) {
            object.dateGroupModified = bookmarkValues.dateGroupModified;
            object.lastEdited = bookmarkValues.dateGroupModified;
            object.id = bookmarkValues.id;
            object.title = bookmarkValues.title;
            object.url = bookmarkValues.url;
        }
        const saveStatus = this.saveUserBookmarks();
        return saveStatus;
    }

    deleteBookmarkById(id, parentId) {
        this.loadUserBookmarks();
        if (id === 'root') { return false; }
        let currentFolderObj = findBookmarkByKey(this.userBookmarks, parentId);
        if (!currentFolderObj) { return false; }
        const index = currentFolderObj.children.findIndex(x => x.id === id);
        if (index === -1) { return false; }
        currentFolderObj.children.splice(index, 1);
        userActiveProfile.currentUserBookmarks = this.userBookmarks;
        const saveStatus = this.saveUserBookmarks();
        return saveStatus;
    }

    moveBookmarkById(id, oldParentId, newParentId, index) {
        // this.loadUserBookmarks();
        this.userBookmarks = userActiveProfile.currentUserBookmarks;
        let currentBookmarkObj = findBookmarkByKey(this.userBookmarks, id);
        if (!currentBookmarkObj) { return false; }
        let newFolderObj = findBookmarkByKey(this.userBookmarks, newParentId);
        if (!newFolderObj) { return false; }
        let oldFolderObj = findBookmarkByKey(this.userBookmarks, oldParentId);
        if (!oldFolderObj) { return false; }
        const findIndex = newFolderObj.children.findIndex(x => x.id === id);
        oldFolderObj.children.splice(findIndex, 1);
        currentBookmarkObj.parentId = newFolderObj.id;
        currentBookmarkObj.index = index;
        newFolderObj.children.splice(index, 0, currentBookmarkObj);
        userActiveProfile.currentUserBookmarks = this.userBookmarks;
        const saveStatus = this.saveUserBookmarks();
        return saveStatus;
    }
}

class manageTempBookmarksValues {
    constructor() {
        this.tempBookmarkObject = {};
    }

    async _checkIfTempBookmarksExist() {
        const status = await indexedDBManipulation('has', 'tempBookmarkObject');
        return status;
    }

    async getTempBookmarks() {
        if (!await this._checkIfTempBookmarksExist()) {
            return false;
        }
        await indexedDBManipulation('get', 'tempBookmarkObject').then((result) => {
            this.tempBookmarkObject = result;
            tempBookmarkObject = this.tempBookmarkObject;
        }).catch((error) => {
            console.error(error);
            return false;
        });
        return true;
    }

    async deleteTempBookmarks() {
        if (!await this._checkIfTempBookmarksExist()) {
            return false;
        }
        const status = await indexedDBManipulation('remove', 'tempBookmarkObject');
        return status;
    }
}

const sendDataToMainScript = () => {
    const urlPattern = /^(moz-extension|browser-extension):\/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/index\.html$/i;
    browser.tabs.query({ title: 'Bookmark Manager Pro' }, tabs => {
        const matchingTabs = tabs.filter(tab => urlPattern.test(tab.url));
        if (matchingTabs.length > 0) {
            // Loop through all the matching tabs
            matchingTabs.forEach(tab => {
                // Send a message to each tab
                browser.tabs.sendMessage(tab.id, { saved: true });
            });
        }
    });
}

const getBrowserBookmarkByIdWithPromise = (id) => {
    return new Promise((resolve, reject) => {
        browser.bookmarks.get(id).then(resolve).catch(reject);
    });
};

/**
 * Determines if a bookmark is within the specified folder.
 * This is a special function for the synchronization manager function (syncManager).
 *
 * @param {Object} bookmark - The bookmark object to search within.
 * @param {string} specificFolderId - The ID of the folder to check against.
 * @param {string} bookmarkId - The ID of the bookmark to start the search from.
 * @returns {boolean} - Returns true if the bookmark is within the specified folder, false otherwise.
 */
const isBookmarkInExtensionFolder = (bookmark, specificFolderId, bookmarkId) => {
    // Check if the bookmark is the folder itself
    if (bookmarkId === specificFolderId) {
        return true;
    }

    // Initialize the currentId with the starting bookmarkId
    let currentId = bookmarkId;

    // Traverse up the tree to check if any parent is the specified folder
    while (currentId) {
        if (currentId === specificFolderId) {
            return true;
        }

        // Get the parent bookmark to continue traversing
        const parentExtensionBookmarks = findBookmarkByKey(bookmark, currentId);

        // Update currentId to the parent bookmark's ID
        currentId = parentExtensionBookmarks.parentId;

        // Break the loop if parentBookmark is empty or null
        if (isObjectEmpty(parentExtensionBookmarks) || parentExtensionBookmarks === null) {
            break;
        }
    }
    // Return false if the specified folder is not found
    return false;
};

// Function to check if a bookmark is within the specified folder
const isBookmarkInBrowserFolder = async (bookmark, folderId) => {
    // Check if the bookmark is the folder itself
    if (bookmark.id === folderId) {
        return true;
    }

    // Check if the bookmark has a parent and traverse up the tree
    let currentId = bookmark.parentId;
    while (currentId) {
        if (currentId === folderId) {
            return true;
        }
        // Get the parent bookmark to continue traversing
        const parentBookmark = await getBrowserBookmarkByIdWithPromise(currentId).catch(() => null);
        if (!Array.isArray(parentBookmark) || parentBookmark.length === 0) {
            break; // If no parent found, exit the loop
        }
        currentId = parentBookmark[0].parentId;
    }
    return false;
};

const handleCreated = async (id, bookmark) => {
    if ((!syncUserSettings.synchronizeDirection.browserToExtension && !syncUserSettings.synchronizeDirection.bothDirections)) { return; }
    if (disabledSync) { return; }
    if (!syncUserSettings.status) { return; }
    const userActiveProfileBookmarks = new manageUserBookmarks();
    isBookmarkInBrowserFolder(bookmark, syncUserSettings.browserFolderId).then(async result => {
        if (!result) { return; }
        if (syncUserSettings.browserFolderId === id) { syncFromBrowserToExtensionBookmarksManager(false); return; }
        let parentId = bookmark.parentId;
        if (bookmark.parentId === syncUserSettings.browserFolderId) { parentId = syncUserSettings.extensionFolderId; }
        const createdNewUserBookmark = await userActiveProfileBookmarks.createBookmark(bookmark.type, parentId, { title: bookmark.title, id: id, url: bookmark.url !== undefined ? bookmark.url : '', index: bookmark.index });
        sendDataToMainScript();
    });
}
const handleChanged = async (id, changeInfo) => {
    if ((!syncUserSettings.synchronizeDirection.browserToExtension && !syncUserSettings.synchronizeDirection.bothDirections) || disabledSync) { return; }
    const parentBookmark = await getBrowserBookmarkByIdWithPromise(id).catch(() => null);
    if (!Array.isArray(parentBookmark) || parentBookmark.length === 0) {
        return;
    }
    isBookmarkInBrowserFolder(parentBookmark[0], syncUserSettings.browserFolderId).then(async result => {
        if (!result) { return; }
        const userActiveProfileBookmarks = new manageUserBookmarks();
        const loadNewUserBookmarks = await userActiveProfileBookmarks.loadUserBookmarks();
        const changedUserBookmarks = await userActiveProfileBookmarks.updateBookmarkById(id, { title: parentBookmark[0].title, id: id, url: parentBookmark[0].type === 'bookmark' ? parentBookmark[0].url : '' });
        sendDataToMainScript();
    });
}
const handleRemoved = (id, removeInfo) => {
    if ((!syncUserSettings.synchronizeDirection.browserToExtension && !syncUserSettings.synchronizeDirection.bothDirections) || disabledSync) { return; }
    isBookmarkInBrowserFolder(removeInfo.node, syncUserSettings.browserFolderId).then(async result => {
        if (!result) { return; }
        const userActiveProfileBookmarks = new manageUserBookmarks();
        const loadNewUserBookmarks = await userActiveProfileBookmarks.loadUserBookmarks();
        const removeUserBookmark = await userActiveProfileBookmarks.deleteBookmarkById(id, removeInfo.parentId === syncUserSettings.browserFolderId ? syncUserSettings.extensionFolderId : removeInfo.parentId);
        if (syncUserSettings.browserFolderId === id) {
            const title = "⚠️ Alert";
            const message = "Your synchronization has been disabled because the selected folder in your web browser has been removed.";
            showNotification(title, message);
            syncFromBrowserToExtensionBookmarksManager(false);
        }
        sendDataToMainScript();
    });
}
const handleMoved = (id, moveInfo) => {
    if ((!syncUserSettings.synchronizeDirection.browserToExtension && !syncUserSettings.synchronizeDirection.bothDirections) || disabledSync) { return; }
    isBookmarkInBrowserFolder(moveInfo, syncUserSettings.browserFolderId).then(async result => {
        if (!result) { return; }
        const userActiveProfileBookmarks = new manageUserBookmarks();
        const loadNewUserBookmarks = await userActiveProfileBookmarks.loadUserBookmarks();
        const movedUserBookmark = await userActiveProfileBookmarks.moveBookmarkById(id, moveInfo.oldParentId === syncUserSettings.browserFolderId ? syncUserSettings.extensionFolderId : moveInfo.oldParentId, moveInfo.parentId === syncUserSettings.browserFolderId ? syncUserSettings.extensionFolderId : moveInfo.parentId, moveInfo.index);
        sendDataToMainScript();
    });
}

const syncFromBrowserToExtensionBookmarksManager = async (status = true) => {
    const profile = new manageUserProfile();
    const userProfile = await profile.getActiveProfile();
    userActiveProfile = userProfile;
    syncUserSettings = userProfile.mainUserSettings?.main?.synchronizationToBrowser;
    if (syncUserSettings === undefined||syncUserSettings.status === undefined) {
        console.error('Path not found');
        status = false;
    }

    if (status && syncUserSettings.status && syncUserSettings.browserFolderId.length > 0 && syncUserSettings.extensionFolderId.length > 0 && isAnyValueTrue(syncUserSettings.synchronizeDirection)) {
        const statusArray = [];

        // Helper function to manage event listeners
        const manageListener = (event, handler) => {
            const status = event.hasListener(handler);
            if (!status) {
                event.addListener(handler);
            } else {
                event.removeListener(handler);
                event.addListener(handler);
            }
            statusArray.push(event.hasListener(handler));
        };

        // Manage listeners for each bookmark event
        manageListener(browser.bookmarks.onCreated, handleCreated);
        manageListener(browser.bookmarks.onChanged, handleChanged);
        manageListener(browser.bookmarks.onRemoved, handleRemoved);
        manageListener(browser.bookmarks.onMoved, handleMoved);
        if (statusArray.length === 4) {
            sendSyncStatus = isAnyValueTrue(statusArray);
        }
        console.log('Sync Enabled', sendSyncStatus);
    } else {
        if (syncUserSettings === undefined) { return; }
        userProfile.mainUserSettings.main.synchronizationToBrowser.status = false;
        userProfile.mainUserSettings.main.synchronizationToBrowser.browserFolderId = '';
        userProfile.mainUserSettings.main.synchronizationToBrowser.extensionFolderId = '';
        const updateUserProfile = await profile.updatePartProfileValuesById(userProfile.userId, userProfile);
        const statusArray = [];
        // Helper function to manage event listeners
        const manageListener = (event, handler) => {
            const status = event.hasListener(handler);
            if (status) {
                event.removeListener(handler);
                statusArray.push(event.hasListener(handler));
            }
        };

        // Manage listeners for each bookmark event
        manageListener(browser.bookmarks.onCreated, handleCreated);
        manageListener(browser.bookmarks.onChanged, handleChanged);
        manageListener(browser.bookmarks.onRemoved, handleRemoved);
        manageListener(browser.bookmarks.onMoved, handleMoved);
        if (statusArray.length === 4) {
            sendSyncStatus = !isAnyValueTrue(statusArray);
        }
        console.log('Sync Disabled', sendSyncStatus);
    }
}

const syncFromExtensionToBrowserBookmarksManager = async () => {
    const profile = new manageUserProfile();
    const userProfile = await profile.getActiveProfile();
    userActiveProfile = userProfile;
    syncUserSettings = userProfile.mainUserSettings?.main?.synchronizationToBrowser;
    const tempManager = new manageTempBookmarksValues();
    const tempBookmarks = await tempManager.getTempBookmarks();
    if (!tempBookmarks) {
        console.log('Temp bookmarks not found');
        return;
    }
    await tempManager.deleteTempBookmarks();
    if (!syncUserSettings.status) {
        console.log('Sync disabled');
        return;
    }
    if (tempBookmarkObject.id.length === 0 && tempBookmarkObject.parentId.length === 0) {
        console.log('Wrong bookmark id or parent id');
        return;
    }
    if (!['create', 'update', 'delete', 'move'].includes(tempBookmarkObject.status)) {
        console.log('Wrong status', tempBookmarkObject.status);
        return;
    }

    const userActiveProfileBookmarks = new manageUserBookmarks();
    await userActiveProfileBookmarks.loadUserBookmarks();
    if (!syncUserSettings.synchronizeDirection.bothDirections && !syncUserSettings.synchronizeDirection.extensionToBrowser) {
        console.log('Sync to browser not allowed');
        return;
    }
    if (!Array.isArray(userActiveProfile.currentUserBookmarks) && userActiveProfile.currentUserBookmarks.length === 0) {
        console.log('User bookmarks not found');
        return;
    }
    // check if the bookmarkId in the syncRootFolderId
    const statusFolder = isBookmarkInExtensionFolder(userActiveProfile.currentUserBookmarks, tempBookmarkObject.parentId === syncUserSettings.browserFolderId ? syncUserSettings.extensionFolderId : tempBookmarkObject.parentId, tempBookmarkObject.id);
    if (!statusFolder && tempBookmarkObject.status !== 'delete') {
    } else {
        disabledSync = true;
        const browserBookmark = new manageBrowserBookmarks();
        switch (tempBookmarkObject.status) {
            case 'create':
                const bookmarkDetails = {
                    title: tempBookmarkObject.title,
                    url: tempBookmarkObject.url,
                    parentId: tempBookmarkObject.parentId
                };
                const createBrowserBookmark = await browserBookmark.createBrowserBookmark(bookmarkDetails);
                try {
                    const changeIdForNewUserBookmarks = await userActiveProfileBookmarks.replaceBookmarkId(tempBookmarkObject.id, createBrowserBookmark.id);
                } catch (error) {
                    console.error('changeIdForNewUserBookmarks', error);
                }
                sendDataToMainScript();
                break;
            case 'update':
                const updateDetails = {
                    title: tempBookmarkObject.title,
                    url: tempBookmarkObject.url,
                };
                try {
                    const updateBrowserBookmark = await browserBookmark.updateBrowserBookmark(tempBookmarkObject.id, updateDetails);
                } catch (error) {
                    console.error("Error editing bookmark:", error);
                }
                break;
            case 'delete':
                const removeFolderRecursively = async (folderId) => {
                    try {
                        // Step 1: Get the contents of the folder
                        const children = await browser.bookmarks.getChildren(folderId);

                        // Step 2: Remove each child (bookmark or folder)
                        for (const child of children) {
                            if (child.children && child.children.length > 0) {
                                // If the child is a folder, call this function recursively
                                await removeFolderRecursively(child.id);
                            }
                            // Remove the bookmark or empty folder
                            await browser.bookmarks.remove(child.id);
                        }

                        // Step 3: Remove the empty folder itself
                        await browser.bookmarks.remove(folderId);
                    } catch (error) {
                        console.error('Error removing folder:', error);
                    }
                };
                removeFolderRecursively(tempBookmarkObject.id);
                break;
            case 'move':
                const moveDetails = {
                    parentId: tempBookmarkObject.parentId,
                    index: tempBookmarkObject.index ? tempBookmarkObject.index : null
                };
                try {
                    const moveBrowserBookmark = await browserBookmark.moveBrowserBookmark(tempBookmarkObject.id, moveDetails);
                } catch (error) {
                    console.error("Error moving bookmark:", error);
                }
                break;
        }
        disabledSync = false;
    }
}

const firstSync = async () => {
    let status = true;
    const browserBookmark = new manageBrowserBookmarks();
    const profile = new manageUserProfile();
    const userProfile = await profile.getActiveProfile();
    const userBookmark = new manageUserBookmarks();
    userActiveProfile = userProfile;
    syncUserSettings = userProfile.mainUserSettings?.main?.synchronizationToBrowser;
    if (syncUserSettings === undefined || syncUserSettings.status === undefined) {
        console.error('Path not found');
        status = false;
        return;
    }

    const checkingNewBookmarkFromBrowserToExtension = async (browserBookmarks) => {
        // Iterate through each item in the default bookmarks
        for await (const bookmark of browserBookmarks) {
            const bookmarkId = bookmark.id;
            const checkBookmark = findBookmarkByKey(userActiveProfile.currentUserBookmarks, bookmarkId);
            if (checkBookmark === false) {
                let createdNewBookmarkObj = {};
                createdNewBookmarkObj = window.structuredClone(defaultUserBookmarks[0]);
                createdNewBookmarkObj.dateAdded = bookmark.dateAdded;
                createdNewBookmarkObj.dateGroupModified = bookmark.dateGroupModified;
                createdNewBookmarkObj.lastEdited = bookmark.dateAdded;
                createdNewBookmarkObj.id = bookmark.id;
                createdNewBookmarkObj.title = bookmark.title;
                createdNewBookmarkObj.type = bookmark.type;
                createdNewBookmarkObj.url = bookmark.type == 'folder' ? '' : bookmark.url;
                createdNewBookmarkObj.style.bookmark = window.structuredClone(userActiveProfile.defaultUserBookmarkStyle);
                createdNewBookmarkObj.style.folder = window.structuredClone(userActiveProfile.defaultUserFolderStyle);
                createdNewBookmarkObj.style.bookmark.color.backgroundColor = getRandomColor();
                createdNewBookmarkObj.index = bookmark.index;

                const parentId = bookmark.parentId === syncUserSettings.browserFolderId ? syncUserSettings.extensionFolderId : bookmark.parentId;
                const parentObject = await findBookmarkByKey(userActiveProfile.currentUserBookmarks, parentId);
                if (parentObject === false) { return false; }
                if (!isObjectEmpty(parentObject)) {
                    createdNewBookmarkObj.parentId = parentId;
                    parentObject.children.push(createdNewBookmarkObj);
                }
            } else {
                const isPresentBookmark = await getBrowserBookmarkByIdWithPromise(bookmark.id).catch(() => null);
                const inBrowserParentId = isPresentBookmark[0].parentId === syncUserSettings.browserFolderId ? syncUserSettings.extensionFolderId : bookmark.parentId;
                const inExtensionParentId = checkBookmark.parentId;
                if (inBrowserParentId !== inExtensionParentId) {
                    const newFolderObj = findBookmarkByKey(userActiveProfile.currentUserBookmarks, inBrowserParentId);
                    if (!newFolderObj) { return; }
                    const oldFolderObj = findBookmarkByKey(userActiveProfile.currentUserBookmarks, inExtensionParentId);
                    if (!oldFolderObj) { return; }
                    const findIndex = oldFolderObj.children.findIndex(x => x.id === bookmarkId);
                    if (findIndex === -1) { return; }
                    oldFolderObj.children.splice(findIndex, 1);
                    checkBookmark.parentId = newFolderObj.id;
                    checkBookmark.index = bookmark.index;
                    newFolderObj.children.splice(bookmark.index, 0, checkBookmark);
                }
            }
            if (Array.isArray(bookmark.children) && bookmark.children.length > 0) {
                await checkingNewBookmarkFromBrowserToExtension(bookmark.children);
            }
        }
        await indexedDBManipulation('save', 'userProfile', userAllProfiles);
        sendDataToMainScript();
    };

    const correctIndexesInExtensionBookmarks = async (bookmarks) => {
        for (const [index, bookmark] of bookmarks.entries()) {
            bookmark.index = index;
            if (Array.isArray(bookmark.children) && bookmark.children.length > 0) {
                correctIndexesInExtensionBookmarks(bookmark.children);
            }
        }
        const status = await indexedDBManipulation('save', 'userProfile', userAllProfiles);
    }

    const checkingNewBookmarkFromExtensionToBrowser = async (extensionBookmark) => {
        const userActiveProfileBookmarks = new manageUserBookmarks();

        for await (const bookmark of extensionBookmark) {
            // Check if the bookmark already exists in the browser
            const isPresentBookmark = await getBrowserBookmarkByIdWithPromise(bookmark.id).catch(() => null);

            if (isPresentBookmark === null) { // If not present, create a new bookmark
                const bookmarkDetails = {
                    title: bookmark.title,
                    index: bookmark.index,
                    url: bookmark.url.trim().length === 0 ? null : bookmark.url, // Check if it's a folder
                    parentId: bookmark.parentId === syncUserSettings.extensionFolderId ? syncUserSettings.browserFolderId : bookmark.parentId // This will be updated after creation
                };

                try {
                    // Create the new bookmark in the browser
                    const newBookmark = await browser.bookmarks.create(bookmarkDetails);

                    // Update the bookmark ID in your extension
                    bookmark.id = newBookmark.id;

                    // If the bookmark has children, recursively create them
                    if (Array.isArray(bookmark.children) && bookmark.children.length > 0) {
                        // Update the parentId for children to the new bookmark ID
                        for (const child of bookmark.children) {
                            child.parentId = newBookmark.id; // Set the new parentId for children
                        }
                        await checkingNewBookmarkFromExtensionToBrowser(bookmark.children); // Recursively process children
                    }
                } catch (error) {
                    console.error('Create new bookmark error:', error);
                }
            } else {
            }
        }
    };

    if (status && syncUserSettings.status && syncUserSettings.browserFolderId.length > 0 && syncUserSettings.extensionFolderId.length > 0 && isAnyValueTrue(syncUserSettings.synchronizeDirection)) {
        disabledSync = true;
        const getBrowserBrowserTree = await browserBookmark.getBrowserTreeBookmarks();
        const parentBrowserBookmarks = findBookmarkByKey(getBrowserBrowserTree, syncUserSettings.browserFolderId);
        const parentExtensionBookmarks = findBookmarkByKey(userActiveProfile.currentUserBookmarks, syncUserSettings.extensionFolderId);
        if (Array.isArray(parentExtensionBookmarks.children) && Array.isArray(parentExtensionBookmarks.children)) {
            if (syncUserSettings.synchronizeDirection.bothDirections || syncUserSettings.synchronizeDirection.browserToExtension) {
                await checkingNewBookmarkFromBrowserToExtension(parentBrowserBookmarks.children);
                await correctIndexesInExtensionBookmarks(userActiveProfile.currentUserBookmarks);
            }
            if (syncUserSettings.synchronizeDirection.bothDirections || syncUserSettings.synchronizeDirection.extensionToBrowser) {
                await checkingNewBookmarkFromExtensionToBrowser(parentExtensionBookmarks.children);
                const status = await indexedDBManipulation('save', 'userProfile', userAllProfiles);
            }
        }
    }
    disabledSync = false;
}

class RadioManager {
    constructor(src) {
        this.sound = new Howl({
            src: [src],
            html5: true,
        });
    }

    changeSrc(src) {
        this.sound.src = src;
    }

    async play() {
        this.sound.unload();
        this.sound.play(0);
        userSelectedStationObject.playingStatus = true;
        await this._saveStatus();
        this._detectIfSeekNotChanged(true);
        this.playError();
        this.loadError();
    }

    async stop() {
        this.sound.stop(0);
        this.sound.unload();
        userSelectedStationObject.playingStatus = false;
        await this._saveStatus();
        this._detectIfSeekNotChanged(false);
    }

    checkStatus() {
        return this.sound.state(0);
    }

    setVolume(volume) {
        if (volume === 1) {
            this.setMute(true);
        } else {
            this.setMute(false);
            this.sound.volume([volume / 100]);
        }
    }

    setMute(status) {
        this.sound.mute([status]);
    }

    duration() {
        return this.sound.duration();
    }

    seek() {
        return this.sound.seek();
    }

    playing() {
        return this.sound.playing();
    }

    state() {
        return this.sound.state();
    }

    playError() {
        this.sound.on('playerror', (e)=>{
            this.stop();
            this._sendMessage({ failedToPlay: true });
        });
    }

    loadError() {
        this.sound.on('loaderror', (e)=>{
            this.stop();
            this._sendMessage({ failedToPlay: true });
        });
    }

    async _saveStatus() {
        const result = await indexedDBManipulation('save', 'userSelectedOnlineStation', userSelectedStationObject);
    }

    _detectIfSeekNotChanged(status) {
        if (!status) {
            clearInterval(onlineRadioSeekInterval);
            return;
        }
        onlineRadioSeekInterval = setInterval(() => {
            if (this.state() === 'loaded') {
                const seekNow = userSelectedOnlineRadioManager.seek();
                if (onlineRadioSeek === seekNow) {
                    this.stop();
                    this._sendMessage({ pausedByOS: true });
                }
                onlineRadioSeek = seekNow;
            }
        }, 600);
    }

    _sendMessage(message) {
        try {
            browser.runtime.sendMessage(message);
        } catch (error) {
            console.error('Error to send the message. Popup is closed.', error);
        }
    }
}

const loadUserSavedOnlineRadio = async () => {
    if (!isObjectEmpty(userSelectedStationObject)) { return; }
    const ifExist = await indexedDBManipulation('has', 'userSelectedOnlineStation');
    if (!ifExist) {
    } else {
        const userSelectedOnlineStation = await indexedDBManipulation('get', 'userSelectedOnlineStation');
        if (!isObjectEmpty(userSelectedOnlineStation)) {
            userSelectedStationObject = userSelectedOnlineStation;
            userSelectedOnlineRadioManager = new RadioManager(userSelectedStationObject.url_resolved);
            userSelectedStationObject.playingStatus = false;
            await indexedDBManipulation('save', 'userSelectedOnlineStation', userSelectedStationObject);
        }
    }
}

const messageListener = async (message, sender, sendResponse) => {
    const messageObj = message;
    let response = '';
    if (messageObj.userCreateFirstProfile) {
        init();
    }
    if (messageObj.sync?.updateSettings === true) {
        const profile = new manageUserProfile();
        const userProfile = await profile.getActiveProfile();
        userActiveProfile = userProfile;
        syncUserSettings = userProfile.mainUserSettings?.main?.synchronizationToBrowser;
    }
    if (messageObj.sync?.firstSync === true) {
        firstSync();
    }
    if (messageObj.sync?.update === true) {
        await syncFromBrowserToExtensionBookmarksManager(true);
        response = sendSyncStatus;
    } else if (messageObj.sync?.update === false) {
        await syncFromBrowserToExtensionBookmarksManager(false);
        response = sendSyncStatus;
    }
    if (messageObj.sync?.savedNewObject === true) {
        disabledSync = true;
        syncFromExtensionToBrowserBookmarksManager();
        disabledSync = false;
    }
    if (message.onlineRadio?.play === true) {
        if (isObjectEmpty(userSelectedStationObject) || userSelectedOnlineRadioManager === undefined) {
            loadUserSavedOnlineRadio();
        }
        userSelectedOnlineRadioManager.play();
        userSelectedOnlineRadioManager.setVolume(userSelectedStationObject.volume);
    }
    if (message.onlineRadio?.play === false) {
        userSelectedOnlineRadioManager.stop();
    }
    if (message.onlineRadio?.volume === true) {
        const userSelectedOnlineStation = await indexedDBManipulation('get', 'userSelectedOnlineStation');
        userSelectedStationObject = userSelectedOnlineStation;
        userSelectedOnlineRadioManager.setVolume(userSelectedStationObject.volume);
    }
    if (message.onlineRadio?.newUrl === true) {
        const userSelectedOnlineStation = await indexedDBManipulation('get', 'userSelectedOnlineStation');
        userSelectedStationObject = userSelectedOnlineStation;
        userSelectedOnlineRadioManager.play();
    }
    sendResponse(response);
    return true;
}

document.addEventListener("beforeunload", async () => {
    try {
        if (isObjectEmpty(userSelectedStationObject)) {
            userSelectedStationObject.playingStatus = false;
            await indexedDBManipulation('save', 'userSelectedOnlineStation', userSelectedStationObject);
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

const init = async () => {
    try {
        const menuIdArray = ['saveTab', 'bookmarkManager'];

        firstSync();
        const profile = new manageUserProfile();
        const userProfile = await profile.getActiveProfile();
        userActiveProfile = userProfile;
        loadUserSavedOnlineRadio();
        syncFromBrowserToExtensionBookmarksManager();

        // Function to handle context menu item clicks
        const handleContextMenuClick = (menu, tab) => {
            switch (menu.menuItemId) {
                case 'saveTab':
                    if (!isStringAllowed(menu.pageUrl, forbiddenStringArray)) { break };
                    browser.action.openPopup();
                    break;
            }
        };

        // Function to add the context menu listener
        const addContextMenuListener = () => {
            if (!isListenerAdded) {
                browser.contextMenus.onClicked.addListener(handleContextMenuClick);
                isListenerAdded = true;
            } else {
                console.log("Context menu listener is already present.");
            }
        };

        // Function to create the context menu
        const createContextMenu = () => {
            browser.contextMenus.create({
                id: "bookmarkManager",
                title: "Bookmark Manager Pro",
                contexts: ["all"]
            });
            browser.contextMenus.create({
                id: "saveTab",
                parentId: "bookmarkManager",
                title: "Save Current Tab",
                contexts: ["all"]
            });
            addContextMenuListener(); // Add the listener after creating the menu
        };

        const changeStatusMenu = (status) => {
            menuIdArray.forEach(id => {
                browser.contextMenus.update(id, { visible: status })
                    .then(() => {
                    })
                    .catch((error) => {
                        console.error(`Error hiding context menu item: ${error}`);
                    });
            });
        }

        const changeStatusPageActionIcon = (status, tab) => {
            if (status) {
                browser.pageAction.show(tab.id);
                const bookmarkExist = findBookmarkByKey(userActiveProfile.currentUserBookmarks, tab.url, 'url');
                browser.pageAction.setIcon({
                    tabId: tab.id,
                    path: bookmarkExist ? "../icons/extensionsLogo/bookmark-check.svg" : "../icons/extensionsLogo/bookmark.svg",
                });
            } else {
                browser.pageAction.hide(tab.id);
            }
        }

        const changeStatusMenuAndPageActionIcon = (tabId, windowId = null) => {
            getTabByIdAndWindowId(tabId, windowId).then(tab => {
                if (!tab) { return };
                const statusUrl = isStringAllowed(tab.url, forbiddenStringArray);
                changeStatusMenu(statusUrl);
                changeStatusPageActionIcon(statusUrl, tab)
            });
        }

        const addListenersToTabsForMenuAndPageAction = () => {
            createContextMenu();

            browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                changeStatusMenuAndPageActionIcon(tabs[0].id, tabs[0].windowId);
            });

            const onAttachedListener = (tabId, attachInfo) => {
                changeStatusMenuAndPageActionIcon(tabId, attachInfo.newWindowId);
            }

            const onActivatedListener = (activeInfo) => {
                changeStatusMenuAndPageActionIcon(activeInfo.tabId, activeInfo.windowId);
            }

            const onHighlightedListener = (highlightInfo) => {
                changeStatusMenuAndPageActionIcon(highlightInfo.tabIds[0], highlightInfo.windowId);
            }

            const onMovedListener = (tabId, moveInfo) => {
                changeStatusMenuAndPageActionIcon(tabId, moveInfo.windowId);
            }

            const onUpdatedListener = (tabId, changeInfo, tabInfo) => {
                changeStatusMenuAndPageActionIcon(tabId, tabInfo.windowId);
            }

            if (browser.tabs.onActivated.hasListener(onActivatedListener)) {
                browser.tabs.onActivated.removeListener(onActivatedListener);
            }
            browser.tabs.onActivated.addListener(onActivatedListener);

            if (browser.tabs.onAttached.hasListener(onAttachedListener)) {
                browser.tabs.onAttached.removeListener(onAttachedListener);
            }
            browser.tabs.onAttached.addListener(onAttachedListener);

            if (browser.tabs.onHighlighted.hasListener(onHighlightedListener)) {
                browser.tabs.onHighlighted.removeListener(onHighlightedListener);
            }
            browser.tabs.onHighlighted.addListener(onHighlightedListener);

            if (browser.tabs.onMoved.hasListener(onMovedListener)) {
                browser.tabs.onMoved.removeListener(onMovedListener);
            }
            browser.tabs.onMoved.addListener(onMovedListener);

            if (browser.tabs.onUpdated.hasListener(onUpdatedListener)) {
                browser.tabs.onUpdated.removeListener(onUpdatedListener);
            }
            browser.tabs.onUpdated.addListener( onUpdatedListener, { properties: ['url'] });
        }
        addListenersToTabsForMenuAndPageAction();

        const pageActionListenerToOpenPopup = (tab) => {
            browser.action.openPopup();
        }

        if (browser.pageAction.onClicked.hasListener(pageActionListenerToOpenPopup)) {
            browser.pageAction.onClicked.removeListener(pageActionListenerToOpenPopup);
        }
        browser.pageAction.onClicked.addListener(pageActionListenerToOpenPopup);

    } catch (error) {
        console.error('Error:', error);
    }
}

const onInstalledAndOnSuspendListeners = () => {
    const onInstalledListener = (details) => {
        setTimeout(() => {
            if (details.reason === "install") {
                // Open the index.html page in a new tab
                browser.tabs.create({
                    url: browser.runtime.getURL("index.html") // Get the URL of index.html
                });
            }
        }, 500);
    }

    const onSuspendListener = () => {
        // handle cleanup
    }

    if (browser.runtime.onInstalled.hasListener(onInstalledListener)) {
        browser.runtime.onInstalled.removeListener(onInstalledListener);
    }
    browser.runtime.onInstalled.addListener(onInstalledListener);

    if (browser.runtime.onSuspend.hasListener(onSuspendListener)) {
        browser.runtime.onSuspend.removeListener(onSuspendListener);
    }
    browser.runtime.onSuspend.addListener(onSuspendListener);
}
onInstalledAndOnSuspendListeners();

document.addEventListener("DOMContentLoaded", async () => {
    if (browser.runtime.onMessage.hasListener(messageListener)) {
        browser.runtime.onMessage.removeListener(messageListener);
    }
    browser.runtime.onMessage.addListener(messageListener);

    const keepAlive = () => {
        // Perform a lightweight task to keep the background script active
        browser.runtime.getPlatformInfo().then(info => {
        }).catch(error => {
            console.error("Error retrieving platform info:", error);
        });

        // Schedule the next call to keep_alive after 20 seconds
        setTimeout(keepAlive, 20000);
    }
    // Start the keep_alive function
    keepAlive();

    browser.commands.onCommand.addListener((command) => {
        if (command === "open-popup-interface") {
            browser.action.openPopup();
        }
    });

    const status = await indexedDBManipulation('has', 'userProfile');
    if (!status) { return };
    init();
});



















