import * as fetch from "isomorphic-fetch";
import { JSDOM } from "jsdom";
import * as URL from "url";

export async function crawl(initialUrl: string) {
    const initialUrlObject = URL.parse(initialUrl);
    const visited = new Set<string>();
    const result: { [code: number]: number } = {};

    const visit = async (url: string) => {
        const urlObject = URL.parse(url);
        if (urlObject.host !== initialUrlObject.host) return;

        if (
            urlObject.protocol !== "http:" &&
            urlObject.protocol !== "https:"
        ) return;

        const path = urlObject.path || "";
        if (visited.has(path)) return;

        visited.add(path);

        // tslint:disable-next-line:no-console
        // console.log(url);

        const res = await fetch(url);
        if (res.status in result) result[res.status]++;
        else result[res.status] = 1;

        if (!res.ok) return;

        const content = await res.text();
        const dom = new JSDOM(content);

        const linkList = Array.from(dom.window.document.links);
        await Promise.all(
            linkList.
                map(link => visit(URL.resolve(url, link.href))),
        );
    };

    await visit(initialUrl);

    return result;
}
