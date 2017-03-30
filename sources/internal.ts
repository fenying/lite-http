
import {
    RequestHandler,
    RequestMiddleware
} from "./common";

export interface Router {

    handler: RequestHandler;

    route(path: string, data?: any): boolean;
}

export interface Middleware {

    handler: RequestMiddleware;

    route(path: string, data?: any): boolean;
}
