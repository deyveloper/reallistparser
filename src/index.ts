import axios, { Axios } from 'axios';
import moment from 'moment';
import { parse as parseHtml, HTMLElement } from 'node-html-parser';
import { UnknownStatusCode } from './errors';
import { Proxy } from './interfaces';
import { Dictionary } from './interfaces/generic';


class Parser {
    proxy?: Proxy;
    axiosInstance: Axios;

    paths = {
        item: '/en/item/-itemId-',
        authorInfo: '/?w=12&&i=-itemId-',
        homepage: '/en/',
        category: '/en/category/-categoryId-/-page-',
        businessPages: '/en/pages?pg=-page-'
    };
    listUrl = 'https://list.am';

    constructor({
        proxy
    }: { proxy?: Proxy }) {
        this.proxy = proxy;
        this.initAxios();
    }

    initAxios() {
        this.axiosInstance = axios.create({
            baseURL: this.listUrl,
            proxy: this.proxy,
        });
    }

    async getHompageLinks() {
        const homepageUri = this
            ._generateUri(this.paths.homepage, {});
        const homeResponse = await this
            .axiosInstance.get<string>(homepageUri);

        if (homeResponse.status !== 200) {
            throw new UnknownStatusCode({
                waitingFor: [200],
                recieved: homeResponse.status,
                msg: `When getHompageLinks`
            });
        }

        const parsedHtml: HTMLElement = parseHtml(homeResponse.data);
        const linkElements = parsedHtml.querySelectorAll('.c > a');
        const links: {
            [key: string]: {
                name: string
            }
        } = {};

        for (let linkElement of linkElements) {
            links[linkElement.getAttribute('href') || ''] = {
                name: linkElement.innerText
            }
        }

        return links;
    }

    async getCategoryLinks({
        categoryId,
        page = '0'
    }: {
        categoryId: string,
        page: string
    }) {
        const categoryUri = this
            ._generateUri(this.paths.category, {
                categoryId,
                page
            });
        const categoryResponse = await this
            .axiosInstance.get<string>(categoryUri);


        if (categoryResponse.status !== 200) {
            throw new UnknownStatusCode({
                waitingFor: [200],
                recieved: categoryResponse.status,
                msg: `When getCategoryLinks -> ${categoryId}|${page}`
            });
        }

        const parsedHtml: HTMLElement = parseHtml(categoryResponse.data);
        const linkElements = parsedHtml.querySelectorAll('.gl > a, .dl > a');
        const links: {
            [key: string]: {
                name: string
            }
        } = {};

        for (let linkElement of linkElements) {
            links[linkElement.getAttribute('href') || ''] = {
                name: linkElement.innerText
            }
        }

        return links;
    }

    async getBusinessLinks({
        page = '0'
    }: {
        page: string
    }) {
        const businessUri = this
            ._generateUri(this.paths.businessPages, {
                page
            });
        const businessResponse = await this
            .axiosInstance.get<string>(businessUri);

        if (businessResponse.status !== 200) {
            throw new UnknownStatusCode({
                waitingFor: [200],
                recieved: businessResponse.status,
                msg: `When getBusinessLinks -> ${page}`
            });
        }

        const parsedHtml: HTMLElement = parseHtml(businessResponse.data);
        const linkElements = parsedHtml.querySelectorAll('.dlbp > a');
        const links: {
            [key: string]: {
                name: string
            }
        } = {};

        for (let linkElement of linkElements) {
            links[linkElement.getAttribute('href') || ''] = {
                name: linkElement.innerText
            }
        }

        return links;
    }

    async getItemInfo({
        itemId
    }: { itemId: string }) {
        /**
         * URN -> the name of a resource on the network,
         * defines only the name of the resource,
         * but does not say how to connect to it
         */
        const itemUrn = this._generateUri(this.paths.item, { itemId });
        const itemResponse = await this.axiosInstance.get<string>(itemUrn);
        if (itemResponse.status !== 200) {
            throw new UnknownStatusCode({
                waitingFor: [200],
                recieved: itemResponse.status,
                msg: `When getItemInfo item -> ${itemId}`
            });
        }

        const parsedHtml: HTMLElement = parseHtml(itemResponse.data);
        return await this.parseItemInfo(parsedHtml);
    }

    private async parseItemInfo(parsedHtml: HTMLElement) {
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
            author: await this._getAuthorInfo(parsedHtml)
        };

