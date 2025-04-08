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
import { defaultUserBookmarks, defaultBookmarkStyle, defaultFolderStyle, userProfileExport, defaultMainUserSettings } from './main.js';
import { generateRandomIdForObj, getRandomColor, isObjectEmpty } from './utilityFunctions.js';

export const importValidation = async (importedObject) => {
    let result = {
        status: {
            isValid: true,
            success: 0,
            error: 0,
            criticalError: 0,
            messages: [],
        },
        validObject: {}
    }

    class Validator {
        constructor(schema) {
            this.schema = schema;
        }

        validate(data, defaultData, parentKey = '') {
            let result = {
                success: 0,
                error: 0,
                criticalError: 0,
                messages: [],
                validData: {}
            };

            const validateValue = (value, key, defaultValue, rules, parentKey) => {
                const validateValue = {
                    value: value,
                    suffix: '',
                    prefix: ''
                };
                let returnResult = {
                    success: 0,
                    error: 0,
                    criticalError: 0,
                    messages: [],
                    validData: {}
                };

                // Helper function to handle errors and restore values
                const handleError = (message) => {
                    returnResult.messages.push(message);
                    if (rules.hasOwnProperty('default')) {
                        validateValue.value = rules.default;
                    } else
                    if (rules.hasOwnProperty('restore') && rules.restore === true) {
                        validateValue.value = defaultValue;
                    }
                };

                // Check for valid types
                const validTypes = ['string', 'number', 'boolean'];
                const valueType = typeof value;

                if (valueType === 'string' && value.trim().length === 0 && rules.hasOwnProperty('allowedEmpty') && rules.allowedEmpty) {
                    returnResult.success++;
                    returnResult.validData = '';
                    return returnResult;
                } else if (valueType === 'string' && value.trim().length === 0 && !rules.allowedEmpty) {
                    returnResult.error++;
                    handleError(`The type of '${parentKey}' is not valid; it should not be empty.`);
                    returnResult.validData = validateValue.value;
                    return returnResult;
                }

                if (!validTypes.includes(valueType)) {
                    returnResult.criticalError++;
                    handleError(`The type of '${parentKey}' is not valid; it should be one of the following types: string, number, or boolean. This is a critical error.`);
                    returnResult.validData = validateValue.value;
                    return returnResult;
                }
                // Process rules if defined
                if (rules.rule !== undefined) {
                    rules.rule.rules.forEach(rule => {
                        const { name, args } = rule;

                        if (name === 'prefix') {
                            validateValue.prefix = args.prefix;
                            validateValue.value = validateValue.value.replace(validateValue.prefix, '');
                        } else if (name === 'suffix') {
                            validateValue.suffix = args.suffix;
                            validateValue.value = validateValue.value.replace(validateValue.suffix, '');
                        } else if (name === 'convert') {
                            validateValue.value = rule.operator === 'parseFloat' ? parseFloat(value) : parseInt(value);
                        } else if (name === 'min' || name === 'max' || name === 'numericString') {
                            const limitMessage = name === 'min' ? 'too small' : 'too big';
                            const convertValue = name === 'numericString' ?? args.type === 'float' ? parseFloat(value) : parseInt(value);
                            const limitCheck = name === 'min' ? convertValue < args.limit : convertValue > args.limit;

                            if (limitCheck) {
                                returnResult.error++;
                                const message = `The value of '${key}' is ${limitMessage}. ${limitMessage === 'too small' ? 'Min' : 'Max'} limit is ${args.limit}.`;
                                handleError(message);
                            } else {
                                returnResult.success++;
                            }
                        } else if (name === 'looseEquality' || name === 'strictEquality') {
                            const equalityCheck = name === 'looseEquality' ? validateValue.value != args.value : validateValue.value !== args.value;

                            if (equalityCheck) {
                                returnResult.error++;
                                handleError(`The value of '${parentKey}' is not ${name === 'looseEquality' ? 'loose' : 'strict'} equal to ${args.value}.`);
                            } else {
                                returnResult.success++;
                            }
                        } else if (name === 'maxLength' || name === 'minLength') {
                            const lengthCheck = name === 'maxLength' ? value.length > args.limit : value.length < args.limit;
                            const lengthMessage = name === 'maxLength' ? 'too long' : 'too short';

                            if (lengthCheck) {
                                returnResult.error++;
                                handleError(`The value of '${parentKey}' is ${lengthMessage} for ${args.limit} symbols.`);
                                if (args.slice === true) {
                                    validateValue.value = value.slice(0, args.limit);
                                }
                            } else {
                                returnResult.success++;
                            }
                        } else if (name === 'regex') {
                            if (!value.match(args.regex)) {
                                returnResult.error++;
                                handleError(`The value of '${parentKey}' doesn't match the regex.`);
                            } else {
                                returnResult.success++;
                            }
                        } else if (name === 'hexColor') {
                            const regexWithoutAlpha = /^#([0-9A-Fa-f]{6})$/;
                            const regexWithAlpha = /^#([0-9A-Fa-f]{8})$/;
                            if (validateValue.value.length !== 7 && validateValue.value.length !== 9) {
                                returnResult.error++;
                                handleError(`The value of '${key}' is not a valid hex color.`);
                                return;
                            }
                            if (validateValue.value.length === 7 && !regexWithoutAlpha.test(validateValue.value)) {
                                returnResult.error++;
                                handleError(`The value of '${key}' is not a valid hex color.`);
                            } else if (validateValue.value.length === 7 && regexWithoutAlpha.test(validateValue.value)) {
                                returnResult.success++;
                            }
                            if (validateValue.value.length === 9 && !regexWithAlpha.test(validateValue.value)) {
                                returnResult.error++;
                                handleError(`The value of '${key}' is not a valid hex color.`);
                            } else if (validateValue.value.length === 9 && regexWithoutAlpha.test(validateValue.value)) {
                                returnResult.success++;
                            }
                        }
                    });
                }

                if (rules.type === 'date') {
                    const checkDate = new Date(value);
                    if (isNaN(checkDate.getTime())) {
                        returnResult.error++;
                        handleError(`${parentKey} is not a valid date`);
                        if (rules.hasOwnProperty('default')) {
                            validateValue.value = rules.default;
                        }
                    }
                }

                if (validateValue.prefix.length > 0) {
                    validateValue.value = validateValue.prefix + validateValue.value;
                }
                if (validateValue.suffix.length > 0) {
                    validateValue.value = validateValue.value + validateValue.suffix;
                }
                if (rules.hasOwnProperty('includes') && !rules.includes.includes(value)) {
                    returnResult.error++;
                    if (rules.hasOwnProperty('removeNotValid') && rules.removeNotValid === true) {
                        returnResult.validData = null;
                    }
                    handleError(`The value of '${parentKey}' for '${value}' doesn't match the allowed values.`);
                    return returnResult;
                } else if (rules.hasOwnProperty('includes') && rules.includes.includes(value)) {
                    returnResult.success++;
                }
                if (rules.hasOwnProperty('base64') && rules.base64 === true) {
                    const base64Regex = /^data:(image\/(?:png|jpg|jpeg|gif|bmp|webp|svg\+xml));base64,[A-Za-z0-9+/=]+$/;
                    if (!base64Regex.test(value)) {
                        returnResult.error++;
                        handleError(`The value of '${parentKey}' for '${value}' doesn't match the base64 regex.`);
                    } else {
                        returnResult.success++;
                        validateValue.value = value;
                    }
                }
                returnResult.validData = validateValue.value;
                return returnResult;
            };

            /**
             * Count all keys in a nested object or array.
             * @param {Object|Array} obj - The object or array to count keys in.
             * @returns {number} - The total count of keys.
             */
            const countKeys = (obj) => {
                // Initialize the key count
                let count = 0;

                // Check if the input is an object or an array
                if (typeof obj === 'object' && obj !== null) {
                    // If it's an array, iterate through its elements
                    if (Array.isArray(obj)) {
                        for (const item of obj) {
                            count += countKeys(item); // Recursively count keys in each item
                        }
                    } else {
                        // If it's an object, iterate through its keys
                        for (const key in obj) {
                            if (obj.hasOwnProperty(key)) {
                                count++; // Count the key
                                count += countKeys(obj[key]); // Recursively count keys in the value
                            }
                        }
                    }
                }

                return count; // Return the total count of keys
            };

            for (const key in this.schema) {
                const rules = this.schema[key];
                let value = data[key];
                const defaultValue = defaultData[key]; // Get the default value
                const currentKey = parentKey ? `${parentKey}.${key}` : key; // Track the current key path

                if (rules.type === 'object') {
                    if (rules.required === false || rules.required === undefined || rules.removeNotValid === true) {
                        continue;
                    }
                    if (value === undefined || value === '') {
                        result.validData[key] = defaultData[key];
                        result.criticalError += countKeys(defaultData[key]) + 1;
                        result.messages.push(`Object '${key}' is required. Replace with default.`);
                        continue;
                    }
                    const nestedValidator = new Validator(rules.schema);
                    const nestedResult = nestedValidator.validate(value, defaultValue, currentKey);
                    result.success += nestedResult.success;
                    result.error += nestedResult.error;
                    result.criticalError += nestedResult.criticalError;
                    if (!nestedResult.isValid) {
                        result.messages.push(...nestedResult.messages.map(err => err));
                    } else {
                        result.success++;
                    }
                    result.validData[key] = nestedResult.validData;
                } else if (rules.type === 'array') {
                    if (rules.required === false || rules.required === undefined || !Array.isArray(value)) {
                        result.criticalError++;
                        result.messages.push(`Critical Error. Array ${key} is required`);
                        continue;
                    }
                    if (isArray(value) && value.length > 0 && (rules.schema.length === 1 && rules.schema[0].allItems !== undefined && rules.schema[0].allItems) && key === 'exportType') {
                        let validateArray = [];
                        if (rules.schema[0].removeNotValid !== undefined && rules.schema[0].removeNotValid) {
                            value = value.filter((item, index) => {
                                if (typeof item !== rules.schema[0].type) {
                                    result.error++;
                                    result.messages.push(`${currentKey}[${index}] ${item} is not allowed type, it should be ${rules.schema[0].type}`);
                                    return false;
                                }
                                return true;
                            });
                        }
                        value.forEach(item => {
                            if (rules.schema[0].type === 'string') {
                                const validateResult = validateValue(item, key, defaultValue[0], rules.schema[0], currentKey);
                                result.success += validateResult.success;
                                result.error += validateResult.error;
                                result.criticalError += validateResult.criticalError;
                                result.messages.push(...validateResult.messages.map(err => err));
                                if (validateResult.validData !== null) {
                                    result.success++;
                                    validateArray.push(validateResult.validData);
                                }
                            }
                        });
                        result.success++;
                        result.validData[key] = validateArray;
                    }
                    if (key === 'currentBookmarks' || key === 'currentUserBookmarks') {
                        const checkNestingValueArray = (array) => {
                            const processObject = (obj) => {
                                for (const bookmarkKey in obj) {
                                    if (bookmarkKey === 'type' && obj[bookmarkKey] === 'folder') {
                                        obj.url = '';
                                    }
                                    if (bookmarkKey === 'type' && obj[bookmarkKey] === 'bookmark') {
                                        const regex = /[ "><%{}|\\^`[\]#]/;
                                        if (regex.test(obj['url'])) {
                                            result.error++;
                                            result.messages.push(`${currentKey}.${bookmarkKey} contains invalid characters in url`);
                                        } else {
                                            result.success++;
                                        }
                                    }
                                    if (bookmarkKey === 'style' && obj['style'] !== undefined && typeof obj['style'] === 'object') {
                                        if (obj['style']['bookmark'] !== undefined && typeof obj['style']['bookmark'] === 'object') {
                                            const nestedValidator = new Validator(rules.schema[0]['style']['bookmark'].schema);
                                            const nestedResult = nestedValidator.validate(obj['style']['bookmark'], defaultValue[0]['style']['bookmark'], currentKey);
                                            result.success += nestedResult.success;
                                            result.error += nestedResult.error;
                                            result.criticalError += nestedResult.criticalError;
                                            if (!nestedResult.isValid) {
                                                result.messages.push(...nestedResult.messages.map(err => err));
                                            } else {
                                                result.success++;
                                            }
                                            obj[bookmarkKey]['bookmark'] = nestedResult.validData;
                                        } else if (obj['style']['bookmark'] !== undefined && typeof obj['style']['bookmark'] !== 'object') {
                                            obj[bookmarkKey]['bookmark'] = defaultBookmarkStyle;
                                        }
                                        if (obj['style']['folder'] !== undefined && typeof obj['style']['folder'] === 'object') {
                                            const nestedValidator = new Validator(rules.schema[0]['style']['folder'].schema);
                                            const nestedResult = nestedValidator.validate(obj['style']['folder'], defaultValue[0]['style']['folder'], currentKey);
                                            result.success += nestedResult.success;
                                            result.error += nestedResult.error;
                                            result.criticalError += nestedResult.criticalError;
                                            if (!nestedResult.isValid) {
                                                result.messages.push(...nestedResult.messages.map(err => err));
                                            } else {
                                                result.success++;
                                            }
                                            obj[bookmarkKey]['folder'] = nestedResult.validData;
                                        } else if (obj['style']['folder'] !== undefined && typeof obj['style']['folder'] !== 'object') {
                                            obj[bookmarkKey]['folder'] = defaultFolderStyle;
                                        }
                                    } else if (obj['style'] !== undefined && typeof obj['style'] !== 'object') {
                                        obj[bookmarkKey] = { folder: defaultFolderStyle, bookmark: defaultBookmarkStyle };
                                        result.error++;
                                        result.messages.push(`${currentKey}.${bookmarkKey} should be an object`);
                                    }
                                    if (bookmarkKey !== 'children' && bookmarkKey !== 'style' && bookmarkKey !== 'url') {
                                        const validateResult = validateValue(obj[bookmarkKey], bookmarkKey, defaultValue[0][bookmarkKey], rules.schema[0][bookmarkKey], `${currentKey}.${bookmarkKey}`);
                                        result.success += validateResult.success;
                                        result.error += validateResult.error;
                                        result.criticalError += validateResult.criticalError;
                                        result.messages.push(...validateResult.messages.map(err => err));
                                        if (validateResult.validData !== null) {
                                            result.success++;
                                            obj[bookmarkKey] = validateResult.validData;
                                        }
                                    }
                                }
                                if (Array.isArray(obj.children)) {
                                    obj.children = obj.children.map(processObject);
                                }
                                return obj;
                            }
                            return array.map(processObject);
                        }
                        let validateBookmarkArray = checkNestingValueArray(value);
                        result.success++;
                        result.validData[key] = validateBookmarkArray;
                    }
                    if (key === 'backgroundColorArray') {
                        if (Array.isArray(value) && rules.hasOwnProperty('allItems') && rules.allItems) {
                            let resultColorArray = [];
                            value.forEach((item, index) => {
                                const validateResult = validateValue(item, key, defaultValue[index], rules.schema[0], currentKey[index]);
                                result.success += validateResult.success;
                                result.error += validateResult.error;
                                result.criticalError += validateResult.criticalError;
                                if (!validateResult.isValid) {
                                    result.messages.push(...validateResult.messages.map(err => err));
                                } else {
                                    result.success++;
                                }
                                resultColorArray.push(validateResult.validData);
                            });
                            result.validData[key] = resultColorArray;
                        }
                    }
                    if (key === 'type') {
                        if (Array.isArray(value) && value.length > 0 && value.length <= 8) {
                            let resultTypeArray = [];
                            value.forEach(item => {
                                let animationType = {
                                    native: '',
                                    amount: 1,
                                };
                                if (item.hasOwnProperty('native')) {
                                    const validateResult = validateValue(item.native, key, [], rules.schema[0].native, currentKey);
                                    result.success += validateResult.success;
                                    result.error += validateResult.error;
                                    result.criticalError += validateResult.criticalError;
                                    if (!validateResult.isValid) {
                                        result.messages.push(...validateResult.messages.map(err => err));
                                    } else {
                                        result.success++;
                                    }
                                    animationType.native = validateResult.validData;
                                } else if (!item.hasOwnProperty('native')) {
                                    animationType.native = rules.schema[0].native.default;
                                }
                                if (item.hasOwnProperty('amount')) {
                                    const validateResult = validateValue(item.amount, key, [], rules.schema[0].amount, currentKey);
                                    result.success += validateResult.success;
                                    result.error += validateResult.error;
                                    result.criticalError += validateResult.criticalError;
                                    if (!validateResult.isValid) {
                                        result.messages.push(...validateResult.messages.map(err => err));
                                    } else {
                                        result.success++;
                                    }
                                    animationType.amount = validateResult.validData;
                                } else if (!item.hasOwnProperty('amount')) {
                                    animationType.amount = rules.schema[0].amount.default;
                                }
                                resultTypeArray.push(animationType);
                            });
                            result.validData[key] = resultTypeArray;
                        } else {
                            result.validData[key] = [];
                        }
                    }
                    if (key === 'offline') {
                        if (isArray(value)) {
                            result.validData[key] = [];
                            value.forEach((profile, index) => {
                                const nestedValidator = new Validator(rules.schema[0]);
                                const nestedResult = nestedValidator.validate(profile, defaultValue[0], currentKey[index]);
                                result.success += nestedResult.success;
                                result.error += nestedResult.error;
                                result.criticalError += nestedResult.criticalError;
                                if (!nestedResult.isValid) {
                                    result.messages.push(...nestedResult.messages.map(err => err));
                                } else {
                                    result.success++;
                                }
                                result.validData[key].push(nestedResult.validData);
                            });
                        }
                    }
                    if (key === 'allowUserActivity') {
                        if (isArray(value)) {
                            result.validData[key] = [];
                            value.forEach((activity, index) => {
                                const nestedValidator = new Validator(rules.schema[index]);
                                const nestedResult = nestedValidator.validate(activity, defaultValue[index], currentKey[index]);
                                result.success += nestedResult.success;
                                result.error += nestedResult.error;
                                result.criticalError += nestedResult.criticalError;
                                if (!nestedResult.isValid) {
                                    result.messages.push(...nestedResult.messages.map(err => err));
                                } else {
                                    result.success++;
                                }
                                result.validData[key].push(nestedResult.validData);
                            });
                        }
                    }
                } else if (rules.type === 'string') {
                    if (rules.required === false || rules.required === undefined) {
                        continue;
                    }
                    const validateResult = validateValue(value, key, defaultValue, rules, currentKey);
                    if (validateResult.validData === null) continue;
                    result.success += validateResult.success;
                    result.error += validateResult.error;
                    result.criticalError += validateResult.criticalError;
                    result.messages.push(...validateResult.messages.map(err => err));
                    result.validData[key] = validateResult.validData;
                } else if (rules.type === 'number') {
                    if (rules.required === false || rules.required === undefined) {
                        continue;
                    }
                    const validateResult = validateValue(value, key, defaultValue, rules, currentKey);
                    if (validateResult.validData === null) continue;
                    result.success += validateResult.success;
                    result.error += validateResult.error;
                    result.criticalError += validateResult.criticalError;
                    result.messages.push(...validateResult.messages.map(err => err));
                    result.validData[key] = validateResult.validData;
                } else if (rules.type === 'boolean') {
                    if (typeof value !== 'boolean') {
                        result.error++;
                        result.messages.push(`${currentKey} is not a valid boolean`);
                        if (rules.hasOwnProperty('default')) {
                            result.validData[key] = rules.default;
                        }
                        continue;
                    }
                    result.success++;
                    result.validData[key] = value;
                } else if (rules.type === 'date') {
                    if (rules.required === false || rules.required === undefined) {
                        continue;
                    }
                    const checkDate = new Date(value);
                    if (isNaN(checkDate.getTime())) {
                        result.error++;
                        result.messages.push(`${currentKey} is not a valid date`);
                        if (rules.hasOwnProperty('default')) {
                            result.validData[key] = rules.default;
                        }
                        continue;
                    }
                    result.success++;
                    result.validData[key] = value;
                } else if (rules.type === 'any') {
                    result.success++;
                    result.validData[key] = value;
                }
            }

            return {
                isValid: result.messages.length === 0,
                success: result.success,
                error: result.error,
                criticalError: result.criticalError,
                messages: result.messages,
                validData: result.validData, // Return the valid object
            };
        }
    }

    class createRules {
        constructor() {
            this.rules = []; // Array to store the rules
        }

        // Method to handle the min rule
        min(limit) {
            this.rules.push({
                args: { limit },
                method: "compare",
                name: "min",
                operator: ">="
            });
            return this; // Return the instance for chaining
        }

        // Method to handle the max rule
        max(limit) {
            this.rules.push({
                args: { limit },
                method: "compare",
                name: "max",
                operator: "<="
            });
            return this; // Return the instance for chaining
        }

        // Method to handle the equal rule
        looseEquality(value) {
            this.rules.push({
                args: { value },
                method: "compare",
                name: "looseEquality",
                operator: "=="
            });
            return this; // Return the instance for chaining
        }

        // Method to handle the strong equal rule
        strictEquality(value) {
            this.rules.push({
                args: { value },
                method: "compare",
                name: "strictEquality",
                operator: "==="
            });
            return this; // Return the instance for chaining
        }

        // Method to handle the max Length rule
        maxLength(limit) {
            this.rules.push({
                args: { limit, slice: true },
                method: "compare",
                name: "maxLength",
                operator: "==="
            });
            return this; // Return the instance for chaining
        }

        // Method to handle the min Length rule
        minLength(limit) {
            this.rules.push({
                args: { limit },
                method: "compare",
                name: "minLength",
                operator: "==="
            });
            return this; // Return the instance for chaining
        }

        // Method to handle the pattern regex rule
        patternRegex(regex) {
            this.rules.push({
                args: { regex },
                method: "test",
                name: "regex",
                operator: "match"
            });
            return this; // Return the instance for chaining
        }

        prefix(prefix) {
            this.rules.push({
                args: { prefix },
                method: "startsWith",
                name: "prefix",
                operator: "startsWith"
            });
            return this; // Return the instance for chaining
        }

        // Method to handle the suffix rule
        suffix(suffix) {
            this.rules.push({
                args: { suffix },
                method: "endsWith",
                name: "suffix",
                operator: "endsWith"
            });
            return this; // Return the instance for chaining
        }

        // Method to handle the convert rule
        convertInteger(type) {
            this.rules.push({
                args: { type },
                method: "convert",
                name: "convert",
                operator: "parseInt"
            });
            return this; // Return the instance for chaining
        }

        // Method to handle the convert rule
        convertFloat(type) {
            this.rules.push({
                args: { type },
                method: "convert",
                name: "convert",
                operator: "parseFloat"
            });
            return this; // Return the instance for chaining
        }

        // Method to handle the convert rule
        numericString(type) {
            this.rules.push({
                args: { type },
                method: "convert",
                name: "numericString",
                operator: "toNumber"
            });
            return this; // Return the instance for chaining
        }

        // Method to handle to check if string is a Hex color rule
        hexColor() {
            this.rules.push({
                args: {},
                method: "test",
                name: "hexColor",
                operator: "match"
            });
            return this; // Return the instance for chaining
        }
    }

    const schemaBookmarkStyle = {
        type: 'object',
        required: true,
        schema: {
            "border": {
                type: 'object',
                required: true,
                schema: {
                    "top": {
                        type: 'object',
                        required: true,
                        schema: {
                            "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#2af0f0' },
                            "style": { type: 'string', required: true, includes: ['dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'], default: 'double' },
                            "width": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(10), default: '10' },
                            "radius": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(40), default: '10' },
                        }
                    },
                    "right": {
                        type: 'object',
                        required: true,
                        schema: {
                            "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#0d4949' },
                            "style": { type: 'string', required: true, includes: ['dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'], default: 'double' },
                            "width": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(10), default: '10' },
                            "radius": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(40), default: '10' },
                        }
                    },
                    "bottom": {
                        type: 'object',
                        required: true,
                        schema: {
                            "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#0d4949' },
                            "style": { type: 'string', required: true, includes: ['dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'], default: 'double' },
                            "width": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(10), default: '10' },
                            "radius": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(40), default: '10' },
                        }
                    },
                    "left": {
                        type: 'object',
                        required: true,
                        schema: {
                            "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#2af0f0' },
                            "style": { type: 'string', required: true, includes: ['dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'], default: 'double' },
                            "width": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(10), default: '10' },
                            "radius": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(40), default: '10' },
                        }
                    }
                }
            },
            "color": {
                type: 'object',
                required: true,
                schema: {
                    "display": { type: 'string', required: true, includes: ['flex'], default: 'flex' },
                    "position": { type: 'string', required: true, includes: ['absolute'], default: 'absolute' },
                    "width": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(100), default: '100' },
                    "height": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(80), default: '80' },
                    "backgroundColor": { type: 'string', required: true, allowedEmpty: true, rule: new createRules().hexColor(), default: getRandomColor() },
                    "angle": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(360), default: '0' },
                    "left": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(100), default: '0' },
                    "top": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(100), default: '0' },
                }
            },
            "image": {
                type: 'object',
                required: true,
                schema: {
                    "display": { type: 'string', required: true, includes: ['flex'], default: 'flex' },
                    "position": { type: 'string', required: true, includes: ['absolute'], default: 'absolute' },
                    "width": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(100), default: '100' },
                    "height": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(80), default: '80' },
                    "backgroundBase64": { type: 'string', required: true, default: '', base64: true, allowedEmpty: true },
                    "angle": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(360), default: '0' },
                    "left": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(100), default: '0' },
                    "top": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(100), default: '0' },
                }
            },
            "text": {
                type: 'object',
                required: true,
                schema: {
                    "display": { type: 'string', required: true, includes: ['flex'], default: 'flex' },
                    "position": { type: 'string', required: true, includes: ['absolute'], default: 'absolute' },
                    "whiteSpace": { type: 'string', required: true, includes: ['pre-wrap'], default: 'pre-wrap' },
                    "wordWrap": { type: 'string', required: true, includes: ['break-word'], default: 'break-word' },
                    "overflow": { type: 'string', required: true, includes: ['hidden'], default: 'hidden' },
                    "width": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(100), default: '100' },
                    "height": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(80), default: '20' },
                    "backgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: getRandomColor() },
                    "angle": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(360), default: '0' },
                    "left": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(100), default: '0' },
                    "top": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(100), default: '80' },
                }
            },
            "font": {
                type: 'object',
                required: true,
                schema: {
                    "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: getRandomColor() },
                    "fontWeight": { type: 'string', required: true, includes: ['normal', 'lighter', 'bold', 'bolder', 'unset', 'inherit', '100', '200', '300', '400', '500', '600', '700', '800', '900'], default: '400' },
                    "fontSize": { type: 'string', required: true, rule: new createRules().numericString('integer').min(0).max(100), default: '14' },
                    "fontStyle": { type: 'string', required: true, includes: ['normal', 'italic', 'inherit'], default: '400' },
                    "fontFamily": { type: 'string', required: true, default: 'inherit' },
                    "textAlign": { type: 'string', required: true, includes: ['flex-start'], default: 'flex-start' },
                }
            }
        }
    }

    const schemaFolderStyle = {
        type: 'object',
        required: true,
        schema: {
            "grid": {
                type: 'object',
                required: true,
                schema: {
                    "gridAutoFlow": { type: 'string', required: true, includes: ['row', 'column'], default: 'row' },
                }
            },
            "bookmarksBox": {
                type: 'object',
                required: true,
                schema: {
                    "width": { type: 'string', required: true, rule: new createRules().suffix("px").min(100).max(200), default: '200px' },
                    "height": { type: 'string', required: true, rule: new createRules().suffix("px").min(100).max(200), default: '200px' }
                }
            },
            "background": {
                type: 'object',
                required: true,
                schema: {
                    "backgroundType": { type: 'string', required: true, includes: ['color', 'gradient', 'image'], default: 'color' },
                    "colorType": {
                        type: 'object',
                        required: true,
                        schema: {
                            "backgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#af5d00' }
                        }
                    },
                    "gradientType": {
                        type: 'object',
                        required: true,
                        schema: {
                            "backgroundColorArray": {
                                type: 'array',
                                required: true,
                                allItems: true,
                                schema: [
                                    { type: 'string', required: true, rule: new createRules().hexColor(), default: getRandomColor() },
                                ]
                            },
                            "angle": { type: 'number', required: true, default: 25, rule: new createRules().min(0).max(360) },
                        }
                    },
                    "imageType": {
                        type: 'object',
                        required: true,
                        schema: {
                            "backgroundBase64": { type: 'string', required: true, default: '', base64: true, allowedEmpty: true },
                            "backgroundRepeat": { type: 'string', required: true, includes: ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'], default: 'no-repeat' },
                            "backgroundSize": { type: 'string', required: true, includes: ['auto auto', 'auto 100%', '100% auto', '100% 100%', 'auto'], default: '100% 100%' },
                            "backgroundPosition": { type: 'string', required: true, includes: ['left top', 'center center', 'center'], default: 'center' },
                            "backgroundOrigin": { type: 'string', required: true, includes: ['border-box'], default: 'border-box' }
                        }
                    }
                }
            },
            "addressBar": {
                type: 'object',
                required: true,
                schema: {
                    "text": {
                        type: 'object',
                        required: true,
                        schema: {
                            "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#000000' },
                            "fontSize": { type: 'number', required: true, rule: new createRules().min(10).max(40), default: 18 },
                            "fontFamily": { type: 'string', required: true, includes: ['inherit'], default: 'inherit' },
                            "fontStyle": { type: 'string', required: true, includes: ['normal'], default: 'normal' },
                            "fontWeight": { type: 'string', required: true, includes: ['normal', 'lighter', 'bold', 'bolder', 'unset', 'inherit', '100', '200', '300', '400', '500', '600', '700', '800', '900'], default: '400' }
                        }
                    },
                    "icon": {
                        type: 'object',
                        required: true,
                        schema: {
                            "content": { type: 'string', required: true, rule: new createRules().maxLength(1), default: '/' },
                            "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#000000' },
                            "fontSize": { type: 'number', required: true, rule: new createRules().min(10).max(40), default: 21 },
                        }
                    },
                    "background": {
                        type: 'object',
                        required: true,
                        schema: {
                            "backgroundType": { type: 'string', required: true, includes: ['color'], default: 'color' },
                            "backgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#00000055' },
                            "backgroundBase64": { type: 'string', required: true, default: '', base64: true, allowedEmpty: true },
                            "backgroundRepeat": { type: 'string', required: true, includes: ['no-repeat'], default: 'no-repeat' },
                            "backgroundSize": { type: 'string', required: true, includes: ['100% 100%'], default: '100% 100%' },
                            "backgroundAttachment": { type: 'string', required: true, includes: ['fixed'], default: 'fixed' },
                            "backgroundPosition": { type: 'string', required: true, includes: ['center'], default: 'center' },
                            "backgroundOrigin": { type: 'string', required: true, includes: ['border-box'], default: 'border-box' }
                        }
                    }
                }
            }
        }
    }

    const schemaCurrentBookmarks = {
        type: 'array',
        required: true,
        schema: [
            {
                "dateAdded": { type: 'date', required: true, default: new Date().getTime(), rule: new createRules().min(new Date('2023-01-01').getTime()) },
                "dateGroupModified": { type: 'date', required: true, default: new Date().getTime(), rule: new createRules().min(new Date('2023-01-01').getTime()) },
                "lastEdited": { type: 'date', required: true, default: new Date().getTime(), rule: new createRules().min(new Date('2023-01-01').getTime()) },
                "id": { type: 'string', required: true, default: generateRandomIdForObj(), rule: new createRules().maxLength(13) },
                "count": { type: 'number', required: true, default: 0, rule: new createRules().min(0) },
                "index": { type: 'number', required: true, default: 0, rule: new createRules().min(0) },
                "parentId": { type: 'string', required: true, default: generateRandomIdForObj(), rule: new createRules().maxLength(13) },
                "title": { type: 'string', required: true, default: 'undefined', rule: new createRules().maxLength(1000) },
                "type": { type: 'string', required: true, default: 'undefined', rule: new createRules().maxLength(1000) },
                "url": { type: 'string', required: true, dependent: { "type": { "folder": { empty: true }, "bookmark": { url: true } } }, rule: new createRules().maxLength(50) },
                "style": {
                    folder: schemaFolderStyle,
                    bookmark: schemaBookmarkStyle,
                },
                "children": []
            }
        ]
    }

    const schemaMainUserSettings = {
        type: 'object',
        required: true,
        schema: {
            "main": {
                type: 'object',
                required: true,
                schema: {
                    "testingInternet": {
                        type: 'object',
                        required: true,
                        schema: {
                            "allowToCheckInternetStatus": { type: 'boolean', required: true, default: true },
                        }
                    },
                    "allowUserActivity": {
                        type: 'array',
                        required: true,
                        schema: [
                            {
                                "action": { type: 'string', required: true, includes: ['createProfile'], default: 'createProfile' },
                                "status": { type: 'boolean', required: true, default: true },
                                "title": { type: 'string', required: true, includes: ['Create profile'], default: 'Create profile' },
                            },
                            {
                                "action": { type: 'string', required: true, includes: ['deleteProfile'], default: 'deleteProfile' },
                                "status": { type: 'boolean', required: true, default: true },
                                "title": { type: 'string', required: true, includes: ['Delete profile'], default: 'Delete profile' },
                            },
                            {
                                "action": { type: 'string', required: true, includes: ['openExtension'], default: 'openExtension' },
                                "status": { type: 'boolean', required: true, default: true },
                                "title": { type: 'string', required: true, includes: ['Open extension'], default: 'Open extension' },
                            },
                            {
                                "action": { type: 'string', required: true, includes: ['closeExtension'], default: 'closeExtension' },
                                "status": { type: 'boolean', required: true, default: true },
                                "title": { type: 'string', required: true, includes: ['Close extension'], default: 'Close extension' },
                            },
                            {
                                "action": { type: 'string', required: true, includes: ['createBookmark'], default: 'createBookmark' },
                                "status": { type: 'boolean', required: true, default: true },
                                "title": { type: 'string', required: true, includes: ['Create bookmark'], default: 'Create bookmark' },
                            },
                            {
                                "action": { type: 'string', required: true, includes: ['createFolder'], default: 'createFolder' },
                                "status": { type: 'boolean', required: true, default: true },
                                "title": { type: 'string', required: true, includes: ['Create folder'], default: 'Create folder' },
                            },
                            {
                                "action": { type: 'string', required: true, includes: ['editBookmark'], default: 'editBookmark' },
                                "status": { type: 'boolean', required: true, default: true },
                                "title": { type: 'string', required: true, includes: ['Edit bookmark'], default: 'Edit bookmark' },
                            },
                            {
                                "action": { type: 'string', required: true, includes: ['editFolder'], default: 'editFolder' },
                                "status": { type: 'boolean', required: true, default: true },
                                "title": { type: 'string', required: true, includes: ['Edit folder'], default: 'Edit folder' },
                            },
                            {
                                "action": { type: 'string', required: true, includes: ['deleteBookmark'], default: 'deleteBookmark' },
                                "status": { type: 'boolean', required: true, default: true },
                                "title": { type: 'string', required: true, includes: ['Delete bookmark'], default: 'Delete bookmark' },
                            },
                            {
                                "action": { type: 'string', required: true, includes: ['deleteFolder'], default: 'deleteFolder' },
                                "status": { type: 'boolean', required: true, default: true },
                                "title": { type: 'string', required: true, includes: ['Delete folder'], default: 'Delete folder' },
                            }
                        ]
                    },
                    "synchronizationToBrowser": {
                        type: 'object',
                        required: true,
                        schema: {
                            "status": { type: 'boolean', required: true, default: false },
                            "synchronizeDirection": {
                                type: 'object',
                                required: true,
                                schema: {
                                    "browserToExtension": { type: 'boolean', required: true, default: false },
                                    "bothDirections": { type: 'boolean', required: true, default: true },
                                    "extensionToBrowser": { type: 'boolean', required: true, default: false }
                                }
                            },
                            "extensionFolderId": { type: 'string', required: true, allowedEmpty: true, default: '', rule: new createRules().maxLength(13) },
                            "browserFolderId": { type: 'string', required: true, allowedEmpty: true, default: '' },
                        }
                    },
                    "onlineRadio": {
                        type: 'object',
                        required: true,
                        schema: {
                            "allowed": { type: 'boolean', required: true, default: false },
                            "lastUserSelectedStationuuid": { type: 'string', required: true, allowedEmpty: true, default: '', rule: new createRules().maxLength(36) }
                        }
                    },
                    "undoManager": {
                        type: 'object',
                        required: true,
                        schema: {
                            status: { type: 'boolean', required: true, default: true },
                            maxLength: { type: 'number', required: true, allItems: true, rule: new createRules().min(0), default: 10 },
                        }
                    }
                }
            },
            "windows": {
                type: 'object',
                required: true,
                schema: {
                    "button": {
                        type: 'object',
                        required: true,
                        schema: {
                            "primary": {
                                type: 'object',
                                required: true,
                                schema: {
                                    "backgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#1a73e8' },
                                    "hoverBackgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#155ab6' },
                                    "disabledBackgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#a8c7f1' },
                                    "animation": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "status": { type: 'boolean', required: true, default: true },
                                            "type": {
                                                type: 'array',
                                                required: true,
                                                schema: [
                                                    {
                                                        "native": { type: 'string', required: true, allItems: true, rule: new createRules().maxLength(10), default: '😍'},
                                                        "amount": { type: 'number', required: true, allItems: true, rule: new createRules().min(1).max(9), default: 1 },
                                                    },
                                                ]
                                            }
                                        }
                                    },
                                    "font": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#000000' },
                                            "fontSize": { type: 'number', required: true, rule: new createRules().suffix("px").min(10).max(40), default: '14px' },
                                            "fontFamily": { type: 'string', required: true, rule: new createRules().maxLength(255), default: 'inherit' },
                                            "fontStyle": { type: 'string', required: true, includes: ['inherit', 'normal', 'italic'], default: 'inherit' },
                                            "fontWeight": { type: 'string', required: true, includes: ['normal', 'lighter', 'bold', 'bolder', 'unset', 'inherit', '100', '200', '300', '400', '500', '600', '700', '800', '900'], default: '400' },
                                            "textAlign": { type: 'string', required: true, includes: ['center'], default: 'center' }
                                        }
                                    }
                                }
                            },
                            "secondary": {
                                type: 'object',
                                required: true,
                                schema: {
                                    "backgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#9e9e9e' },
                                    "hoverBackgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#7a7a7a' },
                                    "disabledBackgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#d1d1d1' },
                                    "animation": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "status": { type: 'boolean', required: true, default: true },
                                            "type": {
                                                type: 'array',
                                                required: true,
                                                schema: [
                                                    {
                                                        "native": { type: 'string', required: true, allItems: true, rule: new createRules().maxLength(1), default: '😍' },
                                                        "amount": { type: 'number', required: true, allItems: true, rule: new createRules().min(1).max(9), default: 1 },
                                                    },
                                                ]
                                            }
                                        }
                                    },
                                    "font": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#000000' },
                                            "fontSize": { type: 'number', required: true, rule: new createRules().suffix("px").min(10).max(40), default: '14px' },
                                            "fontFamily": { type: 'string', required: true, rule: new createRules().maxLength(255), default: 'inherit' },
                                            "fontStyle": { type: 'string', required: true, includes: ['inherit', 'normal', 'italic'], default: 'inherit' },
                                            "fontWeight": { type: 'string', required: true, includes: ['normal', 'lighter', 'bold', 'bolder', 'unset', 'inherit', '100', '200', '300', '400', '500', '600', '700', '800', '900'], default: '400' },
                                            "textAlign": { type: 'string', required: true, includes: ['center'], default: 'center' }
                                        }
                                    }
                                }
                            },
                            "success": {
                                type: 'object',
                                required: true,
                                schema: {
                                    "backgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#38b43c' },
                                    "hoverBackgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#388e3c' },
                                    "disabledBackgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#a5d6a7' },
                                    "animation": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "status": { type: 'boolean', required: true, default: true },
                                            "type": {
                                                type: 'array',
                                                required: true,
                                                schema: [
                                                    {
                                                        "native": { type: 'string', required: true, allItems: true, rule: new createRules().maxLength(1), default: '😍' },
                                                        "amount": { type: 'number', required: true, allItems: true, rule: new createRules().min(1).max(9), default: 1 },
                                                    },
                                                ]
                                            }
                                        }
                                    },
                                    "font": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#000000' },
                                            "fontSize": { type: 'number', required: true, rule: new createRules().suffix("px").min(10).max(40), default: '14px' },
                                            "fontFamily": { type: 'string', required: true, rule: new createRules().maxLength(255), default: 'inherit' },
                                            "fontStyle": { type: 'string', required: true, includes: ['inherit', 'normal', 'italic'], default: 'inherit' },
                                            "fontWeight": { type: 'string', required: true, includes: ['normal', 'lighter', 'bold', 'bolder', 'unset', 'inherit', '100', '200', '300', '400', '500', '600', '700', '800', '900'], default: '400' },
                                            "textAlign": { type: 'string', required: true, includes: ['center'], default: 'center' }
                                        }
                                    }
                                }
                            },
                            "danger": {
                                type: 'object',
                                required: true,
                                schema: {
                                    "backgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#e53935' },
                                    "hoverBackgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#c62828' },
                                    "disabledBackgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#ef9a9a' },
                                    "animation": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "status": { type: 'boolean', required: true, default: true },
                                            "type": {
                                                type: 'array',
                                                required: true,
                                                schema: [
                                                    {
                                                        "native": { type: 'string', required: true, allItems: true, rule: new createRules().maxLength(1), default: '😍' },
                                                        "amount": { type: 'number', required: true, allItems: true, rule: new createRules().min(1).max(9), default: 1 },
                                                    },
                                                ]
                                            }
                                        }
                                    },
                                    "font": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#000000' },
                                            "fontSize": { type: 'number', required: true, rule: new createRules().suffix("px").min(10).max(40), default: '14px' },
                                            "fontFamily": { type: 'string', required: true, rule: new createRules().maxLength(255), default: 'inherit' },
                                            "fontStyle": { type: 'string', required: true, includes: ['inherit', 'normal', 'italic'], default: 'inherit' },
                                            "fontWeight": { type: 'string', required: true, includes: ['normal', 'lighter', 'bold', 'bolder', 'unset', 'inherit', '100', '200', '300', '400', '500', '600', '700', '800', '900'], default: '400' },
                                            "textAlign": { type: 'string', required: true, includes: ['center'], default: 'center' }
                                        }
                                    }
                                }
                            },
                            "warning": {
                                type: 'object',
                                required: true,
                                schema: {
                                    "backgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#fbc02d' },
                                    "hoverBackgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#f9a825' },
                                    "disabledBackgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#ffe082' },
                                    "animation": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "status": { type: 'boolean', required: true, default: true },
                                            "type": {
                                                type: 'array',
                                                required: true,
                                                schema: [
                                                    {
                                                        "native": { type: 'string', required: true, allItems: true, rule: new createRules().maxLength(1), default: '😍' },
                                                        "amount": { type: 'number', required: true, allItems: true, rule: new createRules().min(1).max(9), default: 1 },
                                                    },
                                                ]
                                            }
                                        }
                                    },
                                    "font": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#000000' },
                                            "fontSize": { type: 'number', required: true, rule: new createRules().suffix("px").min(10).max(40), default: '14px' },
                                            "fontFamily": { type: 'string', required: true, rule: new createRules().maxLength(255), default: 'inherit' },
                                            "fontStyle": { type: 'string', required: true, includes: ['inherit', 'normal', 'italic'], default: 'inherit' },
                                            "fontWeight": { type: 'string', required: true, includes: ['normal', 'lighter', 'bold', 'bolder', 'unset', 'inherit', '100', '200', '300', '400', '500', '600', '700', '800', '900'], default: '400' },
                                            "textAlign": { type: 'string', required: true, includes: ['center'], default: 'center' }
                                        }
                                    }
                                }
                            },
                            "info": {
                                type: 'object',
                                required: true,
                                schema: {
                                    "backgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#039be5' },
                                    "hoverBackgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#0288d1' },
                                    "disabledBackgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#81d4fa' },
                                    "animation": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "status": { type: 'boolean', required: true, default: true },
                                            "type": {
                                                type: 'array',
                                                required: true,
                                                schema: [
                                                    {
                                                        "native": { type: 'string', required: true, allItems: true, rule: new createRules().maxLength(1), default: '😍' },
                                                        "amount": { type: 'number', required: true, allItems: true, rule: new createRules().min(1).max(9), default: 1 },
                                                    },
                                                ]
                                            }
                                        }
                                    },
                                    "font": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#000000' },
                                            "fontSize": { type: 'number', required: true, rule: new createRules().suffix("px").min(10).max(40), default: '14px' },
                                            "fontFamily": { type: 'string', required: true, rule: new createRules().maxLength(255), default: 'inherit' },
                                            "fontStyle": { type: 'string', required: true, includes: ['inherit', 'normal', 'italic'], default: 'inherit' },
                                            "fontWeight": { type: 'string', required: true, includes: ['normal', 'lighter', 'bold', 'bolder', 'unset', 'inherit', '100', '200', '300', '400', '500', '600', '700', '800', '900'], default: '400' },
                                            "textAlign": { type: 'string', required: true, includes: ['center'], default: 'center' }
                                        }
                                    }
                                }
                            },
                            "light": {
                                type: 'object',
                                required: true,
                                schema: {
                                    "backgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#f5f5f5' },
                                    "hoverBackgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#e0e0e0' },
                                    "disabledBackgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#fafafa' },
                                    "animation": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "status": { type: 'boolean', required: true, default: true },
                                            "type": {
                                                type: 'array',
                                                required: true,
                                                schema: [
                                                    {
                                                        "native": { type: 'string', required: true, allItems: true, rule: new createRules().maxLength(1), default: '😍' },
                                                        "amount": { type: 'number', required: true, allItems: true, rule: new createRules().min(1).max(9), default: 1 },
                                                    },
                                                ]
                                            }
                                        }
                                    },
                                    "font": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#000000' },
                                            "fontSize": { type: 'number', required: true, rule: new createRules().suffix("px").min(10).max(40), default: '14px' },
                                            "fontFamily": { type: 'string', required: true, rule: new createRules().maxLength(255), default: 'inherit' },
                                            "fontStyle": { type: 'string', required: true, includes: ['inherit', 'normal', 'italic'], default: 'inherit' },
                                            "fontWeight": { type: 'string', required: true, includes: ['normal', 'lighter', 'bold', 'bolder', 'unset', 'inherit', '100', '200', '300', '400', '500', '600', '700', '800', '900'], default: '400' },
                                            "textAlign": { type: 'string', required: true, includes: ['center'], default: 'center' }
                                        }
                                    }
                                }
                            },
                            "dark": {
                                type: 'object',
                                required: true,
                                schema: {
                                    "backgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#424242' },
                                    "hoverBackgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#333333' },
                                    "disabledBackgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#bdbdbd' },
                                    "animation": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "status": { type: 'boolean', required: true, default: true },
                                            "type": {
                                                type: 'array',
                                                required: true,
                                                schema: [
                                                    {
                                                        "native": { type: 'string', required: true, allItems: true, rule: new createRules().maxLength(1), default: '😍' },
                                                        "amount": { type: 'number', required: true, allItems: true, rule: new createRules().min(1).max(9), default: 1 },
                                                    },
                                                ]
                                            }
                                        }
                                    },
                                    "font": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#000000' },
                                            "fontSize": { type: 'number', required: true, rule: new createRules().suffix("px").min(10).max(40), default: '14px' },
                                            "fontFamily": { type: 'string', required: true, rule: new createRules().maxLength(255), default: 'inherit' },
                                            "fontStyle": { type: 'string', required: true, includes: ['inherit', 'normal', 'italic'], default: 'inherit' },
                                            "fontWeight": { type: 'string', required: true, includes: ['normal', 'lighter', 'bold', 'bolder', 'unset', 'inherit', '100', '200', '300', '400', '500', '600', '700', '800', '900'], default: '400' },
                                            "textAlign": { type: 'string', required: true, includes: ['center'], default: 'center' }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "window": {
                        type: 'object',
                        required: true,
                        schema: {
                            "backgroundColor": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#00d4d4' },
                            "font": {
                                type: 'object',
                                required: true,
                                schema: {
                                    "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#000000' },
                                    "fontWeight": { type: 'string', required: true, includes: ['normal', 'lighter', 'bold', 'bolder', 'unset', 'inherit', '100', '200', '300', '400', '500', '600', '700', '800', '900'], default: '400' },
                                    "fontSize": { type: 'number', required: true, rule: new createRules().min(10).max(40), default: 14 },
                                    "fontStyle": { type: 'string', required: true, includes: ['inherit', 'normal', 'italic'], default: 'inherit' },
                                    "fontFamily": { type: 'string', required: true, rule: new createRules().maxLength(255), default: 'inherit' },
                                    "textAlign": { type: 'string', required: true, includes: ['center'], default: 'center' }
                                }
                            },
                            "border": {
                                type: 'object',
                                required: true,
                                schema: {
                                    "top": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#00d4d4' },
                                            "style": { type: 'string', required: true, includes: ['dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'], default: 'ridge' },
                                            "width": { type: 'number', required: true, rule: new createRules().min(0).max(10), default: 10 },
                                            "radius": { type: 'number', required: true, rule: new createRules().min(10).max(40), default: 10 }
                                        }
                                    },
                                    "right": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#00d4d4' },
                                            "style": { type: 'string', required: true, includes: ['dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'], default: 'ridge' },
                                            "width": { type: 'number', required: true, rule: new createRules().min(0).max(10), default: 10 },
                                            "radius": { type: 'number', required: true, rule: new createRules().min(10).max(40), default: 10 }
                                        }
                                    },
                                    "bottom": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#00d4d4' },
                                            "style": { type: 'string', required: true, includes: ['dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'], default: 'ridge' },
                                            "width": { type: 'number', required: true, rule: new createRules().min(0).max(10), default: 10 },
                                            "radius": { type: 'number', required: true, rule: new createRules().min(10).max(40), default: 10 }
                                        }
                                    },
                                    "left": {
                                        type: 'object',
                                        required: true,
                                        schema: {
                                            "color": { type: 'string', required: true, rule: new createRules().hexColor(), default: '#00d4d4' },
                                            "style": { type: 'string', required: true, includes: ['dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'], default: 'ridge' },
                                            "width": { type: 'number', required: true, rule: new createRules().min(0).max(10), default: 10 },
                                            "radius": { type: 'number', required: true, rule: new createRules().min(10).max(40), default: 10 }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    const schemaUserActivityLog = {}

    const schemaCurrentAllProfile = {
        type: 'object',
        required: true,
        schema: {
            active: { type: 'boolean', required: true, default: true },
            name: { type: 'string', required: true, default: 'undefined', rule: new createRules().maxLength(50) },
            userId: { type: 'string', required: true, default: 'undefined', rule: new createRules().maxLength(20) },
            image: { type: 'string', required: true, default: 'undefined', base64: true },
            timestampUpdate: { type: 'date', required: true, default: new Date().getTime(), rule: new createRules().min(new Date('2023-01-01').getTime()) },
            timestampCreation: { type: 'date', required: true, default: new Date().getTime(), rule: new createRules().min(new Date('2023-01-01').getTime()) },
            currentUserBookmarks: schemaCurrentBookmarks,
            defaultUserFolderStyle: schemaFolderStyle,
            defaultUserBookmarkStyle: schemaBookmarkStyle,
            mainUserSettings: schemaMainUserSettings,
            userActivityLog: schemaUserActivityLog
        }
    }

    const schemaAllProfiles = {
        type: 'object',
        required: true,
        schema: {
            status: { type: 'string', required: true, includes: ['offline'], default: 'offline' },
            offline: {
                type: 'array',
                required: true,
                schema: [
                    {
                        active: { type: 'boolean', required: true, default: true },
                        name: { type: 'string', required: true, default: 'undefined', rule: new createRules().maxLength(50) },
                        userId: { type: 'string', required: true, default: 'undefined', rule: new createRules().maxLength(20) },
                        image: { type: 'string', required: true, default: 'undefined', base64: true },
                        timestampUpdate: { type: 'date', required: true, default: new Date().getTime(), rule: new createRules().min(new Date('2023-01-01').getTime()) },
                        timestampCreation: { type: 'date', required: true, default: new Date().getTime(), rule: new createRules().min(new Date('2023-01-01').getTime()) },
                        currentUserBookmarks: schemaCurrentBookmarks,
                        defaultUserFolderStyle: schemaFolderStyle,
                        defaultUserBookmarkStyle: schemaBookmarkStyle,
                        mainUserSettings: schemaMainUserSettings,
                        userActivityLog: schemaUserActivityLog
                    }
                ]
            }
        }
    }

    const schemaDetail = {
        type: 'object',
        required: true,
        schema: {
            exportType: {
                type: 'array',
                required: true,
                schema: [
                    { type: 'string', required: true, allItems: true, removeNotValid: true, includes: ['currentAllProfile', 'allProfiles', 'currentBookmarks', 'defaultFolderStyle', 'defaultBookmarksStyle', 'userSettings', 'userActivityLog'] },
                ]
            },
            timestampCreation: {
                type: 'date',
                required: true,
                default: 'undefined',
            },
            browser: {
                type: 'object',
                required: true,
                schema: {
                    name: {
                        type: 'string',
                        required: true,
                        default: 'undefined',
                        includes: ['Firefox', 'Chrome' ],
                        rule: new createRules().maxLength(50)
                    },
                    version: {
                        type: 'string',
                        required: true,
                        default: 'undefined',
                        rule: new createRules().maxLength(50).numericString('float').min(130.0)
                    },
                    userAgent: {
                        type: 'string',
                        required: true,
                        default: 'undefined',
                        rule: new createRules().maxLength(150)
                    }
                }
            },
            os: {
                type: 'object',
                required: true,
                schema: {
                    name: {
                        type: 'string',
                        required: true,
                        default: 'undefined',
                        rule: new createRules().maxLength(50)
                    },
                    platform: {
                        type: 'string',
                        required: true,
                        default: 'undefined',
                        rule: new createRules().maxLength(50)
                    }
                }
            },
            extension: {
                type: 'object',
                required: true,
                schema: {
                    version: {
                        type: 'string',
                        required: true,
                        default: 'undefined',
                        rule: new createRules().maxLength(50)
                    }
                }
            }
        }
    }

    const schemaMainImport = {
        details: schemaDetail,
        export: {
            type: 'object',
            required: true,
            schema: {
                profileDetail: {
                    type: 'object',
                    required: true,
                    schema: {
                        name: { type: 'string', required: true, default: 'undefined', rule: new createRules().maxLength(50) },
                        userId: { type: 'string', required: true, default: 'undefined', rule: new createRules().maxLength(20) },
                        timestampCreation: { type: 'date', required: true, default: 'undefined' },
                        image: { type: 'string', required: true, default: 'undefined', base64: true },
                    }
                },
            }
        }
    }

    const createdDefaultObjectBasedImportType = () => {
        const importKeyNames = ['allProfiles', 'currentAllProfile', 'currentBookmarks', 'defaultFolderStyle', 'defaultBookmarksStyle', 'userSettings', 'userActivityLog'];
        const allProfiles = {
            status: "offline",
            offline: [
                {
                    active: true,
                    name: "",
                    userId: "",
                    image: "",
                    timestampUpdate: 1732218570322,
                    timestampCreation: 1730736444094,
                    currentUserBookmarks: defaultUserBookmarks,
                    defaultUserFolderStyle: defaultFolderStyle,
                    defaultUserBookmarkStyle: defaultBookmarkStyle,
                    mainUserSettings: defaultMainUserSettings,
                    userActivityLog: []
                }
            ]
        }
        const currentProfile = {
            active: true,
            name: "",
            userId: "",
            image: "",
            timestampUpdate: 1732218570322,
            timestampCreation: 1730736444094,
            currentUserBookmarks: defaultUserBookmarks,
            defaultUserFolderStyle: defaultFolderStyle,
            defaultUserBookmarkStyle: defaultBookmarkStyle,
            mainUserSettings: defaultMainUserSettings,
            userActivityLog: []
        }
        const defaultObject = {
            details: {
                exportType: [],
                timestampCreation: "unknown",
                browser: {
                    name: 'unknown',
                    version: "unknown",
                    userAgent: "unknown"
                },
                os: {
                    name: "unknown",
                    platform: "unknown"
                },
                extension: {
                    version: "unknown"
                }
            },
            export: {
                profileDetail: {
                    name: "unknown",
                    userId: "",
                    timestampCreation: "unknown",
                    image: ""
                },
                allProfiles: allProfiles,
                currentAllProfile: currentProfile,
                currentBookmarks: defaultUserBookmarks,
                defaultFolderStyle: defaultFolderStyle,
                defaultBookmarksStyle: defaultBookmarkStyle,
                userSettings: defaultMainUserSettings,
                userActivityLog: []
            }
        }
        if (isObjectEmpty(importedObject)) return null;
        if (!importKeyNames.some(value => importedObject.details.exportType.includes(value))) {
            result.status.error++;
            result.status.messages.push('Error to find keys in exportType');
            if (!importKeyNames.some(key => importedObject.export.hasOwnProperty(key))) return null;
        };

        if (importedObject.details.exportType.includes('allProfiles') || importedObject.export.hasOwnProperty('allProfiles')) {
            schemaMainImport.export.schema.allProfiles = schemaAllProfiles;
        }
        if (importedObject.details.exportType.includes('currentAllProfile') || importedObject.export.hasOwnProperty('currentAllProfile')) {
            schemaMainImport.export.schema.currentAllProfile = schemaCurrentAllProfile;
        }
        if (importedObject.details.exportType.includes('currentBookmarks') || importedObject.export.hasOwnProperty('currentBookmarks')) {
            schemaMainImport.export.schema.currentBookmarks = schemaCurrentBookmarks;
        }
        if (importedObject.details.exportType.includes('defaultFolderStyle') || importedObject.export.hasOwnProperty('defaultFolderStyle')) {
            schemaMainImport.export.schema.defaultFolderStyle = schemaFolderStyle;
        }
        if (importedObject.details.exportType.includes('defaultBookmarksStyle') || importedObject.export.hasOwnProperty('defaultBookmarksStyle')) {
            schemaMainImport.export.schema.defaultBookmarksStyle = schemaBookmarkStyle;
        }
        if (importedObject.details.exportType.includes('userSettings') || importedObject.export.hasOwnProperty('userSettings')) {
            schemaMainImport.export.schema.userSettings = schemaMainUserSettings;
        }
        const validator = new Validator(schemaMainImport);
        const resultSettingsValidation = validator.validate(importedObject, defaultObject);
        result.status.isValid = resultSettingsValidation.isValid;
        result.status.success += resultSettingsValidation.success;
        result.status.error += resultSettingsValidation.error;
        result.status.criticalError += resultSettingsValidation.criticalError;
        resultSettingsValidation.messages.forEach(message => result.status.messages.push(message));
        result.validObject = resultSettingsValidation.validData;
    }
    createdDefaultObjectBasedImportType();
    return result;

};



















// 64h 2ni qph 1xh v8p fqd k0c jgt yf3 pfq
// lvl v8f 8pi cz0 t4k 3zh jnu odi byb hpz
// nyt lfl 0o4 8sf 3el z7n 2tf rh9 mmn whh
// e0j 62a z2c zeo fjd eur won vu8 3zt 0do
// cwf g62 owm bp6 kgp 0sr b8i b0o 87e p46
// u2v typ q0r 621 3vt 4nl gwz umn pf1 txc
// 7j1 ifk uky rjz 23v olo hrd jkw 2wd 2vm
// z6q i1l cyl 4tc mvk lcd qki 23f dzq 34y
// yk4 8yg kms itq gpj yeg ju1 jsw gnz mp1
// nb5 gdn hms 4b1 h6f wbr txc cjs xg1 irv
// 6pg pli jl0 b1g uei --- --- --- --- ---