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
import { openCloseSettingWindow } from './settingsManager.js';
import { createAndEditBookmarksWindow } from './bookmarkManager.js';
import { searchManager } from './searchManager.js';
import { findBookmarkByKey, indexedDBManipulation, pSBC, returnRandomElementFromArray, getRandomHexColorByType, randomIntFromInterval, checkIfColorBrightness, findPathToRoot, getRandomColor, escapeHtml, isObjectEmpty, openUrl, showMessageToastify, sortFolderByChildrenIndex, getNextMaxIndex, generateRandomID, formatDateTime, capitalizeString, correctIndexes, moveObjectInParentArray, changeIds, actionForArray, getBrowserAndOSInfo, calculateGradientPercentages, changeBase64ImageColor, generateColorPalette, createTooltip, truncateTextIfOverflow, translateUserName, generateRandomIdForObj, getAllChildIds } from './utilityFunctions.js';
import { interactiveGuide } from './interactiveGuide.js';
import { undoManager } from './undoManager.js';

export let firstLoadStatus = false;
export let currentLanguage = 'en-US';
export let currentLanguageTextObj = {};
export const filesLocationFromThis = {
    language: '../locales/',
    icons: '../icons/',
    json: '../json/',
    css: '../css/',
    html: '../html/',
    libraries: './libraries/',
};
export let currentMousePos = { x: 0, y: 0 };
export let viewportHeight = 0;
export let viewportWidth = 0;
export let settingWindowOpen = { status: false };
export let showProfileMenuStatus = false;
export let connectionStatus = false;
export let clipboard = [];
export let colorPalette = [];
export let currentFolderId = 'root';
export let currentObject = {};
export let browserAndOSInfo = {};
export const exportFileExtensionName = `bme`;
export const availableLanguages = [
    { id: 'en-US', name: 'English (United States)' },
];
export const defaultProfileImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAABbElEQVR4nO2XS0oDQRRFTwZG0C24ADFxAboCnTnTDWQsLiSaYDAzHfsZaiZ+NhHFeZyFgDEx4CChpOEFJJDGqorpp74DF4qmu+ve4lJdDYZhGH+NdaAKPALvomRcAYooZhE4AUaAm6IhUAPyKDT/kGJ8UvfaQtQ9zI91jKLOp9UmrU4FFFANMD/WIQp4igjQRAH9iAA9FNCLCPCGAn59hSoRAcoooChbYsg2uoYSagEBku1XDcmx4M7D/C2wgDLycjxIq9NQVl6d+a8U5AvblG9EX8ZlTZ03DMPQQ062xxJwBDSAZ6ANfIjacq0h95TkmVxWppeBXeAK6EQc5jrApbxraR7GV4EzYBBhepoGwKnMMXNWgIvAn3dfjYBzmXMm7ETWJFRdYC/W/EEGxt2E9kPNb86pMu4bldoICXCjwLwTXYcE6Cow7kSvIQGcMnmTtWH37wO8KFh1J2r5Fwi2QUWIFrAVEsAwDIMf5xMzFG7a+AMMkQAAAABJRU5ErkJggg==';
export const folderNamesForAddressBarPreview = ['Encourage', 'Morality', 'Brilliant', 'Calm', 'Cheery', 'Classic', 'Charming', 'Creative', 'Elegant', 'Excellent', 'Genius', 'Good', 'Graceful', 'Idea', 'Intellectual', 'Kind', 'Laugh', 'Lovely', 'Nature', 'Positive', 'Popular', 'Quality', 'Safe', 'Success', 'Trusting', 'Wondrous', 'Social', 'Music', 'Life', 'Shopping', 'Work', 'Funny ideas', 'Sports', 'Books', 'Weather', 'Games', 'Play', 'TV', 'Email', 'Inspire', 'Education', 'Health', 'Happiness', 'Motivate', 'Joy', 'Optimism', 'Cheer', 'Dream', 'Courage', 'Thrive', 'Energy', 'Gratitude', 'Glow', 'Renew', 'Smile', 'Spark', 'Vitality', 'Resilience', 'Enthusiasm',];
export const contextMenuActiveOnIds = {
    default: ['mainBody', 'bookmarksBody', 'messageBody', 'addressBarBody', 'settingBtn'],
    bookmark: ['bookmarkActiveBox'],
};
export const symbolArray = ['/', '&#169;', '&#174;', '&#8482;', '&#64;', '&#182;', '&#167;', '&#8448;', '&#8449;', '&#8450;', '&#8451;', '&#8452;', '&#8453;', '&#8454;', '&#8455;', '&#8456;', '&#8457;', '&#8458;', '&#8459;', '&#8460;', '&#8461;', '&#8462;', '&#8463;', '&#8464;', '&#8465;', '&#8466;', '&#8467;', '&#8468;', '&#8469;', '&#8470;', '&#8471;', '&#8472;', '&#8473;', '&#8474;', '&#8475;', '&#8476;', '&#8477;', '&#8478;', '&#8479;', '&#8480;', '&#8481;', '&#8483;', '&#8484;', '&#8485;', '&#8486;', '&#8487;', '&#8488;', '&#8489;', '&#8490;', '&#8491;', '&#8492;', '&#8493;', '&#8494;', '&#8495;', '&#8496;', '&#8497;', '&#8498;', '&#8499;', '&#8500;', '&#8501;', '&#8502;', '&#8503;', '&#8504;', '&#8505;', '&#8506;', '&#8507;', '&#8508;', '&#8509;', '&#8510;', '&#8511;', '&#8512;', '&#8513;', '&#8514;', '&#8515;', '&#8516;', '&#8517;', '&#8518;', '&#8519;', '&#8520;', '&#8521;', '&#8522;', '&#8523;', '&#8525;', '&#8526;', '&#9728;', '&#9729;', '&#9730;', '&#9731;', '&#9732;', '&#9733;', '&#9734;', '&#9735;', '&#9736;', '&#9737;', '&#9738;', '&#9739;', '&#9740;', '&#9741;', '&#9742;', '&#9743;', '&#9744;', '&#9745;', '&#9746;', '&#9747;', '&#9750;', '&#9751;', '&#9752;', '&#9753;', '&#9754;', '&#9755;', '&#9756;', '&#9757;', '&#9758;', '&#9759;', '&#9760;', '&#9761;', '&#9762;', '&#9763;', '&#9764;', '&#9774;', '&#9775;', '&#9776;', '&#9777;', '&#9778;', '&#9779;', '&#9780;', '&#9781;', '&#9782;', '&#9783;', '&#9784;', '&#9785;', '&#9786;', '&#9787;', '&#9788;', '&#9789;', '&#9790;', '&#9791;', '&#9792;', '&#9793;', '&#9794;', '&#9795;', '&#9796;', '&#9797;', '&#9798;', '&#9799;', '&#9812;', '&#9813;', '&#9814;', '&#9815;', '&#9816;', '&#9817;', '&#9818;', '&#9819;', '&#9820;', '&#9821;', '&#9822;', '&#9823;', '&#9824;', '&#9825;', '&#9826;', '&#9827;', '&#9828;', '&#9829;', '&#9830;', '&#9831;', '&#9832;', '&#9833;', '&#9834;', '&#9835;', '&#9836;', '&#9837;', '&#9838;', '&#9839;', '&#9840;', '&#9841;', '&#9842;', '&#9843;', '&#9844;', '&#9845;', '&#9846;', '&#9847;', '&#9848;', '&#9849;', '&#9850;', '&#9851;', '&#9852;', '&#9853;', '&#9854;', '&#9856;', '&#9857;', '&#9858;', '&#9859;', '&#9860;', '&#9861;', '&#9862;', '&#9863;', '&#9864;', '&#9865;', '&#9866;', '&#9867;', '&#9868;', '&#9869;', '&#9870;', '&#9871;', '&#9872;', '&#9873;', '&#9874;', '&#9876;', '&#9877;', '&#9878;', '&#9879;', '&#9880;', '&#9881;', '&#9882;', '&#9883;', '&#9884;', '&#9885;', '&#9886;', '&#9887;', '&#9888;', '&#9890;', '&#9891;', '&#9892;', '&#9893;', '&#9894;', '&#9895;', '&#9896;', '&#9897;', '&#9900;', '&#9901;', '&#9902;', '&#9903;', '&#9904;', '&#9905;', '&#9906;', '&#9918;', '&#9954;', '&#9985;', '&#9986;', '&#9987;', '&#9988;', '&#9990;', '&#9991;', '&#9992;', '&#9993;', '&#9996;', '&#9997;', '&#9998;', '&#9999;', '&#10000;', '&#10001;', '&#10002;', '&#10003;', '&#10004;', '&#10005;', '&#10006;', '&#10007;', '&#10008;', '&#10009;', '&#10010;', '&#10011;', '&#10012;', '&#10013;', '&#10014;', '&#10015;', '&#10016;', '&#10017;', '&#10018;', '&#10019;', '&#10020;', '&#10021;', '&#10022;', '&#10023;', '&#10025;', '&#10026;', '&#10027;', '&#10028;', '&#10029;', '&#10030;', '&#10031;', '&#10032;', '&#10033;', '&#10034;', '&#10035;', '&#10036;', '&#10037;', '&#10038;', '&#10039;', '&#10040;', '&#10041;', '&#10042;', '&#10043;', '&#10044;', '&#10045;', '&#10046;', '&#10047;', '&#10048;', '&#10049;', '&#10050;', '&#10051;', '&#10052;', '&#10053;', '&#10054;', '&#10055;', '&#10056;', '&#10057;', '&#10058;', '&#10059;', '&#10061;', '&#10063;', '&#10064;', '&#10065;', '&#10066;', '&#10070;', '&#10072;', '&#10073;', '&#10074;', '&#10075;', '&#10076;', '&#10077;', '&#10078;', '&#10081;', '&#10082;', '&#10083;', '&#10084;', '&#10085;', '&#10086;', '&#10087;', '&#10088;', '&#10089;', '&#10090;', '&#10091;', '&#10092;', '&#10093;', '&#10094;', '&#10095;', '&#10096;', '&#10097;', '&#10098;', '&#10099;', '&#10100;', '&#10101;', '&#10102;', '&#10103;', '&#10104;', '&#10105;', '&#10106;', '&#10107;', '&#10108;', '&#10109;', '&#10110;', '&#10111;', '&#10112;', '&#10113;', '&#10114;', '&#10115;', '&#10116;', '&#10117;', '&#10118;', '&#10119;', '&#10120;', '&#10121;', '&#10122;', '&#10123;', '&#10124;', '&#10125;', '&#10126;', '&#10127;', '&#10128;', '&#10129;', '&#10130;', '&#10131;', '&#10132;', '&#10136;', '&#10137;', '&#10138;', '&#10139;', '&#10140;', '&#10141;', '&#10142;', '&#10143;', '&#10144;', '&#10145;', '&#10146;', '&#10147;', '&#10148;', '&#10149;', '&#10150;', '&#10151;', '&#10152;', '&#10153;', '&#10154;', '&#10155;', '&#10156;', '&#10157;', '&#10158;', '&#10159;', '&#10161;', '&#10162;', '&#10163;', '&#10164;', '&#10165;', '&#10166;', '&#10167;', '&#10168;', '&#10169;', '&#10170;', '&#10171;', '&#10172;', '&#10173;', '&#10174;'];
export const allowAlphabetCharactersAndNumbers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export const allowURLProtocolsToCreateScreenshot = ['http:', 'https:'];
export const messageStyle = {
    'success': {
        base64: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAACXBIWXMAAAsTAAALEwEAmpwYAAACZElEQVR4nOVWPW8TQRC9GAkqQkFF+GgoKFMgRRCId88cyDRgkHbGkksECiAqQloLG34ESPwBOiREE+ydEy4ihEjDTyAJJIgGiQbQoXd3jq3L3fku0CBG2sI7u/Nm3sy+s+P8l2aem326T+e037yrhTrxuuP6PO8E7cofA3gr5pCy9Fhb3tLCQdpSlj4rS4/qq63pPYFUhS9roe0woOW3yvJSzTdztdfmaLh8M4c9+OIzW67Pl0qBuMK3lPBPJfxR9/nqpPPKUgNnwzvW3CxcCS5oS++9QXOmaHLeoDmjhde08I+JlaEnoAvZLfitI0VBxsGUpXXQmNuzsPHguwBdWVaV5rV4ULqZI4wJQnP3EPyisnRv+FsJv1NCn1JHX1lzPsqE7pcF0Za/g/ILK43DUSx+gFjhO0saHiCcGNvxfbdnTjmBM5UHooS/uD2aHSVNZ6I3ZhZTgLgbOVvHRiA0q4W/aeGnSTBlyUsDgS34fDxmp5NWUScJZD6Y/crSi2ifnw0536HL0le3b04nY3lvzIlYNR7uAlKWb6dRV39VP6CEXsYXn2TRNW751EE0o8yXkr4E2K88kDCW0DLOVsWc3e0N2pW88R6B0XYeCHqJ8dbCm5nKDhWOs26k+dEzt8cnM0EinbyeOQg7Wa+2piEfkJEyOjc0qLq2tAFm5gdXDjp5BkEMRVV4rQxYDSCxqGL0C12C1McX1qFduYcDZyqky9IG7mifbzhlDJUNv6xRc2kZY4t3hoWJCveixgfQtsKVpPZMuIsgWZ9yLbyJhzmxJ4UsaFdQAR41gkbLLKLCv/Ln5J+037poqj0CafDxAAAAAElFTkSuQmCC`,
        textColor: `hsl(120, 100%, 55%)`,
        backgroundColor: `hsl(134, 69%, 13%)`,
    },
    'info': {
        base64: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAACXBIWXMAAAsTAAALEwEAmpwYAAACB0lEQVR4nOVWzU4bQQxewpn20FN2vBwqngH174iQeirwClURpceGnnppSt+BZ+DMI1SI2EPzDNC1N02qvgBIg+wsCCm7sxvSS1VLlqLY42/8980myf8px2G5S/wSsPjgkPuqgLKfYv4iCaGzcPyn/s9jIPkGyGMgCZWK/MshH66d/X70IBCH8hpQJhrMESOg9ICKdTi9dKb6G6VntingOPO8OS/ILhBfO5I8I37T5A+et9TXzgz4XftMiK+B5Ed2fpG2vVx2fpECyRCIrxozs56gTPR2q37cbQtyH8yhsJYx2jNrPEmIlQuQT1Rr7QPetr4if632OA7LNkHEWHuTKdCRaszHoXhHPKoc/czzK5seLx+TBQWwONBYtmezRtmf7kaxHg1C8lk15uP86JkBkezNGpEPDej00jUADVVjPinmWdmnfhVQ34xnP2FRoK7n1XLRv8wYMy/vW5auEcjFSmekaVQivUWBgPiTAQ3y57PWEDqtxrsJKISlcryLWma/GwjPWw9dWIeyUzsIt6K0ofShNDIPz92KTqxDFq3Mk++TlSQmSoglqQ7nAQN7OqakmmK+0eqQUr0eMIIc8HbUOVhPdiwT4isgfpvMI5ZZ+bJqc3WSdGx1z1R1ouw/s9nOjFpnUtUzZWENUveUO+JCF7OxJ60khI5moEutQVV1GTXDv/Jx8k/KDe+E0Ksim7tXAAAAAElFTkSuQmCC`,
        textColor: `hsl(188, 100%, 55%)`,
        backgroundColor: `hsl(188, 100%, 13%)`,
    },
    'warning': {
        base64: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAACXBIWXMAAAsTAAALEwEAmpwYAAABoUlEQVR4nO2VTUoDQRCF5xq6cxVcKZpDGIVk3htmIV5Cj6FXUBMPkMQDqFsV3AiuhBghJq50oSCmetRIdQYJyfwmGxELGoau6n5T1V9XO86//QkznlcUYE+AS0M+6BDyQueM667OLPBWLs8b4NiQg3C0BDjVod8j802NnUpEKpVlQ/YE+DDkft/3C+Mxfd8vGODAxgBdXZM/k6HISwCspcUHrlsS8lXFcmWm5dK/jBIxQE0znBAj1wX4NGQjm4jnFcO6T2ymJsCzkE+Ra8mqkF+ZALEkkYOoM7F+8lFLFOXru+6irhVgN4uQItyK8xvyPtEPtBX9VCFLD3CSIHRryJuEH1X0O+lCZEeDE/zXAlzFCpFnmYTSSifAlnje5sylS4Ph3fcXdMwMg6Jp8QYOI/1kT0dMNkeKtwArqULhZk17YV23FLHZtgF2xucDYMNeWKDu5GymXW0reuPT4gMVCVvQAJhzcjfVIeraVqpa/8gzAWphJhq75ExjYXNt/DwHwJ3iaxEG2vbgteUA9dyZxAGiJCm2Iw/fuZ3LevD/9uvtGx9/TgFruPmoAAAAAElFTkSuQmCC`,
        textColor: `hsl(59, 100%, 55%)`,
        backgroundColor: `hsl(59, 100%, 13%)`,
    },
    'error': {
        base64: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAACXBIWXMAAAsTAAALEwEAmpwYAAACEElEQVR4nOVWwW7TQBB1Q26IcqYFPqNqC5IvCIWLs+9ZvvVWtaJwpHC1aOFLOBTxG9yqiP4EpaU9B2U3lbZ6ZlNFdpw4JUJCjLRStLM7zzPz5m2i6L80n2V3HPnEAa8teaDlgFcuTTd9nrcWAXDfkh8tcOFIP2lZ8qcFPvhOZ/lWIENjXljyMgQ7dsC+M2atn2WrWvqtvcKnM8DFME2fzwXiyF0LXDng+8CY7qzzA9LorO5YY3aaZ/Ib5Fs/SVaaflw/SVYceWLJ4czMQk8u9XUeeNAUpAR2qjJO7Zkar3qXy+W3tu76OG6Xz/s4bss3vjcAEHp2WEvhgkHkcRnEkl8d8HkczMdxW3vylcEc2bPk+UTqO2OeBsq+KX+1I4+C76jIIq7ulYDeFr403awCaQDlNGZtUonGA08DCbHWQ6yXFSANnZyakbrSOuDT2LB+mQQi+9XtPgrzd1AFkqwICHj4x0BZ9jgQ4n3F6ci9v1I6J9GUE9hfABneBaCNamnyvLUIevsoWiroDZzVKvuIENKuWw+sMawlws3FTmc5PAmn8+jcyMRYS/5QZXyS3IummQSxEFXyZC5RzbLVG1ElnzW6JKnXBWUm7Zp21kfRksoVMhlacjuax0Jmo5e1VzAJWNecaYlRgV290JPzxpnU9OxQQWqfcuBMgzmzJ40A87wVMthTUC0NozJcyJ+Tf9KuAfJFE7reLUQ5AAAAAElFTkSuQmCC`,
        textColor: `hsl(0, 100%, 55%)`,
        backgroundColor: `hsl(0, 100%, 13%)`,
    },
    'default': {
        base64: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAACXBIWXMAAAsTAAALEwEAmpwYAAABnklEQVR4nO3UTYhOcRQG8J+PzKspCx8zU6NQykZZSZLyrexYyMJCWM3eysJGLIQiWbEfkVlILNhLmkzZYKGJyKwxFKNbz1u31/sx975sNE+d7r3nPOf/PPf8//eygP8BwxjDOKbwITGV3Fg4fQncxizmcp3Eo8RkS+0WhqqKHMQMfuF+nhtteI3UJsIteg7MV+RQHL7H7grm9mSksxHvipG4msY61bE+Bj/32rfLmXnhri72ZY1L3Uif8Ez/eI6PnYqr4uRKKTecMb7EAFbgDV7nvpHadMuJu5q1VrYT2pDiuVJuS3LfsTqcn4nifg1+hFNwmzif3Np2Qo2cmDttZr6t9Lwz0URR29vSUxz3b1jcaXwP436j+hjNGne7kXbllR9jWQ2RJektRru9F/lCxB5gsILIIO6l9+J8GhbhZhqKL/1kcp0wgON4l57rPfh/4Ei+q6L5WHJbcQKncDb7MBNOwT2qBpbiBb5gM27kxzlXiq94itNYribOZLG3JdcT+TvvwKaMrS+M5k2azl/hsH+AETzBNeyvurkL8DfxG5Uia16Qxk94AAAAAElFTkSuQmCC`,
        textColor: `hsl(0, 0%, 100%)`,
        backgroundColor: `hsl(0, 0%, 13%)`,
    },
}
export const exportType = [
    {
        type: 'allProfiles',
        title: 'All Profiles',
        status: false,
    },
    {
        type: 'currentAllProfile',
        title: 'Current Profile',
        status: false,
    },
    {
        type: 'currentBookmarks',
        title: 'Bookmarks',
        status: false,
    },
    {
        type: 'defaultFolderStyle',
        title: 'Default Folder Style',
        status: false,
    },
    {
        type: 'defaultBookmarksStyle',
        title: 'Default Bookmark Style',
        status: false,
    },
    {
        type: 'userSettings',
        title: 'User Settings',
        status: false,
    },
    {
        type: 'currentUserActivityLog',
        title: 'Activity Log',
        status: false,
    }
];
export const defaultBookmarkStyle = {
    border: {
        top: {
            color: '#2af0f0',
            style: 'double',
            width: '10',
            radius: '0'
        },
        right: {
            color: '#0d4949',
            style: 'double',
            width: '5',
            radius: '20'
        },
        bottom: {
            color: '#0d4949',
            style: 'double',
            width: '5',
            radius: '0'
        },
        left: {
            color: '#2af0f0',
            style: 'double',
            width: '10',
            radius: '30'
        }
    },
    color: {
        display: 'flex',
        position: 'absolute',
        width: '100',
        height: '80',
        backgroundColor: '#00b4db',
        angle: '0',
        left: '0',
        top: '0'
    },
    image: {
        display: 'flex',
        position: 'absolute',
        width: '100',
        height: '80',
        backgroundBase64: '',
        angle: '0',
        left: '0',
        top: '0'
    },
    text: {
        display: 'flex',
        position: 'absolute',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        overflow: 'hidden',
        width: '100',
        height: '20',
        backgroundColor: '#0083b0',
        angle: '0',
        left: '0',
        top: '80'
    },
    font: {
        color: '#eca05e',
        fontWeight: '400',
        fontSize: '12',
        fontStyle: 'normal',
        fontFamily: 'DejaVu Serif',
        textAlign: 'flex-start',
    }
};
export const defaultFolderStyle = {
    grid: {
        gridAutoFlow: "row",
    },
    bookmarksBox: {
        width: '200px',
        height: '200px',
    },
    background: {
        backgroundType: 'gradient',
        colorType: {
            backgroundColor: '#af5d00',
        },
        gradientType: {
            backgroundColorArray: ['#182b49', '#05961c', '#adde1b'],
            angle: 25,
        },
        imageType: {
            backgroundBase64: '',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            backgroundOrigin: 'border-box',
        },
    },
    addressBar: {
        text: {
            color: '#000000',
            fontSize: 18,
            fontFamily: 'inherit',
            fontStyle: 'normal',
            fontWeight: '400',
        },
        icon: {
            content: '/',
            color: '#000000',
            fontSize: 21,
        },
        background: {
            backgroundType: 'color',
            backgroundColor: '#00000055',
            backgroundBase64: '',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '100% 100%',
            backgroundAttachment: 'fixed',
            backgroundPosition: 'center',
            backgroundOrigin: 'border-box',
        },
    },
};
export const defaultUserBookmarks = [
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
            folder: structuredClone(defaultFolderStyle),
            bookmark: structuredClone(defaultBookmarkStyle),
        },
        children: [],
    },
];
export const defaultMainUserSettings = {
    main: {
        testingInternet: { allowToCheckInternetStatus: true },
        onlineRadio: {
            allowed: true,
            lastUserSelectedStationuuid: ''
        },
        allowUserActivity: [
            {
                action: 'createProfile',
                status: true,
                title: 'Create profile',
            },
            {
                action: 'deleteProfile',
                status: true,
                title: 'Delete profile',
            },
            {
                action: 'openExtension',
                status: false,
                title: 'Open extension',
            },
            {
                action: 'closeExtension',
                status: false,
                title: 'Close extension',
            },
            {
                action: 'createBookmark',
                status: true,
                title: 'Create bookmark',
            },
            {
                action: 'createFolder',
                status: true,
                title: 'Create folder',
            },
            {
                action: 'editBookmark',
                status: true,
                title: 'Edit bookmark',
            },
            {
                action: 'editFolder',
                status: true,
                title: 'Edit folder',
            },
            {
                action: 'deleteBookmark',
                status: true,
                title: 'Delete bookmark',
            },
            {
                action: 'deleteFolder',
                status: true,
                title: 'Delete folder',
            },
        ],
        synchronizationToBrowser: {
            status: false,
            synchronizeDirection: {
                browserToExtension: false,
                bothDirections: true,
                extensionToBrowser: false
            },
            extensionFolderId: '',
            browserFolderId: '',
        },
        undoManager: {
            status: true,
            maxLength: 10
        }
    },
    windows: {
        button: {
            primary: {
                backgroundColor: '#1a73e8',
                hoverBackgroundColor: '#155ab6',
                disabledBackgroundColor: '#a8c7f1',
                animation: {
                    status: false,
                    type: [],
                },
                font: {
                    color: '#000000',
                    fontWeight: '400',
                    fontSize: '14px',
                    fontStyle: 'inherit',
                    fontFamily: 'inherit',
                    textAlign: 'center',
                },
            },
            secondary: {
                backgroundColor: '#9e9e9e',
                hoverBackgroundColor: '#7a7a7a',
                disabledBackgroundColor: '#d1d1d1',
                animation: {
                    status: false,
                    type: [],
                },
                font: {
                    color: '#000000',
                    fontWeight: '400',
                    fontSize: '14px',
                    fontStyle: 'inherit',
                    fontFamily: 'inherit',
                    textAlign: 'center',
                },
            },
            success: {
                backgroundColor: '#38b43c',
                hoverBackgroundColor: '#388e3c',
                disabledBackgroundColor: '#a5d6a7',
                animation: {
                    status: false,
                    type: [],
                },
                font: {
                    color: '#000000',
                    fontWeight: '400',
                    fontSize: '14px',
                    fontStyle: 'inherit',
                    fontFamily: 'inherit',
                    textAlign: 'center',
                },
            },
            danger: {
                backgroundColor: '#e53935',
                hoverBackgroundColor: '#c62828',
                disabledBackgroundColor: '#ef9a9a',
                animation: {
                    status: false,
                    type: [],
                },
                font: {
                    color: '#000000',
                    fontWeight: '400',
                    fontSize: '14px',
                    fontStyle: 'inherit',
                    fontFamily: 'inherit',
                    textAlign: 'center',
                },
            },
            warning: {
                backgroundColor: '#fbc02d',
                hoverBackgroundColor: '#f9a825',
                disabledBackgroundColor: '#ffe082',
                animation: {
                    status: false,
                    type: [],
                },
                font: {
                    color: '#000000',
                    fontWeight: '400',
                    fontSize: '14px',
                    fontStyle: 'inherit',
                    fontFamily: 'inherit',
                    textAlign: 'center',
                },
            },
            info: {
                backgroundColor: '#039be5',
                hoverBackgroundColor: '#0288d1',
                disabledBackgroundColor: '#81d4fa',
                animation: {
                    status: false,
                    type: [],
                },
                font: {
                    color: '#000000',
                    fontWeight: '400',
                    fontSize: '14px',
                    fontStyle: 'inherit',
                    fontFamily: 'inherit',
                    textAlign: 'center',
                },
            },
            light: {
                backgroundColor: '#f5f5f5',
                hoverBackgroundColor: '#e0e0e0',
                disabledBackgroundColor: '#fafafa',
                animation: {
                    status: false,
                    type: [],
                },
                font: {
                    color: '#000000',
                    fontWeight: '400',
                    fontSize: '14px',
                    fontStyle: 'inherit',
                    fontFamily: 'inherit',
                    textAlign: 'center',
                },
            },
            dark: {
                backgroundColor: '#424242',
                hoverBackgroundColor: '#333333',
                disabledBackgroundColor: '#bdbdbd',
                animation: {
                    status: false,
                    type: [],
                },
                font: {
                    color: '#ffffff',
                    fontWeight: '400',
                    fontSize: '14px',
                    fontStyle: 'inherit',
                    fontFamily: 'inherit',
                    textAlign: 'center',
                },
            },
        },
        window: {
            backgroundColor: '#00d4d4',
            font: {
                color: '#000000',
                fontWeight: '400',
                fontSize: 14,
                fontStyle: 'inherit',
                fontFamily: 'inherit',
                textAlign: 'center',
            },
            border: {
                top: {
                    color: '#00d4d4',
                    style: 'ridge',
                    width: 10,
                    radius: 10,
                },
                right: {
                    color: '#00d4d4',
                    style: 'groove',
                    width: 10,
                    radius: 10,
                },
                bottom: {
                    color: '#00d4d4',
                    style: 'groove',
                    width: 10,
                    radius: 10,
                },
                left: {
                    color: '#00d4d4',
                    style: 'ridge',
                    width: 10,
                    radius: 10,
                }
            },
        }
    },
    contextMenu: {
        color: '',
        hover: '#0a5703',
    }
};
export const userProfileExport = {
    userActivityLog: [],
    defaultUserBookmarkStyle: {},
    defaultUserFolderStyle: {},
    currentUserBookmarks: [],
    mainUserSettings: {},
    currentIdToEdit: null,
    currentFolderId: currentFolderId,
};
export let userProfile = {};
export let userActiveProfile = {};
export const profileMenuItems = [
    {
        id: 1,
        title: 'New bookmark',
        type: 'newBookmark',
        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAACIklEQVR4nO2ZO08cMRDHf6m5pAMBScWrBNISJEDQwccBigMq+BCBKKkDUTpKjmcBFDSJeH0DDkEeQJHOaKQ5yTpt7vbh9S6S/9JIq7NvZn7rsb3rhaAgb5oDasATYDLYGdCFZ61lTLrZfvqEmNOg/4B5oCeDr0IgdjWgJJ9VdvLeIB41WLdDgE7gh15fZhzV2EFd+/IGkReAyAtEngBeIPIGyB3CJcBf9fUuoq0rr9XJJcB39bXtE8I4BBgC7hLs2CdlAxC9BTatcjItbKeMAN5lAkA6nQLHvOARMK7iBoCUMmEEVKGEUsqEElKFEkopE0pIFUoogSaBL8CFdePk+jMwQYlHYAg4iPF+sA8Mlg1gHPitMW6AKjACdKiNAkvaJn1+AWNlAegH/qj/r0ClRd/X+iZnFLivDABHVvKvYvSXPltWORUKMGOVTSXBC42MRF3/O1UkwCf1W00Rd1nb1osEuFa/wynijmrbVZEAjWP7SsSciDJps8vIqI+2etDOrg9dG37jAhxGAIiPtqpp5wXHADL8WUtIdum2mrW+kS0CvbjRhvqVTSopwIq2fYwbbDXBeaaJWcfT1jIqJdGso6ayaegNcJtkGbVHomZNvjTWnNCe/r6ZYCP75vLcNKsGgHtNaOs/I2Hf+Ubyd0keJfLWuAVR103qva5OFb1escpGkv9AyTRgfY9uZVI2pbnzUZKJLY8HsjzKXBM719UmcsI+AwNdauL73JsIAAAAAElFTkSuQmCC',
    },
    {
        id: 2,
        title: 'New folder',
        type: 'newFolder',
        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAACEElEQVR4nO2ZPUtcURCGH1HSuJGUMWAji2ViioBECYRgtb/B/AtTaKxs9A+EfPwBP1oLCzXRLcTGziD2SjaYBFTQ7sjAe+GwuWvurm7OuXIeGFjunNmd98zc2btnIZFI3DseAIvACeAK2BmwDrwgEhYKJt5sl8AEEXCshF4WXP8I+KCYQ6CXwDhZO/QBR4qbooQCjLeKO6CkAvqAb8AaJRUQDS5HQL3DyXRbOwc2gVpZBTjP5m8jIBSDwDRwpZxqZROQ8U45WTuVUsBj77GllALayisJ6BIuVSAwLlUgMC5VIDAuVSAwLlUgMK4MFZgEvuh45kJ2qGtRCxgBtgv+MhuOTcAr4Lc+8wcwAzwD+mWjwKx8tqYBjMUiYMRLfgmo3LD2IbCstRYzFIOAbS/5ngLrbc2KYrZCC7AbNmubvJ3fA3ZbVKKh2LGQArLJYj3fbh7v5bP3+IszOe1Io5vYeLTPedqBgFH59vOcm3LaeUw3yTaqUvAAzXx+G9m1P3lvXJPzSucxTyIRsJMjoOUxy3yXjgfrd9xC32/aoZra6fwOBfi7+FnXZjsQMCffRwLyxhuj1hLN1JsEZwwAPxX7msB8VSLLbXyRrSpmgwioAr+U0EqLSvg7nyV/WuSh7n8x4Ylo6EvquaZTRa/nvLax5MeJjKqebf41BKxtotn5POzG/qTxaNPPzP71tGmTe8NeA3HRcf9aMTFTAAAAAElFTkSuQmCC',
    },
    {
        id: 3,
        title: 'Search',
        type: 'search',
        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAADdUlEQVRo3u2YX2jNYRjHz9kxs7FsMTRrJnMhrIk0mczahQuFlBBNbrlBlAtxQcTV7IorJUq7kFL+JGqJYYaVYX+kJMzaWP5s7Oz4PvVZ/dKv9uf83rOdOk992ur3/t7zft/3eZ73eX6hUMpSlrKUjadFApwrR8wVhczbJwZdCwjH8W6GWCcqRJnI8pmzVdSLu6JjoghIE5Vin8gXMRH1mS/M2DDcE7Xiw3gKMDc5I0pxD6OLXf4sesRrUSX6xXoxWRQgZkCcFDfGQ0CRqBFzWEi3OIi/m3v88TmpPDFDbMXdshh/UZxLZBDnivMs3hb+QBwSnRD1ecdc66f4Kh4yJhtBy8Rv0ZyoTHVBPBENolzMGmPsrBV14pl4SvA7t42iUTwWu/DneFy2hM2wOa+LdJcuZKnyrMgULeKaaI9zQ74R+KvFdFzy1VgnSxvmeSXuYv58CRHxWj+ZqpV5t8Uz2XACKvjbyOKjAbllC/dCjOw2z4WAMMdsNkn8CjCubOHPScf2/xoXAnI85cFV0RtwcujxiMl3ISDP8zzXQXb7RCzE+K3ABWQyubnSSwcCBrjMYp6TDlRAl+d5qQMBVnYvQkCPKwFDY0oI5CDtB3OGKTcCF9BPrrYfmBLvjeljG6hUzZpc3QP3GVMeT6rzsWzyf4gq1pmAO54gW0wlGYQV0TPY6d6manUioJ0fsHHVYmEAfbTl/FPMY5tzxWUpEaLx+MvYE2LFCN/zM6ur9oiZ7H5dvMXhSHazl3axirshj79v2MHRuM12sYkNsHePi++J6MjeUlovpx9Yyi62EoSDwwRsKadX5mn0Izxr4FJz/l2ogYJuFUG9RCygy3rHyQwyZyE5vprn+1msXVgvPNVnNyfc5dNTO/usYgKOssihLxMxGpU+Fmm981RPoIYZd4xvRKcp1SOc7hFE9CZCQIhLbYvYyW7GPPEw+F9s2M7eEpdFmyd51HA6NvaL2M3t3JsIAV6bz0VnnxVnE+DdlAdNNEN+ed5c7LDYwTo+igPiPUKSwiwx7KVDa+FO2Dya6jQyzgKiNPTmZiuJnWnETxv3z4QWEGKRzSy6hOSQQVLoHC47RSaIK9lJPGLxxSSGYr7oDVAZJ4XZhtbiPu1clAUOehGnZou1764diKjHvZLKMrnFTcRNT+OTVJZOuZIRSlnKUpayCWv/AJXZyhAk2cauAAAAAElFTkSuQmCC',
    },
    {
        id: 4,
        title: 'Folder settings',
        type: 'folderSettings',
        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAACD0lEQVR4nO2ZPUscURSGH1ZJbecqibHwo7TQWEg0P2B/g/kB9lrZWegKulb+khBS7ELIYm2hCyG99mZZtdErF96BYZwv92vulXngsgxzDnPeOWfO/VgoKSl5d3wA6sAtYHKM/8Av4AuOcJQz8Oh4AL7iADcKaCOn/RRwLp+/wAQFYzTewiTwT37beCjA8l1+HTwVMAn8Bn7gqQBnMDEC2n12pkFHF2gBNV8FmNA4GERAUcwAu8CjYqr5JiBgTzHZcvJSQDW0bPFSwJviKgWMCFNmoGBMmYGCMWUGCsaUGSiYNvDH55k4Ny4IuFAM9q17KcAMEsc4BVSBn8ApUAGmgZ2IgB3ZVWTX0rUTAlqh59ly6SVsJ3uRbW3TFQGNSKB3wCGwCSzo90gbmbDdqSsCKsClnncFfEqwmwOuQ5myfk4IWAGe9OaTgg/4rEzcAx9dEXCiZ9myyUNd9vtpRkG92SONUfd5o2FrPQ/fIn7ttM5gz2NGRbTLLOX0W47xfUVNNx51HjPL8Ime9G31mYHEtdHBCI4G49J9pnu2VebhWPa2/WZSUzl1hyQg7m2tA8/qQrZVpjGvWKz9Ko5Q0R8iRn3etsqk4AO7TtY8ME4akSx11SrtN7Gomj+OqYLUmXicNENBdVQeceX3HMpA5lponFT1nQWr0bWYrDRU88FqtJm1GnUB48i+pG+CeSJzD/wCE/trU3hcxfsAAAAASUVORK5CYII=',
    },
    {
        id: 5,
        title: 'Settings',
        type: 'settings',
        icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAACXBIWXMAAAsTAAALEwEAmpwYAAACTklEQVR4nO2Yz0tUURTHP4W0aSDKIKulIkn9C/0H5UKL3OYiwzExKVvpplWumtG2KW7TVbgQplobRNDGWQZC0yKhH6Il2sSB78Dl8d59943PUcgvXHicc773HOaee865A8f4j1AAeoEpYEbLvm9K11LcAf4A9YRluoFWBXMKWJfjXeADsKRl33vSrcv2wHFXDneAzhh9p3RmM5i38/PANPAUGNUxrMnZnIc3J5s1cUa1h+3V3mwwZ4D3CTnyF7jq4V5xji66PgJnswZzEnjnJGgF+ATUgN9AKWCPkmxr4laci/BGPoIxLuIe0Ed+6Neva3uPhZKshmyI9Jz8UdLe30Lr1X0Rfgac9WXgAVDWGgEupXDOAb/k415IQK9l/DLF7gmwHZO0JptI4c7L1nx5cQL4IWNrA0l47ATwBXilVXPkZpOEKdl8JwALMt4EumP0Hbo9ZrMInHZ0Bckav5TZRtGtvevyFVR/PouwCrRF9EXpNmQbx29ciuGIrk171uUjjh+L6+pTdQXg4oXkyx7+smxmI/IRpweaDw47oGIzAR25I1sISOptJ6kLnqS+kEdSZ732XxXEor4b8kcB19585VYYJ4CtmMK4lVKDMhVGw1CG1nFReVJWjxqWzIf2rK2joMZnhJAxIytmsjZXw0NnELuVYzC3mxk/0PD01jOg2RGloewZ0CpZB7SQEfaah9uT9wjrJuB0jkP+s/0M+Ulwn0FdMfqug3wGpT0U7eiqwIpW1Unalj0Uj9xTugGrITeASefPhknJWv5nwzE4LPwD0igM5/Pu1YcAAAAASUVORK5CYII=',
    },
];
export const contextMenuItems = {
    default: [
        {
            id: 1,
            data: 'newBookmark',
            title: 'New Bookmark',
            icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAACIklEQVR4nO2ZO08cMRDHf6m5pAMBScWrBNISJEDQwccBigMq+BCBKKkDUTpKjmcBFDSJeH0DDkEeQJHOaKQ5yTpt7vbh9S6S/9JIq7NvZn7rsb3rhaAgb5oDasATYDLYGdCFZ61lTLrZfvqEmNOg/4B5oCeDr0IgdjWgJJ9VdvLeIB41WLdDgE7gh15fZhzV2EFd+/IGkReAyAtEngBeIPIGyB3CJcBf9fUuoq0rr9XJJcB39bXtE8I4BBgC7hLs2CdlAxC9BTatcjItbKeMAN5lAkA6nQLHvOARMK7iBoCUMmEEVKGEUsqEElKFEkopE0pIFUoogSaBL8CFdePk+jMwQYlHYAg4iPF+sA8Mlg1gHPitMW6AKjACdKiNAkvaJn1+AWNlAegH/qj/r0ClRd/X+iZnFLivDABHVvKvYvSXPltWORUKMGOVTSXBC42MRF3/O1UkwCf1W00Rd1nb1osEuFa/wynijmrbVZEAjWP7SsSciDJps8vIqI+2etDOrg9dG37jAhxGAIiPtqpp5wXHADL8WUtIdum2mrW+kS0CvbjRhvqVTSopwIq2fYwbbDXBeaaJWcfT1jIqJdGso6ayaegNcJtkGbVHomZNvjTWnNCe/r6ZYCP75vLcNKsGgHtNaOs/I2Hf+Ubyd0keJfLWuAVR103qva5OFb1escpGkv9AyTRgfY9uZVI2pbnzUZKJLY8HsjzKXBM719UmcsI+AwNdauL73JsIAAAAAElFTkSuQmCC'
        },
        {
            id: 2,
            data: 'newFolder',
            title: 'New Folder',
            icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAACEElEQVR4nO2ZPUtcURCGH1HSuJGUMWAji2ViioBECYRgtb/B/AtTaKxs9A+EfPwBP1oLCzXRLcTGziD2SjaYBFTQ7sjAe+GwuWvurm7OuXIeGFjunNmd98zc2btnIZFI3DseAIvACeAK2BmwDrwgEhYKJt5sl8AEEXCshF4WXP8I+KCYQ6CXwDhZO/QBR4qbooQCjLeKO6CkAvqAb8AaJRUQDS5HQL3DyXRbOwc2gVpZBTjP5m8jIBSDwDRwpZxqZROQ8U45WTuVUsBj77GllALayisJ6BIuVSAwLlUgMC5VIDAuVSAwLlUgMK4MFZgEvuh45kJ2qGtRCxgBtgv+MhuOTcAr4Lc+8wcwAzwD+mWjwKx8tqYBjMUiYMRLfgmo3LD2IbCstRYzFIOAbS/5ngLrbc2KYrZCC7AbNmubvJ3fA3ZbVKKh2LGQArLJYj3fbh7v5bP3+IszOe1Io5vYeLTPedqBgFH59vOcm3LaeUw3yTaqUvAAzXx+G9m1P3lvXJPzSucxTyIRsJMjoOUxy3yXjgfrd9xC32/aoZra6fwOBfi7+FnXZjsQMCffRwLyxhuj1hLN1JsEZwwAPxX7msB8VSLLbXyRrSpmgwioAr+U0EqLSvg7nyV/WuSh7n8x4Ylo6EvquaZTRa/nvLax5MeJjKqebf41BKxtotn5POzG/qTxaNPPzP71tGmTe8NeA3HRcf9aMTFTAAAAAElFTkSuQmCC',
        },
        {
            id: 3,
            data: 'paste',
            title: 'Paste',
            icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAACXBIWXMAAAsTAAALEwEAmpwYAAABFklEQVR4nO2XPW7CQBCFv4YI6MIx4EgBUQWOwc8NKKMoBdAnaSk4A9RQwyWQAI00K1nWwuAFEymaTxrJ9qzfPj1v4YH7aABfwB7YAZ/AK3/EC7AGTrlaae/pdDMmJlrh/r3MjVtAB+jlaqGbbzJrt/psGVnfUa1kJPZ55JPk66BpdfXaWj8DKimGRjeIp9YwxVCI/xuoRfofVzaUXh7R+NG+aBfmqC/3L/THVwxJujH62hftwgRxOZAxqkA7cnjftBejl9F9uKEU3JCFJ2ThCVl4QhaekIUnZOEJWXhCFp5QqQlZP/kp3PWTH8YgGV3qDzAjGr+RafdmZJgra1AcpBiScXdWgplp6igdaF6Yv4pWW7Wc/8UZu9f6h4r9DL0AAAAASUVORK5CYII=',
        },
        {
            id: 4,
            data: 'search',
            title: 'Search',
            icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAADdUlEQVRo3u2YX2jNYRjHz9kxs7FsMTRrJnMhrIk0mczahQuFlBBNbrlBlAtxQcTV7IorJUq7kFL+JGqJYYaVYX+kJMzaWP5s7Oz4PvVZ/dKv9uf83rOdOk992ur3/t7zft/3eZ73eX6hUMpSlrKUjadFApwrR8wVhczbJwZdCwjH8W6GWCcqRJnI8pmzVdSLu6JjoghIE5Vin8gXMRH1mS/M2DDcE7Xiw3gKMDc5I0pxD6OLXf4sesRrUSX6xXoxWRQgZkCcFDfGQ0CRqBFzWEi3OIi/m3v88TmpPDFDbMXdshh/UZxLZBDnivMs3hb+QBwSnRD1ecdc66f4Kh4yJhtBy8Rv0ZyoTHVBPBENolzMGmPsrBV14pl4SvA7t42iUTwWu/DneFy2hM2wOa+LdJcuZKnyrMgULeKaaI9zQ74R+KvFdFzy1VgnSxvmeSXuYv58CRHxWj+ZqpV5t8Uz2XACKvjbyOKjAbllC/dCjOw2z4WAMMdsNkn8CjCubOHPScf2/xoXAnI85cFV0RtwcujxiMl3ISDP8zzXQXb7RCzE+K3ABWQyubnSSwcCBrjMYp6TDlRAl+d5qQMBVnYvQkCPKwFDY0oI5CDtB3OGKTcCF9BPrrYfmBLvjeljG6hUzZpc3QP3GVMeT6rzsWzyf4gq1pmAO54gW0wlGYQV0TPY6d6manUioJ0fsHHVYmEAfbTl/FPMY5tzxWUpEaLx+MvYE2LFCN/zM6ur9oiZ7H5dvMXhSHazl3axirshj79v2MHRuM12sYkNsHePi++J6MjeUlovpx9Yyi62EoSDwwRsKadX5mn0Izxr4FJz/l2ogYJuFUG9RCygy3rHyQwyZyE5vprn+1msXVgvPNVnNyfc5dNTO/usYgKOssihLxMxGpU+Fmm981RPoIYZd4xvRKcp1SOc7hFE9CZCQIhLbYvYyW7GPPEw+F9s2M7eEpdFmyd51HA6NvaL2M3t3JsIAV6bz0VnnxVnE+DdlAdNNEN+ed5c7LDYwTo+igPiPUKSwiwx7KVDa+FO2Dya6jQyzgKiNPTmZiuJnWnETxv3z4QWEGKRzSy6hOSQQVLoHC47RSaIK9lJPGLxxSSGYr7oDVAZJ4XZhtbiPu1clAUOehGnZou1764diKjHvZLKMrnFTcRNT+OTVJZOuZIRSlnKUpayCWv/AJXZyhAk2cauAAAAAElFTkSuQmCC',
        },
        {
            id: 5,
            data: 'folderSettings',
            title: 'Folder Settings',
            icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAACD0lEQVR4nO2ZPUscURSGH1ZJbecqibHwo7TQWEg0P2B/g/kB9lrZWegKulb+khBS7ELIYm2hCyG99mZZtdErF96BYZwv92vulXngsgxzDnPeOWfO/VgoKSl5d3wA6sAtYHKM/8Av4AuOcJQz8Oh4AL7iADcKaCOn/RRwLp+/wAQFYzTewiTwT37beCjA8l1+HTwVMAn8Bn7gqQBnMDEC2n12pkFHF2gBNV8FmNA4GERAUcwAu8CjYqr5JiBgTzHZcvJSQDW0bPFSwJviKgWMCFNmoGBMmYGCMWUGCsaUGSiYNvDH55k4Ny4IuFAM9q17KcAMEsc4BVSBn8ApUAGmgZ2IgB3ZVWTX0rUTAlqh59ly6SVsJ3uRbW3TFQGNSKB3wCGwCSzo90gbmbDdqSsCKsClnncFfEqwmwOuQ5myfk4IWAGe9OaTgg/4rEzcAx9dEXCiZ9myyUNd9vtpRkG92SONUfd5o2FrPQ/fIn7ttM5gz2NGRbTLLOX0W47xfUVNNx51HjPL8Ime9G31mYHEtdHBCI4G49J9pnu2VebhWPa2/WZSUzl1hyQg7m2tA8/qQrZVpjGvWKz9Ko5Q0R8iRn3etsqk4AO7TtY8ME4akSx11SrtN7Gomj+OqYLUmXicNENBdVQeceX3HMpA5lponFT1nQWr0bWYrDRU88FqtJm1GnUB48i+pG+CeSJzD/wCE/trU3hcxfsAAAAASUVORK5CYII=',
        },
    ],
    bookmark: [
        {
            id: 1,
            data: 'edit',
            title: 'Edit',
            icon: {
                bookmark: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAB70lEQVR4nO2Zu0oDQRSGPxAJBEFQErzVWRA7n0BbbfVJ1BeIWGhn5yMo2FkmwUuhghDQQlCxSoxFGi+F3cjACQxLotnNzLiR+eGQZCac+b/Mmd3NDAQFBfWrVaAKfAIqZbSAfWAcz9oewHS3uAOKPn95PegXsAFMp8wz8lcQNRlQmx9UpnlvEB8y2JRFgAJwK+/vB5jVRIPazuUNwhWAlhcIlwBeIFwDOIewCfAmuea69BVdXZ1sAhxLrhOfEMoiQAloJ7hjX2UNQGsWODTKSf0QlSwCeJcKAOl0DVwyxDOgbI0bAFJKhRkQhRJKKRVKSBRKKKXUfyqhSWAHOAI2gVzaRD6lJCKgEXtKvQEmkibyLSXRlNdTYA14MCBywwCgZE82L+0zBsRGVgGiHuY7Wpc+/ccocwCRUTbdzOelnHR/OWsAUR/mq9Lf6Hch+wIoGebPgLEu5ivS/wrM95vYB0DJlXkfACWX5l0DRIb52i8135TvJ9a7JHCxc1yPHXroPVKr5jGS6GcQm1qQvO3YdmLBpnmtFeOMbEvuhDYPDg/EtAlRs2W+o3KC/cxecRHL+Sjty/LZhLBq3pyJqnFmljTOjVyL0vYCjAJLMhNtV+Zta9cw2oqB1rNuXus5ZvpRylQv7KGQXqRPwJ6UU2p9A6eAVsbuFoH/AAAAAElFTkSuQmCC',
                folder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACQAAAAkCAYAAADhAJiYAAAACXBIWXMAAAsTAAALEwEAmpwYAAABh0lEQVR4nO3XMUvDQBjG8T8VBwcVB6soruLgUCxCBgcFcROcdBD8BILi2EHr5iS4Obvp4OAnqAjiJl0EO1XURUEqQtFBIwdPIYiNaZpeguSBg/YSer/c2yN3kOYfZAiYA+abtCmgyxZmFfgA3D/aLTBhA/QAXAILPjO0BjwD10Cm0yDz9MUA963o3uWkgDJAGThKCshkAOjFImgcqAf4g4dp78A5kGsF1AMUgL0OtAOgqhWdi6pk7aZfqFJSQCb7Kl9iQEWN2TQpiHSG/JPOUNAZGkzCKnOAJ435BizGCXKAV6ACLAFXeo3MxAFyPJgRz2vkDjizDXJ+waDPpnwnNkGOD6aia5O2QHngRQOPevqHgRthDBgboHxYjMkXsBshZloD1n5gvGVqijF5BE4jBJW033G192kJY7KjWdoE+trEmIE/gW1hDOqwFYxJN3Dcxua9rsOByYb6Gt8bvxsY481syA1+QYcDdAK+V19ZmFoYTBQZU+ldle0CWAeyxJSsFseWcGmIKt+yab98TkXZ9QAAAABJRU5ErkJggg=='
            },
        },
        {
            id: 2,
            data: 'cut',
            title: 'Cut',
            icon: {
                bookmark: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAADX0lEQVRo3u2ZS2gTURSGZ2pNxFd9YKzWnVAQlPpA8LGyLopUiiItaNuVCxFUKMZKN4oPIuJb3Llzp+BCqKJgRVHwgVRrEUXq+xWjrfYRFRX0P+QPXsJkkkzuTBKYCx82k5t7zz/n3HvOvRqG3/zmt2zbatAFRsBfh3wEJ0GF18bvz8NoK3pByMs3L5P+BGEww+E4owol4honDGsYSzXeMxHDnKxSo4Bp4BH/fpKHV3OaVPdYnolwS4BnItwU4IkItwW4LkKngEGONcviu5Bbu5NOAec5VqeXInQKqAZfcsjYdzINWOZxSfIM1IBzYCiL/iPF5gHtrcwo8VbMAu6C26UcQlnN64eQL8AX4AvwBRSNgDGgFTwHT8EK3kQUvGWTUCaDDvCBZfANijgCxjucNwIOeyVgFXgD5vCzCRbRGx0O5pTfjwUB5XMStY82ATeNxP1RatsO3mc5mYTcBvCVpbac3r6B7zxDvHZTgFw9RkFdyvO9PONmmmwNeEnDoxTTDGp5JugHLRZeMnUJWAhegFfgKA3aYyQucxttftdIw/poZLPy3QnwicfQ2RbGa69Gl4ADfIMxTr7Upn8dS2Yxvls5I88ED8BnsNliJzNzeftOyun14EJ5Yhd6zO01NVxauDb62V/9Tn53H8xNs7hNtzyQ2g7RmAGwgM/kbW7h7nQdVPH5JIbfD9DOHchIEzaue0BtckF1z0hcEIvBZ8Fv0JQSSj3gIdhWsJORTTtDEVGO08DnE8FBLnRZM8edLFBdAkLMxhUMk6SL53Mxb+WC7KGxEeaNW2A5uMgsHnHDA0MUYHdfWcXFOpqfg+AS367cwk1V+q7l4v0DVir9JWP/AsfY38x1v0/XuihgRwYPBGhINRevxP2VNAZUsl6K0SsB9lnMTJxMZqbiUcet3vj/f2Tt3KetWpDFV5z9Y4x306beWUeDJVvX8Nk4ZvY4Q2qKjjDaZ1jfXYY5gYTPadYvbSwBrtILm2wWpzybzmQmfS8rYbiMNdBbeibvVs9wGlYEnAITmJjkjc9TzhlBemwwzbnDtEhwA1z0rczsDQxH8f5ON88MMvE7i+e7uAmYGUpn1RudLDHiDK1e/ht1U0ATy91aLjrJpLu522wshaNpOQu5PpYJ3dxC2zIcK/PeIv8Bxi4zB7OgwHcAAAAASUVORK5CYII=',
                folder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAADu0lEQVRo3u2ZWUhUYRTH51q5lJltlBlmC4GVFoZUVkIZbdMCBVlJST5GRIv60ENI0gYR0kMEWfRaPbRSUkxFESijUVG0R0T7ntNiZUz/U/8LH8Md587MdcYb98AP5d773XvO951zvvOdcbkcccSR/04SwU7wAvhN0ALqQUFnMWCHScUD+Q6mdAYDnlOhQpPPp4O9HHMXdIm3AfqMhiNdwX2OW2FHA0RWctxtuxogq3AJnLarAXGRBJPPXYkwM0WLD3iAO9oViJcBKjV2dKEMUAlaqZPbrjFQRZ08djVgoFK22DYLGeqV4LK5OAY4BjgGOAb8lVSwnaW0HGrugAZQ2gGTpFm9DyTwDP0JbAQTQDGoA59BRayr5HAN6A++GSiq8Xz9CoyLQOEkkMb3yAqPBMP5txvobZUBg/n8UoN7OaCNp7VwZDq4CD6An+AH+Kro9hYss8qAJJ7EGlmzqFLMjy8y+a4+YBtd7wwN6QV6glVczZtgNts/ltVC4vcPwQ2wnMs8H9wCF6hYKJkELnN214BkXk9jjL0DB8Cgjirm8sA5ZbwE9X4wJMS4FJbLeoMsT7knrR0veBmOG0ZTjcqsredSy2pMDPH8WLrKax5cUpRZr+CsnwejYn2oz+eHxZC17FgEdjDETaSJdhVMVvJ7Djsbktk2MwPFpSshH95C1zjJWZTAywbHeH0rA1SXMhp9DRR1lrbKNNAEnoI93K2bmGHUs6/Ey0dQC/qZ2IW1WJ7I0qmYn66Rr9ybRaMegcVWlBVWGiA75kIqKSXHPM7+PWaVavAeHGa2ku72LjDMRM0T9H4LDciwoCWyTwlGTblexw3OTyN0mQoeuP41ihdE+mEPX1wZhfIzwXXwGJQEeaaEriMBO1eZ1UxwkL2gWtZaWpAZN1wFNw1o5QYTaucbqryoLws4H10lN8TYLHCINc9uKqu7XikDv5muZSqAdalxmWv3Sf4ezTFFVFqu/wJvwBEwJkQWkR9Eypk+G5X0qXFsPQ3cYLCftCtuupOvHQOq+OwMKuBhwGYpAetVijwjA/S/sk+cYtVZzd1YP29UcLc+DkZYfapL5szJy3sE3CtkObzEZDbpDtZR2QaOy2ZclLEmekL3SjXjSmZkAFfDKGvk8jwQ7s9O48FR1kL6arcFnAdKXeH6VBBp5YcKWDKoK7MaPKMbBZt9v8H/zTwgZRqsqjzzmzFmWWNgE/jC4Jdddg44QcPKTWxImkF8aAb3NKvcJlASGWhebkTSlTjLgI6066B1pMKxlHYN+AOZgFwqNXIK2gAAAABJRU5ErkJggg==',
            },
        },
        {
            id: 3,
            data: 'copy',
            title: 'Copy',
            icon: {
                bookmark: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAEEUlEQVRo3u2ZfWiNURzHn+fObK4JG7J5WciUyGvbSBRSsvKH8oc2/qGMSZj5w2ZpW9pf8pZ/JCHxjyYx0SbykvJSzFs0lpiRhtm7e6/vyfdpx+m5232e+zzPrtqpT/fuPveec77nnN/bmaYNtIE20CJtOaAG/AIhmzSCw2C415Mvj2LSZjwDY7xceTFoBygEqTb7iesvEbUcsNCBvuTJeyaihYONdVDAaPCU719GsauWBnW6L89EOClgEUhQ7CIF+MBQ4rmAEWArqAPdFr3Rb/Ac7ABJQLc6OT1CAeG+K/x5BcgH70EzCFoYPxHM5PtDoAx883IHttDI74FsCwtmvI5j30G+HgBDLCxu1AJeg1aw1MKO69LkprDvR+Aa35crduKqgABoA34LAnzS34aAE2AqhRgiBnkhIEQB8TbtzhBwlp/PYnATR2q/lwIG2+xbFmC02dLRLPkfBWjcibfgOyiNZQGTQCe4bHIMM8E7Pt8VjU24KUCkE9WsMfbSkA0yQAHdtAiQ2+yO46aAOLpgYbhdfUTtJjBd7cAxV2WzBZiurwUbQbqJtzIWr4mRPqZ2IOrmi+EaXK6bs0Cx3Zqkv3ZATq2LOVZWf+yAmMgKcBy8kRbkC6gC68AEk98FTWzV57URTwQ7wXZeCjyhxxF1QDKYB1aD26wJHodZ3JDy6skRGgUu8DtignkgTXouCphlTOS6WFYukJ6PlESUsp9sLwWU8fkVBiajbQaV0m9EJruHIm5Jx0neAc8FzGBl9QJMVp7d5++SlcrsKD/fxM/ipVgQVoBbRpzHouQMqFeetZp8v4MJXQNtQpPq636JAys5qapeauxuJeLW0YjnWqnZ3RKQzjRBrP5iHieDJfxOA//+Ck4xoWuUgpUeyQ645Ublm4xOrrauTCpIkV2cvK6seCgSEW4JqGcMECnxAyUFuAGW0zM1K6mDcLOfYyEXus7rkZxexkxUPhep8hwW9lqYwOXzSsBp0A5yTdyoXzFiQ0wud626l36Dds+zlTiQRBdawedXwTQWL35ehpkFsm4GsvEm43gayIzaVlzanud37oD1StI2jLZwkob8Svt7+atZERCJEbdwsFS6uUg9kHCRReAjE7r5TOYa6X2SuTPievEmr1DuunGeazip3TbrAT9X+hjvewL8nfA2F8GGMMfGsSO0Suv5H1mRklHauZnrq8g3OyH7ohEgZ5YGBRTSTgEpJhPxKcFJlzxfEifn56uu2IauiKnkuJl23WgJfXoto2YGO3zII5FjctsQlAT7SAIn187XNhY3Ie5iHJM9H/uIp+Fn0qZ+upG0fQIfeJbTGFGdQBj5QnCO6chBred/B462fHqWTmXVnUDEhh/gEq8hXWtreJy6HJx8gDt7RMlQ/2l/AOoXpGolyZVNAAAAAElFTkSuQmCC',
                folder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAAD70lEQVRo3u2ZWWxMURjH53ZaVVQpUSolEQ9E7FuChBASmkjsD7WEB2p5o16IhD4gxPLAg0iaWOJFaESEyAQhllASNGmIRC0tLa1q6Sg6/l/yv9zc3HvnzF2mHemX/DKTOWfmft/5lvOdM6FQl3RJl/x30g3sBzUgpsBXcBVM7iwG7FNU3EwrmNEZDHhPhaYpzu8DjvM7VSDc0QboK5qIpIMX/N6qVDRAZDW/V5mqBogXboLLqWpAh0ia4rzbLiuTV5pBBBR69UBHGWCkNBVDaBAoAVHqVOinAePAecXVEw/O9WDIdv5OxDyg2RhgN2YUqTZTwTnwxmFeHlgKvoBF4LULAwaCWuZEb7880AYaQDbIcqAX2MTf3MFyG2h1VJ0ocz4pPnwIuEJP5bk0YBuYHoQBqr3PbHAQ9HBpQIaV97zkgMz7zBX9DSZwhbQ4+47bKtfOkH0IXgbhgZ18iB1i5K84c+LxA1SA5UF4YDBjPciD1liwBfQERey9kpYDXkUWNBPMB/XgVrKT2E9PVLGMKzdzfoic3Nbw/FzPI2g1OMPkV9WljbmUkSwPSOmbCR6B77wEaOLO3MTdVShnbKc5hJCel8+ddPTTAFF+CRWVuRfBApDLsQKwFtwH38Bd9lhOeZBUAyaCjwyZYlOXOZ6tRoibm1wM/GTDluugfNIMyGa8S7xuNo0d4veN1zBiRJmhZ1IyIMgkXsxVlvA4ZhprtVBK8uMou845cUIo4SOlGyli63vCYizK12bT5+/ABTDGQlnLyEgP0ABJxu6sPjls5HQl9GvI3eAD39eBPeAZ2299xRPum/zKgRbOGQryFU5tNVR4pcLz/+ZAkB6oo/JymnrMbjVMJTeyfBZzTM8L8dgA9lbKl1FByQ2wDMwDD8ATw9hCvj5liOkrXsDKVG2RvDEv90JupIxe2AD6m8bChteY4f1oGlehUoHsDGg2bDZe5A64ROUPM5F1kZ35LXdfXfmRTGq9rdBM7YNmoa9lBEW4KiU+7MR9wXWWzdNgFHdZzdBZynliFsNM+qQDVFRTSGJLAwo5GOV9TL7HZm4480GfL+V0Bfv6deBU6N8/PUfoKc0UNprJA7oBtilQ6lDurnBl7QwwPzTMVd4L7oFGi/J5Daw3tMiajRFKvZDRExHGpPGBW7nDNtCAApu2VzM9NI0XW+XcvCT+X3GnnmKI6XSL3zFKDg/1LV6rzEl2mruYqJoPlUtzWAxZgH48EzcypzztA/Jn4DB2juKFykQ2oDhGxCzei64jmD81rGyeRarKWSZ8exKIstmbpHvLD7dn80oly6cVz+S519yTxXgvVMt9pFP9i6Q5fKYp3lOlpvwBCdK+KCuh8T0AAAAASUVORK5CYII=',
            },
        },
        {
            id: 4,
            data: 'delete',
            title: 'Delete',
            icon: {
                bookmark: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAACVklEQVR4nO2Zu24VMRCGP+psUoRDRAgVhJQktBAJIujIu3AIlwJIBQ/BRVCTIDpKDtcCKGhA3N6AoHBPkc5opFlptFrt2YvXu0j+JUuWPWfGv2c83jOGiIhgWAVGwA7gGrS3wAyBcaPhorPtfUgSq2p0F7gIzDbQ1QmJJ2pQFt8UdvHBSPxVY/s9EtgHvNP+p4ZeLW3Ut65gJNoiIAhCok0CQUi0TaB1Ej4J/FZdB3PmZtrKTj4JPFRdj0KScB4JLADbFW7s130jIJgDNkw4uYL2uI8EgsNFAvXwBnjFf+wB58tuJFATLnpAEUOoJlwMIUUMoZpwMYQUMYQq4BRwD/hoNk76d4GT9NgDC8DzEv8PngFH+kZgGfipNr4CV4BFYELbEnBV50TmB3C8LwQOA79U/30gKZCd1H9yTgkf6gOBl2bxe0rIi8ymCadOCZwxYZPu/DSwBgyMnPQv6FzqiS397UqXBO6oXon5FMNMScWWWc4ZuWs6dqtLAl9U71EztjdTF7J9mUuxpOOfuySQPlUlBWXGtNSYLe0nOiel/7H4o8KzLb07JCUIZG1P6ZzUlsZipMKX8AtxfzaEBgUhNMgJIbmlx+KseSO7DBzwROC26pVLKsVawSE+b+TWdexmWWPXK9Qzi5rk/RSnTRqV1Iju8jAnjQ7NIZbw+VYljVpPjEzs1mkvMjqf6vhGhYvsgc+6aVPMA991QZvGE3mYMovfrvIp0TaWDYktvaSOaXZKtL9uwkYWf4KeYd68R48rt/dm5/MgB1s+DyQ9ylmT9kGzTe6B/QfAK28kGTqw4AAAAABJRU5ErkJggg==',
                folder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAACXBIWXMAAAsTAAALEwEAmpwYAAACPElEQVR4nO2Zz2oUQRDGf2LwYhJEF1HBi4QcTTwIQYMg4mmfQV8ha0QPmpxy0RcQ/7yAiVcPHowavXtZlODd4Ip/YCOYW0vBN1Cs4zhrXLtH+oOCobqqp76u6urZXsjIyPjvsA+4DWwBoYb0gSfAaRLBrZqBD8p3YJ4E8F4BnalpfwC4I59NYC+RESTDYAx4J79LNJCA4bL83tBQAmPAC+AxDSWQDEIJgVd/2Jl2K9vAOtBuKoHgZGU3BGLhKHAN2FFM7aYRKHBdMVk5NZLAEffZ0kgCQ8WVCYwIIWcgMkLOQGSEnIHICDkDkRFyBiIjNCEDF4EHup75JtmULmkC08BGzV9mJ1IjcA74ond+AG4AM8B+ySxwU2Nm0wPmUiEw7YJ/CIxX2E4Aq7I1n+MpENhwwe+pYW82a/J5FpuAbdiibIqVPwgsAi1nZ89XNVZkoiffuZgEis5iNV+gI10XOCzpSrfg7Jakszl+Ql+DdqUxSlh7tPecdLpDLuDuwLONFZiV/nXZxOsatPuYUaJYqMGN61fdZ8NjQmNfyyZua3BH9zHHEibQ/9XkKyO6HrQryqoSalWUUKukhN5WrVBb5bT9Fwm8dPPfl84OqQKLFZv4irNblu4uEXHBtVErCbTKnZI22nGbeBL4KN/zRMZzBbI6xEH2SD5PSQBTwGcFtOYyUYZJF/ynOh91/wrzjkRPh9QpdadxPS+7srHgz5IYpvRt87smYGWTzMqXwTb2PbVH634m9q+ndZvSDfsD7gl2N7p2F+kAAAAASUVORK5CYII=',
            },
        },
        {
            id: 5,
            data: 'copyTitle',
            title: 'Copy Title',
            icon: {
                bookmark: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYEAYAAACw5+G7AAAACXBIWXMAAAsTAAALEwEAmpwYAAACQklEQVRYw+1XO0jEQBA1d7kk91GjB/F3tYiFjdgoInYeoliIoBbWVlYiVhZ2grWdIigInliLiIV2NiJoJQh3x6Gg4hfPzxmLeVtsSC4mxNXCaV52JrvZmX0zma2o+Jc/Kf39hPk8oWmKwYODgBzI5QinpggTCd4uSYSyTBiPE4ZCvJ6Nw2F+Xm0tYSxGGIkQqmpADrCIBLbgj0movPnz00Ktwd+hFmNEOu3xBJyoNTsrNs4TE4TZrEcHQt90zJoDmgaMguPrhMltPqcUhTCV4sds/ncD6/ii0ll+gci5mBOoqXFywCUH5FR5+8ekGAdeX30m8cuYvV5CWdQNUOIC5RF25YSw/sgysRHIKPTAFgS02n/v7c0xxC5F6pGwZDXsEtyyyLBqhQ/FewkLA4TVK9ggTrTYAezGd0ANDYFQdcK7O5/lnHEtVrTXSz38D8vKzegVknMZG12wlEf8IE1EJrKI8ROouYPxJWHdhc8k1mccqlMGDiAypQ3+vQa0ImYl1mmx34B5hg2OYwz9/jTh8x5OoM1nEheLDg7O4WELywxbkm4UD+C43M7bDVDExMmUWMTvCbdBzZYlTFjySSE3ffjYXp9M8hTR5jEuICdi9vPeN5FKKBIGyrTW7JNCrvobMWW0qsojhQ4P+S7RSaQhMQ7IcsBdKhM1K8YB1qJ4TmI3CQtqJXQ9qIsO2ujVNV6fwEkoKt+MJbrwP0ESNo3wvQ270BgGT1kWcWbPZDx2o06SPiW8VsTeB9jG+/r+r/t/Tb4AYSb4bawD/T4AAAAASUVORK5CYII=',
                folder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYEAYAAACw5+G7AAAACXBIWXMAAAsTAAALEwEAmpwYAAACQklEQVRYw+1XO0jEQBA1d7kk91GjB/F3tYiFjdgoInYeoliIoBbWVlYiVhZ2grWdIigInliLiIV2NiJoJQh3x6Gg4hfPzxmLeVtsSC4mxNXCaV52JrvZmX0zma2o+Jc/Kf39hPk8oWmKwYODgBzI5QinpggTCd4uSYSyTBiPE4ZCvJ6Nw2F+Xm0tYSxGGIkQqmpADrCIBLbgj0movPnz00Ktwd+hFmNEOu3xBJyoNTsrNs4TE4TZrEcHQt90zJoDmgaMguPrhMltPqcUhTCV4sds/ncD6/ii0ll+gci5mBOoqXFywCUH5FR5+8ekGAdeX30m8cuYvV5CWdQNUOIC5RF25YSw/sgysRHIKPTAFgS02n/v7c0xxC5F6pGwZDXsEtyyyLBqhQ/FewkLA4TVK9ggTrTYAezGd0ANDYFQdcK7O5/lnHEtVrTXSz38D8vKzegVknMZG12wlEf8IE1EJrKI8ROouYPxJWHdhc8k1mccqlMGDiAypQ3+vQa0ImYl1mmx34B5hg2OYwz9/jTh8x5OoM1nEheLDg7O4WELywxbkm4UD+C43M7bDVDExMmUWMTvCbdBzZYlTFjySSE3ffjYXp9M8hTR5jEuICdi9vPeN5FKKBIGyrTW7JNCrvobMWW0qsojhQ4P+S7RSaQhMQ7IcsBdKhM1K8YB1qJ4TmI3CQtqJXQ9qIsO2ujVNV6fwEkoKt+MJbrwP0ESNo3wvQ270BgGT1kWcWbPZDx2o06SPiW8VsTeB9jG+/r+r/t/Tb4AYSb4bawD/T4AAAAASUVORK5CYII=',
            },
        },
        {
            id: 6,
            data: 'copyUrl',
            title: 'Copy URL',
            icon: {
                bookmark: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYEAYAAACw5+G7AAAACXBIWXMAAAsTAAALEwEAmpwYAAACD0lEQVRYw+2XMU/CUBDHoS0tAiGAyKAMDkYHwuigDuKAgRBNGHTUGAdHJ2P4FvoRDLqRqKub0TjorO7o4GBCQjCKIjjc3XCVUl5tKwO3/PKufW3v3f/uvXo8QxtIKxSAz8/ATscdXl3ZFMDTE3B3FxgK8eteL1BRgMEgUJK4n8ayzOfFYsBAAOjzATXNpgBoRWx7oGMm9b7cbuuktfo/0iJF5POCGTCSVqnk7jpvbgKrVcEApD4D09eA348cQY2fAEdPeU2pKjCZ5GOa3+/CGt6ozvd+AL3QaYtGjQIwqQElaU1qdluzabELec8MpIWBL13yMdniIm+P6TQwk+Fjaqt0H837tZCKRQnJ5e5+0qh+TNZqYeoxsIsc3r+A3W0MePMIjMf5PKMaE5aQtva31Mu4YWVXgNszwL0N4Ny5WA0ISyiy318GaEclSXx/85XtvAO/DrmmU6n+MhCJGGVA6R3Ix0d3/+cnEj+gWAQ2GuifBdZqOAED3roDHqDmy+hf1h1RJif5++p1ixkw8xcxgPYb8GUKJZPV7ei33D8+jpna4R/cugG+IxsPPMPCRWzmp+Jy2sJhwSK+vubtzbb+bNEUxeZTqtsZoH1GuI2aGRWd00Zd6O8/OniMPjrm/incYVWNt9kQblyBaeDEOu/rVJyJBJcsrThdr1QET6NGlr8Hvqru/g/Qh+dyw9/9QbMffBLnD64ZaMcAAAAASUVORK5CYII=',
                folder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYEAYAAACw5+G7AAAACXBIWXMAAAsTAAALEwEAmpwYAAACD0lEQVRYw+2XMU/CUBDHoS0tAiGAyKAMDkYHwuigDuKAgRBNGHTUGAdHJ2P4FvoRDLqRqKub0TjorO7o4GBCQjCKIjjc3XCVUl5tKwO3/PKufW3v3f/uvXo8QxtIKxSAz8/ATscdXl3ZFMDTE3B3FxgK8eteL1BRgMEgUJK4n8ayzOfFYsBAAOjzATXNpgBoRWx7oGMm9b7cbuuktfo/0iJF5POCGTCSVqnk7jpvbgKrVcEApD4D09eA348cQY2fAEdPeU2pKjCZ5GOa3+/CGt6ozvd+AL3QaYtGjQIwqQElaU1qdluzabELec8MpIWBL13yMdniIm+P6TQwk+Fjaqt0H837tZCKRQnJ5e5+0qh+TNZqYeoxsIsc3r+A3W0MePMIjMf5PKMaE5aQtva31Mu4YWVXgNszwL0N4Ny5WA0ISyiy318GaEclSXx/85XtvAO/DrmmU6n+MhCJGGVA6R3Ix0d3/+cnEj+gWAQ2GuifBdZqOAED3roDHqDmy+hf1h1RJif5++p1ixkw8xcxgPYb8GUKJZPV7ei33D8+jpna4R/cugG+IxsPPMPCRWzmp+Jy2sJhwSK+vubtzbb+bNEUxeZTqtsZoH1GuI2aGRWd00Zd6O8/OniMPjrm/incYVWNt9kQblyBaeDEOu/rVJyJBJcsrThdr1QET6NGlr8Hvqru/g/Qh+dyw9/9QbMffBLnD64ZaMcAAAAASUVORK5CYII=',
            },
        },
    ]
};
export const settingMainMenu = {
    default: [
        {
            index: 0,
            icon: '',
            data: 'userProfile',
            title: 'User profile',
            submenu: [
                {
                    index: 0,
                    icon: '',
                    data: 'offlineProfile',
                    title: 'Offline profile',
                    submenu: []
                },
                {
                    index: 1,
                    icon: '',
                    data: 'onlineProfile',
                    title: 'Online profile',
                    submenu: []
                },
            ]
        },
        {
            index: 1,
            icon: '',
            data: 'defaultFolderStyle',
            title: 'Default folder style',
            submenu: [
                {
                    index: 0,
                    icon: '',
                    data: 'backgroundImage',
                    title: 'Background Image',
                    submenu: []
                },
                {
                    index: 1,
                    icon: '',
                    data: 'backgroundColor',
                    title: 'Background Color',
                    submenu: []
                },
                {
                    index: 2,
                    icon: '',
                    data: 'bookmarksSize',
                    title: 'Bookmarks Size',
                    submenu: []
                },
            ]
        },
        {
            index: 2,
            icon: '',
            data: 'navigationBarStyle',
            title: 'Navigation Bar Style',
            submenu: [
                {
                    index: 0,
                    icon: '',
                    data: 'navigationBarSymbol',
                    title: 'Symbol',
                    submenu: []
                },
                {
                    index: 1,
                    icon: '',
                    data: 'navigationBarBackgroundColor',
                    title: 'Background Color',
                    submenu: []
                },
                {
                    index: 2,
                    icon: '',
                    data: 'navigationBarFont',
                    title: 'Font',
                    submenu: []
                },
            ]
        },
        {
            index: 3,
            icon: '',
            data: 'windowStyle',
            title: 'Window style',
            submenu: [
                {
                    index: 0,
                    icon: '',
                    data: 'windowBackgroundColor',
                    title: 'Background Color',
                    submenu: []
                },
                {
                    index: 1,
                    icon: '',
                    data: 'windowFont',
                    title: 'Font',
                    submenu: []
                },
                {
                    index: 2,
                    icon: '',
                    data: 'windowBorder',
                    title: 'Border',
                    submenu: []
                },
                {
                    index: 3,
                    icon: '',
                    data: 'windowButtons',
                    title: 'Buttons',
                    submenu: [
                        {
                            index: 3,
                            icon: '',
                            data: 'windowButtonsFont',
                            title: 'Font',
                            submenu: []
                        },
                    ]
                },
            ]
        },
        {
            index: 4,
            icon: '',
            data: 'activity',
            title: 'Activity',
            submenu: [
                {
                    index: 0,
                    icon: '',
                    data: 'myActivity',
                    title: 'My Activity',
                    submenu: []
                },
            ]
        },
        {
            index: 5,
            icon: '',
            data: 'preferences',
            title: 'Preferences',
            submenu: [
                {
                    index: 0,
                    icon: '',
                    data: 'undoManager',
                    title: 'Undo Manager',
                    submenu: []
                },
            ]
        },
        {
            index: 6,
            icon: '',
            data: 'exportImportOptions',
            title: 'Export/Import Options',
            submenu: [
                {
                    index: 0,
                    icon: '',
                    data: 'exportProfile',
                    title: 'Export Profile',
                    submenu: []
                },
                {
                    index: 1,
                    icon: '',
                    data: 'importProfile',
                    title: 'Import Profile',
                    submenu: []
                },
            ]
        },
        {
            index: 7,
            icon: '',
            data: 'syncBackup',
            title: 'Sync & Backup',
            submenu: [
                {
                    index: 0,
                    icon: '',
                    data: 'syncBrowserBookmarks',
                    title: 'Sync Browser Bookmarks',
                    submenu: []
                },
            ]
        },
        {
            index: 8,
            icon: '',
            data: 'about',
            title: 'About',
            submenu: [
                {
                    index: 0,
                    icon: '',
                    data: 'aboutInfo',
                    title: 'Info',
                    submenu: []
                },
                {
                    index: 1,
                    icon: '',
                    data: 'aboutChangelog',
                    title: 'Changelog',
                    submenu: []
                },
            ]
        },
    ],
    folder: [
        {
            index: 0,
            icon: '',
            data: 'defaultFolderStyle',
            title: 'Folder style',
            submenu: [
                {
                    index: 0,
                    icon: '',
                    data: 'backgroundImage',
                    title: 'Background Image',
                    submenu: []
                },
                {
                    index: 1,
                    icon: '',
                    data: 'backgroundColor',
                    title: 'Background Color',
                    submenu: []
                },
                {
                    index: 2,
                    icon: '',
                    data: 'bookmarksSize',
                    title: 'Bookmarks Size',
                    submenu: []
                },
            ]
        },
        {
            index: 1,
            icon: '',
            data: 'navigationBarStyle',
            title: 'Navigation Bar Style',
            submenu: [
                {
                    index: 0,
                    icon: '',
                    data: 'navigationBarSymbol',
                    title: 'Symbol',
                    submenu: []
                },
                {
                    index: 0,
                    icon: '',
                    data: 'navigationBarBackgroundColor',
                    title: 'Background Color',
                    submenu: []
                },
                {
                    index: 0,
                    icon: '',
                    data: 'navigationBarFont',
                    title: 'Font',
                    submenu: []
                },
            ]
        },
    ]
};
export const backgroundImageExample = [
    {
        id: 1,
        type: 'center',
        title: 'Center',
        base64: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABCCAMAAACWyYNNAAADAFBMVEUVFRUkJCQfLDgqLy8fIB90dHSXrqcZGRlzc3MYKUIbJBU9RUEjJCQ7Qj8bGxsYJC0YGBh0e3h7iYN1e3h5g38AAAADAwIhISECAgEcHBwqKioeHh4jIyMTFBQKCgr/uQYBAQBiezlTjeZPZCwTHwgoNQ1DVSRPieMOFwUZJAn9yAv+vQf+zgpYkuo8TR9SaC//wAgwQBX+xQ5DIAtMYCtWbTAvOQv+0wwkMxD+wwp7l0gsPBRqgz0dKQv94hc4SBtZcTRAUSF0bxZOKQwzRBr9tAgfLQ35wAl1kURMheFKgdklLwn+2hD2uQdGWidvikFfdTZAJg7rwQ+1mxPwuQntzxiikxvJsRxYXRtqYxDzwwyAn1FKXCarniGEeRU8JxJgMAtUVRFWjd9cWA/TsRJmayG4ph60kwydawhGKg1XKAs2PQxPWB1TYSWMfxXSqA0GCALruAvgsgxCRQ1jbypgZB2VghFudSnbtBOslROLhCCnhQsrPChITBCbihV+bQ1yZw7LoAvxpAixbQlShMh9dxmSjidzdSTMqRCrewn2qwj7uAj3zxHfkwnxsgiKoET52xjRvCM5QxBhXxJ6iTcxQi10fzGpsXWLdgwvHw6FSgphgEDmxhf4yQ302B1jks7guxKOlTSrjA2fggwyJBXrnQg4T03nsgqHoqCblihqezShihCZeQrAlgo3KRt6QwrTjglMdJ7exh4qOhyAoK+Hii2BkTvEpxSbWwpqOApCYXM/ShVOTQ10m7375CTbqAo5SCZJVBy/oRGeq4GOXgi4iQnHmQrPwEj80hf9zBROIwzHfgpRf7iTiR2WmTI2SjvcxjJTZz+IVAlsQAg4Iw29eAlGaH7r0yWapD5VitVbZyZ+fybVngkkMhyppzFPeqnkoQnFvVXdvCJ2SggQGyxngmJckdtIWju5uWVimOJpipJynciTqJYcGAO6rigPDwJAXGL5rwhgf4JKYVFLb46crY+Cl27At0Fhi7RVcWmwsVjQwT5gfFJKEBoQGjghNzsCFGu3AAABAHRSTlPAr/3+qM4BsMf9/eKWPUX+3bNQuFP////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AVORaLAAADmxJREFUWMO81mlUk1caB3BHZzp22p6eWYrOjDUEJI4JQhLWCAoEYtyCQAJhkQBJJBGQmAAhIWwB2ZcCGkAEwSAlAhEQFBAY9p1RBEFRqCxFKdpW3Jd+mHsTVDwn8Zv9cw4feA/3l+c+97lv1nz2t7+uV+dP77P+w3zw99XPtf3Dqkfr//6Pz9Z89cW6f33SrPviqzVfbtrwz0+af2/6cs0fNn278VNGZ/OmP0Pkm0+a3wfZsBrR3fIXmA1ff73285WsVeVzjVm7dp0q2p5v1ojoOJ4G+e3V49rhe9th7rXWKxSK+tbWYnWYIHrqbGUWtyq6uvLyuh4qWif3acjxHz+G/Lbw+GXxTzBgmTy4zENFfX09wIonJyeZehDarnev9WHebF9f3+xil6KYuVWVvVv3qrMP/vyosSc6KCQS6XT69MLjpZfFDx48qFfkzb548eL14mIe/MzPFPUvh4ePw0wygbHYNzcnEs2NzHbVF299l71vHS3IxnZjY2MzWyQoZWlJUa94ljc7cjE7O/vNSN9s35s+QC09floLc3f4pSKvb47X26OUikYWH7be26raw9XOPs3bpVtnh0Id0jdDHlxYeP68K29xdsTVtbCw0PWm602Qkb7XzxdeXYGZeLrUNTvH6+F2d6f0ivry6ov13uZdRVoq0d2Jc2hvtzOtOHl5h9et1y/ejLhapLu6uqanp1scyDpzc+TNrdzrT558D/Jo4VZ2SS933td3NIUHSnnA1FsdqGhDtkzXRcpsgpIuXT179YdfsucK0y0Mi4BgYWhx4EBW1pmRXxJzna47tstk953O00VKrq+J/XzK1MXZZ61M1XHc/vboMZkfQSIjZUbuCW7e3t7+dAHfs8jQ0BAghhDZ9d+si3TvxDvhtzvaI9tvR/jTO6vmm8ZgJbPPHvy0/V309Cbh4RjW0niAyNrtTgRTkxv8G9h8GoWA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`,
    },
    {
        id: 2,
        type: 'stretch',
        title: 'Stretch',
        base64: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABCCAMAAACWyYNNAAADAFBMVEUWFhYTFBIrLixSWlYcHBsbHBuBmZZ7ensgICEiIyIfIB9/iYQXFxZJU0xCSkb/uQb+yQtRZi39xQwkMg4jJSMtLCz+vAYxQRYtPBX+vwn/wglZcDNQiuUeHh8mKCUaJgpVazFIXCdNYSogLQtAUiJDVyX+0gxgeTn2uAgtNT8+JxD/zwkVIAn93hMuOgtkfjs1RhtNKQ1Tjuj3wQpddTZmaiE7TR18dxtYk+soNhEfHh9GHgvmtAtOh+NUVBG4nBDxugnVsBH7vAhqZBLnvhBOWiEqLCf+1w5BIgvvwg7dtxGgixH6zRBPJAv+tAj95Bk5SBg8RA8vHw4hLBR9nE7Opw3CoQ9fYRpwcyNWYiTcrw4tMCmPjit1kkhNThA1PQ2pkhKRgRJGKg7EmAoPFwZpgz1tiECIfRX7rgexbArTjQnx0hmykw7NrhNFSQ9LdKTekwl7jj2lhgspNAqXhRKgkx5dWQ+CdRNVWxxFThitmxqkmyZzZw9VhstwjETzpAj22BmJn0fwyhHErhtkcS0vPy+Zliw7SSVhXRHNngo5KRkmNBt2hjhVKAv4xwzttwqIhSO9kArWpgt6bQ+8pxtGZ3+efwsbJBL1qwiLTgppNgo0QyRXjNiKdQyQhx6DizI3JQ+tiwv0sghXhL99lkRIVR90eyzawh10bxc6Py4zOSf90RfqnAlMf9ArOCStoCKgcwhtaxoxJBcsLC2VnztdaSc5UEx+fyd7nbMzODaZWAp+RArPuB61ohtsdy5MWjGYjR29dgmCoFVxPgprl8voyxk/WV1rfTYzRTlZkOKVeguJljvjzyz43R1iMApRfbJUZz+9ul2kpjWhr4aXawjjxRj75SVaLApzSAjRvifKgArqqQmEVwiNXwiyhAmnewneuh7u1yWytnDCtD9AXmxIbZDQxEXdwC2RqZ3NvkfgpglEUjlkh5mjZAp/mZtMXUO1qSasfwmlp1xpg2h7TgiLnolje02Zo3NZdXJGQh5qh4JSaVi8szGAlGtgOQkKFg5gNUPTAAABAHRSTlOmUkUTy8sBmvha6Wh4pun///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+mOTr5DQAAElZJREFUWMO01nlQk3caB3C33Xbb7ewCwSYkOEogQLpUQFJAxkhCiOVIiEEkQLZAkFFuYQNyKJcgRnQhgIBAcDVQ5FwOtXJ1RQ4Z8EIEh0vkFlAERfFoa2ef3/sGPHa3/+13IPe8n/d5fsf7rvv04y/+8P/NF5+u+/hPjRe+xLP6jL/B8+Vv5MLb/MavGv/80bqP/rj+r6o0NjZ+tZrGt1G9+erDNDaWr+a/fLuWCxvXrfv8swpDQxNDQ8MXL169WugpjovriOvoaFh8uQx5+XJlZWVxcRH9NxQX9xTD1yiFhYVx6CdTeJZfLjbE/fN/ZGb97wEpN8Ri8uLZTwsLxR2Qhoa5vt75qV+mpnoneyf7+iYnJ/vm5hqKe3owpDiusLu7A/1kdnxc7Dg+O9/b19BRuGE1299L6MZPUCU6EG3tb0BBzCIQc32TD0pLh4aG5h88eNDbO/9gHqyVhYWZUCyAFTf0Tc6Pi1N9fX1TxePzk3MNb5H3mdCNqJJqfX0qVVdDB1d+WlmBU++dv5F0925p6d0bqgDz8s2zVzl4ZkIXVibnZ8W+92v7a+/7imfnoZTuDRvMzP7TwSv51tRUZkHTp2oY/j3e89mbtuVlOPUbQfykq5AgfhA/MTFxApjlw/t+7uyc7oRM5zx70zs7nvp09Png89GnqXgpZqt5z8GRjVZa1QqFjOZx+cyZ698fvnhnamh2NsjOgJ8EMYDYbd6cODFxY+rOmSO3l5YedXV1Xep8cf2XcbFv7fOBLQOD/ZniWTQq3WZmHzjbt2/YgCPrXU5UV1coLKLdM44evXjxzpMfx8e5SQZG6vwkPt/AyAghm29OTAw9OVp/WVujRVaRkvJI+8wThAxusXfCEKxfZlu3mm19B4JJuFoJQlJSZDFullcO1hyqeZJsw5Q7pKsbGfH5fDtAjADZufPmRGlyzdGMc+YeJTJFhcyj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`,
    },
    {
        id: 3,
        type: 'fit',
        title: 'Fit',
        base64: `data:image/png;base64,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`,
    },
    {
        id: 4,
        type: 'fill',
        title: 'Fill',
        base64: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAAA6CAMAAABxuAzhAAADAFBMVEVHcEySmYisspOXnYmVm4u0waC9yqQXFxdWVlW9zKKsx/OTm4a6y763xauNk4bNxo/OwobDuoeipoiuyfUeHh6rtqFXX1ykr5G0sYigqpityPWvuZinus1pcmiqxO2cpIckJCX+wQr+vAZMhuL9xQpVj+n/uAdRZCsSIAb/0QonNQ4qKyn+yQowQBYjMAxMYCk9JxBZk+1VazAaKAogICBthT6MkoT8zBFhejiwvp5bcjRRi+UwOww5Sx1xjkYwIRFCIQxEa6b94xgqOhSnwvA1RhpBUyL+1hBngD0hISKptJbQrRLTxYWHjYKhrI4yMy/ftxF8mUs+Tx5ZYSD83BP0xA3yuAhwZxH9swg8Ryv3vQljYBOzoh57dRqBn1BASBFIXCfttwpvcSGIdhGSmIGWn49PJQs5PyM5QxCQiSKdiRX5uQfmtAtKVh+elSLCoRGGfxzzpgj12h7t0iAeIxhJTBGSghVveC5MKw7GfQljaiI+ZKBSWh63xZ+wlhNcLQtSUhHWwjqRmYo2KBtKbZDOv4Jzm8L20RNkdTHZsRF6kkOkqoNFTzHXjQniyR6KUgoxOUTrwhC8rCKVlCx5hzbIlwpWidIrMCLkmAhEVyVaWROljxRoaRqGjzR8bhDtoQhkNAuAoLFhlNqfojXlvRKomyFTittHIQvuyxOCTQleayyBinp6fiqxrnHbzIZck+NFKg5vPArPuR7GrxxTKQy7jwu3s4WoewnVpAs1NiJ5QwrYwSLJvk/MpA6TpZyGn6KeXQrzsAhql85TZkGSYAnbux3fpQmcppGbfw4mKR6aoYOoZQq4mhGJnkZSgLakoHJMcpswQTCRnz9LXDy1hwqqiQ4tPC3DuYVkVhurr3v6rAhUhcWHiCq1cQr75SU4ST1BXWudcAm0uZI8Oy48Vl44T028uWObtuBhgYBogmREZH5xWxZSalxijLWitsvCuD7q2Ydgg5NQeaXGv4i/snivrDegr7Onvt/GyZnBhgm1s1uXqKdP1gC8AGYAcnpHcExM5K4sAAABAHRSTlMAtMu0y8vLyej+sCxFe7TLtLS0dp+wx/C0tLHttEx17P////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8AA9BgIgAADyFJREFUWMOslnlQU/kdwNNVd7bX7NGps91pO5s0JoMhsmUGgyDoSgHHRIhAEnghYgh3EsIxEHExEOUwhkNAWJAIIWIABQLLKYYgNwsIulwCWgRW6tldQduu/tPv770A2nb7134CYUjgfd73/IVEIvjD9vd+erb/0nr1XxO8x/j0p4ex/Y+/AX5F2rbn5J49eyze3vcfP05L+3ydW8Dn/5cvgDSCL34Exrm//QX4BCSIUMa5W6tj88Y/WzH1ZGT09BgMBtMOHBPxE94hft/hvGOH0dCTUYGAPy360//AeO4/JQsPn6/Om6wKQ0ZFF4D/P5gMPSA0oQtv4mzoqejy0s4CXpaujCLjf0vmrZJfkN7FJcOMhUcPnz8rMphMBhPcoUVbNz5epx20WCxwq7iupwgwmkwmIy6D+/CqM5vVarXZvDJrwS3O8HiTDck2qyTgEbI8ywAqKiyz5u8Qr1ZW6ma1s3VIV/FsDJjHMRoNGV3aFfX1fq5Gw+1Xm8FicLay4SjakLxzCBHCCDiILM8hSRYvbZ35es51QI3A73albvjww4dpabdwxsaeIUd/e2HL5GRhuwYsXZuWDdOmZBDw2s0Id3RwdX109SpkacVszsnMrM7LyamOR8TBt9r86qjr06f3CR6nPQx5BY6Wxb6a3L62Qo16xauix+T8NsYNydZToaGDg4cZ4WfOX7x49sjNSy+/U6tz4j1tWNXV1ZmZNjY2nn5+cXHxOeqXF5W9vb0TCwsLDx48PfjNy35uYVuNvrm5sW+yvd9cZ8kwbTTFjrckn4AELKFXGeHBMQXRBZcuBTb1cyvzWDY2LFYm7kASv7i/xuU0XY6sVV6hewRMT9/OunI3sF8DkpSqMCSpVK8MZhigx99swDcjORVqQZGIolSBQD5bJhZjVFsbWxbLhsDP78CBA3E5X+UHRkfWBp9I9nEJD/Ctjc5vUkwt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`,
    },
    {
        id: 5,
        type: 'tile',
        title: 'Tile',
        base64: `data:image/png;base64,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`,
    },
];
export const changelog = [
    {
        "id": 9,
        "version": "0.2.8",
        "log": [
            "Implemented: Enhanced Search Functionality:",
            "&ensp;- The search functionality for bookmarks and folders has been fully implemented with a redesigned user interface.",
            "&ensp;- The search UI features:",
            "&ensp;&ensp;- An input field at the top for entering search keywords.",
            "&ensp;&ensp;- A left-side panel with the following filters:",
            "&ensp;&ensp;&ensp;- 'Browser Bookmarks': A toggle to include all browser bookmarks in the search results.",
            "&ensp;&ensp;&ensp;- 'Selected Created After': Date and time input fields to filter items created after a specific date and time.",
            "&ensp;&ensp;&ensp;- 'Selected Created Before': Date and time input fields to filter items created before a specific date and time.",
            "&ensp;&ensp;&ensp;- 'Search In URLs': A toggle to include bookmark URLs in the search.",
            "&ensp;&ensp;&ensp;- 'Include Bookmarks': A toggle to include all extension bookmarks in the search.",
            "&ensp;&ensp;&ensp;- 'Include Folders': A toggle to include all extension folders in the search.",
            "&ensp;&ensp;&ensp;- 'Choose Compact View' / 'Choose List View': A button that toggles the display of search results between a compact tile view and a detailed list view.",
            "&ensp;&ensp;- A 'Close' button at the bottom to exit the search UI.",
            "&ensp;- The right-side panel displays the search results.",
            "&ensp;- When the 'Browser Bookmarks' toggle is enabled, extension bookmarks are shown first, followed by browser bookmarks. Each section has a title indicating the number of items found (e.g., '1 bookmark found in Bookmark Manager Pro matching your search.', '10 bookmarks found in your Firefox browser matching your search.').",
            "Added: Utility Functions in 'utilityFunctions.js':",
            "&ensp;- Implemented 'openUrl(url, ctrlPressed)' function to open a URL in a new tab (if `ctrlPressed` is true or middle mouse click) or the same tab.",
            "&ensp;- Implemented 'escapeHtml(unsafe)' function to prevent XSS attacks by escaping HTML special characters.",
            "Added: Localization for Search Manager UI:",
            "&ensp;- All titles and labels for the search manager UI have been added to the 'en-US.lang' file in American English.",
            "Security: Implemented 'escapeHtml' for XSS Prevention:",
            "&ensp;- The 'escapeHtml' function has been implemented in 'main.js' to sanitize:",
            "&ensp;&ensp;- Bookmark titles displayed in the main view.",
            "&ensp;&ensp;- Navigation bar titles.",
            "&ensp;&ensp;- The username displayed in the user menu.",
            "&ensp;- The 'escapeHtml' function has been implemented in 'bookmarkManager.js' to sanitize:",
            "&ensp;&ensp;- Folder names in the folders tree.",
            "&ensp;&ensp;- Content displayed in the bookmark preview.",
            "&ensp;- The 'escapeHtml' function has been implemented in 'settingsManager.js' to sanitize:",
            "&ensp;&ensp;- The user profile name in the 'Offline Profile' menu.",
            "&ensp;&ensp;- Profile names and bookmark titles displayed in the 'My Activity' menu.",
            "Fixed: User Menu Visibility:",
            "&ensp;- The username in the user menu now correctly hides when the user closes the menu.",
            "Fixed: Bookmark Manager Variable Names:",
            "&ensp;- Improved code readability in 'bookmarkManager.js' by updating variable names for better understanding.",
            "Fixed: New Folder URL Auto-Addition:",
            "&ensp;- When creating a new folder in the Bookmark Manager, the extension no longer automatically adds 'HTTP://' or 'HTTPS://' to the folder's URL.",
            "Fixed: Parent Folder Selection:",
            "&ensp;- In the Bookmark Manager, when editing a folder, that folder will no longer appear as an option to select as its own parent in the 'Select Folder' area.",
            "Improved: Settings 'Info' Buttons Behavior:",
            "&ensp;- In the 'Info' menu of the Settings Manager, the behavior of the Firefox, X/Twitter, GitHub, and Buy Me A Coffee buttons has been updated:",
            "&ensp;&ensp;- Left Mouse Click (without CTRL): Opens the link in the same tab.",
            "&ensp;&ensp;- Left Mouse Click (with CTRL) or Middle Mouse Click: Opens the link in a new tab.",
            "&ensp;&ensp;- Right Mouse Click: Copies the URL to the system clipboard (this behavior remains unchanged).",
            "Fixed: Font Styles in Extension Popup:",
            "&ensp;- All user-defined font styles (color, family, size, style, weight) are now correctly applied to the extension's popup window.",
            "Updated: Manifest Homepage URL:",
            "&ensp;- The 'homepage_url' in the 'manifest.json' file has been updated to 'https://github.com/YuraCodedCircuit/Bookmark-Manager-Pro'.",
            "Updated: README Installation Instructions:",
            "&ensp;- The installation instructions in 'README.md' have been updated to provide more detailed steps on how to download the extension from the Firefox Add-ons website, including searching by name and using a direct URL.",
            "Updated: Extension Screenshots:",
            "&ensp;- New extension screenshots have been added, and outdated screenshots have been removed.",
            "Updated: README Screenshots:",
            "&ensp;- The extension screenshots displayed in the 'README.md' file have been updated."
        ]
    },
    {
        "id": 8,
        "version": "0.2.7",
        "log": [
            "Improved: Bookmark Manager UI Style Customization:",
            "&ensp;- The bookmark manager UI, which includes 'Border,' 'Color,' 'Image,' 'Text,' and 'Font' tabs for customization, now better reflects user-defined styles.",
            "&ensp;- In the 'Border' tab, the 'Left,' 'Top,' 'Right,' and 'Bottom' buttons, used to navigate and style individual bookmark borders, now apply the user's configured secondary button style. Previously, these buttons did not adopt user-defined styles.",
            "&ensp;- The random color generation buttons found in the 'Color,' 'Image,' 'Text,' and 'Font' tabs now utilize the user's configured primary button style.",
            "&ensp;- In the 'Font' tab, the buttons for selecting Font Weight, Font Style, and Font Alignment, along with the random color button, now primarily use the user's primary button style, while other elements in this tab utilize the secondary button style.",
            "Enhanced: Input Field and Folder Tree Styling in Bookmark Manager:",
            "&ensp;- The title input field, URL input field, and the folder selection area in the bookmark manager now feature a highlighted background color that dynamically adapts to the user's selected overall UI background color. This provides better visual integration with the user's chosen theme.",
            "Feature: Added Random Color Buttons in Text and Font Tabs:",
            "&ensp;- New buttons have been added to the 'Text' and 'Font' tabs within the bookmark manager to allow users to easily generate random colors for styling.",
            "Improved: Font Family Dropdown Visibility:",
            "&ensp;- In the 'Font' tab, the dropdown menu used to select a font family for new bookmarks now has a background color that dynamically adjusts based on the user's selected UI background color. This resolves a previous issue where a black background could make the menu invisible if the user had selected a dark UI theme.",
            "Created: Marquee Effect for Long Usernames:",
            "&ensp;- To ensure that long usernames are fully visible, a marquee effect has been implemented in specific areas of the extension.",
            "&ensp;- In the 'User Profile Menu', if a username exceeds 15 characters, it will now display with a scrolling marquee effect.",
            "&ensp;- In the 'Settings Manager' within the 'Offline Profile' section, a marquee effect will be applied to usernames longer than 29 characters.",
            "Marquee Effect Behavior:",
            "&ensp;- The marquee effect works by horizontally translating the username text.The text starts fully visible from the left, scrolls to the left until the end is visible, and then reverses direction, repeating this animation infinitely.",
            "Improved: Custom Context Menu Order:",
            "&ensp;- The browser extension features a custom context menu that replaces the default browser context menu within the extension's tab. This menu has two variations: a 'default' menu appearing on right-click in empty spaces and a 'bookmark' menu for right-clicking on folders or bookmarks.",
            "&ensp;- In the 'default' context menu, the order of options has been updated from 'New Bookmark,' 'New Folder,' 'Folder Settings,' 'Search' to 'New Bookmark,' 'New Folder,' 'Search,' 'Folder Settings'.",
            "&ensp;- This change aligns with common user interface patterns where settings or configuration options are typically placed at the end of a menu. Each item in the context menu is also visually enhanced with an icon preceding the text. The functionalities of each item remain the same: 'New Bookmark' opens the bookmark creation UI, 'New Folder' opens the folder creation UI, 'Search' opens the search functionality, and 'Folder Settings' opens the customization options for the current folder's appearance and navigation.",
            "Improved: Behavior of Information Buttons in Settings:",
            "&ensp;- In the 'Info' section of the extension's settings UI, the behavior of the four buttons (for Firefox, X/Twitter, GitHub, and Buy Me A Coffee) has been updated to provide more interaction options.",
            "&ensp;- Left Mouse Click: Clicking normally on any of these buttons will now open the corresponding URL in the current tab.",
            "&ensp;- Middle Mouse Click (Mouse Wheel Click): Clicking with the mouse wheel on any of these buttons will now open the corresponding URL in a new tab.",
            "&ensp;- Right Mouse Click: Right-clicking on any of these buttons will now copy the corresponding URL to your system clipboard."
        ]
    },
    {
        "id": 7,
        "version": "0.2.6",
        "log": [
            "Integrated extension icon into the browser omnibox for quick access to extension features.",
            "&ensp;- Introduced functionality to extension popup window directly from the omnibox icon and immediately edit and save bookmark.",
            "&emsp;* This feature streamlines the process of saving a new bookmark to the extension.",
            "&ensp;- Added option to save a new bookmark either to the most recently created folder or a folder selected by the user.",
            "&emsp;* This enhances bookmarking workflows by allowing users to quickly save visual information in desired locations.",
            "Implemented keyboard shortcut 'Ctrl + Alt + O' to quickly open the extension popup window from anywhere in the browser.",
            "&emsp;* This provides users with faster access to the extension's main interface without needing to click the browser icon."
        ]
    },
    {
        "id": 6,
        "version": "0.2.5",
        "log": [
            "Introduced new features to enhance user experience:",
            "&ensp;- Copy/Duplicate/Move Bookmarks and Folders: Users can now easily copy, duplicate, or move bookmarks and folders within the extension.",
            "&emsp;* This addition provides improved organization and management of bookmarks, allowing for efficient restructuring of user content.",
            "&ensp;- Undo Functionality: Implemented undo capability for recent actions, including bookmark and folder deletions, using the 'Ctrl + Z' shortcut.",
            "&emsp;* This feature safeguards against accidental data loss and enhances user confidence by allowing quick reversal of unintended actions."
        ]
    },
    {
        "id": 5,
        "version": "0.2.0",
        "log": [
            "Implemented multi-profile support, enabling users to manage separate sets of bookmarks and settings.",
            "&ensp;- Users can now create multiple profiles, each with customizable names and profile images (logos, avatars).",
            "&emsp;* This feature allows for personalized environments for different contexts, such as work, personal use, or specific projects.",
            "&ensp;- New profiles can be created by copying existing bookmarks, folder styles, bookmark styles, and settings from either the active profile or default 'factory settings'.",
            "&emsp;* Streamlines profile creation and setup, allowing users to quickly customize new profiles based on existing configurations.",
            "Enhanced Export/Import functionality with encryption.",
            "&ensp;- Added option to encrypt exported profile files with a user-defined password, which is required to decrypt the file during import.",
            "&emsp;* This significantly improves the security of exported user data, protecting sensitive information during backup and transfer."
        ]
    },
    {
        "id": 4,
        "version": "0.1.7",
        "log": [
            "Introduced the activity log feature to track user interactions within the extension.",
            "&ensp;- Real-time Logging: User activities, such as opening/closing the extension and creating/deleting bookmarks, are automatically recorded.",
            "&emsp;* This provides a detailed history of user actions for personal tracking and potential debugging.",
            "&ensp;- Detailed Entries: Each log entry includes a timestamp, action type, and description.",
            "&emsp;* Offers comprehensive information for each recorded event, facilitating easy tracking and auditing.",
            "&ensp;- User Interface: Added a dedicated 'Activity Log' section in the user profile, with filtering and sorting options.",
            "&emsp;* Provides users with an accessible interface to review and manage their activity history efficiently.",
            "&ensp;- Export Capability: Users can export activity logs in CSV format.",
            "&emsp;* Enables users to perform external analysis, backup activity records, or share logs for support purposes."
        ]
    },
    {
        "id": 3,
        "version": "0.1.6",
        "log": [
            "Enabled online radio playback directly within the extension popup window.",
            "&ensp;- Users can now listen to online radio streams without leaving the extension.",
            "&emsp;* Enhances the extension's utility by providing integrated entertainment and background listening options.",
            "Added capability to save the currently active browser tab as a bookmark directly from the extension popup window.",
            "&ensp;- This feature streamlines bookmark creation for quickly saving active pages.",
            "Implemented keyboard shortcut 'Ctrl + P' to quickly open the settings panel.",
            "&emsp;* Provides users with faster access to extension settings for configuration changes.",
            "Implemented keyboard shortcut 'Ctrl + Shift + B' to quickly create a new bookmark.",
            "&emsp;* Streamlines the bookmark creation process, improving user efficiency.",
            "Implemented keyboard shortcut 'Ctrl + Shift + N' to quickly create a new folder.",
            "&emsp;* Simplifies folder creation, allowing for quicker organization of bookmarks.",
            "Implemented keyboard shortcut 'Ctrl + F' to quickly open the search dialog.",
            "&emsp;* Offers immediate access to the search functionality for efficient content discovery within the extension."
        ]
    },
    {
        "id": 2,
        "version": "0.1.5",
        "log": [
            "Added customization options for navigation bars within folders.",
            "&ensp;- Users can now add and edit icons for navigation bar elements in folders.",
            "&emsp;* Enhances visual customization and personalization of folder navigation.",
            "Implemented functionality to reorder bookmarks and folders via drag-and-drop or similar interface.",
            "&ensp;- Users can now change the order of bookmarks and folders within the extension.",
            "&emsp;* Improves organizational flexibility, allowing users to arrange content based on preference or priority.",
            "Introduced profile customization with image and name.",
            "&ensp;- Users can now personalize their profile by adding and editing a profile image and name.",
            "&emsp;* Provides a more personalized user experience and visual identification within the extension.",
            "Added initial support for multiple languages.",
            "&ensp;- The extension now supports different languages, improving accessibility for a broader user base.",
            "&emsp;* Facilitates usage for non-English speakers and expands the extension's global reach.",
            "Implemented an extension popup window.",
            "&ensp;- Provides a dedicated interface accessible from the browser toolbar icon for quick access to extension features.",
            "&emsp;* Offers a convenient and centralized access point for core extension functionalities.",
            "Introduced a background script to manage extension processes.",
            "&ensp;- Implemented a background script to handle tasks such as settings management, synchronization, and other background operations.",
            "&emsp;* Improves extension performance and ensures efficient handling of background tasks without impacting user experience.",
            "Enhanced the settings manager with new features:",
            "&ensp;- Manage export/import: Added capability to export and import extension profiles, bookmarks, styles, and settings.",
            "&emsp;* Allows users to backup and restore their extension data or transfer settings between installations.",
            "&ensp;- Manage synchronization: Introduced synchronization between the browser and the extension to maintain data consistency.",
            "&emsp;* Ensures data integrity and accessibility across different browser sessions or devices.",
            "Implemented a changelog to track extension updates.",
            "&ensp;- This changelog was added to provide users with a history of changes and improvements made to the extension.",
            "&emsp;* Enhances transparency and keeps users informed about ongoing development and updates."
        ]
    },
    {
        "id": 1,
        "version": "0.1.0",
        "log": [
            "Initial release of the browser extension.",
            "This initial release includes the following key features:",
            "&ensp;- Bookmark and Folder Management:",
            "&emsp;- Ability to add and edit new bookmarks.",
            "&emsp;- Ability to add and edit new folders.",
            "&ensp;- Tile Customization:",
            "&emsp;- Ability to add and edit color or image as bookmark/folder tile backgrounds.",
            "&ensp;- Style Customization:",
            "&emsp;- Ability to add and edit styles for selected folders.",
            "&emsp;- Ability to add and edit styles for navigation bars within folders.",
            "&ensp;- Custom Context Menu:",
            "&emsp;- Implemented a custom context menu on the main extension page for quick actions.",
            "&ensp;- Default Style Management:",
            "&emsp;- Ability to edit and save/load default styles for bookmarks and folders.",
            "&ensp;- Settings Manager:",
            "&emsp;- Added a comprehensive settings manager to configure and save extension parameters.",
            "&emsp;- The settings manager includes the following features:",
            "&emsp;&emsp;- Offline Profile Management.",
            "&emsp;&emsp;- Default Folder Style Configuration.",
            "&emsp;&emsp;- Default Navigation Bar Style Configuration.",
            "&emsp;&emsp;- Window Style Customization.",
            "&emsp;&emsp;- Activity Tracking (Note: Initial framework, feature fully implemented in v0.1.7).",
            "&emsp;&emsp;- Extension Information Display."
        ]
    }
];
export const extensionLogoSVG = `
    <svg width="100px" height="100px" id="extensionsLogo" viewBox="4 3.7 15.8 15.5" fill="#ff6666" xmlns="http://www.w3.org/2000/svg"><path d="M6 6c0-1 1-2 2-2h8c1 0 2 1 2 2v13l-6-3-6 3V7Z" stroke="#81ecec" stroke-width="0.6" stroke-linejoin="round"/></svg>
`;
export const firefoxLogoSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%"><defs><radialGradient id="b" cx="87.4%" cy="-12.9%" r="128%" gradientTransform="matrix(.8 0 0 1 .18 .13)"><stop offset=".13" stop-color="#ffbd4f"/><stop offset=".28" stop-color="#ff980e"/><stop offset=".47" stop-color="#ff3750"/><stop offset=".78" stop-color="#eb0878"/><stop offset=".86" stop-color="#e50080"/></radialGradient><radialGradient id="c" cx="49%" cy="40%" r="128%" gradientTransform="matrix(.82 0 0 1 .09 0)"><stop offset=".3" stop-color="#960e18"/><stop offset=".35" stop-color="#b11927" stop-opacity=".74"/><stop offset=".43" stop-color="#db293d" stop-opacity=".34"/><stop offset=".5" stop-color="#f5334b" stop-opacity=".09"/><stop offset=".53" stop-color="#ff3750" stop-opacity="0"/></radialGradient><radialGradient id="d" cx="48%" cy="-12%" r="140%"><stop offset=".13" stop-color="#fff44f"/><stop offset=".53" stop-color="#ff980e"/></radialGradient><radialGradient id="e" cx="22.76%" cy="110.11%" r="100%"><stop offset=".35" class="prefix__stopColor" stop-color="#3a8ee6"/><stop offset=".67" class="prefix__stopColor" stop-color="#9059ff"/><stop offset="1" class="prefix__stopColor" stop-color="#c139e6"/></radialGradient><radialGradient id="f" cx="52%" cy="33%" r="59%" gradientTransform="scale(.9 1)"><stop offset=".21" stop-color="#9059ff" stop-opacity="0"/><stop offset=".97" stop-color="#6e008b" stop-opacity=".6"/></radialGradient><radialGradient id="g" cx="210%" cy="-100%" r="290%"><stop offset=".1" stop-color="#ffe226"/><stop offset=".79" stop-color="#ff7139"/></radialGradient><radialGradient id="h" cx="84%" cy="-41%" r="180%"><stop offset=".11" stop-color="#fff44f"/><stop offset=".46" stop-color="#ff980e"/><stop offset=".72" stop-color="#ff3647"/><stop offset=".9" stop-color="#e31587"/></radialGradient><radialGradient id="i" cx="16.1%" cy="-18.6%" r="348.8%" gradientTransform="scale(1 .47)rotate(84 .28 -.3)"><stop offset="0" stop-color="#fff44f"/><stop offset=".3" stop-color="#ff980e"/><stop offset=".57" stop-color="#ff3647"/><stop offset=".74" stop-color="#e31587"/></radialGradient><radialGradient id="j" cx="18.9%" cy="-42.5%" r="238.4%"><stop offset=".14" stop-color="#fff44f"/><stop offset=".48" stop-color="#ff980e"/><stop offset=".66" stop-color="#ff3647"/><stop offset=".9" stop-color="#e31587"/></radialGradient><radialGradient id="k" cx="159.3%" cy="-44.72%" r="313.1%"><stop offset=".09" stop-color="#fff44f"/><stop offset=".63" stop-color="#ff980e"/></radialGradient><linearGradient id="a" x1="87.25%" y1="15.5%" x2="9.4%" y2="93.1%"><stop offset=".05" stop-color="#fff44f"/><stop offset=".37" stop-color="#ff980e"/><stop offset=".53" stop-color="#ff3647"/><stop offset=".7" stop-color="#e31587"/></linearGradient><linearGradient id="l" x1="80%" y1="14%" x2="18%" y2="84%"><stop offset=".17" stop-color="#fff44f" stop-opacity=".8"/><stop offset=".6" stop-color="#fff44f" stop-opacity="0"/></linearGradient></defs><path d="M478.71 166.35c-10.44-25.12-31.6-52.24-48.21-60.82 13.52 26.5 21.34 53.1 24.33 72.94l.05.4C427.71 111.14 381.63 83.82 344 24.35c-1.9-3-3.8-6.02-5.66-9.2a74 74 0 0 1-2.65-4.97 44 44 0 0 1-3.59-9.5.63.63 0 0 0-.55-.65 1 1 0 0 0-.45 0l-.12.07-.17.1.1-.14c-60.37 35.36-80.85 100.76-82.74 133.49a120.3 120.3 0 0 0-66.14 25.48 71 71 0 0 0-6.22-4.7 111.3 111.3 0 0 1-.68-58.73c-24.68 11.24-43.89 29.01-57.85 44.7h-.1c-9.53-12.06-8.86-51.87-8.32-60.18-.11-.52-7.1 3.63-8.02 4.25a175 175 0 0 0-23.49 20.12 211 211 0 0 0-22.44 26.92l-.01.03.01-.03a203 203 0 0 0-32.25 72.8l-.32 1.59a397 397 0 0 0-2.37 15l-.05.52a229 229 0 0 0-3.9 33.16L16 255.7C16 388.4 123.6 496 256.32 496c118.87 0 217.56-86.29 236.89-199.63.4-3.08.73-6.17 1.09-9.27 4.77-41.21-.53-84.53-15.59-120.75m-277 188.1c1.13.53 2.19 1.12 3.34 1.64l.16.1a126 126 0 0 1-3.5-1.74M454.9 178.92l-.03-.23.04.26z" fill="url(#a)"/><path d="M478.71 166.35c-10.44-25.12-31.6-52.24-48.21-60.82 13.52 26.5 21.34 53.1 24.33 72.94 0-.06.02.05.04.22l.04.26c22.68 61.47 10.32 123.98-7.48 162.18-27.54 59.1-94.21 119.67-198.57 116.71C136.1 454.65 36.76 371 18.22 261.41c-3.38-17.28 0-26.05 1.7-40.08-2.07 10.81-2.86 13.94-3.9 33.15l-.02 1.23C16 388.41 123.6 496 256.32 496c118.87 0 217.56-86.29 236.89-199.63.4-3.08.73-6.17 1.09-9.27 4.77-41.21-.53-84.53-15.59-120.75" fill="url(#b)"/><path d="M478.71 166.35c-10.44-25.12-31.6-52.24-48.21-60.82 13.52 26.5 21.34 53.1 24.33 72.94 0-.06.02.05.04.22l.04.26c22.68 61.47 10.32 123.98-7.48 162.18-27.54 59.1-94.21 119.67-198.57 116.71C136.1 454.65 36.76 371 18.22 261.41c-3.38-17.28 0-26.05 1.7-40.08-2.07 10.81-2.86 13.94-3.9 33.15l-.02 1.23C16 388.41 123.6 496 256.32 496c118.87 0 217.56-86.29 236.89-199.63.4-3.08.73-6.17 1.09-9.27 4.77-41.21-.53-84.53-15.59-120.75" fill="url(#c)"/><path d="M361.92 194.6c.53.37 1 .73 1.5 1.1a131 131 0 0 0-22.31-29.11C266.4 91.89 321.5 4.63 330.8.19l.1-.13c-60.37 35.35-80.85 100.76-82.73 133.48 2.8-.2 5.6-.43 8.44-.43 45.05 0 84.29 24.77 105.3 61.49" fill="url(#d)"/><path d="M256.77 209.51c-.4 5.98-21.51 26.6-28.9 26.6-68.34 0-79.43 41.33-79.43 41.33 3.03 34.81 27.26 63.48 56.61 78.65q2.02 1.02 4.05 1.93a133 133 0 0 0 7.06 2.89 107 107 0 0 0 31.27 6.03c119.78 5.62 142.99-143.2 56.55-186.41 22.13-3.85 45.11 5.05 57.94 14.07-21-36.72-60.25-61.49-105.3-61.49-2.85 0-5.64.24-8.44.43a120.3 120.3 0 0 0-66.14 25.49c3.66 3.1 7.8 7.24 16.51 15.83 16.3 16.06 58.13 32.7 58.22 34.65" fill="url(#e)"/><path d="M256.77 209.51c-.4 5.98-21.51 26.6-28.9 26.6-68.34 0-79.43 41.33-79.43 41.33 3.03 34.81 27.26 63.48 56.61 78.65q2.02 1.02 4.05 1.93a133 133 0 0 0 7.06 2.89 107 107 0 0 0 31.27 6.03c119.78 5.62 142.99-143.2 56.55-186.41 22.13-3.85 45.11 5.05 57.94 14.07-21-36.72-60.25-61.49-105.3-61.49-2.85 0-5.64.24-8.44.43a120.3 120.3 0 0 0-66.14 25.49c3.66 3.1 7.8 7.24 16.51 15.83 16.3 16.06 58.13 32.7 58.22 34.65" fill="url(#f)"/><path d="M170.83 151.04a244 244 0 0 1 4.98 3.3 111.3 111.3 0 0 1-.67-58.74c-24.7 11.25-43.9 29.01-57.85 44.7 1.15-.03 36.01-.66 53.54 10.74" fill="url(#g)"/><path d="M18.22 261.41C36.77 370.99 136.1 454.65 248.86 457.84c104.36 2.96 171.03-57.62 198.57-116.71 17.8-38.2 30.16-100.7 7.48-162.18v-.02l-.04-.24c-.02-.17-.04-.28-.04-.22l.05.4c8.53 55.66-19.79 109.58-64.05 146.04l-.13.31c-86.25 70.23-168.78 42.37-185.49 30.97a144 144 0 0 1-3.5-1.74c-50.28-24.03-71.05-69.84-66.6-109.13-42.45 0-56.93-35.8-56.93-35.8s38.12-27.18 88.36-3.55c46.53 21.9 90.23 3.55 90.23 3.54-.09-1.95-41.92-18.59-58.22-34.65-8.72-8.59-12.85-12.72-16.52-15.83a71 71 0 0 0-6.22-4.7 283 283 0 0 0-4.98-3.3c-17.53-11.4-52.4-10.76-53.55-10.73h-.1c-9.53-12.07-8.86-51.88-8.32-60.19-.11-.51-7.1 3.63-8.02 4.26a175 175 0 0 0-23.49 20.12 211 211 0 0 0-22.44 26.92l-.01.03.01-.03a203 203 0 0 0-32.25 72.8c-.11.52-8.65 37.84-4.44 57.2" fill="url(#h)"/><path d="M341.1 166.59a131 131 0 0 1 22.31 29.1q2.02 1.51 3.61 2.96c54.49 50.2 25.94 121.2 23.81 126.26 44.26-36.46 72.58-90.38 64.05-146.04C427.71 111.14 381.63 83.82 344 24.35c-1.9-3-3.8-6.02-5.66-9.2a74 74 0 0 1-2.65-4.97 44 44 0 0 1-3.59-9.5.63.63 0 0 0-.55-.65 1 1 0 0 0-.45 0l-.12.07-.17.1c-9.3 4.43-64.41 91.7 10.3 166.39" fill="url(#i)"/><path d="M367.02 198.65a47 47 0 0 0-3.6-2.95c-.5-.37-.97-.73-1.5-1.1-12.83-9.01-35.8-17.92-57.94-14.07 86.44 43.22 63.23 192.03-56.55 186.41a107 107 0 0 1-31.27-6.03 135 135 0 0 1-7.06-2.89 91 91 0 0 1-4.05-1.93l.16.1c16.71 11.4 99.24 39.25 185.49-30.97l.13-.31c2.13-5.06 30.68-76.06-23.8-126.26" fill="url(#j)"/><path d="M148.44 277.44s11.1-41.33 79.43-41.33c7.39 0 28.51-20.62 28.9-26.6s-43.7 18.36-90.23-3.54c-50.24-23.63-88.36 3.54-88.36 3.54s14.48 35.81 56.93 35.81c-4.45 39.29 16.32 85.1 66.6 109.13 1.13.53 2.18 1.12 3.34 1.64-29.35-15.17-53.58-43.84-56.61-78.65" fill="url(#k)"/><path d="M478.71 166.35c-10.44-25.12-31.6-52.24-48.21-60.82 13.52 26.5 21.34 53.1 24.33 72.94l.05.4C427.71 111.14 381.63 83.82 344 24.35c-1.9-3-3.8-6.02-5.66-9.2a74 74 0 0 1-2.65-4.97 44 44 0 0 1-3.59-9.5.63.63 0 0 0-.55-.65 1 1 0 0 0-.45 0l-.12.07-.17.1.1-.14c-60.37 35.36-80.85 100.76-82.74 133.49 2.8-.2 5.6-.43 8.45-.43 45.05 0 84.29 24.77 105.3 61.48-12.84-9.01-35.81-17.92-57.95-14.07 86.44 43.22 63.23 192.03-56.55 186.41a107 107 0 0 1-31.27-6.03 135 135 0 0 1-7.06-2.89 91 91 0 0 1-4.05-1.93l.17.1a144 144 0 0 1-3.5-1.74c1.12.53 2.18 1.12 3.33 1.64-29.35-15.17-53.58-43.84-56.6-78.65 0 0 11.08-41.33 79.42-41.33 7.4 0 28.51-20.62 28.9-26.6-.09-1.95-41.91-18.59-58.22-34.65-8.71-8.59-12.85-12.72-16.51-15.83a71 71 0 0 0-6.23-4.7 111.3 111.3 0 0 1-.67-58.73c-24.7 11.24-43.9 29-57.85 44.7h-.11c-9.53-12.07-8.86-51.87-8.32-60.19-.11-.51-7.1 3.63-8.02 4.26a175 175 0 0 0-23.49 20.12 211 211 0 0 0-22.43 26.92l-.01.03.01-.03a203 203 0 0 0-32.25 72.8l-.32 1.59a398 398 0 0 0-2.77 15.15c-.02.18.02-.17 0 0a280 280 0 0 0-3.55 33.53l-.02 1.23C16 388.41 123.6 496 256.32 496c118.87 0 217.56-86.29 236.89-199.63.4-3.08.73-6.17 1.09-9.27 4.77-41.21-.53-84.53-15.59-120.75m-23.84 12.34.04.26v-.02z" fill="url(#l)"/></svg>
`;
export const chromeLogoSVG = `
    <!-- License: MIT. Made by alrra: https://github.com/gilbarbara/logos -->
    <svg width="256px" height="256px" viewBox="0 0 256 256" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" preserveAspectRatio="xMidYMid">
        <g>
            <path d="M128.002654,199.216326 C167.337748,199.216326 199.224237,167.328341 199.224237,127.993248 C199.224237,88.658154 167.337748,56.7701695 128.002654,56.7701695 C88.66756,56.7701695 56.781071,88.658154 56.781071,127.993248 C56.781071,167.328341 88.66756,199.216326 128.002654,199.216326 Z" fill="#FFFFFF"></path>
            <path d="M128.002654,178.677204 C155.986605,178.677204 178.671827,155.99198 178.671827,128.006687 C178.671827,100.021392 155.986605,77.3375132 128.002654,77.3375132 C100.018703,77.3375132 77.333481,100.022736 77.333481,128.006687 C77.333481,155.990637 100.018703,178.677204 128.002654,178.677204 Z" fill="#1A73E8"></path>
            <path d="M35.890016,92.996518 C30.576952,83.7939923 24.3316171,74.1352001 17.1540112,64.0201413 C5.91689083,83.47748 0,105.549915 0,128.020125 C0,150.490334 5.91420317,172.562769 17.1499797,192.020108 C28.3857563,211.477446 44.546676,227.635678 64.0067024,238.86608 C83.4667287,250.096481 105.541852,256.006653 128.010717,256.001571 C139.791711,239.477878 147.790451,227.56439 152.006937,220.261105 C160.105922,206.233028 170.580388,186.149338 183.430335,160.010037 L183.430335,159.995255 C177.81715,169.729972 169.739377,177.814463 160.010037,183.435711 C140.208035,194.876125 115.80601,194.879711 96.0006467,183.445118 C86.2698509,177.826524 78.189991,169.74481 72.5736292,160.012725 C55.1202938,127.463816 42.8924227,105.12508 35.890016,92.996518 Z" fill="#229342"></path>
            <path d="M128.008029,255.995986 C150.476894,255.999935 172.550674,250.08573 192.009357,238.852641 C211.468039,227.619552 227.626271,211.459977 238.85936,191.999951 C250.091893,172.54016 256.003521,150.466219 256,127.99728 C255.995901,105.528414 250.076323,83.4559788 238.836515,63.9999839 C214.588793,61.6102423 196.693555,60.4153715 185.1508,60.4153715 C172.062912,60.4153715 153.012186,61.6102423 127.998622,63.9999839 L127.985184,64.0093907 C139.221488,64.0040515 150.261129,66.957349 159.993911,72.5722861 C169.727283,78.1881586 177.809087,86.2659308 183.428991,95.9966159 C194.866596,115.80088 194.866084,140.203566 183.427647,160.007349 L128.008029,255.995986 Z" fill="#FBC116"></path>
            <path d="M128.002654,64.0040154 L238.840546,64.0040154 C227.608801,44.543989 211.451913,28.3830694 191.993231,17.1472928 C172.535124,5.9122784 150.461968,-0.0017050572 127.993247,1.42108511e-14 C105.524382,1.42108511e-14 83.4519466,5.9182354 63.9959517,17.1566997 C44.5392458,28.3945112 28.3842362,44.5569363 17.1553551,64.0187975 L72.5749731,160.008693 L72.5897552,160.016756 C61.1454971,140.216334 61.1378125,115.813649 72.5695977,96.0060227 C78.1854702,86.2739938 86.2672739,78.1921901 95.997959,72.5749737 C105.728644,66.9577574 116.768221,63.9999839 128.005342,64.0026715 L128.002654,64.0040154 Z" fill="#E33B2E"></path>
        </g>
    </svg>
