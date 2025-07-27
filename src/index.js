import { fetchStatus, getMastoStream } from "./mastodon.js";
import * as bsky from "./bsky.js";
import fs from "fs";
import striptags from "striptags";
import he from "he";
import { resolvePath } from "./files.js";

const mastoToBskyPath = resolvePath("../logs/mastoToBsky.json");
const mastoToBsky = (() => {
  try {
    return JSON.parse(fs.readFileSync(mastoToBskyPath));
  } catch (e) {
    try {
      fs.mkdirSync(resolvePath("../logs"));
    } catch (e) {}
    return {};
  }
})();

function setMastoToBsky(masto, bsky) {
  mastoToBsky[masto] = bsky;
  fs.writeFileSync(mastoToBskyPath, JSON.stringify(mastoToBsky, null, 2));
}

getMastoStream(async (event, payload) => {
  if (event === "update") {
    console.log("Mastodon html: ", payload.content);
    const text = he
      .decode(striptags(payload.content.replace(/<p>/g, "\n<p>")))
      .trim();
    if (!text) {
      return;
    }
    const attachments = payload.media_attachments.map((attachment) => ({
      url: attachment.url,
      description: attachment.description,
      meta: attachment.meta.original,
    }));
    const ids = await bsky.post(text, attachments);
    setMastoToBsky(payload.id, ids);
  }
  if (event === "delete") {
    console.log("deleting", payload);
    // const statusToDelete = await fetchStatus(payload);
    // console.log("DELETE", statusToDelete);

    // const postUri = mastoToBsky[payload];
    // if (!postUri) {
    //   console.log("Delete: unknown id", payload);
    //   return;
    // }
    // const res = rm(postUri);
  }
});
