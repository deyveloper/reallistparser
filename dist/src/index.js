"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const moment_1 = __importDefault(require("moment"));
const node_html_parser_1 = require("node-html-parser");
const errors_1 = require("./errors");
class Parser {
    constructor({ proxy }) {
        this.paths = {
            item: '/en/item/-itemId-',
            authorInfo: '/?w=12&&i=-itemId-',
            homepage: '/en/',
            category: '/en/category/-categoryId-/-page-',
            businessPages: '/en/pages?pg=-page-'
        };
        this.listUrl = 'https://list.am';
        this.proxy = proxy;
        this.initAxios();
    }
    initAxios() {
        this.axiosInstance = axios_1.default.create({
            baseURL: this.listUrl,
            proxy: this.proxy,
        });
    }
    getHompageLinks() {
        return __awaiter(this, void 0, void 0, function* () {
            const homepageUri = this
                ._generateUri(this.paths.homepage, {});
            const homeResponse = yield this
                .axiosInstance.get(homepageUri);
            if (homeResponse.status !== 200) {
                throw new errors_1.UnknownStatusCode({
                    waitingFor: [200],
                    recieved: homeResponse.status,
                    msg: `When getHompageLinks`
                });
            }
            const parsedHtml = (0, node_html_parser_1.parse)(homeResponse.data);
            const linkElements = parsedHtml.querySelectorAll('.c > a');
            const links = {};
            for (let linkElement of linkElements) {
                links[linkElement.getAttribute('href') || ''] = {
                    name: linkElement.innerText
                };
            }
            return links;
        });
    }
    getCategoryLinks({ categoryId, page = '0' }) {
        return __awaiter(this, void 0, void 0, function* () {
            const categoryUri = this
                ._generateUri(this.paths.category, {
                categoryId,
                page
            });
            const categoryResponse = yield this
                .axiosInstance.get(categoryUri);
            if (categoryResponse.status !== 200) {
                throw new errors_1.UnknownStatusCode({
                    waitingFor: [200],
                    recieved: categoryResponse.status,
                    msg: `When getCategoryLinks -> ${categoryId}|${page}`
                });
            }
            const parsedHtml = (0, node_html_parser_1.parse)(categoryResponse.data);
            const linkElements = parsedHtml.querySelectorAll('.gl > a, .dl > a');
            const links = {};
            for (let linkElement of linkElements) {
                links[linkElement.getAttribute('href') || ''] = {
                    name: linkElement.innerText
                };
            }
            return links;
        });
    }
    getBusinessLinks({ page = '0' }) {
        return __awaiter(this, void 0, void 0, function* () {
            const businessUri = this
                ._generateUri(this.paths.businessPages, {
                page
            });
            const businessResponse = yield this
                .axiosInstance.get(businessUri);
            if (businessResponse.status !== 200) {
                throw new errors_1.UnknownStatusCode({
                    waitingFor: [200],
                    recieved: businessResponse.status,
                    msg: `When getBusinessLinks -> ${page}`
                });
            }
            const parsedHtml = (0, node_html_parser_1.parse)(businessResponse.data);
            const linkElements = parsedHtml.querySelectorAll('.dlbp > a');
            const links = {};
            for (let linkElement of linkElements) {
                links[linkElement.getAttribute('href') || ''] = {
                    name: linkElement.innerText
                };
            }
            return links;
        });
    }
    getItemInfo({ itemId }) {
        return __awaiter(this, void 0, void 0, function* () {
            /**
             * URN -> the name of a resource on the network,
             * defines only the name of the resource,
             * but does not say how to connect to it
             */
            const itemUrn = this._generateUri(this.paths.item, { itemId });
            const itemResponse = yield this.axiosInstance.get(itemUrn);
            if (itemResponse.status !== 200) {
                throw new errors_1.UnknownStatusCode({
                    waitingFor: [200],
                    recieved: itemResponse.status,
                    msg: `When getItemInfo item -> ${itemId}`
                });
            }
            const parsedHtml = (0, node_html_parser_1.parse)(itemResponse.data);
            return yield this.parseItemInfo(parsedHtml);
        });
    }
    parseItemInfo(parsedHtml) {
        return __awaiter(this, void 0, void 0, function* () {
            const parsedItemInfo = {
                name: this._getName(parsedHtml),
                description: this._getDescription(parsedHtml),
                price: this._getPrice(parsedHtml),
                location: this._getLocation(parsedHtml),
                flags: this._getFlags(parsedHtml),
                footer: this._getFooterInfo(parsedHtml),
                categories: this._getCategories(parsedHtml),
                properties: this._getProperties(parsedHtml),
                images: this._getImages(parsedHtml),
                author: yield this._getAuthorInfo(parsedHtml)
            };
            return parsedItemInfo;
        });
    }
    _getName(parsedHtml) {
        const nameElement = parsedHtml.querySelector('h1[itemprop="name"]');
        const text = nameElement === null || nameElement === void 0 ? void 0 : nameElement.text;
        return text || '';
    }
    _getDescription(parsedHtml) {
        const descElement = parsedHtml
            .querySelector('div[itemprop="description"]');
        const text = descElement === null || descElement === void 0 ? void 0 : descElement.text;
        return text || '';
    }
    _getPrice(parsedHtml) {
        const priceElement = parsedHtml.querySelector('span[itemprop="price"]');
        const priceAmount = priceElement === null || priceElement === void 0 ? void 0 : priceElement.getAttribute('content');
        const currencyElement = priceElement === null || priceElement === void 0 ? void 0 : priceElement.querySelector('meta[itemprop="priceCurrency"]');
        const currency = currencyElement === null || currencyElement === void 0 ? void 0 : currencyElement.getAttribute('content');
        const additionalInfo = priceElement === null || priceElement === void 0 ? void 0 : priceElement.text;
        return { priceAmount, currency, additionalInfo };
    }
    _getLocation(parsedHtml) {
        const locationElement = parsedHtml.querySelector('div.loc > a');
        const location = locationElement === null || locationElement === void 0 ? void 0 : locationElement.text;
        const mapRef = locationElement === null || locationElement === void 0 ? void 0 : locationElement.getAttribute('onclick');
        return { location, mapRef };
    }
    _getFlags(parsedHtml) {
        const flagElements = parsedHtml.querySelectorAll('div.pblock > *');
        const flagsIndexMap = {
            0: 'top',
            1: 'homepage',
            2: 'urgent'
        };
        const flagsInfo = {
            top: false,
            homepage: false,
            urgent: false
        };
        for (let index in flagElements) {
            if (!flagsIndexMap[index])
                continue;
            flagsInfo[flagsIndexMap[index]]
                = flagElements[index].classList.contains('g');
        }
        return flagsInfo;
    }
    _getFooterInfo(parsedHtml) {
        var _a;
        const footer = parsedHtml.querySelector('.footer');
        const datePostedElement = footer === null || footer === void 0 ? void 0 : footer.querySelector('span[itemprop="datePosted"]');
        const datePosted = (0, moment_1.default)(datePostedElement === null || datePostedElement === void 0 ? void 0 : datePostedElement.getAttribute('content'));
        const renewedInDate = new Date(((_a = footer === null || footer === void 0 ? void 0 : footer.querySelector('*:nth-child(3)')) === null || _a === void 0 ? void 0 : _a.text.toLowerCase().replace(/renewed:/g, '').trim()) || '');
        const renewed = (0, moment_1.default)(renewedInDate);
        return { datePosted, renewed };
    }
    _getCategories(parsedHtml) {
        const crumbElement = parsedHtml.querySelector('div[id="crumb"]');
        const categoryElements = (crumbElement === null || crumbElement === void 0 ? void 0 : crumbElement.querySelectorAll('span[itemprop="name"]')) || [];
        const categories = [];
        for (let categoryElement of categoryElements) {
            categories.push(categoryElement.text);
        }
        return { categories };
    }
    _getProperties(parsedHtml) {
        var _a, _b;
        const propElements = parsedHtml.querySelectorAll('div[id="attr"] > div.c');
        const properties = {};
        for (let propElement of propElements) {
            const type = (((_a = propElement.querySelector('div.t')) === null || _a === void 0 ? void 0 : _a.text) || '').toLowerCase().replace(/\s/g, '_');
            const prop = (((_b = propElement.querySelector('div.i')) === null || _b === void 0 ? void 0 : _b.text) || '').toLowerCase();
            properties[type] = prop;
        }
        return Object.assign({}, properties);
    }
    _getImages(parsedHtml) {
        const imgElements = parsedHtml.querySelectorAll('.pv .p img');
        const images = [];
        for (let imgElement of imgElements) {
            images.push((imgElement === null || imgElement === void 0 ? void 0 : imgElement.getAttribute('src')) || '');
        }
        return [...images];
    }
    _getAuthorInfo(parsedHtml) {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const callElement = parsedHtml.querySelector('.phone > a');
            const callOnClick = (callElement === null || callElement === void 0 ? void 0 : callElement.getAttribute('onclick')) || '';
            const authorMatch = callOnClick === null || callOnClick === void 0 ? void 0 : callOnClick.match(/(?<=(Call','))\/[^.]*'/g);
            const authorUrl = ((authorMatch
                && ((_a = authorMatch[0]) === null || _a === void 0 ? void 0 : _a.replace('\'', '')))
                || [][0]) || '/';
            const authorResponse = yield this.axiosInstance.get(authorUrl, {
                proxy: this.proxy
            });
            if (authorResponse.status !== 200) {
                throw new errors_1.UnknownStatusCode({
                    waitingFor: [200],
                    recieved: authorResponse.status,
                    msg: `When _getAuthorInfo -> ${authorUrl}`
                });
            }
            const authorParsed = (0, node_html_parser_1.parse)(authorResponse.data);
            const registerSinceMatch = (_b = authorParsed.querySelector('.since')) === null || _b === void 0 ? void 0 : _b.innerHTML.match(/\d\d.\d\d.\d\d\d\d/);
            const registerSince = (0, moment_1.default)((registerSinceMatch && registerSinceMatch[0])
                || (0, moment_1.default)(), 'DD.MM.YYYY');
            const avatarElement = authorParsed.querySelector('.av_user');
            const avatar = (avatarElement === null || avatarElement === void 0 ? void 0 : avatarElement.getAttribute('src')) || '';
            const phones = [];
            const phoneElements = authorParsed.querySelectorAll('.phones > a');
            for (let phoneElement of phoneElements) {
                const phone = (phoneElement.getAttribute('href') || '')
                    .replace(/[^0-9]/g, '');
                phones.push(phone);
            }
            const personalElement = authorParsed.querySelector('.n');
            const userUrl = (personalElement === null || personalElement === void 0 ? void 0 : personalElement.getAttribute('href')) || '';
            const name = ((_c = personalElement === null || personalElement === void 0 ? void 0 : personalElement.querySelector('> div')) === null || _c === void 0 ? void 0 : _c.text) || '';
            return {
                registerSince,
                avatar,
                phones,
                userUrl,
                name
            };
        });
    }
    _generateUri(path, values, full = false) {
        let url = (full ? this.listUrl : '') + path;
        const keys = Object.keys(values);
        for (let key of keys) {
            const currRegex = new RegExp(`-${key}-`, 'g');
            url = url.replace(currRegex, values[key]);
        }
        return url;
    }
}
// const writeToJson = async (data: string, filename: string) => {
//     const stringified = JSON.stringify(data, null, 4);
//     await fs.writeFile(filename, stringified, () => null);
// };
// let p = new Parser({});
// (async () => {
//     // console.log(p.getItemInfo({ itemId: '15592481' }));
//     // for (let i = 0; i < 10; i++) {
//     //     data = { ...await p.getHompageLinks(), ...data };
//     // }
//     // console.log(Object.keys(data).length);
//     for (let categoryId in categories) {
//         let data: any = {};
//         let lastCountOfItems = 0;
//         let page = 0;
//         do {
//             // @ts-ignore
//             console.log(`[iter] CategoryId: ${categoryId}, Category: ${categories[categoryId]}, Page: ${page}`);
//             lastCountOfItems = Object.keys(data).length;
//             data = {
//                 ...await p.getCategoryLinks({
//                     categoryId,
//                     page: page.toString()
//                 }), ...data
//             };
//             page++;
//         } while (lastCountOfItems !== Object.keys(data).length)
//         //@ts-ignore
//         console.log(`[result] CategoryId: ${categoryId}, Category: ${categories[categoryId]}, foundPages: ${page}, foundItems: ${Object.keys(data).length}`);
//         //@ts-ignore
//         await writeToJson(data, `${categoryId}_${categories[categoryId]}.json`);
//     }
//     // for (let i = 0; i < 100; i++) {
//     //     data = { ...await p.getBusinessLinks({
//     //         page: `${i}`
//     //     }), ...data };
//     // }
//     // console.log(Object.keys(data).length);
// })();
exports.default = Parser;
//# sourceMappingURL=index.js.map