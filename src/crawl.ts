import * as htmlparser from "htmlparser2";
import * as http from "http";
import * as https from "https";
import * as URL from "url";

export async function crawl(initialUrl: string) {
    const initialUrlObject = URL.parse(initialUrl);
    const visited = new Set<string>();
    const result: { [code: number]: number } = {};

    const agentHttp = new http.Agent({
        keepAlive: true,
    });
    const agentHttps = new https.Agent({
        keepAlive: true,
    });

    const visit = async (urlObject: URL.UrlWithStringQuery) => {
        visited.add(urlObject.path || "");

        const requestOptions = {
            method: "GET",
            port: urlObject.port,
            hostname: urlObject.hostname,
            path: urlObject.path,
        };

        let request: http.ClientRequest;
        switch (urlObject.protocol) {
            case undefined:
            case "http:":
                request = http.request({
                    ...requestOptions,
                    // ...{ agent: agentHttp },
                });
                break;
            case "https:":
                request = https.request({
                    ...requestOptions,
                    // ...{ agent: agentHttps },
                });
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

        const urlHref = URL.format(urlObject);
        const linkObjectList = await new Promise<URL.UrlWithStringQuery[]>(
            (resolve, reject) => {
                const list = new Array<URL.UrlWithStringQuery>();
                const parser = new htmlparser.Parser({
                    onopentag: (name, attribs) => {
                        if (name !== "a") return;

                        const linkUrlHref = URL.resolve(urlHref, attribs.href);
                        const linkUrlObject = URL.parse(linkUrlHref);
                        if (!(
                            linkUrlObject.protocol === "http:" ||
                            linkUrlObject.protocol === "https:"
                        )) return;
                        if (linkUrlObject.host !== initialUrlObject.host) return;
                        if (visited.has(linkUrlObject.path || "")) return;

                        list.push(linkUrlObject);
                    },
                });
                response.
                    on("error", reject).
                    on("data", chunk => parser.write(String(chunk))).
                    on("end", () => resolve(list));
            });
        await Promise.all(
            linkObjectList.map(visit),
        );
    };

    await visit(initialUrlObject);

    agentHttp.destroy();
    agentHttps.destroy();

    return result;
}