`;

const preventModificationForObjects = () => {

    const deepFreeze = (obj) => {
        // Retrieve the property names of the object
        const propNames = Object.getOwnPropertyNames(obj);

        // Freeze properties before freezing self
        for (let name of propNames) {
            const value = obj[name];
            // Freeze the value if it is an object
            if (value && typeof value === 'object') {
                deepFreeze(value);
            }
        }

        // Freeze the object itself
        return Object.freeze(obj);
    }

    deepFreeze(defaultBookmarkStyle);
    deepFreeze(defaultFolderStyle);
    deepFreeze(defaultMainUserSettings);
    deepFreeze(defaultUserBookmarks);
    deepFreeze(changelog);
};
preventModificationForObjects();

const getLanguage = async () => {
    try {
        const languageIds = availableLanguages.map(a => a.id);
        if (languageIds.length === 0) {
            throw new Error('No language id found');
        }

        if (!languageIds.includes(currentLanguage)) {
            throw new Error('No language id found');
        }

        const readLocalFile = (file) => {
            return new Promise((resolve, reject) => {
                const rawFile = new XMLHttpRequest();
                rawFile.overrideMimeType("application/json");
                rawFile.open("GET", file, true);
                rawFile.onreadystatechange = () => {
                    if (rawFile.readyState === 4) {
                        if (rawFile.status === 200) {
                            resolve(rawFile.responseText);
                        } else {
                            currentLanguage = 'en-US';
                            showMessageToastify('error', ``, `Failed to load selected language. Changing to default 'en-US'.`, 4000, false, 'bottom', 'right', true);
                            reject(new Error(`Failed to load file: ${file}`));
                        }
                    }
                };
                rawFile.send(null);
            });
        };

        const location = `${filesLocationFromThis.language}${currentLanguage}.lang`;
        const fileContent = await readLocalFile(location);
        const languageObj = JSON.parse(fileContent);

        if (Object.keys(languageObj).length === 0) {
            throw new Error('No language JSON found');
        }

        currentLanguageTextObj = languageObj;
        const saveLanguageToStorage = await indexedDBManipulation('save', 'language', languageObj);
        if (!saveLanguageToStorage) {
            throw new Error('Failed to save language');
        }
    } catch (error) {
        console.error("Error loading language text:", error);
    }
};

/**
 * Registers user activity based on the provided status and action.
 *
 * @param {string} status - The status of the activity ('save', 'delete', 'get').
 * @param {string} action - The action being performed (e.g., 'createProfile', 'deleteProfile').
 * @param {Object} data - The data associated with the action.
 * @param {string} [profileName=''] - The name of the profile (optional).
 * @returns {boolean|Object|undefined} - Returns false if user profile is not found,
 *                                       returns the current profile if status is 'get',
 *                                       otherwise returns undefined.
 * @description This function logs user activities such as creating profiles, bookmarks,
 *              and folders, and saves or deletes these logs based on the provided status.
 *              It also handles errors and ensures that only allowed actions are processed.
 */
export const userActivityRegister = async (status, action, data, profileName = '') => {
    try {
        // Check if user profile exists in local storage
        if (!await indexedDBManipulation('has', 'userProfile')) { return false }

        // List of allowed actions
        const allowedActions = ['createProfile', 'deleteProfile', 'openExtension', 'closeExtension', 'createBookmark', 'createFolder', 'editBookmark', 'editFolder', 'deleteBookmark', 'deleteFolder', 'getAllLog', 'deleteLogById', 'deleteLogAll'];

        // Validate the action
        if (!allowedActions.includes(action)) { throw Error('Wrong action') }

        // Check if the action is allowed based on user settings
        if (action != 'getAllLog' && action != 'deleteLogById' && action != 'deleteLogAll') {
            const objActivity = userProfileExport?.mainUserSettings?.main?.allowUserActivity === undefined ? defaultMainUserSettings.main.allowUserActivity.filter(activity => activity.action == action) : userProfileExport.mainUserSettings.main.allowUserActivity.filter(activity => activity.action == action);
            if (objActivity[0].action == action && !objActivity[0].status) { return }
        }

        // Generate a timestamp in ISO format
        const timestampISO = new Date().toISOString();
        let currentUserActivities = [];
        const userId = userActiveProfile.userId;

        // Log an error if user ID is not found
        if (userId === undefined) throw Error('User ID not found');

        // Find or initialize user activity log
        if (userProfileExport.userActivityLog.length > 0) {
            currentUserActivities = userProfileExport.userActivityLog[0];
        } else {
            userProfileExport.userActivityLog = [
                {
                    userId: userId,
                    activities: [],
                }
            ];
            currentUserActivities = userProfileExport.userActivityLog[0];
        }

        // Handle different statuses and actions
        if (status == 'save') {
            switch (action) {
                case 'createProfile':
                    currentUserActivities.activities.push(
                        {
                            action: 'createProfile',
                            actionId: 1,
                            id: generateRandomID(20, false, true, false),
                            timestamp: timestampISO,
                            details: {
                                os: browserAndOSInfo.os.name,
                                browser: {
                                    name: browserAndOSInfo.browser.name,
                                    version: browserAndOSInfo.browser.version,
                                },
                                userId: data,
                                profileName: profileName,
                            }
                        }
                    );
                    break;
                case 'deleteProfile':
                    currentUserActivities.activities.push(
                        {
                            action: 'deleteProfile',
                            actionId: 2,
                            id: generateRandomID(20, false, true, false),
                            timestamp: timestampISO,
                            details: {
                                os: browserAndOSInfo.os.name,
                                browser: {
                                    name: browserAndOSInfo.browser.name,
                                    version: browserAndOSInfo.browser.version,
                                },
                                userId: data,
                                profileName: profileName,
                            }
                        }
                    );
                    break;
                case 'openExtension':
                    currentUserActivities.activities.push(
                        {
                            action: 'openExtension',
                            actionId: 3,
                            id: generateRandomID(20, false, true, false),
                            timestamp: timestampISO,
                            details: {
                                os: browserAndOSInfo.os.name,
                                browser: {
                                    name: browserAndOSInfo.browser.name,
                                    version: browserAndOSInfo.browser.version,
                                },
                            }
                        }
                    );
                    break;
                case 'closeExtension':
                    currentUserActivities.activities.push(
                        {
                            action: 'closeExtension',
                            actionId: 4,
                            id: generateRandomID(20, false, true, false),
                            timestamp: timestampISO,
                            details: {
                                os: browserAndOSInfo.os.name,
                                browser: {
                                    name: browserAndOSInfo.browser.name,
                                    version: browserAndOSInfo.browser.version,
                                },
                            }
                        }
                    );
                    break;
                case 'createBookmark':
                    currentUserActivities.activities.push(
                        {
                            action: 'createBookmark',
                            actionId: 5,
                            id: generateRandomID(20, false, true, false),
                            timestamp: timestampISO,
                            details: {
                                os: browserAndOSInfo.os.name,
                                browser: {
                                    name: browserAndOSInfo.browser.name,
                                    version: browserAndOSInfo.browser.version,
                                },
                                bookmark: {
                                    id: data.id,
                                    title: data.title,
                                }
                            }
                        }
                    );
                    break;
                case 'createFolder':
                    currentUserActivities.activities.push(
                        {
                            action: 'createFolder',
                            actionId: 6,
                            id: generateRandomID(20, false, true, false),
                            timestamp: timestampISO,
                            details: {
                                os: browserAndOSInfo.os.name,
                                browser: {
                                    name: browserAndOSInfo.browser.name,
                                    version: browserAndOSInfo.browser.version,
                                },
                                folder: {
                                    id: data.id,
                                    title: data.title,
                                }
                            }
                        }
                    );
                    break;
                case 'editBookmark':
                    currentUserActivities.activities.push(
                        {
                            action: 'editBookmark',
                            actionId: 7,
                            id: generateRandomID(20, false, true, false),
                            timestamp: timestampISO,
                            details: {
                                os: browserAndOSInfo.os.name,
                                browser: {
                                    name: browserAndOSInfo.browser.name,
                                    version: browserAndOSInfo.browser.version,
                                },
                            }
                        }
                    );
                    break;
                case 'editFolder':
                    currentUserActivities.activities.push(
                        {
                            action: 'editFolder',
                            actionId: 8,
                            id: generateRandomID(20, false, true, false),
                            timestamp: timestampISO,
                            details: {
                                os: browserAndOSInfo.os.name,
                                browser: {
                                    name: browserAndOSInfo.browser.name,
                                    version: browserAndOSInfo.browser.version,
                                },
                            }
                        }
                    );
                    break;
                case 'deleteBookmark':
                    currentUserActivities.activities.push(
                        {
                            action: 'deleteBookmark',
                            actionId: 9,
                            id: generateRandomID(20, false, true, false),
                            timestamp: timestampISO,
                            details: {
                                os: browserAndOSInfo.os.name,
                                browser: {
                                    name: browserAndOSInfo.browser.name,
                                    version: browserAndOSInfo.browser.version,
                                },
                                bookmark: {
                                    id: data.id,
                                    title: data.title,
                                }
                            }
                        }
                    );
                    break;
                case 'deleteFolder':
                    currentUserActivities.activities.push(
                        {
                            action: 'deleteFolder',
                            actionId: 10,
                            id: generateRandomID(20, false, true, false),
                            timestamp: timestampISO,
                            details: {
                                os: browserAndOSInfo.os.name,
                                browser: {
                                    name: browserAndOSInfo.browser.name,
                                    version: browserAndOSInfo.browser.version,
                                },
                                folder: {
                                    id: data.id,
                                    title: data.title,
                                }
                            }
                        }
                    );
                    break;
                default:
                    throw Error('wrong action');
            }
            // Save user activity log
            userActiveProfile.userActivityLog = userProfileExport.userActivityLog;
            const saveStatus = await manageUserProfiles('save');
            if (!saveStatus) {
                throw Error('failed to save user profile');
            }
        } else if (status == 'delete' && action == 'deleteLogById') {
            // Delete specific activity log by ID
            userProfileExport.userActivityLog.forEach(profile => {
                if (profile.userId == userId) {
                    const deleteActivity = profile.activities.filter(a => a.id != data);
                    profile.activities = deleteActivity;
                }
            });
            userActiveProfile.userActivityLog = userProfileExport.userActivityLog;
            const saveStatus = await manageUserProfiles('save');
            if (!saveStatus) {
                throw Error('failed to save user profile');
            }
        } else if (status == 'delete' && action == 'deleteLogAll') {
            // Delete all activity logs for the user
            userProfileExport.userActivityLog.forEach(profile => {
                if (profile.userId == userId) {
                    profile.activities = [];
                }
            });
            userActiveProfile.userActivityLog = userProfileExport.userActivityLog;
            const saveStatus = await manageUserProfiles('save');
            if (!saveStatus) {
                throw Error('failed to save user profile');
            }
        } else if (status == 'get') {
            // Get the current profile's activity log
            let currentProfile = {};
            userProfileExport.userActivityLog.forEach(profile => {
                if (profile.userId == userId) {
                    currentProfile = window.structuredClone(profile);
                }
            });
            currentProfile.activities.reverse();
            return currentProfile;
        }
    } catch (error) {
        console.error(error);
    }
}

/**
 * A function that handles user activities and profile management.
 * It logs various actions performed by the user (e.g., edit and delete)
 * and updates the user's activity log in their profile.
 * Throws an error if the action is invalid or if the profile save fails.
 */
const manageUserProfileActivity = () => {
    /**
    * Initializes and assigns a mousemove event listener to the document.
    * This event listener updates the `currentMousePos` object with the current mouse
    * position (x and y coordinates) whenever the mouse is moved across the document.
    */
    const getMousePosFn = () => {
        $(document).mousemove(e => {
            currentMousePos.x = e.clientX;
            currentMousePos.y = e.clientY;
        });
    }
    getMousePosFn();

    /**
     * Binds a right-click (context menu) event to the entire document.
     * This function checks if the right-clicked element's ID is listed in either the default or bookmark context menu activation IDs.
     * If a match is found, it creates a context menu specific to the element type (default or bookmark).
     * Otherwise, it prevents the default context menu from showing.
     */
    $(document).bind("contextmenu", (e) => {
        if (e.target.id == '') {
            console.log('className: ', e.target.className);
        } else if (e.target.id != '') {
            console.log('ID: ', e.target.id);
        } else {
            console.log('Error get ID or ClassName of element: ', e.target);
        }
        if (contextMenuActiveOnIds.default.includes(e.target.id)) {
            createContextMenu(true, 'default');
            userProfileExport.currentIdToEdit = null;
            return false;
        } else if (contextMenuActiveOnIds.bookmark.includes(e.target.id)) {
            if (e.target.dataset.id != undefined && e.target.dataset.id != null) {
                userProfileExport.currentIdToEdit = e.target.dataset.id;
            } else {
                userProfileExport.currentIdToEdit = null;
                console.error('Failed to get obj id');
            }
            createContextMenu(true, 'bookmark');
            return false;
        } else {
            createContextMenu(false, 'clean');
            return false;
        }
    });

    /**
     * Binds a click event to the entire document.
     * This function checks if the clicked element's ID is listed in either the default or bookmark context menu activation IDs.
     * If a match is found, it closes any open context menu.
     * This ensures that the context menu is closed when the user clicks on an element that should trigger a context menu or anywhere else on the document.
     */
    $(document).bind('click', (e) => {
        const interactiveGuideEl = document.getElementById('interactiveGuide');
        if (showProfileMenuStatus && e.target.id != 'profileImage' && interactiveGuideEl === null) {
            showProfileMenu();
        }
        createContextMenu(false, 'clean');
        if (contextMenuActiveOnIds.default.includes(e.target.id)) {
            e.preventDefault(); // Prevent the default action
            e.stopPropagation(); // Stop the event from propagating further
            createContextMenu(false, 'clean');
            return false;
        } else if (contextMenuActiveOnIds.bookmark.includes(e.target.id)) {
            e.preventDefault(); // Prevent the default action
            e.stopPropagation(); // Stop the event from propagating further
            createContextMenu(false, 'clean');
            userProfileExport.currentFolderId = e.target.dataset.id;
            if (userProfileExport.currentFolderId.length === 0) { console.error('Error to get folder ID'); return; }
            currentObject = findBookmarkByKey(userProfileExport.currentUserBookmarks, userProfileExport.currentFolderId);
            if (currentObject == null) { console.error('Error to get folder Obj'); return; }
            if (currentObject.type == 'folder') {
                createCurrentBookmarkFolder();
            } else if (currentObject.type == 'bookmark' && currentObject.url.length > 0) {
                openUrl(currentObject.url, e.ctrlKey);
                userProfileExport.currentFolderId = currentObject.parentId;
            }
            return false;
        }
    });

    /**
    * Binds a blur event to the entire document.
    * This function ensures that the custom context menu is closed when the document loses focus.
    * It calls the `createContextMenu` function with a false parameter to remove the context menu.
    */
    $(document).bind('blur', () => {
        const interactiveGuideEl = document.getElementById('interactiveGuide');
        if (interactiveGuideEl !== null) { return; }
        createContextMenu(false, 'clean');
        if (showProfileMenuStatus) {
            showProfileMenu();
        }
    });

    /**
    * Intercepts key events and performs specific actions based on the key combinations pressed.
    *
    * @param event - The keyboard event object.
    * @returns {boolean} - Returns true to allow the key event to propagate, or false to prevent the default action.
    */
    const interceptKeys = (event) => {
        try {
            const { keyCode, shiftKey, ctrlKey, altKey, key } = event;
            const isShiftDown = shiftKey;
            const isCtrlDown = ctrlKey;
            const arrayOfId = ['searchWindow', 'mainWindowBody', 'mainWindowDeleteBody', 'undoManager', 'settingsWindow'];

            const allElementsExistById = (ids, returnExistingIds = false) => {
                // Create an array to hold existing IDs if returnExistingIds is true
                const existingIds = [];
                const existBoolean = [];

                // Check if all elements with the given IDs exist in the DOM
                ids.forEach(id => {
                    const element = document.getElementById(id);
                    if (element !== null) {
                        if (returnExistingIds) {
                            existingIds.push(id);
                        }
                        existBoolean.push(true);
                    } else {
                        existBoolean.push(false);
                    }
                });

                // If returnExistingIds is true, return the array of existing IDs; otherwise, return the boolean
                return returnExistingIds ? existingIds : existBoolean.some(boolean => boolean === true);
            };

            // console.log(`Key pressed: ${keyCode}, Shift: ${isShiftDown}, Ctrl: ${isCtrlDown}, Alt: ${altKey}`);

            // Check for backspace
            if (keyCode === 8) return false;

            // Check for Alt+Gr (http://en.wikipedia.org/wiki/AltGr_key)
            if (isCtrlDown && altKey) return true;

            // Handle Ctrl + f (keyCode 70)
            if (isCtrlDown && keyCode === 70) {
                event.preventDefault();
                if (allElementsExistById(arrayOfId)) {
                    showMessageToastify('warning', '', `Please close the currently open window before proceeding to open a new one.`, 4000, false, 'bottom', 'right', true, false);
                    return;
                }
                searchManager('open');
                return false;
            };

            // Handle Escape key (keyCode 27)
            if (keyCode === 27) {
                event.preventDefault();
                const searchExistElements = allElementsExistById(arrayOfId, true);
                if (searchExistElements.includes('mainWindowBody')) {
                    createAndEditBookmarksWindow('close');
                }
                if (searchExistElements.includes('searchWindow')) {
                    searchManager('close');
                }
                if (searchExistElements.includes('mainWindowDeleteBody')) {
                    $('#uiElementsContainer').css('display', 'none').html('');
                }
                if (showProfileMenuStatus) {
                    showProfileMenu();
                }
                if (settingWindowOpen.status) {
                    openCloseSettingWindow('close');
                    settingWindowOpen.status = false;
                }
                if (searchExistElements.includes('undoManager')) {
                    undoManager('closeUndoManagerUi');
                }
                return false;
            }

            // Handle Ctrl + Shift + B (keyCode 66)
            if (isCtrlDown && isShiftDown && keyCode === 66) {
                event.preventDefault();
                if (allElementsExistById(arrayOfId)) {
                    showMessageToastify('warning', '', `Please close the currently open window before proceeding to open a new one.`, 4000, false, 'bottom', 'right', true, false);
                    return;
                }
                createAndEditBookmarksWindow('default', 'newBookmark');
                if (showProfileMenuStatus) {
                    showProfileMenu();
                }
                return false;
            }

            // Handle Ctrl + Shift + N (keyCode 78)
            if (isCtrlDown && isShiftDown && keyCode === 78) {
                event.preventDefault();
                if (allElementsExistById(arrayOfId)) {
                    showMessageToastify('warning', '', `Please close the currently open window before proceeding to open a new one.`, 4000, false, 'bottom', 'right', true, false);
                    return;
                }
                createAndEditBookmarksWindow('default', 'newFolder');
                if (showProfileMenuStatus) {
                    showProfileMenu();
                }
                return false;
            }

            // Handle Ctrl + P (keyCode 80)
            if (isCtrlDown && keyCode === 80) {
                event.preventDefault();
                if (allElementsExistById(arrayOfId)) {
                    showMessageToastify('warning', '', `Please close the currently open window before proceeding to open a new one.`, 4000, false, 'bottom', 'right', true, false);
                    return;
                }
                settingWindowOpen.status ? openCloseSettingWindow('close') : openCloseSettingWindow('open', 'default');
                if (showProfileMenuStatus) {
                    showProfileMenu();
                }
                return false;
            }

            // check for Ctrl + Shift + Z to show the Undo Manager
            if (isCtrlDown && isShiftDown && keyCode === 90) {
                event.preventDefault();
                if (allElementsExistById(arrayOfId)) {
                    showMessageToastify('warning', '', `Please close the currently open window before proceeding to open a new one.`, 4000, false, 'bottom', 'right', true, false);
                    return;
                }
                undoManager('showUndoManagerUi');
                if (showProfileMenuStatus) {
                    showProfileMenu();
                }
            }

            // Allow other keys
            return true;
        } catch (error) {
            console.error('Error intercepting keys:', error);
            return true; // Allow keys if there's an error
        }
    };
    // Add the interceptKeys function as an event listener for keydown events on the body element
    document.querySelector('body').addEventListener('keydown', interceptKeys);

    const generateColorPaletteBasedOnUserColor = () => {
        let userColor = '';
        if (userActiveProfile.mainUserSettings !== undefined) {
            userColor = userActiveProfile.mainUserSettings.windows.window.backgroundColor;
        } else {
            userColor = defaultMainUserSettings.windows.window.backgroundColor;
        }
        colorPalette = generateColorPalette(userColor, 20);
    }
    generateColorPaletteBasedOnUserColor();

    /**
     * @description Sets the profile menu icon and its click event handler.
     * It updates the profile menu HTML and sets the background image for the profile icon.
     * When the profile image is clicked, it checks if certain windows are not open and then shows the profile menu.
     * @default Sets the profile image to the user's active profile image or a default image if not available.
     */
    const setProfileMenuIcon = async () => {
        let settingHtml = `
            <div id="profileImage"></div>
            <div id="profileMenuHeader">
                <div id="profileUserName"></div>
            </div>
            <div id="profileMenuBody"></div>
        `;
        // Set the HTML content of the profile menu
        $('#profileMenu').html(settingHtml);
        // Set the background image of the profile image element
        $('#profileImage').css('background', `url(${userActiveProfile.image ? userActiveProfile.image : defaultProfileImageBase64}) center center / cover no-repeat`);
        // Remove any existing click event handlers and add a new one
        $('#profileImage').off().on('click', () => {
            const settingsWindowEl = document.getElementById('settingsWindow') || null;
            const mainWindowBodyEl = document.getElementById('mainWindowBody') || null;
            const mainWindowDeleteBodyEl = document.getElementById('mainWindowDeleteBody') || null;
            // Check if certain windows are not open before showing the profile menu
            if (settingsWindowEl == null && mainWindowBodyEl == null && mainWindowDeleteBodyEl == null) {
                showProfileMenu();
            }
        });
    };
    // Initialize the profile menu icon
    setProfileMenuIcon();
}

/**
 * Adds a scroll event listener to the bookmarks body element and detects if the scroll position has changed.
 * This is used to detect if the user is scrolling or not.
 * @description Adds a scroll event listener to the bookmarks body element and detects if the scroll position has changed.
 * @returns {void}
 */
const addScrollListener = () => {
    let lastScrollTop = 0; // Track the last vertical scroll position
    let lastScrollLeft = 0; // Track the last horizontal scroll position

    /**
     * Detects a scroll event and checks if the scroll position has changed.
     * @description Detects a scroll event and checks if the scroll position has changed.
     * @param {object} event - The event object that triggered the scroll event
     * @returns {void}
     */
    const detectScroll = (event) => {
        const target = event.target; // The element that triggered the scroll event
        const currentScrollTop = target.scrollTop; // Current vertical scroll position
        const currentScrollLeft = target.scrollLeft; // Current horizontal scroll position

        // Check if the scroll position has changed
        const isScrolling = (currentScrollTop !== lastScrollTop || currentScrollLeft !== lastScrollLeft);

        // Update the last scroll positions
        lastScrollTop = currentScrollTop;
        lastScrollLeft = currentScrollLeft;

        if (isScrolling) {
            createContextMenu(false, 'clean'); // Clean the context menu
            if (showProfileMenuStatus) {
                showProfileMenu(); // Hide the profile menu
            }
        }
    };

    const bookmarksBodyEl = document.getElementById('bookmarksBody'); // Select the bookmarks body element

    // Add a scroll event listener if the bookmarks body element is scrollable
    const isScrollable = bookmarksBodyEl.scrollHeight > bookmarksBodyEl.clientHeight || bookmarksBodyEl.scrollWidth > bookmarksBodyEl.clientWidth;
    if (isScrollable) {
        bookmarksBodyEl.addEventListener('scroll', detectScroll);
    }
}

const firstLoadWelcomeWindow = () => {
    const uiElementsContainerEl = document.getElementById('uiElementsContainer');
    const checkImage = `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAtElEQVR4nO2VQQ6CMBBF34ob2HgWPZ+gx3JlDLqBhRegXqOGZEhIQwc7aFzIS2bV4b8OJAOsZFIAJ+AJhMzyQCUZSY6G4BBVqQm8NO1yRwf2o0mSDLewEuae/y+BA+7A+RsCB7TSe10iuAA3CZwKb6OzbEEdBWnhJoGLArVwk6BnAzSjswewZRrzR3byuurEzRcL3uX3Ai8N/eKyLrtOa6o+sK4PmqAQyTBJyKhOwtUfzgoxLwfakVQhcKR+AAAAAElFTkSuQmCC"></img>`;
    let allowAnimation = true;
    let allowGuide = true;
    let uiElementsContainerElHtml = `
        <div id="particlesJs"></div>
        <div id="firstLoadWelcomeWindow">
            <div id="windowHeaderSection">
                <div id="extension">
                    <div id="extensionLogo">
                        <img src="../icons/extensionsLogo/icon-48.png" alt="">
                    </div>
                    <div id="extensionName">Bookmark Manager Pro</div>
                </div>
            </div>
            <div id="windowBodySection">
                <div id="welcomeMessage">
                    <div id="messageTop">
                        Effortlessly manage your bookmarks with a powerful, user-friendly interface that feels just like your OS file manager. Whether you have a handful or hundreds of bookmarks, Bookmark Manager Pro is designed to keep your browser organized and efficient.
                    </div>
                    <div id="messageMiddleOne">
                        <div id="middleOneLeft">
                            <img src='${contextMenuItems.default[0].icon}' id="bookmark"></img>
                            <img src='${contextMenuItems.default[1].icon}' id="folder"></img>
                        </div>
                        <div id="middleOneRight">Create, Edit, Delete: Seamlessly manage your bookmarks and folders with intuitive controls.</div>
                    </div>
                    <div id="messageMiddleTwo" style="display: none;">
                        <div id="middleTwoLeft">Cross-Browser Sync: Synchronize your bookmarks between Firefox and Chrome using reliable online services like Google or Microsoft.</div>
                        <div id="middleTwoRight">
                        <img src='' id="firefox"></img>
                        <img src='' id="chrome"></img>
                        </div>
                    </div>
                    <div id="messageMiddleThree">To get started, please enter your name to create an offline profile. This profile can be personalized and modified later to suit your needs.</div>
                    <div id="messageMiddleFour">
                        <div id="userName">
                            <title for="userNameInput" id="userNameTitle">Name</title>
                            <input type="text" id="userNameInput">
                        </div>
                        <div id="userLanguage">
                            <div id="language"></div>
                        </div>
                    </div>
                    <div id="messageMiddleFive">Start organizing your bookmarks now and experience the efficiency of Bookmark Manager Pro.</div>
                </div>
            </div>
            <div id="windowFooterSection">
                <div id="animationAndGuideCheckbox">
                    <div id="animationCheckbox">
                        <label class="toggle" for="disableAnimation">
                            <div id="animationCheckboxTitle">Animation</div>
                            <input type="checkbox" class="toggleAllInput" id="disableAnimation" ${allowAnimation ? 'checked' : ''} />
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
                    <div id="guideCheckbox">
                        <label class="toggle" for="disableGuide">
                            <div id="guideCheckboxTitle">Guide</div>
                            <input type="checkbox" class="toggleAllInput" id="disableGuide" ${allowGuide ? 'checked' : ''} />
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
                <div id="buttonSection">
                    <button id="continueBtn">Continue</button>
                </div>
            </div>
            <svg id="waveTop" viewBox="0 0 1440 390" xmlns="http://www.w3.org/2000/svg" class="transition duration-300 ease-in-out delay-150">
                <defs>
                    <linearGradient id="gradientTop" x1="0%" y1="50%" x2="100%" y2="50%">
                        <stop offset="5%" class="gradientColor1" stop-color="#F78DA7"></stop>
                        <stop offset="95%" class="gradientColor2" stop-color="#8ED1FC"></stop>
                    </linearGradient>
                </defs>
                <path d="M 0,400 L 0,75 C 101.57142857142858,67.17857142857143 203.14285714285717,59.35714285714286 312,64 C 420.85714285714283,68.64285714285714 537.0000000000001,85.75 655,81 C 772.9999999999999,76.25 892.8571428571429,49.642857142857146 1024,45 C 1155.142857142857,40.357142857142854 1297.5714285714284,57.67857142857143 1440,75 L 1440,400 L 0,400 Z" stroke="none" stroke-width="0" fill="url(#gradientTop)" fill-opacity="0.4" class="pathTop-0" transform="rotate(-180 720 200)"></path>
                <path d="M 0,400 L 0,175 C 124.92857142857142,185.5 249.85714285714283,196 377,188 C 504.14285714285717,180 633.5000000000001,153.5 752,158 C 870.4999999999999,162.5 978.1428571428571,198 1091,206 C 1203.857142857143,214 1321.9285714285716,194.5 1440,175 L 1440,400 L 0,400 Z" stroke="none" stroke-width="0" fill="url(#gradientTop)" fill-opacity="0.53" class="pathTop-1" transform="rotate(-180 720 200)"></path>
                <path d="M 0,400 L 0,275 C 92.5,291.6428571428571 185,308.2857142857143 307,311 C 429,313.7142857142857 580.5,302.5 706,288 C 831.5,273.5 931,255.71428571428572 1049,253 C 1167,250.28571428571428 1303.5,262.6428571428571 1440,275 L 1440,400 L 0,400 Z" stroke="none" stroke-width="0" fill="url(#gradientTop)" fill-opacity="1" class="pathTop-2" transform="rotate(-180 720 200)"></path>
            </svg>
            <svg id="waveBottom" viewBox="0 0 1440 390" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="gradientBottom1" x1="79%" y1="91%" x2="21%" y2="9%">
                        <stop offset="5%" class="gradientColorBottom1" stop-color="#1a2a6c"></stop>
                        <stop offset="50%" class="gradientColorBottom2" stop-color="#b21f1f"></stop>
                        <stop offset="95%" class="gradientColorBottom3" stop-color="#0693e3"></stop>
                    </linearGradient>
                </defs>
                <path d="M 0,400 L 0,75 C 62.69487179487183,69.7705128205128 125.38974358974366,64.54102564102563 218,74 C 310.61025641025634,83.45897435897437 433.1358974358974,107.60641025641027 521,142 C 608.8641025641026,176.39358974358973 662.0666666666668,221.0333333333333 736,244 C 809.9333333333332,266.9666666666667 904.5974358974356,268.26025641025643 976,285 C 1047.4025641025644,301.73974358974357 1095.5435897435898,333.925641025641 1169,364 C 1242.4564102564102,394.074358974359 1341.228205128205,422.0371794871795 1440,450 L 1440,400 L 0,400 Z" stroke="none" stroke-width="0" fill="url(#gradientBottom1)" fill-opacity="0.4" class="pathBottom-0"></path>
                <defs>
                    <linearGradient id="gradientBottom2" x1="79%" y1="91%" x2="21%" y2="9%">
                        <stop offset="5%" class="gradientColorBottom4" stop-color="#9900ef"></stop>
                        <stop offset="50%" class="gradientColorBottom5" stop-color="#b21f1f"></stop>
                        <stop offset="95%" class="gradientColorBottom6" stop-color="#0693e3"></stop>
                    </linearGradient>
                </defs>
                <path d="M 0,400 L 0,175 C 59.25641025641022,149.78333333333333 118.51282051282044,124.56666666666666 211,145 C 303.48717948717956,165.43333333333334 429.2051282051283,231.51666666666665 505,261 C 580.7948717948717,290.48333333333335 606.6666666666666,283.3666666666667 687,292 C 767.3333333333334,300.6333333333333 902.1282051282051,325.0166666666667 984,365 C 1065.871794871795,404.9833333333333 1094.8205128205127,460.5666666666666 1162,494 C 1229.1794871794873,527.4333333333334 1334.5897435897436,538.7166666666667 1440,550 L 1440,400 L 0,400 Z" stroke="none" stroke-width="0" fill="url(#gradientBottom2)" fill-opacity="0.53" class="pathBottom-1"></path>
                <defs>
                    <linearGradient id="gradientBottom3" x1="79%" y1="91%" x2="21%" y2="9%">
                        <stop offset="5%" class="gradientColorBottom7" stop-color="#9900ef"></stop>
                        <stop offset="50%" class="gradientColorBottom8" stop-color="#b21f1f"></stop>
                        <stop offset="95%" class="gradientColorBottom9" stop-color="#0693e3"></stop>
                    </linearGradient>
                </defs>
                <path d="M 0,400 L 0,275 C 88.9025641025641,275.3115384615385 177.8051282051282,275.6230769230769 262,283 C 346.1948717948718,290.3769230769231 425.68205128205125,304.8192307692308 490,324 C 554.3179487179488,343.1807692307692 603.4666666666667,367.09999999999997 682,399 C 760.5333333333333,430.90000000000003 868.4512820512821,470.78076923076924 967,495 C 1065.548717948718,519.2192307692308 1154.728205128205,527.7769230769231 1232,551 C 1309.271794871795,574.2230769230769 1374.6358974358975,612.1115384615384 1440,650 L 1440,400 L 0,400 Z" stroke="none" stroke-width="0" fill="url(#gradientBottom3)" fill-opacity="1" class="pathBottom-2"></path>
            </svg>
        </div>
    `;
    uiElementsContainerEl.style.display = 'flex';
    uiElementsContainerEl.innerHTML = uiElementsContainerElHtml;

    const createParticles = (status) => {
        try {
            if (![true, false].includes(status)) throw Error('Wrong status. Only true or false');
            if (!status) {
                const particlesJsEl = document.getElementById('particlesJs');
                particlesJsEl.innerHTML = '';
                return;
            }
            const moveDirectionArray = ["top", "top-right", "right", "bottom-right", "bottom", "bottom-left", "left", "top-left"];
            const randomElementFromArray = new returnRandomElementFromArray(moveDirectionArray);
            const moveDirection = randomElementFromArray.returnRandomElementFromArray();
            const numberOfParticles = randomIntFromInterval(40, 80);
            let colorArray = [];

            for (let i = 0; i < clamp(Math.floor(numberOfParticles / 3), 10, 50); i++) {
                colorArray.push(getRandomColor());
            }

            particlesJS("particlesJs", {
                particles: {
                    number: {
                        value: numberOfParticles,
                        density: {
                            enable: true,
                            value_area: 800
                        }
                    },
                    color: {
                        value: colorArray
                    },
                    shape: {
                        type: "circle",
                        stroke: {
                            width: 0,
                            color: "#000000"
                        },
                        polygon: {
                            nb_sides: 5
                        },
                        image: {
                            src: "img/github.svg",
                            width: 100,
                            height: 100
                        }
                    },
                    opacity: {
                        value: 0.5,
                        random: true,
                        anim: {
                            enable: true,
                            speed: 1,
                            opacity_min: 0.1
                        }
                    },
                    size: {
                        value: 5,
                        random: true,
                        anim: {
                            enable: true,
                            speed: 20,
                            size_min: 0.1
                        }
                    },
                    line_linked: {
                        enable: false
                    },
                    move: {
                        enable: true,
                        speed: randomIntFromInterval(2, 80),
                        direction: moveDirection,
                        random: false,
                        straight: true,
                        out_mode: "out",
                        bounce: false,
                        attract: {
                            enable: false,
                            rotateX: 600,
                            rotateY: 1200
                        }
                    }
                },
                interactivity: {
                    detect_on: "canvas",
                    events: {
                        onhover: {
                            enable: false
                        },
                        onclick: {
                            enable: true,
                            mode: "push"
                        },
                        resize: true
                    },
                    modes: {
                        grab: {
                            distance: 400,
                            line_linked: {
                                opacity: 1
                            }
                        },
                        bubble: {
                            distance: 400,
                            size: 40,
                            duration: 2,
                            opacity: 8,
                            speed: 3
                        },
                        repulse: {
                            distance: 200,
                            duration: 0.4
                        },
                        push: {
                            particles_nb: 4
                        },
                        remove: {
                            particles_nb: 2
                        }
                    }
                },
                retina_detect: true
            });

            gsap.fromTo('#uiElementsContainer', {
                backgroundColor: getRandomHexColorByType('dark', 85),
            }, {
                backgroundColor: getRandomHexColorByType('dark', 80),
                duration: 10,
                ease: "power2.inOut",
                repeat: -1,
                yoyo: true
            });

        } catch (error) {
            console.error('Error in createParticles', error);
        }
    }

    const welcomeWindowAnimation = () => {
        const firstLoadWelcomeWindowEl = document.getElementById('firstLoadWelcomeWindow');
        gsap.to(firstLoadWelcomeWindowEl, {
            duration: 1,
            width: 800,
            height: 600,
            opacity: 1,
            ease: 'power2.inOut',
            onComplete: () => { createParticles(allowAnimation); }
        });
    }
    welcomeWindowAnimation();

    const updateWelcomeWindowTitlesUI = () => {
        const extensionNameEl = document.getElementById('extensionName');
        const messageTopEl = document.getElementById('messageTop');
        const middleOneRightEl = document.getElementById('middleOneRight');
        const middleTwoLeftEl = document.getElementById('middleTwoLeft');
        const messageMiddleThreeEl = document.getElementById('messageMiddleThree');
        const userNameTitleEl = document.getElementById('userNameTitle');
        const messageMiddleFiveEl = document.getElementById('messageMiddleFive');
        const animationCheckboxTitleEl = document.getElementById('animationCheckboxTitle');
        const guideCheckboxTitleEl = document.getElementById('guideCheckboxTitle');
        const continueBtnEl = document.getElementById('continueBtn');

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
        updateTextContent(extensionNameEl, currentLanguageTextObj._welcomeWindow.extensionName);
        updateTextContent(messageTopEl, currentLanguageTextObj._welcomeWindow.messageTop);
        updateTextContent(middleOneRightEl, currentLanguageTextObj._welcomeWindow.middleOneRight);
        updateTextContent(middleTwoLeftEl, currentLanguageTextObj._welcomeWindow.middleTwoLeft);
        updateTextContent(messageMiddleThreeEl, currentLanguageTextObj._welcomeWindow.messageMiddleThree);
        updateTextContent(userNameTitleEl, currentLanguageTextObj._welcomeWindow.userNameTitle);
        updateTextContent(messageMiddleFiveEl, currentLanguageTextObj._welcomeWindow.messageMiddleFive);
        updateTextContent(animationCheckboxTitleEl, currentLanguageTextObj._welcomeWindow.animation);
        updateTextContent(guideCheckboxTitleEl, currentLanguageTextObj._welcomeWindow.guide);
        updateTextContent(continueBtnEl, currentLanguageTextObj._welcomeWindow.continueBtn);
    }
    updateWelcomeWindowTitlesUI();

    const createSVGAnimation = () => {
        // thanks to https://github.com/anup-a/svgwave
        const gradientColor1 = document.querySelectorAll('.gradientColor1');
        const gradientColor2 = document.querySelectorAll('.gradientColor2');
        const gradientColorBottom1El = document.querySelector('.gradientColorBottom1');
        const gradientColorBottom3El = document.querySelector('.gradientColorBottom3');
        const gradientColorBottom6El = document.querySelector('.gradientColorBottom6');
        const gradientColorBottom9El = document.querySelector('.gradientColorBottom9');

        gradientColor1.forEach(el => {
            gsap.fromTo(el, {
                attr: {
                    ['stop-color']: 'rgb(247, 141, 167)',
                },
            }, {
                attr: {
                    ['stop-color']: 'rgb(235, 150, 94)',
                },
                duration: 10,
                ease: "power2.inOut",
                repeat: -1,
                yoyo: true
            });
        });
        gradientColor2.forEach(el => {
            gsap.fromTo(el, {
                attr: {
                    ['stop-color']: '#8ED1FC',
                },
            }, {
                attr: {
                    ['stop-color']: '#1ad1ff',
                },
                duration: 10,
                ease: "power2.inOut",
                repeat: -1,
                yoyo: true
            });
        });
        gsap.fromTo(gradientColorBottom1El, {
            attr: {
                ['stop-color']: '#191654',
            },
        }, {
            attr: {
                ['stop-color']: '#43C6AC',
            },
            duration: 10,
            ease: "power2.inOut",
            repeat: -1,
            yoyo: true
        });
        gsap.fromTo(gradientColorBottom3El, {
            attr: {
                ['stop-color']: '#009FFD',
            },
        }, {
            attr: {
                ['stop-color']: '#2A2A72',
            },
            duration: 14,
            ease: "power2.inOut",
            repeat: -1,
            yoyo: true
        });
        gsap.fromTo(gradientColorBottom6El, {
            attr: {
                ['stop-color']: '#009FFD',
            },
        }, {
            attr: {
                ['stop-color']: '#2A2A72',
            },
            duration: 12,
            ease: "power2.inOut",
            repeat: -1,
            yoyo: true
        });
        gsap.fromTo(gradientColorBottom9El, {
            attr: {
                ['stop-color']: '#009FFD',
            },
        }, {
            attr: {
                ['stop-color']: '#2A2A72',
            },
            duration: 10,
            ease: "power2.inOut",
            repeat: -1,
            yoyo: true
        });
    }
    createSVGAnimation();

    const createLanguageButtons = () => {
        const languageEl = document.getElementById('language');
        let htmlLang = ``;
        if (availableLanguages.length <= 1) { return };
        availableLanguages.forEach(item => {
            htmlLang += `<button class="languageButton" data-language="${item.id}" style="background-color: ${defaultMainUserSettings.windows.button.primary.backgroundColor}"><span class="languageName" data-language="${item.id}">${item.name}</span><span class="selectIcon" data-language="${item.id}">${item.id == currentLanguage ? checkImage : ''}</span></button>`;
        });
        languageEl.innerHTML = htmlLang;
    }
    createLanguageButtons();

    const setDefaultValuesToWelcomeUI = async () => {
        const userNameInputEl = document.getElementById('userNameInput');
        const animationCheckboxTitleEl = document.getElementById('animationCheckboxTitle');
        const guideCheckboxTitleEl = document.getElementById('guideCheckboxTitle');
        const continueBtnEl = document.getElementById('continueBtn');

        const backgroundColorBrightness = checkIfColorBrightness(defaultMainUserSettings.windows.window.backgroundColor, 120) ? '#000000' : '#ffffff';
        const style = {
            backgroundColor: defaultMainUserSettings.windows.window.backgroundColor,
            color: defaultMainUserSettings.windows.window.font.color,
            padding: '5px',
            borderRadius: '5px',
            border: `1px solid ${backgroundColorBrightness}`,
            fontSize: `${defaultMainUserSettings.windows.window.font.fontSize}px`,
            fontWeight: defaultMainUserSettings.windows.window.font.fontWeight,
            fontFamily: defaultMainUserSettings.windows.window.font.fontFamily,
            width: 'auto',
            maxWidth: '250px',
        }

        const underlineStyle = {
            textDecorationColor: defaultMainUserSettings.windows.window.font.color,
            textDecorationLine: 'underline',
            textDecorationColor: '#000000',
            textDecorationStyle: 'dotted',
            whiteSpace: 'nowrap'
        }

        Object.assign(animationCheckboxTitleEl.style, underlineStyle);
        Object.assign(guideCheckboxTitleEl.style, underlineStyle);

        continueBtnEl.style.backgroundColor = defaultMainUserSettings.windows.button.primary.backgroundColor;
        userNameInputEl.focus();
        await indexedDBManipulation('save', 'allowGuide', true);

        createTooltip(animationCheckboxTitleEl, 'top', currentLanguageTextObj._welcomeWindow.animationMessage, style);
        createTooltip(guideCheckboxTitleEl, 'top', currentLanguageTextObj._welcomeWindow.guideMessage, style);
    }
    setDefaultValuesToWelcomeUI();

    const eventListenerWelcomeUI = async () => {
        const uiElementsContainerEl = document.getElementById('uiElementsContainer');
        const userNameInputEl = document.getElementById('userNameInput');
        const languageButton = document.querySelectorAll('.languageButton');
        const selectIcon = document.querySelectorAll('.selectIcon');
        const disableAnimationEl = document.getElementById('disableAnimation');
        const disableGuideEl = document.getElementById('disableGuide');
        const continueBtnEl = document.getElementById('continueBtn');

        gsap.fromTo(uiElementsContainerEl, {
            backgroundColor: getRandomHexColorByType('dark', 85),
        }, {
            backgroundColor: getRandomHexColorByType('dark', 80),
            duration: 10,
            ease: "power2.inOut",
            repeat: -1,
            yoyo: true
        });

        const selectLanguage = async (el) => {
            let buttonLanguage = el.target.dataset.language;
            let languageObj = availableLanguages.find(item => item.id == buttonLanguage);
            if (languageObj != undefined) {
                currentLanguage = languageObj.id;
                selectIcon.forEach(icon => {
                    if (buttonLanguage == icon.dataset.language) {
                        icon.innerHTML = checkImage;
                    } else {
                        icon.innerHTML = '';
                    }
                });
                await getLanguage();
                updateWelcomeWindowTitlesUI();
            } else {
                console.error('Something went wrong when selecting language.')
            }
        }

        /**
         * Clears any ongoing animations on the userNameInputEl element and resets its properties.
         * This function is typically called when the user focuses on the input field to ensure
         * that any previous animations or styles are removed, providing a clean state for new interactions.
         */
        const checkInput = () => {
            gsap.killTweensOf(userNameInputEl); // Stops any ongoing animations on the userNameInputEl element.
            gsap.set(userNameInputEl, { clearProps: 'all' }); // Resets all properties of the userNameInputEl element to their initial state.
        }

        const changeStatusAnimation = () => {
            allowAnimation = !allowAnimation;
            createParticles(allowAnimation);
        }

        const changeStatusGuide = async () => {
            allowGuide = !allowGuide;
            if (allowGuide) {
                await indexedDBManipulation('save', 'allowGuide', true);
            } else {
                await indexedDBManipulation('remove', 'allowGuide');
            };
        }

        /**
         * Function to handle the creation of a user profile.
         * This function validates the user input for the username, and if valid, creates a user profile object.
         * If the input is invalid, it triggers animations and displays an error message.
         */
        const continueCreateUserProfile = async () => {
            const firstLoadWelcomeWindowEl = document.getElementById('firstLoadWelcomeWindow');
            const userNameTitleEl = document.getElementById('userNameTitle');

            const userName = userNameInputEl.value.trim();
            // Check if the user has entered a valid username
            if (userName.length > 0) {
                const saveStatus = manageUserProfiles('create', true, { userName: userName, image: '', userID: '', bookmarkDefault: true, bookmarkStyleDefault: true, folderStyleDefault: true, settingsDefault: true, importStatusObjects: false, importObjects: {} });
                if (!saveStatus) {
                    showMessageToastify('error', ``, `Failed to save user profile.`, 4000, false, 'bottom', 'right', true);
                    console.error('Failed to save user profile');
                    return;
                }
                const firstLoadWelcomeWindowEl = document.getElementById('firstLoadWelcomeWindow');
                gsap.to(firstLoadWelcomeWindowEl, {
                    duration: 1,
                    width: 0,
                    height: 0,
                    opacity: 0,
                    ease: 'power2.inOut',
                    onComplete: async () => {
                        uiElementsContainerEl.style.display = 'none';
                        uiElementsContainerEl.innerHTML = '';
                        createCurrentBookmarkFolder();
                        const ifAllowGuideExist = await indexedDBManipulation('has', 'allowGuide');
                        if (ifAllowGuideExist) {
                            interactiveGuide();
                            await indexedDBManipulation('remove', 'allowGuide');
                        }
                    }
                });
                // Remove animation
                gsap.set('#uiElementsContainer', { clearProps: 'all' });
                gsap.killTweensOf('#uiElementsContainer');
                try {
                    browser.runtime.sendMessage({userCreateFirstProfile: true })
                        .then(async response => {
                            if (!response) {
                                showMessageToastify('error', ``, `Failed to start the background script. To fix this, please restart your browser.`, 4000, false, 'bottom', 'right', true);
                            }
                        })
                        .catch(error => {
                            console.error("Error sending message:", error);
                        });
                } catch (error) {
                    console.error(error);
                    showMessageToastify('error', ``, `Failed to start the background script. To fix this, please restart your browser.`, 4000, false, 'bottom', 'right', true);
                }
                return;
            }
            // Display an error message and trigger animations if the username is invalid
            showMessageToastify('error', ``, `Enter your name.`, 4000, false, 'bottom', 'right', true);

            // Animate the username title to indicate an error
            gsap.fromTo(userNameTitleEl, {
                ['font-size']: 18,
            }, {
                ['font-size']: 16,
                duration: 0.4,
                ease: "power2.inOut",
                repeat: 4,
                yoyo: true
            });

            // Animate the input border color to indicate an error
            gsap.fromTo(userNameInputEl, {
                ["--borderColorWelcomeWindow"]: '255, 0, 0',
            }, {
                ["--borderColorWelcomeWindow"]: '0, 0, 0',
                duration: 0.4,
                ease: "power2.inOut",
                repeat: 4,
                yoyo: true
            });

            // Shake the welcome window to indicate an error
            gsap.fromTo(firstLoadWelcomeWindowEl, 0.1, {
                x: -3,
            }, {
                x: 3,
                repeat: 6,
                yoyo: true,
                ease: Quad.easeInOut
            });
        }

        languageButton.forEach(element => {
            element.addEventListener('click', selectLanguage);
            element.addEventListener('mouseenter', el => {
                el.target.style.backgroundColor = defaultMainUserSettings.windows.button.primary.hoverBackgroundColor;
            });
            element.addEventListener('mouseleave', el => {
                el.target.style.backgroundColor = defaultMainUserSettings.windows.button.primary.backgroundColor;
            });
        });
        userNameInputEl.addEventListener('focus', checkInput);
        userNameInputEl.addEventListener('keydown', (event) => {
            // when press Enter key, then start continueCreateUserProfile
            if (event.key === 'Enter') {
                continueCreateUserProfile();
            }
        });
        disableAnimationEl.addEventListener('change', changeStatusAnimation);
        disableGuideEl.addEventListener('change', changeStatusGuide);
        continueBtnEl.addEventListener('click', continueCreateUserProfile);
        continueBtnEl.addEventListener('mouseenter', el => {
            el.target.style.backgroundColor = defaultMainUserSettings.windows.button.primary.hoverBackgroundColor;
        });
        continueBtnEl.addEventListener('mouseleave', el => {
            el.target.style.backgroundColor = defaultMainUserSettings.windows.button.primary.backgroundColor;
        });
    }
    eventListenerWelcomeUI();
}

