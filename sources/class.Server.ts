
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
    RequestHandler,
    RequestMiddleware,
    HTTPServer
} from "./common";

export class Server extends libEvents.EventEmitter implements HTTPServer {

    protected _opts: ServerOptions;

    protected _server: libHTTP.Server;

    protected _handlers: HTTPMethodHashMap<Router, RequestHandler>;

    public constructor(opts?: ServerOptions) {

        super();

        this._opts = {};

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
    }

    public close(): Server {

        this._server.close((): void => {

            this.emit("close");
        });

        return this;
    }

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

    public start(): Server {

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

            let router: RequestHandler;

            for (let item of this._handlers[req.method]) {

                if (item.route(req.path, req.params)) {
                    router = item.handler;
                    break;
                }
            }

            if (!router) {

                router = this._handlers["ERROR"]["NOT_FOUND"];
            }

            if (router) {

                try {

                    await router(req, resp);

                    if (!resp.finished) {

                        resp.end();
                    }
                }
                catch (e) {

                    if (router = this._handlers["ERROR"]["HANDLER_FAILURE"]) {

                        await router(req, resp);

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

                return;
            }

            resp.writeHead(404, "NOT FOUND");
            resp.end();

        });

        this._server.listen(this._opts.port, this._opts.host, this._opts.backlog, (): void => {

            this.emit("started");
        });

        this._server.on("error", (e: any): void => {

            this.emit("error", e);
        });

        return this;
    }
}
