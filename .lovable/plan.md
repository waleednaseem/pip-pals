# Family & Social Finance Manager — Complete Plan

Aap ki request samajh gya. Lifeline ke andar **Analytics tab** ki tarah do naye major tabs add karne hain: **Family** (bivi, bachay, walidain, behan-bhai, ghar) aur **Loans** (udhaar le/de). Sath mein dosto ke saath khane jaisi group expenses ke liye **bilkul alag se ek naya top-level navigation item** "Group Expenses" banega jo lifetime maintain rahega.

Sab kuch localStorage par chalega (project ka rule), glassmorphism theme follow karega, aur PDF export bhi har section ka mile ga.

---

## 1. Family Manager (Lifeline ke andar naya tab)

Lifeline component (`src/components/Lifeline.tsx`) mein "Analytics" ke saath ek naya tab **"Family"** add hoga. Iske andar **sub-tabs / sections**:

### A. Wives (Multiple Wife Support — Islamic context)
Per-wife profile card with:
- Name, marriage date, nikah amount (mahr) tracking — paid / pending
- **Per-wife wallet/account balance** (kitne paise di hain, kitne baqi)
- Monthly allowance (kharcha) — recurring auto-add option
- Equal-treatment indicator: side-by-side comparison card jo dikhaye kis wife par kitna kharch hua is mahine — taake adl/insaaf maintain ho
- Per-wife expense log (clothes, jewellery, gifts, medical, personal)
- Each wife linked to her own children (next section)

### B. Children (Per-Wife Linked)
Har bachay ka card under uski maa:
- Name, DOB, age (auto-calc), gender, school/class
- **School fees** (monthly recurring + admission/annual)
- **School accessories** (uniform, books, stationery, bag, shoes)
- Tuition / coaching fees
- Health & medical (vaccines, doctor visits)
- Clothing, toys, pocket money
- Events: birthday, Eid clothes, Aqeeqah, etc.
- Per-child running total + per-wife group total

### C. Parents (Walidain)
- Father / Mother separate cards
- Monthly allowance (khidmat)
- Medical expenses (most important — recurring + one-off)
- Hajj/Umrah savings tracker
- Gifts and one-off expenses

### D. Siblings (Behan / Bhai)
- Add multiple siblings
- Per-sibling support amount, wedding contribution, education help
- Type tag: behan / bhai

### E. Household / Ghar ka Soda
- **Grocery** (monthly soda) — recurring
- **Utilities**: bijli, gas, paani, internet, mobile
- **Rent / mortgage**
- Maid / driver / cook salaries
- Home maintenance & repairs
- Vehicle (fuel, service)

### F. Events (Cross-cutting)
Quick event logger — assign to wife/child/parent/sibling/household:
- Birthdays, Eid, Shaadi, Aqeeqah, Eid-ul-Adha qurbani, Ramadan kharcha, school annual events, family trips

