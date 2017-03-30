import { RequestHandler } from "./common";

import { Router } from "./internal";

import { HashMap } from "lite-core";

class RegExpRouter implements Router {

    private _path: RegExp;

    public handler: RequestHandler;

    public options: HashMap<any>;

    public constructor(rule: RegExp, cb: RequestHandler, opts: HashMap<any>) {

        this.options = opts;

        this._path = rule;

        this.handler = cb;
    }

    public route(path: string): boolean {

        return this._path.exec(path) ? true : false;
    }
}

export = RegExpRouter;