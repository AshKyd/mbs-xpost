function combineEntries(posts, joinChar, maxLength) {
  return posts
    .reduce(
      (posts, sentence) => {
        const prevPosts = posts.slice(0, posts.length - 1);
        const thisPost = posts.slice(posts.length - 1)[0];

        const newPost = `${thisPost}${joinChar}${sentence}`;
        if (newPost.trim().length <= maxLength) {
          return [...prevPosts, newPost];
        }

        if (sentence.length <= maxLength) {
          return [...prevPosts, thisPost, sentence];
        }
        return [...prevPosts, sentence];
      },
      [""]
    )
    .map((post) => post.trim());
}

export function splitPost(post, { maxLength = 300 }) {
  if (post.length <= maxLength) {
    return [post];
  }

  const arePostsUnderLimit = (thisPost) => thisPost.length <= maxLength;

  const pars = post.split("\n");
  const postsByPar = combineEntries(pars, "\n", maxLength);
  if (postsByPar.every(arePostsUnderLimit)) {
    return postsByPar;
  }

  const postsByParBySentence = postsByPar.flatMap((post) => {
    const sentences = post.match(/[^\.!\?]+[\.!\?]+/g) || [post];
    return combineEntries(sentences, "", maxLength);
  });

  if (postsByParBySentence.every(arePostsUnderLimit)) {
    return postsByParBySentence;
  }

  const postsByParByWord = postsByPar.flatMap((post) => {
    const words = post.split(" ");
    return combineEntries(words, " ", maxLength);
  });

  return postsByParByWord;
}
