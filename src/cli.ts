import { crawl } from "./crawl";

main(...process.argv.slice(2));
async function main(...arg: string[]) {
    // tslint:disable:no-console
    const [url] = arg;
    console.log(url);
    const result = await crawl(url);
    console.log(result);
}
