import { fileURLToPath } from "url";
import path from "path";

// Get the current module's URL
const __filename = fileURLToPath(import.meta.url);
// Get the directory name
export const __dirname = path.dirname(__filename);

export function resolvePath(relativePath) {
  return path.resolve(__dirname, relativePath);
}
