import * as HTTP from ".";

let serv: HTTP.HTTPServer = HTTP.createServer({
    "host": "0.0.0.0",
    "port": 8889
});

serv.register("GET", "/", async function(req: HTTP.ServerRequest, resp: HTTP.ServerResponse) {

    resp.write("Hello World!");

}).register("GET", "/login", async function(req: HTTP.ServerRequest, resp: HTTP.ServerResponse) {

    resp.end("Hello");

}).hook("after-router", null, async function(req: HTTP.ServerRequest, resp: HTTP.ServerResponse) {

    if (req.path !== "/login") {

        if (req.headers["auth-code"] === undefined) {

            resp.setHeader("location", "/login");
            resp.writeHead(302, "REDIRECT");
            resp.end();
            return false;
        }
    }

    return true;

}).hook("end", null, async function(req: HTTP.ServerRequest, resp: HTTP.ServerResponse) {

    console.info(`${req.method} ${req.url} ${resp.statusCode}.`);
    return true;
});

serv.start().on("started", function(): void {

    console.log("Server is listening on 0.0.0.0:8889.");

}).on("error", function(e: Error): void {

    console.error(e);

}).on("close", function(): void {

    console.info("Server has been shutdown.");
});
