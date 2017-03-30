import * as HTTP from ".";

let serv: HTTP.Server = new HTTP.Server({
    "host": "0.0.0.0",
    "port": 8889
});

serv.register("GET", "/", async function(req: HTTP.ServerRequest, resp: HTTP.ServerResponse) {

    resp.write("Hello World!");

}).register("GET", "/abc", async function(req: HTTP.ServerRequest, resp: HTTP.ServerResponse) {

    return Promise.reject(new Error("fff"));

}).register("ERROR", "NOT_FOUND", async function(req: HTTP.ServerRequest, resp: HTTP.ServerResponse) {

    resp.writeHead(404, "NOT FOUND");
    resp.write("Who are you, what are you looking.");

}).register("ERROR", "HANDLER_FAILURE", async function(req: HTTP.ServerRequest, resp: HTTP.ServerResponse) {

    resp.writeHead(500, "SYSTEM FAILURE");
    resp.write("System crashed...");

});

serv.start().on("started", function(): void {

    console.log("Server is listening on 0.0.0.0:8889.");

}).on("error", function(e: Error): void {

    console.error(e);

}).on("close", function(): void {

    console.info("Server has been shutdown.");
});

setTimeout(function(): void {

    serv.close();

}, 5000);
