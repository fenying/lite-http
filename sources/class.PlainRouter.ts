
import { Router } from "./internal";

import { HashMap } from "lite-core";

class PlainRouter<T> implements Router<T> {

    private _path: string;

    public handler: T;

    public options: HashMap<any>;

    public constructor(rule: string, cb: T, opts: HashMap<any>) {

        this.options = opts;

        if (rule && rule.endsWith("/")) {

            this._path = rule.substr(0, rule.length - 1);
        }
        else {

            this._path = rule;
        }

        this.handler = cb;
    }

    public route(path: string): boolean {

        return this._path === null || path === this._path;
    }
}

export = PlainRouter;
