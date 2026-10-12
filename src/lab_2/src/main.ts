import { BorrowRequest, LoanController } from "./adapters/LoanController";
import { MySqlLoanRepository } from "./adapters/MySqlLoanRepository";
import { SmsNotifier } from "./adapters/SmsNotifier";
import { SmtpEmailSender } from "./adapters/SmtpEmailSender";
import { BorrowBookService } from "./core/application/BorrowBookService";

// Wiring: the only place where concrete classes are chosen.
const useSms = process.env.NOTIFIER === "sms";

const repository = new MySqlLoanRepository();
const notifier = useSms ? new SmsNotifier() : new SmtpEmailSender();
const borrowBookService = new BorrowBookService(repository, notifier);
const controller = new LoanController(borrowBookService);

const requests: BorrowRequest[] = [
  { memberId: "M-1", bookId: "B-100" },
  { memberId: "M-1", bookId: "B-200" },
  { memberId: "M-1", bookId: "B-300" },
  { memberId: "M-1", bookId: "B-400" }, // 4th loan for the same member
  { memberId: "M-2", bookId: "B-100" },
  { memberId: "", bookId: "B-500" }, // missing field
  { memberId: "XYZ", bookId: "B-500" }, // malformed MemberId
];

for (const request of requests) {
  console.log(`\nPOST /loans ${JSON.stringify(request)}`);
  const response = controller.borrow(request);
  console.log(`-> ${response.status} ${JSON.stringify(response.body)}`);
}