        return parsedItemInfo;
    }

    private _getName(parsedHtml: HTMLElement): string {
        const nameElement = parsedHtml.querySelector('h1[itemprop="name"]');
        const text = nameElement?.text;
        return text || '';
    }

    private _getDescription(parsedHtml: HTMLElement): string {
        const descElement = parsedHtml
            .querySelector('div[itemprop="description"]');
        const text = descElement?.text;
        return text || '';
    }

    private _getPrice(parsedHtml: HTMLElement): {
        priceAmount?: string,
        currency?: string,
        additionalInfo?: string
    } {
        const priceElement = parsedHtml.querySelector('span[itemprop="price"]');
        const priceAmount = priceElement?.getAttribute('content');
        const currencyElement = priceElement?.querySelector('meta[itemprop="priceCurrency"]');
        const currency = currencyElement?.getAttribute('content');
        const additionalInfo = priceElement?.text;
        return { priceAmount, currency, additionalInfo };
    }

    private _getLocation(parsedHtml: HTMLElement): {
        location?: string,
        mapRef?: string
    } {
        const locationElement = parsedHtml.querySelector('div.loc > a');
        const location = locationElement?.text;
        const mapRef = locationElement?.getAttribute('onclick');
        return { location, mapRef };
    }

    private _getFlags(parsedHtml: HTMLElement): {
        top: boolean,
        homepage: boolean,
        urgent: boolean
    } {
        const flagElements = parsedHtml.querySelectorAll('div.pblock > *');
        const flagsIndexMap: {
            [key: number]: string
        } = {
            0: 'top',
            1: 'homepage',
            2: 'urgent'
        };

        const flagsInfo: {
            [key: string]: boolean,
            top: boolean,
            homepage: boolean,
            urgent: boolean
        } = {
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

    private _getFooterInfo(parsedHtml: HTMLElement): {
        datePosted: moment.Moment,
        renewed: moment.Moment,
    } {
        const footer = parsedHtml.querySelector('.footer');
        const datePostedElement = footer
            ?.querySelector('span[itemprop="datePosted"]');

        const datePosted = moment(
            datePostedElement?.getAttribute('content'),
        );
        const renewedInDate = new Date(footer
            ?.querySelector('*:nth-child(3)')
            ?.text.toLowerCase().replace(/renewed:/g, '').trim() || '');

        const renewed = moment(renewedInDate);

        return { datePosted, renewed };
    }

    private _getCategories(parsedHtml: HTMLElement): {
        categories: string[]
    } {
        const crumbElement = parsedHtml.querySelector('div[id="crumb"]');
        const categoryElements = crumbElement
            ?.querySelectorAll('span[itemprop="name"]') || [];
        const categories: string[] = [];
        for (let categoryElement of categoryElements) {
            categories.push(categoryElement.text);
        }
        return { categories };
    }

    private _getProperties(parsedHtml: HTMLElement): {
        [key: string]: string
    } {
        const propElements = parsedHtml.querySelectorAll('div[id="attr"] > div.c');
        const properties: {
            [key: string]: string
        } = {};

        for (let propElement of propElements) {
            const type = (propElement.querySelector('div.t')
                ?.text || '').toLowerCase().replace(/\s/g, '_');
            const prop = (propElement.querySelector('div.i')
                ?.text || '').toLowerCase();
            properties[type] = prop;
        }

        return { ...properties };
    }

    private _getImages(parsedHtml: HTMLElement): string[] {
        const imgElements = parsedHtml.querySelectorAll('.pv .p img');
        const images: string[] = [];

        for (let imgElement of imgElements) {
            images.push(imgElement?.getAttribute('src') || '');
        }

        return [...images];
    }

    private async _getAuthorInfo(parsedHtml: HTMLElement): Promise<{
        name: string,
        registerSince: moment.Moment,
        avatar: string,
        phones: string[],
        userUrl: string
    }> {
        const callElement = parsedHtml.querySelector('.phone > a');

        const callOnClick = callElement?.getAttribute('onclick') || '';
        const authorMatch = callOnClick
            ?.match(/(?<=(Call','))\/[^.]*'/g);

        const authorUrl = (
            (authorMatch
                && authorMatch[0]?.replace('\'', ''))
            || [][0]) || '/';

        const authorResponse = await this.axiosInstance.get(authorUrl, {
            proxy: this.proxy
        });


        if (authorResponse.status !== 200) {
            throw new UnknownStatusCode({
                waitingFor: [200],
                recieved: authorResponse.status,
                msg: `When _getAuthorInfo -> ${authorUrl}`
            });
        }

        const authorParsed = parseHtml(authorResponse.data);

        const registerSinceMatch = authorParsed.querySelector('.since')
            ?.innerHTML.match(/\d\d.\d\d.\d\d\d\d/);

        const registerSince = moment(
            (registerSinceMatch && registerSinceMatch[0])
            || moment(), 'DD.MM.YYYY');

        const avatarElement = authorParsed.querySelector('.av_user');
        const avatar = avatarElement?.getAttribute('src') || '';

        const phones: string[] = [];

        const phoneElements = authorParsed.querySelectorAll('.phones > a');

        for (let phoneElement of phoneElements) {
            const phone = (phoneElement.getAttribute('href') || '')
                .replace(/[^0-9]/g, '');
            phones.push(phone);
        }

        const personalElement = authorParsed.querySelector('.n');

        const userUrl = personalElement?.getAttribute('href') || '';
        const name = personalElement?.querySelector('> div')?.text || '';


        return {
            registerSince,
            avatar,
            phones,
            userUrl,
            name
        };
    }

    private _generateUri(path: string,
        values: Dictionary<string>, full = false): string {
        let url = (full ? this.listUrl : '') + path;
        const keys = Object.keys(values);
        for (let key of keys) {
            const currRegex = new RegExp(
                `-${key}-`,
                'g'
            );

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

export default Parser;