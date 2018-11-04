import * as cheerio from "cheerio";
import * as http from "http";
import * as https from "https";
import * as URL from "url";

export async function crawl(initialUrl: string) {
    const initialUrlObject = URL.parse(initialUrl);
    const visited = new Set<string>();
    const result: { [code: number]: number } = {};
    const agent = new http.Agent({
        keepAlive: true,
    });

    const visit = async (urlObject: URL.UrlWithStringQuery) => {
        if (
            urlObject.protocol !== "http:" &&
            urlObject.protocol !== "https:"
        ) return;

        visited.add(urlObject.path || "");

        const requestOptions = {
            method: "GET",
            port: urlObject.port,
            hostname: urlObject.hostname,
            path: urlObject.path,
            agent,
        };

        let request: http.ClientRequest;
        switch (urlObject.protocol) {
            case undefined:
            case "http:":
                request = http.request(requestOptions);
                break;
            case "https:":
                request = https.request(requestOptions);
                break;
            default: throw new Error("protocol not supported");
        }

        const response = await new Promise<http.IncomingMessage>(
            (resolve, reject) => request.
                on("error", reject).
                on("response", resolve).
                end(),
        );

        const statusCode = response.statusCode || 0;
        if (statusCode in result) result[statusCode]++;
        else result[statusCode] = 1;

        if (!(statusCode >= 200 && statusCode < 300)) return;

        const content = await new Promise<string>((resolve, reject) => {
            let buffer = "";
            response.
                on("error", reject).
                on("data", chunk => buffer += chunk).
                on("end", () => resolve(buffer));
        });

        const $ = cheerio.load(content);
        const linkList = $("a").toArray();
        const urlHref = URL.format(urlObject);
        await Promise.all(
            linkList.
                map(({ attribs }) => URL.resolve(urlHref, attribs.href)).
                map(linkUrlHref => URL.parse(linkUrlHref)).
                filter(linkUrlObject => linkUrlObject.host === initialUrlObject.host).
                filter(linkUrlObject => !visited.has(linkUrlObject.path || "")).
                map(linkUrlObject => visit(linkUrlObject)),
        );

    };

    await visit(initialUrlObject);

    agent.destroy();

    return result;
}
