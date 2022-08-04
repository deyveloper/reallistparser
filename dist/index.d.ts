import { Axios } from 'axios';
import moment from 'moment';
import { Proxy } from './interfaces';
declare class Parser {
    proxy?: Proxy;
    axiosInstance: Axios;
    paths: {
        item: string;
        authorInfo: string;
        homepage: string;
        category: string;
        businessPages: string;
    };
    listUrl: string;
    constructor({ proxy }: {
        proxy?: Proxy;
    });
    initAxios(): void;
    getHompageLinks(): Promise<{
        [key: string]: {
            name: string;
        };
    }>;
    getCategoryLinks({ categoryId, page }: {
        categoryId: string;
        page: string;
    }): Promise<{
        [key: string]: {
            name: string;
        };
    }>;
    getBusinessLinks({ page }: {
        page: string;
    }): Promise<{
        [key: string]: {
            name: string;
        };
    }>;
    getItemInfo({ itemId }: {
        itemId: string;
    }): Promise<{
        name: string;
        description: string;
        price: {
            priceAmount?: string | undefined;
            currency?: string | undefined;
            additionalInfo?: string | undefined;
        };
        location: {
            location?: string | undefined;
            mapRef?: string | undefined;
        };
        flags: {
            top: boolean;
            homepage: boolean;
            urgent: boolean;
        };
        footer: {
            datePosted: moment.Moment;
            renewed?: moment.Moment | undefined;
        };
        categories: {
            categories: string[];
        };
        properties: {
            [key: string]: string;
        };
        images: string[];
        author: {
            name: string;
            registerSince: moment.Moment;
            avatar: string;
            phones: string[];
            userUrl: string;
        };
    }>;
    private parseItemInfo;
    private _getName;
    private _getDescription;
    private _getPrice;
    private _getLocation;
    private _getFlags;
    private _getFooterInfo;
    private _getCategories;
    private _getProperties;
    private _getImages;
    private _getAuthorInfo;
    private _generateUri;
}
export default Parser;
