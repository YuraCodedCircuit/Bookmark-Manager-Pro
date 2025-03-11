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
let userProfile = {};
let userActiveProfile = {};
const defaultProfileImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAABbElEQVR4nO2XS0oDQRRFTwZG0C24ADFxAboCnTnTDWQsLiSaYDAzHfsZaiZ+NhHFeZyFgDEx4CChpOEFJJDGqorpp74DF4qmu+ve4lJdDYZhGH+NdaAKPALvomRcAYooZhE4AUaAm6IhUAPyKDT/kGJ8UvfaQtQ9zI91jKLOp9UmrU4FFFANMD/WIQp4igjQRAH9iAA9FNCLCPCGAn59hSoRAcoooChbYsg2uoYSagEBku1XDcmx4M7D/C2wgDLycjxIq9NQVl6d+a8U5AvblG9EX8ZlTZ03DMPQQ062xxJwBDSAZ6ANfIjacq0h95TkmVxWppeBXeAK6EQc5jrApbxraR7GV4EzYBBhepoGwKnMMXNWgIvAn3dfjYBzmXMm7ETWJFRdYC/W/EEGxt2E9kPNb86pMu4bldoICXCjwLwTXYcE6Cow7kSvIQGcMnmTtWH37wO8KFh1J2r5Fwi2QUWIFrAVEsAwDIMf5xMzFG7a+AMMkQAAAABJRU5ErkJggg==';

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
                // This code runs if there were any errors
                console.log(err);
            });
        }

        const hasDataInIndexedDB = async (key) => {
            return localforage.getItem(key).then((value) => {
                if (value && !isObjectEmpty(value)) {
                    return true;
                }
                return false;
            }).catch((err) => {
                // This code runs if there were any errors
                console.log(err);
            });
        }

        const removeDataFromIndexedDB = (key) => {
            return localforage.removeItem(key).then(() => {
                return true;
            }).catch((err) => {
                console.log(err);
                return false;
            });
        }

        const getKeysFromIndexedDB = () => {
            return localforage.keys().then((value) => {
                return value;
            }).catch((err) => {
                // This code runs if there were any errors
                console.log(err);
            });
        }

        switch (status) {
            case 'save':
                return saveDataToIndexedDB(key, data).then(() => {
                    return true;
                }).catch((error) => {
                    console.log(error);
                    return false;
                });
            case 'get':
                return getDataFromIndexedDB(key).then((result) => {
                    return result;
                }).catch((error) => {
                    return false;
                });
            case 'has':
                return hasDataInIndexedDB(key).then((result) => {
                    return result;
                }).catch((error) => {
                    console.error(error);
                    return null;
                });
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
 * @returns {Object|null} - Returns the bookmark object with the matching key value if found, otherwise returns null.
 */
const findBookmarkByKey = (bookmarks, id, key = 'id') => {
    for (const bookmark of bookmarks) {
        if (bookmark[key] === id) {
            return bookmark;
        }
        if (bookmark.children) {
            const obj = findBookmarkByKey(bookmark.children, id, key);
            if (obj) {
                return obj;
            }
        }
    }
    return null; // Return null if no bookmark with the given key value is found
};

/**
 * Calculates the next maximum index based on the highest index found in an array of objects.
 * Each object in the array is expected to have an 'index' property.
 * @param {Object[]} arrOfObj - The array of objects to search through.
 * @returns {number} The next maximum index, which is one greater than the highest index found.
 * @throws {Error} Throws an error if the input is not a valid array or other errors occur.
 */
const getNextMaxIndex = (arrOfObj) => {
    try {
        // Check if the input is an array, throw an error if not
        if (!Array.isArray(arrOfObj)) {
            throw new Error('Input is not a valid array');
        }
        // If the array is empty, return 0 as the next max index
        if (arrOfObj.length === 0) {
            return 0;
        }
        // Use reduce to find the highest index in the array of objects
        const maxIndex = arrOfObj.reduce((max, obj) => obj.index > max ? obj.index : max, arrOfObj[0].index);
        // Return the next max index by adding 1 to the highest index found
        return maxIndex + 1;
    } catch (error) {
        // Log the error to the console
        console.error('Error finding next max index:', error);
        return error;
    }
};

/**
 * Checks if a given image string is in Base64 format.
 *
 * @param {string} image - The image string to check.
 * @returns {boolean} - Returns true if the image string is in Base64 format, otherwise false.
 * @description This function validates whether the provided image string is in Base64 format.
 * It first checks if the input is a non-empty string.
 * Then, it uses a regular expression to test if the string matches the Base64 image format.
 */
const checkIfImageBase64 = (image) => {
    if (typeof image !== 'string' || image.trim() === '') {
        return false;
    }
    // Regular expression to check if the string is a Base64 encoded image
    const regex = /^data:image\/[^;]+;base64,/;
    return regex.test(image);
};

const isInputSafe = (input) => {
    // Regular expression to match potentially harmful characters or patterns
    const unsafePattern = /[<>\"'`]|(javascript:|data:|vbscript:|mailto:)/i;

    // Test the input against the unsafe pattern
    return !unsafePattern.test(input);
};

const sanitizeInput = (input) => {
    // Regular expression to match potentially harmful characters or patterns
    const unsafePattern = /<script.*?>.*?<\/script>|[<>\"'`]|(javascript:|data:|vbscript:|mailto:)/gi;

    // Replace unsafe patterns with an empty string
    const sanitizedInput = input.replace(unsafePattern, '');

    return sanitizedInput;
};

/**
 * Returns the latest created folder from an array of folders.
 *
 * This function takes an array of folders and searches for the folder that was
 * created most recently. It does this by iterating through the array and checking
 * the dateAdded property of each folder. The folder with the highest value for
 * dateAdded is considered the latest created folder.
 *
 * @param {Array} arr - The array of folders to search through.
 * @return {Object|null} - The latest created folder or null if the input is not an array or is empty.
 */
const getLatestCreatedFolder = (array) => {
    try {
        if (!Array.isArray(array) || array.length === 0) throw Error('Wrong input array');
        let latestCreatedFolder = null;
        let lastDate = 0;

        const getLastFolderByDate = (arr) => {
            if (!Array.isArray(arr) || arr.length === 0) throw Error('Wrong input array');
            arr.forEach(item => {
                if (item.type === 'folder' && item.dateAdded > lastDate) {
                    lastDate = item.dateAdded;
                    latestCreatedFolder = item;
                }
                if (Array.isArray(item.children) && item.children.length > 0) {
                    getLastFolderByDate(item.children);
                }
            });
        }
        getLastFolderByDate(array);
        if (latestCreatedFolder !== null) {
            return latestCreatedFolder;
        } else {
            throw Error('No folders found');
        }
    } catch (error) {
        console.error('Error in getLatestCreatedFolder', error);
        return error;
    }
}
/**
 * Generates a random color in hexadecimal format.
 *
 * This function creates a random color by generating a random integer within the RGB color range
 * (0 to 16777215), converting this integer to a hexadecimal string. It ensures the hexadecimal string
 * is always 6 characters long, padding with leading zeros if necessary, to form a valid hex color code.
 * If the alpha parameter is true, it also generates a random alpha value.
 *
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
 * Generates a random color in hexadecimal format based on the type and brightness percentage.
 *
 * @param {string} type - The type of color to generate. Either 'dark' or 'light'.
 * @param {number} percentage - The brightness percentage of the generated color. Must be a number between 0 and 100.
 * @returns {string|null} A random color in hexadecimal format, or null if the input is invalid.
 */
const getRandomHexColorByType = (type, percentage) => {
    try {
        // Validate input parameters
        if (typeof type !== 'string' || (type !== 'dark' && type !== 'light')) {
            throw new Error("Invalid type. Use 'dark' or 'light'.");
        }
        if (typeof percentage !== 'number' || percentage < 0 || percentage > 100) {
            throw new Error("Percentage must be a number between 0 and 100.");
        }

        // Helper function to generate a random integer
        const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

        // Helper function to clamp a value between a minimum and maximum value
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        if (type === 'dark') {
            // Generate a random color with a brightness of the given percentage
            const brightness = clamp(255 * ((100 - percentage) / 100), 0, 255);
            const r = getRandomInt(0, Math.floor(brightness));
            const g = getRandomInt(0, Math.floor(brightness));
            const b = getRandomInt(0, Math.floor(brightness));
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        } else if (type === 'light') {
            // Generate a random color with a darkness of the given percentage
            const darkness = clamp(255 * (percentage / 100), 0, 255);
            const r = getRandomInt(Math.floor(darkness), 255);
            const g = getRandomInt(Math.floor(darkness), 255);
            const b = getRandomInt(Math.floor(darkness), 255);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
    } catch (error) {
        console.error(error.message);
        return null;
    }
};

/**
 * Generates a random integer within a specified range, inclusive.
 *
 * This function calculates a random integer between the minimum (min) and maximum (max) values provided,
 * including both the min and max values in the possible outcomes. It uses Math.random() for generating
 * a random number, Math.floor() to ensure the result is an integer, and adjusts the range by adding 1
 * to include the max value as a possible result.
 *
 * @param {number} min - The minimum value in the range, inclusive.
 * @param {number} max - The maximum value in the range, inclusive.
 * @returns {number} A random integer between the min and max values.
 */
const randomIntFromInterval = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * Generates a random decimal number between min and max.
 * @param {number} min - The minimum value (inclusive).
 * @param {number} max - The maximum value (exclusive).
 * @returns {number} A random decimal number between min and max.
 */
const getRandomDecimal = (min, max) => {
    return Math.random() * (max - min) + min;
};

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
 * Generates a random ID for an object with a specified length, ensuring uniqueness within a set of bookmarks.
 * @param {number} number The length of the ID to generate. Defaults to 12 if not specified.
 * @returns {string} A unique ID consisting of allowed alphabet characters and numbers.
 */
const generateRandomIdForObj = (number = 12) => {
    const allowAlphabetCharactersAndNumbers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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

const cropBase64Image = (base64Image, width, height) => {
    return new Promise((resolve, reject) => {
        // Create an image element
        const img = new Image();
        img.src = base64Image;

        img.onload = () => {
            // Create a canvas element
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');

            // Calculate the position to crop the image
            const x = 0; // (img.width - width) / 2; // Center crop
            const y = 0; // (img.height - height) / 2; // Center crop

            // Draw the image onto the canvas
            ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

            // Get the cropped image as a base64 string
            const croppedBase64 = canvas.toDataURL();

            // Resolve the promise with the cropped image
            resolve(croppedBase64);
        };

        img.onerror = (error) => {
            reject(error);
        };
    });
}

/**
 * Validates a hexadecimal color code.
 *
 * This function checks if the provided string is a valid hexadecimal color code. It supports both short (3 characters)
 * and full (6 characters) formats, prefixed with '#'. The validation is case-insensitive, accepting both uppercase
 * and lowercase letters.
 *
 * @param {string} value - The hexadecimal color code to validate, including the '#' prefix.
 * @returns {boolean} - Returns true if the input is a valid hexadecimal color code, false otherwise.
 */
const inputHexValid = (value) => {
    return /^#(([0-9A-Fa-f]{2}){3,4}|[0-9A-Fa-f]{3})$/i.test(value);
}

/**
 * Determines if the brightness of a given color is light or dark.
 *
 * This function calculates the brightness of a color by converting its hexadecimal value to RGB,
 * then applying a formula to determine its brightness level. The formula used is a weighted sum
 * that takes into account the different contributions of each color (red, green, and blue) to human
 * perception of brightness. A brightness value over 155 is considered light, otherwise, it is considered dark.
 *
 * @param {string} color - The color in hexadecimal format (e.g., "#FFFFFF") to check the brightness of.
 * @param {number} brightnessLevel - The threshold value to determine if the color is light or dark.
 * @returns {boolean} - Returns true if the brightness is greater than 155 (light), otherwise returns false (dark).
 */
const checkIfColorBrightness = (color, brightnessLevel = 155) => {
    try {
        if (!inputHexValid(color)) return false; // Return false if the input is not a valid hexadecimal color code.
        const hex = color.replace('#', ''); // Remove the '#' if present to get the pure hexadecimal value.
        const r = parseInt(hex.substring(0, 2), 16); // Convert the first two hex digits to decimal for red.
        const g = parseInt(hex.substring(2, 4), 16); // Convert the next two hex digits to decimal for green.
        const b = parseInt(hex.substring(4, 6), 16); // Convert the last two hex digits to decimal for blue.
        const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000; // Calculate brightness using the luminosity formula.
        return brightness > brightnessLevel; // Return true if brightness is greater than 155, indicating a light color.
    } catch (error) {
        console.error(error);
        return false;
    }
}

/**
 * Generates a palette of colors based on the input color.
 * If the input color is light, it generates darker colors; if dark, it generates lighter colors.
 *
 * @param {string} userColor - The base color in HEX format.
 * @param {number} amountColors - The number of colors to generate (e.g., 10).
 * @param {number} adjustmentPercentage - The percentage to adjust each color (e.g., 5 for 5%).
 * @returns {string[]} An array of HEX colors.
 */
const generateColorPalette = (userColor, amountColors = 10, adjustmentPercentage = 5) => {
    const hexToRgb = (hex) => {
        hex = hex.replace(/^#/, '');
        let bigint = parseInt(hex, 16);
        let r = (bigint >> 16) & 255;
        let g = (bigint >> 8) & 255;
        let b = bigint & 255;
        return { r, g, b };
    };

    const rgbToHex = (r, g, b) => {
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    };

    const adjustColor = (hex, amount) => {
        let { r, g, b } = hexToRgb(hex);
        r = Math.min(255, Math.max(0, r + amount));
        g = Math.min(255, Math.max(0, g + amount));
        b = Math.min(255, Math.max(0, b + amount));
        return rgbToHex(r, g, b);
    };

    const colors = [];
    const isLight = checkIfColorBrightness(userColor);
    const adjustment = isLight ? -Math.round(255 * (adjustmentPercentage / 100)) : Math.round(255 * (adjustmentPercentage / 100));

    for (let i = 1; i <= amountColors; i++) {
        colors.push(adjustColor(userColor, adjustment * i));
    }

    return colors;
};

/**
 * Truncate text in a DOM element if it overflows, removing one character at a time.
 * @param {HTMLElement} element - The DOM element to check for overflow.
 * @param {string} text - The text to set in the element.
 * @returns {number} - The final length of truncated text.
 */
const truncateTextIfOverflow = (element, text) => {
    // Input validation
    if (!(element instanceof HTMLElement)) {
        console.error('The first argument must be a valid DOM element.');
    }
    if (typeof text !== 'string') {
        console.error('The second argument must be a string.');
    }

    // Set the initial text content of the element
    element.textContent = text;
    let textLength = text.length;

    // Check if the element has overflow
    if (element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth) {
        // Loop to truncate text until it fits
        for (let i = text.length; i > 0; i--) {
            // Remove the last character from the text
            text = text.slice(0, -1);

            // Add ellipsis
            const truncatedText = text + '...';

            // Set the truncated text back to the element
            element.textContent = truncatedText;
            textLength = truncatedText.length;

            // Check for overflow again
            if (!(element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth)) {
                break; // Exit the loop if no overflow
            }
        }
    }
    return textLength;
};

/**
 * Truncates a string to a specified length, preserving the start and end of the string while replacing the middle with an ellipsis.
 * This function ensures that both the start and end of the string are preserved up to a specified number of characters, with the middle portion
 * being replaced by an ellipsis if the string exceeds the maximum allowed length. It validates the input types and length parameters to ensure
 * they meet the expected criteria, providing feedback via console logs for invalid inputs.
 *
 * @param {string} inputString - The input string to truncate.
 * @param {number} maxLength - The maximum allowed length of the input including the ellipsis. If the input exceeds this length, it will be truncated.
 * @param {number} preserveEndLength - The number of characters to preserve at the end of the string.
 * @returns {string} The truncated string with the middle replaced by an ellipsis if it exceeds the specified maxLength. Returns the original input if within the limit.
 */
const truncateString = (inputString, maxLength, preserveEndLength) => {
    // Validate input type
    if (typeof inputString !== 'string') {
        console.error('Input must be a string');
        return '';
    }
    // Validate maxLength and preserveEndLength parameters
    if (typeof maxLength !== 'number' || maxLength <= 0 || typeof preserveEndLength !== 'number' || preserveEndLength < 0 || maxLength <= preserveEndLength) {
        console.error('Invalid maxLength or preserveEndLength. They must be positive numbers, and maxLength must be greater than preserveEndLength.');
        return inputString;
    }
    // Calculate start length to preserve based on maxLength and preserveEndLength
    const preserveStartLength = maxLength - preserveEndLength - 3; // 3 accounts for the length of the ellipsis
    // Check if truncation is necessary
    if (inputString.length <= maxLength) return inputString;
    // Truncate and insert ellipsis in the middle if necessary
    if (preserveEndLength > 0) {
        return `${inputString.slice(0, preserveStartLength)}...${inputString.slice(-preserveEndLength)}`;
    }
    return `${inputString.slice(0, preserveStartLength)}...`;
};

/**
 * Extracts a specified number of capital letters from the first letters of words in a string.
 * @param {string} input - The input string from which to extract letters.
 * @param {number} count - The number of letters to return.
 * @returns {string} A string containing the specified number of letters.
 */
const getInitialLetters = (input, count) => {
    let initials = '';
    let foundFirst = false;

    // Check each character in the input string
    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        // Check if the character is a letter
        if (/^[\p{L}]/u.test(char)) { // Include non-English letters
            initials += char.toUpperCase(); // Capitalize and add to initials
            foundFirst = true;

            // If we only need one letter, return it immediately
            if (count === 1) {
                return initials;
            }

            // Look for the next space to find the next word
            for (let j = i + 1; j < input.length; j++) {
                if (input[j] === ' ') {
                    // Move to the next character after the space
                    for (let k = j + 1; k < input.length; k++) {
                        const nextChar = input[k];
                        if (/^[\p{L}]/u.test(nextChar)) {
                            initials += nextChar.toUpperCase(); // Capitalize and add to initials
                            return initials; // Return both initials
                        }
                    }
                    // If no second letter is found, return the first found letter
                    return initials;
                }
            }
            // If no space is found, return the initials found so far
            return initials;
        }
    }

    // If no letters were found, return an empty string
    return '';
};

/**
 * Creates a tooltip that appears when the user hovers over a specified element.
 * @param {HTMLElement} hoverElement - The element that triggers the tooltip when hovered.
 * @param {string} position - The position of the tooltip relative to the trigger element.
 *     Valid values are 'top', 'bottom', 'left', and 'right'.
 * @param {string} text - The text to display in the tooltip.
 * @param {Object} customStyles - Optional custom styles to apply to the tooltip.
 */
const createTooltip = (hoverElement, position, text, customStyles) => {
    let tooltip;

    const createTooltipElement = () => {
        const tooltipEl = document.querySelectorAll('.tooltip');
        if (tooltipEl && tooltipEl.length > 0) {
            tooltipEl.forEach(el => el.remove());
        }
        tooltip = document.createElement('div');
        tooltip.textContent = text;
        tooltip.className = 'tooltip';
        Object.assign(tooltip.style, {
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 9000,
            ...customStyles
        });
        document.body.appendChild(tooltip);
    };

    const updateTooltipPosition = (event) => {
        const { clientX, clientY, layerX, layerY } = event;
        const bodyElement = document.body;
        const parentRect = bodyElement.getBoundingClientRect();
        let left, top;

        // Calculate position based on the specified position
        switch (position) {
            case 'top':
                left = clientX - (tooltip.offsetWidth / 2);
                top = clientY - tooltip.offsetHeight - 10;
                break;
            case 'bottom':
                left = clientX - (tooltip.offsetWidth / 2);
                top = clientY + 15;
                break;
            case 'left':
                left = clientX - tooltip.offsetWidth - 15;
                top = clientY;
                break;
            case 'right':
                left = clientX + 15;
                top = clientY;
                break;
            default:
                left = clientX;
                top = clientY;
        }

        if ((tooltip.offsetWidth / 2) < clientX && layerX < (parentRect.right / 2) - 2) {
            tooltip.style.left = `${left}px`;
        } else if ((tooltip.offsetWidth / 2) > clientX) {
            tooltip.style.left = `2px`;
        } else if (layerX > (parentRect.right / 2) - 2) {
            tooltip.style.left = `${(parentRect.right / 4) - 4}px`;
        }

        tooltip.style.top = `${top}px`;

    };

    // Event listeners
    hoverElement.addEventListener('mouseenter', createTooltipElement);
    hoverElement.addEventListener('mousemove', updateTooltipPosition);
    hoverElement.addEventListener('mouseleave', () => {
        if (tooltip) {
            tooltip.remove();
            tooltip = null; // Clear the tooltip reference
        }
    });
};

const checkValidUrl = (url) => {
    try {
        const urlObject = new URL(url);
        if (urlObject.protocol === '' || urlObject.hostname === '') {
            return { url: false };
        }
        if (urlObject.protocol !== 'http:' && urlObject.protocol !== 'https:') {
            return { protocol: false };
        }
        const regex = /^(?!(?:www\.[a-zA-Z0-9-]+$))(?:www\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}|localhost|[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}|(?:[0-9]{1,3}\.){3}[0-9]{1,3})$/;
        return { protocol: true, hostname: regex.test(urlObject.hostname) };
    } catch (error) {
        console.error('Error in checkValidUrl', error);
        return error;
    }
}

/**
 * Resizes an image to fit within specified maximum dimensions while maintaining aspect ratio.
 * This function creates a new image from a base64 string, resizes it to fit within the given
 * maximum width and height, and returns a new base64 string of the resized image.
 *
 * @param {string} base64Str - The base64 string of the image to resize.
 * @param {number} [maxWidth=170] - The maximum width of the resized image.
 * @param {number} [maxHeight=150] - The maximum height of the resized image.
 * @returns {Promise<string>} A promise that resolves with the base64 string of the resized image.
 */
const resizeImageBase64 = (base64Str, maxWidth = 170, maxHeight = 150) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const aspectRatio = img.width / img.height;
            let targetWidth = maxWidth;
            let targetHeight = maxHeight;

            if (aspectRatio > 1) {
                // Image is wider than tall
                targetHeight = maxWidth / aspectRatio;
            } else {
                // Image is taller than wide
                targetWidth = maxHeight * aspectRatio;
            }

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            resolve(canvas.toDataURL());
        };
    });
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

const createPopupWindow = (status) => {
    const contentEl = document.getElementById('content');
    const forbiddenStringArray = ['about:', 'chrome:'];
    let liveRadioPlayListIsOpenStatus = false;
    let liveRadioServer = 'https://de1.api.radio-browser.info';
    let liveRadioServerConfig = {};
    let colorPalette = [];
    let newBookmarkInfoObject = {
        title: '',
        url: '',
        image: '',
        folderId: '',
    };

    if (status === 'new') {
        const gsapDuration = 8;
        contentEl.innerHTML = `
            <div id="popupMainWindow">
                <div id="popupMainWindowTopWelcomeMessage">Welcome to the Bookmark Manager PRO!</div>
                <div id="popupMainWindowTopMessage">Thank you for installing this extension! We truly appreciate your support. To begin, please open a new tab in your browser. You can do this by locating the plus (+) icon typically found at the top of your browser window. Alternatively, you can click the button below to open a new tab directly. Once the new tab is open, follow the instructions provided to get started.</div>
                <div id="popupMainWindowMiddleButton">
                    <button id="popupMainWindowMiddleButtonContent">Open New Tab</button>
                </div>
                <div id="waveEffect">
                    <svg width="100%" height="100%" id="svg" viewBox="0 0 1440 390" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="gradient1" x1="0%" y1="50%" x2="100%" y2="50%">
                                <stop offset="5%" id="stopColor11" stop-color="#B31942"></stop>
                                <stop offset="95%" id="stopColor12" stop-color="#e64c75"></stop>
                            </linearGradient>
                        </defs>
                        <defs>
                            <linearGradient id="gradient2" x1="0%" y1="50%" x2="100%" y2="50%">
                                <stop offset="5%" id="stopColor21" stop-color="#0A3161"></stop>
                                <stop offset="95%" id="stopColor22" stop-color="#135eb9"></stop>
                            </linearGradient>
                        </defs>
                        <path stroke="none" stroke-width="0" fill="url(#gradient1)" fill-opacity="1" id="path1" d="M 0,400 L 0,100 C 161.5,93.26785714285714 323,86.53571428571428 423,111 C 523,135.46428571428572 561.5,191.12500000000003 652,210 C 742.5,228.87499999999997 885,210.9642857142857 1025,224 C 1165,237.0357142857143 1302.5,281.01785714285717 1440,325 L 1440,400 L 0,400 Z"></path>
                        <path stroke="none" stroke-width="0" fill="url(#gradient2)" fill-opacity="1" id="path2" d="M 0,400 L 0,233 C 137.46428571428572,218.91071428571428 274.92857142857144,204.82142857142858 406,209 C 537.0714285714286,213.17857142857142 661.75,235.625 765,274 C 868.25,312.375 950.0714285714287,366.6785714285714 1059,400 C 1167.9285714285713,433.3214285714286 1303.9642857142858,445.66071428571433 1440,458 L 1440,400 L 0,400 Z"></path>
                    </svg>
                </div>
            </div>
        `;

        gsap.fromTo('#stopColor11', {
            attr: {
                ['stop-color']: '#B31942',
            },
        }, {
            attr: {
                ['stop-color']: '#e64c75',
            },
            duration: gsapDuration,
            ease: "power2.inOut",
            repeat: -1,
            yoyo: true
        });
        gsap.fromTo('#stopColor12', {
            attr: {
                ['stop-color']: '#e64c75',
            },
        }, {
            attr: {
                ['stop-color']: '#B31942',
            },
            duration: gsapDuration,
            ease: "power2.inOut",
            repeat: -1,
            yoyo: true
        });
        gsap.fromTo('#stopColor21', {
            attr: {
                ['stop-color']: '#0A3161',
            },
        }, {
            attr: {
                ['stop-color']: '#135eb9',
            },
            duration: gsapDuration,
            ease: "power2.inOut",
            repeat: -1,
            yoyo: true
        });
        gsap.fromTo('#stopColor22', {
            attr: {
                ['stop-color']: '#135eb9',
            },
        }, {
            attr: {
                ['stop-color']: '#0A3161',
            },
            duration: gsapDuration,
            ease: "power2.inOut",
            repeat: -1,
            yoyo: true
        });
        gsap.to("#path1", gsapDuration, {
            attr: {
                d: "M 0,400 L 0,100 C 140.42857142857144,82.44642857142857 280.8571428571429,64.89285714285714 398,78 C 515.1428571428571,91.10714285714286 609.0000000000001,134.875 725,169 C 840.9999999999999,203.125 979.1428571428571,227.6071428571429 1102,252 C 1224.857142857143,276.3928571428571 1332.4285714285716,300.69642857142856 1440,325 L 1440,400 L 0,400 Z"
            },
            ease: Power1.easeInOut,
            repeat: -1,
            yoyo: true
        });
        gsap.to("#path2", gsapDuration, {
            attr: {
                d: "M 0,400 L 0,233 C 104.60714285714286,252.30357142857142 209.21428571428572,271.60714285714283 335,269 C 460.7857142857143,266.39285714285717 607.7499999999999,241.87500000000006 722,258 C 836.2500000000001,274.12499999999994 917.7857142857142,330.89285714285717 1032,371 C 1146.2142857142858,411.10714285714283 1293.107142857143,434.55357142857144 1440,458 L 1440,400 L 0,400 Z"
            },
            ease: Power1.easeInOut,
            repeat: -1,
            yoyo: true
        });

        /**
         * Creates a print effect on a DOM element, supporting multiple lines and preserving spaces.
         * @param {string} elementId - The ID of the DOM element to apply the effect to.
         * @param {number} duration - The total duration of the print effect in milliseconds.
         */
        const printEffect = (elementId, duration) => {
            const element = document.getElementById(elementId);
            const text = element.innerText; // Get the text content of the element
            const lines = text.split('\n'); // Split the text into lines
            element.innerText = ''; // Clear the element's text

            const totalCharacters = lines.reduce((sum, line) => sum + line.length + 1, 0); // Calculate total characters including line breaks
            const interval = duration / totalCharacters; // Calculate the interval for each character

            let lineIndex = 0; // Initialize the line index
            let charIndex = 0; // Initialize the character index

            const printInterval = setInterval(() => {
                if (lineIndex < lines.length) {
                    if (charIndex < lines[lineIndex].length) {
                        element.innerText += lines[lineIndex][charIndex]; // Append the next character
                        charIndex++; // Move to the next character
                    } else {
                        element.innerText += '\n'; // Add a line break after the line is complete
                        lineIndex++; // Move to the next line
                        charIndex = 0; // Reset character index for the new line
                    }
                } else {
                    clearInterval(printInterval); // Clear the interval when done
                }
            }, interval);
        };
        printEffect('popupMainWindowTopMessage', 15000);

        const setDefaultStyle = () => {
            const bodyEl = document.getElementsByTagName('body')[0];
            const popupMainWindowEl = document.getElementById('popupMainWindow');
            bodyEl.style.backgroundColor = '#00d4d4';
            popupMainWindowEl.style.backgroundColor = '#00d4d4';
        }
        setDefaultStyle();

        const addEventListenerToPopupWindowNew = () => {
            const popupMainWindowMiddleButtonContentEl = document.getElementById('popupMainWindowMiddleButtonContent');

            const createNewEmptyTabInFirefox = () => {
                browser.tabs.create({
                    url: browser.runtime.getURL("index.html")
                });
            }

            popupMainWindowMiddleButtonContentEl.addEventListener('click', createNewEmptyTabInFirefox);
        }
        addEventListenerToPopupWindowNew();

        return;
    }

    contentEl.innerHTML = `
        <div id="popupMainWindow">
            <div id="popupMainWindowTop">
                <div id="currentUserNameAndImage">
                    <div id="currentUserName"></div>
                    <div id="currentUserImage">
                        <div id="userImage">
                            <img id="logoImg" src="" alt="">
                        </div>
                    </div>
                </div>
            </div>
            <div id="popupMainWindowMiddle"></div>
            <div id="popupMainWindowBottom"></div>
        </div>
    `;

    const setDefaultStyle = () => {
        const bodyEl = document.getElementsByTagName('body')[0];
        const popupMainWindowEl = document.getElementById('popupMainWindow');
        const popupMainWindowTopEl = document.getElementById('popupMainWindowTop');
        const currentUserNameAndImageEl = document.getElementById('currentUserNameAndImage');
        const popupMainWindowMiddleEl = document.getElementById('popupMainWindowMiddle');
        const popupMainWindowBottomEl = document.getElementById('popupMainWindowBottom');

        const userColor = userActiveProfile.mainUserSettings.windows.window.backgroundColor;
        colorPalette = generateColorPalette(userColor, 20);

        bodyEl.style.backgroundColor = userColor;
        popupMainWindowEl.style.backgroundColor = userColor;
        popupMainWindowTopEl.style.backgroundColor = colorPalette[1];
        currentUserNameAndImageEl.style.backgroundColor = colorPalette[0];
        popupMainWindowMiddleEl.style.backgroundColor = colorPalette[1];
        popupMainWindowBottomEl.style.backgroundColor = colorPalette[1];
    }
    setDefaultStyle();

    const showCurrentUserNameAndImage = () => {
        const currentUserNameEl = document.getElementById('currentUserName');
        const logoImgEl = document.getElementById('logoImg');

        if (isObjectEmpty(userActiveProfile) || isObjectEmpty(userProfile)) return;
        if (userActiveProfile.name.trim().length > 0) {
            currentUserNameEl.textContent = userActiveProfile.name;
        } else {
            currentUserNameEl.textContent = `Not set`;
        }
        if (checkIfImageBase64(userActiveProfile.image)) {
            logoImgEl.src = userActiveProfile.image;
        } else {
            logoImgEl.src = defaultProfileImageBase64
        }
    }
    showCurrentUserNameAndImage();

    const createPopupMainWindowMiddle = () => {
        const popupMainWindowMiddleEl = document.getElementById('popupMainWindowMiddle');
        const popupMainWindowMiddleHtml = `
            <div id="popupMiddleContainer">
                <div id="liveRadioContainer"></div>
                <div id="saveActiveTabContainer"></div>
                <div id="liveRadioPlayListContainer"></div>
            </div>
        `;
        popupMainWindowMiddleEl.innerHTML = popupMainWindowMiddleHtml;
    }
    createPopupMainWindowMiddle();

    const createLiveRadioContainer = () => {
        const radioPlayButtonSVG = `<svg width="40" height="40" viewBox="0 0 15 15" stroke="${userActiveProfile.mainUserSettings.windows.button.primary.font.color || '#000000'}" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.24182 2.32181C3.3919 2.23132 3.5784 2.22601 3.73338 2.30781L12.7334 7.05781C12.8974 7.14436 13 7.31457 13 7.5C13 7.68543 12.8974 7.85564 12.7334 7.94219L3.73338 12.6922C3.5784 12.774 3.3919 12.7687 3.24182 12.6782C3.09175 12.5877 3 12.4252 3 12.25V2.75C3 2.57476 3.09175 2.4123 3.24182 2.32181ZM4 3.57925V11.4207L11.4288 7.5L4 3.57925Z" fill="currentColor"/></svg>`;
        const radioStopButtonSVG = `<svg width="40" height="40" viewBox="0 0 15 15" stroke="${userActiveProfile.mainUserSettings.windows.button.primary.font.color || '#000000'}" stroke-width="1.5" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M2 3C2 2.44772 2.44772 2 3 2H12C12.5523 2 13 2.44772 13 3V12C13 12.5523 12.5523 13 12 13H3C2.44772 13 2 12.5523 2 12V3ZM12 3H3V12H12V3Z" fill="currentColor"/></svg>`;
        const radioPlayListButtonSVG = `<svg width="30" height="30" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M14 12.85L1 12.85L1 14.15L14 14.15L14 12.85ZM14 8.85002L1 8.85002L1 10.15L14 10.15L14 8.85002ZM1 4.85003L14 4.85003L14 6.15003L1 6.15002L1 4.85003ZM14 0.850025L1 0.850025L1 2.15002L14 2.15002L14 0.850025Z" fill="currentColor"/></svg>`;
        const liveRadioContainerEl = document.getElementById('liveRadioContainer');
        const status = userActiveProfile.mainUserSettings?.main?.onlineRadio?.allowed || false;
        let searchResultArray = [];
        let userSelectedStationObject = {};
        let isUserSelectedOnlineRadioPlaying = false;
        let userChangedStation = false;
        let timeLineForRadioImageRotation;
        if (!status) {
            liveRadioContainerEl.style.display = 'none';
            return;
        }
        let stationUUID = userActiveProfile.mainUserSettings?.main?.onlineRadio?.lastUserSelectedStationuuid || null;
        liveRadioContainerEl.style.display = 'flex';

        const liveRadioContainerHtml = `
            <div id="currentLiveRadioIcon">
                <div id="currentLiveRadioImage"><svg height="100%" width="100%" version="1.1" id="vinylRecord" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve"><path style="fill:#736056;" d="M256,512C114.843,512,0,397.157,0,256S114.843,0,256,0s256,114.843,256,256S397.157,512,256,512z"/><path style="fill:#665247;" d="M512,256C512,114.843,397.157,0,256,0v512C397.157,512,512,397.157,512,256z"/><path style="fill:#E6563A;" d="M256,378.435c-67.511,0-122.435-54.924-122.435-122.435S188.489,133.565,256,133.565 S378.435,188.489,378.435,256S323.511,378.435,256,378.435z"/><path style="fill:#D9472B;" d="M378.435,256c0-67.511-54.924-122.435-122.435-122.435v244.87 C323.511,378.435,378.435,323.511,378.435,256z"/><path style="fill:#736056;" d="M256,278.261c-12.277,0-22.261-9.984-22.261-22.261s9.984-22.261,22.261-22.261 s22.261,9.984,22.261,22.261S268.277,278.261,256,278.261z"/><path style="fill:#665247;" d="M278.261,256c0-12.277-9.984-22.261-22.261-22.261v44.522 C268.277,278.261,278.261,268.277,278.261,256z"/><path style="fill:#8C7468;" d="M428.522,272.696c-9.223,0-16.696-7.473-16.696-16.696c0-41.549-16.228-80.663-45.696-110.13 c-29.468-29.467-68.581-45.696-110.13-45.696c-9.223,0-16.696-7.473-16.696-16.696S246.777,66.783,256,66.783 c50.468,0,97.968,19.701,133.739,55.479c35.778,35.771,55.479,83.271,55.479,133.739 C445.217,265.223,437.744,272.696,428.522,272.696z"/><path style="fill:#806A5F;" d="M366.13,145.87c29.468,29.467,45.696,68.581,45.696,110.13c0,9.223,7.473,16.696,16.696,16.696 s16.696-7.473,16.696-16.696c0-50.468-19.701-97.968-55.479-133.739C353.968,86.483,306.468,66.783,256,66.783v33.391 C297.549,100.174,336.663,116.402,366.13,145.87z"/><path style="fill:#8C7468;" d="M256,445.217c-50.468,0-97.968-19.701-133.739-55.479C86.483,353.968,66.783,306.468,66.783,256 c0-9.223,7.473-16.696,16.696-16.696s16.696,7.473,16.696,16.696c0,41.549,16.228,80.663,45.696,110.13 c29.468,29.467,68.581,45.696,110.13,45.696c9.223,0,16.696,7.473,16.696,16.696S265.223,445.217,256,445.217z"/><path style="fill:#806A5F;" d="M272.696,428.522c0-9.223-7.473-16.696-16.696-16.696v33.391 C265.223,445.217,272.696,437.744,272.696,428.522z"/></svg></div>
                <div id="currentLiveRadioText"></div>
            </div>
            <div id="currentLiveRadioControlsAndTitle">
                <div id="currentLiveRadioTitle">
                    <div id="currentLiveRadioTitleContainer">
                        <div id="scrollText"></div>
                    </div>
                </div>
                <div id="currentLiveRadioControls">
                    <div id="liveRadioControlVolumeButton">
                        <input id="liveRadioControlVolumeRange" type="range" min="1" max="100" step="5" />
                    </div>
                    <button id="liveRadioControlPlayStopButton">${radioPlayButtonSVG}</button>
                </div>
            </div>
            <div id="currentLiveRadioPlayList">
                <button id="liveRadioPlayListButton">${radioPlayListButtonSVG}</button>
            </div>
        `;
        liveRadioContainerEl.innerHTML = liveRadioContainerHtml;

        const changeButtonIconAndRadioIcon = () => {
            const liveRadioControlPlayStopButtonEl = document.getElementById('liveRadioControlPlayStopButton');
            if (isUserSelectedOnlineRadioPlaying) {
                liveRadioControlPlayStopButtonEl.innerHTML = radioStopButtonSVG;
                timeLineForRadioImageRotation.paused(false);
                return;
            }
            liveRadioControlPlayStopButtonEl.innerHTML = radioPlayButtonSVG;
            timeLineForRadioImageRotation.paused(true);
        }

        const sendStatToPlayOnlineRadio = () => {
            let message = {};
            if (isUserSelectedOnlineRadioPlaying === false) {
                if (userChangedStation) {
                    message = { onlineRadio: { newUrl: true } };
                } else {
                    message = { onlineRadio: { play: true } };
                }
            } else {
                message = { onlineRadio: { play: false } };
            }
            browser.runtime.sendMessage(message)
                .then(async response => {
                })
                .catch(error => {
                    console.error("Error sending message:", error);
                });
        }

        const loadDefaultValues = async () => {
            const scrollTextEl = document.getElementById('scrollText');
            const liveRadioControlVolumeRangeEl = document.getElementById('liveRadioControlVolumeRange');
            const ifExist = await indexedDBManipulation('has', 'userSelectedOnlineStation');
            if (!ifExist) { stationUUID = null; } else {
                const userSelectedOnlineStation = await indexedDBManipulation('get', 'userSelectedOnlineStation');
                if (!isObjectEmpty(userSelectedOnlineStation)) {
                    userSelectedStationObject = userSelectedOnlineStation;
                    stationUUID = userSelectedOnlineStation.stationuuid;
                    scrollTextEl.innerText = userSelectedOnlineStation.name;
                    isUserSelectedOnlineRadioPlaying = userSelectedStationObject.playingStatus;
                    liveRadioControlVolumeRangeEl.value = userSelectedStationObject.volume;
                }
            }
            timeLineForRadioImageRotation = gsap.timeline({ repeat: -1 });
            timeLineForRadioImageRotation.to("#vinylRecord", {
                rotation: 360,
                duration: 3,
                repeatRefresh: true,
                ease: "linear",
            });
            changeButtonIconAndRadioIcon();

            if (stationUUID === null) {
                scrollTextEl.innerText = `No station selected.`;
                return;
            }

            const messageListener = async (message, sender, sendResponse) => {
                console.log(message);
                if (message.pausedByOS === true) {
                }
                if (message.failedToPlay === true) {
                }
                isUserSelectedOnlineRadioPlaying = false;
                userChangedStation = false;
                changeButtonIconAndRadioIcon();
            }

            if (browser.runtime.onMessage.hasListener(messageListener)) {
                browser.runtime.onMessage.removeListener(messageListener);
            }
            browser.runtime.onMessage.addListener(messageListener);
        }
        loadDefaultValues();

        const createScrollingEffectToStationTitle = () => {
            const scrollContainerEl = document.getElementById('currentLiveRadioTitleContainer');
            const scrollTextEl = document.getElementById('scrollText');
            const containerWidth = scrollContainerEl.offsetWidth;
            const textWidth = scrollTextEl.offsetWidth; // Get the width of the text

            // Start scrolling only if the text is longer than the container
            if (textWidth > containerWidth) {
                let position = containerWidth; // Start position at the right edge of the container
                let lastPosition = position;
                let lastTimestamp = null;
                const speed = 50; // Pixels to move per second

                const scroll = (timestamp) => {
                    if (!lastTimestamp) lastTimestamp = timestamp; // Initialize lastTimestamp

                    const elapsed = (timestamp - lastTimestamp) / 1000; // Convert to seconds
                    lastTimestamp = timestamp;

                    // Move the text based on the elapsed time
                    position -= speed * elapsed; // Move left by speed pixels per second

                    if (position < -textWidth) {
                        position = containerWidth; // Reset position to the right edge
                    }

                    // Ensure position is a valid number before applying transform
                    if (!isNaN(position)) {
                        scrollTextEl.style.transform = `translateX(${position}px)`; // Apply the transform
                    }

                    // Check if the position has changed
                    if (Math.abs(position - lastPosition) < 0.1) {
                        // If the position hasn't changed significantly, restart scrolling
                        position = containerWidth; // Reset position
                    } else {
                        lastPosition = position; // Update lastPosition
                    }

                    requestAnimationFrame(scroll); // Continue the animation
                };

                requestAnimationFrame(scroll); // Start the scrolling with the first timestamp
            } else {
                // If the text is not longer than the container, you can display it normally
                scrollTextEl.style.transform = 'translateX(0)';
            }
        }
        createScrollingEffectToStationTitle();

        const createLiveRadioPlayList = () => {
            const liveRadioPlayListContainerEl = document.getElementById('liveRadioPlayListContainer');
            const deleteTextFromInputSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z" /><path d="m12 9 6 6" /><path d="m18 9-6 6" /></svg>`;
            const inputSearchSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 -960 960 960"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580t75.5-184.5T380-840t184.5 75.5T640-580q0 44-14 83t-38 69l252 252zM380-400q75 0 127.5-52.5T560-580t-52.5-127.5T380-760t-127.5 52.5T200-580t52.5 127.5T380-400"/></svg>`;
            const inputAdvancedSearchSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="-1 -3.25 27 16.5" stroke="#000000" stroke-width="1.5" fill="none"><path d="M0 0 5 0C5-3 10-3 10 0 10 3 5 3 5 0M10 0 25 0M0 5 10 5C10 2 15 2 15 5 15 8 10 8 10 5M15 5 25 5M0 10 5 10C5 7 10 7 10 10 10 13 5 13 5 10M10 10 25 10"/></svg>`;
            const loaderPinwheel = `<svg id="loader" xmlns="http://www.w3.org/2000/svg" width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>`;
            let advancedSearchObject = {
                limit: 100,
            };

            const liveRadioPlayListContainerHtml = `
                <div id="liveRadioPlayListTop">
                    <div id="liveRadioPlayListAndDelete">
                        <input type="text" name="liveRadioPlayList" value="" id="liveRadioPlayListInput"/>
                        <button id="liveRadioPlayListDeleteInputTextButton">${deleteTextFromInputSVG}</button>
                    </div>
                    <button id="liveRadioPlayListAdvancedSearch">${inputAdvancedSearchSVG}</button>
                    <button id="liveRadioPlayListSearch">${inputSearchSVG}</button>
                </div>
                <div id="liveRadioPlayListMiddle"></div>
                <div id="liveRadioAdvancedMenu"></div>
                <div id="liveRadioAdvancedMenuBlur"></div>
            `;
            liveRadioPlayListContainerEl.innerHTML = liveRadioPlayListContainerHtml;
            liveRadioPlayListContainerEl.style.backgroundColor = colorPalette[4];

            const findServerForRadioBrowserInfo = () => {
                /**
                 * Ask a specified server for a list of all other server.
                 */
                const getRadioBrowserBaseUrls = () => {
                    return new Promise((resolve, reject) => {
                        var request = new XMLHttpRequest()
                        // If you need https, you have to use fixed servers, at best a list for this request
                        request.open('GET', 'http://all.api.radio-browser.info/json/servers', true);
                        request.onload = () => {
                            if (request.status >= 200 && request.status < 300) {
                                var items = JSON.parse(request.responseText).map(x => "https://" + x.name);
                                resolve(items);
                            } else {
                                reject(request.statusText);
                            }
                        }
                        request.send();
                    });
                }

                /**
                 * Ask a server for its settings.
                 */
                const getRadioBrowserServerConfig = (baseurl) => {
                    return new Promise((resolve, reject) => {
                        var request = new XMLHttpRequest()
                        request.open('GET', baseurl + '/json/config', true);
                        request.onload = () => {
                            if (request.status >= 200 && request.status < 300) {
                                var items = JSON.parse(request.responseText);
                                resolve(items);
                            } else {
                                reject(request.statusText);
                            }
                        }
                        request.send();
                    });
                }

                /**
                 * Get a random available radio-browser server.
                 * Returns: string - base url for radio-browser api
                 */
                const getRadioBrowserBaseUrlRandom = async () => {
                    const hosts = await getRadioBrowserBaseUrls();
                    var item = hosts[Math.floor(Math.random() * hosts.length)];
                    return item;
                }

                getRadioBrowserBaseUrlRandom().then(async (server) => {
                    liveRadioServer = server;
                    return getRadioBrowserServerConfig(server);
                }).then(async config => {
                    const result = await indexedDBManipulation('save', 'userOnlineStationServer', config);
                });
            }

            (async ()=>{
                const ifExist = await indexedDBManipulation('has', 'userOnlineStationServer');
                if (!ifExist) {
                    findServerForRadioBrowserInfo();
                    return;
                }
                const isUrlValid = (url) => {
                    try {
                        new URL(url);
                        return true;
                    } catch {
                        return false;
                    }
                }
                liveRadioServerConfig = await indexedDBManipulation('get', 'userOnlineStationServer');
                if (!isUrlValid(liveRadioServerConfig.server_name) && liveRadioServerConfig.server_name.length === 3) {
                    liveRadioServer = `https://${liveRadioServerConfig.server_name}.api.radio-browser.info`;
                } else if (isUrlValid(liveRadioServerConfig.server_name) && liveRadioServerConfig.server_name.length === 26) {
                    liveRadioServer = `https://${liveRadioServerConfig.server_name}`;
                }
            })();

            const createStationList = (stationArray) => {
                const liveRadioPlayListMiddleEl = document.getElementById('liveRadioPlayListMiddle');
                let liveRadioPlayListMiddleHtml = ``;

                for (const station of stationArray) {
                    const backgroundColor = getRandomHexColorByType('dark', 80);
                    const color = getRandomHexColorByType('light', 50);
                    liveRadioPlayListMiddleHtml += `
                    <div class="stationBox" data-stationuuid="${station.stationuuid}">
                        <div class="stationIcon" style="background-color:${backgroundColor}"><svg class="stationIconSVG" xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 100 100'><text class="stationIconText" x='50' y='57' fill='${color}'>${getInitialLetters(station.name, 2)}</text></svg></div>
                        <div class="stationNameAndCountry">
                            <div class="stationName">${station.name}</div>
                            <div class="stationCountry">${station.country}</div>
                        </div>
                        <button class="stationPlayButton" data-stationuuid="${station.stationuuid}" style="background-color:${backgroundColor}"><svg width="40" height="40" viewBox="0 0 15 15" stroke="${color}" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M3.24182 2.32181C3.3919 2.23132 3.5784 2.22601 3.73338 2.30781L12.7334 7.05781C12.8974 7.14436 13 7.31457 13 7.5C13 7.68543 12.8974 7.85564 12.7334 7.94219L3.73338 12.6922C3.5784 12.774 3.3919 12.7687 3.24182 12.6782C3.09175 12.5877 3 12.4252 3 12.25V2.75C3 2.57476 3.09175 2.4123 3.24182 2.32181ZM4 3.57925V11.4207L11.4288 7.5L4 3.57925Z" fill="currentColor"/></svg></button>
                    </div>
                `;
                }

                liveRadioPlayListMiddleEl.innerHTML = liveRadioPlayListMiddleHtml;

                // Check for overflow after the elements are rendered
                const stationNames = document.querySelectorAll('.stationName, .stationCountry');
                const style = {
                    backgroundColor: colorPalette[9],
                    color: userActiveProfile.mainUserSettings.windows.window.font.color,
                    padding: '5px',
                    borderRadius: '5px',
                    fontSize: `${userActiveProfile.mainUserSettings.windows.window.font.fontSize}px`,
                    fontWeight: userActiveProfile.mainUserSettings.windows.window.font.fontWeight,
                    fontFamily: userActiveProfile.mainUserSettings.windows.window.font.fontFamily,
                    width: '300px'
                }

                stationNames.forEach(stationListEl => {
                    if (stationListEl.textContent.length === 0) { return }
                    const text = stationListEl.textContent;
                    const nameLength = truncateTextIfOverflow(stationListEl, stationListEl.textContent);
                    if (text.length > nameLength) {
                        stationListEl.style.textDecorationLine = 'underline';
                        stationListEl.style.textDecorationStyle = 'dotted';
                        stationListEl.style.textDecorationColor = '#323232';
                        createTooltip(stationListEl, 'top', text, style);
                    }
                });

                const addEventListenerToCreateStationList = () => {
                    const stationPlayButtonElArray = document.querySelectorAll('.stationPlayButton');

                    const userSelectedNewStation = async (el) => {
                        const stationuuid = el.target.dataset.stationuuid;
                        const filteredObjectByUuid = searchResultArray.filter(station => station.stationuuid === stationuuid);
                        if (Array.isArray(filteredObjectByUuid) && filteredObjectByUuid.length === 0) { console.error('Something is wrong. Could not find the station by UUID.', stationuuid, searchResultArray); return; };
                        userSelectedStationObject = filteredObjectByUuid[0];
                        userSelectedStationObject.playingStatus = true;
                        userSelectedStationObject.volume = 50;
                        const result = await indexedDBManipulation('save', 'userSelectedOnlineStation', userSelectedStationObject);
                        if (result) {
                            const scrollTextEl = document.getElementById('scrollText');
                            scrollTextEl.innerText = userSelectedStationObject.name;
                            isUserSelectedOnlineRadioPlaying = false;
                            userChangedStation = true;
                            sendStatToPlayOnlineRadio();
                        }
                    }

                    stationPlayButtonElArray.forEach(element => {
                        element.addEventListener('click', userSelectedNewStation);
                    });
                }
                addEventListenerToCreateStationList();
            }

            const createAdvancedMenu = () => {
                const liveRadioAdvancedMenuEl = document.getElementById('liveRadioAdvancedMenu');
                const liveRadioAdvancedMenuBlurEl = document.getElementById('liveRadioAdvancedMenuBlur');
                const windowBorder = userActiveProfile.mainUserSettings.windows.window.border;

                const liveRadioAdvancedMenuHtml = `
                <div id="liveRadioPlaySearchLimitContainer">
                    <label id="liveRadioPlaySearchLimitLabel" for="liveRadioPlaySearchLimitInput">Choose List Limit</label>
                    <div id="liveRadioPlaySearchLimitInputAndButtons">
                        <button id="liveRadioPlaySearchLimitInputDecrease"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /></svg></button>
                        <input type="text" name="liveRadioPlaySearchLimitInput" id="liveRadioPlaySearchLimit" min=1 max=1000 value="100"/>
                        <button id="liveRadioPlaySearchLimitInputIncrease"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg></button>
                    </div>
                </div>
            `;
                liveRadioAdvancedMenuEl.innerHTML = liveRadioAdvancedMenuHtml;

                const setDefaultValuesToAdvancedMenu = () => {
                    const liveRadioPlaySearchLimitEl = document.getElementById('liveRadioPlaySearchLimit');
                    liveRadioAdvancedMenuEl.style.display = 'flex';
                    liveRadioAdvancedMenuBlurEl.style.display = 'flex';
                    liveRadioAdvancedMenuEl.style.backgroundColor = colorPalette[4];
                    liveRadioAdvancedMenuEl.style.borderTop = `${windowBorder.top.width}px ${windowBorder.top.style} ${windowBorder.top.color}`;
                    liveRadioAdvancedMenuEl.style.borderRight = `${windowBorder.right.width}px ${windowBorder.right.style} ${windowBorder.right.color}`;
                    liveRadioAdvancedMenuEl.style.borderBottom = `${windowBorder.bottom.width}px ${windowBorder.bottom.style} ${windowBorder.bottom.color}`;
                    liveRadioAdvancedMenuEl.style.borderLeft = `${windowBorder.left.width}px ${windowBorder.left.style} ${windowBorder.left.color}`;
                    liveRadioPlaySearchLimitEl.value = advancedSearchObject.limit;
                }
                setDefaultValuesToAdvancedMenu();

                const addEventListenerToAdvancedSearch = () => {
                    const liveRadioPlaySearchLimitEl = document.getElementById('liveRadioPlaySearchLimit');
                    const liveRadioPlaySearchLimitInputIncreaseEl = document.getElementById('liveRadioPlaySearchLimitInputIncrease');
                    const liveRadioPlaySearchLimitInputDecreaseEl = document.getElementById('liveRadioPlaySearchLimitInputDecrease');
                    let lowStep = 1;
                    let medStep = 5;
                    let lgStep = 50;
                    let step = 1;
                    let holdInterval;

                    const startHold = (change) => {
                        const startTime = new Date().getTime();
                        holdInterval = setInterval(() => {
                            const newTime = new Date().getTime();
                            const elapsedTime = newTime - startTime;

                            if (elapsedTime === 0 && elapsedTime < 2000) {
                                step = lowStep;
                            }
                            if (elapsedTime > 2001 && elapsedTime < 6000) {
                                step = medStep;
                            }
                            if (elapsedTime > 6001) {
                                step = lgStep;
                            }
                            const inputValue = parseInt(liveRadioPlaySearchLimitEl.value) ? liveRadioPlaySearchLimitEl.value : 1000;
                            const value = change === '+' ? parseInt(inputValue) + parseInt(step) : parseInt(inputValue) - parseInt(step);
                            let currentValue = parseInt(value, 10);
                            currentValue = Math.max(1, Math.min(1000, value));
                            liveRadioPlaySearchLimitEl.value = currentValue;
                            advancedSearchObject.limit = currentValue;
                        }, 100);
                    };

                    const stopHold = () => {
                        lowStep = 1;
                        medStep = 5;
                        lgStep = 25;
                        step = 1;
                        clearInterval(holdInterval);
                    };

                    const checkInput = () => {
                        let value = liveRadioPlaySearchLimitEl.value;
                        value = value.replace(/\D/g, '');
                        value.trim().length === 0 ? value = 1 : '';
                        let currentValue = parseInt(value, 10);
                        currentValue = Math.max(1, Math.min(1000, value));
                        liveRadioPlaySearchLimitEl.value = currentValue;
                        advancedSearchObject.limit = currentValue;
                    }

                    liveRadioPlaySearchLimitEl.addEventListener('input', checkInput);
                    liveRadioPlaySearchLimitInputIncreaseEl.addEventListener('mousedown', () => startHold('+'));
                    liveRadioPlaySearchLimitInputDecreaseEl.addEventListener('mousedown', () => startHold('-'));
                    liveRadioPlaySearchLimitInputIncreaseEl.addEventListener('mouseup', stopHold);
                    liveRadioPlaySearchLimitInputDecreaseEl.addEventListener('mouseup', stopHold);
                    liveRadioPlaySearchLimitInputIncreaseEl.addEventListener('mouseleave', stopHold);
                    liveRadioPlaySearchLimitInputDecreaseEl.addEventListener('mouseleave', stopHold);
                }
                addEventListenerToAdvancedSearch();
            }

            const addEventListenerToCreatedLiveRadioPlayList = () => {
                const liveRadioPlayListInputEl = document.getElementById('liveRadioPlayListInput');
                const liveRadioPlayListDeleteInputTextButtonEl = document.getElementById('liveRadioPlayListDeleteInputTextButton');
                const liveRadioPlayListAdvancedSearchEl = document.getElementById('liveRadioPlayListAdvancedSearch');
                const liveRadioPlayListSearchEl = document.getElementById('liveRadioPlayListSearch');
                const liveRadioPlayListMiddleEl = document.getElementById('liveRadioPlayListMiddle');
                const liveRadioAdvancedMenuEl = document.getElementById('liveRadioAdvancedMenu');
                const liveRadioAdvancedMenuBlurEl = document.getElementById('liveRadioAdvancedMenuBlur');

                const liveRadioPlayListInputText = () => {
                    liveRadioPlayListMiddleEl.innerHTML = '';
                    if (liveRadioPlayListInputEl.value.trim().length > 0) {
                        liveRadioPlayListDeleteInputTextButtonEl.style.display = 'flex';
                    } else {
                        liveRadioPlayListDeleteInputTextButtonEl.style.display = 'none';
                    }
                }

                const liveRadioPlayListDeleteInputText = () => {
                    liveRadioPlayListInputEl.value = '';
                    liveRadioPlayListDeleteInputTextButtonEl.style.display = 'none';
                    liveRadioPlayListMiddleEl.innerHTML = '';
                }

                const removeAdvancedMenu = (el) => {
                    el.target.style.display = 'none';
                    liveRadioAdvancedMenuBlurEl.style.display = 'none';
                }

                const liveRadioSearch = () => {
                    const searchValue = liveRadioPlayListInputEl.value;
                    if (searchValue.trim().length === 0) {
                        liveRadioPlayListMiddleEl.innerHTML = `<div id="loaderContainerMessages">Please enter a search term to continue.</div>`;
                        gsap.fromTo(liveRadioPlayListInputEl, 0.2, {
                            x: -2,
                            border: `2px solid ${userActiveProfile.mainUserSettings.windows.button.danger.backgroundColor}`,
                        }, {
                            x: 2,
                            repeat: 3,
                            border: `1px solid ${userActiveProfile.mainUserSettings.windows.button.danger.backgroundColor}`,
                            yoyo: true,
                            ease: Quad.easeInOut,
                            onComplete: () => {
                                gsap.set(liveRadioPlayListInputEl, { clearProps: 'all' });
                                gsap.killTweensOf(liveRadioPlayListInputEl);
                            }
                        });
                        return;
                    }
                    liveRadioPlayListMiddleEl.innerHTML = `<div id="loaderContainer">${loaderPinwheel}</div>`;
                    gsap.to("#loader", {
                        rotation: 360,
                        duration: 2,
                        repeat: -1,
                        ease: "linear",
                        onRepeat: () => {}
                    });

                    const fetchStations = async (searchTerm) => {
                        const fetchStationsByParam = async (server, param, value) => {
                            const fetchUrl = `${server}/json/stations/search?${param}=${encodeURIComponent(value)}&limit=${encodeURIComponent(advancedSearchObject.limit)}&is_https=true&order=votes&reverse=true&hidebroken=true`;
                            const response = await fetch(fetchUrl);
                            const stations = await response.json();
                            return Array.isArray(stations) && stations.length > 0 ? stations : null;
                        };

                        try {
                            // First, try to fetch by tag
                            let stations = await fetchStationsByParam(liveRadioServer, 'tag', searchTerm);

                            // If no stations found, try to fetch by name
                            if (!stations) {
                                stations = await fetchStationsByParam(liveRadioServer, 'name', searchTerm);
                            }

                            // If stations are found, create the station list
                            if (stations) {
                                searchResultArray = stations;
                                createStationList(stations);
                            } else {
                                liveRadioPlayListMiddleEl.innerHTML = `<div id="loaderContainerMessages">We couldn't find any results for '${searchTerm}'. Consider changing your search term or modifying the search parameters.</div>`;
                            }
                        } catch (error) {
                            liveRadioPlayListMiddleEl.innerHTML = `<div id="loaderContainerMessages">An error occurred while processing your request. Please try again later.</div>`;
                            console.error('Error fetching stations:', error);
                        }
                    };
                    fetchStations(searchValue);
                }

                // If the user presses the 'Enter' key, trigger the search event.
                liveRadioPlayListInputEl.addEventListener('keydown', key => {
                    if (key.code === 'Enter' || key.which === 13) {
                        liveRadioSearch();
                    }
                });

                liveRadioPlayListInputEl.addEventListener('input', liveRadioPlayListInputText);
                liveRadioPlayListDeleteInputTextButtonEl.addEventListener('click', liveRadioPlayListDeleteInputText);
                liveRadioPlayListAdvancedSearchEl.addEventListener('click', createAdvancedMenu);
                liveRadioAdvancedMenuEl.addEventListener('mouseleave', removeAdvancedMenu);
                liveRadioPlayListSearchEl.addEventListener('click', liveRadioSearch);
            }
            addEventListenerToCreatedLiveRadioPlayList();
        }

        const addEventListenerToLiveRadioContainer = () => {
            const liveRadioControlVolumeRangeEl = document.getElementById('liveRadioControlVolumeRange');
            const liveRadioControlPlayStopButtonEl = document.getElementById('liveRadioControlPlayStopButton');
            const liveRadioPlayListButtonEl = document.getElementById('liveRadioPlayListButton');

            const volumeUserSelectedOnlineRadio = async () => {
                const originalDuration = 3;
                const inputValue = parseInt(liveRadioControlVolumeRangeEl.value);
                const rangeValue = Math.min(Math.max(inputValue, 1), 100);

                timeLineForRadioImageRotation.timeScale((originalDuration + (rangeValue + 50) * (originalDuration / 50)) / (originalDuration + 0.5));
                userSelectedStationObject.volume = rangeValue;
                const result = await indexedDBManipulation('save', 'userSelectedOnlineStation', userSelectedStationObject);
                if (result) {
                    browser.runtime.sendMessage({ onlineRadio: { volume: true } })
                        .then(async response => {
                        })
                        .catch(error => {
                            console.error("Error sending message:", error);
                        });
                }
            };

            const playStopUserSelectedOnlineRadio = () => {
                if (stationUUID === null) {
                    showHideLiveRadioPlayList();
                }
                if (isObjectEmpty(userSelectedStationObject)) {
                    return;
                }
                sendStatToPlayOnlineRadio();
                isUserSelectedOnlineRadioPlaying = !isUserSelectedOnlineRadioPlaying;
                changeButtonIconAndRadioIcon();
            }

            const showHideLiveRadioPlayList = () => {
                const liveRadioPlayListContainerEl = document.getElementById('liveRadioPlayListContainer');
                const saveActiveTabContainerEl = document.getElementById('saveActiveTabContainer');
                const popupMainWindowBottomEl = document.getElementById('popupMainWindowBottom');
                if (liveRadioPlayListIsOpenStatus) {
                    gsap.fromTo(saveActiveTabContainerEl, 1.2, {
                        display: 'none',
                        height: '0px',
                    }, {
                        display: 'flex',
                        height: '70px',
                        ease: Quad.easeInOut,
                        onStart: () => {
                            if (document.getElementById('siteScreenshot')) {
                                createSaveActiveTabContainer();
                            }
                        },
                    });
                    gsap.fromTo(liveRadioPlayListContainerEl, 1.2, {
                        display: 'flex',
                        height: '450px',
                        opacity: 1,
                    }, {
                        display: 'none',
                        height: '0px',
                        opacity: 0,
                        ease: Quad.easeInOut,
                        onComplete: () => { }
                    });
                } else {
                    gsap.fromTo(saveActiveTabContainerEl, 1.2, {
                        display: 'flex',
                        height: '70px',
                    }, {
                        display: 'none',
                        height: '0px',
                        ease: Quad.easeInOut,
                    });
                    gsap.fromTo(liveRadioPlayListContainerEl, 1.2, {
                        display: 'none',
                        height: '0px',
                        opacity: 0,
                    }, {
                        opacity: 1,
                        display: 'flex',
                        height: '450px',
                        ease: Quad.easeInOut,
                        onComplete: () => {
                            popupMainWindowBottomEl.style.display = 'none';
                            createLiveRadioPlayList();
                        }
                    });

                    liveRadioPlayListContainerEl.classList.toggle('expanded');
                    popupMainWindowBottomEl.style.display = 'none';
                    createLiveRadioPlayList();
                }
                liveRadioPlayListIsOpenStatus = !liveRadioPlayListIsOpenStatus;
            }

            liveRadioControlVolumeRangeEl.addEventListener('change', volumeUserSelectedOnlineRadio);
            liveRadioControlPlayStopButtonEl.addEventListener('click', playStopUserSelectedOnlineRadio);
            liveRadioPlayListButtonEl.addEventListener('click', showHideLiveRadioPlayList);
        }
        addEventListenerToLiveRadioContainer();
    }
    createLiveRadioContainer();

    const createSaveActiveTabContainer = () => {
        const saveActiveTabContainerEl = document.getElementById('saveActiveTabContainer');
        const editButtonSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 -960 960 960"><path d="M216-720h528l-34-40H250zm184 270 80-40 80 40v-190H400zM200-120q-33 0-56.5-23.5T120-200v-499q0-14 4.5-27t13.5-24l50-61q11-14 27.5-21.5T250-840h460q18 0 34.5 7.5T772-811l50 61q9 11 13.5 24t4.5 27v139q-21 0-41.5 3T760-545v-95H640v205l-77 77-83-42-160 80v-320H200v440h280v80zm440-520h120zm-440 0h363zm360 520v-123l221-220q9-9 20-13t22-4q12 0 23 4.5t20 13.5l37 37q8 9 12.5 20t4.5 22-4 22.5-13 20.5L683-120zm300-263-37-37zM620-180h38l121-122-18-19-19-18-122 121zm141-141-19-18 37 37z"/></svg>`;
        const saveButtonSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 -960 960 960"><path d="M640-640h120zm-440 0h338-18 14zm16-80h528l-34-40H250zm184 270 80-40 80 40v-190H400zm182 330H200q-33 0-56.5-23.5T120-200v-499q0-14 4.5-27t13.5-24l50-61q11-14 27.5-21.5T250-840h460q18 0 34.5 7.5T772-811l50 61q9 11 13.5 24t4.5 27v196q-19-7-39-11t-41-4v-122H640v153q-35 20-61 49.5T538-371l-58-29-160 80v-320H200v440h334q8 23 20 43t28 37m138 0v-120H600v-80h120v-120h80v120h120v80H800v120z"/></svg>`;
        const checkMarkSVG = `<svg class="checkMarkFolder" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 12.5L11 15.5L16 9.5" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="10" stroke="#000000" stroke-width="2"/></svg>`;
        const bookmarkHeart = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" fill="currentColor" id="bookmarkHeartSvg" viewBox="0 0 16 16"><path fill-rule="evenodd" id="bookmarkHeartSvgPath" d="M8 4.41c1.387-1.425 4.854 1.07 0 4.277C3.146 5.48 6.613 2.986 8 4.412z"/><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"/></svg>`;
        let imageStatus = false;
        let titleStatus = false;
        let urlStatus = false;
        let folderStatus = false;
        let timeoutSavedPreview;
        const defaultUserBookmarks = [
            {
                dateAdded: 0,
                dateGroupModified: 0,
                lastEdited: 0,
                id: 'root',
                count: 0,
                index: 0,
                parentId: 'root',
                title: 'Home',
                type: 'folder',
                url: '',
                style: {
                    folder: {},
                    bookmark: {},
                },
                children: [],
            },
        ];

        const saveActiveTabContainerHtml = `
            <div id="activeTabPreview">
                <div id="activeTabPreviewImage"></div>
                <div id="activeTabPreviewUrlAndFolder">
                    <div id="activeTabPreviewUrl">
                        <div id="scrollTextUrl"></div>
                    </div>
                    <div id="activeTabPreviewFolder">
                        <div id="scrollTextFolder"></div>
                    </div>
                </div>
                <div id="activeTabPreviewButtons">
                    <button id="activeTabPreviewEditButton">${editButtonSVG}</button>
                    <button id="activeTabPreviewSaveButton">${saveButtonSVG}</button>
                </div>
            </div>
        `;
        saveActiveTabContainerEl.innerHTML = saveActiveTabContainerHtml;

        const createEditForNewBookmark = () => {
            const saveActiveTabContainerHtml = `
                <div id="activeTabDetail">
                    <div id="activeTabImage">
                        <canvas id="siteScreenshot"></canvas>
                        <div id="activeTabImageZoomButtons">
                            <button id="zoomIn">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" x2="16.65" y1="21" y2="16.65" />
                                    <line x1="11" x2="11" y1="8" y2="14" />
                                    <line x1="8" x2="14" y1="11" y2="11" />
                                </svg>
                            </button>
                            <button id="zoomOut">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="11" cy="11" r="8" />
                                    <line x1="21" x2="16.65" y1="21" y2="16.65" />
                                    <line x1="8" x2="14" y1="11" y2="11" />
                                </svg>
                            </button>
                            <button id="save">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 -960 960 960">
                                    <path d="M680-40v-160H280q-33 0-56.5-23.5T200-280v-400H40v-80h160v-160h80v640h640v80H760v160zm0-320v-320H360v-80h320q33 0 56.5 23.5T760-680v320z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div id="activeTabNameUrlFolder">
                        <div id="activeTabName">
                            <div id="popupMainWindowTitle">Title</div>
                            <input type="text" id="popupMainWindowTabTitle">
                        </div>
                        <div id="activeTabUrl">
                            <div id="popupMainWindowUrl">URL</div>
                            <input type="text" id="popupMainWindowTabUrl">
                        </div>
                        <div id="activeTabFolder">
                            <div id="popupMainWindowFolder">Folder</div>
                            <div id="popupMainWindowTabFolder"></div>
                            <button id="popupMainWindowTabFolderChangeButton">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z" />
                                    <path d="M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z" />
                                    <path d="M3 5a2 2 0 0 0 2 2h3" />
                                    <path d="M3 3v13a2 2 0 0 0 2 2h3" />
                                </svg>
                            </button>
                        </div>
                        <div id="activeTabMessage"></div>
                    </div>
                    <div id="activeTabButtons">
                        <button id="activeTabSaveButton">Save Bookmark</button>
                    </div>
                </div>
            `;
            saveActiveTabContainerEl.innerHTML = saveActiveTabContainerHtml;

            const setValueFromActiveTab = () => {
                const popupMainWindowTabTitleEl = document.getElementById('popupMainWindowTabTitle');
                const popupMainWindowTabUrlEl = document.getElementById('popupMainWindowTabUrl');
                const popupMainWindowTabFolderEl = document.getElementById('popupMainWindowTabFolder');
                const activeTabButtonsEl = document.getElementById('activeTabButtons');

                activeTabButtonsEl.style.display = 'flex';

                const editImage = (base64) => {
                    const canvas = document.getElementById('siteScreenshot');
                    const ctx = canvas.getContext('2d');
                    canvas.width = 200;
                    canvas.height = 200;
                    let img = new Image();
                    let scale = 0.28;
                    const maxScale = 1.5;
                    const minScale = 0.1;
                    const zoomFactor = 1.1; // Define how much to zoom
                    let offsetX = 0; // Initialize offsetX to 0
                    let offsetY = 0; // Initialize offsetY to 0
                    let isDragging = false;
                    let startX, startY;

                    const setImageSrc = (base64) => {
                        img.src = base64;
                        img.onload = () => {
                            // Reset offsets to top-left corner when the image is loaded
                            offsetX = 0;
                            offsetY = 0;
                            drawImage();
                        };
                    }
                    setImageSrc(base64);

                    // Draw the image on the canvas
                    const drawImage = () => {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        // Check if the image width is less than the canvas width
                        if (img.width * scale < canvas.width) {
                            // Set scale to make the image width equal to the canvas width
                            scale = canvas.width / img.width;
                            // Reset offsets to keep the image aligned to the left
                            offsetX = 0; // Ensure the image starts from the left
                        }

                        // console.log(offsetY + (img.height * scale));
                        // ctx.drawImage(img, offsetX, offsetY, img.width * scale, img.height * scale);
                        ctx.drawImage(img, offsetX, offsetY, img.width * scale, img.height * scale);
                    }

                    const zoomIn = () => {
                        const newScale = scale * zoomFactor;
                        if (newScale <= maxScale) {
                            scale = newScale; // Allow zooming in without restriction
                            drawImage();
                        }
                    }

                    const zoomOut = () => {
                        const newScale = scale / zoomFactor; // Decrease scale
                        const scaledWidth = img.width * newScale; // Calculate the new scaled width
                        const scaledHeight = img.height * newScale; // Calculate the new scaled height
                        // Allow zooming out only if the new scaled width is greater than or equal to the canvas width
                        if (scaledWidth >= canvas.width && scaledHeight >= canvas.height && newScale >= minScale) {
                            scale = newScale; // Update scale
                            drawImage();
                        }
                    }

                    // Zoom in and out
                    document.getElementById('zoomIn').addEventListener('click', zoomIn);
                    document.getElementById('zoomOut').addEventListener('click', zoomOut);

                    // Handle mouse wheel zooming
                    canvas.addEventListener('wheel', (e) => {
                        e.preventDefault(); // Prevent the default scroll behavior

                        // Determine the direction of the scroll
                        if (e.deltaY < 0) {
                            // Zoom in
                            const newScale = scale * zoomFactor;
                            if (newScale <= maxScale) {
                                scale = newScale; // Update scale
                            }
                        } else {
                            // Zoom out
                            const newScale = scale / zoomFactor;
                            const scaledWidth = img.width * newScale; // Calculate the new scaled width
                            const scaledHeight = img.height * newScale; // Calculate the new scaled height

                            // Allow zooming out only if the new scaled width and height are greater than or equal to the canvas dimensions
                            if (scaledWidth >= canvas.width && scaledHeight >= canvas.height && newScale >= minScale) {
                                scale = newScale; // Update scale
                            }
                        }

                        // Adjust offsets to keep the mouse position stable during zoom
                        offsetX = offsetX * (scale / (scale * zoomFactor));
                        offsetY = offsetY * (scale / (scale * zoomFactor));

                        drawImage();
                    });

                    // Handle dragging
                    canvas.addEventListener('mousedown', (e) => {
                        isDragging = true;
                        startX = e.offsetX - offsetX;
                        startY = e.offsetY - offsetY;
                        canvas.style.cursor = 'grabbing';
                    });

                    canvas.addEventListener('mouseup', () => {
                        isDragging = false;
                        canvas.style.cursor = 'grab';
                    });

                    canvas.addEventListener('mouseleave', () => {
                        isDragging = false;
                        canvas.style.cursor = 'grab';
                    });

                    // Mouse move event to handle dragging
                    const handleMouseMove = (e) => {
                        if (isDragging) {
                            // Calculate new offsets
                            const newOffsetX = e.offsetX - startX;
                            const newOffsetY = e.offsetY - startY;

                            // Get the dimensions of the scaled image
                            const scaledWidth = img.width * scale;
                            const scaledHeight = img.height * scale;

                            // Boundary checks for dragging
                            offsetX = Math.min(0, Math.max(newOffsetX, canvas.width - scaledWidth));
                            offsetY = Math.min(0, Math.max(newOffsetY, canvas.height - scaledHeight));

                            drawImage();
                        }
                    };

                    canvas.addEventListener('mousemove', (e) => {
                        if (isDragging) {
                            handleMouseMove(e);
                        }
                    });

                    // Save the image
                    document.getElementById('save').addEventListener('click', () => {
                        const trimmedImage = canvas.toDataURL('image/png');
                        // You can now use the trimmedImage Base64 string as needed
                        setImageSrc(trimmedImage);
                        newBookmarkInfoObject.image = trimmedImage;
                        gsap.fromTo(canvas, {
                            borderWidth: 0,
                            borderColor: '#000000',
                        }, {
                            borderWidth: 3,
                            borderColor: '#17b62e',
                            repeat: 3,
                            yoyo: true,
                            duration: 0.5,
                            ease: Linear.easeNone,
                            onComplete: () => {
                                gsap.killTweensOf(canvas); // Stops any ongoing animations on the element.
                                gsap.set(canvas, { clearProps: 'all' }); // Resets all properties of the element to their initial state.
                            }
                        });
                    });
                }

                const getActiveTabScreenshot = () => {
                    // Get the active tab
                    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {

                        // Capture the screenshot of the tab
                        browser.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
                            // Get the base64 encoded data
                            const base64Data = dataUrl.split(',')[1];

                            const base64Image = `data:image/png;base64,${base64Data}`;
                            if (newBookmarkInfoObject.image.trim().length === 0) {
                                editImage(base64Image);
                                newBookmarkInfoObject.image = base64Image;
                                return;
                            }
                            editImage(newBookmarkInfoObject.image);
                        });
                    });
                }
                getActiveTabScreenshot();

                const getActiveTabInfo = () => {
                    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        const activeTab = tabs[0];
                        if (newBookmarkInfoObject.url.trim().length === 0) {
                            popupMainWindowTabUrlEl.value = activeTab.url;
                            newBookmarkInfoObject.url = activeTab.url;
                        } else {
                            popupMainWindowTabUrlEl.value = newBookmarkInfoObject.url;
                        }
                        if (newBookmarkInfoObject.title.trim().length === 0) {
                            popupMainWindowTabTitleEl.value = activeTab.title;
                            newBookmarkInfoObject.title = activeTab.title;
                        } else {
                            popupMainWindowTabTitleEl.value = newBookmarkInfoObject.title;
                        }
                    });
                    titleStatus = true;
                    urlStatus = true;
                }
                getActiveTabInfo();

                const createTooltipForFolderTitle = (title) => {
                    const style = {
                        backgroundColor: colorPalette[9],
                        color: userActiveProfile.mainUserSettings.windows.window.font.color,
                        padding: '5px',
                        borderRadius: '5px',
                        fontSize: `${userActiveProfile.mainUserSettings.windows.window.font.fontSize}px`,
                        fontWeight: userActiveProfile.mainUserSettings.windows.window.font.fontWeight,
                        fontFamily: userActiveProfile.mainUserSettings.windows.window.font.fontFamily,
                        width: 'fit-content',
                        maxWidth: '300px'
                    }

                    createTooltip(popupMainWindowTabFolderEl, 'top', title, style);
                    popupMainWindowTabFolderEl.style.textDecorationLine = 'underline';
                    popupMainWindowTabFolderEl.style.textDecorationStyle = 'dotted';
                    popupMainWindowTabFolderEl.style.textDecorationColor = '#323232';
                }

                if (newBookmarkInfoObject.folderId.trim().length === 0) {
                    const lastCreatedFolderObject = getLatestCreatedFolder(userActiveProfile.currentUserBookmarks);
                    popupMainWindowTabFolderEl.innerText = truncateString(lastCreatedFolderObject.title, 30, 2) || '<Error/>';
                    newBookmarkInfoObject.folderId = lastCreatedFolderObject.id;
                    if (lastCreatedFolderObject.title.length >= 30) {
                        createTooltipForFolderTitle(lastCreatedFolderObject.title);
                    }
                    return;
                }
                const parentBookmarkObject = findBookmarkByKey(userActiveProfile.currentUserBookmarks, newBookmarkInfoObject.folderId);
                popupMainWindowTabFolderEl.innerText = truncateString(parentBookmarkObject.title, 30, 2) || '<Error/>';
                if (parentBookmarkObject.title.length >= 30) {
                    createTooltipForFolderTitle(parentBookmarkObject.title);
                }
            }
            setValueFromActiveTab();

            const createFolderTree = () => {
                const activeTabNameUrlFolderEl = document.getElementById('activeTabNameUrlFolder');
                const activeTabButtonsEl = document.getElementById('activeTabButtons');

                activeTabButtonsEl.style.display = 'none';

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
                    const htmlOutput = `<div class="tree">${buildFolderTreeHTML(userActiveProfile.currentUserBookmarks)}</div>`; // Wrap the output in a single tree div
                    // Return the generated HTML
                    return htmlOutput;
                };
                activeTabNameUrlFolderEl.innerHTML = generateHtmlListFromData();

                const setCheckerToFolderTree = () => {
                    const checkArray = document.querySelectorAll(`.check`);
                    const liArray = document.querySelectorAll(`li[data-id]`);
                    const id = newBookmarkInfoObject.folderId;
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
                    if (id.length === 0) { return; }
                }
                setCheckerToFolderTree();

                const addEventListenersToFolderTree = () => {
                    const folderNameArray = document.querySelectorAll('.folderName');

                    const changeSelectedFolder = (e) => {
                        newBookmarkInfoObject.folderId = e.target.dataset.id;
                        setCheckerToFolderTree();
                        createEditForNewBookmark();
                    }

                    const mouseEnterFolderName = (el) => {
                        el.target.style.backgroundColor = colorPalette[2];
                    }

                    const mouseLeaveFolderName = (el) => {
                        el.target.style.backgroundColor = '#00000000';
                    }

                    folderNameArray.forEach(folder => {
                        folder.addEventListener('click', changeSelectedFolder);
                        folder.addEventListener('mouseenter', mouseEnterFolderName);
                        folder.addEventListener('mouseleave', mouseLeaveFolderName);
                    });
                }
                addEventListenersToFolderTree();
            }

            const addEventListenerToSaveActiveTabContainer = () => {
                const popupMainWindowTabTitleEl = document.getElementById('popupMainWindowTabTitle');
                const popupMainWindowTabUrlEl = document.getElementById('popupMainWindowTabUrl');
                const popupMainWindowTabFolderChangeButtonEl = document.getElementById('popupMainWindowTabFolderChangeButton');
                const activeTabSaveButtonEl = document.getElementById('activeTabSaveButton');
                const activeTabMessageEl = document.getElementById('activeTabMessage');
                let timeoutMessage;

                const changeBookmarkTitle = () => {
                    const value = sanitizeInput(popupMainWindowTabTitleEl.value);
                    popupMainWindowTabTitleEl.value = value;
                    newBookmarkInfoObject.title = value;
                }

                const changeBookmarkUrl = () => {
                    const value = sanitizeInput(popupMainWindowTabUrlEl.value);
                    popupMainWindowTabUrlEl.value = value;
                    newBookmarkInfoObject.url = value;
                }

                const showFolderTree = () => {
                    createFolderTree();
                    gsap.to('.tree', {
                        opacity: 1,
                        duration: .8,
                        backgroundColor: colorPalette[4],
                        yoyo: true,
                        ease: Power4.easeIn,
                    });
                }

                const editButtonToSaveBookmark = async () => {
                    const siteScreenshotEl = document.getElementById('siteScreenshot');
                    const popupMainWindowTabTitleEl = document.getElementById('popupMainWindowTabTitle');
                    const popupMainWindowTabUrlEl = document.getElementById('popupMainWindowTabUrl');
                    const popupMainWindowTabFolderEl = document.getElementById('popupMainWindowTabFolder');
                    let returnObj = {};
                    const gsapAnimationElement = (el, message) => {
                        gsap.fromTo(el, 0.2, {
                            x: -1,
                        }, {
                            x: 1,
                            repeat: 3,
                            backgroundColor: userActiveProfile.mainUserSettings.windows.button.danger.backgroundColor,
                            yoyo: true,
                            ease: Quad.easeInOut,
                            onComplete: () => {
                                gsap.set(el, { clearProps: 'all' });
                                gsap.killTweensOf(el);
                            }
                        });
                        if (activeTabMessageEl.innerText.length !== 0) { return; }
                        clearTimeout(timeoutMessage);
                        activeTabMessageEl.innerText = message;
                        setTimeout(() => {
                            activeTabMessageEl.innerText = '';
                        }, 2000);
                    }
                    if (newBookmarkInfoObject.image.trim().length === 0) {
                        gsapAnimationElement(siteScreenshotEl, 'Failed to get image.');
                        imageStatus = false;
                    } else {
                        imageStatus = true;
                    }
                    if (newBookmarkInfoObject.title.trim().length === 0) {
                        gsapAnimationElement(popupMainWindowTabTitleEl, 'Please enter a title.');
                        titleStatus = false;
                    } else {
                        titleStatus = true;
                    }
                    if (newBookmarkInfoObject.url.trim().length === 0) {
                        gsapAnimationElement(popupMainWindowTabUrlEl, 'Please enter a URL.');
                        urlStatus = false;
                    } else {
                        urlStatus = true;
                    }
                    if (newBookmarkInfoObject.folderId.trim().length === 0) {
                        gsapAnimationElement(popupMainWindowTabFolderEl, 'Please select a folder.');
                        folderStatus = false;
                    } else {
                        folderStatus = true;
                    }
                    if (imageStatus && titleStatus && urlStatus && folderStatus) {
                        saveActiveTabBookmark(false);
                    }
                }

                popupMainWindowTabTitleEl.addEventListener('input', changeBookmarkTitle);
                popupMainWindowTabUrlEl.addEventListener('input', changeBookmarkUrl);
                popupMainWindowTabFolderChangeButtonEl.addEventListener('click', showFolderTree);
                activeTabSaveButtonEl.addEventListener('click', editButtonToSaveBookmark);
            }
            addEventListenerToSaveActiveTabContainer();
        }

        const showThankYouWindow = () => {
            const bookmarkHeart = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" fill="currentColor" id="bookmarkHeartSvg" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" id="bookmarkHeartSvgPath" d="M8 4.41c1.387-1.425 4.854 1.07 0 4.277C3.146 5.48 6.613 2.986 8 4.412z"/>
                        <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"/>
                    </svg>
                `;
            const firefoxLogoSVG = `
                    <!-- Made by gilbarbara: https://github.com/gilbarbara/logos -->
                    <svg width="100%" height="100%" viewBox="-4.5 0 265 265" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid"><defs><radialGradient id="a" cx="-14920.226" cy="-8274.071" r="124.382" fx="-14928.161" fy="-8274.071" gradientTransform="matrix(.7398 .0292 -.04867 1.0902 10886.526 9537.696)" gradientUnits="userSpaceOnUse"><stop offset=".1" style="stop-color:#ffea00"/><stop offset=".17" style="stop-color:#ffde00"/><stop offset=".28" style="stop-color:#ffbf00"/><stop offset=".43" style="stop-color:#ff8e00"/><stop offset=".77" style="stop-color:#ff272d"/><stop offset=".87" style="stop-color:#e0255a"/><stop offset=".95" style="stop-color:#cc2477"/><stop offset="1" style="stop-color:#c42482"/></radialGradient><radialGradient id="b" cx="-8176.534" cy="-7746.301" r="218.273" gradientTransform="translate(9957.373 9315.522) scale(1.1973)" gradientUnits="userSpaceOnUse"><stop offset="0" class="stopColor" style="stop-color:#00ccda"/><stop offset=".22" class="stopColor" style="stop-color:#0083ff"/><stop offset=".26" class="stopColor" style="stop-color:#007af9"/><stop offset=".33" class="stopColor" style="stop-color:#0060e8"/><stop offset=".33" class="stopColor" style="stop-color:#005fe7"/><stop offset=".44" class="stopColor" style="stop-color:#2639ad"/><stop offset=".52" class="stopColor" style="stop-color:#401e84"/><stop offset=".57" class="stopColor" style="stop-color:#4a1475"/></radialGradient><radialGradient id="d" cx="-9132.676" cy="-6696.7" r="73.626" gradientTransform="matrix(1.1875 .1168 -.1168 1.1875 10322.184 9194.845)" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:#ffea00"/><stop offset=".5" style="stop-color:#ff272d"/><stop offset="1" style="stop-color:#c42482"/></radialGradient><radialGradient id="e" cx="-9139.338" cy="-6767.297" r="122.948" gradientTransform="matrix(1.1875 .1168 -.1168 1.1875 10322.184 9194.845)" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:#ffe900"/><stop offset=".16" style="stop-color:#ffaf0e"/><stop offset=".32" style="stop-color:#ff7a1b"/><stop offset=".47" style="stop-color:#ff4e26"/><stop offset=".62" style="stop-color:#ff2c2e"/><stop offset=".76" style="stop-color:#ff1434"/><stop offset=".89" style="stop-color:#ff0538"/><stop offset="1" style="stop-color:#ff0039"/></radialGradient><radialGradient id="f" cx="-9121.947" cy="-6653.326" r="112.818" gradientTransform="matrix(1.1875 .1168 -.1168 1.1875 10322.184 9194.845)" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:#ff272d"/><stop offset=".5" style="stop-color:#c42482"/><stop offset=".99" style="stop-color:#620700"/></radialGradient><radialGradient id="g" cx="227.574" cy="408.42" r="215.776" fx="235.292" fy="404.605" gradientTransform="translate(-29.473 -291.75) scale(.9734)" gradientUnits="userSpaceOnUse"><stop offset=".16" style="stop-color:#ffea00"/><stop offset=".23" style="stop-color:#ffde00"/><stop offset=".37" style="stop-color:#ffbf00"/><stop offset=".54" style="stop-color:#ff8e00"/><stop offset=".76" style="stop-color:#ff272d"/><stop offset=".8" style="stop-color:#f92433"/><stop offset=".84" style="stop-color:#e91c45"/><stop offset=".89" style="stop-color:#cf0e62"/><stop offset=".94" style="stop-color:#b5007f"/></radialGradient><radialGradient id="h" cx="215.202" cy="308.35" r="245.92" gradientTransform="translate(-29.473 -291.75) scale(.9734)" gradientUnits="userSpaceOnUse"><stop offset=".28" style="stop-color:#ffea00"/><stop offset=".4" style="stop-color:#fd0"/><stop offset=".63" style="stop-color:#ffba00"/><stop offset=".86" style="stop-color:#ff9100"/><stop offset=".93" style="stop-color:#ff6711"/><stop offset=".99" style="stop-color:#ff4a1d"/></radialGradient><linearGradient id="c" gradientUnits="userSpaceOnUse" x1="145.243" y1="481.786" x2="93.837" y2="313.629" gradientTransform="translate(0 -286)"><stop offset="0" style="stop-color:#000f43;stop-opacity:.4"/><stop offset=".48" style="stop-color:#001962;stop-opacity:.17"/><stop offset="1" style="stop-color:#002079;stop-opacity:0"/></linearGradient><linearGradient id="i" gradientUnits="userSpaceOnUse" x1="-9348.662" y1="-6754.194" x2="-9266.217" y2="-6775.209" gradientTransform="matrix(1.22 .12 -.12 1.22 10634.76 9460)"><stop offset="0" style="stop-color:#c42482;stop-opacity:.5"/><stop offset=".47" style="stop-color:#ff272d;stop-opacity:.5"/><stop offset=".49" style="stop-color:#ff2c2c;stop-opacity:.51"/><stop offset=".68" style="stop-color:#ff7a1a;stop-opacity:.72"/><stop offset=".83" style="stop-color:#ffb20d;stop-opacity:.87"/><stop offset=".94" style="stop-color:#ffd605;stop-opacity:.96"/><stop offset="1" style="stop-color:#ffe302"/></linearGradient><linearGradient id="j" gradientUnits="userSpaceOnUse" x1="103.092" y1="-1126.781" x2="88.439" y2="-1164.334" gradientTransform="matrix(.99 .1 -.1 .99 -175.62 1176.21)"><stop offset="0" style="stop-color:#891551;stop-opacity:.6"/><stop offset="1" style="stop-color:#c42482;stop-opacity:0"/></linearGradient><linearGradient id="k" gradientUnits="userSpaceOnUse" x1="-193.279" y1="534.177" x2="-168.009" y2="562.877" gradientTransform="matrix(.99 .1 -.1 .99 303.51 -384.2)"><stop offset=".01" style="stop-color:#891551;stop-opacity:.5"/><stop offset=".48" style="stop-color:#ff272d;stop-opacity:.5"/><stop offset="1" style="stop-color:#ff272d;stop-opacity:0"/></linearGradient><linearGradient id="l" gradientUnits="userSpaceOnUse" x1="-144.684" y1="583.677" x2="-144.665" y2="563.596" gradientTransform="matrix(.99 .1 -.1 .99 303.51 -384.2)"><stop offset="0" style="stop-color:#c42482"/><stop offset=".08" style="stop-color:#c42482;stop-opacity:.81"/><stop offset=".21" style="stop-color:#c42482;stop-opacity:.57"/><stop offset=".33" style="stop-color:#c42482;stop-opacity:.36"/><stop offset=".45" style="stop-color:#c42482;stop-opacity:.2"/><stop offset=".56" style="stop-color:#c42482;stop-opacity:9.000000e-02"/><stop offset=".67" style="stop-color:#c42482;stop-opacity:2.000000e-02"/><stop offset=".77" style="stop-color:#c42482;stop-opacity:0"/></linearGradient><linearGradient id="m" gradientUnits="userSpaceOnUse" x1="166.591" y1="295.714" x2="248.667" y2="479.246" gradientTransform="translate(0 -286)"><stop offset="0" style="stop-color:#fff14f"/><stop offset=".27" style="stop-color:#ffee4c"/><stop offset=".45" style="stop-color:#ffe643"/><stop offset=".61" style="stop-color:#ffd834"/><stop offset=".76" style="stop-color:#ffc41e"/><stop offset=".89" style="stop-color:#ffab02"/><stop offset=".9" style="stop-color:#ffa900"/><stop offset=".95" style="stop-color:#ffa000"/><stop offset="1" style="stop-color:#ff9100"/></linearGradient><linearGradient id="n" gradientUnits="userSpaceOnUse" x1="182.888" y1="401.274" x2="144.011" y2="505.662" gradientTransform="translate(0 -286)"><stop offset="0" style="stop-color:#ff8e00"/><stop offset=".04" style="stop-color:#ff8e00;stop-opacity:.86"/><stop offset=".08" style="stop-color:#ff8e00;stop-opacity:.73"/><stop offset=".13" style="stop-color:#ff8e00;stop-opacity:.63"/><stop offset=".18" style="stop-color:#ff8e00;stop-opacity:.56"/><stop offset=".23" style="stop-color:#ff8e00;stop-opacity:.51"/><stop offset=".28" style="stop-color:#ff8e00;stop-opacity:.5"/><stop offset=".39" style="stop-color:#ff8e00;stop-opacity:.48"/><stop offset=".52" style="stop-color:#ff8e00;stop-opacity:.42"/><stop offset=".68" style="stop-color:#ff8e00;stop-opacity:.31"/><stop offset=".84" style="stop-color:#ff8e00;stop-opacity:.17"/><stop offset="1" style="stop-color:#ff8e00;stop-opacity:0"/></linearGradient></defs><path fill="url(#a)" d="M206.8 24.6c-6.4 7.5-9.4 24.3-2.9 41.4s16.5 13.4 22.7 30.8c8.2 23 4.4 53.9 4.4 53.9s9.9 28.6 16.8-1.8c15.3-57.1-41-110.2-41-124.3z"/><path fill="url(#b)" d="M128.4 261.7c65.9 0 119.2-53.6 119.2-119.8S194.2 22.2 128.4 22.2 9.3 75.8 9.3 141.9c-.1 66.2 53.3 119.8 119.1 119.8z"/><path fill="url(#c)" d="M217.7 215.8c-2.6 1.8-5.3 3.4-8.1 4.9 3.7-5.5 7.2-11.1 10.3-16.9 2.5-2.8 4.9-5.5 6.8-8.5.9-1.5 2-3.2 3.1-5.3 6.7-12.1 14.1-31.6 14.3-51.6v-1.5c0-5-.5-10.1-1.5-15 .1.4.1.8.2 1.2-.1-.3-.1-.6-.2-.9.1.5.2 1.1.3 1.6 1.4 11.6.4 22.9-4.5 31.3-.1.1-.2.2-.2.4 2.5-12.7 3.4-26.7.6-40.7 0 0-1.1-6.8-9.5-27.5-4.8-11.9-13.4-21.7-20.9-28.8-6.6-8.2-12.7-13.7-16-17.2-6.9-7.3-9.8-12.8-11-16.3-1-.5-14.3-13.4-15.3-13.9-5.8 9-23.9 37-15.3 63.1 3.9 11.9 13.8 24.2 24.2 31.1.5.5 6.2 6.7 8.9 20.7 2.8 14.5 1.3 25.7-4.4 42.4-6.8 14.6-24.2 29.1-40.5 30.6-34.8 3.2-47.6-17.5-47.6-17.5 12.4 5 26.2 3.9 34.6-1.2 8.4-5.2 13.5-9.1 17.7-7.6 4.1 1.5 7.3-2.9 4.4-7.5-4.6-7.1-13-10.7-21.3-9.3-8.4 1.4-16.2 8.1-27.2 1.6-.7-.4-1.4-.9-2.1-1.4s2.4.7 1.6.2c-2.1-1.2-6-3.7-6.9-4.6-.2-.2 1.7.6 1.5.4-10.3-8.5-9-14.3-8.7-17.9.3-2.9 2.1-6.6 5.3-8.1 1.5.8 2.5 1.5 2.5 1.5s-.7-1.3-1-2c.1-.1.2 0 .4-.1 1.3.6 4 2.2 5.5 3.1 1.9 1.3 2.5 2.5 2.5 2.5s.5-.3.1-1.4c-.1-.5-.7-2-2.6-3.5h.1c1.1.6 2.2 1.4 3.2 2.2.5-1.9 1.5-3.9 1.3-7.5-.1-2.5-.1-3.2-.5-4.2-.4-.8.2-1.2.9-.3-.1-.7-.3-1.4-.6-2v-.1c.9-3 18.3-10.9 19.6-11.8 2.1-1.5 3.8-3.4 5.1-5.6 1-1.5 1.7-3.7 1.9-7 .1-2.4-1-4-18.7-5.8-4.8-.5-7.7-4-9.3-7.2-.3-.7-.6-1.3-.9-2s-.5-1.5-.7-2.3c2.9-8.3 7.7-15.3 14.9-20.6.4-.4-1.6.1-1.2-.3.5-.4 3.4-1.6 4-1.9.7-.3-2.9-1.9-6.1-1.5s-3.9.8-5.7 1.5c.7-.7 3-1.7 2.5-1.6-3.5.5-7.8 2.6-11.5 4.9 0-.4.1-.8.2-1.2-1.7.7-6 3.7-7.2 6.2.1-.5.1-1 .1-1.5-1.3 1.1-2.5 2.3-3.5 3.7l-.6.2c-10-4-18.9-4.3-26.3-2.5-1.6-1.6-2.4-.4-6.2-8.6-.3-.5.2.5 0 0-.6-1.6.4 2.1 0 0-6.2 5-14.4 10.6-18.4 14.5 0 .2 4.6-1.3 0 0-1.6.5-1.5 1.4-1.7 10.1-.1.7 0 1.4-.1 2-3.2 4-5.3 7.4-6.1 9.2-4.1 7-8.6 18-12.9 35.3 1.9-4.7 4.2-9.2 6.9-13.5-3.6 9.2-7.1 23.7-7.8 45.9.9-4.6 2-9.1 3.4-13.6-.9 18.5 2.3 36.9 9.3 54 2.5 6.1 6.6 15.4 13.7 25.6 22.2 23.3 53.4 37.8 88 37.8 36.1 0 68.6-15.8 90.9-40.9z"/><path fill="url(#d)" d="M190.9 232.7c43.7-5.1 63.1-50.1 38.2-51-22.4-.7-58.9 53.4-38.2 51z"/><path fill="url(#e)" d="M232.3 172.5c30.1-17.5 22.2-55.3 22.2-55.3s-11.6 13.5-19.5 35c-7.7 21.3-20.8 30.9-2.7 20.3z"/><path fill="url(#f)" d="M136.8 255.1c42 13.4 78-19.7 55.8-30.7-20.2-9.9-75.7 24.4-55.8 30.7z"/><path fill="url(#g)" d="M235.5 188.6c1-1.4 2.4-6 3.6-8.1 7.4-12 7.5-21.5 7.5-21.7 4.5-22.3 4.1-31.5 1.3-48.3-2.2-13.6-11.9-33.1-20.3-42.4-8.6-9.7-2.6-6.5-10.9-13.6-7.3-8.1-14.5-16.2-18.3-19.4-28-23.4-27.4-28.4-26.8-29.2l-.4.4c-.3-1.3-.6-2.4-.6-2.4S155.2 19.1 152 44.6c-2.1 16.6 4.1 34 13.2 45.1 4.7 5.8 10 11 15.8 15.6 6.8 9.8 10.6 21.9 10.6 34.9 0 32.6-26.4 58.9-59 58.9-4.4 0-8.9-.5-13.2-1.5-15.4-2.9-24.2-10.7-28.7-16-2.5-3-3.6-5.2-3.6-5.2 13.8 4.9 29 3.9 38.3-1.2 9.3-5.2 15-9 19.6-7.5 4.5 1.5 8.1-2.9 4.9-7.4-3.2-4.5-11.4-11-23.6-9.2-9.3 1.4-17.9 8-30.1 1.6-.8-.4-1.6-.9-2.3-1.3-.8-.5 2.6.7 1.8.2-2.4-1.2-6.6-3.7-7.7-4.6-.2-.2 1.8.6 1.7.4-11.4-8.4-10-14.1-9.7-17.7.3-2.9 2.4-6.5 5.9-8 1.7.8 2.7 1.5 2.7 1.5s-.7-1.3-1.1-2c.1-.1.3 0 .4-.1 1.4.6 4.5 2.1 6.1 3.1 2.1 1.3 2.8 2.5 2.8 2.5s.6-.3.1-1.4c-.2-.5-.8-2-2.9-3.5h.1c1.2.6 2.4 1.4 3.5 2.2.6-1.9 1.6-3.9 1.4-7.5-.1-2.5-.1-3.2-.6-4.1-.4-.8.2-1.2 1-.3-.1-.7-.4-1.3-.7-2v-.1c1-3 20.3-10.8 21.7-11.7 2.3-1.4 4.2-3.3 5.7-5.5 1.1-1.5 1.9-3.7 2.1-7 .1-1.5-.4-2.6-5.5-3.8-3.1-.7-7.8-1.3-15.2-2-5.3-.5-8.5-3.9-10.3-7.1-.3-.7-.7-1.3-1-1.9-.3-.7-.6-1.5-.8-2.2 3.2-8.4 9-15.5 16.5-20.4.4-.4-1.7.1-1.3-.3.5-.4 3.8-1.6 4.4-1.9.8-.3-3.2-1.8-6.8-1.5-3.6.4-4.3.7-6.3 1.5.8-.7 3.3-1.6 2.7-1.6-3.6.4-8.4 2.4-12.5 4.7 0-.4.1-.8.2-1.2-1.9.7-6.6 3.7-8 6.2.1-.5.1-1 .1-1.4-1.4 1.1-2.8 2.3-3.9 3.7l-.1.1c-11.1-4-20.9-4.3-29.1-2.5-1.8-1.6-4.7-4.1-8.8-12.2-.3-.5-.4 1-.6.5-1.6-3.7-2.6-9.8-2.4-14 0 0-3.3 1.5-6 7.8-.5 1.1-.8 1.8-1.2 2.4-.2.2.3-2.1.3-1.9-.5.8-1.7 1.9-2.2 3.4-.4 1.1-.9 1.7-1.2 3l-.1.1c0-.4.1-1.6 0-1.4-1.3 2.6-2.4 5.3-3.3 8-1.5 4.8-3.2 11.4-3.5 20-.1.6 0 1.4-.1 2-3.5 4-5.9 7.4-6.8 9.1-4.5 7-9.5 17.8-14.3 35 2.1-4.7 4.7-9.2 7.7-13.4-4 9.1-7.9 23.5-8.7 45.5 1-4.6 2.2-9.1 3.7-13.5-.7 14.7 1 33 10.3 53.6 5.5 12.1 18.2 36.7 49.3 55.9 0 0 10.6 7.9 28.7 13.8 1.3.5 2.7 1 4.1 1.4-.4-.2-.9-.4-1.3-.5 12.1 3.6 24.6 5.5 37.3 5.5 47 0 60.9-18.9 60.9-18.9l-.1.1c.7-.6 1.3-1.3 1.9-1.9-7.4 7-24.4 7.5-30.7 7 10.8-3.2 17.9-5.9 31.7-11.1 1.6-.6 3.3-1.3 5-2.1l.5-.3c.3-.2.7-.3 1-.5 6.7-3.2 13.1-7.1 18.9-11.8 13.9-11.1 16.9-21.9 18.5-29-.2.7-.9 2.3-1.4 3.3-3.6 7.6-11.5 12.4-20.1 16.4 4.1-5.4 7.9-11 11.4-16.8 2.8-2.8 3.6-7.2 5.8-10.1z"/><path fill="url(#h)" d="M218.6 215.1c5.7-6.2 10.7-13.4 14.6-21.5 9.9-20.8 25.2-55.5 13.2-91.6-9.5-28.6-22.6-44.2-39.2-59.5-27-24.8-34.5-35.9-34.5-42.5 0 0-31.2 34.7-17.7 71s41.2 34.9 59.5 72.7c21.6 44.5-17.4 93.1-49.7 106.7 2-.4 71.7-16.2 75.4-56.1-.2.7-1.8 11.8-21.6 20.8z"/><path fill="url(#i)" d="M128.2 85.8c.1-2.4-1.1-3.9-20.6-5.8-8-.7-11.1-8.1-12-11.3-2.8 7.4-4 15.2-3.4 24.6.4 6.2 4.6 12.8 6.5 16.6 0 0 .4-.6.6-.8 3.7-3.9 19.3-9.8 20.8-10.6 1.7-1 7.9-5.5 8.1-12.7z"/><path fill="url(#j)" d="M42.5 42c-.3-.5-.4 1-.6.5-1.6-3.7-2.6-9.7-2.3-14 0 0-3.3 1.5-6 7.8-.5 1.1-.8 1.8-1.2 2.4-.2.2.3-2.1.3-1.9-.5.8-1.7 1.9-2.2 3.3-.4 1.1-.9 1.8-1.2 3.2-.1.4.1-1.7 0-1.4-6.4 12.3-7.6 30.9-6.9 30.1C36 57.5 51.5 54.1 51.5 54.1c-1.9-1.2-5.5-4.8-9-12.1z"/><path fill="url(#k)" d="M93.9 193.4c-18.7-8-40-19.3-39.2-44.9 1.1-33.7 31.5-27.1 31.5-27.1-1.1.3-4.2 2.5-5.3 4.8-1.1 2.9-3.2 9.5 3.1 16.4 10 10.8-20.5 25.6 26.5 53.6 1.2.6-11-.4-16.6-2.8z"/><path fill="url(#l)" d="M87.3 176.6c13.3 4.6 28.7 3.8 38-1.3 6.2-3.5 14.2-9 19-7.6-4.2-1.7-7.4-2.5-11.3-2.6-.7 0-1.4 0-2.1-.1-1.4 0-2.8.1-4.2.2-2.4.2-5 1.7-7.4 1.5-.1 0 2.3-1 2.1-1-1.3.3-2.7.3-4.1.5-.9.1-1.7.2-2.7.3-27.7 2.3-51-15-51-15-2 6.6 8.9 19.9 23.7 25.1z"/><path fill="url(#m)" d="M218.5 215.3c28-27.5 42.1-60.8 36.1-98.3 0 0 2.4 19.2-6.7 38.8 4.4-19.2 4.9-43-6.7-67.7-15.4-32.9-40.8-50.3-50.5-57.5-14.7-11-20.8-22.1-20.9-24.4-4.4 9-17.7 39.8-1.4 66.3 15.2 24.9 39.2 32.2 55.9 55 31 42.1-5.8 87.8-5.8 87.8z"/><path fill="url(#n)" d="M214.5 143.8c-9.8-20.2-22-29-33.5-38.5 1.3 1.9 1.7 2.5 2.4 3.8 10.2 10.8 25.1 37.2 14.3 70.4-20.5 62.4-102.3 33-110.9 24.8 3.5 36.1 63.9 53.4 103.3 30 22.3-21.4 40.4-57.4 24.4-90.5z"/></svg>
                `;
            const twitterIconX = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="46" height="46" fill="currentColor" id="twitterIconX" class="bi bi-twitter-x" viewBox="0 0 16 16">
                        <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"/>
                    </svg>
                `;
            const githubIcon = `
                    <!-- Made by gilbarbara: https://github.com/gilbarbara/logos -->
                    <svg width="100%" height="100%" viewBox="0 0 256 250" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid">
                        <g><path d="M128.00106,0 C57.3172926,0 0,57.3066942 0,128.00106 C0,184.555281 36.6761997,232.535542 87.534937,249.460899 C93.9320223,250.645779 96.280588,246.684165 96.280588,243.303333 C96.280588,240.251045 96.1618878,230.167899 96.106777,219.472176 C60.4967585,227.215235 52.9826207,204.369712 52.9826207,204.369712 C47.1599584,189.574598 38.770408,185.640538 38.770408,185.640538 C27.1568785,177.696113 39.6458206,177.859325 39.6458206,177.859325 C52.4993419,178.762293 59.267365,191.04987 59.267365,191.04987 C70.6837675,210.618423 89.2115753,204.961093 96.5158685,201.690482 C97.6647155,193.417512 100.981959,187.77078 104.642583,184.574357 C76.211799,181.33766 46.324819,170.362144 46.324819,121.315702 C46.324819,107.340889 51.3250588,95.9223682 59.5132437,86.9583937 C58.1842268,83.7344152 53.8029229,70.715562 60.7532354,53.0843636 C60.7532354,53.0843636 71.5019501,49.6441813 95.9626412,66.2049595 C106.172967,63.368876 117.123047,61.9465949 128.00106,61.8978432 C138.879073,61.9465949 149.837632,63.368876 160.067033,66.2049595 C184.49805,49.6441813 195.231926,53.0843636 195.231926,53.0843636 C202.199197,70.715562 197.815773,83.7344152 196.486756,86.9583937 C204.694018,95.9223682 209.660343,107.340889 209.660343,121.315702 C209.660343,170.478725 179.716133,181.303747 151.213281,184.472614 C155.80443,188.444828 159.895342,196.234518 159.895342,208.176593 C159.895342,225.303317 159.746968,239.087361 159.746968,243.303333 C159.746968,246.709601 162.05102,250.70089 168.53925,249.443941 C219.370432,232.499507 256,184.536204 256,128.00106 C256,57.3066942 198.691187,0 128.00106,0 Z M47.9405593,182.340212 C47.6586465,182.976105 46.6581745,183.166873 45.7467277,182.730227 C44.8183235,182.312656 44.2968914,181.445722 44.5978808,180.80771 C44.8734344,180.152739 45.876026,179.97045 46.8023103,180.409216 C47.7328342,180.826786 48.2627451,181.702199 47.9405593,182.340212 Z M54.2367892,187.958254 C53.6263318,188.524199 52.4329723,188.261363 51.6232682,187.366874 C50.7860088,186.474504 50.6291553,185.281144 51.2480912,184.70672 C51.8776254,184.140775 53.0349512,184.405731 53.8743302,185.298101 C54.7115892,186.201069 54.8748019,187.38595 54.2367892,187.958254 Z M58.5562413,195.146347 C57.7719732,195.691096 56.4895886,195.180261 55.6968417,194.042013 C54.9125733,192.903764 54.9125733,191.538713 55.713799,190.991845 C56.5086651,190.444977 57.7719732,190.936735 58.5753181,192.066505 C59.3574669,193.22383 59.3574669,194.58888 58.5562413,195.146347 Z M65.8613592,203.471174 C65.1597571,204.244846 63.6654083,204.03712 62.5716717,202.981538 C61.4524999,201.94927 61.1409122,200.484596 61.8446341,199.710926 C62.5547146,198.935137 64.0575422,199.15346 65.1597571,200.200564 C66.2704506,201.230712 66.6095936,202.705984 65.8613592,203.471174 Z M75.3025151,206.281542 C74.9930474,207.284134 73.553809,207.739857 72.1039724,207.313809 C70.6562556,206.875043 69.7087748,205.700761 70.0012857,204.687571 C70.302275,203.678621 71.7478721,203.20382 73.2083069,203.659543 C74.6539041,204.09619 75.6035048,205.261994 75.3025151,206.281542 Z M86.046947,207.473627 C86.0829806,208.529209 84.8535871,209.404622 83.3316829,209.4237 C81.8013,209.457614 80.563428,208.603398 80.5464708,207.564772 C80.5464708,206.498591 81.7483088,205.631657 83.2786917,205.606221 C84.8005962,205.576546 86.046947,206.424403 86.046947,207.473627 Z M96.6021471,207.069023 C96.7844366,208.099171 95.7267341,209.156872 94.215428,209.438785 C92.7295577,209.710099 91.3539086,209.074206 91.1652603,208.052538 C90.9808515,206.996955 92.0576306,205.939253 93.5413813,205.66582 C95.054807,205.402984 96.4092596,206.021919 96.6021471,207.069023 Z" fill="#161614"/></g>
                    </svg>
                `;
            const buyMeACoffeeIcon = `
                    <svg width="100%" height="100%" id="buyMeACoffeeSvg" viewBox="0 0 884 1279" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M791.109 297.518L790.231 297.002L788.201 296.383C789.018 297.072 790.04 297.472 791.109 297.518V297.518Z" fill="#0D0C22"/>
                        <path d="M803.896 388.891L802.916 389.166L803.896 388.891Z" fill="#0D0C22"/>
                        <path d="M791.484 297.377C791.359 297.361 791.237 297.332 791.118 297.29C791.111 297.371 791.111 297.453 791.118 297.534C791.252 297.516 791.379 297.462 791.484 297.377V297.377Z" fill="#0D0C22"/>
                        <path d="M791.113 297.529H791.244V297.447L791.113 297.529Z" fill="#0D0C22"/>
                        <path d="M803.111 388.726L804.591 387.883L805.142 387.573L805.641 387.04C804.702 387.444 803.846 388.016 803.111 388.726V388.726Z" fill="#0D0C22"/>
                        <path d="M793.669 299.515L792.223 298.138L791.243 297.605C791.77 298.535 792.641 299.221 793.669 299.515V299.515Z" fill="#0D0C22"/>
                        <path d="M430.019 1186.18C428.864 1186.68 427.852 1187.46 427.076 1188.45L427.988 1187.87C428.608 1187.3 429.485 1186.63 430.019 1186.18Z" fill="#0D0C22"/>
                        <path d="M641.187 1144.63C641.187 1143.33 640.551 1143.57 640.705 1148.21C640.705 1147.84 640.86 1147.46 640.929 1147.1C641.015 1146.27 641.084 1145.46 641.187 1144.63Z" fill="#0D0C22"/>
                        <path d="M619.284 1186.18C618.129 1186.68 617.118 1187.46 616.342 1188.45L617.254 1187.87C617.873 1187.3 618.751 1186.63 619.284 1186.18Z" fill="#0D0C22"/>
                        <path d="M281.304 1196.06C280.427 1195.3 279.354 1194.8 278.207 1194.61C279.136 1195.06 280.065 1195.51 280.684 1195.85L281.304 1196.06Z" fill="#0D0C22"/>
                        <path d="M247.841 1164.01C247.704 1162.66 247.288 1161.35 246.619 1160.16C247.093 1161.39 247.489 1162.66 247.806 1163.94L247.841 1164.01Z" fill="#0D0C22"/>
                        <path class="cls-1" d="M472.623 590.836C426.682 610.503 374.546 632.802 306.976 632.802C278.71 632.746 250.58 628.868 223.353 621.274L270.086 1101.08C271.74 1121.13 280.876 1139.83 295.679 1153.46C310.482 1167.09 329.87 1174.65 349.992 1174.65C349.992 1174.65 416.254 1178.09 438.365 1178.09C462.161 1178.09 533.516 1174.65 533.516 1174.65C553.636 1174.65 573.019 1167.08 587.819 1153.45C602.619 1139.82 611.752 1121.13 613.406 1101.08L663.459 570.876C641.091 563.237 618.516 558.161 593.068 558.161C549.054 558.144 513.591 573.303 472.623 590.836Z" fill="#FFDD00"/>
                        <path d="M78.6885 386.132L79.4799 386.872L79.9962 387.182C79.5987 386.787 79.1603 386.435 78.6885 386.132V386.132Z" fill="#0D0C22"/>
                        <path d="M879.567 341.849L872.53 306.352C866.215 274.503 851.882 244.409 819.19 232.898C808.711 229.215 796.821 227.633 788.786 220.01C780.751 212.388 778.376 200.55 776.518 189.572C773.076 169.423 769.842 149.257 766.314 129.143C763.269 111.85 760.86 92.4243 752.928 76.56C742.604 55.2584 721.182 42.8009 699.88 34.559C688.965 30.4844 677.826 27.0375 666.517 24.2352C613.297 10.1947 557.342 5.03277 502.591 2.09047C436.875 -1.53577 370.983 -0.443234 305.422 5.35968C256.625 9.79894 205.229 15.1674 158.858 32.0469C141.91 38.224 124.445 45.6399 111.558 58.7341C95.7448 74.8221 90.5829 99.7026 102.128 119.765C110.336 134.012 124.239 144.078 138.985 150.737C158.192 159.317 178.251 165.846 198.829 170.215C256.126 182.879 315.471 187.851 374.007 189.968C438.887 192.586 503.87 190.464 568.44 183.618C584.408 181.863 600.347 179.758 616.257 177.304C634.995 174.43 647.022 149.928 641.499 132.859C634.891 112.453 617.134 104.538 597.055 107.618C594.095 108.082 591.153 108.512 588.193 108.942L586.06 109.252C579.257 110.113 572.455 110.915 565.653 111.661C551.601 113.175 537.515 114.414 523.394 115.378C491.768 117.58 460.057 118.595 428.363 118.647C397.219 118.647 366.058 117.769 334.983 115.722C320.805 114.793 306.661 113.611 292.552 112.177C286.134 111.506 279.733 110.801 273.333 110.009L267.241 109.235L265.917 109.046L259.602 108.134C246.697 106.189 233.792 103.953 221.025 101.251C219.737 100.965 218.584 100.249 217.758 99.2193C216.932 98.1901 216.482 96.9099 216.482 95.5903C216.482 94.2706 216.932 92.9904 217.758 91.9612C218.584 90.9319 219.737 90.2152 221.025 89.9293H221.266C232.33 87.5721 243.479 85.5589 254.663 83.8038C258.392 83.2188 262.131 82.6453 265.882 82.0832H265.985C272.988 81.6186 280.026 80.3625 286.994 79.5366C347.624 73.2302 408.614 71.0801 469.538 73.1014C499.115 73.9618 528.676 75.6996 558.116 78.6935C564.448 79.3474 570.746 80.0357 577.043 80.8099C579.452 81.1025 581.878 81.4465 584.305 81.7391L589.191 82.4445C603.438 84.5667 617.61 87.1419 631.708 90.1703C652.597 94.7128 679.422 96.1925 688.713 119.077C691.673 126.338 693.015 134.408 694.649 142.03L696.731 151.752C696.786 151.926 696.826 152.105 696.852 152.285C701.773 175.227 706.7 198.169 711.632 221.111C711.994 222.806 712.002 224.557 711.657 226.255C711.312 227.954 710.621 229.562 709.626 230.982C708.632 232.401 707.355 233.6 705.877 234.504C704.398 235.408 702.75 235.997 701.033 236.236H700.895L697.884 236.649L694.908 237.044C685.478 238.272 676.038 239.419 666.586 240.486C647.968 242.608 629.322 244.443 610.648 245.992C573.539 249.077 536.356 251.102 499.098 252.066C480.114 252.57 461.135 252.806 442.162 252.771C366.643 252.712 291.189 248.322 216.173 239.625C208.051 238.662 199.93 237.629 191.808 236.58C198.106 237.389 187.231 235.96 185.029 235.651C179.867 234.928 174.705 234.177 169.543 233.397C152.216 230.798 134.993 227.598 117.7 224.793C96.7944 221.352 76.8005 223.073 57.8906 233.397C42.3685 241.891 29.8055 254.916 21.8776 270.735C13.7217 287.597 11.2956 305.956 7.64786 324.075C4.00009 342.193 -1.67805 361.688 0.472751 380.288C5.10128 420.431 33.165 453.054 73.5313 460.35C111.506 467.232 149.687 472.807 187.971 477.556C338.361 495.975 490.294 498.178 641.155 484.129C653.44 482.982 665.708 481.732 677.959 480.378C681.786 479.958 685.658 480.398 689.292 481.668C692.926 482.938 696.23 485.005 698.962 487.717C701.694 490.429 703.784 493.718 705.08 497.342C706.377 500.967 706.846 504.836 706.453 508.665L702.633 545.797C694.936 620.828 687.239 695.854 679.542 770.874C671.513 849.657 663.431 928.434 655.298 1007.2C653.004 1029.39 650.71 1051.57 648.416 1073.74C646.213 1095.58 645.904 1118.1 641.757 1139.68C635.218 1173.61 612.248 1194.45 578.73 1202.07C548.022 1209.06 516.652 1212.73 485.161 1213.01C450.249 1213.2 415.355 1211.65 380.443 1211.84C343.173 1212.05 297.525 1208.61 268.756 1180.87C243.479 1156.51 239.986 1118.36 236.545 1085.37C231.957 1041.7 227.409 998.039 222.9 954.381L197.607 711.615L181.244 554.538C180.968 551.94 180.693 549.376 180.435 546.76C178.473 528.023 165.207 509.681 144.301 510.627C126.407 511.418 106.069 526.629 108.168 546.76L120.298 663.214L145.385 904.104C152.532 972.528 159.661 1040.96 166.773 1109.41C168.15 1122.52 169.44 1135.67 170.885 1148.78C178.749 1220.43 233.465 1259.04 301.224 1269.91C340.799 1276.28 381.337 1277.59 421.497 1278.24C472.979 1279.07 524.977 1281.05 575.615 1271.72C650.653 1257.95 706.952 1207.85 714.987 1130.13C717.282 1107.69 719.576 1085.25 721.87 1062.8C729.498 988.559 737.115 914.313 744.72 840.061L769.601 597.451L781.009 486.263C781.577 480.749 783.905 475.565 787.649 471.478C791.392 467.391 796.352 464.617 801.794 463.567C823.25 459.386 843.761 452.245 859.023 435.916C883.318 409.918 888.153 376.021 879.567 341.849ZM72.4301 365.835C72.757 365.68 72.1548 368.484 71.8967 369.792C71.8451 367.813 71.9483 366.058 72.4301 365.835ZM74.5121 381.94C74.6842 381.819 75.2003 382.508 75.7337 383.334C74.925 382.576 74.4089 382.009 74.4949 381.94H74.5121ZM76.5597 384.641C77.2996 385.897 77.6953 386.689 76.5597 384.641V384.641ZM80.672 387.979H80.7752C80.7752 388.1 80.9645 388.22 81.0333 388.341C80.9192 388.208 80.7925 388.087 80.6548 387.979H80.672ZM800.796 382.989C793.088 390.319 781.473 393.726 769.996 395.43C641.292 414.529 510.713 424.199 380.597 419.932C287.476 416.749 195.336 406.407 103.144 393.382C94.1102 392.109 84.3197 390.457 78.1082 383.798C66.4078 371.237 72.1548 345.944 75.2003 330.768C77.9878 316.865 83.3218 298.334 99.8572 296.355C125.667 293.327 155.64 304.218 181.175 308.09C211.917 312.781 242.774 316.538 273.745 319.36C405.925 331.405 540.325 329.529 671.92 311.91C695.905 308.686 719.805 304.941 743.619 300.674C764.835 296.871 788.356 289.731 801.175 311.703C809.967 326.673 811.137 346.701 809.778 363.615C809.359 370.984 806.139 377.915 800.779 382.989H800.796Z" fill="#0D0C22"/>
                    </svg>
                `;

            const saveActiveTabContainerHtml = `
                    <div id="activeTabThankYou">
                        <div id="savedSuccessfully">
                            <div id="savedSuccessfullyIcon">${bookmarkHeart}</div>
                            <div id="savedSuccessfullyMessage">Saved successfully!</div>
                        </div>
                        <div id="shareMessage">If you have feedback about this extension, please leave it on the Firefox page, share it on X, or submit an idea on GitHub. If you'd like to show your appreciation, consider supporting the project on 'Buy Me a Coffee.' <br>Your support is greatly appreciated!</div>
                        <div id="sharedIcons">
                            <button id="sharedReview">${firefoxLogoSVG}</button>
                            <button id="sharedTwitter">${twitterIconX}</button>
                            <button id="sharedGitHub">${githubIcon}</button>
                            <button id="sharedSponsorship">${buyMeACoffeeIcon}</button>
                        </div>
                    </div>
                `;
            saveActiveTabContainerEl.innerHTML = saveActiveTabContainerHtml;

            const addEventListenerToShareButtons = () => {
                const sharedReviewButton = document.getElementById('sharedReview');
                const sharedTwitterButton = document.getElementById('sharedTwitter');
                const sharedGitHubButton = document.getElementById('sharedGitHub');
                const sharedSponsorshipButton = document.getElementById('sharedSponsorship');

                const animationBookmarkHeartSvg = () => {
                    const changeColor = () => {
                        gsap.to('#bookmarkHeartSvgPath', {
                            fill: getRandomColor(),
                            repeat: 1,
                            duration: 1,
                            ease: "power1.inOut",
                        });
                    }
                    gsap.to('#bookmarkHeartSvgPath', {
                        repeat: -1,
                        delay: 1,
                        onRepeat: changeColor
                    });
                    gsap.to('#bookmarkHeartSvgPath', {
                        scale: 1.4,
                        x: '-0.6px',
                        repeat: -1,
                        duration: .5,
                        yoyo: true,
                        ease: "power1.inOut",
                    });
                }
                animationBookmarkHeartSvg();

                const clickFirefoxButton = () => {
                    browser.tabs.create({ url: 'https://addons.mozilla.org/en-US/firefox/addon/3728' });
                }
                const clickTwitterButton = () => {
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
                    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(randomMessage)}`;
                    browser.tabs.create({ url: shareUrl });
                }
                const clickGitHubButton = () => {
                    browser.tabs.create({ url: 'https://github.com/YuraCodedCircuit/' });
                }
                const clickBuyMeACoffeeButton = () => {
                    browser.tabs.create({ url: 'https://buymeacoffee.com/yuradeveloper' });
                }
                const animationMouseEnterBuyMeACoffeeButton = () => {
                    gsap.to('.cls-1', {
                        fill: getRandomColor(),
                        duration: 0.5,
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
                }

                sharedTwitterButton.addEventListener('click', clickTwitterButton);
                sharedReviewButton.addEventListener('click', clickFirefoxButton);
                sharedGitHubButton.addEventListener('click', clickGitHubButton);
                sharedSponsorshipButton.addEventListener('click', clickBuyMeACoffeeButton);
                sharedSponsorshipButton.addEventListener('mouseenter', animationMouseEnterBuyMeACoffeeButton);
                sharedSponsorshipButton.addEventListener('mouseleave', animationMouseLeaveBuyMeACoffeeButton);
            }
            addEventListenerToShareButtons();
        }

        const showSavedNewBookmarkInPreview = (status) => {
            saveActiveTabContainerEl.innerHTML = `
                <div id="bookmarkExistContainer">
                    <div id="bookmarkExistIcon">${bookmarkHeart}</div>
                    <div id="bookmarkExistMessage">${status ? 'Your bookmark has been saved successfully!' : 'An error occurred while trying to save your data. Please try again.'}</div>
                    <div id="bookmarkExistButtons"></div>
                </div>
            `;
            timeoutSavedPreview = setTimeout(() => {
                clearTimeout(timeoutSavedPreview);
                setValuesActiveTabPreview();
            }, 1000);
        }

        const saveActiveTabBookmark = async (ifPreview) => {
            let resizeImage = '';
            if (ifPreview) {
                resizeImage = await resizeImageBase64(newBookmarkInfoObject.image);
            }
            let returnObj = {};
            const currentUserId = userActiveProfile.userId;
            const parentObj = findBookmarkByKey(userActiveProfile.currentUserBookmarks, newBookmarkInfoObject.folderId);
            const currentTime = Date.now();
            returnObj = structuredClone(defaultUserBookmarks[0]);
            returnObj.dateAdded = currentTime;
            returnObj.dateGroupModified = currentTime;
            returnObj.lastEdited = currentTime;
            returnObj.id = generateRandomIdForObj();
            returnObj.title = newBookmarkInfoObject.title;
            returnObj.url = newBookmarkInfoObject.url;
            returnObj.type = 'bookmark';
            returnObj.parentId = newBookmarkInfoObject.folderId;
            returnObj.style.bookmark = structuredClone(userActiveProfile.defaultUserBookmarkStyle);
            returnObj.style.folder = structuredClone(userActiveProfile.defaultUserFolderStyle);
            returnObj.style.bookmark.color.backgroundColor = '';
            returnObj.style.bookmark.image.backgroundBase64 = ifPreview ? resizeImage : newBookmarkInfoObject.image;
            parentObj.children.push(returnObj);
            userProfile.offline = userProfile.offline.filter(profile => profile.userId !== currentUserId);
            userActiveProfile.timestampUpdate = currentTime;
            userProfile.offline.push(userActiveProfile);
            const saveStatus = await indexedDBManipulation('save', 'userProfile', userProfile);
            browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                browser.pageAction.setIcon({
                    tabId: tabs[0].id,
                    path: saveStatus ? "../icons/extensionsLogo/bookmark-check.svg" : "../icons/extensionsLogo/bookmark.svg",
                });
            });
            if (!saveStatus) {
                if (ifPreview) {
                    showSavedNewBookmarkInPreview(true);
                    return;
                }
                gsapAnimationElement(activeTabMessageEl, 'An error occurred while trying to save your data. Please try again.');
            } else {
                if (ifPreview) {
                    showSavedNewBookmarkInPreview(true);
                    return;
                }
                showThankYouWindow();
            }
        }

        const createScrollingEffectToStationTitle = (parentElID, scrollElID) => {
            const parentUrlEl = document.getElementById(parentElID);
            const scrollTextUrlEl = document.getElementById(scrollElID);
            const containerWidth = parentUrlEl.offsetWidth;
            const textWidth = scrollTextUrlEl.offsetWidth; // Get the width of the text

            // Start scrolling only if the text is longer than the container
            if (textWidth > containerWidth) {
                let position = containerWidth; // Start position at the right edge of the container
                let lastPosition = position;
                let lastTimestamp = null;
                const speed = 50; // Pixels to move per second

                const scroll = (timestamp) => {
                    if (!lastTimestamp) lastTimestamp = timestamp; // Initialize lastTimestamp

                    const elapsed = (timestamp - lastTimestamp) / 1000; // Convert to seconds
                    lastTimestamp = timestamp;

                    // Move the text based on the elapsed time
                    position -= speed * elapsed; // Move left by speed pixels per second

                    if (position < -textWidth) {
                        position = containerWidth; // Reset position to the right edge
                    }

                    // Ensure position is a valid number before applying transform
                    if (!isNaN(position)) {
                        scrollTextUrlEl.style.transform = `translateX(${position}px)`; // Apply the transform
                    }

                    // Check if the position has changed
                    if (Math.abs(position - lastPosition) < 0.1) {
                        // If the position hasn't changed significantly, restart scrolling
                        position = containerWidth; // Reset position
                    } else {
                        lastPosition = position; // Update lastPosition
                    }

                    requestAnimationFrame(scroll); // Continue the animation
                };

                requestAnimationFrame(scroll); // Start the scrolling with the first timestamp
            } else {
                // If the text is not longer than the container, you can display it normally
                scrollTextUrlEl.style.transform = 'translateX(0)';
            }
        }

        const setValuesActiveTabPreview = () => {
            const activeTabPreviewImageEl = document.getElementById('activeTabPreviewImage');
            const scrollTextUrlEl = document.getElementById('scrollTextUrl');
            const scrollTextFolderEl = document.getElementById('scrollTextFolder');
            const saveActiveTabContainerEl = document.getElementById('saveActiveTabContainer');
            const maxLengthForFolderTitle = 34;
            const folderExist = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></svg>`;
            const folderExistLink = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h7" /><path d="m8 16 3-3-3-3" /></svg>`;

            browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const activeTab = tabs[0];
                const homepageUrl = browser.runtime.getURL('index.html');
                forbiddenStringArray.push(homepageUrl);
                if (!isStringAllowed(activeTab.url, forbiddenStringArray)) {
                    saveActiveTabContainerEl.innerHTML = `<div id="messageWrongUrl">This tab cannot be saved as a bookmark because the URL is not permitted. Please select a different page.</div>`;
                    return;
                }
                const bookmarkExist = findBookmarkByKey(userActiveProfile.currentUserBookmarks, activeTab.url, 'url');
                if (bookmarkExist) {
                    const parentBookmarkExist = findBookmarkByKey(userActiveProfile.currentUserBookmarks, bookmarkExist.parentId);
                    saveActiveTabContainerEl.innerHTML = `
                        <div id="bookmarkExistContainer">
                            <div id="bookmarkExistIcon">${bookmarkHeart}</div>
                            <div id="bookmarkExistMessage"><span id="message">This URL already exists in the folder "<span id="parentFolderTitle">${truncateString(parentBookmarkExist.title, maxLengthForFolderTitle, 2)}</span>"</span></div>
                            <div id="bookmarkExistButtons">
                                <button id="bookmarkExistOpenParentFolder"></button>
                            </div>
                        </div>
                    `;

                    const addStyleToButton = () => {
                        const bookmarkExistOpenParentFolderEl = document.getElementById('bookmarkExistOpenParentFolder');
                        bookmarkExistOpenParentFolderEl.style.backgroundColor = userActiveProfile.mainUserSettings.windows.button.primary.backgroundColor;
                        bookmarkExistOpenParentFolderEl.style.color = userActiveProfile.mainUserSettings.windows.button.primary.font.color;
                        bookmarkExistOpenParentFolderEl.innerHTML = folderExist;
                    }
                    addStyleToButton();

                    const createTooltipForParentFolderTitleEl = () => {
                        if (parentBookmarkExist.title.length <= maxLengthForFolderTitle) { return; }
                        const style = {
                            backgroundColor: colorPalette[9],
                            color: userActiveProfile.mainUserSettings.windows.window.font.color,
                            padding: '5px',
                            borderRadius: '5px',
                            fontSize: `${userActiveProfile.mainUserSettings.windows.window.font.fontSize}px`,
                            fontWeight: userActiveProfile.mainUserSettings.windows.window.font.fontWeight,
                            fontFamily: userActiveProfile.mainUserSettings.windows.window.font.fontFamily,
                            width: 'fit-content',
                            maxWidth: '300px'
                        }

                        const parentFolderTitleEl = document.getElementById('parentFolderTitle');
                        parentFolderTitleEl.style.textDecorationLine = 'underline';
                        parentFolderTitleEl.style.textDecorationStyle = 'dotted';
                        parentFolderTitleEl.style.textDecorationColor = '#323232';
                        createTooltip(parentFolderTitleEl, 'top', parentBookmarkExist.title, style);
                    }
                    createTooltipForParentFolderTitleEl();

                    const addEventListenerToExistBookmark = () => {
                        const bookmarkExistOpenParentFolderEl = document.getElementById('bookmarkExistOpenParentFolder');

                        const openParentFolder = async () => {
                            const parentFolder = { parentFolderId: bookmarkExist.parentId };
                            const status = await indexedDBManipulation('save', 'openFolder', parentFolder);
                            if (status) { browser.tabs.create({ url: homepageUrl }); setValuesActiveTabPreview(); };
                        }

                        const handleMouseEnter = () => {
                            bookmarkExistOpenParentFolderEl.style.backgroundColor = userActiveProfile.mainUserSettings.windows.button.primary.hoverBackgroundColor;
                            bookmarkExistOpenParentFolderEl.innerHTML = folderExistLink;
                        }

                        const handleMouseLeave = () => {
                            bookmarkExistOpenParentFolderEl.style.backgroundColor = userActiveProfile.mainUserSettings.windows.button.primary.backgroundColor;
                            bookmarkExistOpenParentFolderEl.innerHTML = folderExist;
                        }

                        bookmarkExistOpenParentFolderEl.addEventListener('click', openParentFolder);
                        bookmarkExistOpenParentFolderEl.addEventListener('mouseenter', handleMouseEnter);
                        bookmarkExistOpenParentFolderEl.addEventListener('mouseleave', handleMouseLeave);
                    }
                    addEventListenerToExistBookmark();
                    return;
                }
                newBookmarkInfoObject.title = activeTab.title;
                newBookmarkInfoObject.url = activeTab.url;
                scrollTextUrlEl.innerText = activeTab.url;
                const lastCreatedFolderObject = getLatestCreatedFolder(userActiveProfile.currentUserBookmarks);
                scrollTextFolderEl.innerText = lastCreatedFolderObject.title ? lastCreatedFolderObject.title : '';
                newBookmarkInfoObject.folderId = lastCreatedFolderObject.id ? lastCreatedFolderObject.id : '';
                createScrollingEffectToStationTitle('activeTabPreviewUrl', 'scrollTextUrl');
                createScrollingEffectToStationTitle('activeTabPreviewFolder', 'scrollTextFolder');

                // Capture the screenshot of the tab
                browser.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
                    // Get the base64 encoded data
                    const base64Data = dataUrl.split(',')[1];

                    const base64Image = `data:image/png;base64,${base64Data}`;
                    newBookmarkInfoObject.image = base64Image;
                    activeTabPreviewImageEl.style.backgroundImage = `url("${base64Image}")`;
                });
            });
        }
        setValuesActiveTabPreview();

        const addEventListenerToCreateSaveActiveTabContainer = () => {
            const activeTabPreviewEditButton = document.getElementById('activeTabPreviewEditButton');
            const activeTabPreviewSaveButton = document.getElementById('activeTabPreviewSaveButton');

            const previewButtonToEditBookmark = () => {
                gsap.fromTo(saveActiveTabContainerEl, 1.2, {
                    height: '70px',
                }, {
                    height: '550px',
                    ease: Quad.easeInOut,
                    onComplete: () => {
                        createEditForNewBookmark();
                    }
                });
            }

            const previewButtonToSaveBookmark = () => {
                saveActiveTabBookmark(true);
            }

            activeTabPreviewEditButton.addEventListener('click', previewButtonToEditBookmark);
            activeTabPreviewSaveButton.addEventListener('click', previewButtonToSaveBookmark);
        }
        addEventListenerToCreateSaveActiveTabContainer();
    }
    createSaveActiveTabContainer();
}

const mainFunction = async () => {
    try {
        // Prevent right click on popup
        document.addEventListener('contextmenu', event => event.preventDefault());

        const ifExist = await indexedDBManipulation('has', 'userProfile');
        if (ifExist) {
            userProfile = await indexedDBManipulation('get', 'userProfile');
            if (Object.keys(userProfile).length === 0 && userProfile.constructor === Object) {
                throw Error('Failed to get userProfile');
            }
            userProfile.offline.forEach(profile => {
                if (profile.active) {
                    userActiveProfile = profile;
                }
            });
            createPopupWindow();
            return;
        }
        createPopupWindow('new');

    } catch (error) {
        console.error('Error in MainFunction', error);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        await mainFunction(); // Wait for mainFunction to complete
    } catch (error) {
        console.error('Error:', error);
    }
});
document.addEventListener("beforeunload", async () => {
    try {
        const audioElement = document.getElementById('radioPlayer');
        audioElement.pause();
        audioElement.currentTime = 0;
    } catch (error) {
        console.error('Error:', error);
    }
});