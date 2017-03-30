
import { HashMap } from "lite-core";

import {
    RequestHandler,
    RequestMiddleware
} from "./common";

export interface Router {

    handler: RequestHandler;

    options: HashMap<any>;

    route(path: string, data?: any): boolean;
}

export interface Middleware {

    handler: RequestMiddleware;

    route(path: string, data?: any): boolean;
}
