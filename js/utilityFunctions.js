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
import { messageStyle, allowAlphabetCharactersAndNumbers, userProfileExport, userActiveProfile, manageUserProfiles, browserAndOSInfo, filesLocationFromThis } from './main.js';

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
export const findBookmarkByKey = (bookmarks, id, key = 'id') => {
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
    return null; // Return null if no bookmark with the given key value is found
};

/**
 * Searches recursively through a nested array of menu items to find an object with a matching key.
 * @param {Array} arr - The array of menu items to search through.
 * @param {string} key - The key to search for in the menu items.
 * @returns {Object|null} The found object with the matching key, or null if not found.
 */
export const getObjectByKeyInMenuArray = (arr, key) => {
    let result = null; // Initialize result to null to return if no match is found
    const findObject = (arr, key) => { // Define a recursive function to search through the array
        arr.some(item => { // Use .some to iterate; stops if a true value is returned
            if (item.data === key) { // Check if the current item's data matches the key
                result = item; // Assign the matching item to result
                return true; // Return true to stop the iteration
            }
            if (item.submenu && item.submenu.length) { // Check if the item has a submenu with items
                return findObject(item.submenu, key); // Recursively search the submenu
            }
            return false; // Return false to continue the iteration
        });
    };
    findObject(arr, key); // Call the recursive function with the initial array and key
    return result; // Return the found object, or null if not found
};

/**
 * Ported from https://github.com/PimpTrizkit/PJs/blob/master/pSBC.js
 *
 * Returns a pleasing, non-harsh color for a given color and luminosity.
 *
 * @param {number} p The percent of the luminosity to adjust.
 * @param {string} c0 The original color as a hex string.
 * @param {string=} c1 The color to blend with as a hex string. If not specified, c1 will default to white.
 * @param {boolean=} l Whether to return a light or dark color. If not specified, the lighter color will be returned.
 * @return {string} The adjusted color as a hex string.
 */
export const pSBC = (p, c0, c1, l) => {
    let r, g, b, P, f, t, h, i = parseInt, m = Math.round, a = typeof (c1) == "string";
    if (typeof (p) != "number" || p < -1 || p > 1 || typeof (c0) != "string" || (c0[0] != 'r' && c0[0] != '#') || (c1 && !a)) return null;
    h = c0.length > 9, h = a ? c1.length > 9 ? true : c1 == "c" ? !h : false : h, f = pSBCr(c0), P = p < 0, t = c1 && c1 != "c" ? pSBCr(c1) : P ? { r: 0, g: 0, b: 0, a: -1 } : { r: 255, g: 255, b: 255, a: -1 }, p = P ? p * -1 : p, P = 1 - p;
    if (!f || !t) return null;
    if (l) r = m(P * f.r + p * t.r), g = m(P * f.g + p * t.g), b = m(P * f.b + p * t.b);
    else r = m((P * f.r ** 2 + p * t.r ** 2) ** 0.5), g = m((P * f.g ** 2 + p * t.g ** 2) ** 0.5), b = m((P * f.b ** 2 + p * t.b ** 2) ** 0.5);
    a = f.a, t = t.a, f = a >= 0 || t >= 0, a = f ? a < 0 ? t : t < 0 ? a : a * P + t * p : 0;
    if (h) return "rgb" + (f ? "a(" : "(") + r + "," + g + "," + b + (f ? "," + m(a * 1000) / 1000 : "") + ")";
    else return "#" + (4294967296 + r * 16777216 + g * 65536 + b * 256 + (f ? m(a * 255) : 0)).toString(16).slice(1, f ? undefined : -2);
};

/**
 * Ported from https://github.com/PimpTrizkit/PJs/blob/master/pSBC.js
 *
 * Parses a color string and returns an object with its RGBA components.
 *
 * This function takes a color string in various formats (e.g., RGB, RGBA, HEX) and extracts
 * the red, green, blue, and alpha components. It supports both long and short HEX formats,
 * as well as RGB and RGBA formats. The function returns an object containing the RGBA values.
 *
 * @param {string} d - The color string to parse. Can be in RGB, RGBA, or HEX format.
 * @returns {Object|null} - An object with the properties `r`, `g`, `b`, and `a` representing the red, green, blue, and alpha components of the color. Returns null if the input format is invalid.
 */