/**
 * Manages user profiles by performing various operations such as get, save, update, pushOne, createFromParts, create, and delete.
 * This function interacts with localStorage to persist user profile data and handles different states of user profiles.
 *
 * @param {string} status - The operation to perform: 'get', 'save', 'update', 'pushOne', 'createFromParts', 'create', or 'delete'.
 * @param {boolean} [active=true] - Indicates if the profile should be set as active. Default is true.
 * @param {Object} [data] - The data object containing user profile information and import objects.
 * @param {string} [data.userName=''] - The username for the profile.
 * @param {string} [data.image=''] - The image for the profile.
 * @param {string} [data.userID=''] - The user ID for the profile.
 * @param {boolean} [data.bookmarkDefault=true] - Indicates if default bookmarks should be used.
 * @param {boolean} [data.bookmarkStyleDefault=true] - Indicates if default bookmark styles should be used.
 * @param {boolean} [data.folderStyleDefault=true] - Indicates if default folder styles should be used.
 * @param {boolean} [data.settingsDefault=true] - Indicates if default settings should be used.
 * @param {boolean} [data.importStatusObjects=false] - Indicates if import status objects should be used.
 * @param {Object} [data.importObjects] - The import objects containing bookmarks, folder styles, bookmark styles, and user settings.
 * @param {Object} [data.importObjects.importBookmarks={}] - The imported bookmarks.
 * @param {Object} [data.importObjects.importFolderStyle={}] - The imported folder styles.
 * @param {Object} [data.importObjects.importBookmarkStyle={}] - The imported bookmark styles.
 * @param {Object} [data.importObjects.importUserSettings={}] - The imported user settings.
 * @param {boolean} [data.importStatusOneObject=false] - Indicates if a single import object should be used.
 * @param {Object} [data.importOneObject={}] - The single import object.
 * @param {boolean} [data.importStatusUpdateObject=false] - Indicates if update status objects should be used.
 * @param {Object} [data.importUpdateObject] - The update objects containing bookmarks, folder styles, bookmark styles, and user settings.
 * @param {Object} [data.importUpdateObject.importBookmarks={}] - The updated bookmarks.
 * @param {Object} [data.importUpdateObject.importFolderStyle={}] - The updated folder styles.
 * @param {Object} [data.importUpdateObject.importBookmarkStyle={}] - The updated bookmark styles.
 * @param {Object} [data.importUpdateObject.importUserSettings={}] - The updated user settings.
 * @returns {boolean|string|Error} - Returns the status of the operation, or an error if the operation fails.
 * @description Manages user profiles by performing various operations such as get, save, update, pushOne, createFromParts, create, and delete. This function interacts with localStorage to persist user profile data and handles different states of user profiles.
 */
