import { BorrowRequest, LoanController } from "./adapters/LoanController";
import { LoanService } from "./core/LoanService";
import { MySqlLoanRepository } from "./adapters/MySqlLoanRepository";
import { SmsNotifier } from "./adapters/SmsNotifier";

const repository = new MySqlLoanRepository();
const notifier = new SmsNotifier();
const loanService = new LoanService(repository, notifier);
const controller = new LoanController(loanService);

const requests: BorrowRequest[] = [
  { memberId: "M-1", bookId: "B-100" },
  { memberId: "M-1", bookId: "B-200" },
  { memberId: "M-1", bookId: "B-300" },
  { memberId: "M-1", bookId: "B-400" }, // 4th loan for the same member
  { memberId: "M-2", bookId: "B-100" },
  { memberId: "", bookId: "B-500" }, // invalid request
];

for (const request of requests) {
  console.log(`\nPOST /loans ${JSON.stringify(request)}`);
  const response = controller.borrow(request);
  console.log(`-> ${response.status} ${JSON.stringify(response.body)}`);
}
