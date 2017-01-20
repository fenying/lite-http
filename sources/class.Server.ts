
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
            "HEAD": []
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

        this._errorHandlers["notFound"] = handler;

        return this;
    }

    public start(): Server {

        let server: Server = this;

        this._server = libHTTP.createServer(function(
            this: Server,
            req: ServerRequest,
            resp: libHTTP.ServerResponse
        ): void {

            req.params = {};

            let url: libURL.Url = libURL.parse(req.url, true);

            req.path = (url.pathname[url.pathname.length - 1] === "/") ? url.pathname.substr(0, url.pathname.length - 1) : url.pathname;

            req.queries = url.query;

            req.queryString = url.search;

            url = undefined;

            let cb = function() {

                if (!resp.finished) {

                    resp.end();
                }
            };

            for (let router of this._handlers[req.method]) {

                if (router.route(req.path, req.params)) {

                    router.handler.call(this, req, resp, cb);
                    return;
                }
            }

            if (this._errorHandlers["notFound"]) {

                this._errorHandlers["notFound"].call(this, req, resp, cb);
            }
            else {

                resp.writeHead(404, "NOT FOUND");
                resp.end();
            }

        }.bind(this));

        this._server.listen(this._opts.port, this._opts.host, this._opts.backlog, function() {

            server.emit("started");
        });

        return this;
    }
}
