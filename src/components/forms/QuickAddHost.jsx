import DepositForm from './DepositForm'
import ExpenseForm from './ExpenseForm'
import GuestMealForm from './GuestMealForm'
import BillForm from './BillForm'
import BillPaymentForm from './BillPaymentForm'

/** Renders whichever modal useQuickAdd().open(kind, props) asked for. */
export default function QuickAddHost({ quick, onClose }) {
  const { kind, props } = quick
  switch (kind) {
    case 'deposit': return <DepositForm {...props} onClose={onClose} />
    case 'expense': return <ExpenseForm {...props} onClose={onClose} />
    case 'guestMeal': return <GuestMealForm {...props} onClose={onClose} />
    case 'bill': return <BillForm {...props} onClose={onClose} />
    case 'billPayment': return <BillPaymentForm {...props} onClose={onClose} />
    default: return null
  }
}
