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
import { createContextMenu, userProfileExport, showProfileMenu, userSearchWindow, userActiveProfile } from './main.js';
import { createAndEditBookmarksWindow } from './bookmarkManager.js';
import { openCloseSettingWindow } from './settingsManager.js';
import { getRandomColor, randomIntFromInterval, indexedDBManipulation, countTo } from './utilityFunctions.js';
import { step2ImageBase64, step3ImageBase64 } from './interactiveGuideImages.js';

export const interactiveGuide = async (status) => {
    try {
        let targetElementID = ``;
        let elementID = ``;
        const backgroundColor = 'hsl(198, 12%, 80%)';
        const color = 'hsl(193, 9%, 4%)';
        const highlightBackgroundColor = '#1f1f1f50';
        let currentGuideStep = 0;
        let timeoutId = null;
        let languageAllObject = {};
        let allowNextStep = true;

        if (status === 'close') {
            // Clear existing highlights
            document.querySelectorAll('.highlight').forEach(el => el.remove());
            // Clear existing triangles
            document.querySelectorAll('.triangle').forEach(el => el.remove());
            // Remove interactive guide element
            const interactiveGuideEl = document.getElementById('interactiveGuide');
            if (interactiveGuideEl) {
                interactiveGuideEl.remove();
            }
            // Reset current guide step
            currentGuideStep = 0;
            return;
        }

        const loadLanguage = async () => {
            languageAllObject = await indexedDBManipulation('get', 'language');
        }
        await loadLanguage();

        const createElementInBody = () => {
            const element = document.createElement('div');
            element.id = `interactiveGuide`;
            element.style.position = 'fixed';
            element.style.top = '0';
            element.style.left = '0';
            element.style.width = '100vw';
            element.style.height = '100vh';
            element.style.zIndex = '2147483647';
            element.tabIndex = 0;
            document.body.appendChild(element);
            element.focus();
        }
        createElementInBody();

        const updateMiddlePosition = () => {
            const targetElement = document.getElementById(targetElementID);
            const element = document.getElementById(elementID);
            const margin = 10;
            let position; // This should be set based on your logic (e.g., 'left', 'right', 'top', 'bottom')

            if (targetElement && element) {
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;

                const targetRect = targetElement.getBoundingClientRect(); // Get the element's position and size
                const elementRect = element.getBoundingClientRect();

                // Get the position and size
                const targetPosition = {
                    top: targetRect.top,
                    left: targetRect.left,
                    width: targetRect.width,
                    height: targetRect.height
                };

                const elementPosition = {
                    top: elementRect.top,
                    left: elementRect.left,
                    width: elementRect.width,
                    height: elementRect.height
                };

                let middleX = 0;
                let middleY = 0;

                const calculatePosition = () => {
                    // Check if there is enough space to the left
                    if ((targetPosition.left - elementPosition.width - margin) > 0) {
                        middleX = targetPosition.left - elementPosition.width - margin;
                        middleY = targetPosition.top + (targetPosition.height / 2) - (elementPosition.height / 2);
                        position = 'left';
                    }
                    // Check if there is enough space above
                    else if ((targetPosition.top - elementPosition.height - margin) > 0) {
                        middleX = targetPosition.left + (targetPosition.width / 2) - (elementPosition.width / 2);
                        middleY = targetPosition.top - elementPosition.height - margin;
                        position = 'top';
                    }
                    // Check if there is enough space to the right
                    else if ((targetPosition.left + targetPosition.width + elementPosition.width + margin) < windowWidth) {
                        middleX = targetPosition.left + targetPosition.width + margin;
                        middleY = targetPosition.top + (targetPosition.height / 2) - (elementPosition.height / 2);
                        position = 'right';
                    }
                    // Check if there is enough space below
                    else if ((targetPosition.top + targetPosition.height + elementPosition.height + margin) < windowHeight) {
                        middleX = targetPosition.left + (targetPosition.width / 2) - (elementPosition.width / 2);
                        middleY = targetPosition.top + targetPosition.height + margin;
                        position = 'bottom';
                    }
                    // If no space, position it inside the target element
                    else {
                        middleX = targetPosition.left + (targetPosition.width / 2) - (elementPosition.width / 2);
                        middleY = targetPosition.top + (targetPosition.height / 2) - (elementPosition.height / 2);
                        position = 'inside';
                    }

                    // Adjust middleY if the calculated position is too small
                    if (middleY < 0) {
                        middleY = 0 + margin; // Prevent going out of the top of the window
                    } else if (middleY + elementPosition.height > windowHeight) {
                        middleY = windowHeight - elementPosition.height; // Prevent going out of the bottom of the window
                    }

                    // Adjust middleX if the calculated position is too small
                    if (middleX < 0) {
                        middleX = 0 + margin; // Prevent going out of the left of the window
                    } else if (middleX + elementPosition.width > windowWidth) {
                        middleX = windowWidth - elementPosition.width; // Prevent going out of the right of the window
                    }
                };
                calculatePosition();

                element.style.position = 'absolute';
                element.style.left = `${middleX}px`;
                element.style.top = `${middleY}px`;

                const createTriangle = (element, position) => {
                    const triangle = document.createElement('div');
                    triangle.classList.add('triangle');

                    const targetRect = document.getElementById(targetElementID).getBoundingClientRect();
                    const elementRect = element.getBoundingClientRect();

                    // Determine the triangle's direction and size
                    const sharedHeight = (Math.min(targetRect.height, elementRect.height) - (elementRect.top - targetRect.top));
                    const triangleHeight = 10; // Height of the triangle
                    const triangleWidth = 10; // Width of the triangle

                    // Positioning the triangle based on the element's position
                    if (position === 'left') {
                        triangle.style.borderWidth = `${triangleHeight}px 0 ${triangleHeight}px ${triangleWidth}px`;
                        triangle.style.borderColor = `transparent transparent transparent ${backgroundColor}`;
                        triangle.style.left = `${elementRect.left + elementRect.width}px`;
                        triangle.style.top = `${elementRect.top + (elementRect.height / 2) - (triangleHeight / 2) + (targetRect.top === 0 ? - (sharedHeight / 2) : + 0)}px`;
                        triangle.style.position = 'absolute';
                        triangle.style.width = '10px';
                        triangle.style.height = '10px';
                        triangle.style.borderStyle = 'solid';
                        triangle.style.zIndex = '2147483646';
                    } else if (position === 'right') {
                        triangle.style.borderWidth = `${triangleHeight}px ${triangleWidth}px ${triangleHeight}px 0`;
                        triangle.style.borderColor = `transparent ${backgroundColor} transparent transparent`;
                        triangle.style.left = `${elementRect.left - triangleWidth}px`;
                        triangle.style.top = `${elementRect.top + (sharedHeight / 2) - (triangleHeight / 2) + (targetRect.top === 0 ? - (sharedHeight / 2) : + 0)}px`;
                        triangle.style.position = 'absolute';
                        triangle.style.width = '10px';
                        triangle.style.height = '10px';
                        triangle.style.borderStyle = 'solid';
                        triangle.style.zIndex = '2147483646';
                    } else if (position === 'top') {
                        triangle.style.borderWidth = `${triangleWidth}px ${triangleHeight}px 0 ${triangleHeight}px`;
                        triangle.style.borderColor = `${backgroundColor} transparent transparent transparent`;
                        triangle.style.left = `${elementRect.left + (elementRect.width / 2) - (triangleHeight / 2)}px`;
                        triangle.style.top = `${elementRect.top + elementRect.height}px`;
                        triangle.style.position = 'absolute';
                        triangle.style.width = '10px';
                        triangle.style.height = '10px';
                        triangle.style.borderStyle = 'solid';
                        triangle.style.zIndex = '2147483646';
                    } else if (position === 'bottom') {
                        triangle.style.borderWidth = `0 ${triangleHeight}px ${triangleWidth}px ${triangleHeight}px`;
                        triangle.style.borderColor = `transparent transparent ${backgroundColor} transparent`;
                        triangle.style.left = `${elementRect.left + (elementRect.width / 2) - (triangleHeight / 2)}px`;
                        triangle.style.top = `${elementRect.top - triangleWidth}px`;
                        triangle.style.position = 'absolute';
                        triangle.style.width = '10px';
                        triangle.style.height = '10px';
                        triangle.style.borderStyle = 'solid';
                        triangle.style.zIndex = '2147483646';
                    } else if (position === 'inside') {
                        triangle.style.display = 'none';
                    }

                    document.body.appendChild(triangle);
                };

                createTriangle(element, position);

                // Calculate dimensions for the new highlight elements
                const highlightTopHeight = targetRect.top; // Height from the top of the window to the top of the element
                const highlightBottomHeight = windowHeight - (targetRect.top + targetRect.height); // Height from the bottom of the element to the bottom of the window
                const highlightWidth = targetRect.width < windowWidth ? windowWidth : targetRect.width; // Width of the original element
                const highlightHeight = targetRect.height < windowHeight ? windowHeight : targetRect.height; // Height of the original element

                // Function to create a highlight element
                const createHighlight = (top, left, width, height) => {
                    const highlight = document.createElement('div');
                    highlight.classList.add('highlight'); // Add class name
                    highlight.style.position = 'absolute';
                    highlight.style.top = `${top}px`;
                    highlight.style.left = `${left}px`;
                    highlight.style.width = `${width}px`;
                    highlight.style.height = `${height}px`;
                    highlight.style.backgroundColor = highlightBackgroundColor;
                    highlight.style.backdropFilter = 'blur(10px)';
                    highlight.style.transform = 'translate3d(0, 0, 0)';
                    highlight.style.zIndex = '9999'; // Ensure it's on top
                    document.body.appendChild(highlight);
                }

                // Create top highlight element
                createHighlight(0, targetRect.left, highlightWidth, highlightTopHeight);

                // Create bottom highlight element
                createHighlight(targetRect.top + targetRect.height, targetRect.left, highlightWidth, highlightBottomHeight);

                // Create left highlight element
                createHighlight(targetRect.top != 0 ? 0 : targetRect.top, 0, targetRect.left, highlightHeight);

                // Create right highlight element
                createHighlight(targetRect.top, targetRect.left + targetRect.width, windowWidth - (targetRect.left + targetRect.width), targetRect.height);

            }
        }

        const createDialog = (title, text) => {
            const interactiveGuideEl = document.getElementById('interactiveGuide');
            if (!interactiveGuideEl) throw new Error('No interactive guide element found');

            interactiveGuideEl.innerHTML = `
                <div id="guideStep" style="background-color: ${backgroundColor}">
                    <div id="guideStepTitle" style="color: ${color}">${title}</div>
                    <div id="guideStepText" style="color: ${color}">${text}</div>
                    <div id="guideStepImage">
                        <img id="guideStepImg" src="">
                    </div>
                    <div id="guideStepButton">
                        <button id="guideStepButtonClose">Close</button>
                        <button id="guideStepButtonNext">Next</button>
                    </div>
                </div>
            `;
            const guideStepButtonCloseButton = document.getElementById('guideStepButtonClose');
            const guideStepButtonNextButton = document.getElementById('guideStepButtonNext');

            guideStepButtonCloseButton.style.backgroundColor = userActiveProfile.mainUserSettings.windows.button.danger.backgroundColor;
            guideStepButtonNextButton.style.backgroundColor = userActiveProfile.mainUserSettings.windows.button.success.backgroundColor;

            const closeDialog = () => {
                interactiveGuide('close');
            }

            const mouseEnterCloseButton = (el) => {
                el.target.style.backgroundColor = userActiveProfile.mainUserSettings.windows.button.danger.hoverBackgroundColor;
            }

            const mouseLeaveCloseButton = (el) => {
                el.target.style.backgroundColor = userActiveProfile.mainUserSettings.windows.button.danger.backgroundColor;
            }

            const mouseEnterNextButton = (el) => {
                el.target.style.backgroundColor = userActiveProfile.mainUserSettings.windows.button.success.hoverBackgroundColor;
            }

            const mouseLeaveNextButton = (el) => {
                el.target.style.backgroundColor = userActiveProfile.mainUserSettings.windows.button.success.backgroundColor;
            }

            const nextDialog = () => {
                if (!allowNextStep) return;
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    // Clear existing highlights
                    document.querySelectorAll('.highlight').forEach(el => el.remove());
                    // Clear existing triangles
                    document.querySelectorAll('.triangle').forEach(el => el.remove());
                    currentGuideStep++;
                    guideSteps();
                }, 500);
            }

            guideStepButtonCloseButton.addEventListener('click', closeDialog);
            guideStepButtonCloseButton.addEventListener('mouseenter', mouseEnterCloseButton);
            guideStepButtonCloseButton.addEventListener('mouseleave', mouseLeaveCloseButton);
            guideStepButtonNextButton.addEventListener('click', nextDialog);
            guideStepButtonNextButton.addEventListener('mouseenter', mouseEnterNextButton);
            guideStepButtonNextButton.addEventListener('mouseleave', mouseLeaveNextButton);
        }

        const waitForElement = (selector) => {
            return new Promise(resolve => {
                const intervalId = setInterval(() => {
                    const element = document.querySelector(selector);
                    if (element) {
                        clearInterval(intervalId);
                        resolve(element);
                    }
                }, 100);
            });
        }

        const waitForAnimation = (elementId, targetWidth, targetHeight, timeout = 1200) => {
            return new Promise(resolve => {
                const element = document.getElementById(elementId);
                const startTime = Date.now();
                const checkSize = () => {
                    const rect = element.getBoundingClientRect();
                    if (rect.width >= targetWidth && rect.height >= targetHeight) {
                        resolve();
                    } else if (Date.now() - startTime > timeout) {
                        resolve();
                    } else {
                        requestAnimationFrame(checkSize);
                    }
                }
                checkSize();
            });
        }

        const pseudoAnimation = (id, srcArray) => {
            // const srcArray = ['#ff0000', '#15ff00', '#0400ff', '#ff008c'];
            let currentIndex = 0; // Start with the first color
            const guideStepImg = document.getElementById(id);
            guideStepImg.style.display = 'flex';

            // Function to start the animation
            const startAnimation = () => {
                // Calculate the next index in a cyclic manner
                const nextIndex = (currentIndex + 1) % srcArray.length;

                // Get the starting and ending colors
                const startColor = srcArray[currentIndex];
                const endColor = srcArray[nextIndex];

                // Animate the background color using GSAP
                gsap.fromTo(guideStepImg, {
                    src: startColor,
                }, {
                    src: endColor,
                    duration: .9,
                    onStart: () => {},
                    onComplete: () => {
                        currentIndex = nextIndex;
                        startAnimation();
                    }
                });
            };
            // Start the animation
            startAnimation();
        }

        const guideSteps = async () => {
            switch (currentGuideStep) {
                case 0:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `mainBody`;
                    updateMiddlePosition();
                    const imagePreload1 = new Image();
                    imagePreload1.src = step2ImageBase64[0];
                    break;
                case 1:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `mainBody`;
                    updateMiddlePosition();
                    pseudoAnimation('guideStepImg', step2ImageBase64);
                    const imagePreload2 = new Image();
                    imagePreload2.src = step3ImageBase64[0];
                    break;
                case 2:
                    let start = true;
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `mainBody`;
                    pseudoAnimation('guideStepImg', step3ImageBase64);
                    const guideStepImg = document.getElementById('guideStepImg');
                    guideStepImg.onload = () => {
                        if (guideStepImg.naturalWidth > 0 && guideStepImg.naturalHeight > 0 && start) {
                            start = false;
                            updateMiddlePosition();
                        }
                    }
                    break;
                case 3:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `mainBody`;
                    updateMiddlePosition();
                    break;
                case 4:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `mainBody`;
                    updateMiddlePosition();
                    break;
                case 5:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `addressBarBody`;
                    updateMiddlePosition();
                    break;
                case 6:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `bookmarksBody`;
                    updateMiddlePosition();
                    break;
                case 7:
                    createContextMenu(true, 'default', { x: (window.innerWidth / 2), y: (window.innerHeight / 2) });
                    await waitForElement('#contextMenuBody').then(() => {
                        createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                        elementID = `guideStep`;
                        targetElementID = `contextMenuBody`;
                        updateMiddlePosition();
                    });
                    break;
                case 8:
                    createContextMenu(false, 'clean');
                    createAndEditBookmarksWindow('default', 'newFolder');
                    await waitForElement('#mainWindowBody').then(() => {
                        createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                        elementID = `guideStep`;
                        targetElementID = `mainWindowBody`;
                        updateMiddlePosition();
                    });
                    break;
                case 9:
                    const inputEl = document.getElementById('titleEditorInput');
                    const bookmarkTextPreviewEl = document.getElementById('bookmarkTextPreview');
                    const newFolderName = 'New Folder';
                    inputEl.value = newFolderName;
                    bookmarkTextPreviewEl.innerText = newFolderName;
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `titleEditorInputContainer`;
                    updateMiddlePosition();
                    break;
                case 10:
                    const linkEditorEl = document.getElementById('linkEditor');
                    linkEditorEl.style.display = 'flex';
                    const urlEditorInputEl = document.getElementById('urlEditorInput');
                    urlEditorInputEl.value = 'https://www.example.com/';
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `urlEditorInput`;
                    updateMiddlePosition();
                    break;
                case 11:
                    const urlEditorInputEls = document.getElementById('urlEditorInput');
                    urlEditorInputEls.value = '';
                    const linkEditorEls = document.getElementById('linkEditor');
                    linkEditorEls.style.display = 'none';
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `listToSelectFolder`;
                    updateMiddlePosition();
                    break;
                case 12:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `showBookmarkPreview`;
                    updateMiddlePosition();
                    break;
                case 13:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `rightStyleMenuContainer`;
                    updateMiddlePosition();
                    break;
                case 14:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `bookmarkBoxStyleBody`;
                    updateMiddlePosition();
                    break;
                case 15:
                    const buttonColor = document.getElementById('styleMenuColor');
                    if (buttonColor) {
                        buttonColor.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `styleMenuBody`;
                    updateMiddlePosition();
                    break;
                case 16:
                    const buttonImage = document.getElementById('styleMenuImage');
                    if (buttonImage) {
                        buttonImage.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `styleMenuBody`;
                    updateMiddlePosition();
                    break;
                case 17:
                    const buttonText = document.getElementById('styleMenuText');
                    if (buttonText) {
                        buttonText.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `styleMenuBody`;
                    updateMiddlePosition();
                    break;
                case 18:
                    const buttonFont = document.getElementById('styleMenuFont');
                    if (buttonFont) {
                        buttonFont.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `styleMenuBody`;
                    updateMiddlePosition();
                    break;
                case 19:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `buttonsContainerForNew`;
                    updateMiddlePosition();
                    break;
                case 20:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `buttonsContainerForSave`;
                    updateMiddlePosition();
                    break;
                case 21:
                    const contextMenuWindowSave = document.getElementById('contextMenuWindowSave');
                    if (contextMenuWindowSave) {
                        contextMenuWindowSave.click();
                    }
                    await waitForElement('#bookmarkBody').then(() => {
                        createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                        elementID = `guideStep`;
                        targetElementID = `bookmarkBody`;
                        updateMiddlePosition();
                    });
                    break;
                case 22:
                    try {
                        const elementRect = document.getElementById('bookmarkBody').getBoundingClientRect();
                        const getIdOfObjectWithIndexZero = userProfileExport.currentUserBookmarks[0].children.filter(item => item.index === 0)[0].id;
                        userProfileExport.currentIdToEdit = getIdOfObjectWithIndexZero;
                        createContextMenu(true, 'bookmark', {x: (elementRect.x + (elementRect.width / 2)), y: (elementRect.y + (elementRect.height / 2))});
                        await waitForElement('#contextMenuBody').then(() => {
                            createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                            elementID = `guideStep`;
                            targetElementID = `contextMenuBody`;
                            updateMiddlePosition();
                        });
                    } catch (error) {
                        interactiveGuide('close');
                    }
                    break;
                case 23:
                    const contextMenuItemBody = document.querySelector('[data-type="delete"]');
                    if (contextMenuItemBody) {
                        contextMenuItemBody.click();
                        createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                        elementID = `guideStep`;
                        targetElementID = `mainWindowDeleteBody`;
                        updateMiddlePosition();
                    }
                    break;
                case 24:
                    const mainWindowDeleteBodyDelete =  document.getElementById('mainWindowDeleteBodyDelete');
                    if (mainWindowDeleteBodyDelete) {
                        mainWindowDeleteBodyDelete.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `profileMenu`;
                    updateMiddlePosition();
                    break;
                case 25:
                    showProfileMenu();
                    await waitForAnimation('profileMenu', 200, 240).then(() => {
                        createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                        elementID = `guideStep`;
                        targetElementID = `profileMenu`;
                        updateMiddlePosition();
                    });
                    break;
                case 26:
                    const profileMenuItemSearch = document.querySelector('.profileMenuItem[data-type="search"]');
                    if (profileMenuItemSearch) {
                        profileMenuItemSearch.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `searchWindow`;
                    updateMiddlePosition();
                    break;
                case 27:
                    userSearchWindow('close');
                    showProfileMenu();
                    await waitForAnimation('profileMenu', 200, 240).then(() => {
                        createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                        elementID = `guideStep`;
                        targetElementID = `profileMenu`;
                        updateMiddlePosition();
                    });
                    break;
                case 28:
                    const profileMenuItemFolderSettings = document.querySelector('.profileMenuItem[data-type="folderSettings"]');
                    if (profileMenuItemFolderSettings) {
                        profileMenuItemFolderSettings.click();
                    }
                    await waitForElement('#settingsWindow').then(() => {
                        createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                        elementID = `guideStep`;
                        targetElementID = `settingsWindow`;
                        updateMiddlePosition();
                    });
                    break;
                case 29:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `transparencyGridPreview`;
                    updateMiddlePosition();
                    break;
                case 30:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 31:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `rightBodySection`;
                    updateMiddlePosition();
                    break;
                case 32:
                    const leftMenuListSubmenuBackgroundImage = document.querySelector('.leftMenuListSubmenu[data-data="backgroundImage"]');
                    if (leftMenuListSubmenuBackgroundImage) {
                        leftMenuListSubmenuBackgroundImage.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 33:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `rightBodySection`;
                    updateMiddlePosition();
                    break;
                case 34:
                    const leftMenuListSubmenuBookmarksSize = document.querySelector('.leftMenuListSubmenu[data-data="bookmarksSize"]');
                    if (leftMenuListSubmenuBookmarksSize) {
                        leftMenuListSubmenuBookmarksSize.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 35:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `rightBodySection`;
                    updateMiddlePosition();
                    break;
                case 36:
                    const leftMenuListSubmenuNavigationBarSymbol = document.querySelector('.leftMenuListSubmenu[data-data="navigationBarSymbol"]');
                    if (leftMenuListSubmenuNavigationBarSymbol) {
                        leftMenuListSubmenuNavigationBarSymbol.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 37:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `rightBodySection`;
                    updateMiddlePosition();
                    break;
                case 38:
                    const leftMenuListSubmenuNavigationBarBackgroundColor = document.querySelector('.leftMenuListSubmenu[data-data="navigationBarBackgroundColor"]');
                    if (leftMenuListSubmenuNavigationBarBackgroundColor) {
                        leftMenuListSubmenuNavigationBarBackgroundColor.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 39:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `rightBodySection`;
                    updateMiddlePosition();
                    break;
                case 40:
                    const leftMenuListSubmenuNavigationBarFont = document.querySelector('.leftMenuListSubmenu[data-data="navigationBarFont"]');
                    if (leftMenuListSubmenuNavigationBarFont) {
                        leftMenuListSubmenuNavigationBarFont.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 41:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `rightBodySection`;
                    updateMiddlePosition();
                    break;
                case 42:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `buttonsSection`;
                    updateMiddlePosition();
                    break;
                case 43:
                    openCloseSettingWindow('close');
                    showProfileMenu();
                    await waitForAnimation('profileMenu', 200, 240).then(() => {
                        createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                        elementID = `guideStep`;
                        targetElementID = `profileMenu`;
                        updateMiddlePosition();
                    });
                    break;
                case 44:
                    const profileMenuItemSettings = document.querySelector('.profileMenuItem[data-type="settings"]');
                    if (profileMenuItemSettings) {
                        profileMenuItemSettings.click();
                    }
                    await waitForElement('#settingsWindow').then(() => {
                        createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                        elementID = `guideStep`;
                        targetElementID = `settingsWindow`;
                        updateMiddlePosition();
                    });
                    break;
                case 45:
                    const leftMenuListSubmenuOfflineProfile = document.querySelector('.leftMenuListSubmenu[data-data="offlineProfile"]');
                    if (leftMenuListSubmenuOfflineProfile) {
                        leftMenuListSubmenuOfflineProfile.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 46:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowRightSection`;
                    updateMiddlePosition();
                    break;
                case 47:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `headerProfile`;
                    updateMiddlePosition();
                    break;
                case 48:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `bodyProfileList`;
                    updateMiddlePosition();
                    break;
                case 49:
                    const profileEditButton = document.querySelector('.profileEditButton[data-id]');
                    if (profileEditButton) {
                        profileEditButton.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `bodyProfileSection`;
                    updateMiddlePosition();
                    break;
                case 50:
                    const leftMenuListSubmenuOnlineProfile = document.querySelector('.leftMenuListSubmenu[data-data="onlineProfile"]');
                    if (leftMenuListSubmenuOnlineProfile) {
                        leftMenuListSubmenuOnlineProfile.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 51:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowRightSection`;
                    updateMiddlePosition();
                    break;
                case 52:
                    const leftMenuListSubmenuBackgroundImageDefault = document.querySelector('.leftMenuListSubmenu[data-data="backgroundImage"]');
                    if (leftMenuListSubmenuBackgroundImageDefault) {
                        leftMenuListSubmenuBackgroundImageDefault.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 53:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowRightSection`;
                    updateMiddlePosition();
                    break;
                case 54:
                    const leftMenuListSubmenuNavigationBarSymbolDefault = document.querySelector('.leftMenuListSubmenu[data-data="navigationBarSymbol"]');
                    if (leftMenuListSubmenuNavigationBarSymbolDefault) {
                        leftMenuListSubmenuNavigationBarSymbolDefault.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 55:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowRightSection`;
                    updateMiddlePosition();
                    break;
                case 56:
                    const leftMenuListSubmenuWindowBackgroundColor = document.querySelector('.leftMenuListSubmenu[data-data="windowBackgroundColor"]');
                    if (leftMenuListSubmenuWindowBackgroundColor) {
                        leftMenuListSubmenuWindowBackgroundColor.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 57:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowRightSection`;
                    updateMiddlePosition();
                    break;
                case 58:
                    const leftMenuListSubmenuWindowFont = document.querySelector('.leftMenuListSubmenu[data-data="windowFont"]');
                    if (leftMenuListSubmenuWindowFont) {
                        leftMenuListSubmenuWindowFont.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 59:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowRightSection`;
                    updateMiddlePosition();
                    break;
                case 60:
                    const leftMenuListSubmenuWindowBorder = document.querySelector('.leftMenuListSubmenu[data-data="windowBorder"]');
                    if (leftMenuListSubmenuWindowBorder) {
                        leftMenuListSubmenuWindowBorder.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 61:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowRightSection`;
                    updateMiddlePosition();
                    break;
                case 62:
                    const leftMenuListSubmenuWindowButtons = document.querySelector('.leftMenuListSubmenu[data-data="windowButtons"]');
                    if (leftMenuListSubmenuWindowButtons) {
                        leftMenuListSubmenuWindowButtons.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 63:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `windowButtonsMenuSection`;
                    updateMiddlePosition();
                    break;
                case 64:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowRightSection`;
                    updateMiddlePosition();
                    break;
                case 65:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `windowButtonsMenuOptionsFirstSection`;
                    updateMiddlePosition();
                    break;
                case 66:
                    const leftMenuListSubmenuWindowButtonsFont = document.querySelector('.leftMenuListSubmenu[data-data="windowButtonsFont"]');
                    if (leftMenuListSubmenuWindowButtonsFont) {
                        leftMenuListSubmenuWindowButtonsFont.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 67:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `windowButtonsMenuSection`;
                    updateMiddlePosition();
                    break;
                case 68:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowRightSection`;
                    updateMiddlePosition();
                    break;
                case 69:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `windowButtonsMenuOptionsFirstSection`;
                    updateMiddlePosition();
                    break;
                case 70:
                    const leftMenuListSubmenuMyActivity = document.querySelector('.leftMenuListSubmenu[data-data="myActivity"]');
                    if (leftMenuListSubmenuMyActivity) {
                        leftMenuListSubmenuMyActivity.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 71:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowRightSection`;
                    updateMiddlePosition();
                    break;
                case 72:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `userActivityTop`;
                    updateMiddlePosition();
                    break;
                case 73:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `userActivityStatus`;
                    updateMiddlePosition();
                    break;
                case 74:
                    const editAllUserActivityBtn = document.getElementById('editAllUserActivityBtn');
                    if (editAllUserActivityBtn) {
                        editAllUserActivityBtn.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `editAllUserActivityMenuBox`;
                    updateMiddlePosition();
                    break;
                case 75:
                    const editAllUserActivityBtnClose = document.getElementById('editAllUserActivityBtn');
                    if (editAllUserActivityBtnClose) {
                        editAllUserActivityBtnClose.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `userActivityRightTop`;
                    updateMiddlePosition();
                    break;
                case 76:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `quantityFilterSection`;
                    updateMiddlePosition();
                    break;
                case 77:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `userActivityRightBottom`;
                    updateMiddlePosition();
                    break;
                case 78:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `userActivityMiddle`;
                    updateMiddlePosition();
                    break;
                case 79:
                    const leftMenuListSubmenuExportProfile = document.querySelector('.leftMenuListSubmenu[data-data="exportProfile"]');
                    if (leftMenuListSubmenuExportProfile) {
                        leftMenuListSubmenuExportProfile.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 80:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowRightSection`;
                    updateMiddlePosition();
                    break;
                case 81:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `exportFileTitle`;
                    updateMiddlePosition();
                    break;
                case 82:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `exportSelectType`;
                    updateMiddlePosition();
                    break;
                case 83:
                    const showHideExportPassword = document.getElementById('showHideExportPassword');
                    if (showHideExportPassword) {
                        showHideExportPassword.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `exportFilePassword`;
                    updateMiddlePosition();
                    const exportFilePasswordInputEl = document.getElementById('exportFilePasswordInput');
                    exportFilePasswordInputEl.focus({ focusVisible: false });
                    break;
                case 84:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `exportAnimationAndButton`;
                    updateMiddlePosition();
                    break;
                case 85:
                    const leftMenuListSubmenuImportProfile = document.querySelector('.leftMenuListSubmenu[data-data="importProfile"]');
                    if (leftMenuListSubmenuImportProfile) {
                        leftMenuListSubmenuImportProfile.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 86:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowRightSection`;
                    updateMiddlePosition();
                    break;
                case 87:
                    const filePickerInputFileNameEl = document.getElementById('filePickerInputFileName');
                    filePickerInputFileNameEl.innerText = 'Export 0-00-0000_0-00-00 AM.bme';
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `importSelectFileSection`;
                    updateMiddlePosition();
                    break;
                case 88:
                    const importFileInfoTopEl = document.getElementById('importFileInfoTop');
                    importFileInfoTopEl.style.opacity = 1;
                    importFileInfoTopEl.innerHTML = `<div id="importFileInfoTopTitle">Information About File</div><div id="importFileInfoDetail"><div id="importFileInfoInclude">Current Bookmarks, Default Folder Style</div><div id="importFileInfoSizeAndDate"><div id="importFileInfoDate"><div id="importFileDateTitle">Date</div><div id="importFileDate">0/00/0000</div></div><div id="importFileInfoSize"><div id="importFileSizeTitle">Size</div><div id="importFileSize">00.00 KB</div></div></div></div>`;
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `importFileInfoTop`;
                    updateMiddlePosition();
                    break;
                case 89:
                    const importFileInfoMiddleDetailEl = document.getElementById('importFileInfoMiddleDetail');
                    importFileInfoMiddleDetailEl.innerHTML = `<div id="importFileInfoMiddleDetailBox"><div id="decryptionBox"><div id="passwordBox"><title for="importFilePasswordInput" id="importFilePasswordInputTitle">File Password</title><div id="passwordAndIcon"><input type="password" id="importFilePasswordInput" ><button id="passwordShowHideIcon"><svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 16.01C14.2091 16.01 16 14.2191 16 12.01C16 9.80087 14.2091 8.01001 12 8.01001C9.79086 8.01001 8 9.80087 8 12.01C8 14.2191 9.79086 16.01 12 16.01Z" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 11.98C8.09 1.31996 15.91 1.32996 22 11.98" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M22 12.01C15.91 22.67 8.09 22.66 2 12.01" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div></div><button id="decryptButton">Decrypt</button></div></div>`;
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `importFileInfoMiddle`;
                    updateMiddlePosition();
                    break;
                case 90:
                    const importFileInfoMiddleDetailElement = document.getElementById('importFileInfoMiddleDetail');
                    importFileInfoMiddleDetailElement.innerHTML = `<div id="importDataDetailExtension" style="background-color: #1AEEEE;"><div id="importDataDetailExtensionTitle">Extension Version</div><div id="importDataDetailExtensionDetail">0.0.0</div></div><div id="importDataDetailBrowser" style="background-color: #27FBFB;"><div id="importDataDetailBrowserTitle">Browser Information</div><div id="importDataDetailBrowserDetail">Firefox, v. 134.0</div></div><div id="importDataDetailOS" style="background-color: #1AEEEE;"><div id="importDataDetailOSTitle">OS Type</div><div id="importDataDetailOSDetail">Linux</div></div><div id="importDataDetailTimestamp" style="background-color: #27FBFB;"><div id="importDataDetailTimestampTitle">Created At</div><div id="importDataDetailTimestampDetail">0/00/0000, 0:00:00 AM</div></div><div id="importDataDetailProfile" style="background-color: #1AEEEE;"><div id="resultTableHeaderCurrentProfile">Profile Name</div><div id="importDataDetailProfileDetail"><div id="importDataDetailProfileDetailBox"><div id="profileDetailImage" style="background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAABbElEQVR4nO2XS0oDQRRFTwZG0C24ADFxAboCnTnTDWQsLiSaYDAzHfsZaiZ+NhHFeZyFgDEx4CChpOEFJJDGqorpp74DF4qmu+ve4lJdDYZhGH+NdaAKPALvomRcAYooZhE4AUaAm6IhUAPyKDT/kGJ8UvfaQtQ9zI91jKLOp9UmrU4FFFANMD/WIQp4igjQRAH9iAA9FNCLCPCGAn59hSoRAcoooChbYsg2uoYSagEBku1XDcmx4M7D/C2wgDLycjxIq9NQVl6d+a8U5AvblG9EX8ZlTZ03DMPQQ062xxJwBDSAZ6ANfIjacq0h95TkmVxWppeBXeAK6EQc5jrApbxraR7GV4EzYBBhepoGwKnMMXNWgIvAn3dfjYBzmXMm7ETWJFRdYC/W/EEGxt2E9kPNb86pMu4bldoICXCjwLwTXYcE6Cow7kSvIQGcMnmTtWH37wO8KFh1J2r5Fwi2QUWIFrAVEsAwDIMf5xMzFG7a+AMMkQAAAABJRU5ErkJggg==) center center / cover no-repeat;"></div><div id="profileDetailName">${userActiveProfile.name}</div></div>`;
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `importFileInfoMiddle`;
                    updateMiddlePosition();
                    break;
                case 91:
                    const importFileContinueButtonEl = document.getElementById('importFileContinueButton');
                    importFileContinueButtonEl.style.display = 'flex';
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `importFileButtons`;
                    updateMiddlePosition();
                    break;
                case 92:
                    const importFileInfoMiddleDetailElVerificationHtml = document.getElementById('importFileInfoMiddleDetail');
                    importFileInfoMiddleDetailElVerificationHtml.innerHTML = `
                        <div id="importFileVerificationContainer">
                            <div id="importFileVerificationStatus" style="background-color:#1aeeee">
                                <div id="importFileVerificationStatusSuccess">
                                <div id="importFileVerificationStatusSuccessTitle">Success</div>
                                <div id="importFileVerificationStatusSuccessCount">5017</div>
                                </div>
                                <div id="importFileVerificationStatusError">
                                <div id="importFileVerificationStatusErrorTitle">Error</div>
                                <div id="importFileVerificationStatusErrorCount">0</div>
                                <div id="importFileVerificationStatusErrorShowDetail" style="display: flex;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <path d="M12 16v-4"></path>
                                    <path d="M12 8h.01"></path>
                                    </svg>
                                </div>
                                </div>
                                <div id="importFileVerificationStatusCriticalError">
                                <div id="importFileVerificationStatusCriticalErrorTitle">Critical Error</div>
                                <div id="importFileVerificationStatusCriticalErrorCount">0</div>
                                </div>
                            </div>
                            <div id="importFileVerificationStatusShowDetail" style="background-color:#27fbfb"></div>
                            <div id="importFileVerificationMiddle" style="background-color:#27fbfb">
                                <div id="importFileVerificationResultTable">
                                    <div id="importFileVerificationResultTableHeader" style="background-color:#41ffff">
                                        <div id="resultTableHeaderName">Import Type</div>
                                        <div id="resultTableHeaderCurrentProfile">To Current Profile</div>
                                        <div id="resultTableHeaderNewProfile">To New Profile</div>
                                    </div>
                                    <div id="importFileVerificationResultTableBody">
                                        <div class="importTableBodyElement" style="background-color: #34FFFF;">
                                            <div class="tableBodyName">All Profiles</div>
                                            <div class="tableBodyCurrentProfile" data-status="disabled" data-index="0">
                                                <button class="tableBodyCurrentProfileInfo" data-type="allProfiles" style="display: none;">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" class="bi bi-question-circle" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"></path><path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"></path></svg>
                                                </button>
                                                <div class="importTypeBox">
                                                    <label class="toggle" for="importCurrentProfileAllProfiles">
                                                        <input type="checkbox" class="toggleInput importToggleInput" id="importCurrentProfileAllProfiles" data-type="allProfilesCurrent" disabled="">
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
                                            <div class="tableBodyNewProfile" data-status="allowed" data-index="0">
                                                <div class="importTypeBox">
                                                    <label class="toggle" for="importNewProfileAllProfiles">
                                                        <input type="checkbox" class="toggleInput importToggleInput" id="importNewProfileAllProfiles" data-type="allProfilesNew">
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

                                        <div class="importTableBodyElement" style="background-color: #34FFFF;">
                                            <div class="tableBodyName">Current Profile</div>
                                            <div class="tableBodyCurrentProfile" data-status="disabled" data-index="0">
                                                <button class="tableBodyCurrentProfileInfo" data-type="currentAllProfile" style="display: none;">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" class="bi bi-question-circle" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"></path><path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"></path></svg>
                                                </button>
                                                <div class="importTypeBox">
                                                    <label class="toggle" for="importCurrentProfileCurrentAllProfile">
                                                        <input type="checkbox" class="toggleInput importToggleInput" id="importCurrentProfileCurrentAllProfile" data-type="currentAllProfileCurrent" disabled="">
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
                                            <div class="tableBodyNewProfile" data-status="allowed" data-index="0">
                                                <div class="importTypeBox">
                                                    <label class="toggle" for="importNewProfileCurrentAllProfile">
                                                        <input type="checkbox" class="toggleInput importToggleInput" id="importNewProfileCurrentAllProfile" data-type="currentAllProfileNew">
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

                                        <div class="importTableBodyElement" style="background-color: #34FFFF;">
                                            <div class="tableBodyName">Current Bookmarks</div>
                                            <div class="tableBodyCurrentProfile" data-status="allowed" data-index="0">
                                                <button class="tableBodyCurrentProfileInfo" data-type="currentBookmarks" style="display: flex;">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" class="bi bi-question-circle" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"></path><path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"></path></svg>
                                                </button>
                                                <div class="importTypeBox">
                                                    <label class="toggle" for="importCurrentProfileCurrentBookmarks">
                                                        <input type="checkbox" class="toggleInput importToggleInput" id="importCurrentProfileCurrentBookmarks" data-type="currentBookmarksCurrent">
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
                                            <div class="tableBodyNewProfile" data-status="disabled" data-index="0">
                                                <div class="importTypeBox">
                                                    <label class="toggle" for="importNewProfileCurrentBookmarks">
                                                        <input type="checkbox" class="toggleInput importToggleInput" id="importNewProfileCurrentBookmarks" data-type="currentBookmarksNew" disabled="">
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

                                        <div class="importTableBodyElement" style="background-color: #5BFFFF;">
                                            <div class="tableBodyName">Default Folder Style</div>
                                            <div class="tableBodyCurrentProfile" data-status="allowed" data-index="1">
                                                <button class="tableBodyCurrentProfileInfo" data-type="defaultFolderStyle" style="display: flex;">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" class="bi bi-question-circle" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"></path><path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"></path></svg>
                                                </button>
                                                <div class="importTypeBox">
                                                    <label class="toggle" for="importCurrentProfileDefaultFolderStyle">
                                                        <input type="checkbox" class="toggleInput importToggleInput" id="importCurrentProfileDefaultFolderStyle" data-type="defaultFolderStyleCurrent">
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
                                            <div class="tableBodyNewProfile" data-status="disabled" data-index="1">
                                                <div class="importTypeBox">
                                                    <label class="toggle" for="importNewProfileDefaultFolderStyle">
                                                        <input type="checkbox" class="toggleInput importToggleInput" id="importNewProfileDefaultFolderStyle" data-type="defaultFolderStyleNew" disabled="">
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

                                        <div class="importTableBodyElement" style="background-color: #34FFFF;">
                                            <div class="tableBodyName">Default Bookmarks Style</div>
                                            <div class="tableBodyCurrentProfile" data-status="allowed" data-index="2">
                                                <button class="tableBodyCurrentProfileInfo" data-type="defaultBookmarksStyle" style="display: flex;">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" class="bi bi-question-circle" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"></path><path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"></path></svg>
                                                </button>
                                                <div class="importTypeBox">
                                                    <label class="toggle" for="importCurrentProfileDefaultBookmarksStyle">
                                                        <input type="checkbox" class="toggleInput importToggleInput" id="importCurrentProfileDefaultBookmarksStyle" data-type="defaultBookmarksStyleCurrent">
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
                                            <div class="tableBodyNewProfile" data-status="disabled" data-index="2">
                                                <div class="importTypeBox">
                                                    <label class="toggle" for="importNewProfileDefaultBookmarksStyle">
                                                        <input type="checkbox" class="toggleInput importToggleInput" id="importNewProfileDefaultBookmarksStyle" data-type="defaultBookmarksStyleNew" disabled="">
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

                                        <div class="importTableBodyElement" style="background-color: #5BFFFF;">
                                            <div class="tableBodyName">User Settings</div>
                                            <div class="tableBodyCurrentProfile" data-status="allowed" data-index="3">
                                                <button class="tableBodyCurrentProfileInfo" data-type="userSettings" style="display: flex;">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" class="bi bi-question-circle" viewBox="0 0 16 16"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"></path><path d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286m1.557 5.763c0 .533.425.927 1.01.927.609 0 1.028-.394 1.028-.927 0-.552-.42-.94-1.029-.94-.584 0-1.009.388-1.009.94"></path></svg>
                                                </button>
                                                <div class="importTypeBox">
                                                    <label class="toggle" for="importCurrentProfileUserSettings">
                                                        <input type="checkbox" class="toggleInput importToggleInput" id="importCurrentProfileUserSettings" data-type="userSettingsCurrent">
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
                                            <div class="tableBodyNewProfile" data-status="disabled" data-index="3">
                                                <div class="importTypeBox">
                                                    <label class="toggle" for="importNewProfileUserSettings">
                                                        <input type="checkbox" class="toggleInput importToggleInput" id="importNewProfileUserSettings" data-type="userSettingsNew" disabled="">
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
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `importFileInfoMiddleDetail`;
                    updateMiddlePosition();
                    countTo(0, 5017, 2200, document.getElementById('importFileVerificationStatusSuccessCount'));
                    countTo(0, 1, (1000), document.getElementById('importFileVerificationStatusErrorCount'));
                    break;
                case 93:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `importFileVerificationStatus`;
                    updateMiddlePosition();
                    break;
                case 94:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `importFileVerificationMiddle`;
                    updateMiddlePosition();
                    break;
                case 95:
                    const importFileApplyButton = document.getElementById('importFileApplyButton');
                    const importFileContinueButton = document.getElementById('importFileContinueButton');
                    importFileContinueButton.style.display = 'none';
                    importFileApplyButton.style.display = 'flex';
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `importFileButtons`;
                    updateMiddlePosition();
                    break;
                case 96:
                    const leftMenuListSubmenuSyncBrowserBookmarks = document.querySelector('.leftMenuListSubmenu[data-data="syncBrowserBookmarks"]');
                    if (leftMenuListSubmenuSyncBrowserBookmarks) {
                        leftMenuListSubmenuSyncBrowserBookmarks.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 97:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `synchronizeBrowserBookmarksContainerTop`;
                    updateMiddlePosition();
                    break;
                case 98:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `synchronizeStatusContainer`;
                    updateMiddlePosition();
                    break;
                case 99:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `synchronizeTypeContainer`;
                    updateMiddlePosition();
                    break;
                case 100:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `synchronizeVisualStatusContainer`;
                    updateMiddlePosition();
                    break;
                case 101:
                    const extensionFolderEditButtonEl = document.getElementById('extensionFolderEditButton');
                    if (extensionFolderEditButtonEl) {
                        extensionFolderEditButtonEl.click();
                    }
                    allowNextStep = false;
                    setTimeout(() => {
                        createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                        elementID = `guideStep`;
                        targetElementID = `synchronizeBrowserBookmarksContainerMiddle`;
                        updateMiddlePosition();
                        allowNextStep = true;
                    }, 2000);
                    break;
                case 102:
                    const folderNameRoot = document.querySelector('.folderName[data-id="root"]');
                    if (folderNameRoot) {
                        folderNameRoot.click();
                    }
                    gsap.fromTo(folderNameRoot, {
                        color: '#00000000'
                    }, {
                        color: '#4ac900ff',
                        duration: 0.4,
                        ease: Linear.easeNone,
                        repeat: 3,
                        onComplete: () => {
                            gsap.set(folderNameRoot, { clearProps: 'all' });
                            gsap.killTweensOf(folderNameRoot);
                        }
                    });
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `synchronizeBrowserBookmarksContainerMiddle`;
                    updateMiddlePosition();
                    break;
                case 103:
                    const folderApplyButton = document.getElementById('folderApplyButton');
                    if (folderApplyButton) {
                        folderApplyButton.click();
                    }
                    allowNextStep = false;
                    setTimeout(() => {
                        createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                        elementID = `guideStep`;
                        targetElementID = `synchronizeVisualStatusExtensionFolder`;
                        updateMiddlePosition();
                        allowNextStep = true;
                    }, 2000);
                    break;
                case 104:
                    const synchronizeVisualStatusBrowserFolderIcon = document.getElementById('synchronizeVisualStatusBrowserFolderIcon');
                    const browserFolderName = document.getElementById('browserFolderName');
                    const browserFolderDeleteButton = document.getElementById('browserFolderDeleteButton');
                    synchronizeVisualStatusBrowserFolderIcon.style.display = 'flex';
                    browserFolderName.innerText = 'Synchronization';
                    browserFolderDeleteButton.style.display = 'flex';
                    browserFolderDeleteButton.style.backgroundColor = '#e53935';
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `synchronizeVisualStatusBrowserFolder`;
                    updateMiddlePosition();
                    break;
                case 105:
                    const synchronizeStatusInput = document.getElementById('synchronizeStatusInput');
                    const synchronizeStatusInputTitle = document.getElementById('synchronizeStatusInputTitle');
                    synchronizeStatusInput.checked = true;
                    synchronizeStatusInputTitle.innerText = 'Synchronization is On';
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `synchronizeStatusContainer`;
                    updateMiddlePosition();
                    break;
                case 106:
                    const creationOfSynchronizeVisualBrowserToExtension = () => {
                        const synchronizeVisualArrowTopEl = document.getElementById('synchronizeVisualArrowTop');
                        let synchronizeVisualArrowTopHtml = ``;
                        for (let i = 0; i < 9; i++) {
                            synchronizeVisualArrowTopHtml += `<svg width="20" height="20" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="green" stroke="#000" stroke-width="1" class="arrowRight"><path d="m0,99.85741l0,-99.85741l100,49.92871l-100,49.92871z"/></svg>`;
                        }
                        synchronizeVisualArrowTopEl.innerHTML = synchronizeVisualArrowTopHtml;
                        const arrowRightEl = document.querySelectorAll('.arrowRight');
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
                            });
                        }
                    }
                    const creationOfSynchronizeVisualExtensionToBrowser = () => {
                        const synchronizeVisualArrowBottomEl = document.getElementById('synchronizeVisualArrowBottom');
                        let synchronizeVisualArrowBottomHtml = ``;
                        for (let i = 0; i < 9; i++) {
                            synchronizeVisualArrowBottomHtml += `<svg width="20" height="20" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" fill="green" stroke="#000" stroke-width="1" class="arrowLeft"><path d="m99.42575,99.0906l-99.22305,-49.5453l99.22305,-49.5453l0,99.0906z"/></svg>`;
                        }
                        synchronizeVisualArrowBottomEl.innerHTML = synchronizeVisualArrowBottomHtml;
                        const arrowLeftEl = document.querySelectorAll('.arrowLeft');
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
                            });
                        }
                    }
                    creationOfSynchronizeVisualBrowserToExtension();
                    creationOfSynchronizeVisualExtensionToBrowser();
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `synchronizeVisualStatusMiddle`;
                    updateMiddlePosition();
                    break;
                case 107:
                    const synchronizeApplyButton = document.getElementById('synchronizeApplyButton');
                    synchronizeApplyButton.style.display = 'flex';
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `synchronizeBrowserBookmarksContainerBottomButtons`;
                    updateMiddlePosition();
                    break;
                case 108:
                    const leftMenuListSubmenuAboutInfo = document.querySelector('.leftMenuListSubmenu[data-data="aboutInfo"]');
                    if (leftMenuListSubmenuAboutInfo) {
                        leftMenuListSubmenuAboutInfo.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 109:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowRightSection`;
                    updateMiddlePosition();
                    break;
                case 110:
                    const AboutChangelog = document.querySelector('.leftMenuListSubmenu[data-data="aboutChangelog"]');
                    if (AboutChangelog) {
                        AboutChangelog.click();
                    }
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowLeftSection`;
                    updateMiddlePosition();
                    break;
                case 111:
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `settingsWindowRightSection`;
                    updateMiddlePosition();
                    break;
                case 112:
                    openCloseSettingWindow('close');
                    createDialog(languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].title, languageAllObject.interactiveGuideWindow[`step${currentGuideStep}`].message);
                    elementID = `guideStep`;
                    targetElementID = `mainBody`;
                    updateMiddlePosition();
                    const guideStepButtonNextEl = document.getElementById('guideStepButtonNext');
                    guideStepButtonNextEl.style.display = 'none';
                    const dialogElementRect = document.getElementById('guideStep').getBoundingClientRect();
                    const emojiArray = ['💗', '💖', '⭐', '🤩', '💛', '💚', '💙', '🩵', '💜', '🤎', '🖤', '🩶', '🤍', '✨'];
                    let image=[];
                    emojiArray.forEach(emoji => { image.push({ src: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 100 100'><text x='10' y='75' font-family='Arial' font-size='80'>${emoji}</text></svg>`,width: 120,height: 120,}) });
                    confetti({
                        particleCount: randomIntFromInterval(100,130),
                        angle: randomIntFromInterval(80, 100),
                        spread: randomIntFromInterval(170, 190),
                        startVelocity: randomIntFromInterval(30, 40),
                        decay: 0.85,
                        flat: false,
                        gravity: 0.55,
                        drift: 16,
                        ticks: 50,
                        position: { x: ((dialogElementRect.left + (dialogElementRect.width / 2)) / window.innerWidth) * 100, y: ((dialogElementRect.top + (dialogElementRect.height / 2) - 50) / window.innerHeight) * 100 },
                        colors: [getRandomColor(), getRandomColor(), getRandomColor()],
                        shapes: ['image'],
                        shapeOptions: {
                            image: image,
                        },
                        scalar: 5.4,
                        zIndex: 100,
                        disableForReducedMotion: true
                    });
                    break;
                default:
                    interactiveGuide('close');
                    break;
            }
        }
        guideSteps();

        document.addEventListener('keydown', (event) => {
            if (document.getElementById('interactiveGuide') === null) return;
            event.preventDefault(); // Prevent default behavior
            if (event.key === 'ArrowRight') {
                const guideStepButtonNextButton = document.getElementById('guideStepButtonNext');
                guideStepButtonNextButton.style.top = '2px';
                if (!allowNextStep) return;
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    // Clear existing highlights
                    document.querySelectorAll('.highlight').forEach(el => el.remove());
                    // Clear existing triangles
                    document.querySelectorAll('.triangle').forEach(el => el.remove());
                    currentGuideStep <= 112 ? currentGuideStep++ : '';
                    guideSteps();
                    guideStepButtonNextButton.style.top = '0px';
                }, 500);
            }
            if (event.key === 'Escape') {
                interactiveGuide('close');
            }
        });

        // Listen for window resize events
        // Listen for window resize events to update the highlight
        window.addEventListener('resize', () => {
            // Clear existing highlights
            document.querySelectorAll('.highlight').forEach(el => el.remove());
            // Clear existing triangles
            document.querySelectorAll('.triangle').forEach(el => el.remove());
            // Recreate the inverted highlight
            updateMiddlePosition();
        });
    } catch (error) {
        console.error('Error in interactiveGuide', error);
        interactiveGuide('close');
        return error;
    }
}