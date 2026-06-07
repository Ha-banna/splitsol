export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function notFound(message = 'Not found'): AppError {
  return new AppError(404, message, 'NOT_FOUND');
}

export function unauthorized(message = 'Unauthorized'): AppError {
  return new AppError(401, message, 'UNAUTHORIZED');
}

export function forbidden(message = 'Forbidden'): AppError {
  return new AppError(403, message, 'FORBIDDEN');
}

export function badRequest(message: string): AppError {
  return new AppError(400, message, 'BAD_REQUEST');
}

export function solanaRpcError(
  message = 'Solana RPC is misconfigured or unavailable. Set HELIUS_API_KEY in backend/.env, or remove Solana env vars to use dev mock payments locally.',
): AppError {
  return new AppError(400, message, 'SOLANA_RPC_ERROR');
}