export const manageUserProfiles = async (status, active = true, data = { userName: '', image: '', userID: '', bookmarkDefault: true, bookmarkStyleDefault: true, folderStyleDefault: true, settingsDefault: true, importStatusObjects: false, importObjects: { importBookmarks: {}, importFolderStyle: {}, importBookmarkStyle: {}, importUserSettings: {} }, importStatusOneObject: false, importOneObject: {}, importStatusUpdateObject: false, importUpdateObject: { importBookmarks: {}, importFolderStyle: {}, importBookmarkStyle: {}, importUserSettings: {} } }) => {
    try {
        if (status == 'get') {
            const ifExist = await indexedDBManipulation('has', 'userProfile');
            if (ifExist) {
                userProfile = await indexedDBManipulation('get', 'userProfile');
                if (isObjectEmpty(userProfile)) {
                    firstLoadStatus = true;
                } else {
                    firstLoadStatus = false;
                    if (userProfile.status == 'offline') {
                        userProfile.offline.forEach(profile => {
                            if (profile.active) {
                                userActiveProfile = profile;
                            }
                        });
                    };
                    userProfileExport.currentUserBookmarks = userActiveProfile.currentUserBookmarks;
                    userProfileExport.defaultUserFolderStyle = userActiveProfile.defaultUserFolderStyle;
                    userProfileExport.defaultUserBookmarkStyle = userActiveProfile.defaultUserBookmarkStyle;
                    userProfileExport.mainUserSettings = userActiveProfile.mainUserSettings;
                    userProfileExport.userActivityLog = userActiveProfile.userActivityLog;
                }
            } else {
                firstLoadStatus = true;
            }
        } else if (status == 'save') {
            if (isObjectEmpty(userProfile)) throw Error('userProfile is empty');
            if (userProfile.status == 'offline') {
                const currentTime = Date.now();
                const currentUserId = userActiveProfile.userId;
                userProfile.offline = userProfile.offline.filter(profile => profile.userId != currentUserId);
                userActiveProfile.timestampUpdate = currentTime;
                userProfile.offline.push(userActiveProfile);
                const saveStatus = await indexedDBManipulation('save', 'userProfile', userProfile);
                if (!saveStatus) {
                    console.log('Error to save user profile', saveStatus);
                }
                return saveStatus;
            }
        } else if (status == 'update') {
            if (data.importStatusUpdateObject && !isObjectEmpty(data.importUpdateObject)) {
                if (!isObjectEmpty(data.importUpdateObject.importBookmarks)) {
                    const dateNow = Date.now();
                    const importNewFolder = data.importUpdateObject.importBookmarks[0];
                    const rootObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, 'root');
                    importNewFolder.lastEdited = dateNow;
                    importNewFolder.index = getNextMaxIndex(rootObj.children);
                    importNewFolder.style.bookmark.color.backgroundColor = getRandomColor();
                    importNewFolder.title = `Import ${formatDateTime(dateNow, currentLanguage, 'dateAndTime')}`;
                    rootObj.lastEdited = dateNow;
                    rootObj.children.push(importNewFolder);
                }
                if (!isObjectEmpty(data.importUpdateObject.importBookmarkStyle)) {
                    userActiveProfile.defaultUserBookmarkStyle = data.importUpdateObject.importBookmarkStyle;
                }
                if (!isObjectEmpty(data.importUpdateObject.importFolderStyle)) {
                    userActiveProfile.defaultUserFolderStyle = data.importUpdateObject.importFolderStyle;
                }
                if (!isObjectEmpty(data.importUpdateObject.importUserSettings)) {
                    userActiveProfile.mainUserSettings = data.importUpdateObject.importUserSettings;
                }
                await manageUserProfiles('save');
                await manageUserProfiles('get');
            }
        } else if (status == 'pushOne') {
            try {
                if (data.importOneObject && !isObjectEmpty(data.importOneObject)) {
                    const profile = data.importOneObject;
                    profile.active = false;
                    profile.userId = generateRandomID(20, false, true, false);
                    userProfile.offline.push(profile);
                    const saveStatus = await indexedDBManipulation('save', 'userProfile', userProfile);
                    if (saveStatus) {
                        await userActivityRegister('save', 'createProfile', profile.userId, profile.name);
                        return saveStatus;
                    } else {
                        throw Error('Failed to save user profile');
                    }
                }
            } catch (error) {
                console.error('Error creating new profile:', error);
                return false;
            }
        } else if (status == 'createFromParts') {
            if (!data.importStatusObjects && isObjectEmpty(data.importObjects)) {
                throw Error('importStatusObjects must be true; importObjects must have object');
            }
            const checkStatus = await indexedDBManipulation('has', 'userProfile');
            const currentTime = Date.now();
            const userId = data.userID.trim().length == 0 ? generateRandomID(20, false, true, false) : data.userID;
            const cloneDefaultUserBookmarks = structuredClone(defaultUserBookmarks);
            cloneDefaultUserBookmarks[0].dateAdded = currentTime;
            cloneDefaultUserBookmarks[0].dateGroupModified = currentTime;
            cloneDefaultUserBookmarks[0].lastEdited = currentTime;
            const bookmarks = isObjectEmpty(data.importObjects.importBookmarks) ? cloneDefaultUserBookmarks : structuredClone(data.importObjects.importBookmarks);
            const folderStyle = isObjectEmpty(data.importObjects.importFolderStyle) ? structuredClone(defaultFolderStyle) : structuredClone(data.importObjects.importFolderStyle);
            const bookmarkStyle = isObjectEmpty(data.importObjects.importBookmarkStyle) ? structuredClone(defaultBookmarkStyle) : structuredClone(data.importObjects.importBookmarkStyle);
            const userSettings = isObjectEmpty(data.importObjects.importUserSettings) ? structuredClone(userProfileExport.mainUserSettings) : structuredClone(data.importObjects.importUserSettings);
            const userName = isObjectEmpty(data.importObjects.userInfo) ? 'User' : data.importObjects.userInfo.userName;
            const userImage = isObjectEmpty(data.importObjects.userInfo) || data.importObjects.userInfo.image.length == 0 ? defaultProfileImageBase64 : data.importObjects.userInfo.image;
            changeIds(bookmarks, 'root');
            const newUserProfile = {
                active: false,
                name: userName.trim(),
                userId: userId,
                image: userImage,
                timestampUpdate: currentTime,
                timestampCreation: currentTime,
                currentUserBookmarks: bookmarks,
                defaultUserFolderStyle: folderStyle,
                defaultUserBookmarkStyle: bookmarkStyle,
                mainUserSettings: userSettings,
                userActivityLog: {
                    userId: userId,
                    activities: [],
                },
            }
            if (checkStatus) {
                if (isObjectEmpty(userProfile)) {
                    await manageUserProfiles('get');
                }
                if (userProfile.status == 'offline') {
                    if (active) {
                        userProfile.offline.forEach(profile => {
                            profile.active = false;
                        });
                    }
                    userActiveProfile = newUserProfile;
                    userProfile.offline.push(newUserProfile);
                }
            } else {
                userProfile = {
                    status: 'offline',
                    offline: [newUserProfile],
                    online: [],
                }
            }
            const saveStatus = await indexedDBManipulation('save', 'userProfile', userProfile);
            if (saveStatus) {
                if (isObjectEmpty(userActiveProfile)) {
                    userActiveProfile = newUserProfile;
                }
                await userActivityRegister('save', 'createProfile', userId, newUserProfile.name);
            } else {
                throw Error('Failed to save user profile');
            }
            return saveStatus;
        } else if (status == 'create') {
            const checkStatus = await indexedDBManipulation('has', 'userProfile');
            const currentTime = Date.now();
            const userId = data.userID.trim().length == 0 ? generateRandomID(20, false, true, false) : data.userID;
            const image = data.image.length > 0 ? data.image : defaultProfileImageBase64;
            const cloneDefaultUserBookmarks = structuredClone(defaultUserBookmarks);
            cloneDefaultUserBookmarks[0].dateAdded = currentTime;
            cloneDefaultUserBookmarks[0].dateGroupModified = currentTime;
            cloneDefaultUserBookmarks[0].lastEdited = currentTime;
            const newUserProfile = {
                active: active,
                name: data.userName.trim(),
                userId: userId,
                image: image,
                timestampUpdate: currentTime,
                timestampCreation: currentTime,
                currentUserBookmarks: data.bookmarkDefault ? cloneDefaultUserBookmarks : userActiveProfile.currentUserBookmarks,
                defaultUserFolderStyle: data.folderStyleDefault ? structuredClone(defaultFolderStyle) : userActiveProfile.defaultUserFolderStyle,
                defaultUserBookmarkStyle: data.bookmarkStyleDefault ? structuredClone(defaultBookmarkStyle) : userActiveProfile.defaultUserBookmarkStyle,
                mainUserSettings: data.settingsDefault ? structuredClone(defaultMainUserSettings) : userActiveProfile.mainUserSettings,
                userActivityLog: {
                    userId: userId,
                    activities: [],
                },
            }
            if (checkStatus) {
                if (isObjectEmpty(userProfile)) {
                    await manageUserProfiles('get');
                }
                if (userProfile.status == 'offline') {
                    if (active) {
                        userProfile.offline.forEach(profile => {
                            profile.active = false;
                        });
                        userActiveProfile = newUserProfile;
                    }
                    userProfile.offline.push(newUserProfile);
                }
            } else {
                userProfile = {
                    status: 'offline',
                    offline: [newUserProfile],
                    online: [],
                }
            }
            const saveStatus = await indexedDBManipulation('save', 'userProfile', userProfile);
            if (saveStatus) {
                if (isObjectEmpty(userActiveProfile)) {
                    userActiveProfile = newUserProfile;
                }
                await userActivityRegister('save', 'createProfile', userId, newUserProfile.name);
            } else {
                return false;
            }
            return true;
        } else if (status == 'delete') {
            if (data.userID.length === 0) throw Error('userID is required');
            if (userProfile.offline.length === 1) return 'Cannot delete the last user profile';
            const index = userProfile.offline.findIndex(profile => profile.userId === data.userID);
            if (index >= 0 && userActiveProfile.userId !== data.userID) {
                const profileName = userProfile.offline[index].name;
                const profileId = userProfile.offline[index].userId;
                userProfile.offline.splice(index, 1);
                const saveStatus = await indexedDBManipulation('save', 'userProfile', userProfile);
                if (saveStatus) {
                    await userActivityRegister('save', 'deleteProfile', profileId, profileName);
                    return saveStatus;
                } else {
                    throw Error('Failed to save user profile');
                }
            } else {
                if (userActiveProfile.userId === data.userID) return 'Same Id as active';
                if (index === -1) return 'Not found';
            }
        }
    } catch (error) {
        console.error('Error in manageUserProfiles:', error);
        return error;
    }
}

