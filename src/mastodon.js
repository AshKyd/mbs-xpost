import WebSocket from "ws";
import fs from "fs";
import { resolvePath } from "./files.js";

export function getMastoStream(onMessage) {
  console.log("connecting to ", process.env.MASTODON_SERVER);

  let ws;
  let closer;
  function connect() {
    ws = new WebSocket(
      `wss://${process.env.MASTODON_SERVER}/api/v1/streaming`,
      {
        headers: {
          Authorization: `Bearer ${process.env.MASTODON_TOKEN}`,
        },
      }
    );

    ws.on("open", () => {
      console.log("Connected to WebSocket server");
      ws.send(JSON.stringify({ type: "subscribe", stream: "user" }));
      closer = setTimeout(() => {
        console.log("Reconnecting Websocket…");
        closer = undefined;
        ws.close();
      }, 1000 * 60 * 60);
    });

    ws.on("message", (data) => {
      const message = JSON.parse(new TextDecoder("utf-8").decode(data));
      const event = message.event;
      const payload = message.payload ? JSON.parse(message.payload) : null;
      if (!["public", "unlisted"].includes(payload.visibility)) {
        console.log("-");
        return;
      }

      if (payload.mentions?.length) {
        // don't repost @replies
        return;
      }
      if (
        payload?.account?.url &&
        payload?.account?.url !== process.env.MASTODON_USER
      ) {
        return;
      }

      onMessage(event, payload);

      fs.appendFileSync(
        resolvePath("../logs/messages.json"),
        JSON.stringify([{ ...message, payload: undefined }, payload], null, 2)
      );

      // if(payload.visibility !== 'direct')
    });

    ws.on("error", (error) => {
      console.error("WebSocket Error:", error);
    });

    ws.on("close", function close() {
      console.log("Websocket disconnected.");
      if (closer) {
        clearTimeout(closer);
      }
      connect();
    });
  }

  connect();
}

export async function fetchStatus(id) {
  const res = await fetch(
    `https://${process.env.MASTODON_SERVER}/api/v1/statuses/${id}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.MASTODON_TOKEN}`,
      },
    }
  );
  const json = await res.json();
  return json;
}
