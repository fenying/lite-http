
import libHTTP = require("http");

import { HashMap } from "lite-core";

/**
 * The handler for each request.
 */
export interface RequestHandler {

    (req: ServerRequest, resp: libHTTP.ServerResponse): Promise<void>;
}

/**
 * The middleware for each request.
 */
export interface RequestMiddleware {

    (req: ServerRequest, resp: libHTTP.ServerResponse): Promise<boolean>;
}

export interface HTTPServer {

    register(
        method: HTTPMethod,
        uri: string | RegExp,
        handler: RequestHandler
    ): HTTPServer;

    start(): HTTPServer;
}

export interface HTTPMethodHashMap<T, H> {

    "GET": T[];

    "POST": T[];

    "PUT": T[];

    "PATCH": T[];

    "DELETE": T[];

    "OPTIONS": T[];

    "HEAD": T[];

    "ERROR": Dictionary<H>;
}

export type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

export const HTTPMethods: string[] = [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
    "HEAD"
];

export enum ServerError {

    CLIENT_ERROR,
    APP_BUG
};

export interface ServerOptions {

    /**
     * The hostname for server to listen.
     */
    "host"?: string;

    /**
     * The port for server to listen.
     */
    "port"?: number;

    /**
     * How many requests can be wait in the queue.
     */
    "backlog"?: number;
}

/**
 * The default value of the hostname for a server.
 */
export const DEFAULT_HOST: string = "0.0.0.0";

/**
 * The default value of the port for a server.
 */
export const DEFAULT_PORT: number = 80;

/**
 * The default value of the max length of a waiting queue for a server.
 */
export const DEFAULT_BACKLOG: number = 511;

/**
 * The default value of the max time that a request can be waited.
 */
export const DEFAULT_MAX_TIME: number = 60;

/**
 * The request controlling object
 */
export interface ServerRequest extends libHTTP.IncomingMessage {

    /**
     * The parameters of request.
     */
    params: HashMap<any>;

    /**
     * The path in URI.
     */
    path: string;

    /**
     * The query parameters in URI.
     */
    queries: HashMap<string>;

    /**
     * The querystring in URI.
     */
    queryString: string;


    /**
     * The method of request.
     */
    method: HTTPMethod;
}

export type ServerResponse = libHTTP.ServerResponse;
