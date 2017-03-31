
import libHTTP = require("http");
import libEvents = require("events");
import libURL = require("url");

import { Exception, HashMap } from "lite-core";

import RegExpRouter = require("./class.RegExpRouter");
import SmartRouter = require("./class.SmartRouter");
import PlainRouter = require("./class.PlainRouter");

import { Router, Middleware } from "./internal";

import {
    ServerOptions,
    DEFAULT_BACKLOG,
    DEFAULT_HOST,
    DEFAULT_PORT,
    HTTPMethod,
    HTTPMethodHashMap,
    ServerRequest,
    ServerResponse,
    RequestHandler,
    RequestMiddleware,
    HTTPServer,
    ServerStatus
} from "./common";

export const EVENT_SHUTTING_DOWN: string = "SHUTTING_DOWN";

export const EVENT_NOT_FOUND: string = "NOT_FOUND";

export const EVENT_HANDLER_FAILURE: string = "HANDLER_FAILURE";

class Server extends libEvents.EventEmitter implements HTTPServer {

    protected _opts: ServerOptions;

    protected _status: ServerStatus;

    protected _server: libHTTP.Server;

    protected _handlers: HTTPMethodHashMap<Router, RequestHandler>;

    public constructor(opts?: ServerOptions) {

        super();

        this._opts = {};

        this._status = ServerStatus.IDLE;

        this._handlers = {
            "GET": [],
            "POST": [],
            "PUT": [],
            "PATCH": [],
            "DELETE": [],
            "OPTIONS": [],
            "HEAD": [],
            "ERROR": {}
        };

        if (opts) {

            this._opts.backlog = (typeof opts.backlog === "number" ? opts.backlog : DEFAULT_BACKLOG);
            this._opts.port = (typeof opts.port === "number" ? opts.port : DEFAULT_PORT);
            this._opts.host = (typeof opts.host === "string" ? opts.host : DEFAULT_HOST);
        }
        else {

            this._opts.backlog = DEFAULT_BACKLOG;
            this._opts.port = DEFAULT_PORT;
            this._opts.host = DEFAULT_HOST;
        }

        this.register("ERROR", EVENT_SHUTTING_DOWN, async (req: ServerRequest, resp: ServerResponse) => {

            this.displayHTTPError(resp, 500, "SYSTEM MAINTANCING");

            req.destroy();

            return;
        });

        this.register("ERROR", EVENT_NOT_FOUND, async (req: ServerRequest, resp: ServerResponse) => {

            this.displayHTTPError(resp, 404, "NOT FOUND");
            return;
        });

        this.register("ERROR", EVENT_HANDLER_FAILURE, async (req: ServerRequest, resp: ServerResponse) => {

            if (!resp.finished) {

                this.displayHTTPError(resp, 500, "INTERNAL ERROR");
            }

            return;
        });

    }

    public displayHTTPError(resp: ServerResponse, code: number, msg: string): void {
        resp.writeHead(code, msg);
        resp.end(`<!doctype html>
<html lang="en_US">
    <head>
        <meta charset="utf-8">
        <title>${msg}</title>
    </head>
    <body>
        <h1 style="text-align: center">HTTP ${code}</h1>
        <h2 style="text-align: center">${msg}</h2>
    </body>
</html>`);
}

    public get status(): ServerStatus {

        return this._status;
    }

    public close(): Server {

        if (this._status !== ServerStatus.WORKING) {

            return this;
        }

        this._status = ServerStatus.CLOSING;

        this._server.close((): void => {

            this._status = ServerStatus.IDLE;
            this._server = undefined;

            this.emit("close");
        });

        return this;
    }

    public register(
        method: HTTPMethod | "ERROR",
        uri: string | RegExp,
        ...args: any[]
    ): Server {

        let handler: RequestHandler;
        let options: HashMap<any>;

        if (args.length === 2) {

            options = args[0];
            handler = args[1];
        }
        else {

            handler = args[0];
        }

        if (method === "ERROR") {

            if (typeof uri !== "string") {

                if (this.listenerCount("error")) {

                    this.emit("error", new Error("Invalid type of ERROR handler."));
                    return this;
                }
                else {

                    throw new Error("Invalid type for ERROR.");
                }
            }

            this._handlers["ERROR"][uri] = handler;

            return this;
        }

        if (typeof uri === "string") {

            if (uri.indexOf("{") > -1) {

                this._handlers[method].push(new SmartRouter(uri, handler, options));
            }
            else {

                this._handlers[method].push(new PlainRouter(uri, handler, options));
            }
        }
        else {

            this._handlers[method].push(new RegExpRouter(uri, handler, options));
        }

        return this;
    }

    /**
     * This private method helps execute a handler.
     * @param handler The handler to be executed.
     * @param req The request controlling object.
     * @param resp The response controlling object.
     */
    protected async _executeHandler(
        handler: RequestHandler,
        req: ServerRequest,
        resp: libHTTP.ServerResponse
    ) {

        try {

            await handler(req, resp);

            if (!resp.finished) {

                resp.end();
            }
        }
        catch (e) {

            handler = this._handlers["ERROR"][EVENT_HANDLER_FAILURE];

            await handler(req, resp);

            if (!resp.finished) {

                resp.end();
            }
        }
    }

    public start(): Server {

        if (this._server) {

            return this;
        }

        this._status = ServerStatus.STARTING;

        this._server = libHTTP.createServer(async (
            req: ServerRequest,
            resp: libHTTP.ServerResponse
        ) => {

            req.params = {};

            let url: libURL.Url = libURL.parse(req.url, true);

            req.server = this;

            req.path = url.pathname.endsWith("/") ? url.pathname.substr(0, url.pathname.length - 1) : url.pathname;

            req.queries = url.query;

            req.queryString = url.search;

            url = undefined;

            let handler: RequestHandler;

            if (this._status === ServerStatus.CLOSING) {

                handler = this._handlers["ERROR"][EVENT_SHUTTING_DOWN];

                this._executeHandler(handler, req, resp);

                return this;
            }

            for (let item of this._handlers[req.method]) {

                if (item.route(req.path, req.params)) {
                    handler = item.handler;
                    req.handlerOptions = item.options;
                    break;
                }
            }

            if (!handler) {

                handler = this._handlers["ERROR"][EVENT_NOT_FOUND];
            }

            this._executeHandler(handler, req, resp);

        });

        this._server.listen(this._opts.port, this._opts.host, this._opts.backlog, (): void => {

            this._status = ServerStatus.WORKING;

            this.emit("started");
        });

        this._server.on("error", (e: any): void => {

            this.emit("error", e);
        });

        return this;
    }
}

export function createServer(opts?: ServerOptions): HTTPServer {

    return new Server(opts);
}
