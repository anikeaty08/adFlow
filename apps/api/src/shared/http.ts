import type { FastifyRequest } from 'fastify';
import { DomainError, id, success } from '@adflow/shared';

export function requestId(request: FastifyRequest) {
  return request.headers['x-request-id']?.toString() ?? id('act');
}

export function response<T>(request: FastifyRequest, data: T) {
  return success(data, requestId(request));
}

export function notFound(resource: string): never {
  throw new DomainError('NOT_FOUND', `${resource} was not found.`);
}
