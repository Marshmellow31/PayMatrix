# Phase 3: International Multi-Currency Engine Specification

> **Module Focus:** Arbitrary subunit integer arithmetic, ISO 4217 registry, offline FX rates, and deterministic split math  
> **Key Problem Solved:** Eliminating IEEE 754 floating-point drift (`0.1 + 0.2 === 0.30000000000000004`) across 0-decimal, 2-decimal, and 3-decimal world currencies  
> **Algorithm:** Hare-Niemeyer (Largest Remainder) Proportional Allocation

---

## 1. The Subunit Arithmetic Paradigm

Financial data must **never** be stored or calculated as floating-point decimals.
PayMatrix v2 used integer *paise* ($1/100$ INR).
PayMatrix v3 generalizes this to **Integer Subunits ($10^{\text{decimals}}$)** defined by **ISO 4217**:

$$\text{Subunits} = \text{round}(\text{MajorAmount} \times 10^{\text{decimals}})$$

### Decimal Precision Classification:
1. **2 Decimals ($10^2 = 100$ Subunits):**
   - Currencies: `USD` (cents), `EUR` (cents), `GBP` (pence), `INR` (paise), `CAD`, `AUD`, `SGD`, `BRL`.
   - \$15.50 is stored as integer `1550`.
2. **0 Decimals ($10^0 = 1$ Subunit):**
   - Currencies: `JPY` (Yen), `KRW` (Won), `VND` (Dong), `CLP` (Peso).
   - ¥3,000 is stored as integer `3000`.
3. **3 Decimals ($10^3 = 1000$ Subunits):**
   - Currencies: `KWD` (Kuwaiti Dinar), `BHD` (Bahraini Dinar), `OMR` (Omani Rial).
   - 12.500 KD is stored as integer `12500` (fils).

---

## 2. The Hare-Niemeyer Allocation Algorithm

When splitting an odd amount among $N$ participants, integer division inevitably produces remainders:
$$\text{Remainder} = \text{TotalSubunits} - \sum_{i=1}^N \lfloor \text{ExactShare}_i \rfloor$$

The **Hare-Niemeyer Method** (also known as Hamilton or Largest Remainder method):
1. Calculates each participant's exact continuous share: $\text{Exact}_i = \frac{\text{TotalSubunits} \times W_i}{\sum W}$.
2. Grants each participant the integer floor: $\text{Base}_i = \lfloor \text{Exact}_i \rfloor$.
3. Sorts participants descending by their fractional remainder $(\text{Exact}_i - \text{Base}_i)$.
4. Distributes remaining single subunits ($+1$) sequentially to the highest fractional remainders.
5. In case of tie remainders, breaks ties deterministically using the participant's original index order.

**Mathematical Invariant:**
$$\sum_{i=1}^N \text{Allocated}_i \equiv \text{TotalSubunits} \quad (\text{Strict Equality})$$

---

## 3. Multi-Currency Group Accounting & Offline FX Snapshots

When members log expenses in a currency different from the group's base currency:

```
[Expense in JPY: ¥15,000]
         │
         ▼
[Lookup FX Rate: 1 JPY = 0.0062 EUR]
         │
         ▼
[Compute Base Subunits: 15,000 * 0.0062 = 93.00 EUR -> 9300 Cents]
         │
         ▼
Store Immutable Transaction:
{
  originalAmount: 15000,
  originalCurrency: "JPY",
  exchangeRate: 0.0062,
  baseCurrency: "EUR",
  baseAmountSubunits: 9300
}
```

### Invariant:
- Historical debt calculations are **immutable**; they do not fluctuate when live exchange rates drift weeks later.
- If offline, the transaction uses the last cached local rate from the device storage.
