// HEXAGON: outside – DRIVING adapter
// Translates hexagon errors into HTTP (RFC 9457 problem+json). The hexagon never sees status codes.
import { NotFoundError, ValidationError } from '@usflights/application';
import type { FastifyError, FastifyInstance, FastifyReply } from 'fastify';

interface Problem {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly code: string;
}

export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    if (error instanceof NotFoundError) {
      return sendProblem(reply, 404, 'Not Found', error.message, error.code);
    }
    if (error instanceof ValidationError) {
      return sendProblem(reply, 400, 'Bad Request', error.message, error.code);
    }
    if (error.validation) {
      return sendProblem(reply, 400, 'Bad Request', error.message, 'REQUEST_VALIDATION_ERROR');
    }
    request.log.error({ err: error }, 'Unhandled error');
    return sendProblem(reply, 500, 'Internal Server Error', 'Unexpected error', 'INTERNAL_ERROR');
  });

  app.setNotFoundHandler((request, reply) =>
    sendProblem(
      reply,
      404,
      'Not Found',
      `Route ${request.method} ${request.url} not found`,
      'ROUTE_NOT_FOUND',
    ),
  );
}

function sendProblem(
  reply: FastifyReply,
  status: number,
  title: string,
  detail: string,
  code: string,
): FastifyReply {
  const problem: Problem = { type: 'about:blank', title, status, detail, code };
  return reply.status(status).type('application/problem+json').send(problem);
}
