# Splitwise comparison — 9 September 2026

Comparison of current local paymatrix source, not a claim that every flow is verified on physical devices. Splitwise feature availability may depend on plan/region.

| Capability | paymatrix web | paymatrix native Android | Gap / next step |
|---|---|---|---|
| Groups, friends, shared balances | Present | Present | Validate real multi-user flows |
| Equal, exact, percentage, shares splits | Present | Present | Preserve integer-paise conservation |
| Multiple payers | Present | Present, edit hydration tested | No new schema needed |
| Debt simplification | Present | Present | Payment confirmation remains explicit |
| Receipt scanning | Present | Present; group widget opens contextual scanner | Review extracted values before saving |
| Assign scanned receipt items to people | Present in ExpenseForm.jsx | Per-person item subtotals; scanned text becomes notes | Native per-item assignment is a real parity gap |
| Charts / category summaries | Present | Present | Verify cached freshness |
| Currency conversion | No exchange-rate engine found | INR-centric display/calculation | Missing; requires a designed multi-currency ledger |
| Recurring expenses | No scheduler/configuration found | No scheduler/configuration found | Missing |
| Saved default group splits | No persistent group default found | No persistent group default found | Missing; useful candidate after user validation |
| Expense search across account | Group-level filtering available | Recent/group expenses and filters | Global full-text search not established |
| Comments on individual expenses | Notes and audit events | Notes and audit events | Threaded discussions not found |
| Export | Reports/export utilities | Account JSON export | Formats and reporting parity differ |
| Home-screen widgets | PWA shortcuts, no native iOS widget | Overall summary + configurable group balance/actions in 2.3.1 | Android only |

Sources: [Splitwise core features](https://www.splitwise.com/), [Splitwise Pro](https://www.splitwise.com/pro), [Pro help](https://kb.splitwise.com/pro/what-is-splitwise-pro), [Recurring expenses](https://kb.splitwise.com/balances-and-expenses/how-can-i-manage-recurring-expenses).

Local evidence: frontend/src/components/expense/ExpenseForm.jsx, frontend/src/services/expenseService.js, native-android/app/src/main/java/com/paymatrix/app/ui/ExpenseFormScreen.kt, data/Models.kt, domain/BalanceEngine.kt, ui/LogsProfileScreens.kt, widget/.

Recommendation, not a verified customer priority: next validate native item assignment and saved group split defaults with active groups. Do not add currency conversion or recurring financial writes without corresponding data, audit, concurrency and reconciliation design.