/**
 * Toggles the visibility of the profile menu and animates its elements.
 * Uses the GSAP library for animations.
 *
 * @description This function shows or hides the profile menu based on the current status.
 * It animates the profile menu items and the profile image using GSAP.
 * When the menu is shown, it displays the user's name with a typing effect.
 * When the menu is hidden, it animates the items out of view.
 *
 * @default showProfileMenuStatus - A boolean indicating the current visibility status of the profile menu.
 */
export const showProfileMenu = async () => {
    const profileMenuEl = document.getElementById('profileMenu'); // The profile menu element
    const profileImageEl = document.getElementById('profileImage'); // The profile image element
    const profileUserNameEl = document.getElementById('profileUserName'); // The profile username element
    const profileMenuBodyEl = document.getElementById('profileMenuBody'); // The profile menu body element

    if (showProfileMenuStatus) {
        const profileMenuItem = document.querySelectorAll('.profileMenuItem[data-type]'); // All profile menu items

        profileMenuItem.forEach((item, index) => {
            gsap.to(item, {
                duration: .4,
                delay: index / .9 - index,
                right: '-100%',
                ease: 'sine.in',
                onComplete: () => {
                    if (index == profileMenuItem.length - 1) {
                        gsap.to(profileMenuEl, {
                            duration: 1,
                            width: '50px',
                            height: '50px',
                            backgroundColor: '#00000000',
                            ease: 'elastic.in(1,0.5)',
                            onComplete: () => {
                            }
                        });
                        gsap.to(profileImageEl, {
                            duration: .7,
                            delay: .6,
                            top: '0px',
                            right: '0px',
                            backgroundColor: '#00000000',
                            ease: 'expo.out',
                            onComplete: () => {
                            }
                        });
                        profileMenuBodyEl.style.display = 'none';
                        profileUserNameEl.innerHTML = '';
                    }
                }
            });
        });
    } else {
        profileMenuBodyEl.style.display = 'flex';
        let html = ``;
        for await (const item of profileMenuItems) { item.icon = await changeBase64ImageColor(item.icon, userProfileExport.mainUserSettings.windows.window.font.color); }
        profileMenuItems.forEach(item => {
            html += `
                <button class="profileMenuItem" data-type="${item.type}">
                    <div class="profileMenuItemIcon" data-type="${item.type}" style="background: url(${item.icon}) center center / cover no-repeat;"></div>
                    <div class="profileMenuItemText" data-type="${item.type}" style="color:${userActiveProfile.mainUserSettings.windows.window.font.color}">${item.title}</div>
                </button>
            `;
        });
        profileMenuBodyEl.innerHTML = html;
        profileUserNameEl.innerHTML = `<span id="userName" style="color:${userActiveProfile.mainUserSettings.windows.window.font.color}">${escapeHtml(userActiveProfile.name)}</span>`;
        const profileMenuItem = document.querySelectorAll('.profileMenuItem[data-type]'); // All profile menu items

        gsap.to(profileMenuEl, {
            duration: 2,
            width: 200,
            height: 60 + (profileMenuItems.length * 30) + (profileMenuItems.length * 6),
            backgroundColor: userProfileExport.mainUserSettings.windows.window.backgroundColor,
            ease: 'elastic.out(1,0.5)',
            onComplete: () => {
                if (userActiveProfile.name.length > 15) {
                    const status = translateUserName('profileUserName', 'userName');
                    if (!status) {
                        showMessageToastify('error', ``, `Failed to translate username`, 4000, false, 'bottom', 'right', true);
                    }
                }
            }
        });
        profileMenuItem.forEach((item, index) => {
            gsap.to(item, {
                duration: 1.2,
                delay: index / .8 - index,
                right: '0px',
                opacity: 1,
                backgroundColor: '#00000000',
                ease: 'bounce.out',
                onComplete: () => {
                }
            });
        });
        gsap.to(profileImageEl, {
            duration: .7,
            delay: .6,
            top: '5px',
            right: '5px',
            ease: 'back.out(3.7)',
            onComplete: () => {
            }
        });

        profileMenuItem.forEach(element => {
            element.addEventListener('click', el => {
                const type = el.target.dataset.type; // The type of the clicked menu item
                switch (type) {
                    case 'newBookmark':
                        createAndEditBookmarksWindow('default', 'newBookmark');
                        showProfileMenu();
                        break;
                    case 'newFolder':
                        createAndEditBookmarksWindow('default', 'newFolder');
                        showProfileMenu();
                        break;
                    case 'search':
                        searchManager('open');
                        showProfileMenu();
                        break;
                    case 'folderSettings':
                        openCloseSettingWindow('open', 'folder');
                        showProfileMenu();
                        break;
                    case 'settings':
                        settingWindowOpen.status ? openCloseSettingWindow('close') : openCloseSettingWindow('open', 'default');
                        showProfileMenu();
                        break;
                    default:
                        console.error('Wrong menu type', type);
                        break;
                }
            });
            element.addEventListener('mouseenter', el => {
                el.target.style.backgroundColor = pSBC(checkIfColorBrightness(userProfileExport.mainUserSettings.windows.window.backgroundColor) ? -0.50 : 0.50, userProfileExport.mainUserSettings.windows.window.backgroundColor, false, true);
            });
            element.addEventListener('mouseleave', el => {
                el.target.style.backgroundColor = '#00000000';
            });
        });
    }
    showProfileMenuStatus = !showProfileMenuStatus; // Toggle the profile menu status
}

