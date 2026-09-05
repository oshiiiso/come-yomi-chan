export function getErrorMessage(error: unknown): string {
  return readErrorMessage(error, 0);
}

function readErrorMessage(error: unknown, depth: number): string {
  if (error instanceof Error) {
    const cause =
      depth < 3 && error.cause !== undefined
        ? readErrorMessage(error.cause, depth + 1)
        : '';
    if (cause && cause !== error.message) {
      return `${error.message} (${cause})`;
    }
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const nested =
      record.exception ??
      record.error ??
      record.err ??
      record.cause ??
      record.info;
    if (nested && nested !== error && depth < 3) {
      const fromNested = readErrorMessage(nested, depth + 1);
      if (fromNested && fromNested !== '[object Object]') {
        return fromNested;
      }
    }
    if (typeof record.message === 'string' && record.message.trim()) {
      return record.message;
    }
    try {
      const json = JSON.stringify(error);
      if (json && json !== '{}') {
        return json;
      }
    } catch {
      // 循環参照などは文字列化で十分
    }
  }

  return String(error);
}

export function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return undefined;
  }

  const code = (error as { code: unknown }).code;
  return typeof code === 'string' ? code : String(code);
}
