import { IncomingMessage, Server, ServerResponse, createServer as createHttpServer } from "node:http";
import { BookId } from "../../../core/domain/BookId";
import { InvalidValueError, LoanNotAllowedError } from "../../../core/domain/DomainError";
import { Loan } from "../../../core/domain/Loan";
import { MemberId } from "../../../core/domain/MemberId";
import { BorrowBookUseCase } from "../../../core/ports/in/BorrowBookUseCase";
import { ReturnController } from "../../../legacy/ReturnController";

export interface HttpDependencies {
  borrowBook: BorrowBookUseCase;
  legacyReturns: ReturnController;
  apiKey: string;
}

/**
 * ADAPTER: exposes the use cases through HTTP.
 *
 * POST /loans     body: { "memberId": "M-1", "bookId": "B-100" }   -> hexagon
 * POST /returns   body: { "loanId": "..." }                        -> LEGACY controller
 * Both require the header x-api-key.
 *
 * Returns the server WITHOUT starting it, so callers (main or tests) choose the port.
 */
export function createServer(deps: HttpDependencies): Server {
  return createHttpServer(async (req, res) => {
    try {
      if (req.method !== "POST" || (req.url !== "/loans" && req.url !== "/returns")) {
        return send(res, 404, { error: "Not found" });
      }
      if (req.headers["x-api-key"] !== deps.apiKey) {
        return send(res, 401, { error: "Missing or invalid API key" });
      }

      if (req.url === "/returns") {
        return await deps.legacyReturns.handle(req, res);
      }

      const body = await readJson(req);
      const memberId = MemberId.of(String(body.memberId ?? ""));
      const bookId = BookId.of(String(body.bookId ?? ""));

      const loan = deps.borrowBook.borrow(memberId, bookId);
      return send(res, 201, toResponse(loan));
    } catch (error) {
      if (error instanceof SyntaxError || error instanceof InvalidValueError) {
        return send(res, 400, { error: error.message });
      }
      if (error instanceof LoanNotAllowedError) {
        return send(res, 409, { error: error.message });
      }
      console.error(error);
      return send(res, 500, { error: "Internal server error" });
    }
  });
}

function toResponse(loan: Loan) {
  return {
    id: loan.id,
    memberId: loan.memberId.value,
    bookId: loan.bookId.value,
    dueDate: loan.dueDate.toISOString(),
    status: loan.status,
  };
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}