/**
 * Creates or removes a custom context menu based on the provided parameters.
 * This function dynamically generates a context menu with items based on the specified type.
 * It positions the menu near the mouse cursor, ensuring it does not overflow the viewport boundaries.
 * Event listeners are added to each menu item for interaction handling.
 *
 * @param {boolean} create - Determines whether to create (true) or remove (false) the context menu.
 * @param {string} type - Specifies the type of context menu to create. Can be 'default' or 'bookmark'.
 */
export const createContextMenu = async (create = false, type = '', setMousePosition = null) => {
    try {
        if ((typeof create !== 'boolean') || (type.length === 0 || !['default', 'bookmark', 'clean'].includes(type))) {
            throw Error('Invalid parameters for createContextMenu function');
        }
        if (userProfileExport.currentIdToEdit === null && type === 'bookmark') throw Error('No id to edit');
        if (!create && type === 'clean') {
            $('#contextMenu').html('');
            return;
        }
        let contextMenuBodyHtml = ``;
        let contextMenuItemsBodyHtml = ``;
        let getMinVW = viewportWidth - 200;
        let getMinVH = viewportHeight - 220;
        // Defines the base styling for each context menu item.
        const contextMenuItemBodyStyle = `display: flex;justify-content: flex-start;align-items: center;flex-direction: row;width: 100%;height: 100%;margin: 1px 0 1px 0;border-radius: 0px;border: none;background-color: transparent;`;
        // Defines the styling for the icons within context menu items.
        const contextMenuItemImgBodyStyle = `padding:0 5px 0 2px;width: 36px;height: 30px;`;
        // Defines the styling for the titles within context menu items.
        const contextMenuItemTitleBodyStyle = `color:${userProfileExport.mainUserSettings.windows.window.font.color};padding:0px 5px 0px 0px;text-wrap: nowrap;`;
        let allChildIds = [];
        let sameChildrenFolder = true;
        if (clipboard.length > 0) {
            const object = findBookmarkByKey(userProfileExport.currentUserBookmarks, clipboard[0].currentIdToEdit);
            allChildIds = getAllChildIds(object, clipboard[0].currentIdToEdit);
            sameChildrenFolder = allChildIds.includes(userProfileExport.currentFolderId);
        }
        switch (type) {
            case 'default':
                getMinVW = viewportWidth - 200;
                getMinVH = viewportHeight - 170;
                for await (const item of contextMenuItems.default) { item.icon = await changeBase64ImageColor(item.icon, userProfileExport.mainUserSettings.windows.window.font.color); }
                contextMenuItems.default.forEach(v => {
                    if (v.id === 3 && sameChildrenFolder) { return; }
                    contextMenuItemsBodyHtml += `
                        <button type="button" class='contextMenuItemBody' data-type='${v.data}' style='${contextMenuItemBodyStyle};${v.data == 'paste' ? `border-top:1px solid ${userProfileExport.mainUserSettings.windows.window.font.color};border-bottom:1px solid ${userProfileExport.mainUserSettings.windows.window.font.color};` : ''}'>
                            <img src='${v.icon}' style='${contextMenuItemImgBodyStyle}'></img>
                            <div id='contextMenuItemTitle' style='${contextMenuItemTitleBodyStyle}'>${v.title}</div>
                        </button>`;
                });
                break;
            case 'bookmark':
                getMinVW = viewportWidth - 200;
                getMinVH = viewportHeight - 240;
                let objType = findBookmarkByKey(userProfileExport.currentUserBookmarks, userProfileExport.currentIdToEdit)?.type;
                if (!['folder', 'bookmark'].includes(objType)) { console.error('wrong type', objType); }
                for await (const item of contextMenuItems.bookmark) { item.icon[objType] = await changeBase64ImageColor(item.icon[objType], userProfileExport.mainUserSettings.windows.window.font.color); }
                contextMenuItems.bookmark.forEach(v => {
                    if (v.id === 6 && objType === 'folder') { return; }
                    contextMenuItemsBodyHtml += `
                    <button type="button" class='contextMenuItemBody' data-type='${v.data}' style='${contextMenuItemBodyStyle}'>
                        <img src='${v.icon[objType]}' style='${contextMenuItemImgBodyStyle}'></img>
                        <div id='contextMenuItemTitle' style='${contextMenuItemTitleBodyStyle}'>${v.title}</div>
                    </button>`;
                });
                break;
        }
        // Defines the base styling for the context menu container.
        const htmlBoxStyle = `display: flex;justify-content: space-between;align-items: flex-start;flex-direction: column;flex-wrap: nowrap;position: fixed;min-width: 180px;padding: 10px 10px 10px 10px;border: 1px solid ${userProfileExport.mainUserSettings.windows.window.font.color};border-radius: 10px;background-color: ${userProfileExport.mainUserSettings.windows.window.backgroundColor};box-shadow: 8px 10px 23px 0px ${userProfileExport.mainUserSettings.windows.window.font.color}30;left: ${setMousePosition != null ? setMousePosition.x : currentMousePos.x >= getMinVW ? getMinVW : currentMousePos.x}px;top: ${setMousePosition != null ? setMousePosition.y : currentMousePos.y >= getMinVH ? getMinVH : currentMousePos.y}px;`;
        contextMenuBodyHtml = `<div style='${htmlBoxStyle}' id="contextMenuBody">${contextMenuItemsBodyHtml}</div>`;
        $('#contextMenu').html(contextMenuBodyHtml);

        /**
         * Removes event listeners from all context menu items.
         * This function is called before the context menu is closed to ensure no memory leaks or unintended behavior.
         */
        const removeEventListeners = () => {
            document.querySelectorAll('[class=contextMenuItemBody]').forEach(element => {
                element.removeEventListener('mouseenter', handleMouseEnter);
                element.removeEventListener('mouseleave', handleMouseLeave);
                element.removeEventListener('click', handleClick);
            });
        }

        /**
         * Handles the mouseenter event on context menu items.
         * Changes the background color of the menu item to indicate hover state.
         *
         * @param {Event} event - The mouseenter event object.
         */
        const handleMouseEnter = (event) => {
            event.currentTarget.style.backgroundColor = pSBC(checkIfColorBrightness(userProfileExport.mainUserSettings.windows.window.backgroundColor) ? -0.50 : 0.50, userProfileExport.mainUserSettings.windows.window.backgroundColor, false, true);
        }

        /**
         * Handles the mouseleave event on context menu items.
         * Resets the background color of the menu item to transparent.
         *
         * @param {Event} event - The mouseleave event object.
         */
        const handleMouseLeave = (event) => {
            event.currentTarget.style.background = '#00000000';
        }

        /**
         * Handles the click event on context menu items.
         * Closes the context menu and triggers the action associated with the clicked menu item.
         *
         * @param {Event} event - The click event object.
         */
        const handleClick = (event) => {
            event.preventDefault();
            $('#contextMenu').html('');
            removeEventListeners();
            const menuType = event.currentTarget.dataset.type
            if (type == 'default' && menuType == 'paste') {
                updateUserClipboard('paste');
                return;
            }
            if (type == 'default' && menuType == 'folderSettings') {
                openCloseSettingWindow('open', 'folder');
                return;
            }
            if (type == 'default' && menuType == 'search') {
                searchManager('open');
                return;
            }
            if ((type == 'default' && menuType == 'newBookmark') || (type == 'default' && menuType == 'newFolder')) {
                createAndEditBookmarksWindow(type, menuType);
                return;
            }

            if (type == 'bookmark' && menuType == 'edit') {
                createAndEditBookmarksWindow(type, menuType);
                return;
            }
            if (type == 'bookmark' && menuType == 'cut') {
                updateUserClipboard('cut');
                return;
            }
            if (type == 'bookmark' && menuType == 'copy') {
                updateUserClipboard('copy');
                return;
            }
            if (type == 'bookmark' && menuType == 'delete') {
                deleteBookmarkOrFolder();
                return;
            }
            if (type == 'bookmark' && menuType == 'copyTitle') {
                copyBookmarkOrFolderTitleUrlToOSClipboard(menuType);
                return;
            }
            if (type == 'bookmark' && menuType == 'copyUrl') {
                copyBookmarkOrFolderTitleUrlToOSClipboard(menuType);
                return;
            }
        }
        /**
        * Attaches event listeners to all elements with the id 'contextMenuItemBody'.
        * This function iterates over each element found and attaches three event listeners:
        * - mouseenter: Calls the handleMouseEnter function when the mouse enters the element.
        * - mouseleave: Calls the handleMouseLeave function when the mouse leaves the element.
        * - click: Calls the handleClick function when the element is clicked.
        * These event listeners are used to provide interactive feedback and functionality
        * to the context menu items, such as changing appearance on hover and executing specific
        * actions on click.
        */
        document.querySelectorAll('.contextMenuItemBody').forEach(element => {
            element.addEventListener('mouseenter', handleMouseEnter);
            element.addEventListener('mouseleave', handleMouseLeave);
            element.addEventListener('click', handleClick);
        });
    } catch (error) {
        console.error('', error);
        return error;
    }
}

