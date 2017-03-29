import * as HTTP from ".";

let serv: HTTP.Server = new HTTP.Server({
    "host": "0.0.0.0",
    "port": 8889
});

serv.register("GET", "/", async function(req: HTTP.ServerRequest, resp: HTTP.ServerResponse) {

    resp.write("Hello World!");

}).register("GET", "/abc", async function(req: HTTP.ServerRequest, resp: HTTP.ServerResponse) {

    resp.writeHead(200, "OK");
    resp.write("Hello World!");

    return Promise.reject(new Error("fff"));

}).notFound(async function(req: HTTP.ServerRequest, resp: HTTP.ServerResponse) {

    resp.writeHead(404, "NOT FOUND");
    resp.write("Who are you, what are you looking.");

});

serv.start().on("started", function(): void {

    console.log("Server is listening on 0.0.0.0:8889.");

}).on("error", function(e: Error): void {

    console.error(e);
});
