import { splitPost } from "../src/postsplit.js";
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
});
