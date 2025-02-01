import { AtpAgent } from "@atproto/api";
import * as process from "process";
import { splitPost } from "./splitPost.js";

async function getAgent() {
  const agent = new AtpAgent({
    service: "https://bsky.social",
  });

  await agent.login({
    identifier: process.env.BLUESKY_USERNAME,
    password: process.env.BLUESKY_PASSWORD,
  });
  return agent;
}

export async function post(text, attachments) {
  const agent = await getAgent();

  const uploadedAttachments = await Promise.all(
    attachments.map(async (attachment) => {
      const type = attachment.url.match(/\.([^.]*$)/)?.[1];
      const res = await fetch(attachment.url);
      console.log(
        "uploading image",
        (attachment.description && attachment.description.slice(0, 30)) ||
          attachment.url
      );
      const { data } = await agent.uploadBlob(res.body);
      return { ...attachment, data, type };
    })
  ).catch((e) => {
    console.error("Error uploading media", e.message);
    return null;
  });

  if (!uploadedAttachments) {
    return;
  }

  const videos = uploadedAttachments.filter(
    (attachment) => attachment.type === "mp4"
  );
  const images = uploadedAttachments.filter(
    (attachment) => attachment.type !== "mp4"
  );

  const posts = splitPost(text, { maxLength: 300 });

  let embed = undefined;
  if (images.length && videos.length) {
    console.error("Video & images not supported in the same post");
  }

  if (images.length) {
    embed = {
      images: images.map((image) => ({
        image: image.data.blob,
        alt: image.description,
      })),
      $type: "app.bsky.embed.images",
    };
  } else if (videos.length === 1) {
    const attachment = videos[0];
    embed = {
      $type: "app.bsky.embed.video",
      video: attachment.data.blob,
      aspectRatio: {
        width: attachment.meta.width,
        height: attachment.meta.height,
      },
    };
  } else if (videos.length > 1) {
    console.error("Multiple videos aren't supported");
  }

  const ids = [];

  let firstRes;
  let lastRes;
  for (let thisPost of posts) {
    // If this a multi-part post, add reply metadata
    const postBody = {
      langs: ["en"],
      text: thisPost,
    };

    if (!firstRes) {
      postBody.embed = embed;
    }

    if (lastRes) {
      postBody.reply = {
        root: {
          uri: firstRes.uri,
          cid: firstRes.cid,
        },
        parent: {
          uri: lastRes.uri,
          cid: lastRes.cid,
        },
      };
    }

    console.log("creating post", JSON.stringify(postBody, null, 2));

    const res = await agent.post(postBody).catch((e) => {
      console.error("Couldn't create post: ", e);
    });

    if (!res) {
      continue;
    }
    ids.push(res.uri);
    lastRes = res;
    if (!firstRes) {
      firstRes = res;
    }
  }

  return ids;
}

export async function rm(postUri) {
  const agent = await getAgent();
  const res = await agent.deletePost(postUri);
  console.log("Deleted post", res);
  return res;
}
