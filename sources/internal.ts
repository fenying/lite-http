
import { HashMap } from "lite-core";

import {
    RequestHandler,
    MiddlewareHandler
} from "./common";

export interface Router<T> {

    handler: T;

    options: HashMap<any>;

    route(path: string, data?: any): boolean;
}

export interface Middleware {

    handler: MiddlewareHandler;

    route(path: string, data?: any): boolean;
}
