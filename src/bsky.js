import { AtpAgent, RichText } from "@atproto/api";
import fetchOpengraph from "fetch-opengraph";
import * as process from "process";
import { splitPost } from "./splitPost.js";

export async function getAgent() {
  const agent = new AtpAgent({
    service: "https://bsky.social",
  });

  await agent.login({
    identifier: process.env.BLUESKY_USERNAME,
    password: process.env.BLUESKY_PASSWORD,
  });
  return agent;
}

export async function getPostBody(agent, thisPost = "", getImages = false) {
  const rt = new RichText({
    text: thisPost,
  });
  await rt.detectFacets(agent);

  const facets = rt.facets;

  const mainLink = facets.find(
    (facet) => facet.features[0].$type === "app.bsky.richtext.facet#link"
  );

  let embed;
  if (mainLink && getImages) {
    const { uri } = mainLink.features[0];
    const {
      "og:image": imageUrl,
      "og:title": title,
      "og:description": description = "",
    } = await fetchOpengraph.fetch(uri);

    if (title) {
      let imageDef;
      if (imageUrl) {
        // resolve potentially relative urls against the source uri
        const resolvedImage = URL.parse(imageUrl, uri).href;
        const res = await uploadAttachment(agent, resolvedImage);
        imageDef = res.data.blob;
      }
      embed = {
        $type: "app.bsky.embed.external",
        external: {
          uri,
          title: title,
          description: description,
          thumb: imageDef,
        },
      };
    }
    console.log("creating embed", embed);
  }

  return {
    langs: ["en"],
    text: rt.text,
    facets: facets,
    embed,
  };
}

/**
 * Uploads an attachment from a URL to Bluesky
 * @param {import("@atproto/api").AtpAgent} agent - The Bluesky API agent
 * @param {string} url - The URL of the attachment to upload
 * @returns {Promise<{data: any, type: string}>} The uploaded blob data and its type
 */
async function uploadAttachment(agent, url) {
  const type = url.match(/\.([^.]*$)/)?.[1];
  const res = await fetch(url);

  console.log("uploading attachment: ", { type, url });
  const upload = await agent.uploadBlob(res.body);
  return { data: upload.data, type };
}

export async function post(text, attachments) {
  const agent = await getAgent();

  const uploadedAttachments = await Promise.all(
    attachments.map(async (attachment) => {
      return {
        ...attachment,
        ...(await uploadAttachment(agent, attachment.url)),
      };
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
    if (!thisPost) {
      continue;
    }
    const postBody = await getPostBody(agent, thisPost, !embed);

    if (!firstRes && embed) {
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