### G. Family Dashboard (top of Family tab)
- **Total monthly family expense**
- **Breakdown pie chart**: Wives / Children / Parents / Siblings / Household
- Per-wife comparison bar (insaaf indicator)
- Top 5 expense categories this month
- Savings goal tracker per family member (e.g. child's education fund)

---

## 2. Loans Manager (Lifeline ke andar naya tab — "Udhaar")

Naya tab **"Loans"** with two sub-sections:

### A. Money I Owe (Maine Udhaar Liya)
- Lender name, amount, date taken, currency
- Reason / note
- Repayment log (partial payments allowed)
- Outstanding balance auto-calc
- Due date + reminder badge (overdue red)

### B. Money Owed To Me (Maine Udhaar Diya)
- Borrower name (can link to family member or external)
- Amount, date, expected return date
- Repayment received log
- Outstanding balance
- Status: Active / Returned / Written-off

### Summary cards:
- Total I owe vs Total owed to me → **Net position**
- Overdue alerts

---

## 3. Group Expenses (Brand-new top-level navigation item)

Yeh **Lifeline ke bahar** hoga — main drawer menu mein naya entry **"Group Expenses"** (dosto ke saath khana, trips, etc.). Splitwise-style, lifetime persistent.

### Features:
- **Create Group**: name (e.g. "Friday Dinner Crew", "Murree Trip 2026"), members add karo, default currency
- **Add Expense** to a group:
  - Amount, payer (kis ne pay kiya), description, date, category
  - **Split mode**: Equal / Unequal (custom amounts) / By percentage / By shares
  - Optional: kis-kis pe split karna hai (sab members ya selected)
- **Auto balance calculation**: kaun kis ka kitna deta hai
- **Settle Up**: record payments between members
- **Simplified debts**: minimum transactions required (e.g. A→C directly instead of A→B→C)
- **Group history**: saari expenses with filter by member/date/category
- **Per-member view**: "I owe X to Ali" / "Ahmed owes me Y"
- **PDF export** of group summary + settlement instructions
- Lifetime persistent in localStorage

---

## 4. Extra Real-Life Items I'm Adding (jo aap bhool gaye)

1. **Zakat Calculator & Tracker** — yearly nisab check, zakat due, payment log (Islamic essential)
2. **Sadqa / Charity log** — recurring + one-off, tax/spiritual record
3. **Insurance & Subscriptions** — life, health, vehicle insurance + Netflix/Spotify/etc. recurring tracker
4. **Emergency Fund** — separate savings goal with target & monthly contribution
5. **Per-person savings pots** — har family member ka future fund (bachi ka jahez, beta ki university, walidain ka Hajj)
6. **Recurring Expense Engine** — monthly auto-add for school fees, utilities, salaries, allowances (one-time setup, auto-applied each month)
7. **Reminders/Alerts** — fee due, loan due, monthly allowance pending — visible badges in UI
8. **Notes per entity** — har wife/child/parent ke profile mein free-text notes (medical history, allergies, important dates)
9. **Currency-aware** — sab kuch Lifeline ki primary currency mein, with USD equivalent option (existing exchange rate service reuse)

---

## 5. Technical Plan

### New files
```text
src/types/family.ts          — Wife, Child, Parent, Sibling, HouseholdExpense, FamilyEvent, Loan, Group, GroupExpense, Settlement, ZakatRecord types
src/utils/family.ts          — CRUD + calculations (per-wife totals, balances, zakat calc, loan balances)
src/utils/groupExpenses.ts   — Split logic, debt simplification algorithm, settlement
src/components/family/FamilyDashboard.tsx
src/components/family/WivesSection.tsx
src/components/family/ChildrenSection.tsx
src/components/family/ParentsSection.tsx
src/components/family/SiblingsSection.tsx
src/components/family/HouseholdSection.tsx
src/components/family/EventsSection.tsx
src/components/family/LoansSection.tsx
src/components/family/ZakatSection.tsx
src/components/GroupExpenses.tsx   — full top-level page (groups list + detail view)
```

### Modified files
- `src/components/Lifeline.tsx` — add **"Family"**, **"Loans"**, **"Zakat"** tabs alongside Analytics
- `src/pages/Index.tsx` — add `{ value: "group-expenses", label: "Group Expenses" }` in `availableTabs` + new `<TabsContent>` rendering `<GroupExpenses />`

### Storage keys (localStorage)
```text
family-data           — { wives, children, parents, siblings, household, events, loans, zakat }
group-expenses-data   — { groups: [{ id, name, members, currency, expenses, settlements }] }
```

### Data model highlights
- Each wife has `id`; each child has `motherId` linking to wife → enables per-wife child grouping & comparison
- Loans: `{ id, type: 'borrowed'|'lent', counterparty, amount, currency, date, dueDate, payments: [], note }`
- Group expense split: `{ payerId, amount, splits: [{ memberId, share }] }`
- Debt simplification using greedy algorithm (max-creditor ↔ max-debtor)

### UI conventions (memory rules followed)
- Glassmorphism: `.glass-card`, `.glass-input`, `.glass-button`
- Buttons: green primary (add/save), blue secondary (edit/view), red destructive (delete), amber warning (overdue)
- Sub-sections: collapsible cards (like Expense Calculator nested style)
- Pie chart for Family Dashboard: same recharts pattern as Lifeline Analytics
- PDF: jspdf (pinned ^2.5.2), same style as existing Financial Statement / Expense Report
- Glassy top-down full-page drawer navigation maintained

### Build approach (phased — can ship incrementally)
1. **Phase 1**: Types + utils + Family tab shell with Wives + Children + per-wife dashboard
2. **Phase 2**: Parents + Siblings + Household + Events
3. **Phase 3**: Loans tab + Zakat tab + Recurring engine + reminders
4. **Phase 4**: Group Expenses (separate top-level item) — full Splitwise-style flow + PDF export
5. **Phase 5**: Family PDF report + cross-section analytics

---

## Confirm karein

Kya yeh complete plan theek hai? Approve karein toh phase-by-phase implement karna shuru kar dun (Phase 1 se). Agar koi cheez add/remove ya re-prioritize karni ho — bata dein.