# Firestore data model

All money is stored as plain numbers in ৳ (2 decimals). Dates are `YYYY-MM-DD` strings (Bangladesh calendar), months are `YYYY-MM`.
Derived numbers (meal rate, balances, bill shares, settlement) are **never stored while a month is open** – `src/lib/calc.js` recomputes them from the raw records on every change.

| Collection | Doc id | Key fields |
|---|---|---|
| `users` | auth uid | `email, role('admin'｜'member'), memberId` |
| `members` | auto | `name, phone, email, roomNumber, photoUrl, joinDate, leaveDate, status('active'｜'inactive'), uid` |
| `monthlyManagers` | `YYYY-MM` | `memberId, startDate, endDate, assignedBy` |
| `monthlySettings` | `YYYY-MM` | `cutoffs{breakfast,lunch,dinner (minutes)}, guestWeights[{label,weight}], locked, lockedAt/By, reopenedAt/By, actualCash(+At/By), openingCash, openingBalances{memberId:{meal,bill}}, closingCash, openingCashUsed` |
| `deposits` | `DEP-YYYYMMDD-NNN` | `memberId, amount, date, month, method, note, status('active'｜'void')` |
| `expenses` | auto | `date, month, itemName, quantity, unitPrice, totalPrice, vendor, category, paymentMethod, note, receiptUrl, receiptPath, status` |
| `meals` | `{memberId}_{date}` | `memberId, date, month, breakfast, lunch, dinner` (one doc per member per day ⇒ no duplicates) |
| `guestMeals` | auto | `memberId (host), guestName, date, month, mealType, weight` |
| `bills` | auto | `name, type, amount, dueDate, month, splitMethod('equal'｜'days'), status` |
| `billPayments` | auto | `billId, memberId, amount, date, month, method, status` |
| `monthlySettlements` | `{month}_{memberId}` | frozen snapshot: `openingBalance/Meal/Bill, deposits, mealCount, mealRate, mealCost, billShare, billPayments, mealBalance, billBalance, finalBalance, status` |
| `counters` | `deposit-YYYYMMDD` | `n` – transactional sequence for deposit reference ids |
| `config` | `bootstrap` | marker written once when the first admin signs up |

Every record also carries `createdAt/createdBy` (server timestamp) and `updatedAt/updatedBy` where applicable.

## Phase 3 – structures ready, UI behind `FEATURES` flags in `src/config.js`
- `auditLogs/{auto}`: `actorUid, actorMemberId, action, entity, entityId, month, before, after, summary, createdAt` – append-only; staff read/create. Services already call `audit()`; set `FEATURES.audit = true` to start writing.
- `notifications/{auto}`: `memberId, type('low_balance'｜'deposit_due'｜'bill_due'｜'meal_deadline'｜'large_expense'), title, body, read, createdAt` – to be written by a Cloud Function; members can only mark their own as read.
- `inventory/{item}`: `name, unit, currentStock, minStock, added[], used[]` – low-stock = `currentStock < minStock`.
- `shoppingList/{auto}`: `item, qty, addedBy, done, createdAt`.

## Balance rules
- **Meal balance** = opening meal + deposits − (meals × meal rate)
- **Bill balance** = opening bill + bill payments − bill shares
- **Final balance** = meal balance + bill balance (positive = refundable, negative = due). The two are never mixed internally.
- **Meal rate** = total bazar ÷ total meals (own + guest weights), rounded to the paisa.
- **Cash in hand** = cash carried from last month + deposits − expenses.
- **Carry-forward**: closing balances of month M become the opening balances of M+1 (read from `monthlySettlements`).
