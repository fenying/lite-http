
import { RequestHandler } from "./common";

export interface Router {

    handler: RequestHandler;

    route(path: string, data?: any): boolean;
}

