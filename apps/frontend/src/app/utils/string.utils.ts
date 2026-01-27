/**
 * Converts a string to camelCase format.
 * Examples: "Created At" -> "createdAt", "user_name" -> "userName", "ID" -> "id"
 */
export function toCamelCase(input: string): string {
  if (!input || !input.trim()) {
    return input;
  }

  // Remove leading/trailing whitespace
  input = input.trim();

  // Split by spaces, underscores, hyphens, or capital letters (for PascalCase)
  const words = input
    .split(/[\s_\-]+|(?<!^)(?=[A-Z])/)
    .filter(w => w.trim().length > 0)
    .map(w => w.trim());

  if (words.length === 0) {
    return input;
  }

  // First word: lowercase
  let result = words[0].toLowerCase();

  // Subsequent words: capitalize first letter, lowercase rest
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    if (word.length > 0) {
      result += word[0].toUpperCase() + word.slice(1).toLowerCase();
    }
  }

  return result;
}

/**
 * Validates that a string is a valid camelCase identifier.
 * Must start with a lowercase letter and contain only letters, numbers, and underscores.
 */
export function isValidCamelCaseIdentifier(input: string): boolean {
  if (!input || !input.trim()) {
    return false;
  }

  // Must start with lowercase letter
  if (!/^[a-z]/.test(input)) {
    return false;
  }

  // Must contain only letters, numbers, and underscores
  return /^[a-z][a-zA-Z0-9_]*$/.test(input);
}
