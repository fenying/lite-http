
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

export class Server extends libEvents.EventEmitter implements HTTPServer {

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

        this.register("ERROR", "SHUTTING_DOWN", async function(req: ServerRequest, resp: ServerResponse) {
            resp.writeHead(500, "SYSTEM MAINTANCING");
            resp.end(`<h1 style="text-align: center;">Server is under maintance</h1>`);
            req.destroy();
            return;
        });
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

    /**
     * Added a handler for specific URI and HTTP Method.
     * @param method The HTTP method to be handled
     * @param uri The URI to be handled
     * @param handler The handler function
     */
    public register(
        method: HTTPMethod | "ERROR",
        uri: string | RegExp,
        handler: RequestHandler
    ): Server {

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

                this._handlers[method].push(new SmartRouter(uri, handler));
            }
            else {

                this._handlers[method].push(new PlainRouter(uri, handler));
            }
        }
        else {

            this._handlers[method].push(new RegExpRouter(uri, handler));
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

            if (handler = this._handlers["ERROR"]["HANDLER_FAILURE"]) {

                await handler(req, resp);

                if (!resp.finished) {

                    resp.end();
                }

                return;
            }

            resp.writeHead(500, "INTERNAL ERROR");
            if (!resp.finished) {

                resp.end();
            }
        }
    }

    /**
     * Start the server.
     */
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

            req.path = (url.pathname[url.pathname.length - 1] === "/") ? url.pathname.substr(0, url.pathname.length - 1) : url.pathname;

            req.queries = url.query;

            req.queryString = url.search;

            url = undefined;

            let handler: RequestHandler;

            if (this._status === ServerStatus.CLOSING) {

                handler = this._handlers["ERROR"]["SHUTTING_DOWN"];

                this._executeHandler(handler, req, resp);

                return this;
            }

            for (let item of this._handlers[req.method]) {

                if (item.route(req.path, req.params)) {
                    handler = item.handler;
                    break;
                }
            }

            if (!handler) {

                handler = this._handlers["ERROR"]["NOT_FOUND"];
            }

            if (handler) {

                this._executeHandler(handler, req, resp);

                return;
            }

            resp.writeHead(404, "NOT FOUND");
            resp.end();

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