/**
 * Copies the title or URL of a bookmark or folder to the OS clipboard.
 * This function finds the bookmark or folder by its key, validates the menu type,
 * and copies the appropriate data (title or URL) to the clipboard.
 * It also displays a success or error message based on the outcome.
 *
 * @param {string} type - The type of the item to copy (e.g., 'bookmark', 'folder').
 * @param {string} menuType - The specific data to copy ('copyTitle' or 'copyUrl').
 * @returns {void}
 * @description This function handles copying the title or URL of a bookmark or folder to the clipboard.
 * It validates the input parameters, finds the relevant bookmark or folder, and copies the data to the clipboard.
 * Success or error messages are displayed using the showMessageToastify function.
 */
const copyBookmarkOrFolderTitleUrlToOSClipboard = (menuType) => {
    try {
        // Validate the menu type
        if (!['copyTitle', 'copyUrl'].includes(menuType)) { throw new Error('Invalid menu type') }

        // Find the bookmark or folder object by its key
        const findBookmarkObject = findBookmarkByKey(userProfileExport.currentUserBookmarks, userProfileExport.currentIdToEdit);
        if (!findBookmarkObject) { throw new Error('No bookmark or folder found') }

        // Validate the title and URL of the found object
        if (findBookmarkObject.title.length === 0) { throw new Error('Title is empty') }
        if (findBookmarkObject.type === 'bookmark' && findBookmarkObject.url.length === 0) { throw new Error('Url is empty') }

        let dataToClipboard = '';

        // Determine the data to copy based on the menu type
        if (['bookmark', 'folder'].includes(findBookmarkObject.type) && menuType === 'copyTitle') {
            dataToClipboard = findBookmarkObject.title;
        }
        if (findBookmarkObject.type === 'bookmark' && findBookmarkObject.url.length > 0 && menuType === 'copyUrl') {
            dataToClipboard = findBookmarkObject.url;
        }

        // Copy the data to the clipboard
        navigator.clipboard.writeText(dataToClipboard);

        // Display a success message
        showMessageToastify('success', ``, `${menuType === 'copyTitle' ? 'Title' : 'URL'} successfully copied to the clipboard.`, 2000, false, 'bottom', 'right', true);
    } catch (error) {
        // Display an error message
        showMessageToastify('error', ``, `Coping to clipboard was not successful.`, 4000, false, 'bottom', 'right', true);
        console.error('Error to copy bookmark or folder title or url', error);
        return error;
    }
}

/**
 * Updates the clipboard with the specified status (copy, cut, or paste).
 * This function handles copying or cutting a bookmark or folder to the clipboard,
 * and pasting it into a new location.
 *
 * @param {string} status - The status indicating the clipboard action ('copy', 'cut', or 'paste').
 * @returns {void}
 * @description This function updates the clipboard based on the provided status.
 * If the status is 'copy' or 'cut', it clears the clipboard and adds the current item to it.
 * If the status is 'paste', it moves or copies the item from the clipboard to the current folder.
 */
const updateUserClipboard = async (status) => {
    try {
        if (!['copy', 'cut', 'paste', 'undo'].includes(status)) { throw new Error('Invalid clipboard status') }
        // Handle 'copy' or 'cut' status
        if (status === 'copy' || status === 'cut') {
            clipboard = [];
            if (userProfileExport.currentIdToEdit == null) { throw new Error('No id to copy') }

            // Create an object representing the item to be copied or cut
            const copiedObj = {
                currentParentFolderId: userProfileExport.currentFolderId,
                currentIdToEdit: userProfileExport.currentIdToEdit,
                status: status
            }
            clipboard.push(copiedObj);

            // Handle 'paste' status
        } else if (status === 'paste') {
            if (clipboard.length > 0 && userProfileExport.currentFolderId != clipboard[0].currentIdToEdit) {
                let saveClipboardStatus, undoObject;
                const oldObject = findBookmarkByKey(userProfileExport.currentUserBookmarks, clipboard[0].currentIdToEdit);
                const parentId = oldObject.parentId;
                let newObject;
                if (clipboard[0].status == 'copy') {
                    saveClipboardStatus = await actionForArray(userProfileExport.currentUserBookmarks, 'copy', clipboard[0].currentIdToEdit, userProfileExport.currentFolderId);
                    clipboard[0].currentIdToEdit = saveClipboardStatus.id;
                    if (!saveClipboardStatus.status) { throw new Error('Failed to copy object'); }
                    newObject = findBookmarkByKey(userProfileExport.currentUserBookmarks, saveClipboardStatus.id);
                    undoObject = {
                        type: 'duplicated',
                        delete: false,
                        disabledRedo: true,
                        disabledUndo: false,
                        id: generateRandomIdForObj(),
                        timestamp: new Date().getTime(),
                        oldItemId: oldObject.id,
                        oldObjectParentId: parentId,
                        item: newObject,
                    };
                } else if (clipboard[0].status == 'cut') {
                    saveClipboardStatus = await actionForArray(userProfileExport.currentUserBookmarks, 'cut', clipboard[0].currentIdToEdit, userProfileExport.currentFolderId);
                    if (!saveClipboardStatus.status) { throw new Error('Failed to cut object'); }
                    newObject = findBookmarkByKey(userProfileExport.currentUserBookmarks, saveClipboardStatus.id);
                    undoObject = {
                        type: 'moved',
                        delete: false,
                        disabledRedo: true,
                        disabledUndo: false,
                        id: generateRandomIdForObj(),
                        timestamp: new Date().getTime(),
                        oldObjectParentId: parentId,
                        item: newObject,
                    };
                }
                undoManager('addAction', undoObject);
                const saveStatus = await manageUserProfiles('save');
                if (!saveStatus) {
                    showMessageToastify('success', '', `Failed to ${clipboard[0].status == 'copy' ? 'copy' : 'cut'}`, 2000, false, 'bottom', 'right', true, false);
                    throw new Error('Failed to save user profiles');
                } else {
                    showMessageToastify('success', '', `${clipboard[0].status == 'copy' ? 'Copying' : 'Cutting'} was successful`, 2000, false, 'bottom', 'right', true, false);
                }
                createCurrentBookmarkFolder();
                clipboard = [];
            }
        }
    } catch (error) {
        console.error('Error to update clipboard', error);
    }
}

/**
 * Deletes a bookmark or folder and updates the UI accordingly.
 * This function generates a confirmation dialog with details about the item to be deleted,
 * including its title, type, creation date, URL, and number of children (if it's a folder).
 * It also sets up event listeners for the cancel and delete buttons in the dialog.
 */
const deleteBookmarkOrFolder = () => {
    let cancelButtonListener = null;
    let deleteButtonListener = null;

    // Find the current object being edited based on its ID
    let currentEditingObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, userProfileExport.currentIdToEdit);
    const objInfo = {
        title: currentEditingObj.title,
        type: currentEditingObj.type,
        dateAdded: currentEditingObj.dateAdded,
        url: currentEditingObj.url,
        id: currentEditingObj.id,
        parentId: currentEditingObj.parentId,
        children: currentEditingObj.children.length,
    };

    // Generate the HTML for the delete confirmation dialog
    let deleteHtml = `
        <div id="mainWindowDeleteBody" style="color:${userActiveProfile.mainUserSettings.windows.window.font.color}">
            <div id="topSection">
                <div id="icon">
                    <svg class="shredderIconSvg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="${userActiveProfile.mainUserSettings.windows.window.backgroundColor}">
                        <path class="shredderIconPathTop" fill-rule="evenodd" stroke="${userActiveProfile.mainUserSettings.windows.window.font.color}" d="M19,13 L19,9 L15,9 C13.8954305,9 13,8.1045695 13,7 L13,3 L5,3 L5,13 L3,13 L3,3 C3,1.8954305 3.8954305,1 5,1 L15.4142136,1 L21,6.58578644 L21,13 L19,13 Z M15,3.41421356 L15,7 L18.5857864,7 L15,3.41421356 Z"/>
                        <path class="shredderIconPathMiddle" fill-rule="evenodd" stroke="${userActiveProfile.mainUserSettings.windows.window.font.color}" d="M1,14 L23,14 L23,18 L1,18 L1,14 Z "/>
                        <path class="shredderIconPathBottom" fill-rule="evenodd" stroke="${userActiveProfile.mainUserSettings.windows.window.font.color}" style="--dangerColor: ${userProfileExport.mainUserSettings.windows.button.danger.backgroundColor}" d="M3 24 3 18 5 18 5 24 5 24ZM13 23 13 18 15 18 15 24 13 24ZM9 21 9 18 11 18 11 21 9 21ZM19 21 19 18 21 18 21 24 19 24Z"/>
                    </svg>
                </div>
                <div id="deleteTitle">Are you sure you want to delete it?</div>
            </div>
            <div id="middleSection">
                <div id="table" style="--bottomColor: ${userActiveProfile.mainUserSettings.windows.window.font.color}">
                    <div class="tableRow">
                        <div id="middleSectionTableTitle" class="tableTitle">Title:</div>
                        <div id="middleSectionTableObjectTitle" class="tableValue">${objInfo.title}</div>
                    </div>
                    <div class="tableRow">
                        <div id="middleSectionTableTypeTitle" class="tableTitle">Type:</div>
                        <div class="tableValue">${capitalizeString(objInfo.type, 1, false)}</div>
                    </div>
                    <div class="tableRow">
                        <div id="middleSectionTableCreatedTitle" class="tableTitle">Created:</div>
                        <div class="tableValue">${formatDateTime(objInfo.dateAdded, currentLanguage, 'dateAndTime')}</div>
                    </div>
                    <div id="middleSectionTableChild" class="tableRow">
                        <div id="middleSectionTableIncludedTitle" class="tableTitle">Included:</div>
                        <div class="tableValue">${objInfo.children}  <span id="middleSectionTableIncludedEnding"></span></div>
                    </div>
                    <div id="middleSectionTableUrlTr" class="tableRow">
                        <div id="middleSectionTableUrlTitle" class="tableTitle">URL:</div>
                        <div id="middleSectionTableUrl" class="tableValue">${objInfo.url || ''}</div>
                    </div>
                </div>
            </div>
            <div id="bottomSection">
                <div id="deleteBottomSection">
                    <button type="button" id="mainWindowDeleteBodyCancel">Cancel</button>
                    <button type="button" id="mainWindowDeleteBodyDelete">Delete</button>
                </div>
            </div>
        </div>
    `;
    $('#uiElementsContainer').css('display', 'flex').html(deleteHtml);

    const createTooltipForFolderObjectTitleAndUrl = () => {
        const style = {
            backgroundColor: colorPalette[9],
            color: userActiveProfile.mainUserSettings.windows.window.font.color,
            padding: '5px',
            borderRadius: '5px',
            fontSize: `${userActiveProfile.mainUserSettings.windows.window.font.fontSize}px`,
            fontWeight: userActiveProfile.mainUserSettings.windows.window.font.fontWeight,
            fontFamily: userActiveProfile.mainUserSettings.windows.window.font.fontFamily,
            overflowWrap: 'break-word',
            width: 'fit-content',
            maxWidth: '300px'
        }

        const middleSectionTableObjectTitleEl = document.getElementById('middleSectionTableObjectTitle');
        const middleSectionTableUrlEl = document.getElementById('middleSectionTableUrl');
        const title = middleSectionTableObjectTitleEl.textContent;
        const url = middleSectionTableUrlEl.textContent;
        const titleLength = truncateTextIfOverflow(middleSectionTableObjectTitleEl, middleSectionTableObjectTitleEl.textContent);
        if (title.length > titleLength) {
            createTooltip(middleSectionTableObjectTitleEl, 'top', title, style);
            middleSectionTableObjectTitleEl.style.textDecorationLine = 'underline';
            middleSectionTableObjectTitleEl.style.textDecorationStyle = 'dotted';
            middleSectionTableObjectTitleEl.style.textDecorationColor = '#323232';
        }
        const urlLength = truncateTextIfOverflow(middleSectionTableUrlEl, url);
        if (url && url.length > urlLength) {
            createTooltip(middleSectionTableUrlEl, 'top', url, style);
            middleSectionTableUrlEl.style.textDecorationLine = 'underline';
            middleSectionTableUrlEl.style.textDecorationStyle = 'dotted';
            middleSectionTableUrlEl.style.textDecorationColor = '#323232';
        }
    }
    createTooltipForFolderObjectTitleAndUrl();

    /**
     * Updates the text content of UI elements in the delete window based on the current language settings.
     * This function retrieves various UI elements by their IDs and updates their text content using the `updateTextContent`
     * helper function. It ensures that the UI reflects the current language settings, particularly for the delete window,
     * by updating elements such as the delete title, table titles (e.g., "Title:", "Type:", "Created:"), and buttons
     * (e.g., "Cancel", "Delete"). It also handles pluralization for the number of included items when deleting a folder.
     */
    const updateDeleteWindowTitleUI = () => {
        // Retrieve elements by their IDs or selectors
        const deleteTitleEl = document.getElementById('deleteTitle');
        const middleSectionTableTitleEl = document.getElementById('middleSectionTableTitle');
        const middleSectionTableTypeEl = document.getElementById('middleSectionTableTypeTitle');
        const middleSectionTableCreatedEl = document.getElementById('middleSectionTableCreatedTitle');
        const middleSectionTableIncludedEl = document.getElementById('middleSectionTableIncludedTitle');
        const middleSectionTableIncludedEnding = document.getElementById('middleSectionTableIncludedEnding');
        const middleSectionTableUrlTitleEl = document.getElementById('middleSectionTableUrlTitle');
        const mainWindowDeleteBodyCancelEl = document.getElementById('mainWindowDeleteBodyCancel');
        const mainWindowDeleteBodyDeleteEl = document.getElementById('mainWindowDeleteBodyDelete');

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
        updateTextContent(deleteTitleEl, currentLanguageTextObj._deleteWindow.deleteTitle);
        updateTextContent(middleSectionTableTitleEl, currentLanguageTextObj._deleteWindow.title);
        updateTextContent(middleSectionTableTypeEl, currentLanguageTextObj._deleteWindow.type);
        updateTextContent(middleSectionTableCreatedEl, currentLanguageTextObj._deleteWindow.created);
        updateTextContent(middleSectionTableIncludedEl, currentLanguageTextObj._deleteWindow.included);
        if (objInfo.children <= 1) {
            updateTextContent(middleSectionTableIncludedEnding, currentLanguageTextObj._deleteWindow._IncludedForPlural.singular);
        } else if (objInfo.children > 1) {
            updateTextContent(middleSectionTableIncludedEnding, currentLanguageTextObj._deleteWindow._IncludedForPlural.plural);
        }
        updateTextContent(middleSectionTableUrlTitleEl, currentLanguageTextObj._deleteWindow.url);
        updateTextContent(mainWindowDeleteBodyCancelEl, currentLanguageTextObj._deleteWindow._buttons.cancel);
        updateTextContent(mainWindowDeleteBodyDeleteEl, currentLanguageTextObj._deleteWindow._buttons.delete);
    };
    updateDeleteWindowTitleUI();

    /**
     * Toggles the display of URL and child elements based on the type of the object.
     * If the object type is 'folder', it hides the URL element and shows the child element.
     * Otherwise, it does the opposite.
     */
    const toggleElementVisibilityBasedOnType = () => {
        // Get the elements for the middle section's child and URL display areas
        const middleSectionChildEl = document.getElementById('middleSectionTableChild');
        const middleSectionTableUrlTrEl = document.getElementById('middleSectionTableUrlTr');
        // Check if the object type is 'folder'
        if (objInfo.type === 'folder') {
            // Hide the URL element and show the child element for folders
            middleSectionTableUrlTrEl.style.display = 'none';
            middleSectionChildEl.style.display = '';
            return;
        }
        // Show the URL element and hide the child element for non-folder types
        middleSectionTableUrlTrEl.style.display = '';
        middleSectionChildEl.style.display = 'none';
    };
    // Call the function to apply the visibility toggles based on the object type
    toggleElementVisibilityBasedOnType();

    /**
     * Adds event listeners to the delete and cancel buttons in the main window.
     * It configures the buttons' styles based on the user's settings and handles their click events.
     */
    const setupDeleteWindowEventListeners = () => {
        // Elements for the main window's delete section
        const deleteWindowBody = document.getElementById('mainWindowDeleteBody');
        const cancelButton = document.getElementById('mainWindowDeleteBodyCancel');
        const deleteButton = document.getElementById('mainWindowDeleteBodyDelete');

        // Remove existing event listeners to avoid duplicates
        if (cancelButtonListener) {
            cancelButton.removeEventListener('click', cancelButtonListener);
            deleteButton.removeEventListener('click', deleteButtonListener);
        }

        // Set the background color of the delete window
        deleteWindowBody.style.backgroundColor = userProfileExport.mainUserSettings.windows.window.backgroundColor;

        // Configure the cancel button's style based on the window's background color
        cancelButton.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;

        // Configure the delete button's style based on the user settings
        deleteButton.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.danger.backgroundColor;

        /**
         * Handles the click event for the cancel button.
         * Hides the context menu and clears its content.
         */
        const handleCancelClick = () => {
            $('#uiElementsContainer').css('display', 'none').html('');
        };

        /**
         * Handles the click event for the delete button.
         * Deletes the selected object and updates the UI accordingly.
         */
        const handleDeleteClick = async () => {
            try {
                const currentFolderObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, userProfileExport.currentFolderId);
                const index = currentFolderObj.children.findIndex(x => x.id === objInfo.id);
                const object = currentFolderObj.children[index];

                if (userProfileExport.mainUserSettings.main.synchronizationToBrowser.status) {
                    const newObject = {
                        status: 'delete',
                        title: object.title,
                        url: object.url.trim().length > 0 ? object.url : null,
                        id: object.id,
                        parentId: object.parentId,
                    };
                    const status = await indexedDBManipulation('save', 'tempBookmarkObject', newObject);
                    if (status) {
                        browser.runtime.sendMessage({ sync: { savedNewObject: true } })
                            .then(response => {
                                console.log(response);
                            })
                            .catch(error => {
                                console.error("Error sending message:", error);
                            });
                    }
                }

                currentFolderObj.children.splice(index, 1);
                userActiveProfile.currentUserBookmarks = userProfileExport.currentUserBookmarks;
                // const copiedObj = {
                //     currentFolderId: userProfileExport.currentFolderId,
                //     status: 'deleted',
                //     object: object,
                // }
                // clipboardHistory.push(copiedObj);
                const undoObject = {
                    type: 'deleted',
                    delete: false,
                    disabled: false,
                    dialog: {
                        delete: false,
                    },
                    id: generateRandomIdForObj(),
                    timestamp: new Date().getTime(),
                    item: object
                };
                undoManager('addAction', undoObject);
                showMessageToastify('success', '', `${capitalizeString(objInfo.type, 1, false)} deleted successfully`, 2000, false, 'bottom', 'right', true);
                await userActivityRegister('save', objInfo.type === 'bookmark' ? 'deleteBookmark' : 'deleteFolder', { id: objInfo.id, title: objInfo.title });
                createCurrentBookmarkFolder();
                userProfileExport.currentIdToEdit = null;
                $('#uiElementsContainer').css('display', 'none').html('');
            } catch (error) {
                console.error('Error deleting bookmark/folder:', error);
            }
        };

        const cancelButtonMouseEnter = (el) => {
            el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.hoverBackgroundColor;
        }

        const cancelButtonMouseLeave = (el) => {
            el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.primary.backgroundColor;
        }

        const deleteButtonMouseEnter = (el) => {
            el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.danger.hoverBackgroundColor;
        }

        const deleteButtonMouseLeave = (el) => {
            el.target.style.backgroundColor = userProfileExport.mainUserSettings.windows.button.danger.backgroundColor;
        }

        // Assign the event handlers to the buttons
        cancelButtonListener = handleCancelClick;
        deleteButtonListener = handleDeleteClick;
        cancelButton.addEventListener('click', cancelButtonListener);
        cancelButton.addEventListener('mouseenter', cancelButtonMouseEnter);
        cancelButton.addEventListener('mouseleave', cancelButtonMouseLeave);
        deleteButton.addEventListener('click', deleteButtonListener);
        deleteButton.addEventListener('mouseenter', deleteButtonMouseEnter);
        deleteButton.addEventListener('mouseleave', deleteButtonMouseLeave);
    };

    // Invoke the function to add event listeners
    setupDeleteWindowEventListeners();
}

/**
 * Creates and injects the main HTML structure for a folder view into the 'mainBody' element.
 * This function checks if the 'mainBody' element exists and if not, logs an error.
 * If the 'mainBody' element is present, it sets its innerHTML to include 'addressBarBody' and 'bookmarksBody'.
 */
const createMainElementForFolder = () => {
    // Get the 'mainBody' element from the document
    const mainBodyEl = document.getElementById('mainBody');
    mainBodyEl.innerHTML = '';
    // Initialize a variable to hold the HTML structure
    let elementHtml = ``;
    // Check if 'mainBodyEl' is null, undefined, or empty
    if (mainBodyEl == null || mainBodyEl == undefined || mainBodyEl == ``) {
        // Log an error message if 'mainBodyEl' is not found
        console.error('Failed to create main element for folder');
        // Exit the function if 'mainBodyEl' is not valid
        return;
    }
    // Define the HTML structure for 'addressBarBody' and 'bookmarksBody' div.
    elementHtml = `<div id='addressBarBody'></div><div id='bookmarksBody'></div>`;
    // Set the innerHTML of 'mainBodyEl' to the defined HTML structure
    mainBodyEl.innerHTML = elementHtml;
}

/**
 * Updates the address bar for the current folder view.
 * This function constructs the HTML for the address bar based on the current folder's path to the root.
 * It also attaches click and hover event listeners to the address bar elements for interactivity.
 * @returns {void}
 * @description This function updates the address bar for the current folder view by constructing the HTML for the address bar based on the current folder's path to the root. It also attaches click and hover event listeners to the address bar elements for interactivity.
 */
