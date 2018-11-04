import * as http from "http";
import * as Koa from "koa";
import { crawl } from "./crawl";

main();

async function main() {
    // tslint:disable:no-console
    for (let count = 100; count <= 1000; count += 100) {
        const time = await crawlTime(count);
        console.log([count, time].join(";"));
    }
}

async function crawlTime(linkCount: number) {
    const koa = new Koa();
    koa.use(async (ctx) => {
        const linkList = new Array(linkCount)
            .fill(0)
            .map(
                (item, index) => `<a href="/${index}">${index}</a>`,
            );
        const html = `<!DOCTYPE html>
<html>
<head>${ctx.path}</head>
<body>
${linkList.join("\n")}
</body>
</html>
`;

        ctx.body = html;
    });

    const server = http.createServer(koa.callback());
    const socketPool = new Set();
    server.on("connection", (socket) => {
        socketPool.add(socket);
        socket.on("close", () => socketPool.delete(socket));
    });

    try {
        await new Promise(resolve => server.listen(resolve));

        const address = server.address();
        const begin = new Date().valueOf();
        const result = await crawl(`http://localhost:${address.port}`);
        const end = new Date().valueOf();
        return end - begin;
    } finally {
        socketPool.forEach(socket => socket.destroy());
        await new Promise(resolve => server.close(resolve));
    }
}
