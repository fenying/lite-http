import { RequestHandler } from "./common";

import { Router } from "./internal";

class PlainRouter implements Router {

    private _path: string;

    public handler: RequestHandler;

    public constructor(rule: string, cb: RequestHandler) {

        if (rule.endsWith("/")) {

            this._path = rule.substr(0, rule.length - 1);
        }
        else {

            this._path = rule;
        }

        this.handler = cb;
    }

    public route(path: string): boolean {

        return path === this._path;
    }
}

export = PlainRouter;