const updateAddressBarForFolder = async () => {
    const addressBarBody = document.getElementById('addressBarBody');
    // Early return if the address bar element is not found
    if (!addressBarBody) {
        console.error('Failed to update Address Bar: Element not found.');
        return;
    }
    let addressBarHtml = '';
    let pathToRoot = [];
    currentObject = {};
    if (userProfileExport.currentUserBookmarks.length === 0) {
        await manageUserProfiles('get');
    }
    // Default to root if currentFolderId is empty
    userProfileExport.currentFolderId = userProfileExport.currentFolderId || 'root';
    // Find current folder object if not already set
    currentObject = isObjectEmpty(currentObject) ? await findBookmarkByKey(userProfileExport.currentUserBookmarks, userProfileExport.currentFolderId) : currentObject;
    // Find path to root from the current folder
    pathToRoot = await findPathToRoot(userProfileExport.currentUserBookmarks, userProfileExport.currentFolderId).then(path => { return path; });
    // Early return if path to root is not found or empty
    if (!pathToRoot || pathToRoot.length === 0) {
        console.error('Failed to find path to root.');
        return;
    }
    const symbol = currentObject.style.folder.addressBar.icon.content || '/';
    const addressBarSymbolStyle = `color:${currentObject.style.folder.addressBar.icon.color};font-size:${currentObject.style.folder.addressBar.icon.fontSize}px;`;
    const addressBarTitleStyle = `color:${currentObject.style.folder.addressBar.text.color};font-size:${currentObject.style.folder.addressBar.text.fontSize}px;font-family:${currentObject.style.folder.addressBar.text.fontFamily};`;
    // Construct HTML for each element in the path to root
    pathToRoot.forEach(el => {
        addressBarHtml += `
        <div class="addressBarSection" data-id="${el.id}">
            <div class="addressBarSymbol" data-id="${el.id}" style="${addressBarSymbolStyle}">${symbol}</div>
            <div class="addressBarTitle" data-id="${el.id}" style="${addressBarTitleStyle}">${escapeHtml(el.title)}</div>
            <div class="addressBarBox" data-id="${el.id}"></div>
        </div>`;
    });
    // Update the address bar's HTML
    addressBarBody.innerHTML = addressBarHtml;
    addressBarBody.style.backgroundColor = currentObject.style.folder.addressBar.background.backgroundColor;

    /**
    * Handles click events on address bar boxes.
    * @param {Event} event - The click event.
    */
    const handleAddressBarBoxClick = (event) => {
        const id = event.target.dataset.id;
        // Early return if the clicked element's ID is invalid
        if (!id) {
            console.error('Failed to handle click: Invalid folder ID.');
            return;
        }
        // Update current folder and refresh the bookmark folder view if the ID has changed
        if (userProfileExport.currentFolderId !== id) {
            userProfileExport.currentFolderId = id;
            createCurrentBookmarkFolder();
        }
    };
    /**
    * Attaches click event listeners to address bar boxes.
    */
    const attachClickListenersToAddressBarBoxes = () => {
        const addressBarBoxes = document.querySelectorAll('.addressBarBox');
        // Early return if no address bar boxes found
        if (!addressBarBoxes) {
            console.error('Failed to attach click listeners: No address bar boxes found.');
            return;
        }
        // Attach event listener to each address bar box
        addressBarBoxes.forEach(box => {
            box.addEventListener('click', handleAddressBarBoxClick);
        });
    };
    /**
    * Handles mouse enter event on an address bar box by changing the background color of its previous sibling element.
    * @param {Event} event - The mouse enter event object.
    */
    const handleAddressBarBoxMouseEnter = (event) => {
        // Get the previous sibling element of the event target
        const sibling = event.target.previousElementSibling;
        // Check if the sibling exists, if not log an error and exit the function
        if (!sibling) {
            console.error('Failed to handle mouse enter: Invalid folder ID.');
            return;
        }
        // Set the background color of the sibling element to a semi-transparent black
        sibling.style.backgroundColor = '#00000040';
    };
    /**
    * Handles mouse leave event on an address bar box by resetting the background color of its previous sibling element.
    * @param {Event} event - The mouse leave event object.
    */
    const handleAddressBarBoxMouseLeave = (event) => {
        // Get the previous sibling element of the event target
        const sibling = event.target.previousElementSibling;
        // Check if the sibling exists, if not log an error and exit the function
        if (!sibling) {
            console.error('Failed to handle mouse leave: Invalid folder ID.');
            return;
        }
        // Reset the background color of the sibling element
        sibling.style.backgroundColor = '';
    };
    /**
    * Attaches mouse enter and leave event listeners to elements with the class 'addressBarBox'.
    * This function is designed to enhance UI interactivity by providing visual feedback when the user hovers over these elements.
    */
    const attachHoverListenersToAddressBarBoxes = () => {
        // Query the document for all elements with the class 'addressBarBox'
        const addressBarBoxes = document.querySelectorAll('.addressBarBox');
        // Check if any address bar boxes were found, log an error and exit the function if none were found
        if (!addressBarBoxes) {
            console.error('Failed to attach click listeners: No address bar boxes found.');
            return;
        }
        // Iterate over the NodeList of address bar boxes
        addressBarBoxes.forEach(box => {
            // Attach a mouseenter event listener to the current box, calling handleAddressBarBoxMouseEnter when the event fires
            box.addEventListener('mouseenter', handleAddressBarBoxMouseEnter);
            // Attach a mouseleave event listener to the current box, calling handleAddressBarBoxMouseLeave when the event fires
            box.addEventListener('mouseleave', handleAddressBarBoxMouseLeave);
        });
    };
    // Attach click and hover event listeners to each address bar box
    attachClickListenersToAddressBarBoxes();
    attachHoverListenersToAddressBarBoxes();
}

/**
 * Initializes drag and drop events for bookmark elements.
 * @description This function sets up drag and drop functionality for bookmark elements, allowing users to rearrange bookmarks by dragging and dropping them. It includes event listeners for drag start, drag over, and drag end events, and handles the visual feedback and logic for moving bookmarks within the UI.
 */
const dragAndDropEvents = () => {
    // Initialize variables
    const mainBodyEl = document.getElementById('mainBody'); // Main body element
    const dragElements = document.querySelectorAll('#bookmarkActiveBox'); // Elements that can be dragged
    let boxWidth = 0; // Width of the bookmark box
    let parentCurrentObj = null; // Parent object of the current bookmark
    let currentObj = null; // Current bookmark object
    let previousCurrentObj = null; // Previous bookmark object
    let previousCurrentObjId = null; // ID of the previous bookmark object
    let nextCurrentObj = null; // Next bookmark object
    let nextCurrentObjId = null; // ID of the next bookmark object
    let targetStatus = { fromId: null, toId: null, position: null }; // Status of the drag target
    let tempObjStyle = {}; // Temporary style object for the dragged element

    /**
     * Sets style to the target element based on its ID and position.
     * @param {string} id - The ID of the target element.
     * @param {string} position - The position relative to the target element ('next', 'before', or null).
     * @description This function applies a box shadow to the target element based on its position relative to the dragged element, providing visual feedback during the drag operation.
     */
    const setStyleToTargetElement = (id, position) => {
        dragElements.forEach(el => {
            if (el.dataset.id === id) {
                if (position == 'next') {
                    el.style.boxShadow = `inset -15px 0px 25px #111111dd`;
                } else if (position == 'before') {
                    el.style.boxShadow = `inset 15px 0px 25px #111111dd`;
                } else {
                    el.style.boxShadow = `inset 0px 0px 25px #ffffffdd`;
                }
            } else {
                el.style.boxShadow = `none`;
            }
        });
    };

    /**
     * Handles the drag over event.
     * @description This function manages the drag over event, providing visual feedback and determining the position where the dragged element will be dropped.
     */
    const dragOver = () => {
        mainBodyEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (['bookmarkActiveBox', 'bookmarkBody'].includes(e.target.id) && e.target.dataset.id == targetStatus.fromId) {
                let elementBefore = document.querySelector(`[data-temp='tempBefore']`);
                let elementNext = document.querySelector(`[data-temp='tempNext']`);
                if (elementBefore != null) {
                    elementBefore.remove();
                }
                if (elementNext != null) {
                    elementNext.remove();
                }
                return;
            }
            if (['bookmarkActiveBox', 'bookmarkBody', 'bookmarksBody', 'bookmarkActiveBoxNext', 'bookmarkActiveBoxBefore'].includes(e.target.id)) {
                if (!['bookmarkActiveBox'].includes(e.target.id)) { targetStatus.position = null; }
                let percentage = null;
                if (boxWidth == 0) { return; }
                if (['bookmarkActiveBox'].includes(e.target.id)) {
                    let mouseX = e.layerX;
                    percentage = mouseX / boxWidth * 100;
                } else {
                    percentage = null;
                }
                let targetElement = document.querySelector(`[data-id='${e.target.dataset.id}']`);
                let elementBefore = document.querySelector(`[data-temp='tempBefore']`);
                let elementNext = document.querySelector(`[data-temp='tempNext']`);
                if (elementBefore == null && targetElement != null && percentage != null && percentage <= 30 && e.target.dataset.id != nextCurrentObjId) {
                    let htmlBefore = `
                        <div id='bookmarkBodyBefore' data-worker='${e.target.dataset.id}' data-temp="tempBefore" style='${tempObjStyle.bookmarkBodyStyle}'>
                            <div id='bookmarkImageBefore' data-worker='${e.target.dataset.id}' style='${tempObjStyle.bookmarkImageStyle}'></div>
                            <div id='bookmarkTextBefore' data-worker='${e.target.dataset.id}' style='${tempObjStyle.bookmarkTextStyle}'>${tempObjStyle.title}</div>
                            <div id='bookmarkActiveBoxBefore' data-worker='${e.target.dataset.id}' style='${tempObjStyle.bookmarkActiveBoxStyle}'></div>
                        </div>
                    `;
                    targetStatus.position = 'before';
                    targetStatus.toId = e.target.dataset.id;
                    targetElement.insertAdjacentHTML('beforebegin', htmlBefore);
                    setStyleToTargetElement(targetStatus.toId, 'before');
                    if (elementNext != null) {
                        elementNext.remove();
                    }
                }
                if (31 <= percentage && percentage != null && percentage <= 69 && !['bookmarkActiveBoxNext', 'bookmarkActiveBoxBefore'].includes(e.target.id)) {
                    targetStatus.position = 'middle';
                    targetStatus.toId = e.target.dataset.id;
                    setStyleToTargetElement(e.target.dataset.id);
                    if (elementBefore != null) {
                        elementBefore.remove();
                    }
                    if (elementNext != null) {
                        elementNext.remove();
                    }
                }
                if (elementNext == null && percentage != null && percentage >= 70 && targetElement != null && e.target.dataset.id != previousCurrentObjId) {
                    let htmlNext = `
                        <div id='bookmarkBodyNext' data-worker='${e.target.dataset.id}' data-temp="tempNext" style='${tempObjStyle.bookmarkBodyStyle}'>
                            <div id='bookmarkImageNext' data-worker='${e.target.dataset.id}' style='${tempObjStyle.bookmarkImageStyle}'></div>
                            <div id='bookmarkTextNext' data-worker='${e.target.dataset.id}' style='${tempObjStyle.bookmarkTextStyle}'>${tempObjStyle.title}</div>
                            <div id='bookmarkActiveBoxNext' data-worker='${e.target.dataset.id}' style='${tempObjStyle.bookmarkActiveBoxStyle}'></div>
                        </div>
                    `;
                    targetStatus.position = 'next';
                    targetStatus.toId = e.target.dataset.id;
                    targetElement.insertAdjacentHTML('afterend', htmlNext);
                    setStyleToTargetElement(targetStatus.toId, 'next');
                    if (elementBefore != null) {
                        elementBefore.remove();
                    }
                }
                if (['bookmarkActiveBoxBefore'].includes(e.target.id)) {
                    targetStatus.toId = e.target.dataset.worker;
                    targetStatus.position = 'before';
                    setStyleToTargetElement(targetStatus.toId, 'before');
                }
                if (['bookmarkActiveBoxNext'].includes(e.target.id)) {
                    targetStatus.toId = e.target.dataset.worker;
                    targetStatus.position = 'next';
                    setStyleToTargetElement(targetStatus.toId, 'next');
                }
            } else {
                setStyleToTargetElement(0);
            }
        });
    }

    /**
     * Attaches drag and drop events to each bookmark element.
     * @description This function sets up the drag and drop event listeners for each bookmark element, including drag start and drag end events, and handles the logic for moving bookmarks within the UI.
     */
    dragElements.forEach(el => {
        el.draggable = true;
        el.addEventListener('dragstart', (e) => {
            targetStatus.fromId = e.target.dataset.id;
            currentObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, e.target.dataset.id);
            if (currentObj == null) { return; }
            e.target.style.backgroundColor = '#00000090';
            parentCurrentObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, userProfileExport.currentFolderId);
            boxWidth = parseFloat(parentCurrentObj.style.folder.bookmarksBox.width);
            // Set styles for temporary element
            let bookmarkBodyStyle = `display:flex;width:${parentCurrentObj.style.folder.bookmarksBox.width || '200px'};height:${parentCurrentObj.style.folder.bookmarksBox.height || '200px'};overflow:hidden;border-left:${currentObj.style.bookmark.border.left.width}px ${currentObj.style.bookmark.border.left.style} ${currentObj.style.bookmark.border.left.color};border-top:${currentObj.style.bookmark.border.top.width}px ${currentObj.style.bookmark.border.top.style} ${currentObj.style.bookmark.border.top.color};border-right:${currentObj.style.bookmark.border.right.width}px ${currentObj.style.bookmark.border.right.style} ${currentObj.style.bookmark.border.right.color};border-bottom:${currentObj.style.bookmark.border.bottom.width}px ${currentObj.style.bookmark.border.bottom.style} ${currentObj.style.bookmark.border.bottom.color};border-radius:${currentObj.style.bookmark.border.left.radius}px ${currentObj.style.bookmark.border.top.radius}px ${currentObj.style.bookmark.border.right.radius}px ${currentObj.style.bookmark.border.bottom.radius}px;`;
            let bookmarkImageStyle = '';
            if (currentObj.style.bookmark.image.backgroundBase64 == '') {
                bookmarkImageStyle = `display:${currentObj.style.bookmark.color.display};position:${currentObj.style.bookmark.color.position};width:${currentObj.style.bookmark.color.width}%;height:${currentObj.style.bookmark.color.height}%;left:${currentObj.style.bookmark.color.left}%;top:${currentObj.style.bookmark.color.top}%;transform:rotate(${currentObj.style.bookmark.color.angle}deg);background-color:${currentObj.style.bookmark.color.backgroundColor};`;
            }
            if (currentObj.style.bookmark.color.backgroundColor == '') {
                bookmarkImageStyle = `display:${currentObj.style.bookmark.image.display};position:${currentObj.style.bookmark.image.position};width:${currentObj.style.bookmark.image.width}%;height:${currentObj.style.bookmark.image.height}%;left:${currentObj.style.bookmark.image.left}%;top:${currentObj.style.bookmark.image.top}%;transform:rotate(${currentObj.style.bookmark.image.angle}deg);background-image:url(${currentObj.style.bookmark.image.backgroundBase64});background-repeat:no-repeat;background-size:100% 100%;`;
            }
            let bookmarkTextStyle = `display:${currentObj.style.bookmark.text.display};text-align:${currentObj.style.bookmark.font.textAlign};position:${currentObj.style.bookmark.text.position};white-space:${currentObj.style.bookmark.text.whiteSpace};overflow:${currentObj.style.bookmark.text.overflow};width:${currentObj.style.bookmark.text.width}%;height:${currentObj.style.bookmark.text.height}%;left:${currentObj.style.bookmark.text.left}%;top:${currentObj.style.bookmark.text.top}%;transform:rotate(${currentObj.style.bookmark.text.angle}deg);background-color:${currentObj.style.bookmark.text.backgroundColor};color:${currentObj.style.bookmark.font.color};font-size:${currentObj.style.bookmark.font.fontSize}px;font-family:${currentObj.style.bookmark.font.fontFamily};font-weight:${currentObj.style.bookmark.font.fontWeight};font-style:${currentObj.style.bookmark.font.fontStyle};`;
            let bookmarkActiveBoxStyle = `display:flex;position:absolute;width:100%;height:100%;box-shadow: inset 0px 0px 6px 6px #ffffffaa;background-color: #ffffff50;`;
            tempObjStyle = {
                bookmarkBodyStyle: bookmarkBodyStyle,
                bookmarkImageStyle: bookmarkImageStyle,
                bookmarkTextStyle: bookmarkTextStyle,
                bookmarkActiveBoxStyle: bookmarkActiveBoxStyle,
                title: currentObj.title,
            };
            // Calculate indexes for previous and next objects
            const index = parentCurrentObj.children.findIndex(x => x.id === targetStatus.fromId);
            const parentCurrentObjChildrenLength = parentCurrentObj.children.length;
            if (index > 0) {
                previousCurrentObj = parentCurrentObj.children[index - 1] || null;
                previousCurrentObjId = previousCurrentObj.id;
            }
            if (index < parentCurrentObjChildrenLength - 1) {
                nextCurrentObj = parentCurrentObj.children[index + 1] || null;
                nextCurrentObjId = nextCurrentObj.id;
            }
            dragOver();
        });
        // Handle dragend event
        el.addEventListener('dragend', async (e) => {
            // Reset background color
            e.target.style.backgroundColor = '';
            // Remove temporary elements
            let elementBefore = document.querySelector(`[data-temp='tempBefore']`);
            let elementNext = document.querySelector(`[data-temp='tempNext']`);
            if (elementBefore != null) {
                elementBefore.remove();
            }
            if (elementNext != null) {
                elementNext.remove();
            }
            // Recreate current bookmark folder
            createCurrentBookmarkFolder();
            // Perform actions if targetStatus is defined
            if (targetStatus.fromId != null && targetStatus.toId != null && targetStatus.position != null) {
                const targetObj = findBookmarkByKey(userProfileExport.currentUserBookmarks, targetStatus.toId);
                if (targetObj.type == 'bookmark' && targetStatus.position == 'middle') {
                    return;
                }
                if (targetStatus.position == 'middle') {
                    await actionForArray(userProfileExport.currentUserBookmarks, 'cut', targetStatus.fromId, targetStatus.toId);
                } else {
                    moveObjectInParentArray(userProfileExport.currentUserBookmarks, parentCurrentObj.id, targetStatus.position, targetStatus.fromId, targetStatus.toId);
                }
                correctIndexes(userProfileExport.currentUserBookmarks);
                setStyleToTargetElement(0);
                userActiveProfile.currentUserBookmarks = userProfileExport.currentUserBookmarks;
                const saveStatus = await manageUserProfiles('save');
                if (saveStatus) {
                    showMessageToastify('success', '', `Moved successfully`, 2000, false, 'bottom', 'right', true, false);
                } else {
                    console.error('Failed to save.');
                }
                createCurrentBookmarkFolder();
            }
        });
    });
}

/**
 * Updates the bookmarks body for the current folder.
 * @description This function updates the bookmarks body element with the bookmarks of the current folder.
 * It sets the styles for the bookmarks body and applies the background style based on the folder's settings.
 * It also attaches drag and drop events to the bookmarks.
 * @default {} The function defaults to the root folder if the current folder ID is empty.
 * @param {Object} currentFolderObj - The current folder object containing bookmarks and styles.
 * @returns {void}
 */
const updateBookmarksBodyForFolder = () => {
    try {
        const bookmarksBodyEl = document.getElementById('bookmarksBody');
        const bodyEl = document.querySelector('body');
        let bookmarksBodyHtml = ``;

        // Check if bookmarksBodyEl and bodyEl exist
        if (!bookmarksBodyEl && !bodyEl) {
            throw new Error('Missing bookmarksBodyEl or bodyEl.'); // Throw error if the elements are missing
        }

        // Clear the bookmarks body element
        bookmarksBodyEl.innerHTML = '';

        // Default to root if userProfileExport.currentFolderId is empty
        userProfileExport.currentFolderId = (userProfileExport.currentFolderId !== undefined && userProfileExport.currentFolderId !== null) ? userProfileExport.currentFolderId : 'root';
        const currentObject = findBookmarkByKey(userProfileExport.currentUserBookmarks, userProfileExport.currentFolderId);
        if (currentObject && currentObject.type !== 'folder') {
            userProfileExport.currentFolderId = currentObject.parentId;
        }

        // Validate currentFolderObj
        if (!currentObject) {
            console.error("Invalid currentFolderObj."); // Log error if validation fails
            return; // Exit the function if the input is invalid
        }

        // Sort the folder by children index
        sortFolderByChildrenIndex(currentObject);

        // Build HTML for each bookmark in the current folder
        currentObject.children.forEach(el => {
            bookmarksBodyHtml += buildHtmlForBookmark(el.id, currentObject.style.folder.bookmarksBox);
        });

        // Define styles for the bookmarks body element
        const styles = {
            display: 'grid',
            gridAutoFlow: currentObject.style.folder.grid.gridAutoFlow,
            gap: '10px',
            gridTemplateColumns: `repeat(auto-fill, minmax(${currentObject.style.folder.bookmarksBox.width}, 1fr))`,
            gridTemplateRows: `repeat(auto-fill, minmax(${currentObject.style.folder.bookmarksBox.height}, 1fr))`,
            height: 'calc(100vh - 50px)',
            width: '100vw',
            overflow: 'scroll',
            padding: '10px'
        };

        // Apply styles to the bookmarks body element
        Object.assign(bookmarksBodyEl.style, styles);
        bookmarksBodyEl.innerHTML = bookmarksBodyHtml;

        // Get folder style
        let folderStyle = currentObject.style.folder;

        // Generate gradient colors
        const gradientArray = new Gradient().setColorGradient(...folderStyle.background.gradientType.backgroundColorArray).setMidpoint(30).getColors();
        const backgroundColorGradient = calculateGradientPercentages(gradientArray);

        // Apply background style based on the folder's background type
        switch (folderStyle.background.backgroundType) {
            case 'image':
                bodyEl.setAttribute('style', `display:flex;background-image: url(${folderStyle.background.imageType.backgroundBase64});background-repeat: ${folderStyle.background.imageType.backgroundRepeat};background-size: ${folderStyle.background.imageType.backgroundSize};background-position: ${folderStyle.background.imageType.backgroundPosition};background-origin: ${folderStyle.background.imageType.backgroundOrigin};`);
                break;
            case 'color':
                bodyEl.setAttribute('style', `display:flex;background-color:${folderStyle.background.colorType.backgroundColor};`);
                break;
            case 'gradient':
                const createGradient = `linear-gradient(${folderStyle.background.gradientType.angle}deg, ${backgroundColorGradient.map(i => `${i}`).join(',')})`;
                bodyEl.setAttribute('style', `display:flex;background:${createGradient};`);
                break;
            default:
                console.error('No background type selected.');
                break;
        }

        // Attach drag and drop events to the bookmarks
        dragAndDropEvents();
    } catch (error) {
        console.error('Error building bookmarks body:', error);
    }
}

/**
 * Builds the HTML for a bookmark element.
 * @description This function constructs the HTML string for a bookmark element based on its ID and the provided bookmark box styles.
 * It retrieves the bookmark object, applies the necessary styles, and returns the HTML string.
 * @param {string} id - The ID of the bookmark.
 * @param {Object} bookmarksBox - The styles for the bookmark box.
 * @returns {string} The HTML string for the bookmark element.
 * @throws Will throw an error if the input is invalid or the bookmark is not found.
 */
const buildHtmlForBookmark = (id, bookmarksBox) => {
    try {
        // Validate input
        if ((!Array.isArray(userProfileExport.currentUserBookmarks) && userProfileExport.currentUserBookmarks.length === 0) || (typeof id !== 'string' && id.length === 0)) {
            throw new Error('Invalid input.');
        } // Throw error if the input is invalid

        let bookmarkHtml = ``;
        let obj = findBookmarkByKey(userProfileExport.currentUserBookmarks, id);

        // Check if the bookmark object is found
        if (obj === undefined && Object.keys(obj).length === 0) {
            throw new Error('Bookmark not found.');
        } // Throw error if the bookmark is not found

        // Define styles for the bookmark body
        const bookmarkBodyStyle = `display:flex;width:${bookmarksBox.width || '200px'};height:${bookmarksBox.height || '200px'};overflow:hidden;border-left:${obj.style.bookmark.border.left.width}px ${obj.style.bookmark.border.left.style} ${obj.style.bookmark.border.left.color};border-top:${obj.style.bookmark.border.top.width}px ${obj.style.bookmark.border.top.style} ${obj.style.bookmark.border.top.color};border-right:${obj.style.bookmark.border.right.width}px ${obj.style.bookmark.border.right.style} ${obj.style.bookmark.border.right.color};border-bottom:${obj.style.bookmark.border.bottom.width}px ${obj.style.bookmark.border.bottom.style} ${obj.style.bookmark.border.bottom.color};border-radius:${obj.style.bookmark.border.left.radius}px ${obj.style.bookmark.border.top.radius}px ${obj.style.bookmark.border.right.radius}px ${obj.style.bookmark.border.bottom.radius}px;`;

        let bookmarkImageStyle = '';
        let bookmarkTextStyle = '';
        let bookmarkActiveBoxStyle = '';

        // Define styles for the bookmark image
        if (obj.style.bookmark.image.backgroundBase64 !== '') {
            bookmarkImageStyle = `display:${obj.style.bookmark.image.display};position:${obj.style.bookmark.image.position};width:${obj.style.bookmark.image.width}%;height:${obj.style.bookmark.image.height}%;left:${obj.style.bookmark.image.left}%;top:${obj.style.bookmark.image.top}%;transform:rotate(${obj.style.bookmark.image.angle}deg);background-image:url(${obj.style.bookmark.image.backgroundBase64});background-repeat:no-repeat;background-size:100% 100%;`;
        }
        if (obj.style.bookmark.color.backgroundColor !== '') {
            bookmarkImageStyle = `display:${obj.style.bookmark.color.display};position:${obj.style.bookmark.color.position};width:${obj.style.bookmark.color.width}%;height:${obj.style.bookmark.color.height}%;left:${obj.style.bookmark.color.left}%;top:${obj.style.bookmark.color.top}%;transform:rotate(${obj.style.bookmark.color.angle}deg);background-color:${obj.style.bookmark.color.backgroundColor};`;
        }

        // Define styles for the bookmark text
        bookmarkTextStyle = `display:${obj.style.bookmark.text.display};align-items:${obj.style.bookmark.font.textAlign};position:${obj.style.bookmark.text.position};white-space:${obj.style.bookmark.text.whiteSpace};overflow:${obj.style.bookmark.text.overflow};width:${obj.style.bookmark.text.width}%;height:${obj.style.bookmark.text.height}%;left:${obj.style.bookmark.text.left}%;top:${obj.style.bookmark.text.top}%;transform:rotate(${obj.style.bookmark.text.angle}deg);background-color:${obj.style.bookmark.text.backgroundColor};color:${obj.style.bookmark.font.color};font-size:${obj.style.bookmark.font.fontSize}px;font-family:${obj.style.bookmark.font.fontFamily};font-weight:${obj.style.bookmark.font.fontWeight};font-style:${obj.style.bookmark.font.fontStyle};`;

        // Define styles for the bookmark active box
        bookmarkActiveBoxStyle = `display:flex;position:absolute;width:100%;height:100%;background:#00000000;`;

        // Construct the HTML string for the bookmark
        bookmarkHtml = `
            <div id='bookmarkBody' data-id=${obj.id} style='${bookmarkBodyStyle}'>
                <div id='bookmarkImage' data-id=${obj.id} style='${bookmarkImageStyle}'></div>
                <div id='bookmarkText' data-id=${obj.id} style='${bookmarkTextStyle}'>${escapeHtml(obj.title)}</div>
                <div id='bookmarkActiveBox' data-id=${obj.id} style='${bookmarkActiveBoxStyle}'></div>
            </div>
        `;
        return bookmarkHtml;
    } catch (error) {
        console.error('Error building bookmark HTML:', error);
    }
}

/**
 * Creates the current bookmark folder.
 * @description This function initializes the current bookmark folder by setting the current folder ID to 'root' if it is undefined or null.
 * It then manages user profiles, creates the main element for the folder, updates the address bar, and updates the bookmarks body for the folder.
 * @returns {void}
 * @default {'root'} The function defaults to the root folder if the current folder ID is empty.
 */
export const createCurrentBookmarkFolder = async () => {
    try {
        // Set userProfileExport.currentFolderId to 'root' if it is undefined or null
        userProfileExport.currentFolderId = (userProfileExport.currentFolderId !== undefined && userProfileExport.currentFolderId !== null) ? userProfileExport.currentFolderId : 'root';
        const currentObject = findBookmarkByKey(userProfileExport.currentUserBookmarks, userProfileExport.currentFolderId);
        if (currentObject && currentObject.type !== 'folder') {
            userProfileExport.currentFolderId = currentObject.parentId;
        }

        await manageUserProfiles('get'); // Manage user profiles by getting the current profile
        await createMainElementForFolder(); // Create the main element for the folder
        await updateAddressBarForFolder(); // Update the address bar for the folder
        await updateBookmarksBodyForFolder(); // Update the bookmarks body for the folder
    } catch (error) {
        // Log any errors that occur during the process
        console.error(`Error creating current bookmark folder ID ${userProfileExport.currentFolderId}:`, error);
        showMessageToastify('error', '', `Error loading current bookmark folder. Login again the root folder.`, 5000, false, 'bottom', 'right', true);
        userProfileExport.currentFolderId = 'root';
        await createMainElementForFolder(); // Create the main element for the folder
        await updateAddressBarForFolder(); // Update the address bar for the folder
        await updateBookmarksBodyForFolder(); // Update the bookmarks body for the folder
    }
}

$(document).ready(async () => {
    try {
        /**
        * Calculates and sets the viewport height and width based on the maximum values obtained from different sources.
        * This ensures compatibility across different browsers and environments, providing a consistent way to determine
        * the viewport size. The viewport height and width are crucial for responsive designs and for positioning elements
        * relative to the viewport.
        * @description This function initializes the document when it is ready. It calculates the viewport dimensions, retrieves browser and OS information, sets the language, manages user profiles, and initializes the main functionality of the extension. If it is the first load, it performs the first load actions; otherwise, it creates the current bookmark folder and registers user activity.
        * @returns {void}
        */
        viewportHeight = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0, $(window).height() || 0);
        viewportWidth = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0, $(window).width() || 0);

        // Retrieve browser and OS information
        browserAndOSInfo = getBrowserAndOSInfo();

        // Must be in order.
        await getLanguage(); // Set the language
        await manageUserProfiles('get'); // Manage user profiles by getting the current profile
        await manageUserProfileActivity(); // Initialize the main functionality

        if (firstLoadStatus) {
            firstLoadWelcomeWindow(); // Perform first load actions
        } else {
            await userActivityRegister('save', 'openExtension'); // Register user activity
            const ifOpenFolderExist = await indexedDBManipulation('has', 'openFolder');
            if (ifOpenFolderExist) {
                const parentFolderObject = await indexedDBManipulation('get', 'openFolder');
                userProfileExport.currentFolderId = parentFolderObject.parentFolderId;
                await indexedDBManipulation('remove', 'openFolder');
            }
            await createCurrentBookmarkFolder(); // Create the current bookmark folder
            const ifOpenSettingsAfterReloadExist = await indexedDBManipulation('has', 'openSettingsAfterReload');
            if (ifOpenSettingsAfterReloadExist) {
                openCloseSettingWindow('open', 'default');
                await indexedDBManipulation('remove', 'openSettingsAfterReload');
            }
            addScrollListener();
        }

        browser.runtime.onMessage.addListener(async (request, sender, sendResponse) =>{
            if (sender.id === browser.runtime.id && request.saved) {
                await manageUserProfiles('get'); // Manage user profiles by getting the current profile
                createCurrentBookmarkFolder(); // Create the current bookmark folder
            }
        });
    } catch (error) {
        console.error('Error initializing the extension:', error); // Log any errors that occur during initialization
    }
});

/**
 * Registers an event handler for the 'beforeunload' event on the window.
 * @description This function attaches an event listener to the window's 'beforeunload' event.
 * When the event is triggered, it calls the userActivityRegister function to save the user's activity and indicate that the extension is being closed.
 * This ensures that any necessary cleanup or state-saving actions are performed before the window is unloaded. And saved to user activity log.
 * @returns {void}
 */
$(window).on('beforeunload', () => {
    userActivityRegister('save', 'closeExtension');
});

//"412 2a1 825 244 339 2e2 44f 192 b24 432"
//"82c 2d2 a16 262 328 212 442 092 925 272"
//"a1b 252 44c 0a1 82a 112 e1b 244 f0b 292"
//"e34 471 e14 4a1 020 2b2 e1c 132 a1d 2e1"
//"443 392 e2b 244 c2e 202 029 2b2 d24 4a1"
//"82d 144 a1b 2e1 44e 123 c13 2d2 e1d 144"
//"d29 244 22a 1f2 e14 433 92e 244 928 244"
//"b19 2a1 b2d 1f3 444 122 32c 244 e12 3d2"
//"e18 2c2 329 282 443 2c2 44d 1e1 c23 212"
//"82e 1d1 44d 292 44e 182 22a 182 c1e 144"
//"339 2e2 b24 4b1 929 252 72a 1b2 523 282"
//"124 4e1 230 2e1 b23 2e1 82c 1e1 144 472"
//"a15 232 821 244 32d 244 e1a 1c2 32e 1b2"
//"44d 292 449 2b2 12a 182 324 3e1 44a 182"
//"d14 4a1 c1c 1e1 c2c 244 339 2e2 b24 4f1"
//"a1f 292 b23 2d2 e14 4c2 32d 2e1 c2f 344"
//"71e 144 229 202 e14 433 92e 244 e18 242"
//"923 344 e2c 232 821 244 32d 244 a18 2d1"
//"44f 132 82d 144 32d 244 f2a 162 e2a 1b1"
//"62e 144 328 244 72a 182 a11 232 821 244"
//"339 2e2 b24 4b1 929 252 72a 1b2 52c 244"
//"e1f 1f1 32c 132 e18 2d2 623 3f3 449 0f1"
//"443 392 e24 422 a1f 2e1 44a 182 334 4f1"
//"e1e 1d1 b1a 1c1 524 492 b24 4c2 e21 212"
//"e1c 2d2 329 282 c21 444 026 2e1 a1c 2e1"
//"44f 1e1 e16 244 f1b 2e1 e14 4d2 924 4c2"
//"22a 1b2 e14 4d2 22e 172 441 332 d22 244"
//"e2c 2f3 448 0a1 020 233 44b 192 925 272"
//"a1b 252 328 212 e3- --- --- --- --- ---"