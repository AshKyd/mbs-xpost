import { AtpAgent } from "@atproto/api";
import { getPostBody } from "../src/bsky.js";
import { splitPost } from "../src/splitPost.js";
import assert from "node:assert";

describe("postSplit", () => {
  it("should return a post verbatim if it's within the limit", () => {
    const res = splitPost("Hello world", { maxLength: 300 });
    assert.deepEqual(res, ["Hello world"]);
  });
  it("should prefer splitting on paragraphs where possible", () => {
    const res = splitPost(
      `Hello world.

Nice day for it.`,
      { maxLength: 20 }
    );
    assert.deepEqual(res, ["Hello world.", "Nice day for it."]);
  });
  it("should combine multiple pars into a post where possible", () => {
    const res = splitPost(
      `CW: Greeting

Hello world.

Nice day for it.`,
      { maxLength: 40 }
    );
    assert.deepEqual(res, ["CW: Greeting\n\nHello world.", "Nice day for it."]);
  });
  it("should split on sentences where possible", () => {
    const post = [
      "I love that Pebble watches may be coming back. I never had one, but I like the idea.",
      "Though I appreciate my vintage 2017 era Garmin way too much to consider anything else. This thing is unstoppable.",
    ];
    const res = splitPost(post.join(" "), { maxLength: 160 });
    assert.deepEqual(res, post);
  });
  it("should split long sentences if there are any", () => {
    const post = [
      "I am invader - I am the black and the white I am the left and the right - I am",
      "the thief in the night",
    ];
    const res = splitPost(post.join(" "), { maxLength: 80 });
    assert.deepEqual(res, post);
  });
  it("should handle hyperlinks ok", () => {
    const post = [
      "“Neuron Mobility announced it had merged its Australian operations with Beam, and expected to return 700 purple – albeit rebranded and refurbished – e-scooters to #Brisbane streets.”",
      "https://www.brisbanetimes.com.au/national/queensland/paint-it-purple-ousted-e-scooter-company-returns-to-brisbane-in-merger-20250721-p5mgnv.html",
    ];
    const res = splitPost(post.join(" "), { maxLength: 300 });
    assert.deepEqual(res, post);
  });
  it("should handle newlines ok", () => {
    const post = [
      "I should go for a ride before it starts raining.\n*plays computer games until the rain comes*\nAh.",
    ];
    const res = splitPost(post[0], { maxLength: 300 });
    assert.deepEqual(res, post);
  });
});

describe("getPostBody", () => {
  it("should detect links", async () => {
    const agent = new AtpAgent({
      service: "https://bsky.social",
    });
    const thing = await getPostBody(
      agent,
      "Hi this is my post https://ashk.au/"
    );
    assert.deepEqual(thing, {
      langs: ["en"],
      text: "Hi this is my post https://ashk.au/",
      facets: [
        {
          index: {
            byteStart: 19,
            byteEnd: 35,
          },
          features: [
            {
              $type: "app.bsky.richtext.facet#link",
              uri: "https://ashk.au/",
            },
          ],
        },
      ],
    });
  });
});
