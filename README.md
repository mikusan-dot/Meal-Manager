# Meal Manager

Mobile-first, installable (PWA) app that replaces the notebook for a shared student residence: members, deposits, bazar expenses, meals, guests, meal rate, balances, bills, monthly settlement and month locking.

**Stack:** React + Vite, Tailwind CSS, Firebase Auth / Firestore / Storage, Recharts, Lucide.

## Run it

```bash
npm install
cp .env.example .env.local      # paste your Firebase web-app config
npm run dev                     # http://localhost:5173
npm test                        # calculation-engine tests
npm run build
```

## Firebase setup (once)
1. Create a project at console.firebase.google.com and add a **Web app**.
2. **Authentication → Sign-in method:** enable *Email/Password*.
3. **Firestore Database:** create it (production mode).
4. **Storage** (optional, for receipts & profile photos): enable it. Set `VITE_ENABLE_STORAGE=false` to hide uploads if you skip it.
5. Deploy rules and indexes (do this *before* inviting anyone):
   ```bash
   npx firebase-tools login
   npx firebase-tools use <your-project-id>
   npx firebase-tools deploy --only firestore:rules,firestore:indexes,storage
   npx firebase-tools deploy --only hosting      # after npm run build
   ```

## First run
1. Open the app and **create an account first** – verify the email – the first account becomes **admin** and fills in its own member profile. Do this right after deploying.
2. **Members → Add member** for everyone (the email matters). Each person then taps *Create an account* with that email, verifies it, and is linked automatically.
3. **Settings → Manager:** admin picks this month's manager (rotate monthly).
4. The manager records deposits / expenses (FAB “+”), members tick meals, and the dashboard shows cash, meal rate and balances live.
5. Month end: **Settlement → Close month** saves snapshots, carries balances forward and locks the month. Only an admin can reopen it.

## Roles
| | Admin | Month's manager | Member |
|---|---|---|---|
| Deposits / expenses / bills / settlement / close month | ✅ | ✅ (their month) | ❌ |
| Add & edit members, correct anyone's meals | ✅ | ✅ | ❌ |
| Assign managers, reopen month, promote admin | ✅ | ❌ | ❌ |
| Own meals & guests (before cut-off), own phone/photo | ✅ | ✅ | ✅ |
| View all deposits, expenses, rate, settlement | ✅ | ✅ | ✅ |

All of this is enforced in `firestore.rules` / `storage.rules` (server clock, Bangladesh time for cut-offs), not just hidden in the UI.

## Design decisions worth knowing
- **Nothing financial is deleted.** Deposits, expenses, bills and payments are *voided* (still visible, ignored in totals); members are deactivated. Rules forbid deletes.
- **Cash in hand** includes cash carried from the previous month (otherwise month 2 would always show a false mismatch). For month 1 it is exactly deposits − expenses; admins can enter opening cash/balances in Settings.
- **Meal rate** is rounded to the paisa and members are charged `meals × that rate`; any sub-taka remainder is shown on the Settlement page.
- **Days-present bill split** uses each member's join/leave dates, so deactivating someone with a leave date automatically prorates them.
- **Email verification** is required before an account can claim a member profile, so nobody can claim someone else's profile by typing their address.
- Members can read other members' name/room/phone (needed for transparent group records).
- Phase 3 (audit log, notifications, inventory, shopping list, PDF/Excel) has schema + rules ready; see `docs/DATA_MODEL.md`.

## Layout
`src/lib` pure logic (calc, dates, validators) · `src/services` Firestore writes · `src/context` auth + real-time month data · `src/components` UI kit & forms · `src/pages` screens.