const pSBCr = (d) => {
    let r, g, b, a, n = d.length, x = {};
    if (n > 9) {
        [r, g, b, a] = d = d.split(","), n = d.length;
        if (n < 3 || n > 4) return null;
        x.r = parseInt(r[3] == "a" ? r.slice(5) : r.slice(4)), x.g = parseInt(g), x.b = parseInt(b), x.a = a ? parseFloat(a) : -1;
    } else {
        if (n == 8 || n == 6 || n < 4) return null;
        if (n < 6) d = "#" + d[1] + d[1] + d[2] + d[2] + d[3] + d[3] + (n > 4 ? d[4] + d[4] : "");
        d = parseInt(d.slice(1), 16);
        if (n == 9 || n == 5) x.r = d >> 24 & 255, x.g = d >> 16 & 255, x.b = d >> 8 & 255, x.a = Math.round((d & 255) / 0.255) / 1000;
        else x.r = d >> 16, x.g = d >> 8 & 255, x.b = d & 255, x.a = -1;
    }
    return x;
};

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
export const checkIfColorBrightness = (color, brightnessLevel = 155) => {
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
export const randomIntFromInterval = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

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
export const getRandomColor = (alpha = false) => {
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
export const getRandomHexColorByType = (type, percentage) => {
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
 * Converts a hexadecimal color to its grayscale equivalent.
 *
 * This function takes a hexadecimal color string and calculates the grayscale
 * value by averaging the RGB components. It returns the grayscale color in hexadecimal format.
 *
 * @param {string} hex - The color in hexadecimal format (e.g., "#RRGGBB" or "#RGB").
 * @returns {string|null} The grayscale color in hexadecimal format, or null if the input is invalid.
 */
export const hexToGrayscale = (hex) => {
    try {
        // Validate input parameter
        if (typeof hex !== 'string' || !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
            throw new Error("Invalid HEX color format. Use '#RRGGBB' or '#RGB'.");
        }

        // Remove the '#' and convert to RGB components
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        // Calculate the average of the RGB components to get the grayscale value
        const grayScale = Math.round((r + g + b) / 3);

        // Convert the grayscale value back to a hexadecimal string
        const grayHex = `#${((1 << 24) + (grayScale << 16) + (grayScale << 8) + grayScale).toString(16).slice(1)}`;

        // Return the grayscale hexadecimal color
        return grayHex;
    } catch (error) {
        console.error(error.message);
        return null;
    }
};

/**
 * Adjusts the color temperature of a given hexadecimal color.
 *
 * This function takes a hexadecimal color and a degree indicating the amount of temperature adjustment.
 * Positive degree values will warm the color, while negative values will cool it.
 *
 * @param {string} hex - The color in hexadecimal format (e.g., "#RRGGBB" or "#RGB").
 * @param {number} degree - The degree to adjust the temperature by. Positive for warming, negative for cooling.
 * @returns {string|null} The adjusted color in hexadecimal format, or null if an error occurs.
 */
export const adjustColorTemperature = (hex, degree) => {
    try {
        // Validate the input parameters
        if (typeof hex !== 'string' || !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
            throw new Error("Invalid HEX color format. Use '#RRGGBB' or '#RGB'.");
        }
        if (typeof degree !== 'number') {
            throw new Error("Degree must be a number.");
        }

        // Remove the '#' and convert the hex to RGB components
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        // Determine the adjustment direction and factor based on the degree
        const adjustment = degree > 0 ? 1 : -1;
        const factor = Math.abs(degree) / 100;

        // Function to adjust individual RGB components
        const adjustColor = (color) => {
            // Calculate the new color value by adjusting towards or away from 255
            return Math.round(color + (adjustment * (255 - color) * factor));
        };

        // Adjust each RGB component
        const newR = adjustColor(r);
        const newG = adjustColor(g);
        const newB = adjustColor(b);

        // Convert the adjusted RGB values back to a hexadecimal color string
        return `#${((1 << 24) + (newR << 16) + (newG << 8) + newB).toString(16).slice(1)}`;
    } catch (error) {
        console.error(error.message);
        return null;
    }
};

/**
 * Shuffles the elements of an array in place and returns the shuffled array.
 *
 * The Fisher-Yates shuffle algorithm is used to ensure all permutations of the array are equally likely.
 *
 * @param {Array} array - The array to shuffle.
 * @returns {Array} - The shuffled array, or null if an error occurs.
 * @throws {Error} - If the input is not an array.
 */
export const shuffleArray = (array) => {
    try {
        // Validate input parameter
        if (!Array.isArray(array)) {
            throw new Error("Input must be an array.");
        }

        // Create a copy of the array to avoid mutating the original
        const shuffledArray = [...array];

        // Fisher-Yates shuffle algorithm
        for (let i = shuffledArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            // eslint-disable-next-line no-param-reassign
            [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
        }

        return shuffledArray;
    } catch (error) {
        console.error(error.message);
        return null;
    }
};

/**
 * Creates a debounced version of a function.
 *
 * The returned function will call the passed function after a specified delay when it is invoked. If the returned function
 * is invoked again before the specified delay has passed, the previous call to the passed function is cancelled and a new
 * call is scheduled after the same delay. This is useful for functions that are expensive or need to be called infrequently.
 *
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay between the last call to the returned function and when the passed function is called.
 * @returns {Function} - The debounced function.
 * @throws {Error} - If an invalid input is provided.
 */
export const debounce = (func, delay) => {
    // Validate input parameters
    if (typeof func !== 'function') {
        throw new Error("First parameter must be a function.");
    }
    if (typeof delay !== 'number' || delay < 0) {
        throw new Error("Delay must be a non-negative number.");
    }

    let timeoutId;

    /**
     * The debounced function.
     * @param {...*} args - The arguments to pass to the original function.
     */
    return function (...args) {
        // Clear the previous timeout
        clearTimeout(timeoutId);
        // Set a new timeout
        timeoutId = setTimeout(() => {
            func.apply(this, args); // Use the correct context
        }, delay);
    };
};

/**
 * Creates a throttled version of a function.
 *
 * The returned function will call the passed function no more than once per specified time period. If the returned function
 * is invoked again before the specified time period has passed, the previous call to the passed function is cancelled and a
 * new call is scheduled after the same delay. This is useful for functions that are expensive or need to be called infrequently.
 *
 * @param {Function} func - The function to throttle.
 * @param {number} limit - The time period in milliseconds between calls to the passed function.
 * @returns {Function|null} - The throttled function or null if an error occurs.
 * @throws {Error} - If an invalid input is provided.
 */
export const throttle = (func, limit) => {
    try {
        // Validate input parameters
        if (typeof func !== 'function') {
            throw new Error("First parameter must be a function.");
        }
        if (typeof limit !== 'number' || limit < 0) {
            throw new Error("Limit must be a non-negative number.");
        }

        let lastFunc;
        let lastRan;

        /**
         * The throttled function.
         * @param {...*} args - The arguments to pass to the original function.
         */
        return function (...args) {
            const context = this;

            if (!lastRan) {
                func.apply(context, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    } catch (error) {
        console.error(error.message);
        return null;
    }
};

/**
 * Splits an array into chunks of a specified size.
 *
 * This function takes an array and a size, and returns a new array with the original array split into chunks of the
 * specified size.
 *
 * @param {Array} array - The array to split.
 * @param {number} size - The size of the chunks to split the array into.
 * @returns {Array<Array>|null} - A new array with the chunks of the original array or null if an error occurs.
 * @throws {Error} - If the first parameter is not an array, or the second parameter is not a positive number.
 */
export const chunkArray = (array, size) => {
    try {
        // Validate input parameters
        if (!Array.isArray(array)) {
            throw new Error("First parameter must be an array.");
        }
        if (typeof size !== 'number' || size <= 0) {
            throw new Error("Size must be a positive number.");
        }

        const result = [];
        for (let i = 0; i < array.length; i += size) {
            result.push(array.slice(i, i + size));
        }

        return result;
    } catch (error) {
        console.error(error.message);
        return null;
    }
};

/**
 * Selects a specified number of random elements from an array.
 *
 * @param {Array} array - The array to select elements from.
 * @param {number} count=1 - The number of elements to select, defaulting to 1.
 * @returns {Array|null} - An array of the selected elements, or null if an error occurs.
 * @throws {Error} - If an invalid input is provided.
 */
export const selectRandomElementFromArray = (array, count = 1) => {
    try {
        // Validate input parameters
        if (!Array.isArray(array) || array.length === 0) {
            throw new Error("Input must be a non-empty array.");
        }
        if (typeof count !== 'number' || count < 1 || count > array.length) {
            throw new Error("Count must be a number between 1 and the length of the array.");
        }

        // Create a Set to store unique random elements
        const selectedElements = new Set();

        while (selectedElements.size < count) {
            const randomIndex = Math.floor(Math.random() * array.length);
            // Add a random element to the Set
            selectedElements.add(array[randomIndex]);
        }

        // Convert the Set to an array and return it
        return Array.from(selectedElements)[0];
    } catch (error) {
        console.error(error.message);
        return null;
    }
};

/**
 * Merges one or more arrays into a single array.
 *
 * @param {boolean} [removeDuplicates=true] - Whether to remove duplicate elements from the merged array.
 * @param {...Array} arrays - The arrays to merge.
 * @returns {Array|null} - The merged array, or null if an error occurs.
 * @throws {Error} - If the input arrays are not valid arrays.
 */
export const mergeArrays = (removeDuplicates = true, ...arrays) => {
    try {
        // Validate input parameters
        if (arrays.length === 0 || !arrays.every(Array.isArray)) {
            throw new Error("Input must be one or more arrays.");
        }
        if (typeof removeDuplicates !== 'boolean') {
            throw new Error("First parameter must be a boolean indicating whether to remove duplicates.");
        }

        // Merge the arrays
        const mergedArray = [].concat(...arrays);

        // Remove duplicates if specified
        if (removeDuplicates) {
            return [...new Set(mergedArray)];
        }

        return mergedArray;
    } catch (error) {
        console.error(error.message);
        return null;
    }
};

/**
 * Calculates the time difference between two Date objects.
 *
 * This function takes two Date objects and calculates the absolute difference between them in terms of days, hours,
 * minutes, seconds, and milliseconds. The difference is returned as an object with the following properties:
 *
 * - days: The difference in days.
 * - hours: The difference in hours.
 * - minutes: The difference in minutes.
 * - seconds: The difference in seconds.
 * - milliseconds: The difference in milliseconds.
 *
 * @param {Date} date1 - The first Date object.
 * @param {Date} date2 - The second Date object.
 * @returns {Object|null} - An object with the calculated time difference, or null if an error occurs.
 */
export const calculateTimeDifference = (date1, date2) => {
    try {
        // Validate input parameters
        if (!(date1 instanceof Date) || !(date2 instanceof Date)) {
            throw new Error("Both parameters must be Date objects.");
        }

        // Calculate the difference in milliseconds
        const differenceInMilliseconds = Math.abs(date2 - date1);

        // Convert milliseconds to days, hours, minutes, seconds, and milliseconds
        const days = Math.floor(differenceInMilliseconds / (1000 * 60 * 60 * 24));
        const hours = Math.floor((differenceInMilliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((differenceInMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((differenceInMilliseconds % (1000 * 60)) / 1000);
        const milliseconds = differenceInMilliseconds % 1000;

        return { days, hours, minutes, seconds, milliseconds };
    } catch (error) {
        console.error(error.message);
        return null;
    }
};

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
export const inputHexValid = (value) => {
    return /^#(([0-9A-Fa-f]{2}){3,4}|[0-9A-Fa-f]{3})$/i.test(value);
}

/**
 * Inverts a hexadecimal color code.
 *
 * This function takes a hexadecimal color code (without the '#' prefix) as input and returns its inverse.
 * The inversion is performed by converting the hex string to a number, applying a bitwise XOR with 0xFFFFFF
 * to invert the color, and then converting it back to a hex string. The function ensures the output is
 * always a 6-character uppercase hexadecimal value, suitable for CSS and other color specifications.
 *
 * @param {string} hex - The hexadecimal color code to invert, without the '#' prefix.
 * @returns {string} The inverted hexadecimal color code, uppercase and with the '#' prefix.
 */
export const invertHexColor = (hex) => {
    // Ensure the input hex is a valid 6-character string by removing any '#' and padding if necessary.
    hex = hex.replace('#', '').padStart(6, '0');
    // Convert the hex string to a number, apply bitwise XOR with 0xFFFFFF to invert the color,
    // convert back to a hex string, remove the leading '1' added for conversion, and uppercase.
    return `#${(Number(`0x1${hex}`) ^ 0xFFFFFF).toString(16).substr(1).toUpperCase()}`;
}

/**
 * Converts an RGB color value to a hexadecimal color code.
 *
 * This function takes an array of RGB color values (red, green, and blue) and converts them into
 * a hexadecimal color code. Each color component is converted to a hexadecimal string. If the resulting
 * hexadecimal string is a single digit, it is padded with a zero to ensure a proper hex format. The function
 * then concatenates these hex strings into a single hex color code prefixed with "#".
 *
 * @param {Array<number>} data - An array containing the RGB values. Each value should be an integer between 0 and 255.
 * @returns {string} The hexadecimal color code corresponding to the input RGB values, formatted as "#RRGGBB".
 */
export const rgbToHex = (data) => {
    let r = Number(data[0]).toString(16);
    let g = Number(data[1]).toString(16);
    let b = Number(data[2]).toString(16);

    if (r.length == 1) r = `0${r}`;
    if (g.length == 1) g = `0${g}`;
    if (b.length == 1) b = `0${b}`;

    return `#${r}${g}${b}`;
}

/**
 * Converts a hexadecimal color code to its RGB string representation.
 *
 * This function accepts a hexadecimal color code as input and converts it to an RGB color format,
 * which includes the red, green, and blue color values. The function supports both short (e.g., "#FFF")
 * and full (e.g., "#FFFFFF") hexadecimal formats. The alpha value is not included in the return string.
 *
 * @param {string} data - The hexadecimal color code to convert. Can be in short (3 characters) or full (6 characters) format.
 * @returns {string} The RGB color representation in the format "r,g,b", where r, g, and b are the color values (0-255).
 */
export const hexToRGB = (data) => {
    let r = 0, g = 0, b = 0, a = 1; // Initialize RGB values, default alpha to 1 (not used in return value).
    if (data.length == 4) {
        // If short hex format, duplicate each character to get the full value.
        r = `0x${data[1]}${data[1]}`;
        g = `0x${data[2]}${data[2]}`;
        b = `0x${data[3]}${data[3]}`;
    } else if (data.length == 7) {
        // If full hex format, parse each color component.
        r = `0x${data[1]}${data[2]}`;
        g = `0x${data[3]}${data[4]}`;
        b = `0x${data[5]}${data[6]}`;
    }

    // Convert parsed hex values to decimal and return the RGB string.
    return `${+r},${+g},${+b}`;
}

/**
 * Converts a hexadecimal color code to its RGBA string representation.
 *
 * This function accepts a hexadecimal color code as input and converts it to an RGBA color format,
 * which includes the red, green, and blue color values along with an alpha value indicating opacity.
 * The function supports both short (e.g., "#FFF") and full (e.g., "#FFFFFF") hexadecimal formats.
 * By default, the alpha value is set to 1, indicating that the color is fully opaque.
 *
 * @param {string} data - The hexadecimal color code to convert. Can be in short (3 characters) or full (6 characters) format.
 * @returns {string} The RGBA color representation in the format "r,g,b,a", where r, g, and b are the color values (0-255) and a is the opacity (1 for fully opaque).
 */
export const hexToRGBA = (data) => {
    let r = 0, g = 0, b = 0, a = 1; // Initialize RGBA values, default alpha to 1 for full opacity.
    if (data.length == 4) { // If short hex format, duplicate each character to get the full value.
        r = `0x${data[1]}${data[1]}`;
        g = `0x${data[2]}${data[2]}`;
        b = `0x${data[3]}${data[3]}`;
    } else if (data.length == 7) { // If full hex format, parse each color component.
        r = `0x${data[1]}${data[2]}`;
        g = `0x${data[3]}${data[4]}`;
        b = `0x${data[5]}${data[6]}`;
    }
    // Convert parsed hex values to decimal and return the RGBA string.
    return `${+r},${+g},${+b},${+a}`;
}

/**
 * Checks if an object is empty.
 *
 * This function determines whether the provided object has no properties. It does this by checking the length
 * of the array returned by Object.keys(), which contains all the enumerable property names of the object.
 * If the object is not an object, it is considered empty.
 *
 * @param {Object} obj - The object to check for emptiness.
 * @returns {boolean} - Returns true if the object has no properties, false otherwise.
 */
export const isObjectEmpty = (obj) => typeof obj === 'object' ? Object.keys(obj).length === 0 : true;

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
export const resizeImageBase64 = (base64Str, maxWidth = 170, maxHeight = 150) => {
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
export const truncateString = (inputString, maxLength, preserveEndLength) => {
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
 * Determines the format of a given color string.
 *
 * This function analyzes the input color string to determine its format. It supports detection of
 * HEX, RGB, RGBA, HSL, and HSLA color formats. The detection is based on regular expression matching against
 * the expected patterns of each color format. If the input does not match any of the known patterns,
 * the function returns 'Unknown'.
 *
 * @param {string} inputColor - The color string to be analyzed for format detection.
 * @returns {string} - Returns the detected color format as 'HEX', 'RGB', 'RGBA', 'HSL', 'HSLA', or 'Unknown' if the format cannot be determined.
 */
export const getColorFormat = (inputColor) => {
    if (/^#([0-9A-F]{3}){1,2}$/i.test(inputColor) || /^#([0-9A-F]{4}){1,2}$/i.test(inputColor)) {
        return 'HEX';
    } else if (/^rgb\(\s*(\d{1,3}%?,\s*){2}\d{1,3}%?\s*\)$/i.test(inputColor)) {
        return 'RGB';
    } else if (/^rgba\(\s*(\d{1,3}%?,\s*){3}\d{1,3}%?\s*\)$/i.test(inputColor)) {
        return 'RGBA';
    } else if (/^hsl\(\s*\d{1,3},\s*\d{1,3}%,\s*\d{1,3}%\s*\)$/i.test(inputColor)) {
        return 'HSL';
    } else if (/^hsla\(\s*\d{1,3},\s*\d{1,3}%,\s*\d{1,3}%\s*,\s*(0|1|0\.\d+)\s*\)$/i.test(inputColor)) {
        return 'HSLA';
    } else {
        return 'Unknown';
    }
};

/**
 * Checks if a given URL is allowed to create a screenshot.
 * This function validates a URL against a regular expression to ensure it is well-formed,
 * then checks if the URL's protocol is within a predefined list of allowed protocols for creating screenshots.
 * It is designed to prevent attempts to create screenshots from potentially malicious or unsupported URLs.
 *
 * @param {string} url - The URL to check for eligibility to create a screenshot.
 * @returns {boolean} Returns true if the URL is allowed to create a screenshot, false otherwise.
 *                    The function ensures a boolean value is always returned to maintain consistency.
 */
export const checkIfAllowedToCreateScreenshotFromURL = (url) => {
    try {
        let regexUrl = new RegExp('^(https?:\\/\\/)?((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|((\\d{1,3}\\.){3}\\d{1,3}))(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*(\\?[;&a-z\\d%_.~+=-]*)?(\\#[-a-z\\d_]*)?$', 'i');
        if (regexUrl.test(url)) {
            let checkUrl = new URL(url);
            if (allowURLProtocolsToCreateScreenshot.includes(checkUrl.protocol) && checkUrl.hostname.length > 0) {
                return true;
            } else {
                return false;
            }
        }
    } catch (error) {
        if (error instanceof TypeError) {
            return false;
        } else {
            console.error(error);
        }
    }
}

/**
 * Changes the color of an image encoded in base64 format.
 * This function creates a new image element from a base64 string, draws it onto a canvas,
 * applies a new color overlay using global composite operation, and then converts the canvas
 * back to a base64 image string. The new color can be any valid CSS color value.
 *
 * @param {string} base64Image - The base64-encoded image string to be recolored.
 * @param {string} newColor - The new color to apply to the image. Can be any CSS color value (e.g., hex, rgba).
 * @returns {Promise<string>} A promise that resolves with the new base64-encoded image string with the applied color overlay.
 *                            The promise rejects if there is an error loading the original base64 image.
 */
export const changeBase64ImageColor = (base64Image, newColor) => {
    return new Promise((resolve, reject) => {
        // Create a new Image
        let img = new Image();
        img.onload = () => {
            // Create a canvas element
            let canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            let ctx = canvas.getContext('2d');
            // Draw the image onto the canvas
            ctx.drawImage(img, 0, 0);
            // Apply the new color overlay
            ctx.fillStyle = newColor;
            ctx.globalCompositeOperation = "source-atop";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            // Convert the canvas back to a base64 image
            let newBase64 = canvas.toDataURL();
            resolve(newBase64);
        };
        img.onerror = reject;
        // Set the source of the image to the base64 string
        img.src = base64Image;
    });
};

/**
 * Replaces the stroke color in an SVG string.
 * @param {string} svgString - The original SVG string to modify.
 * @param {string} newColor - The new color to replace the existing stroke color.
 * @returns {string} The modified SVG string with the updated stroke color.
 */
export const replaceStrokeColor = (svgString, newColor) => {
    if (typeof svgString !== 'string' && typeof newColor !== 'string') {
        return '';
    }
    if (svgString.length === 0 || newColor.length === 0) {
        return '';
    }
    return svgString.replace(/stroke="[^"]*"/, `stroke="${newColor}"`);
};

/**
 * Displays a toast notification with customizable options.
 * This function utilizes the Toastify library to display toast notifications with various customization options such as type, message, duration, and style. It supports dynamic color changes for icons based on the message type by altering the base64 image color.
 *
 * @param {string} type - The type of the toast message (e.g., 'success', 'info', 'warning', 'error', 'default'). Determines the color scheme and icon of the toast.
 * @param {string} node - The HTML element to which the toast will be attached. If empty, the toast is attached to the body.
 * @param {string} message - The message to be displayed in the toast.
 * @param {number} duration - The duration in milliseconds for which the toast will be visible. A value of -1 means the toast will remain visible until manually closed.
 * @param {boolean} close - Determines whether a close button is displayed on the toast.
 * @param {string} gravity - The vertical position of the toast ('top' or 'bottom').
 * @param {string} position - The horizontal position of the toast ('left', 'center', or 'right').
 * @param {boolean} stopOnFocus - Whether the toast should stop disappearing when the window gains focus.
 * @param {boolean} oldestFirst - Whether older messages should be displayed above newer ones.
 * @param {Object} offset - The offset of the toast from the edge of the screen, specified as an object with 'x' and 'y' properties.
 * @param {boolean} escapeMarkup - Whether HTML markup in the message should be escaped, preventing XSS attacks.
 * @param {string} url - A URL to which the user will be redirected when the toast is clicked. If empty, the toast is not clickable.
 * @param {boolean} urlNewWindow - Whether the URL should be opened in a new window/tab.
 * @returns {void} This function does not return a value.
 */
export const showMessageToastify = async (type = 'success', node = '', message = '', duration = -1, close = false, gravity = 'bottom', position = 'right', stopOnFocus = true, oldestFirst = true, offset = {}, escapeMarkup = true, url = '', urlNewWindow = true) => {
    let style = {};
    let icon = ``;
    switch (type) {
        case 'success':
            await changeBase64ImageColor(messageStyle.success.base64, messageStyle.success.textColor).then(newBase64Image => { icon = newBase64Image; }).catch(error => { console.error('Error changing image color:', error); });
            style = {
                background: messageStyle.success.backgroundColor,
                borderRadius: '5px',
                padding: '25px 10px 25px 30px',
                color: messageStyle.success.textColor,
                cursor: 'default',
                width: '350px',
                textWrap: 'wrap',
                boxShadow: '8px 10px 23px 0px #262626db',
            };
            break;
        case 'info':
            await changeBase64ImageColor(messageStyle.info.base64, messageStyle.info.textColor).then(newBase64Image => { icon = newBase64Image; }).catch(error => { console.error('Error changing image color:', error); });
            style = {
                background: messageStyle.info.backgroundColor,
                borderRadius: '5px',
                padding: '25px 10px 25px 30px',
                color: messageStyle.info.textColor,
                cursor: 'default',
                width: '350px',
                textWrap: 'wrap',
                boxShadow: '8px 10px 23px 0px #262626db',
            };
            break;
        case 'warning':
            await changeBase64ImageColor(messageStyle.warning.base64, messageStyle.warning.textColor).then(newBase64Image => { icon = newBase64Image; }).catch(error => { console.error('Error changing image color:', error); });
            style = {
                background: messageStyle.warning.backgroundColor,
                borderRadius: '5px',
                padding: '25px 10px 25px 30px',
                color: messageStyle.warning.textColor,
                cursor: 'default',
                width: '350px',
                textWrap: 'wrap',
                boxShadow: '8px 10px 23px 0px #262626db',
            };
            break;
        case 'error':
            await changeBase64ImageColor(messageStyle.error.base64, messageStyle.error.textColor).then(newBase64Image => { icon = newBase64Image; }).catch(error => { console.error('Error changing image color:', error); });
            style = {
                background: messageStyle.error.backgroundColor,
                borderRadius: '5px',
                padding: '25px 10px 25px 30px',
                color: messageStyle.error.textColor,
                cursor: 'default',
                width: '350px',
                textWrap: 'wrap',
                boxShadow: '8px 10px 23px 0px #262626db',
            };
            break;
        case 'default':
            await changeBase64ImageColor(messageStyle.default.base64, messageStyle.default.textColor).then(newBase64Image => { icon = newBase64Image; }).catch(error => { console.error('Error changing image color:', error); });
            style = {
                background: messageStyle.default.backgroundColor,
                borderRadius: '5px',
                padding: '25px 10px 25px 30px',
                color: messageStyle.default.textColor,
                cursor: 'default',
                width: '350px',
                textWrap: 'wrap',
                boxShadow: '8px 10px 23px 0px #262626db',
            };
            break;
    }
    Toastify({
        text: message,
        node: node,
        duration: duration,
        close: close,
        gravity: gravity,
        position: position,
        stopOnFocus: stopOnFocus,
        avatar: icon,
        oldestFirst: oldestFirst,
        style: style,
        offset: offset,
        escapeMarkup: escapeMarkup,
        destination: url,
        newWindow: urlNewWindow,
        onClick: () => { },
        callback: () => { },
    }).showToast();
}

/**
 * Sorts the children of a given folder object by their index property.
 * @param {Object} currentFolderObj - The folder object whose children are to be sorted.
 */
export const sortFolderByChildrenIndex = (currentFolderObj) => {
    // Check if the currentFolderObj is valid and has a children array
    if (!currentFolderObj || !Array.isArray(currentFolderObj.children)) {
        console.error("Invalid input or missing children array in the object."); // Log error if validation fails
        return; // Exit the function if the input is invalid
    }
    try {
        // Sort the children array by the index property
        currentFolderObj.children.sort((a, b) => a.index - b.index);
    } catch (error) {
        console.error("Error sorting the children by index:", error); // Log error if sorting fails
        return error;
    }
};

/**
 * Applies a set of CSS styles to a given DOM element.
 * @param {HTMLElement} element - The DOM element to which the styles will be applied.
 * @param {Object} styles - An object where keys are CSS properties (in camelCase) and values are the CSS values.
 */
export const applyStylesToElement = (element, styles) => {
    // Iterate over the styles object entries
    Object.entries(styles).forEach(([property, value]) => {
        // Convert camelCase properties to kebab-case and assign the corresponding value
        element.style[property.replace(/([A-Z])/g, '-$1').toLowerCase()] = value;
    });
};

/**
 * Calculates the next maximum index based on the highest index found in an array of objects.
 * Each object in the array is expected to have an 'index' property.
 * @param {Object[]} arrOfObj - The array of objects to search through.
 * @returns {number} The next maximum index, which is one greater than the highest index found.
 * @throws {Error} Throws an error if the input is not a valid array or other errors occur.
 */
export const getNextMaxIndex = (arrOfObj) => {
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
        // Propagate the error to the caller
        return error;
    }
};

/**
 * Generates a random ID for an object with a specified length, ensuring uniqueness within a set of bookmarks.
 * @param {number} number The length of the ID to generate. Defaults to 12 if not specified.
 * @returns {string} A unique ID consisting of allowed alphabet characters and numbers.
 */
export const generateRandomIdForObj = (number = 12) => {
    let id = ""; // Initialize the id variable to store the generated ID.
    let ifIdIsUnique = undefined; // Variable to check if the generated ID is unique among bookmarks.
    const getId = () => { // Function to generate a random ID.
        id = ""; // Reset id for each generation attempt.
        for (let i = 0; i < number; i++) { // Loop to generate each character of the ID.
            id += allowAlphabetCharactersAndNumbers[Math.floor(Math.random() * allowAlphabetCharactersAndNumbers.length)]; // Append a random character from the allowed set to the id.
        }
        ifIdIsUnique = findBookmarkByKey(userProfileExport.currentUserBookmarks, id); // Check if the generated ID is unique by searching the bookmarks.
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
 * Generates a random ID string based on the specified parameters.
 * The function can create an ID with numbers, lowercase letters, uppercase letters, and special characters, depending on the provided arguments.
 * It ensures the generated ID has the specified length by randomly selecting characters from the combined set of allowed characters.
 *
 * @param {number} [length=10] - The length of the generated ID string.
 * @default 10
 *
 * @param {boolean} [numbersOnly=false] - If true, the generated ID will consist of numbers only.
 * @default false
 *
 * @param {boolean} [includeUppercase=false] - If true, the generated ID will include uppercase letters.
 * @default false
 *
 * @param {boolean} [includeSpecialChars=false] - If true, the generated ID will include special characters.
 * @default false
 *
 * @returns {string} A randomly generated ID string.
 */
export const generateRandomID = (length = 10, numbersOnly = false, includeUppercase = false, includeSpecialChars = false) => {
    // Constant strings representing different sets of characters.
    const numbers = '0123456789';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const specialChars = '!@#$%^&*()_+~`|}{[]:;?><,./-=';

    // Determine the set of characters to be used based on the input parameters.
    let characters = numbersOnly ? numbers : numbers + lowercase;
    if (includeUppercase) characters += uppercase;
    if (includeSpecialChars) characters += specialChars;

    // Generate the random ID string.
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

/**
 * Converts a timestamp to a localized date string.
 * @param {number|string} timestamp - The timestamp to convert. Can be a number or an ISO string.
 * @param {string} locale - The locale to use for formatting the date string. Defaults to 'en-US'.
 * @param {string} format - The format of the date string. Can be 'date', 'time', 'fileName', or 'dateAndTime'. Defaults to 'dateAndTime'.
 * @returns {string|null} The formatted date string or null if the input is invalid.
 */
export const formatDateTime = (timestamp, locale = 'en-US', format = 'dateAndTime') => {
    // Validate the input timestamp.
    if (timestamp == null || (typeof timestamp !== 'number' && typeof timestamp !== 'string')) {
        return null;
    }
    try {
        // Convert the timestamp to a Date object.
        const date = new Date(timestamp);
        // Format the date based on the specified format and locale.
        let formattedDate;
        switch (format) {
            case 'date':
                formattedDate = date.toLocaleDateString(locale);
                break;
            case 'time':
                formattedDate = date.toLocaleTimeString(locale);
                break;
            case 'fileName':
                const getFileNameDate = () => `${date.toLocaleDateString(locale).replace(/[/]+/g, '-')}_${date.toLocaleTimeString(locale).replace(/:/g, '-')}`;
                formattedDate = getFileNameDate();
                break;
            case 'dateAndTime':
            default:
                formattedDate = date.toLocaleString(locale);
                break;
        }
        return formattedDate;
    } catch (error) {
        // Handle specific error for invalid locale by retrying with default locale.
        if (error.message.includes('invalid language tag')) {
            return formatDateTime(timestamp, 'en-US', format);
        } else {
            console.error('Failed to convert date:', error);
            return null;
        }
    }
};

/**
 * Capitalizes the first 'num' letters of a string. If 'capitalizeEachWord' is true, it capitalizes the first 'num' letters of each word in the string.
 * @param {string} str - The string to be capitalized.
 * @param {number} num - The number of characters to capitalize at the start of the string or each word.
 * @param {boolean} capitalizeEachWord - Whether to capitalize the first 'num' letters of each word.
 * @returns {string} The capitalized string.
 */
export const capitalizeString = (str, num = 1, capitalizeEachWord = false) => {
    // Check if each word in the string should be capitalized
    if (capitalizeEachWord) {
        // Split the string into words, capitalize the first 'num' letters of each, and join them back together
        return str.split(' ').map(word => word.substring(0, num).toUpperCase() + word.substring(num)).join(' ');
    } else {
        // Capitalize the first 'num' letters of the entire string
        return str.substring(0, num).toUpperCase() + str.substring(num);
    }
};

/**
 * Corrects the indexes of bookmarks and their children recursively to ensure they are in sequential order.
 * @param {Array} bookmarks - An array of bookmark objects that may contain children bookmarks.
 */
export const correctIndexes = (bookmarks) => {
    try {
        if (!Array.isArray(bookmarks)) throw new Error('bookmarks is not an array');
        // Iterate over each bookmark in the array
        bookmarks.forEach(bookmark => {
            // Check if the bookmark has children and if the children array is not empty
            if (bookmark.children && bookmark.children.length > 0) {
                // Sort the children by their current index in ascending order and then reassign their indexes
                bookmark.children.sort((a, b) => a.index - b.index).forEach((child, index) => {
                    child.index = index; // Set the child's index to its position in the sorted array
                    correctIndexes([child]); // Recursively correct the indexes of this child's children, if any
                });
            }
        });
    } catch (error) {
        console.error('Error correcting indexes:', error); // Log any errors encountered during the process
        return error;
    }
};

/**
 * Moves an object within its parent array based on the specified move status.
 * @param {Array} bookmarks - The parent array containing objects.
 * @param {string} parentId - The ID of the parent object.
 */
export const updateIdsAndParentIds = (bookmarks, parentId = 'root') => {
    return bookmarks.map((bookmark, index) => {
        // Generate a new ID for the current bookmark
        const newId = generateRandomIdForObj();

        // Create a new bookmark object with updated id and parentId
        const updatedBookmark = {
            ...bookmark,
            id: newId,
            parentId: parentId,
        };

        // If the bookmark has children, recursively update their IDs and parentIds
        if (bookmark.children && bookmark.children.length > 0) {
            updatedBookmark.children = updateIdsAndParentIds(bookmark.children, newId);
        }

        return updatedBookmark;
    });
};

/**
 * Moves an object within its parent array based on the specified move status.
 * @param {Array} array - The parent array containing objects.
 * @param {string} parentId - The ID of the parent object.
 * @param {string} moveStatus - The status indicating where to move the object ('before', 'next').
 * @param {string} movedObjId - The ID of the object to be moved.
 * @param {string} moveToObjId - The ID of the object to move the moved object next to or before.
 */
export const moveObjectInParentArray = (array, parentId, moveStatus, movedObjId, moveToObjId) => {
    try {
        // Find the parent object within the array
        const parentObj = findBookmarkByKey(array, parentId);
        // If parent object not found, throw an error
        if (!parentObj) throw new Error('Parent object not found', parentObj);
        // Get the children array of the parent object
        const children = parentObj.children;
        // Find the index of the object to be moved within the children array
        const movedObjIndex = children.findIndex(obj => obj.id === movedObjId);
        // Find the index of the object to move the moved object next to or before
        const moveToObjIndex = children.findIndex(obj => obj.id === moveToObjId);
        // If either object is not found, throw an error
        if (movedObjIndex === -1 || moveToObjIndex === -1) throw new Error('Object not found');
        // Remove the object to move from its current position
        const [movedObj] = children.splice(movedObjIndex, 1);
        // Set the index property of the moved object to the index it will be moved to
        movedObj.index = moveToObjIndex;
        // Determine where to insert the moved object based on the moveStatus parameter
        if (moveStatus === 'before') { // Insert it before the target
            children.splice(moveToObjIndex, 0, movedObj);
        } else if (moveStatus === 'next') { // Insert it after the target
            children.splice(moveToObjIndex + 1, 0, movedObj);
        } else { // If the moveStatus is neither 'before' nor 'next', throw an error
            throw new Error('Wrong input moveStatus');
        }
    } catch (error) {
        // Log and propagate any errors that occur during the move operation
        console.error('Error moving object in parent array:', error);
        return error;
    }
};

/**
 * Updates the IDs, dateAdded, and dateGroupModified properties of bookmarks and their children recursively.
 *
 * @param {Array} bookmarks - The array of bookmark objects to update.
 * @param {string} parentId - The ID of the parent bookmark.
 * @param {number} dateTime - The timestamp to set for dateAdded and dateGroupModified properties.
 * @returns {error} - An error if one of the input parameters is invalid.
 * @description This function generates new unique IDs for each bookmark and its children,
 *              updates their dateAdded and dateGroupModified properties with the provided timestamp,
 *              and sets the parentId for each child bookmark.
 */
export const changeIds = (bookmarks, parentId, dateTime) => {
    try {
        // Validate input parameters.
        if (isObjectEmpty(bookmarks)) {
            throw new Error('Invalid bookmarks array');
        }
        // Validate parent ID.
        if (typeof parentId !== 'string' || parentId.trim() === '') {
            throw new Error('Invalid parent ID');
        }
        // Validate date timestamp.
        if (typeof dateTime !== 'number' || !isValidDate(dateTime)) {
            throw new Error('Invalid date timestamp');
        }
        /**
         * Recursively updates the IDs and timestamps of a bookmark node and its children.
         *
         * @param {Object} node - The bookmark node to update.
         * @param {string} parentId - The ID of the parent bookmark.
         */
        const updateIds = (node, parentId) => {
            node.id = generateRandomIdForObj(); // Generate a new unique ID for the node.
            node.dateAdded = dateTime; // Set the dateAdded property to the provided timestamp.
            node.dateGroupModified = dateTime; // Set the dateGroupModified property to the provided timestamp.
            node.parentId = parentId; // Set the parentId property to the provided parent ID.

            // If the node has children, recursively update their IDs and timestamps.
            if (node.children && node.children.length > 0) {
                node.children.forEach(child => updateIds(child, node.id, dateTime));
            }
        };

        // Start the recursive update process for the provided bookmarks array.
        updateIds(bookmarks, parentId, dateTime);
    } catch (error) {
        console.error('Error in changeIds', error);
        return error;
    }
};

/**
 * Performs actions like copy, cut, or delete on an object within an array.
 * @param {Array} arr - The array containing objects.
 * @param {string} action - The action to perform ('copy', 'cut', 'delete').
 * @param {string} id - The ID of the object to be acted upon.
 * @param {string} newParentId - The ID of the new parent object.
 * @returns {boolean} - Indicates whether the action was successful.
 */
export const actionForArray = async (arr, action, id, newParentId) => {
    try {
        // Validate the action
        if (!['copy', 'cut', 'delete'].includes(action)) {
            console.error(`Error action ${action}. Allow only: 'copy', 'cut', 'delete'`);
            throw Error('Invalid action'); // Return false if the action is invalid
        }
        // Check if the array is empty
        if (arr.length == 0) {
            console.error(`Empty input array`);
            throw Error('Array is empty'); // Return false if the array is empty
        }
        let syncObject = {};
        // Find the object by ID
        let obj = findBookmarkByKey(arr, id);
        // If the object is not found, log an error and return false
        if (obj == null || obj == undefined) {
            throw Error('OBJ is not found'); // Return false if the object is not found
        }
        let newObj = {};
        const dateTime = new Date().getTime();
        // Find the parent object by ID
        let parentObj = findBookmarkByKey(arr, obj.parentId);
        // If the parent object is not found, log an error and return false
        if (parentObj == null || parentObj == undefined) {
            console.error('Error to find parent obj');
            throw Error('Parent OBJ is not found'); // Return false if the parent object is not found
        }
        // Find the new parent object by ID
        let newParentObj = findBookmarkByKey(arr, newParentId);
        // If the new parent object is not found, log an error and return false
        if (newParentObj == null || newParentObj == undefined) {
            throw Error('Parent OBJ is not found'); // Return false if the parent object is not found
        }
        // Check if the new parent object is a folder
        if (newParentObj.type != 'folder') {
            throw Error('Parent OBJ is not a folder'); // Return false if the parent object is not a folder
        }
        // Perform the action based on the action parameter
        if (action == 'cut') { // Cut the object
            // Calculate the index for the object within the new parent's children array
            if (newParentObj.children.length > 0) {
                obj.index = Math.max(...newParentObj.children.map(v => v.index)) + 1;
            } else {
                obj.index = 0;
            }
            parentObj.children = parentObj.children.filter(v => v.id != id);
            obj.parentId = newParentId;
            newParentObj.children.push(obj);
            updateDateGroupModified(userProfileExport.currentUserBookmarks, newParentObj.id, dateTime);
            syncObject = {
                status: 'move',
                id: obj.id,
                parentId: obj.parentId === userProfileExport.mainUserSettings.main.synchronizationToBrowser.extensionFolderId ? userProfileExport.mainUserSettings.main.synchronizationToBrowser.browserFolderId : obj.parentId,
            };
            newObj.id = obj.id;
        } else if (action == 'copy') { // Copy the object
            newObj = structuredClone(obj);
            try {
                changeIds(newObj, newParentId, dateTime);
            } catch (error) {
                console.error('Error changing IDs:', error);
                throw error; // Propagate the error
            }
            if (newObj.children && Array.isArray(newObj.children)) {
                newObj.children.forEach(child => { child.parentId = newObj.id });
            }
            newObj.dateAdded = dateTime;
            newObj.parentId = newParentId;
            newObj.index = getNextMaxIndex(newParentObj.children);
            newParentObj.children.push(newObj);
            updateDateGroupModified(userProfileExport.currentUserBookmarks, newParentObj.id, dateTime);
            syncObject = {
                status: 'create',
                id: newObj.id,
                title: newObj.title,
                url: newObj.url.trim().length > 0 ? newObj.url : null,
                parentId: newObj.parentId === userProfileExport.mainUserSettings.main.synchronizationToBrowser.extensionFolderId ? userProfileExport.mainUserSettings.main.synchronizationToBrowser.browserFolderId : newObj.parentId,
            };
        } else if (action == 'delete') { // Delete the object
            parentObj.children = parentObj.children.filter(v => v.id != id);
            updateDateGroupModified(userProfileExport.currentUserBookmarks, parentObj.id, dateTime);
        }
        const status = await indexedDBManipulation('save', 'tempBookmarkObject', syncObject);
        if (status) {
            browser.runtime.sendMessage({ sync: { savedNewObject: true } })
                .then(response => {})
                .catch(error => {
                    console.error("Error sending message:", error);
                }
            );
        }
        userActiveProfile.currentUserBookmarks = userProfileExport.currentUserBookmarks;
        let saveStatus = await manageUserProfiles('save');
        if (saveStatus) {
            return { status: true, id: newObj.id }; // Return true to indicate success and new object ID
        } else {
            console.warn('Default bookmark style saved:', saveStatus);
            throw new Error('Failed to save new bookmarks');
        }
    } catch (error) {
        console.error('', error);
        return { status: false };
    }
};

/**
 * Updates the dateGroupModified property recursively in the bookmarks tree.
 * @param {Array} bookmarks - The array of bookmarks or bookmark folders.
 * @param {string} targetId - The ID of the target bookmark or bookmark folder.
 * @param {Date} newDate - The new value for the dateGroupModified property.
 */
export const updateDateGroupModified = (bookmarks, targetId, newDate) => {
    /**
     * Recursively finds the target node by ID and updates its dateGroupModified property.
     * @param {Array} nodes - The array of bookmarks or bookmark folders to search.
     * @returns {boolean} - Returns true if the target node is found and updated, otherwise false.
     */
    const findAndUpdate = (nodes) => {
        for (let node of nodes) {
            if (node.id === targetId) {
                node.dateGroupModified = newDate;
                return true;
            }
            if (node.children && findAndUpdate(node.children)) {
                node.dateGroupModified = newDate;
                return true;
            }
        }
        return false;
    };
    findAndUpdate(bookmarks);
};

/**
 * Moves an element within an array from one position to another.
 *
 * This function takes an array and the indices of the element to move and the target position,
 * then returns a new array with the element moved to the target position. The function ensures
 * that the order of other elements is adjusted accordingly.
 *
 * @param {Array} arr - The array containing the elements to be manipulated.
 * @param {number} from - The index of the element to move.
 * @param {number} to - The target index where the element should be moved.
 * @returns {Array} A new array with the element moved to the specified position.
 *
 */
export const moveElementsInArray = (arr, from, to) => arr.map((item, i) => i === to ? arr[from] : (i >= Math.min(from, to) && i <= Math.max(from, to) ? arr[i + Math.sign(to - from)] : item));

/**
 * Determines the type of a given variable.
 * This function checks the type of the input variable and returns a string representing its type.
 * It handles special cases for `null` and arrays, and uses `typeof` for other types.
 *
 * @param {*} variable - The variable whose type is to be determined.
 * @returns {string} - A string representing the type of the variable. Possible values are:
 *                     'null', 'array', 'object', 'boolean', 'number', 'string', 'undefined', 'function', 'symbol', 'bigint'.
 * @throws {Error} - Throws an error if there is an issue determining the type.
 */
export const getType = (variable) => {
    try {
        if (variable === null) return 'null';
        if (Array.isArray(variable)) return 'array';
        return typeof variable;
    } catch (error) {
        console.error('Error determining type:', error);
        return error;
    }
};

/**
 * Fetches an image from a given URL and converts it to a Base64 encoded string.
 *
 * @param {string} imageUrl - The URL of the image to fetch.
 * @returns {Promise<string>} - A promise that resolves to a Base64 encoded string of the image.
 * @description This function fetches an image from the specified URL using the Fetch API with 'no-cors' mode and a header to allow cross-origin requests. 
 *              It then converts the fetched image blob to a Base64 encoded string using a FileReader.
 */
export const fetchImageAsBase64 = async (imageUrl) => {
    try {
        // Fetch the image from the provided URL with 'no-cors' mode and CORS headers
        const response = await fetch(imageUrl, {
            mode: 'no-cors',
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
        });
        // Check if the response is not OK, and throw an error if it isn't
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        // Convert the response to a blob
        const blob = await response.blob();
        // Return a promise that resolves to a Base64 encoded string of the image
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = (error) => reject(`FileReader error: ${error}`);
        });
    } catch (error) {
        // Log and propagate any errors that occur during the fetch or conversion process
        console.error(`Error in fetchImageAsBase64: ${error}`);
        return error;
    }
};

/**
 * Retrieves information about the user's browser and operating system.
 *
 * @returns {Object} An object containing details about the browser and operating system.
 * @returns {Object} return.browser - Information about the browser.
 * @returns {string} return.browser.name - The name of the browser.
 * @returns {string} return.browser.version - The version of the browser.
 * @returns {string} return.browser.userAgent - The user agent string of the browser.
 * @returns {Object} return.os - Information about the operating system.
 * @returns {string} return.os.name - The name of the operating system.
 * @returns {string} return.os.platform - The platform string of the operating system.
 */
export const getBrowserAndOSInfo = () => {
    try {
        const userAgent = navigator.userAgent;
        const platform = navigator.platform;

        const getBrowserName = (userAgent) => {
            if (userAgent.includes("Firefox")) {
                return "Firefox";
            } else if (userAgent.includes("Opera") || userAgent.includes("OPR")) {
                return "Opera";
            } else if (userAgent.includes("Edg")) {
                return "Edge";
            } else if (userAgent.includes("Chrome")) {
                return "Chrome";
            } else if (userAgent.includes("Safari")) {
                return "Safari";
            } else if (userAgent.includes("MSIE") || userAgent.includes("Trident")) {
                return "Internet Explorer";
            } else {
                return "Unknown";
            }
        }

        const getBrowserVersion = (userAgent) => {
            const browserName = getBrowserName(userAgent);
            let versionMatch;

            switch (browserName) {
                case "Firefox":
                    versionMatch = userAgent.match(/Firefox\/([\d.]+)/);
                    break;
                case "Opera":
                case "OPR":
                    versionMatch = userAgent.match(/(Opera|OPR)\/([\d.]+)/);
                    break;
                case "Edge":
                    versionMatch = userAgent.match(/Edg\/([\d.]+)/);
                    break;
                case "Chrome":
                    versionMatch = userAgent.match(/Chrome\/([\d.]+)/);
                    break;
                case "Safari":
                    versionMatch = userAgent.match(/Version\/([\d.]+)/);
                    break;
                case "Internet Explorer":
                    versionMatch = userAgent.match(/(MSIE|rv:)([\d.]+)/);
                    break;
                default:
                    return "Unknown";
            }

            return versionMatch ? versionMatch[1] : "Unknown"; // Return the matched version or "Unknown" if no match is found
        }

        const getOSName = (userAgent) => {
            if (/Windows/.test(userAgent)) {
                return "Windows";
            } else if (/Mac OS/.test(userAgent)) {
                return "MacOS";
            } else if (/Linux/.test(userAgent) || /X11/i.test(userAgent)) {
                return "Linux";
            } else if (/Android/.test(userAgent)) {
                return "Android";
            } else if (/iPhone|iPad|iPod/.test(userAgent)) {
                return "iOS";
            } else {
                return "Unknown";
            }
        }
        // Browser information
        const browser = {
            name: getBrowserName(userAgent),
            version: getBrowserVersion(userAgent),
            userAgent: userAgent,
        };
        // OS information
        const os = {
            name: getOSName(userAgent),
            platform: platform,
        };
        // Extension information
        const extension = {
            version: '',
        };
        readFile(filesLocationFromThis.manifest).then(text => {
            const setAsJson = JSON.parse(text);
            extension.version = setAsJson.version;
        }).catch(error => {
            console.error(error);
        });
        const returnObject = { browser, os, extension };
        return returnObject; // Return the browser and OS information
    } catch (error) {
        console.error('Error in getBrowserAndOSInfo:', error); // Log and propagate any errors that occur during the browser and OS information retrieval process
        return null;
    }
}

/**
 * Retrieves an array of supported font families.
 *
 * @returns {Array} An array of objects. Each object contains the font family name and its corresponding generic font name.
 * @returns {Object} return font family object - An object containing information about the font family.
 * @returns {number} return.fontFamilyObject.id - A unique identifier for the font family.
 * @returns {string} return.fontFamilyObject.fontFamily - The name of the font family.
 * @returns {string} return.fontFamilyObject.genericFontName - The generic font name of the font family, such as serif, sans-serif, or monospace.
 */
export const getSupportedFontFamilies = () => {
    try {
        const osType = browserAndOSInfo.os.name;
        let fontFamilies;

        if (/^win/i.test(osType)) {
            // Windows OS font families
            fontFamilies = [
                { id: 1, fontFamily: 'Arial', genericFontName: 'sans-serif' },
                { id: 2, fontFamily: 'Arial Black', genericFontName: 'sans-serif' },
                { id: 3, fontFamily: 'Bahnschrift', genericFontName: 'serif' },
                { id: 4, fontFamily: 'Calibri', genericFontName: 'sans-serif' },
                { id: 5, fontFamily: 'Cambria', genericFontName: 'serif' },
                { id: 6, fontFamily: 'Cambria Math', genericFontName: 'serif' },
                { id: 7, fontFamily: 'Candara', genericFontName: 'sans-serif' },
                { id: 8, fontFamily: 'Comic Sans MS', genericFontName: 'sans-serif' },
                { id: 9, fontFamily: 'Consolas', genericFontName: 'monospace' },
                { id: 10, fontFamily: 'Constantia', genericFontName: 'serif' },
                { id: 11, fontFamily: 'Corbel', genericFontName: 'sans-serif' },
                { id: 12, fontFamily: 'Courier New', genericFontName: 'monospace' },
                { id: 13, fontFamily: 'Ebrima', genericFontName: 'serif' },
                { id: 14, fontFamily: 'Franklin Gothic Medium', genericFontName: 'sans-serif' },
                { id: 15, fontFamily: 'Gabriola', genericFontName: 'script' },
                { id: 16, fontFamily: 'Gadugi', genericFontName: 'serif' },
                { id: 17, fontFamily: 'Georgia', genericFontName: 'serif' },
                { id: 18, fontFamily: 'HoloLens MDL2 Assets', genericFontName: 'sans-serif' },
                { id: 19, fontFamily: 'Impact', genericFontName: 'sans-serif' },
                { id: 20, fontFamily: 'Ink Free', genericFontName: 'script' },
                { id: 21, fontFamily: 'Javanese Text', genericFontName: 'serif' },
                { id: 22, fontFamily: 'Leelawadee UI', genericFontName: 'sans-serif' },
                { id: 23, fontFamily: 'Lucida Console', genericFontName: 'monospace' },
                { id: 24, fontFamily: 'Lucida Sans Unicode', genericFontName: 'sans-serif' },
                { id: 25, fontFamily: 'Malgun Gothic', genericFontName: 'sans-serif' },
                { id: 26, fontFamily: 'Marlett', genericFontName: 'symbol' },
                { id: 27, fontFamily: 'Microsoft Himalaya', genericFontName: 'serif' },
                { id: 28, fontFamily: 'Microsoft JhengHei', genericFontName: 'sans-serif' },
                { id: 29, fontFamily: 'Microsoft New Tai Lue', genericFontName: 'serif' },
                { id: 30, fontFamily: 'Microsoft PhagsPa', genericFontName: 'serif' },
                { id: 31, fontFamily: 'Microsoft Sans Serif', genericFontName: 'sans-serif' },
                { id: 32, fontFamily: 'Microsoft Tai Le', genericFontName: 'serif' },
                { id: 33, fontFamily: 'Microsoft YaHei', genericFontName: 'sans-serif' },
                { id: 34, fontFamily: 'Microsoft Yi Baiti', genericFontName: 'serif' },
                { id: 35, fontFamily: 'Segoe UI', genericFontName: 'sans-serif' },
                { id: 36, fontFamily: 'Tahoma', genericFontName: 'sans-serif' },
                { id: 37, fontFamily: 'Times New Roman', genericFontName: 'serif' },
                { id: 38, fontFamily: 'Verdana', genericFontName: 'sans-serif' },
                { id: 39, fontFamily: 'MingLiU-ExtB', genericFontName: 'serif' },
                { id: 40, fontFamily: 'Mongolian Baiti', genericFontName: 'serif' },
                { id: 41, fontFamily: 'MS Gothic', genericFontName: 'sans-serif' },
                { id: 42, fontFamily: 'MV Boli', genericFontName: 'script' },
                { id: 43, fontFamily: 'Myanmar Text', genericFontName: 'serif' },
                { id: 44, fontFamily: 'Nirmala UI', genericFontName: 'sans-serif' },
                { id: 45, fontFamily: 'Palatino Linotype', genericFontName: 'serif' },
                { id: 46, fontFamily: 'Segoe MDL2 Assets', genericFontName: 'sans-serif' },
                { id: 47, fontFamily: 'Segoe Print', genericFontName: 'script' },
                { id: 48, fontFamily: 'Segoe Script', genericFontName: 'script' },
                { id: 49, fontFamily: 'Segoe UI Historic', genericFontName: 'sans-serif' },
                { id: 50, fontFamily: 'Segoe UI Emoji', genericFontName: 'symbol' },
                { id: 51, fontFamily: 'Segoe UI Symbol', genericFontName: 'symbol' },
                { id: 52, fontFamily: 'SimSun', genericFontName: 'serif' },
                { id: 53, fontFamily: 'Sitka', genericFontName: 'serif' },
                { id: 54, fontFamily: 'Sylfaen', genericFontName: 'serif' },
                { id: 55, fontFamily: 'Symbol', genericFontName: 'symbol' },
                { id: 56, fontFamily: 'Webdings', genericFontName: 'symbol' },
                { id: 57, fontFamily: 'Wingdings', genericFontName: 'symbol' },
                { id: 58, fontFamily: 'Yu Gothic', genericFontName: 'sans-serif' },
                { id: 59, fontFamily: 'inherit', genericFontName: ' ' },
            ];
        } else if (/^mac/i.test(osType)) {
            // macOS OS font families
            fontFamilies = [
                { id: 1, fontFamily: 'American Typewriter', genericFontName: 'serif' },
                { id: 2, fontFamily: 'Andale Mono', genericFontName: 'monospace' },
                { id: 3, fontFamily: 'Arial', genericFontName: 'sans-serif' },
                { id: 4, fontFamily: 'Arial Black', genericFontName: 'sans-serif' },
                { id: 5, fontFamily: 'Arial Narrow', genericFontName: 'sans-serif' },
                { id: 6, fontFamily: 'Arial Rounded MT Bold', genericFontName: 'sans-serif' },
                { id: 7, fontFamily: 'Arial Unicode MS', genericFontName: 'sans-serif' },
                { id: 8, fontFamily: 'Baskerville', genericFontName: 'serif' },
                { id: 9, fontFamily: 'Big Caslon', genericFontName: 'serif' },
                { id: 10, fontFamily: 'Bodoni 72', genericFontName: 'serif' },
                { id: 11, fontFamily: 'Bodoni 72 Oldstyle', genericFontName: 'serif' },
                { id: 12, fontFamily: 'Bodoni 72 Smallcaps', genericFontName: 'serif' },
                { id: 13, fontFamily: 'Bradley Hand', genericFontName: 'script' },
                { id: 14, fontFamily: 'Brush Script MT', genericFontName: 'script' },
                { id: 15, fontFamily: 'Chalkboard', genericFontName: 'sans-serif' },
                { id: 16, fontFamily: 'Chalkboard SE', genericFontName: 'sans-serif' },
                { id: 17, fontFamily: 'Chalkduster', genericFontName: 'sans-serif' },
                { id: 18, fontFamily: 'Charter', genericFontName: 'serif' },
                { id: 19, fontFamily: 'Cochin', genericFontName: 'serif' },
                { id: 20, fontFamily: 'Comic Sans MS', genericFontName: 'sans-serif' },
                { id: 21, fontFamily: 'Copperplate', genericFontName: 'serif' },
                { id: 22, fontFamily: 'Courier', genericFontName: 'monospace' },
                { id: 23, fontFamily: 'Courier New', genericFontName: 'monospace' },
                { id: 24, fontFamily: 'Didot', genericFontName: 'serif' },
                { id: 25, fontFamily: 'DIN Alternate', genericFontName: 'sans-serif' },
                { id: 26, fontFamily: 'DIN Condensed', genericFontName: 'sans-serif' },
                { id: 27, fontFamily: 'Futura', genericFontName: 'sans-serif' },
                { id: 28, fontFamily: 'Geneva', genericFontName: 'sans-serif' },
                { id: 29, fontFamily: 'Georgia', genericFontName: 'serif' },
                { id: 30, fontFamily: 'Gill Sans', genericFontName: 'sans-serif' },
                { id: 31, fontFamily: 'Helvetica', genericFontName: 'sans-serif' },
                { id: 32, fontFamily: 'Helvetica Neue', genericFontName: 'sans-serif' },
                { id: 33, fontFamily: 'Herculanum', genericFontName: 'sans-serif' },
                { id: 34, fontFamily: 'Hoefler Text', genericFontName: 'serif' },
                { id: 35, fontFamily: 'Impact', genericFontName: 'sans-serif' },
                { id: 36, fontFamily: 'Lucida Grande', genericFontName: 'sans-serif' },
                { id: 37, fontFamily: 'Luminari', genericFontName: 'script' },
                { id: 38, fontFamily: 'Marker Felt', genericFontName: 'script' },
                { id: 39, fontFamily: 'Menlo', genericFontName: 'monospace' },
                { id: 40, fontFamily: 'Microsoft Sans Serif', genericFontName: 'sans-serif' },
                { id: 41, fontFamily: 'Monaco', genericFontName: 'monospace' },
                { id: 42, fontFamily: 'Noteworthy', genericFontName: 'script' },
                { id: 43, fontFamily: 'Optima', genericFontName: 'sans-serif' },
                { id: 44, fontFamily: 'Palatino', genericFontName: 'serif' },
                { id: 45, fontFamily: 'Papyrus', genericFontName: 'sans-serif' },
                { id: 46, fontFamily: 'Phosphate', genericFontName: 'script' },
                { id: 47, fontFamily: 'Rockwell', genericFontName: 'serif' },
                { id: 48, fontFamily: 'Savoye LET', genericFontName: 'script' },
                { id: 49, fontFamily: 'SignPainter', genericFontName: 'script' },
                { id: 50, fontFamily: 'Skia', genericFontName: 'script' },
                { id: 51, fontFamily: 'Snell Roundhand', genericFontName: 'script' },
                { id: 52, fontFamily: 'Tahoma', genericFontName: 'sans-serif' },
                { id: 53, fontFamily: 'Times', genericFontName: 'serif' },
                { id: 54, fontFamily: 'Times New Roman', genericFontName: 'serif' },
                { id: 55, fontFamily: 'Trattatello', genericFontName: 'script' },
                { id: 56, fontFamily: 'Trebuchet MS', genericFontName: 'sans-serif' },
                { id: 57, fontFamily: 'Verdana', genericFontName: 'sans-serif' },
                { id: 58, fontFamily: 'Zapfino', genericFontName: 'script' },
                { id: 59, fontFamily: 'inherit', genericFontName: ' ' },
            ];
        } else if (/^linux/i.test(osType)) {
            // Linux OS font families
            fontFamilies = [
                { id: 1, fontFamily: 'DejaVu Sans', genericFontName: 'sans-serif' },
                { id: 2, fontFamily: 'DejaVu Serif', genericFontName: 'serif' },
                { id: 3, fontFamily: 'FreeMono', genericFontName: 'monospace' },
                { id: 4, fontFamily: 'FreeSans', genericFontName: 'sans-serif' },
                { id: 5, fontFamily: 'FreeSerif', genericFontName: 'serif' },
                { id: 6, fontFamily: 'Liberation Mono', genericFontName: 'monospace' },
                { id: 7, fontFamily: 'Liberation Sans', genericFontName: 'sans-serif' },
                { id: 8, fontFamily: 'Liberation Serif', genericFontName: 'serif' },
                { id: 9, fontFamily: 'Noto Sans', genericFontName: 'sans-serif' },
                { id: 10, fontFamily: 'Noto Serif', genericFontName: 'serif' },
                { id: 11, fontFamily: 'Ubuntu', genericFontName: 'sans-serif' },
                { id: 12, fontFamily: 'Arial', genericFontName: 'sans-serif' },
                { id: 13, fontFamily: 'Courier', genericFontName: 'monospace' },
                { id: 14, fontFamily: 'inherit', genericFontName: ' ' },
            ];
        } else {
            // Default font families for other or unknown OS
            fontFamilies = [
                { id: 1, fontFamily: 'Arial', genericFontName: 'sans-serif' },
                { id: 2, fontFamily: 'Times New Roman', genericFontName: 'serif' },
                { id: 3, fontFamily: 'Courier New', genericFontName: 'monospace' },
                { id: 4, fontFamily: 'Helvetica', genericFontName: 'sans-serif' },
                { id: 5, fontFamily: 'Georgia', genericFontName: 'serif' },
                { id: 6, fontFamily: 'Verdana', genericFontName: 'sans-serif' },
                { id: 7, fontFamily: 'Tahoma', genericFontName: 'sans-serif' },
                { id: 8, fontFamily: 'Lucida Console', genericFontName: 'monospace' },
                { id: 9, fontFamily: 'Palatino Linotype', genericFontName: 'serif' },
                { id: 10, fontFamily: 'Comic Sans MS', genericFontName: 'sans-serif' },
                { id: 11, fontFamily: 'inherit', genericFontName: ' ' },
            ];
        }

        return fontFamilies;
    } catch (error) {
        console.error('Error in Font Families', error);
        return null;
    }
};

/**
 * Calculates gradient percentages for an array of colors.
 *
 * @param {Array} colors - The array of color strings.
 * @returns {Array} An array of strings representing the colors with their respective gradient percentages.
 * @description This function takes an array of colors and calculates the gradient percentages for each color.
 *              It ensures that the colors are evenly distributed across the gradient.
 *              If the input is not a non-empty array, it logs an error and returns an empty array.
 */
export const calculateGradientPercentages = (colors) => {
    if (!Array.isArray(colors) || colors.length === 0) {
        console.error("Invalid input: colors must be a non-empty array.");
        return [];
    }
    return colors.map((color, index) => {
        const percentage = (index / (colors.length - 1)) * 100; // Calculate the percentage for the current color.
        return `${color} ${percentage.toFixed(2)}%`; // Return the color with its gradient percentage.
    });
};

/**
 * Converts a given number of bytes into a human-readable string format.
 * The function handles conversions to bytes, KB, MB, GB, and TB.
 *
 * @param {number} bytes - The number of bytes to be converted.
 * @returns {string} - A string representing the size in a human-readable format.
 * @description This function takes a number representing bytes and converts it to a more readable format such as KB, MB, GB, or TB.
 * It uses conditional checks to determine the appropriate unit and performs the necessary division to convert the size.
 */
export const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} bytes`; // If bytes are less than 1024, return as bytes.
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`; // If bytes are less than 1 MB, convert to KB.
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`; // If bytes are less than 1 GB, convert to MB.
    if (bytes < 1024 * 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`; // If bytes are less than 1 TB, convert to GB.
    return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB`; // If bytes are 1 TB or more, convert to TB.
}

/**
 * Ensures that the given URL string starts with 'HTTPS://' or 'HTTP://'.
 * If it doesn't, prepends 'HTTPS://' to the string.
 * @param {string} url - The URL string to check and modify.
 * @returns {string} - The modified URL string starting with 'HTTPS://'.
 */
export const ensureHttps = (url) => {
    // Check if the URL is a valid string
    if (typeof url !== 'string') {
        throw new Error('Input must be a string');
    }

    if (url.length === 0) { return '' };

    // Trim whitespace from the URL
    url = url.trim();

    // Check if the URL starts with 'HTTPS://' or 'HTTP://'
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
        // Prepend 'HTTPS://' if neither is present
        url = 'https://' + url;
    }

    return url;
};

/**
 * Validates if a given string is a valid date in either ISO format or Unix timestamp.
 *
 * @param {string} str - The date string to validate.
 * @returns {boolean} - Returns true if the string is a valid date, otherwise false.
 * @description This function checks if the input string is in ISO format or Unix timestamp format.
 * If the string matches the ISO format, it attempts to parse it as a date.
 * If the string matches the Unix timestamp format, it attempts to parse it as a timestamp.
 * The function returns true if the parsed date or timestamp is valid, otherwise false.
 */
export const isValidDate = (str) => {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(str)) {
        // ISO format, try to parse it
        const date = new Date(str);
        return !isNaN(date.getTime());
    } else if (/^([0-9]){13}$/.test(str)) {
        // Unix timestamp, try to parse it
        const timestamp = parseInt(str, 10);
        return timestamp > 0 && timestamp < 3250368000000; // rough check for valid timestamp
    } else {
        return false;
    }
}

/**
 * Checks if a given image string is in Base64 format.
 *
 * @param {string} image - The image string to check.
 * @returns {boolean} - Returns true if the image string is in Base64 format, otherwise false.
 * @description This function validates whether the provided image string is in Base64 format.
 * It first checks if the input is a non-empty string.
 * Then, it uses a regular expression to test if the string matches the Base64 image format.
 */
export const checkIfImageBase64 = (image) => {
    if (typeof image !== 'string' || image.trim() === '') {
        return false;
    }
    // Regular expression to check if the string is a Base64 encoded image
    const regex = /^data:image\/[^;]+;base64,/;
    return regex.test(image);
};

/**
 * Updates the value and background color of an input element with a given hex color.
 * Optionally allows for alpha transparency in the color picker.
 * @param {string} inputElementId The ID of the input element to update.
 * @param {string} hexColor The hex color value to set the input element's value and background color to.
 * @param {boolean} [alpha=false] Flag to enable or disable alpha transparency in the color picker.
 * @param {string} [editWindowBackgroundColor] The background color of the edit window.
 */
export const updateColorisInputValue = (inputElementId, hexColor, alpha = false, editWindowBackgroundColor) => {
    // Get the input element by its ID
    const inputElement = document.getElementById(inputElementId);
    // Validate the hex color input, if invalid, log a warning and set a default transparent color
    if (!inputHexValid(hexColor)) {
        console.warn('Wrong color input');
        hexColor = '#00000000' // Default transparent color
    }
    // If the input element does not exist, log an error and exit the function
    if (!inputElement) {
        console.error('Element not found');
        return;
    }
    // Initialize Coloris with specific options for the input element
    Coloris.setInstance(`#${inputElementId}`, {
        themeMode: 'dark', // Set the theme mode to dark
        alpha: alpha, // Enable or disable alpha transparency
        focusInput: false, // Do not focus the input after color selection
        inline: true, // Display the color picker inline
        formatToggle: false, // Disable the format toggle button
    });
    // Set the input element's value to the specified hex color
    inputElement.value = hexColor;
    // Change the input element's border color to the invert hex color of window background color
    const windowBackgroundColor = editWindowBackgroundColor !== undefined && editWindowBackgroundColor.length > 0 ? editWindowBackgroundColor : userProfileExport.mainUserSettings.windows.window.backgroundColor;
    inputElement.style.border = `1px solid ${checkIfColorBrightness(windowBackgroundColor, 120) ? '#000000' : '#ffffff'}`;
    // Change the input element's background color to the specified hex color
    inputElement.style.backgroundColor = hexColor.slice(0, 7);
    // Change the input element's color to the specified invert hex color
    inputElement.style.color = checkIfColorBrightness(hexColor.slice(0, 7), 120) ? '#000000' : '#ffffff';
    // Dispatch an 'input' event to notify any listeners of the change
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
};

/**
 * Sets the value of an input range and updates the corresponding output element to display this value.
 * Additionally, it adjusts the output element's position to align with the input's thumb, providing a visual cue for the value.
 * This function is particularly useful for creating a synchronized range slider and output display, enhancing user experience by visually indicating the current value of the range input.
 *
 * @param {string} inputElementId - The ID of the input range element. This parameter is required to identify the input element whose value needs to be set and synchronized with an output element.
 * @param {string} outputElementId - The ID of the output element where the range value is to be displayed. This parameter is required to identify the output element that will display the value of the range input.
 * @param {string} setValue - The value to set on the input range. If not provided, the current value of the input is used. This parameter is optional and allows for setting a specific value on the range input programmatically.
 * @param {boolean} loadFirstTime - A flag indicating whether this is the first time the function is called for the input element. If true, the output element's position is set to a default starting position. This parameter is optional and defaults to true, ensuring backward compatibility and flexibility in use cases.
 */
export const updateInputRangeAndOutput = (inputElementId, outputElementId, setValue = '', loadFirstTime = true) => {
    // Validate that both input and output element IDs are provided and not empty.
    if (inputElementId != '' && inputElementId != null && inputElementId != undefined &&
        outputElementId != '' && outputElementId != null && outputElementId != undefined) {
        // Retrieve the input and output elements by their IDs.
        const inputElement = document.getElementById(inputElementId);
        const outputElement = document.getElementById(outputElementId);

        /**
         * Updates the output element's content and position based on the input element's current value.
         * The position is calculated to align with the input's thumb, providing a visual cue for the value.
         */
        const setValueToOutput = () => {
            if (loadFirstTime) {
                outputElement.style.left = `0px`;
                outputElement.innerHTML = DOMPurify.sanitize(`&#8734;`); // Sets a default or placeholder value on the first load.
            }
            // Calculate the percentage position of the input's current value within its range.
            let value = Number((inputElement.value - inputElement.min) * 100 / (inputElement.max - inputElement.min));
            // Calculate the adjustment needed for the output element's position to align with the input's thumb.
            let positionOutputElement = 0 - (value * 0.338);
            // Update the output element's content with the input's current value.
            outputElement.innerHTML = DOMPurify.sanitize(inputElement.value);
            // Adjust the output element's position based on the calculated percentage.
            outputElement.style.left = `calc(${value}% + (${positionOutputElement}px))`;
        };

        // If a specific value is provided, update the input element's value to this value.
        if (setValue != '' && setValue != null && setValue != undefined) {
            const typeOfSetValue = getType(setValue);
            switch (typeOfSetValue) {
                case 'string':
                    inputElement.value = Number(setValue.replace(/\D/g, ''));
                    break;
                case 'number':
                    inputElement.value = setValue;
                    break;
                default:
                    console.error('Wrong type of value');
                    break;
            }
            // Delay the output update to ensure it reflects the new value accurately, especially on the first load.
            loadFirstTime ? setTimeout(() => { setValueToOutput() }, 200) : setValueToOutput();
        }
    }
};

/**
 * Finds and returns the path from a given bookmark node to the root of the bookmark tree.
 *
 * @param {Object[]} bookmarks - The array of bookmark nodes to search within. Each node is expected to have an `id`, `title`, and optionally `children`.
 * @param {string} id - The ID of the bookmark node to find the path for.
 * @returns {Promise<Object[]>} A promise that resolves with an array representing the path from the found node to the root.
 */
export const findPathToRoot = (bookmarks, id) => {
    const path = []; // Initialize an array to store the path from the node to the root

    // Recursive function to traverse the bookmark nodes.
    const findNode = (nodes, targetId) => {
        for (const { id: nodeId, title, parentId, children } of nodes) { // Destructure node properties
            // Check if the current node is the target node
            if (nodeId === targetId) {
                path.push({ id: nodeId, title }); // Add the node to the path array
                return true; // Target node found
            }
            // If the current node has children, recursively search them
            if (children && findNode(children, targetId)) {
                path.push({ id: nodeId, title }); // Add the current node to the path array
                return true; // Target node found in children
            }
        }
        return false; // Target node not found in this branch
    };

    // Start the search from the root nodes
    const found = findNode(bookmarks, id);

    // If the target node was not found, reject the promise
    if (!found) {
        return Promise.reject(new Error('Target node not found'));
    }

    // Reverse the path to get it from the target node to the root
    return Promise.resolve(path.reverse());
};

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
export const indexedDBManipulation = async (status, key, data) => {
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
                    console.error(status,error);
                    return false;
                });
            case 'get':
                return getDataFromIndexedDB(key).then((result) => {
                    return result;
                }).catch((error) => {
                    console.error(status, error);
                    return false;
                });
            case 'has':
                return getKeysFromIndexedDB().then((result) => {
                    if (result.includes(key)) {
                        return true;
                    }
                    return false;
                }).catch((error) => {
                    console.error(status, error);
                    return null;
                })
            case 'remove':
                return removeDataFromIndexedDB(key).then(() => {
                    return true;
                }).catch((error) => {
                    console.error(status, error);
                    return null;
                })
            case 'getKeys':
                return getKeysFromIndexedDB().then((result) => {
                    return result;
                }).catch((error) => {
                    console.error(status, error);
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
 * Generates a palette of colors based on the input color.
 * If the input color is light, it generates darker colors; if dark, it generates lighter colors.
 *
 * @param {string} userColor - The base color in HEX format.
 * @param {number} amountColors - The number of colors to generate (e.g., 10).
 * @param {number} adjustmentPercentage - The percentage to adjust each color (e.g., 5 for 5%).
 * @returns {string[]} An array of HEX colors.
 */
export const generateColorPalette = (userColor, amountColors = 10, adjustmentPercentage = 5) => {
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
 * Class to return a random element from an array.
 */
export class returnRandomElementFromArray {
    /**
     * Creates an instance of returnRandomElementFromArray.
     * @param {Array} array - The array from which to return a random element.
     */
    constructor(array) {
        this.array = array;
    }

    /**
     * Returns a random element from the array.
     * @returns {*} A random element from the array.
     */
    returnRandomElementFromArray() {
        return this.array[Math.floor(Math.random() * this.array.length)];
    }
}

/**
 * Class to return a random element from an object.
 */
export class returnRandomElementFromObject {
    /**
     * Creates an instance of returnRandomElementFromObject.
     * @param {Object} object - The object from which to return a random element.
     */
    constructor(object) {
        /**
         * The object from which to return a random element.
         * @type {Object}
         */
        this.object = object;
    }

    /**
     * Returns a random element from the object. Supports nested objects.
     * @returns {*} A random element from the object.
     */
    returnRandomElementFromObject() {
        const flattenObject = (obj) => {
            const flattened = {};
            Object.keys(obj).forEach(key => {
                const value = obj[key];
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    Object.assign(flattened, flattenObject(value));
                } else {
                    flattened[key] = value;
                }
            });
            return flattened;
        };
        const flattened = flattenObject(this.object);
        const keys = Object.keys(flattened);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        return { [randomKey]: flattened[randomKey] };
    }
}

/**
 * Reads a file from the given location and returns its content.
 * @function readFile
 * @param {string} fileLocation - The location of the file to read.
 * @param {boolean} [parseJson=false] - Whether to parse the file content as JSON.
 * @param {string} [mimeType='text/plain'] - The MIME type of the file.
 * @returns {(string|Object|false)} The file content or the parsed JSON object if parseJson is true or false.
 * @throws {Error} If the file cannot be read or if it is not a valid JSON file.
 */
export const readFile = async (fileLocation, parseJson = false, mimeType = 'text/plain') => {
    try {
        const response = await fetch(fileLocation, {
            headers: {
                'Content-Type': mimeType
            }
        });
        if (!response.ok) {
            throw new Error(`Failed to read file: ${response.statusText}`);
        }
        const fileContent = await response.text();
        if (parseJson) {
            try {
                return JSON.parse(fileContent);
            } catch (error) {
                throw new Error(`Failed to parse JSON: ${error.message}`);
            }
        }
        return fileContent;
    } catch (error) {
        console.error(`Error reading file: ${error.message}`);
        return false;
    }
};
/**
 * Shows an emoji picker in a given element.
 * The emoji picker is fetched from the EmojiMart library.
 * The emoji data is fetched from the file emoji.json.
 * @param {string} element - The id of the HTML element where the emoji picker will be shown.
 * @returns {(Object|false)} An object containing the emoji data or false if the emoji data file cannot be read.
 * @throws {Error} If the element with the given id is not found or if the emoji data file cannot be read.
 */
export const showEmojiPicker = async (element) => {
    try {
        const el = document.getElementById(element);
        if (!el) {
            throw new Error(`element with id "${element}" not found`);
        }

        return new Promise(async (resolve) => {
            /**
             * The default settings for the emoji picker.
             * @type {Object}
             */
            const pickerDefaults = {
                categories: [
                    'frequent',
                    'people',
                    'nature',
                    'foods',
                    'activity',
                    'places',
                    'objects',
                    'symbols',
                    'flags',
                    'custom-emojis'
                ],
                custom: [
                    {
                        id: 'custom-emojis',
                        name: 'Custom Emojis',
                        emojis: [],
                    }
                ],
                /**
                 * The function called when an emoji is selected.
                 * @param {Object} emoji - The selected emoji.
                 */
                onEmojiSelect: (emoji) => {
                    const selectedEmojiObject = emoji;
                    el.innerHTML = DOMPurify.sanitize('');
                    resolve(selectedEmojiObject); // Resolve the promise with the selected emoji
                },
                /**
                 * The function called when the user clicks outside the emoji picker.
                 */
                onClickOutside: () => {
                    el.innerHTML = DOMPurify.sanitize('');
                    resolve(false); // Resolve with false if clicked outside
                },
                /**
                 * The function called when the user adds a custom emoji.
                 */
                onAddCustomEmoji: () => {
                    el.innerHTML = DOMPurify.sanitize('');
                    resolve(false); // Resolve with false if custom emoji added
                },
                autoFocus: false,
                categoryIcons: {
                    "custom-emojis": {
                        svg: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path d="m19 9-1.25-2.75L15 5l2.75-1.25L19 1l1.25 2.75L23 5l-2.75 1.25Zm0 14-1.25-2.75L15 19l2.75-1.25L19 15l1.25 2.75L23 19l-2.75 1.25ZM9 20l-2.5-5.5L1 12l5.5-2.5L9 4l2.5 5.5L17 12l-5.5 2.5Zm0-4.85L10 13l2.15-1L10 11 9 8.85 8 11l-2.15 1L8 13ZM9 12"/></svg>',
                    },
                },
                dynamicWidth: false,
                emojiButtonColors: [],
                emojiButtonRadius: '100%',
                emojiButtonSize: 36,
                emojiSize: 20,
                emojiVersion: 14,
                exceptEmojis: [],
                icons: 'auto',
                locale: 'en',
                maxFrequentRows: 1,
                navPosition: 'top',
                noCountryFlags: false,
                noResultsEmoji: 'cry',
                perLine: 9,
                previewEmoji: 'point_up',
                previewPosition: 'bottom',
                searchPosition: 'sticky',
                set: 'native',
                skin: 1,
                skinTonePosition: 'preview',
                theme: 'auto',
            };

            const emojiData = await readFile('../json/emoji.json', true);
            const emojiCustom = await readFile('../json/custom-emoji.json', true);
            if (emojiData) {
                pickerDefaults.data = emojiData;
            } else {
                console.log("Error reading file");
            }
            if (emojiCustom) {
                pickerDefaults.custom[0].emojis = emojiCustom;
            } else {
                console.log("Error reading file");
            }

            /**
             * Create the emoji picker.
             * @type {EmojiMart.Picker}
             */
            const picker = new EmojiMart.Picker(pickerDefaults);
            el.appendChild(picker);
        });
    } catch (error) {
        console.error('Error showing emoji picker', error);
        return false;
    }
}

/**
 * Animates a DOM element using the specified animation object.
 *
 * @param {string|HTMLElement} el - The element or the ID of the element to animate.
 * @param {Object} animationObject - The animation configuration object.
 * @param {boolean} animationObject.status - The status of the animation.
 * @param {Array} animationObject.type - The types of animations to apply.
 */
export const animateElement = (el, animationObject) => {
    try {
        let element;
        if (typeof el === 'string') {
            element = document.getElementById(el);
        } else {
            element = el;
        };
        if (!animationObject.status && animationObject.type.length === 0 && !element) { return; };
        const rect = element.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const x = (rect.left + rect.width / 2) / screenWidth * 100;
        const y = (rect.top) / screenHeight * 100;
        const position = { x, y };
        let emojiSVG = [];
        let amount = 0;
        animationObject.type.forEach(emoji => {
            amount = amount + parseInt(emoji.amount);
            emojiSVG.push(
                {
                    src: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text x='10' y='75' font-family='Arial' font-size='80' fill=''>${emoji.native}</text></svg>`,
                },
            );
        });
        confetti({
            count: amount,
            angle: 90,
            spread: 40,
            startVelocity: 10,
            decay: 0.89,
            flat: false,
            gravity: 0.1,
            drift: 0,
            ticks: 200,
            position: position,
            shapes: ['image'],
            shapeOptions: {
                image: emojiSVG,
            },
            scalar: 5.8,
            zIndex: 100,
            disableForReducedMotion: true
        });
    } catch (error) {
        console.error('', error);
        return error;
    }
}

/**
 * Recursively retrieves an array of objects with key, value, type, and path from a nested object.
 * @param {Object} obj - The object to traverse.
 * @param {Array} parentPath - The path to the current object (used for recursion).
 * @returns {Array} - An array of objects representing the structure of the nested object.
 */
export const getFormattedNestedObjects = (obj, parentPath = []) => {
    // Initialize an array to hold the resulting objects
    let result = [];

    // Check if the input is an object and not null
    if (obj && typeof obj === 'object') {
        // Iterate over each key in the object
        for (const key in obj) {
            const value = obj[key];
            const currentPath = [...parentPath, key]; // Create the current path

            // Determine the type of the value
            const type = Array.isArray(value) ? 'array' : typeof value;

            // Push the current key-value pair to the result
            result.push({
                key: key,
                value: value,
                type: type,
                path: currentPath,
            });

            // If the value is an object or an array, recurse into it
            if (type === 'object' || type === 'array') {
                result = result.concat(getFormattedNestedObjects(value, currentPath));
            }
        }
    }

    return result;
};

/**
 * Retrieves a value from a nested object using a specified path.
 * @param {Object} obj - The object to traverse.
 * @param {Array} path - The path to the desired value (array of keys/indices).
 * @returns {*} - The value at the specified path, or undefined if the path is invalid.
 */
export const getValueByPath = (obj, path) => {
    return path.reduce((accumulator, key) => {
        // Check if the current accumulator is an object and has the key
        if (accumulator && typeof accumulator === 'object' && key in accumulator) {
            return accumulator[key]; // Move to the next level
        }
        return undefined; // Return undefined if the path is invalid
    }, obj);
};

/**
 * Counts from a start value to an end value over a specified duration.
 * @param {number} start - The starting value of the count.
 * @param {number} end - The ending value of the count.
 * @param {number} duration - The total duration for the count in milliseconds.
 * @param {HTMLElement} element - The DOM element to update with the current count.
 */
export const countTo = (start, end, duration, element) => {
    // Validate input parameters
    if (typeof start !== 'number' || typeof end !== 'number' || typeof duration !== 'number' || !(element instanceof HTMLElement)) {
        console.error('Invalid input parameters. Please provide valid numbers and a DOM element.');
        return;
    }

    // Calculate the increment and the interval time
    const increment = (end - start) / (duration / 100);
    let currentCount = start;

    // Clear the element before starting the count
    element.textContent = currentCount;

    // Use setInterval to update the count at regular intervals
    const intervalId = setInterval(() => {
        currentCount += increment;

        // Check if the current count exceeds the end value
        if ((increment > 0 && currentCount >= end) || (increment < 0 && currentCount <= end)) {
            currentCount = end; // Ensure we set it to the exact end value
            clearInterval(intervalId); // Stop the interval
        }

        // Update the DOM element with the current count
        element.textContent = Math.round(currentCount); // Round to the nearest integer
    }, 100); // Update every 100 milliseconds
};

/**
 * Creates a tooltip that appears when the user hovers over a specified element.
 * @param {HTMLElement} hoverElement - The element that triggers the tooltip when hovered.
 * @param {string} position - The position of the tooltip relative to the trigger element.
 *     Valid values are 'top', 'bottom', 'left', and 'right'.
 * @param {string} text - The text to display in the tooltip.
 * @param {Object} customStyles - Optional custom styles to apply to the tooltip.
 */
export const createTooltip = (hoverElement, position, text, customStyles) => {
    let tooltip;

    /**
     * Creates the tooltip element and appends it to the document body.
     */
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
            pointerEvents: 'none', // Prevent the tooltip from interfering with mouse events
            zIndex: 9000,
            textAlign: 'justify',
            whiteSpace: 'wrap',
            ...customStyles // Apply custom styles
        });
        document.body.appendChild(tooltip);
    };

    /**
     * Updates the tooltip's position based on the user's mouse position.
     * @param {MouseEvent} event - The mouse event that triggered the tooltip update.
     */
    const updateTooltipPosition = (event) => {
        const { clientX, clientY } = event;
        let left, top;

        // Calculate position based on the specified position
        switch (position) {
            case 'top':
                left = clientX - (tooltip.offsetWidth / 2);
                top = clientY - tooltip.offsetHeight - 10; // Offset above the cursor
                break;
            case 'bottom':
                left = clientX - (tooltip.offsetWidth / 2);
                top = clientY + 15; // Offset below the cursor
                break;
            case 'left':
                left = clientX - tooltip.offsetWidth - 15; // Offset to the left of the cursor
                top = clientY;
                break;
            case 'right':
                left = clientX + 15; // Offset to the right of the cursor
                top = clientY;
                break;
            default:
                left = clientX;
                top = clientY;
        }

        tooltip.style.left = `${left}px`;
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

/**
 * Truncate text in a DOM element if it overflows, removing one character at a time.
 * @param {HTMLElement} element - The DOM element to check for overflow.
 * @param {string} text - The text to set in the element.
 * @returns {number} - The final length of truncated text.
 */
export const truncateTextIfOverflow = (element, text) => {
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
 * Get the position of a DOM element.
 * @param {string | HTMLElement} element - The ID of the DOM element or the DOM element itself.
 * @param {string} unit - The unit to return the position in ('px' or '%').
 * @param {string} position - The position to get ('left', 'top', 'right', 'bottom').
 * @param {number} spacing - The amount to adjust the position by.
 * @returns {Object} An object containing the adjusted x and y position of the element.
 */
export const getElementPosition = (element, unit = 'px', position = 'left', spacing = 0) => {
    // If the element is a string, treat it as an ID and find the element
    if (typeof element === 'string') {
        element = document.getElementById(element);
    }

    // Ensure the element is valid
    if (!(element instanceof HTMLElement)) {
        throw new Error('Invalid element provided. Please provide a valid DOM element or a valid ID.');
    }

    // Get the bounding rectangle of the element
    const rect = element.getBoundingClientRect();

    // Initialize x and y based on the specified position
    let x, y;

    switch (position) {
        case 'left':
            x = rect.left - spacing;
            break;
        case 'right':
            x = rect.right + spacing;
            break;
        case 'top':
            y = rect.top - spacing;
            break;
        case 'bottom':
            y = rect.bottom + spacing;
            break;
        default:
            throw new Error('Invalid position provided. Use "left", "top", "right", or "bottom".');
    }

    // If position is 'left' or 'right', set y to the center of the element
    if (position === 'left' || position === 'right') {
        y = rect.top + (rect.height / 2);
    }
    // If position is 'top' or 'bottom', set x to the center of the element
    else {
        x = rect.left + (rect.width / 2);
    }

    // Convert to the desired unit
    if (unit === '%') {
        x = (x / window.innerWidth) * 100;
        y = (y / window.innerHeight) * 100;
    }

    // Return the position as an object
    return {
        x,
        y
    };
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
export const isBookmarkInFolder = (bookmark, specificFolderId, bookmarkId) => {
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
        const parentBookmark = findBookmarkByKey(bookmark, currentId);

        // Update currentId to the parent bookmark's ID
        currentId = parentBookmark.parentId;

        // Break the loop if parentBookmark is empty or null
        if (isObjectEmpty(parentBookmark) || parentBookmark === null) {
            break;
        }
    }
    // Return false if the specified folder is not found
    return false;
};

/**
 * Translate the username element's text horizontally if it is wider than its parent element.
 * This is done to create a marquee effect.
 *
 * @param {string|HTMLElement} parent - The parent element
 * @param {string|HTMLElement} child - The child element
 * @returns {boolean} - True if the translation was successful, false otherwise
 */
export const translateUserName = (parent, child) => {
    try {
        let parentElement, childElement;

        if (typeof parent === 'string' || typeof child === 'string') {
            parentElement = document.getElementById(parent);
            childElement = document.getElementById(child);
        } else if (parent instanceof HTMLElement && child instanceof HTMLElement) {
            parentElement = parent;
            childElement = child;
        } else {
            throw new Error('Invalid arguments. Both parent and child must be either strings or HTMLElements.');
        }

        // Check if the child element's width is greater than the parent's width
        if (childElement.offsetWidth > parentElement.offsetWidth) {
            const childWidth = childElement.offsetWidth;
            let speed = 1;
            const waitTime = 500;

            // Calculate the total distance to translate
            const totalDistance = childWidth ;

            // Start translating
            let position = 0;
            let direction = 1;

            const translate = () => {
                // Update the position
                position += direction * speed;

                // Ensure position does not go below 0
                if (position < 0) {
                    position = 0; // Reset to 0 if it goes negative
                }

                // Apply the translation
                childElement.style.transform = `translateX(-${position}px)`;

                // Check if we need to change direction
                if (position >= totalDistance) {
                    direction = -1; // Change direction to right to left
                } else if (position <= 0) {
                    direction = 1; // Change direction to left to right
                    // Wait before starting the next translation
                    setTimeout(() => {
                        requestAnimationFrame(translate);
                        speed = randomIntFromInterval(1, 3);
                    }, waitTime);
                    return; // Exit the current frame to avoid immediate re-calling
                }

                // Continue the animation
                requestAnimationFrame(translate);
            };

            // Start the animation
            requestAnimationFrame(translate);
            return true;
        }
    } catch (error) {
        console.error('Error in translateUserName', error);
        return false;
    }
};

/**
 * Opens a URL in a new tab or the same tab based on the CTRL parameter.
 * @param {string} url - The URL to open.
 * @param {boolean} CTRL - If true, open the URL in a new tab; if false, open in the same tab.
 */
export const openUrl = (url, CTRL) => {
    // Check if the URL is valid
    if (typeof url === 'string' && url.trim() !== '') {
        if (CTRL) {
            // Open in a new tab
            browser.tabs.create({ url: url }, (tab) => {
                if (browser.runtime.lastError) {
                    console.error('Error creating tab:', browser.runtime.lastError);
                }
            });
        } else {
            // Open in the same tab
            browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    browser.tabs.update(tabs[0].id, { url: url }, (tab) => {
                        if (browser.runtime.lastError) {
                            console.error('Error updating tab:', browser.runtime.lastError);
                        }
                    });
                }
            });
        }
    } else {
        console.error('Invalid URL provided:', url);
    }
};

/**
 * Escapes a string to prevent XSS attacks by replacing special characters with their corresponding HTML entities.
 * @param {string} unsafe - The string to escape.
 * @returns {string} The escaped string.
 */
export const escapeHtml = (unsafe) => {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

/**
 * Unescapes HTML special characters in a string to restore the original characters.
 * @param {string} str - The input string to unescape.
 * @returns {string} The unescaped string with HTML entities replaced by their corresponding characters.
 */
export const unescapeHtml = (str) => {
    return str.replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
};

/**
 * Recursively retrieves all child IDs of a given object.
 * @param {Object} object - The object to traverse.
 * @returns {string[]} An array of IDs of all children of the given object.
 */
export const getAllChildIds = (object) => {
    // Initialize an array to hold the IDs
    let ids = [];

    // Recursive function to traverse the tree
    const traverse = (node) => {
        // Add the current node's ID to the list
        ids.push(node.id);

        // If the current node has children, traverse them
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                // Add the child's ID to the list
                ids.push(child.id);
                // Recursively traverse the child's children
                traverse(child);
            });
        }
    };

    // Add the current object's ID to the list
    ids.push(object.id);
    if (object.children && object.children.length > 0) {
        // Start traversing from the root of the data
        object.children.forEach(node => traverse(node));
    }

    return ids;
};

/**
 * Reads a file from the given location and returns its content.
 * @function readLocalFile
 * @param {string} location - The location of the file to read.
 * @param {string} [mineType='application/text'] - The MIME type of the file.
 * @returns {Promise<string>} The file content.
 * @throws {Error} If the file cannot be read.
 */
export const readLocalFile = (location, mineType = 'application/text') => {
    return new Promise((resolve, reject) => {
        const rawFile = new XMLHttpRequest();
        rawFile.overrideMimeType(mineType);
        rawFile.open("GET", location, true);
        rawFile.onreadystatechange = () => {
            if (rawFile.readyState === 4) {
                if (rawFile.status === 200) {
                    resolve(rawFile.responseText);
                } else {
                    reject(new Error(`Failed to load file: ${location}`));
                }
            }
        };
        rawFile.send(null);
    });
};


















// sjo 5q0 y6q age yop hfs fbc zao v1h t0i
// 33c lmp 4mg 83t 3yl uo1 kjc z7z 0a4 5pj
// dc4 03a 8b5 130 xs5 9rk 3jf 1a1 06p agy
// 0ds ea1 wuc 2mk zop uic oob eu7 fap n8m
// b49 y4a w9y 3p3 52s 2l2 xod r7u uuv s9d
// irg 5th qkb 50r pxs 9n8 omy eyw anu 1ah
// 31r 4gz mep 7rl il7 xui 9es h9w 32u 87l
// wju t8x p7k oge kvl wfw g25 7mb t4z v33
// l2d efj daw j7f hnc v8f lt9 sff zuv mam
// yxt x9t ra7 hpc pu8 ude maz lyl t96 og5