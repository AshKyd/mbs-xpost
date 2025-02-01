import fs from "fs";
import readline from "node:readline";
import { stdin, stdout } from "node:process";
import { resolvePath } from "./files.js";

function jsonPost(method, endpoint, body) {
  const url = `https://bne.social${endpoint}`;
  console.log(url);
  return fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }).then((response) => response.json());
}

const application = await jsonPost("POST", "/api/v1/apps", {
  client_name: "AKBsky",
  redirect_uris: ["urn:ietf:wg:oauth:2.0:oob"],
  scopes: "read write push",
  website: "https://ash.ms/bs",
});

console.log(application);

if (application.error) {
  throw new Error(application.error);
}

console.log(
  "Login at:\n",
  `https://bne.social/oauth/authorize?response_type=code&client_id=${application.client_id}&redirect_uri=urn:ietf:wg:oauth:2.0:oob`
);

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
});

const code = await new Promise((resolve) => rl.question(`Auth code:`, resolve));

const token = await jsonPost("POST", "/oauth/token", {
  client_id: application.client_id,
  client_secret: application.client_secret,
  redirect_uri: "urn:ietf:wg:oauth:2.0:oob",
  grant_type: "client_credentials",
  code,
});

if (token.error) {
  throw new Error(token.error);
}

fs.writeFileSync(
  resolvePath("../logs/secret-token.json"),
  JSON.stringify(token)
);

process.exit();
