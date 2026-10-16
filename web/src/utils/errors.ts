/** An error's own message, for showing next to what failed. */
export const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));
