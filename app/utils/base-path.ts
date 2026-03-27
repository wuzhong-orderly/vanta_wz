/**
 * Utility to handle base path for assets and navigation in GitHub Pages deployments
 */

import { getRuntimeConfig } from "./runtime-config";

// Get the base path from environment variable or default to '/'
export const BASE_PATH = getRuntimeConfig("VITE_BASE_URL") || "/";

/**
 * Prefixes a path with the base path
 * @param path Path to prefix
 * @returns Path with base path prefix
 */
export function withBasePath(path: string): string {
  // If the path already starts with the base path or is an absolute URL, return it as is
  if (path.startsWith(BASE_PATH) || path.match(/^(https?:)?\/\//)) {
    return path;
  }

  // Ensure we don't double slash
  const basePathWithoutTrailingSlash = BASE_PATH.endsWith("/")
    ? BASE_PATH.slice(0, -1)
    : BASE_PATH;

  const pathWithoutLeadingSlash = path.startsWith("/") ? path.slice(1) : path;

  return `${basePathWithoutTrailingSlash}/${pathWithoutLeadingSlash}`;
}
