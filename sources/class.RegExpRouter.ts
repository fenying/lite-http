import { RequestHandler } from "./common";

import { Router } from "./internal";

class RegExpRouter implements Router {

    private _path: RegExp;

    public handler: RequestHandler;

    public constructor(rule: RegExp, cb: RequestHandler) {

        this._path = rule;

        this.handler = cb;
    }

    public route(path: string): boolean {

        return this._path.exec(path) ? true : false;
    }
}

export = RegExpRouter;