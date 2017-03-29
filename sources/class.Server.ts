
import libHTTP = require("http");
import libEvents = require("events");
import libURL = require("url");

import { Exception, HashMap } from "lite-core";

import RegExpRouter = require("./class.RegExpRouter");
import SmartRouter = require("./class.SmartRouter");
import PlainRouter = require("./class.PlainRouter");

import { Router } from "./internal";

import {
    ServerOptions,
    DEFAULT_BACKLOG,
    DEFAULT_HOST,
    DEFAULT_PORT,
    HTTPMethod,
    HTTPMethodHashMap,
    ServerRequest,
    RequestHandler,
    HTTPServer
} from "./common";

export class Server extends libEvents.EventEmitter implements HTTPServer {

    protected _opts: ServerOptions;

    protected _server: libHTTP.Server;

    protected _errorHandlers: HashMap<RequestHandler>;

    protected _handlers: HTTPMethodHashMap<Router[]>;

    public constructor(opts?: ServerOptions) {

        super();

        this._opts = {};

        this._errorHandlers = {};

        this._handlers = {
            "GET": [],
            "POST": [],
            "PUT": [],
            "PATCH": [],
            "DELETE": [],
            "OPTIONS": [],
            "HEAD": [],
            "ANY": []
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
        method: HTTPMethod,
        uri: string | RegExp,
        handler: RequestHandler
    ): Server {

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

    public notFound(handler: RequestHandler): Server {

        this._errorHandlers["NOT_FOUND"] = handler;

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

                for (let item of this._handlers["ANY"]) {

                    if (item.route(req.path, req.params)) {
                        router = item.handler;
                        break;
                    }
                }

                if (!router) {

                    router = this._errorHandlers["NOT_FOUND"];
                }
            }

            if (router) {

                try {

                    await router(req, resp);

                    if (!resp.finished) {

                        resp.end();
                    }
                }
                catch (e) {

                    if (this._errorHandlers["HANDLER_ERROR"]) {

                        await this._errorHandlers["HANDLER_ERROR"](req, resp);
                    }
                    else {

                        resp.writeHead(500, "INTERNAL ERROR");
                        if (!resp.finished) {

                            resp.end();
                        }
                    }
                }

                return;
            }

            try {

                resp.writeHead(404, "NOT FOUND");
                resp.end();
            }
            catch (e) {

                this.emit("error", e);
            }

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
