import { Router } from "./internal";

import { HashMap } from "lite-core";

class RegExpRouter<T> implements Router<T> {

    private _path: RegExp;

    public handler: T;

    public options: HashMap<any>;

    public constructor(rule: RegExp, cb: T, opts: HashMap<any>) {

        this.options = opts;

        this._path = rule;

        this.handler = cb;
    }

    public route(path: string): boolean {

        return this._path.exec(path) ? true : false;
    }
}

export = RegExpRouter;